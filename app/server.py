"""Flask application for the ISP History family tree.

Data lives in git (data/isps/<slug>.json + data/transitions.json) and is
edited by pull request; this app is read-only. See docs/DATA_MODEL.md.

Run directly:  python3 app/server.py
Run under Caddy: see docs/DEPLOYMENT.md (reverse_proxy localhost:4004 with a
`handle_path /isp-history/*` block; the app serves paths relative to BASE_PATH).
"""

import hashlib
import json
import os
import re
import threading

from urllib.parse import urlsplit

from flask import (
    Flask,
    abort,
    current_app,
    jsonify,
    render_template,
    request,
    url_for,
)

from config import BASE_PATH, PORT
import db

app = Flask(__name__)

# Content-hash for static assets (mtime+hash would also work, but hash is
# exact: local vim or git pull that changes content busts cache, unchanged
# vendor files keep 1y immutable cache).
_static_hash_cache = {}  # filename -> (mtime, hash)


def static_hash(filename):
    """8-char sha256 of app/static/<filename>, cached by mtime."""
    # filename is trusted (from templates), join safely inside static_folder
    path = os.path.join(app.static_folder, filename)
    try:
        st = os.stat(path)
    except OSError:
        return "0"
    cached = _static_hash_cache.get(filename)
    if cached and cached[0] == st.st_mtime:
        return cached[1]
    try:
        with open(path, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()[:8]
    except OSError:
        h = "0"
    _static_hash_cache[filename] = (st.st_mtime, h)
    return h


app.jinja_env.globals["static_hash"] = static_hash


class BasePathMiddleware:
    """Tells Werkzeug to generate URLs prefixed with BASE_PATH.

    When BASE_PATH is empty the app is served at root (isp-history.narx.net).
    For backwards compat with Caddy's `handle_path /isp-history/*` on
    code.narx.net, also strip a leading /isp-history if present and set
    SCRIPT_NAME accordingly so old links keep working.
    """

    def __init__(self, wsgi_app, prefix):
        self.wsgi_app = wsgi_app
        self.prefix = prefix

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "")
        # Legacy prefix support even when BASE_PATH is empty
        if path.startswith("/isp-history"):
            environ["SCRIPT_NAME"] = "/isp-history"
            environ["PATH_INFO"] = path[len("/isp-history"):] or "/"
            return self.wsgi_app(environ, start_response)
        if self.prefix:
            environ["SCRIPT_NAME"] = self.prefix
            if path.startswith(self.prefix):
                environ["PATH_INFO"] = path[len(self.prefix):]
        else:
            environ["SCRIPT_NAME"] = ""
        return self.wsgi_app(environ, start_response)


app.wsgi_app = BasePathMiddleware(app.wsgi_app, BASE_PATH)


def _is_safe_url_strict(url):
    """Strict http/https with host."""
    try:
        p = urlsplit(url.strip())
    except ValueError:
        return False
    return p.scheme in ("http", "https") and bool(p.netloc)


