# Decision Log

Every significant decision for this project is recorded here. Most-recent first.
Each entry: date, decision, rationale, alternatives considered.

---

## 2026-08-13 — Tree view: layered Sugiyama layout with width-capped wrapping

- **Decision:** Replace both dagre and the short-lived birth-era layout in the
  Tree with a hand-rolled **layered (Sugiyama-style) layout**. Parents sit
  directly above children (layers by lineage depth); within-layer ordering is
  refined by barycenter sweeps to minimise crossing edges; layers wider than
  ~92% of the screen are **wrapped into columns** so the graph is bounded by a
  typical display width instead of growing unreadably wide; each connected
  family is one contiguous block (isolated ISPs pooled into one shared band),
  blocks stacked vertically. The view fits to the container's **width** and
  scrolls vertically.
- **Why a new layout:** an audit showed the old dagre rows were wide because the
  largest family has **128 ISPs in a single generation** (its roots — the family
  is a 128-entry acquisition fan converging 128 → 31 → 13 → 6 → 3 → 2 → 1), and
  **53% of that family's edges skip at least one lineage level**. Generation rows
  therefore blew the width out to ~18,000px. Layering + wrapping bounds the tree
  to ~1.5k px wide and cuts crossing edges by ~half (661 vs 1,295 in the largest
  family, measured by the layout mimic used in prototyping).
- **Alternatives considered:** birth-era regions (built, then reverted — bands
  scattered family branches and left long diagonal edges crossing over nodes);
  grouping roots into columns under their successor (a `{x,y}` enhancement on
  top of this layered order); taxi/orthogonal edge routing (deferred).
- **Impact:** `app/static/tree.js` `layeredLayout()` + `fitToWidth()`, edges
  hidden when either endpoint is hidden. Supersedes the 2026-08-13 "stack
  families vertically" and "age-region layout" entries.

---

## 2026-08-13 — Tree view: stack families vertically instead of side-by-side

- **Decision:** Replace dagre in the Tree with a hand-rolled **age-region
  layout**. Y is a vertical band per birth-era (Pre-Dialup / Dialup /
  DSL-cable era / NBN era, oldest at top); within a band, ISPs pack into
  width-capped columns so the graph never exceeds ~92% of the screen width and
  grows tall instead. ISPs are ordered by family (connected component) first,
  so a family's members stay near each other band-to-band and edges stay short.
  The view now fits-to-width instead of fitting both axes.
- **Rationale:** dagre's top-down layout put every ISP of the same lineage
  **generation** on one horizontal row. One family has **128 ISPs in a single
  generation**, which made the tree ~18,000px wide — unusable at any screen
  width. Age-based regions measure ~1,290px wide × ~1,750px tall on a typical
  1400px screen (measured against live data by the layout mimic in the commit
  note), fit typical display dimensions, and give the readability the user
  asked for: same-era ISPs align vertically with each other.
- **Alternatives considered:** cluster families into dagre compound nodes
  (unsupported by dagre); keep per-family vertical stacking (each band's
  widest generation still dominates the width); transposing the timeline's
  x=time layout into the tree (redundant with the Timeline tab).
- **Impact:** `app/static/tree.js` `applyView()` → `ageRegionLayout()` +
  `fitToWidth()`, edges hidden when either endpoint hidden. Supersedes the
  2026-08-13 "stack families vertically" entry.

---

## 2026-08-13 — Tree view: stack families vertically instead of side-by-side

- **Decision:** After dagre lays out the visible graph, the connected
  components are re-stacked in a post-pass: every family becomes a centred
  horizontal band, bands stacked top→bottom, isolated singletons pooled into
  one shared band (as on the timeline). With the default view (333 connected
  ISPs, 34 families) the tree now fills a 82vh tall container using vertical
  space instead of ~33 families spreading the layout ~3× wider than a typical
  screen. Families still read oldest-at-the-top within their band.
