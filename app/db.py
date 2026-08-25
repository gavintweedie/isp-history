"""JSON-file-backed data store for the ISP history app.

Data is the source of truth and lives in git:

    data/isps/<slug>.json     one file per ISP (names, aliases, events, refs)
    data/transitions.json     all transitions (from/to reference isp slugs)

The store is loaded into memory once and cached, keyed on a fingerprint of
the data files' (path, mtime, size), so a `git pull` of new data is picked
up without a restart. Ids are derived deterministically from the loaded
content: ISPs are numbered by sorted slug, then each ISP's names/aliases/
events are numbered in order, then transitions by (year, from, to).

The graph views require integer node ids (see tree.js/graph.js), so every
transition's `from`/`to` slugs are translated to the derived isp ids when
loaded.
"""

import glob
import hashlib
import json
import os
import re
import threading
import time
from urllib.parse import urlsplit

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("ISP_HISTORY_DATA", os.path.join(BASE_DIR, "data"))

_ISPS_GLOB = os.path.join(DATA_DIR, "isps", "*.json")
_TRANSITIONS_PATH = os.path.join(DATA_DIR, "transitions.json")

_store = None
_lock = threading.Lock()

# Fast fingerprint for the per-request cache check (server.py). Stats
# ~970 files (~3ms) so we memoize for a short TTL. This is *not* used
# for correctness in _ensure_loaded/store_fingerprint — those always
# stat fresh so tests and `git pull` are seen immediately. The memoized
# path may be up to _FP_TTL stale (acceptable for the read-only site;
# a restart is instant and the next miss rebuilds).
_FP_TTL = 1.0
_fp_memo = {"fp": None, "at": 0.0}
_fp_memo_lock = threading.Lock()


def _fingerprint_uncached():
    parts = []
    for path in sorted(glob.glob(_ISPS_GLOB)) + [_TRANSITIONS_PATH]:
        try:
            st = os.stat(path)
        except OSError:
            parts.append((path, -1, -1))
        else:
            parts.append((path, st.st_mtime, st.st_size))
    return tuple(parts)


def _fingerprint():
    """Memoized (fast) fingerprint — for server cache checks only."""
    now = time.monotonic()
    with _fp_memo_lock:
        if _fp_memo["fp"] is not None and (now - _fp_memo["at"]) < _FP_TTL:
            return _fp_memo["fp"]
    fp = _fingerprint_uncached()
    with _fp_memo_lock:
        _fp_memo["fp"] = fp
        _fp_memo["at"] = time.monotonic()
    return fp


