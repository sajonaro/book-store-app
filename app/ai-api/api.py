"""Book Store AI API — book photo recognition via OpenAI GPT-4o vision.

Recognition pipeline (fastest → most accurate fallback):
  1. Barcode scan (pyzbar)  → if ISBN found:
     a. OpenLibrary API lookup  → if metadata found: return immediately (free, < 1s)
     b. OpenLibrary miss        → continue to GPT-4o with ISBN pre-filled
  2. GPT-4o vision            → extract metadata from raw images
"""

import base64
import io
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

from src.openai_client import create_client, analyze_multiple_images
from src.config import load_config
from src.isbn_lookup import find_isbn, lookup_by_isbn
from prompts.extraction import BOOK_METADATA_EXTRACTION_PROMPT

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(
    title="Book Store AI API",
    description="Book metadata extraction from photos using barcode + OpenLibrary + GPT-4o vision",
    version="2.2.0",
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

_EMPTY_META = {
    "title": None,
    "author": None,
    "isbn": None,
    "publisher": None,
    "year": None,
    "genre": None,
    "language": None,
    "description": None,
}

# Thumbnail dimensions (width x height) for book cover
THUMB_MAX_W = 300
THUMB_MAX_H = 420


def _make_thumbnail(raw_bytes: bytes, mime_type: str) -> str | None:
    """
    Resize the first uploaded image to a small book-cover thumbnail.
    Returns a base64 data-URI string, or None on failure.
    Pillow is used for resizing; falls back to raw bytes if Pillow unavailable.
    """
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(raw_bytes))
        img = img.convert("RGB")  # normalise (e.g. RGBA PNG → RGB JPEG)
        img.thumbnail((THUMB_MAX_W, THUMB_MAX_H), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"
    except ImportError:
        # Pillow not installed — fall back to raw bytes capped at 500 KB
        log.warning("Pillow not available; returning raw image as thumbnail")
        if len(raw_bytes) <= 512 * 1024:
            b64 = base64.b64encode(raw_bytes).decode("utf-8")
            ext = mime_type.split("/")[-1] or "jpeg"
            return f"data:image/{ext};base64,{b64}"
        return None
    except Exception as exc:
        log.warning("Thumbnail generation failed: %s", exc)
        return None


def _merge_with_gpt(ol_meta: dict, gpt_meta: dict) -> dict:
    """
    Merge OpenLibrary result with GPT-4o result.
    OpenLibrary fields take priority (more authoritative); GPT fills nulls.
    """
    merged = dict(gpt_meta)
    for key, val in ol_meta.items():
        if val is not None:
            merged[key] = val
    return merged


@app.post("/recognize")
async def recognize_book(photos: list[UploadFile] = File(...)):
    """
    Accept one or more book photos and extract metadata.

    Pipeline:
      1. Barcode → ISBN detected?
         a. Yes → OpenLibrary lookup → full metadata? → return (no GPT call!)
         b. Yes → partial metadata  → GPT-4o fills gaps, ISBN pre-seeded
      2. No barcode → GPT-4o vision on all images

    Returns:
        { "data": { title, author, isbn, publisher, year, genre, language, description },
          "cover_thumbnail": "data:image/jpeg;base64,...",
          "source": "openlibrary" | "gpt4o" | "merged" }
    """
    if not photos:
        raise HTTPException(status_code=400, detail="No photos provided")

    # ── Read + validate all uploaded images ──────────────────────────────
    images: list[dict] = []
    raw_bytes_list: list[bytes] = []
    for photo in photos:
        content_type = photo.content_type or "image/jpeg"
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {content_type}. Accepted: JPEG, PNG, WEBP",
            )
        raw = await photo.read()
        raw_bytes_list.append(raw)
        b64 = base64.b64encode(raw).decode("utf-8")
        images.append({"base64": b64, "mime_type": content_type})

    # ── Generate cover thumbnail from first photo ─────────────────────────
    cover_thumbnail = _make_thumbnail(
        raw_bytes_list[0], photos[0].content_type or "image/jpeg"
    )

    # ── Step 1: Barcode detection ─────────────────────────────────────────
    isbn = find_isbn(images)

    # ── Step 1a: OpenLibrary lookup ───────────────────────────────────────
    ol_meta: dict | None = None
    if isbn:
        log.info("Barcode detected: %s → querying OpenLibrary", isbn)
        ol_meta = lookup_by_isbn(isbn)
        if ol_meta:
            # Ensure language key exists
            ol_meta.setdefault("language", None)
            has_title = bool(ol_meta.get("title"))
            has_author = bool(ol_meta.get("author"))
            if has_title and has_author:
                log.info("OpenLibrary full hit — skipping GPT-4o")
                return JSONResponse(
                    content={
                        "data": ol_meta,
                        "cover_thumbnail": cover_thumbnail,
                        "source": "openlibrary",
                    }
                )
            log.info("OpenLibrary partial hit — will supplement with GPT-4o")

    # ── Step 2: GPT-4o vision ─────────────────────────────────────────────
    try:
        prompt = BOOK_METADATA_EXTRACTION_PROMPT
        if isbn and ol_meta:
            known = {k: v for k, v in ol_meta.items() if v is not None}
            hint = ", ".join(f"{k}={v!r}" for k, v in known.items())
            prompt = (
                f"CONTEXT: Barcode scan already identified: {hint}.\n"
                f"Use these values as ground truth for those fields; "
                f"focus on extracting the remaining null fields from the images.\n\n"
                + prompt
            )
        elif isbn:
            prompt = (
                f"CONTEXT: Barcode scan found ISBN={isbn!r}. "
                f"Use this as the isbn field value.\n\n" + prompt
            )

        client = create_client()
        gpt_meta = analyze_multiple_images(client, images, prompt)
        # Ensure language key exists in GPT result
        gpt_meta.setdefault("language", None)
        log.info(
            "GPT-4o returned: title=%r author=%r language=%r",
            gpt_meta.get("title"),
            gpt_meta.get("author"),
            gpt_meta.get("language"),
        )

        if ol_meta:
            final = _merge_with_gpt(ol_meta, gpt_meta)
            source = "merged"
        else:
            final = gpt_meta
            source = "gpt4o"

        if isbn and not final.get("isbn"):
            final["isbn"] = isbn

        return JSONResponse(
            content={
                "data": final,
                "cover_thumbnail": cover_thumbnail,
                "source": source,
            }
        )

    except Exception as exc:
        log.exception("GPT-4o call failed")
        fallback = dict(_EMPTY_META)
        if ol_meta:
            fallback.update({k: v for k, v in ol_meta.items() if v is not None})
        if isbn:
            fallback["isbn"] = isbn
        return JSONResponse(
            content={
                "data": fallback,
                "cover_thumbnail": cover_thumbnail,
                "source": "openlibrary",
                "error": str(exc),
            }
        )


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    config = load_config()
    api_cfg = config.get("api", {})
    uvicorn.run(
        app, host=api_cfg.get("host", "0.0.0.0"), port=api_cfg.get("port", 8000)
    )