- **Rationale:** dagre places components to avoid overlap but spreads them
  side-by-side, which with dozens of families makes the graph a few thousand
  px wide (must pan horizontally to move through it). Stacking mirrors the
  timeline's family-band ordering: same mental model, no dagre config changes
  (ranks, node/edge separation are unchanged), ~1.6k of JS.
- **Alternatives considered:** switching dagre to `rankDir: 'LR'` (nodes
  stacked vertically, time left→right — changes the "oldest at the top"
  reading); wrapping families in compound nodes (unsupported by dagre);
  per-family separate layouts in one canvas (loss of internal dagre routing).
- **Impact:** `app/static/tree.js` `applyView()` (async `layoutstop` handler)
  + new `stackFamilies()`; `app.css` (`#tree` height 78→82vh); README.

---

## 2026-08-13 — Era dropdown alignment + sticky year-axis / era-title band

- **Decision:** Two timeline polish items. (1) The "Eras" dropdown rows are
  aligned into columns: checkboxes and colour swatches get fixed widths, option
  text never wraps, and the master "Select all" row carries an invisible swatch
  so its label starts on the same column as the per-era labels. (2) When eras
  are shown, their titles move out of the SVG into a `position: sticky` HTML
  band pinned to the top of the scrolling graph container, so they stay visible
  while the user scrolls the ~18k px tall timeline; title positions are
  recomputed against the SVG's actual rendered scale on tab-switch and resize.
  The **year axis moved into the same sticky band** (top row: year labels +
  ticks, era titles below), so the whole ruler stays readable while scrolling
  — the sticky band is now always present, not just when eras are enabled.