def _is_safe_url(url):
    """Jinja helper: allow only http/https (defense-in-depth vs stored XSS).
    Bare hosts like 'example.com' (no scheme) are considered safe for
    website fields — they will be rendered as https://<host>."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url:
        return False
    low = url.lower()
    if low.startswith("javascript:") or low.startswith("data:") or low.startswith("vbscript:"):
        return False
    if "://" in url:
        return _is_safe_url_strict(url)
    # No scheme: treat as bare host/path, test with https:// prefix
    if " " in url or "<" in url or ">" in url or '"' in url or "'" in url:
        return False
    return _is_safe_url_strict("https://" + url)


# Expose to Jinja directly (so get_template().render works) and via context
app.jinja_env.globals["is_safe_url"] = _is_safe_url


@app.context_processor
def inject_globals():
    return {"base_path": BASE_PATH, "is_safe_url": _is_safe_url}


@app.template_filter("safe_url")
def _safe_url_filter(url):
    return url if _is_safe_url(url) else ""


@app.after_request
def set_security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "object-src 'none'",
    )
    # Browser caching: static assets with ?v=<hash> are immutable (hash
    # changes on any local edit or git pull), so 1y; without ?v fall back
    # to 1h. HTML pages left uncached so a deploy shows fresh content.
    # /api/graph is 5m + ETag (304) + gzip via Caddy.
    path = request.path
    if path.startswith("/static/"):
        if request.args.get("v"):
            # Hashed URL: content never changes without URL changing
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.startswith("/static/vendor/"):
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            resp.headers["Cache-Control"] = "public, max-age=3600"
    elif path == "/api/graph":
        resp.headers.setdefault("Cache-Control", "public, max-age=300")
        resp.headers.setdefault("Vary", "Accept-Encoding")
    return resp


# ---------------------------------------------------------------------------
# Public routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


def _primary_domain(website, first_archive):
    """Best-effort ISP domain: website host, else the original host of the
    oldest archived reference (stripping the web.archive.org/web/<ts>/ prefix)."""
    for raw in (website, first_archive):
        if not raw:
            continue
        u = raw.strip()
        m = re.match(r"^https?://web\.archive\.org/web/(\d+)(?:id_)?/(.*)$", u, re.I)
        if m:
            u = m.group(2)
        try:
            host = urlsplit(u if "//" in u else "http://" + u).netloc
        except ValueError:
            continue
        host = (host or "").lower()
        if host in ("web.archive.org",):
            continue
        if host.startswith("www."):
            host = host[4:]
        if host:
            return host
    return ""


@app.route("/directory")
def directory():
    rows = db.directory_rows()
    entries = []
    for r in rows:
        domain = _primary_domain(r["website"], r["first_archive"])
        entries.append({
            "name": r["name"],
            "slug": r["slug"],
            "status": r["status"],
            "domain": domain,
            "birth_year": r["birth_year"],
            "birth_disp": r["birth_disp"],
            "death_year": r["death_year"],
            "death_disp": r["death_disp"],
            "url": url_for("isp_detail", slug=r["slug"]),
        })
    return render_template("directory.html", entries=entries)


def _etag_matches(inm, etag):
    """True if If-None-Match header matches our ETag (handles lists and *)."""
    if not inm:
        return False
    inm = inm.strip()
    if inm == "*":
        return True
    for tag in (t.strip() for t in inm.split(",")):
        if tag == etag:
            return True
    return False


# In-memory cache for /api/graph, invalidated by data content changes. The
# graph is read-only and only changes on a git pull, so caching it avoids
# re-deriving the ~911 nodes every page load. db.store_fingerprint() is
# memoized (TTL ~1s) so the per-request stat storm collapses to ~0.01ms.
# We cache both the dict (for internal use) and the serialized body + ETag
# so cache hits skip json serialization and support 304 Not Modified.
# Skipped under TESTING.
_graph_cache = {"key": None, "data": None, "body": None, "etag": None}
_graph_lock = threading.Lock()


@app.route("/api/graph")
def api_graph():
    # Single fingerprint/ETag per request; reused for cache check, build,
    # and store so we pay the ~3ms stat cost at most once (memoized to
    # ~0.01ms on warm hits).
    if not current_app.config.get("TESTING"):
        key = db.store_fingerprint()
        etag = db.fingerprint_etag(key)
        inm = request.headers.get("If-None-Match")
        if _etag_matches(inm, etag):
            resp = current_app.response_class("", status=304)
            resp.headers["ETag"] = etag
            return resp
        with _graph_lock:
            if _graph_cache["key"] == key and _graph_cache["body"] is not None:
                if _etag_matches(inm, _graph_cache["etag"]):
                    resp = current_app.response_class("", status=304)
                    resp.headers["ETag"] = _graph_cache["etag"]
                    return resp
                resp = current_app.response_class(_graph_cache["body"], mimetype="application/json")
                resp.headers["ETag"] = _graph_cache["etag"]
                return resp

    nodes = []
    for r in db.graph_nodes():
        year = r["birth_year"] or r["death_year"] or r["name_start_year"]
        nodes.append({
            "id": r["id"],
            "label": r["label"],
            "slug": r["slug"],
            "birth": r["birth_year"],
            "birth_disp": r["birth_disp"],
            "birth_precision": r["birth_precision"],
            "death": r["death_year"],
            "death_disp": r["death_disp"],
            "death_precision": r["death_precision"],
            "year": year,
            "status": r["status"],
            "url": url_for("isp_detail", slug=r["slug"]),
        })
    edges = []
    for r in db.graph_edges():
        edges.append({
            "id": r["id"],
            "from": r["from"],
            "to": r["to"],
            "type": r["type"],
            "arm": r["arm_label"],
            "year": r["year"],
            "date_disp": r["date_disp"],
        })
    data = {"nodes": nodes, "edges": edges}
    if not current_app.config.get("TESTING"):
        body = json.dumps(data, separators=(",", ":")).encode("utf-8")
        with _graph_lock:
            _graph_cache["key"] = key
            _graph_cache["data"] = data
            _graph_cache["body"] = body
            _graph_cache["etag"] = etag
        inm = request.headers.get("If-None-Match")
        if _etag_matches(inm, etag):
            resp = current_app.response_class("", status=304)
            resp.headers["ETag"] = etag
            return resp
        resp = current_app.response_class(body, mimetype="application/json")
        resp.headers["ETag"] = etag
        return resp
    return jsonify(data)


@app.route("/isp/<slug>")
def isp_detail(slug):
    isp = db.get_isp_by_slug(slug)
    if isp is None:
        abort(404)
    names = db.get_names(isp["id"])
    aliases = db.get_aliases(isp["id"])
    events = db.get_events(isp["id"])
    transitions = db.get_transitions(isp["id"])
    refs = db.get_references("isp", isp["id"])

    # Batch the per-item lookups below instead of one lookup per event /
    # transition. On lineage hubs (iiNet: many transitions) this keeps the
    # detail page cheap.
    event_refs = {}
    if events:
        for r in db.get_references_for_entities("event", [e["id"] for e in events]):
            event_refs.setdefault(r["entity_id"], []).append(r)

    other_ids = [t["to_isp"] if t["to_isp"] != isp["id"] else t["from_isp"] for t in transitions]
    others = {row["id"]: row for row in db.get_isps(other_ids)}

    trans_refs = {}
    if transitions:
        for r in db.get_references_for_entities("transition", [t["id"] for t in transitions]):
            trans_refs.setdefault(r["entity_id"], []).append(r)

    edata = [{"event": e, "refs": event_refs.get(e["id"], [])} for e in events]

    tdata = []
    for t in transitions:
        other_id = t["to_isp"] if t["to_isp"] != isp["id"] else t["from_isp"]
        tdata.append({
            "transition": t,
            "other": others.get(other_id),
            "incoming": t["to_isp"] == isp["id"],
            "refs": trans_refs.get(t["id"], []),
        })

    return render_template(
        "isp.html", isp=isp, names=names, aliases=aliases,
        events=edata, transitions=tdata, refs=refs,
    )


if __name__ == "__main__":
    print(f"ISP History on http://127.0.0.1:{PORT}{BASE_PATH}/  (base_path='{BASE_PATH}')")
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)
