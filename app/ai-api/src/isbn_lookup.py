"""
ISBN barcode detection + OpenLibrary metadata lookup.

Flow:
  1. Try to decode a barcode (ISBN-10 or ISBN-13) from each image using pyzbar.
  2. If found, call the OpenLibrary Books API (free, no key required).
  3. Return a normalised metadata dict — same shape as BOOK_METADATA_EXTRACTION_PROMPT response.
  4. Returns None if no barcode is found or the lookup fails.
"""

from __future__ import annotations

import io
import logging
import urllib.request
import urllib.error
import json

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Barcode detection
# ---------------------------------------------------------------------------


def _extract_isbn_from_bytes(image_bytes: bytes) -> str | None:
    """Try to find an ISBN-10 or ISBN-13 barcode in raw image bytes."""
    try:
        from pyzbar.pyzbar import decode as pyzbar_decode
        from PIL import Image
    except ImportError:
        log.debug("pyzbar / Pillow not installed — barcode detection skipped")
        return None

    try:
        img = Image.open(io.BytesIO(image_bytes))
        for barcode in pyzbar_decode(img):
            raw = barcode.data.decode("utf-8", errors="ignore").strip()
            # Accept ISBN-10 (10 digits) or ISBN-13 (13 digits starting with 978/979)
            digits = raw.replace("-", "").replace(" ", "")
            if len(digits) == 13 and digits[:3] in ("978", "979") and digits.isdigit():
                return digits
            if len(digits) == 10 and digits[:9].isdigit():
                return digits
    except Exception as exc:
        log.debug("Barcode scan error: %s", exc)
    return None


def find_isbn(images: list[dict]) -> str | None:
    """
    Scan a list of image dicts (keys: 'base64', 'mime_type') for ISBN barcodes.
    Returns the first ISBN found, or None.
    """
    import base64

    for img in images:
        raw_bytes = base64.b64decode(img["base64"])
        isbn = _extract_isbn_from_bytes(raw_bytes)
        if isbn:
            log.info("Barcode detected: %s", isbn)
            return isbn
    return None


# ---------------------------------------------------------------------------
# OpenLibrary lookup
# ---------------------------------------------------------------------------

_OL_ISBN_URL = "https://openlibrary.org/isbn/{isbn}.json"
_OL_WORKS_URL = "https://openlibrary.org{work_key}.json"
_OL_AUTHORS_URL = "https://openlibrary.org{author_key}.json"


def _fetch_json(url: str, timeout: int = 8) -> dict | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BookStoreApp/2.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except (
        urllib.error.HTTPError,
        urllib.error.URLError,
        json.JSONDecodeError,
        Exception,
    ) as exc:
        log.debug("HTTP fetch failed (%s): %s", url, exc)
        return None


def _extract_description(work: dict) -> str | None:
    desc = work.get("description")
    if isinstance(desc, str):
        return desc[:600] or None
    if isinstance(desc, dict):
        return (desc.get("value") or "")[:600] or None
    return None


def _extract_authors(edition: dict) -> str | None:
    """Resolve author names from the edition's author list."""
    authors = edition.get("authors", [])
    if not authors:
        # Try via works
        work_keys = edition.get("works", [])
        if work_keys:
            work = _fetch_json(_OL_WORKS_URL.format(work_key=work_keys[0]["key"]))
            if work:
                authors = work.get("authors", [])

    names = []
    for entry in authors:
        key = entry.get("key") or (entry.get("author") or {}).get("key")
        if not key:
            continue
        author_data = _fetch_json(_OL_AUTHORS_URL.format(author_key=key))
        if author_data:
            name = author_data.get("name") or author_data.get("personal_name")
            if name:
                names.append(name)
    return ", ".join(names) if names else None


def _extract_genre(edition: dict, work: dict | None) -> str | None:
    subjects = edition.get("subjects") or (work or {}).get("subjects") or []
    if subjects:
        # Map common OpenLibrary subject tags to friendly genre names
        raw = subjects[0] if isinstance(subjects[0], str) else str(subjects[0])
        return raw.split("--")[0].strip()[:80]
    return None


def lookup_by_isbn(isbn: str) -> dict | None:
    """
    Query OpenLibrary for metadata given an ISBN string.
    Returns a dict matching the BOOK_METADATA_EXTRACTION_PROMPT schema, or None on failure.
    """
    url = _OL_ISBN_URL.format(isbn=isbn)
    edition = _fetch_json(url)
    if not edition:
        log.info("OpenLibrary returned nothing for ISBN %s", isbn)
        return None

    # Title
    title: str | None = edition.get("title")
    subtitle: str | None = edition.get("subtitle")
    if title and subtitle:
        title = f"{title}: {subtitle}"

    # Publisher
    publishers = edition.get("publishers") or []
    publisher: str | None = publishers[0] if publishers else None

    # Year
    publish_year: int | None = None
    raw_date = edition.get("publish_date") or ""
    for tok in raw_date.split():
        if tok.isdigit() and 1000 <= int(tok) <= 2100:
            publish_year = int(tok)
            break

    # Authors (may require extra HTTP calls)
    author = _extract_authors(edition)

    # Work-level fields (description, subjects)
    work: dict | None = None
    work_keys = edition.get("works", [])
    if work_keys:
        work = _fetch_json(_OL_WORKS_URL.format(work_key=work_keys[0]["key"]))

    description = _extract_description(work) if work else None
    genre = _extract_genre(edition, work)

    result = {
        "title": title or None,
        "author": author or None,
        "isbn": isbn,
        "publisher": publisher or None,
        "year": publish_year,
        "genre": genre,
        "description": description,
    }

    log.info("OpenLibrary hit for ISBN %s: title=%r author=%r", isbn, title, author)
    return result
