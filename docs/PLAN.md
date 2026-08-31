# Build Plan

Build order for the project. Each phase ends in a working, committed state.

## Phase 0 — Scaffold
- [x] Git repo initialised (`main` branch).
- [x] Documentation: README, DECISIONS, DATA_MODEL, PLAN.
- [x] `.gitignore` (venv, `__pycache__`, exports). *(removed `*.db` 2026-08-17 — no more SQLite)*
- [x] Initial commit.

## Phase 1 — Data layer
- [x] `db/schema.sql` implementing the model in `docs/DATA_MODEL.md`.
      *(replaced 2026-08-17 by git-tracked JSON: `data/isps/<slug>.json` + `data/transitions.json`; see DECISIONS.md)*
- [x] `db/build_db.py` to create `isp_history.db` from schema.
      *(removed 2026-08-17 alongside the SQLite schema; data now lives in
      `data/` as git-tracked JSON — see DECISIONS.md)*
- [x] `app/db.py` store loader + query helpers (reads the JSON files, cached on fingerprint).
- [x] Smoke test: create DB, insert a sample ISP + rename + split, query back.

## Phase 2 — Read-only web app
- [x] Flask `app/server.py`:
  - `GET /` — graph page (tabbed: tree view + SVG timeline).
  - `GET /api/graph` — nodes + edges for the graph.
  - `GET /isp/<slug>` — entity detail page (name history, events, refs, wikipedia &
    Wayback links).
- [x] Graph views wired to the API: cytoscape.js + dagre layered tree (vendored,
      default tab) and the custom SVG timeline. (The original vis.js choice was
      never shipped — see DECISIONS 2026-08-09.)
- [x] Click a node → opens detail.
- [x] `BasePathMiddleware` + `ISP_HISTORY_BASE_PATH` so URLs work behind Caddy's
      `handle_path /isp-history/*` (see `docs/DEPLOYMENT.md`).

## Phase 3 — Editing (web forms → superseded by git PRs)
- [x] Add/edit ISP + name history + lifecycle (birth/death).
- [x] Add transitions (split/merger/acquisition/rename with arm labels) + edit/delete.
- [x] Add references to isps/events/transitions; delete.
- [x] Add/delete aliases and names.
- [x] systemd unit (`tools/isp_history.service`) + `docs/DEPLOYMENT.md`.

## Phase 4 — Data collection
- [ ] Import the owner's contributed data.
- [ ] Research + add early pioneers (Pegasus, connect.com.au, IIR, AARNet...).
- [ ] Add the major players and their acquisition chains (iiNet→TPG, Internode→iiNet,
      dodo→Vocus, AAPT→TPG/Telstra, etc.).
- [ ] Bulk import tool (`tools/import_csv.py`) to make batch loading feasible given the
      "comprehensive" scope.

## Phase 5 — Polish
- [x] Search/filter by name & status (tree view toolbar; timeline focus filter).
- [x] Colour/legend for transition types (timeline; status colours in both views).
- [x] Compact timeline layout: connected families ordered by founding year with
      parents above children, a shared pool band for isolated ISPs, evidence-based
      lifespans, and proximity-guarded row packing (no coincident or close lines;
      ~55% shorter on live data — measured by `tools/layout_score.py`).
- [x] Filter by decade/era — timeline "Eras" multi-select dropdown (master "all" +
      per era, none selected by default) shades each connectivity era with a
      translucent band (see `docs/DECISIONS.md` 2026-08-13).
- [x] Tree readability: "unconnected" toggle (ISPs with no transitions hidden by
      default → 333 connected ISPs across 34 families) + Enter-to-focus mode
      (searches the whole connected family, hint text, clear/Esc restores).
- [ ] Wayback auto-linking refinement.
- [ ] pydocstring/lint pass; tests in `tests/`.
- [x] `tools/layout_score.py` layout scoring harness (rows / height / coincident /
      close-pass invariants; run against live DB, fails on regression).

## Definition of done (project)
- Someone can load the app, click from Pegasus (1989) through to today's brands, and
  see the full tree of merges/splits/renames with citations.
- All data editable in-browser; all evidence linkable to Wayback Machine.
