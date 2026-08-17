"""Flask application for the ISP History family tree.

Data lives in git (data/isps/<slug>.json + data/transitions.json) and is
edited by pull request; this app is read-only. See docs/DATA_MODEL.md.

Run directly:  python3 app/server.py
Run under Caddy: see docs/DEPLOYMENT.md (reverse_proxy localhost:4004 with a
`handle_path /isp-history/*` block; the app serves paths relative to BASE_PATH).
"""

import re
import threading

from urllib.parse import urlsplit

from flask import (
    Flask,
    abort,
    current_app,
    jsonify,
    render_template,
    url_for,
)

from config import BASE_PATH, PORT
import db

app = Flask(__name__)


class BasePathMiddleware:
    """Tells Werkzeug to generate URLs prefixed with BASE_PATH.

    Caddy strips the /isp-history prefix before proxying, so Flask only ever
    sees path=/,/isp/<slug> etc. By setting SCRIPT_NAME, url_for() emits the
    full /isp-history/... paths the browser needs.
    """

    def __init__(self, wsgi_app, prefix):
        self.wsgi_app = wsgi_app
        self.prefix = prefix

    def __call__(self, environ, start_response):
        if self.prefix:
            environ["SCRIPT_NAME"] = self.prefix
            path = environ.get("PATH_INFO", "")
            if path.startswith(self.prefix):
                environ["PATH_INFO"] = path[len(self.prefix):]
        return self.wsgi_app(environ, start_response)


app.wsgi_app = BasePathMiddleware(app.wsgi_app, BASE_PATH)


@app.context_processor
def inject_globals():
    return {"base_path": BASE_PATH}


@app.after_request
def set_security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "  # 'unsafe-inline' needed for dynamic SVG layout positioning in graph.js
        "img-src 'self' data:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'",
    )
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


# In-memory cache for /api/graph, invalidated by data content changes. The
# graph is read-only and only changes on a git pull, so caching it avoids
# re-deriving the ~911 nodes every page load. db.store_fingerprint() is cheap
# (stat of the data files) and reloads the store when a file changes. Skipped
# under TESTING.
_graph_cache = {"key": None, "data": None}
_graph_lock = threading.Lock()


@app.route("/api/graph")
def api_graph():
    if not current_app.config.get("TESTING"):
        key = db.store_fingerprint()
        with _graph_lock:
            if _graph_cache["key"] == key and _graph_cache["data"] is not None:
                return jsonify(_graph_cache["data"])

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
        with _graph_lock:
            _graph_cache["key"] = db.store_fingerprint()
            _graph_cache["data"] = data
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