- **Rationale:** The era titles lived ~18,000px above the bottom of the
  timeline, useless once you scrolled. Pinning them via CSS (rather than e.g.
  duplicating the band inside the SVG, which can't scroll-stick) keeps the
  existing look while making the titles always readable; folding the year axis
  into the same band gives the user a persistent time ruler for free.
- **Impact:** `app/static/graph.js` (sticky `era-header` with year + era rows,
  `formatEraHeader()`); `app.css` (`.era-header` rows, fixed checkbox/swatch
  widths, nowrap rows).

---

## 2026-08-13 — Tree view: hide isolated ISPs by default + focus mode

- **Decision:** The Tree tab gains two readability features on top of the status
  filters. (1) An **"unconnected" toggle** that hides ISPs with no transitions
  (513 of 846 — iron-age singles with no family), **hidden by default** so the
  tree shows only connected families. (2) **Focus mode**: pressing Enter in the
  search box focuses the searched ISP's whole family — the undirected connected
  component it belongs to (parents, children, siblings, all routes) — and shows a
  hint ("Showing X and everything connected to it"); clearing the search or Esc
  restores the full tree. Search-typing highlights matches and **auto-enables** a
  hidden node's unconnected/status filter so anything you search for becomes
  visible, instead of being silently missing.
- **Rationale:** With 547 components, 513 of them singletons, the full 846-node
  tree is dominated by solitary boxes with no story; dropping them collapses the
  graph to the 34 real families (333 connected ISPs). Focus mode gives the
  "I want to see the whole history of one ISP" read — the same connected-family
  view the timeline deliberately shows per family band — without recursive
  click-throughs. Putting focus behind Enter (not live per keystroke) avoids a
  re-layout of the whole graph while typing.
- **Alternatives considered:** index book of all ISPs (Nice-to-have, still
  deferred); collapsible families / family stacking (rejected — dagre does the
  layering already); edge-colour legend (rejected — the timeline already conveys
  transition types); zoom-dependent labels, minimap, status fill tints (deferred).
  "Show unconnected only" instead of hide (rejected — the interesting content is
  the families).
- **Impact:** `app/static/tree.js` (isolated set, `applyView()` single view-state
  path, focus mode, auto-reveal on search); `index.html` (hint text, "unconnected"
  checkbox, Enter-to-focus hinting); `app.css`; `tests/test_app.py`;
  `docs/PLAN.md`.

---

## 2026-08-13 — Compact timeline layout: families by founding year

- **Decision:** Replace the timeline's global "lineage depth" banding with a
  compact, time-aware vertical ordering. Connected lineage components ("families")
  each get a contiguous row band ordered by **founding year**, parents above children
  (depth layers) within the band, and isolated ISPs with no transitions share one
  pool band packed by founding year so their lanes get reused. Lifespans are
  evidence-based: an ISP with no birth record is anchored at its earliest
  transition year (birth/ref proxies preferred), defaulting to 1985 instead of
  spanning the whole 1980→present range. Rows are packed so two ISPs never draw on
  top of each other and never pass within `MIN_SEP` (6px) of a concurrently-alive
  line. Geometry tightened: `TRACK_H` 88→34, `SLOPE` 1.4→0.8, `LAYER_GAP` 46→6.
- **Rationale:** With 846 ISPs the old layout (roots all piled into one depth-0
  band, full-span unknown dates blocking lane reuse) produced ~466 lanes / 41k px
  of near-parallel spaghetti. The compact layout measures **524 rows / 18,346px
  (~55% shorter) with zero coincident lines and zero close passes** on live data,
  while keeping family structure (parents above children) and reading
  chronologically. Measured by the new `tools/layout_score.py` harness, which
  mirrors the layout algorithm and fails if any invariant regresses.
- **Alternatives considered:** keeping one lane per ISP (classic Linux-Distribution-
  Timeline look — unreadably tall); global-depth bands (status quo); allowing true
  line crossings via shared lanes for concurrently-alive ISPs (rejected — lines in
  shared rows would coincide/hide each other).
- **Impact:** `app/static/graph.js` layout rewrite; `tools/layout_score.py` new;
  `tests/test_layout.py` new; `docs/PLAN.md`. Supersedes the barycentric track
  reordering described in 2026-08-09 entry (that pass operated on the old layers).

---

## 2026-08-13 — Connectivity-era overlays on the timeline

- **Decision:** The timeline gains era overlays that shade the background of the
  years a connectivity era was mainstream (Pre-Dialup, Dialup, DSL/Cable, NBN,
  2G–5G Mobile) with a translucent full-height band. Controls are an "Eras"
  multi-select **dropdown** (a master "all" row plus one row per era). Era
  definitions live as a frontend constant (`app/static/eras.js`), not in the
  database; state persists in `localStorage`. The four bands that frame the
  whole ISP history — Pre-Dialup, Dialup, DSL/Cable and NBN — are **on by
  default**; the overlapping mobile bands (2G–5G) default off.
- **Rationale:** Eras are static, Australian historical context for the timeline,
  not facts about the ISP graph, so keeping them in the data model would add noise
  to the DB. Translucent bands (alpha ≈ 0.13) stay light even where eras overlap
  (up to ~4 deep). The four broadband/fixed-line eras on by default frame the
  story without clutter; the mobile bands overlap those heavily, so they're off
  until the user opts in. A per-era toggle (not just a single switch) is needed because the
  eight eras overlap heavily.
- **Alternatives considered:** stored in the `isps`/`events` model (rejected —
  display-only metadata); vertical strips per era instead of full-height shading
  (rejected — doesn't literally shade the per-year data area); eras shown by default
  (rejected — the user wants them off until enabled).
- **Impact:** new `app/static/eras.js`; `index.html` (era dropdown + script tag);
  `graph.js` (dropdown UI + era-band rendering, hidden by default); `app.css`;
  `tests/test_app.py`; `docs/PLAN.md`.

---

## 2026-08-09 — Timeline stays horizontal; barycentric track ordering

- **Decision 1 (orientation):** The timeline keeps time on the horizontal axis.
  Transposing to a vertical timeline was evaluated and rejected: with ~500 ISPs the
  lane count (~314 tracks) would make a vertical layout ~44,000px wide vs the current
  2,324px, and ISP names (horizontal text) fit naturally along horizontal lines.
  Vertical timelines suit sparse graphs (git logs), not bushy ones like this.
- **Decision 2 (crossing reduction):** Tracks within each lineage layer are reordered
  with Sugiyama-style barycentric down/up sweeps (adjacent-layer edges only).
  Measured on live data (507 ISPs, 228 transitions): 2,625 → 398 adjacent-layer
  edge crossings (~85% fewer). Cheap (~30 lines), no dependencies.
- **Decision 3 (page width):** The graph page (both tabs) now uses the full window
  width (`main.wide`), and the timeline SVG scrolls inside an 82vh container rather
  than growing the page to tens of thousands of pixels.
- **Impact:** `graph.js` ordering block, per-type transition colours + legend;
  `base.html` gains a `main_class` block.

---

## 2026-08-09 — Graph view: tabbed Tree (cytoscape.js + dagre) + Timeline

- **Decision:** The graph page (`/`) is now tabbed. The default **Tree** tab renders
  the lineage as a top-to-bottom layered DAG using **cytoscape.js** with the
  **dagre** layout (via `cytoscape-dagre`), all vendored in `app/static/vendor/`.
  The hand-rolled SVG **Timeline** remains as a second tab. Both consume the
  unchanged `/api/graph` JSON. The tree view adds pan/zoom, name search, status
  filters and a fit button.
- **Rationale:** With ~190 ISPs and 120+ transitions, the custom SVG timeline became
  unreadable: no zoom/pan, thousands of pixels of scrolling, and 100+ acquisition
  S-curves converging on a few hubs. A proper Sugiyama-style layered layout routes
  edges cleanly, and cytoscape provides interaction for free. Vendoring keeps the
  no-build-step constraint (D1) while removing any CDN dependency.
- **Note:** This supersedes D6. The vis-network hierarchical layout chosen in D6 was
  never actually shipped; the SVG timeline replaced it during Phase 2 and the docs
  were not updated at the time.
- **Impact:** new `app/static/tree.js`, `tabs.js`, `vendor/`; `index.html` is now a
  tabbed page; `graph.js` unchanged.

---

## 2026-08-09 — Approximate birth dates with precision + sourced evidence

- **Decision:** When an ISP's birth year is unknown, set a defensible proxy and
  record it in three ways: (1) an `events.precision` value of `exact` / `approx` /
  `by` / `unknown`; (2) the proxy year in `events.year`; (3) the evidence as a
  reference attached to the birth event itself.
- **Proxy order of preference (all are "by" / terminus-ante-quem):**
  1. first Wayback Machine website capture,
  2. first reference (membership lists such as WAIA, news, Whirlpool),
  3. domain registration or APNIC whois (domain creation / ASN or netblock allocation).
- **Rationale:** Data collection is comprehensive and many small ISPs have no
  recorded founding date. Keeping the *source of the date* attached to the event
  lets us upgrade dates later and compare old vs new evidence. Precision values
  stop us from presenting an upper bound as an exact birth.
- **Impact:** schema change — `events.precision` column; seed builder + docs updated.
  Display shows a small precision badge (`approx`/`by`) next to non-exact dates.

---

## 2026-08-08 — Sales are single-arm splits

- **Decision:** Folded `sale` into `split`. A full sale is modelled as one `split`
  transition with a single 100% arm; its `arm_label` describes what was sold and to
  whom (e.g. `"100% sold to X"`). Removed the separate `sale` transition type from the
  schema.
- **Rationale:** Confirmed with project owner: a full sale is just a 100% split in one
  direction. One transition type keeps the schema and graph code simpler, and partial
  sales/asset sales were already splits.
- **Impact:** `docs/DATA_MODEL.md` updated; `transitions.type` now allows
  `rename`/`merger`/`acquisition`/`split` only.

---

## 2026-08-08 — Project kickoff planning session

The following decisions were made in the initial planning conversation. All were
confirmed by the project owner.

### D1. Stack: Python + SQLite + web UI

- **Decision:** Backend in Python using Flask 3.1.3 (already installed). Database is
  SQLite (already installed). Interactive display is a single-page browser app.
- **Rationale:** Everything needed is already on the machine (Python 3.12, pip, Flask,
  Jinja2, sqlite3). No Node, Go or Java present, so a JS build toolchain was avoided.
  SQLite gives real querying for the graph without the overhead of MySQL/Postgres.
- **Alternatives rejected:** pure static HTML/JS (no server), heavier frameworks
  (need installs).

### D2. Data storage: SQLite is the single source of truth

- **Decision:** All raw data lives in one SQLite database. No JSON/CSV source of
  truth. Edits happen through the web editing form.
- **Rationale:** One authoritative store; the graph can be queried directly with SQL.
  The web form (D7) provides the editing path the owner wants.
- **Note:** `data/` still exists for exports/backups/seed data, but the DB is
  authoritative, not the exports.
- **Alternatives rejected:** JSON source-of-truth + import to SQLite (two sources of
  truth), CSV files (not a real DB).

### D3. Scope: comprehensive, all sizes

- **Decision:** Include as many Australian ISPs as we can find, down to tiny
  one-town ISPs and resellers, not just the big brands.
- **Rationale:** The owner explicitly wants comprehensiveness. Data collection is
  expected to be a long-running effort with contributions from both the owner and
  web research.
- **Trade-off accepted:** This means far more data work. The schema and import tooling
  must make bulk loading easy.

### D4. Date precision: approximate dates are first-class

- **Decision:** Dates may be approximate. Every dated field stores:
  1. an **approximate year** for ordering (e.g. `1997`),
  2. an optional **display string** for fuzziness (e.g. `"c. 1997"`, `"mid-1995"`,
     `"Feb 1997"`).
- **Rationale:** Real ISP data is full of uncertainty ("renamed sometime in the
  mid-90s"). We want to show that honestly without pretending to precision.
- See `docs/DATA_MODEL.md` for the exact convention.

### D5. Splits/merges: arm-labelled directed edges

- **Decision:** When an ISP goes to multiple parties (e.g. retail arm to ISP X,
  enterprise arm to ISP Y), each outgoing edge is a separate transition carrying an
  **arm label** (`"retail arm"`, `"enterprise arm"`) plus its own date and references.
- **Rationale:** This is the most common way the market actually splits, and it keeps
  the model honest.
- **Alternative rejected:** simple unlabeled splits (loses too much information).

### D6. Graph visualisation: vis.js hierarchical flowchart

- **Decision:** Frontend uses **vis-network** (vis.js) loaded from CDN, in hierarchical
  ("flowchart") layout with directed arrows.
- **Rationale:** Built for exactly this kind of directed graph, handles merges/splits
  well, and clicking a node opens a detail panel. No build step needed (CDN script tag).
- **Alternative rejected:** D3 custom tree (more control but much more code to
  maintain for a long-running project).

### D7. Data entry: web editing form

- **Decision:** ISPs, events and references are added/edited through a web form in
  the app itself.
- **Rationale:** The owner wants an in-browser way to contribute data. Bulk import
  tooling (CSV/JSON) is planned as a later convenience in `docs/PLAN.md` but the form
  is the primary path.
- **Alternatives rejected:** CLI + batch import only (owner prefers a form); both
  (deferring the import tooling).

### D8. History coverage: full era, 1980s → today

- **Decision:** Cover early pioneers (Pegasus, connect.com.au, IIR, AARNet, etc.)
  from the late 80s/early 90s through today. Pre-1989 UUCP/Fidonet era may be
  captured as context notes but is not a core target.
- **Rationale:** The full history is the interesting story, and the owner wants
  comprehensiveness.

### D9. References: structured citations + auto Wayback Machine

- **Decision:** Every transition and every ISP can carry structured references:
  `kind` (wikipedia / news / official / archive), a URL, and a label. The frontend
  automatically links to the **Wayback Machine** (`web.archive.org`) when a URL is
  dead or when an archive is needed, plus a manually-supplied archive URL if we have
  a specific snapshot in mind.
- **Rationale:** Evidence is what makes the tree trustworthy. Auto-wayback handles
  the reality that ISP websites die constantly.

## 2026-08-14 — Tree: hover traces the ISP path downstream

- **Decision:** Hovering a tree node (or edge) highlights that ISP's **forward
  path** — every successor reached by following transitions `source → target`
  (older → newer) down to today’s remaining ISPs — plus every edge along the
  route, and dims everything else. Down-tree only; predecessors are not lit.
  Supersedes the closed-neighbourhood highlight (directly connected only).
- **Impact:** `app/static/tree.js` `highlightNeighborhood()` BFS-es visible
  out-edges from the hovered node (or a hovered edge’s target) using
  Cytoscape `:visible` filtering.

## 2026-08-15 — Directory tab + toolbar checkbox grouping

- **Decision:** Add a **Directory** page (text listing: name | domain | birth | death)
  as a third tab next to Tree/Timeline, with back-tab links on the directory page for
  UI consistency, and rows linking to each ISP's read-only detail page. Detail pages
  already render no edit controls unless `admin`; every mutation route is behind
  `require_admin()` so a non-logged-in user can never update the database.
- **Decision:** Group the status checkboxes (active/inactive/unknown) in the tree
  toolbar and directory filter bar into a bordered `checkgroup` pill with a Status
  label, matching checkbox size and accent colour, so the filters read as a unit
  instead of floating loose between the search box and hint.

## 2026-08-15 — Consistent tab-bar position across pages

- **Decision:** Move the page tab bar out of `main` into a shared `{lock tabs 
## 2026-08-15 — Consistent tab-bar position across pages

- **Decision:** Move the page tab bar out of `main` into a shared `{% block tabs %}`
  rendered directly under the header on the graph page AND the directory page. The
  bar is full-width with the same horizontal padding as page content, so the tabs
  sit at the identical screen position when switching between Tree/Timeline and
  Directory instead of jumping between the full-width and centred layouts.

## 2026-08-17 — Data storage moves from SQLite to git-tracked JSON; site becomes read-only

**Supercedes D1 (the SQLite part) and D2.**

- **Decision:** Drop SQLite entirely. The dataset is now plain JSON in `data/`,
  one small file per ISP (`data/isps/<slug>.json`, with names/aliases/events/refs
  nested inside) plus `data/transitions.json`. Numeric ids are gone — slugs are
  the identifiers, and the app derives stable numeric ids at load (ISPs by sorted
  slug; transitions by `(year, from, to)`) so the tree/timeline JS (which needs
  integer node ids) keeps working.
- **Decision:** The site is now **read-only**. The admin login, CSRF machinery,
  session secret and every POST/write route are removed; `data/` is the only
  editing surface, via **pull requests**. This is the point of the change: a
  public repo where contributors submit data edits as git PRs with clean diffs
  and near-zero merge conflicts.
- **Rationale:** At ~911 ISPs / 333 transitions a DB is overkill; the JSON store
  loads <100ms and is cached on a file fingerprint, so a `git pull` of new data
  is picked up on the next request. Removes the `sqlite3` dependency and the
  binary, non-diffable, gitignored `.db` as the source of truth.
- **Migration:** a one-time `tools/export_isps.py` exported the existing SQLite
  DB to `data/` (verified: refs and transition endpoints preserved 1:1), then was
  removed once the migration was done. The `db/` schema+build tooling,
  `data/seed.json` and the Python list in `tools/build_seed.py` are gone.
  `tools/qa_report.py` (orphan refs / broken transitions are now structurally
  impossible) and `tools/layout_score.py` were ported to read the JSON files.
- **Alternatives rejected:** a single big `data.json` (PRs touch one huge file and
  conflict on ordering), JSONL (hard to hand-edit), keeping SQLite and writing a
  JSON export for PRs (two sources of truth).
