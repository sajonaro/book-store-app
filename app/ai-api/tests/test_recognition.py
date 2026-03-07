"""
Local test script for the book recognition pipeline.
Runs the full pipeline (barcode → OpenLibrary → GPT-4o) on each sample folder.

Usage (from app/ai-api/ directory):
    python tests/test_recognition.py

Each sample folder under samples/ is treated as ONE book
(multiple photos of the same book — cover, title page, back cover, etc.).
All images in a folder are passed together in a single recognition call,
so GPT-4o can see ALL angles of the book simultaneously.
"""

from __future__ import annotations

import base64
import json
import sys
import time
from pathlib import Path

# Make sure src/ and prompts/ are importable from the ai-api root
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from src.isbn_lookup import find_isbn, lookup_by_isbn
from src.openai_client import create_client, analyze_multiple_images
from prompts.extraction import BOOK_METADATA_EXTRACTION_PROMPT

SAMPLES_DIR = REPO_ROOT / "samples"
OUTPUT_DIR = REPO_ROOT / "output"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def load_images_from_folder(folder: Path) -> list[dict]:
    """
    Load all images from a folder into the format expected by the pipeline:
    [{"base64": str, "mime_type": str, "filename": str}, ...]

    Multiple images → represent different views of the SAME book.
    They will be passed together in one GPT-4o call.
    """
    images = []
    for path in sorted(folder.iterdir()):
        if path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue
        raw = path.read_bytes()
        images.append(
            {
                "base64": base64.b64encode(raw).decode(),
                "mime_type": MIME.get(path.suffix.lower(), "image/jpeg"),
                "filename": path.name,
            }
        )
    return images


def _merge_with_gpt(ol_meta: dict, gpt_meta: dict) -> dict:
    merged = dict(gpt_meta)
    for key, val in ol_meta.items():
        if val is not None:
            merged[key] = val
    return merged


# ─────────────────────────────────────────────────────────────────────────────
# Core pipeline (same logic as api.py, but callable without HTTP)
# ─────────────────────────────────────────────────────────────────────────────


def recognize(images: list[dict], gpt_client) -> tuple[dict, str]:
    """
    Run the full 3-tier pipeline on a list of images representing ONE book.

    Returns (metadata_dict, source_str) where source is
    'openlibrary', 'gpt4o', or 'merged'.
    """
    # ── Step 1: barcode scan (all images) ──────────────────────────────────
    isbn = find_isbn(images)

    # ── Step 1a: OpenLibrary lookup ────────────────────────────────────────
    ol_meta: dict | None = None
    if isbn:
        print(f"    ✓ Barcode found: {isbn} → querying OpenLibrary …")
        ol_meta = lookup_by_isbn(isbn)
        if ol_meta and ol_meta.get("title") and ol_meta.get("author"):
            print("    ✓ OpenLibrary full hit — no GPT-4o call needed")
            return ol_meta, "openlibrary"
        if ol_meta:
            print("    ~ OpenLibrary partial hit — will supplement with GPT-4o")
        else:
            print("    ~ OpenLibrary miss — falling back to GPT-4o")
    else:
        print("    ~ No barcode detected — using GPT-4o vision")

    # ── Step 2: GPT-4o vision ──────────────────────────────────────────────
    prompt = BOOK_METADATA_EXTRACTION_PROMPT
    if isbn and ol_meta:
        known = {k: v for k, v in ol_meta.items() if v is not None}
        hint = ", ".join(f"{k}={v!r}" for k, v in known.items())
        prompt = (
            f"CONTEXT: Barcode scan already identified: {hint}.\n"
            f"Use these as ground truth; focus on extracting remaining null fields.\n\n"
            + prompt
        )
    elif isbn:
        prompt = (
            f"CONTEXT: Barcode scan found ISBN={isbn!r}. Use this as the isbn field.\n\n"
            + prompt
        )

    print(f"    → Sending {len(images)} image(s) to GPT-4o …")
    gpt_meta = analyze_multiple_images(gpt_client, images, prompt)

    if ol_meta:
        final = _merge_with_gpt(ol_meta, gpt_meta)
        source = "merged"
    else:
        final = gpt_meta
        source = "gpt4o"

    if isbn and not final.get("isbn"):
        final["isbn"] = isbn

    return final, source


# ─────────────────────────────────────────────────────────────────────────────
# Test runner
# ─────────────────────────────────────────────────────────────────────────────


def run_tests():
    sample_dirs = sorted(d for d in SAMPLES_DIR.iterdir() if d.is_dir())
    if not sample_dirs:
        print("No sample folders found in", SAMPLES_DIR)
        return

    print(f"Found {len(sample_dirs)} sample book(s): {[d.name for d in sample_dirs]}\n")

    # Create GPT-4o client once (shared across all samples)
    print("Initialising OpenAI client …")
    try:
        gpt_client = create_client()
    except Exception as exc:
        print(f"❌ Could not create OpenAI client: {exc}")
        print("   Check credentials/openai_key.txt exists and contains a valid key.")
        sys.exit(1)

    results = {}
    OUTPUT_DIR.mkdir(exist_ok=True)

    for sample_dir in sample_dirs:
        print(f"\n{'=' * 60}")
        print(f"Sample: {sample_dir.name}")
        print(f"{'=' * 60}")

        images = load_images_from_folder(sample_dir)
        if not images:
            print("  ⚠  No images found — skipping")
            continue

        print(f"  Images ({len(images)} total — all represent ONE book):")
        for img in images:
            kb = len(base64.b64decode(img["base64"])) // 1024
            print(f"    • {img['filename']} ({kb} KB, {img['mime_type']})")
        print()

        t0 = time.perf_counter()
        try:
            metadata, source = recognize(images, gpt_client)
        except Exception as exc:
            print(f"  ❌ Recognition failed: {exc}")
            metadata = {"error": str(exc)}
            source = "error"
        elapsed = time.perf_counter() - t0

        print(f"\n  ✅ Result (source={source!r}, took {elapsed:.2f}s):")
        for key, val in metadata.items():
            display = repr(val) if val is not None else "null"
            print(f"    {key:12s}: {display}")

        results[sample_dir.name] = {
            "source": source,
            "elapsed_s": round(elapsed, 2),
            "data": metadata,
        }

    # Save combined results
    out_path = OUTPUT_DIR / "recognition_test_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n{'=' * 60}")
    print(f"All results saved to {out_path}")


if __name__ == "__main__":
    run_tests()
