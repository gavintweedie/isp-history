"""Shared URL safety validation (defense-in-depth against stored XSS).

Two levels:

- ``is_safe_url_strict`` — only absolute http/https URLs with a host.
  Used by db.py at load time for evidence refs (fail fast on bad PR data).
- ``is_safe_url`` — additionally tolerates bare hosts like ``example.com``
  (website fields); callers render those with an ``https://`` prefix.

Both reject ASCII control characters: ``urlsplit`` strips ``\\t\\r\\n``
*after* parsing (bpo-43882), so a scheme check alone can be subverted by
embedded control chars (e.g. ``"java\\tscript:alert(1)"``).
"""

from urllib.parse import urlsplit


def _has_control_chars(url):
    return any(ord(c) < 0x20 or ord(c) == 0x7F for c in url)


def is_safe_url_strict(url):
    """True only for absolute http/https URLs with a host."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url or _has_control_chars(url):
        return False
    try:
        p = urlsplit(url)
    except ValueError:
        return False
    return p.scheme in ("http", "https") and bool(p.netloc)


def is_safe_url(url):
    """True for http/https URLs with a host, or bare hosts like
    'example.com' (no scheme) that are safe when rendered as
    https://<host>."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url or _has_control_chars(url):
        return False
    low = url.lower()
    if low.startswith("javascript:") or low.startswith("data:") or low.startswith("vbscript:"):
        return False
    if "://" in url:
        return is_safe_url_strict(url)
    # No scheme: treat as bare host/path, test with https:// prefix
    if " " in url or "<" in url or ">" in url or '"' in url or "'" in url:
        return False
    return is_safe_url_strict("https://" + url)