def _is_safe_url(url):
    """Allow only http/https URLs with a host (defense against javascript: etc)."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url:
        return False
    try:
        p = urlsplit(url)
    except ValueError:
        return False
    return p.scheme in ("http", "https") and bool(p.netloc)


def _validate_refs(refs, context):
    """Fail fast on unsafe ref URLs so a bad PR cannot land stored XSS."""
    for r in refs or []:
        url = r.get("url")
        if url is not None and not _is_safe_url(url):
            raise ValueError(f"unsafe ref url in {context}: {url!r} (must be http/https)")
        archive = r.get("archive_url")
        if archive is not None and not _is_safe_url(archive):
            raise ValueError(f"unsafe archive_url in {context}: {archive!r}")


def _validate_website(url, context):
    if url is None or url == "":
        return
    url = url.strip()
    if not url:
        return
    # Website may be a bare host like "example.com" (no scheme) — treat
    # "http://"+url as the test. Reject only javascript:/data:/etc.
    if _is_safe_url(url) or _is_safe_url("http://" + url):
        return
    # Also reject if it looks like a dangerous scheme even without slashes
    low = url.lower()
    if low.startswith("javascript:") or low.startswith("data:") or low.startswith("vbscript:"):
        raise ValueError(f"unsafe website url in {context}: {url!r}")
    # Fallback: if it still doesn't look like a host, reject
    if " " in url or "\n" in url or "<" in url or ">" in url:
        raise ValueError(f"unsafe website url in {context}: {url!r}")


def _fingerprint_etag(fp=None):
    """Stable weak ETag for a fingerprint (first 16 hex chars of sha256)."""
    if fp is None:
        fp = _fingerprint()
    h = hashlib.sha256(repr(fp).encode()).hexdigest()[:16]
    return f'W/"{h}"'


def _sort_children(isp):
    """Stable per-ISP ordering mirroring the old SQL ORDER BY clauses."""
    isp["names"] = sorted(
        isp.get("names", []),
        key=lambda n: (n.get("start_year") is None, n.get("start_year") or 0),
    )
    isp["events"] = sorted(
        isp.get("events", []),
        key=lambda e: (e.get("year") is None, e.get("year") or 0),
    )


def _load():
    isps = []
    by_slug = {}
    for path in sorted(glob.glob(_ISPS_GLOB)):
        with open(path, encoding="utf-8") as f:
            isp = json.load(f)
        isp["slug"] = isp.get("slug") or os.path.splitext(os.path.basename(path))[0]
        isp.setdefault("names", [])
        isp.setdefault("aliases", [])
        isp.setdefault("events", [])
        isp.setdefault("refs", [])
        isp.setdefault("status", "unknown")
        _validate_website(isp.get("website"), f"isps/{isp['slug']}.json:website")
        _validate_refs(isp.get("refs"), f"isps/{isp['slug']}.json:refs")
        for n in isp.get("names", []):
            _validate_refs(n.get("refs"), f"isps/{isp['slug']}.json:names[{n.get('name')!r}].refs")
        for e in isp.get("events", []):
            _validate_refs(e.get("refs"), f"isps/{isp['slug']}.json:events[{e.get('kind')!r}].refs")
        _sort_children(isp)
        by_slug[isp["slug"]] = isp
        isps.append(isp)

    isps.sort(key=lambda i: i["slug"].lower())

    refs_by_entity = {}
    item_id = 0
    for isp_id, isp in enumerate(isps, start=1):
        isp["id"] = isp_id
        for item in isp["names"]:
            item_id += 1
            item["id"] = item_id
            refs_by_entity[("name", item_id)] = item.get("refs", [])
        for item in isp["events"]:
            item_id += 1
            item["id"] = item_id
            refs_by_entity[("event", item_id)] = item.get("refs", [])
        refs_by_entity[("isp", isp_id)] = isp["refs"]

    with open(_TRANSITIONS_PATH, encoding="utf-8") as f:
        data = json.load(f)

    transitions = []
    for t in data.get("transitions", []):
        t.setdefault("refs", [])
        _validate_refs(t.get("refs"), f"transitions.json:{t.get('from')!r}->{t.get('to')!r}.refs")
        transitions.append(t)
    transitions.sort(
        key=lambda t: (
            t.get("year") is None,
            t.get("year") or 0,
            t.get("from", ""),
            t.get("to", ""),
        )
    )
    for idx, t in enumerate(transitions, start=1):
        t["id"] = idx
        t["from_isp"] = by_slug[t["from"]]["id"]
        t["to_isp"] = by_slug[t["to"]]["id"]
        refs_by_entity[("transition", idx)] = t["refs"]

    return {
        "isps": isps,
        "by_slug": by_slug,
        "transitions": transitions,
        "refs_by_entity": refs_by_entity,
    }


def _ensure_loaded():
    global _store
    # Correctness path: always use uncached fingerprint so a `git pull`
    # or test file write is seen immediately (no TTL staleness).
    fp = _fingerprint_uncached()
    if _store is not None and _store["_fp"] == fp:
        # Prime the fast memo so server's next `_fingerprint()` (memoized)
        # is cheap, but the authoritative check above is always fresh.
        with _fp_memo_lock:
            _fp_memo["fp"] = fp
            _fp_memo["at"] = time.monotonic()
        return _store
    with _lock:
        # Re-stat inside the lock so a concurrent `git pull` between the
        # first check and the lock is not missed.
        fp2 = _fingerprint_uncached()
        if _store is not None and _store["_fp"] == fp2:
            with _fp_memo_lock:
                _fp_memo["fp"] = fp2
                _fp_memo["at"] = time.monotonic()
            return _store
        # Also handle the case where another thread already reloaded to fp
        # (outside check used fp, inside uses fp2 which may differ if file
        # changed between the two stats — use the fresh fp2).
        if _store is not None and _store["_fp"] == fp:
            # fp and fp2 differ only if file changed between stats; if store
            # still matches the *old* fp, we still need to reload to fp2.
            pass
        store = _load()
        store["_fp"] = fp2
        _store = store
        with _fp_memo_lock:
            _fp_memo["fp"] = fp2
            _fp_memo["at"] = time.monotonic()
        return _store


def store_fingerprint():
    """Fingerprint of the current data files; changes when data changes."""
    return _ensure_loaded()["_fp"]


def fingerprint_etag(fp=None):
    """Public ETag helper (memoized fingerprint -> weak ETag)."""
    return _fingerprint_etag(fp)


def get_isp(isp_id):
    s = _ensure_loaded()
    if 1 <= isp_id <= len(s["isps"]):
        return s["isps"][isp_id - 1]
    return None


def get_isp_by_slug(slug):
    return _ensure_loaded()["by_slug"].get(slug)


def get_names(isp_id):
    isp = get_isp(isp_id)
    return isp["names"] if isp else []


def get_aliases(isp_id):
    isp = get_isp(isp_id)
    return isp["aliases"] if isp else []


def get_events(isp_id):
    isp = get_isp(isp_id)
    return isp["events"] if isp else []


def get_transitions(isp_id):
    return [
        t for t in _ensure_loaded()["transitions"]
        if t["from_isp"] == isp_id or t["to_isp"] == isp_id
    ]


def get_references(entity_type, entity_id):
    return _ensure_loaded()["refs_by_entity"].get((entity_type, entity_id), [])


def get_references_for_entities(entity_type, ids):
    """All refs for a set of entity ids of one type, in id order."""
    s = _ensure_loaded()
    out = []
    for eid in ids:
        for ref in s["refs_by_entity"].get((entity_type, eid), []):
            r = dict(ref)
            r["entity_type"] = entity_type
            r["entity_id"] = eid
            out.append(r)
    return out


def get_isps(ids):
    """Batch fetch of ISPs by id (the 'other party' on each transition)."""
    return [isp for i in ids if (isp := get_isp(i)) is not None]


def all_isps():
    return list(_ensure_loaded()["isps"])


def _first_event(isp, kind):
    for e in isp["events"]:
        if e.get("kind") == kind:
            return e
    return None


def directory_rows():
    """Directory listing: name, primary domain, birth/death years, status.

    Primary domain is the ISP's website host, else the host of its oldest
    'archive' reference (a proxy for its original domain).
    """
    rows = []
    for i in _ensure_loaded()["isps"]:
        birth = _first_event(i, "birth")
        death = _first_event(i, "death")
        first_archive = None
        for r in i["refs"]:
            if r.get("kind") == "archive" and r.get("url"):
                if first_archive is None or (r.get("year") or 0) < (first_archive.get("year") or 0):
                    first_archive = r
        rows.append({
            "id": i["id"],
            "name": i["name"],
            "slug": i["slug"],
            "status": i["status"],
            "website": i.get("website"),
            "birth_year": birth.get("year") if birth else None,
            "birth_disp": birth.get("date_disp") if birth else None,
            "death_year": death.get("year") if death else None,
            "death_disp": death.get("date_disp") if death else None,
            "first_archive": first_archive["url"] if first_archive else None,
            "names": i["names"],
        })
    rows.sort(key=lambda r: r["name"].lower())
    return rows


def graph_nodes():
    """Nodes for the graph API: id, label, slug, birth/death years (with
    display strings and precision), name-start year, status."""
    nodes = []
    for i in _ensure_loaded()["isps"]:
        birth = _first_event(i, "birth")
        death = _first_event(i, "death")
        start_years = [n["start_year"] for n in i["names"] if n.get("start_year") is not None]
        nodes.append({
            "id": i["id"],
            "label": i["name"],
            "slug": i["slug"],
            "birth_year": birth.get("year") if birth else None,
            "birth_disp": birth.get("date_disp") if birth else None,
            "birth_precision": birth.get("precision") if birth else None,
            "death_year": death.get("year") if death else None,
            "death_disp": death.get("date_disp") if death else None,
            "death_precision": death.get("precision") if death else None,
            "name_start_year": min(start_years) if start_years else None,
            "status": i["status"],
            "names": i["names"],
        })
    return nodes


def graph_edges():
    """Edges for the graph API: from, to, type, arm_label, year."""
    return [
        {
            "id": t["id"],
            "from": t["from_isp"],
            "to": t["to_isp"],
            "type": t["type"],
            "arm_label": t.get("arm_label"),
            "year": t.get("year"),
            "date_disp": t.get("date_disp"),
        }
        for t in _ensure_loaded()["transitions"]
    ]
