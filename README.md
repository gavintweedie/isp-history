# ISP Family Tree — Australian ISP Lineage & History

A project to document the **evolution of the Australian ISP market** as an interactive
"family tree". It tracks when ISPs were born, when they died, and the complex web of
mergers, acquisitions, splits and renames that connect them — from the 1980s pioneers
(Pegasus, connect.com.au, AARNet, IIR) through to today's major players.

The result is a directed graph / flowchart you can click through in a browser, where
each node is an ISP (with its full name history) and each edge is a transition event
(rename, merger, acquisition, split) with supporting references. The graph page has
two views: a **tree** (layered family-tree layout — parents above children,
per-family blocks, wide generations wrapped into columns so it fits a typical
screen width and uses vertical space; ISPs with no recorded transition are
hidden by default behind an "unconnected" toggle, and pressing **Enter** on a
search result focuses that ISP's whole connected family)
and a **timeline** (horizontal Gantt bars left-to-right, stacked
vertically by family and founding era so related chains stay together and bars
never overlap; hover highlights the upstream/downstream lineage, click to lock,
`dates` toggle adds year labels, and a small gap prevents abutting bars from
looking joined). The timeline can overlay Australian connectivity **eras** (Dialup,
DSL/Cable, NBN, 2G–5G Mobile, …) as translucent background bands, picked from the
"Eras" multi-select dropdown (individual eras, or all at once). Pre-Dialup,
Dialup, DSL/Cable and NBN are on by default.

A third page, **Directory**, lists every ISP as text — name, domain, birth, death
— in a filterable table whose rows link to each ISP's full record. The whole app
is **read-only**; the data is edited by pull request.

## Contributing data

The entire dataset is plain JSON in `data/` and is edited via **pull requests**:

```
data/
├── isps/
│   ├── aarnet.json       # one small file per ISP, named by its slug
│   └── …
└── transitions.json      # all mergers/acquisitions/etc.
```

To add or fix an ISP: **edit (or add) `data/isps/<slug>.json`**, update
`data/transitions.json` if there's a transition to record, and open a PR. Each
ISP's file is tiny and self-contained, so PRs stay small and merge cleanly.

See `docs/DATA_MODEL.md` for the exact shape of every field, and
`docs/DATA_QUALITY.md` for the quality tiers and what counts as "done". For
adding an event date to an existing ISP, prefer recording the *source* as a
`refs` entry on that event rather than just the date — documented in the model.

Before sending a PR, run the health checks:

```sh
python3 -m pytest tests/          # app + data-store tests
python3 tools/qa_report.py        # data-quality report (no birth dates, etc.)
python3 tools/layout_score.py     # timeline layout invariants
```

## Running the site

```sh
python3 -m venv .venv && . .venv/bin/activate   # first time
pip install -r requirements.txt
ISP_HISTORY_BASE_PATH= python3 app/server.py
# open http://127.0.0.1:4004/
```

The site reads `data/` on first request and re-reads it whenever a data file
changes, so a `git pull` is all a deploy needs. See `docs/DEPLOYMENT.md`.

## Stack

| Layer      | Choice                                                              |
|------------|---------------------------------------------------------------------|
| Backend    | Python (Flask 3.1.3, already installed)                             |
| Data       | JSON files in git (`data/isps/*.json`, `data/transitions.json`) — no database dependency |
| Frontend   | Tabbed graph: cytoscape.js + dagre tree view (vendored, no build step) + custom SVG horizontal Gantt timeline |
| Data entry | Git pull requests; run `tools/qa_report.py` to check data health    |

## Repository layout

```
.
├── README.md               # this file
├── docs/
│   ├── DECISIONS.md        # decision log (why we chose what we chose)
│   ├── DATA_MODEL.md       # data model + file format for data/
│   ├── DATA_QUALITY.md     # data-quality tiers + current state
│   └── PLAN.md             # build roadmap
├── app/
│   ├── server.py           # Flask app (read-only)
│   ├── db.py               # loads data/isps/*.json + transitions.json into memory
│   ├── templates/          # Jinja2 templates
│   └── static/             # CSS/JS
├── data/                   # the dataset — one JSON file per ISP + transitions.json
├── tools/                  # maintenance/export scripts + qa_report.py + layout_score.py
└── tests/                  # pytest tests
```

## License

The project is **dual-licensed**, because the code and the data have different
terms:

- **Code** (everything except `data/`): **GPL-3.0-only** — see [`LICENSE`](LICENSE).
- **Data** (`data/` — the dataset): **CC BY-SA 4.0** — see
  [`data/LICENSE`](data/LICENSE). Share and adapt freely, with attribution and
  share-alike for any derivatives.

Contributions (pull requests) are welcomed under these same terms: by opening a
PR you license your contribution to the project under GPL-3.0 for the code and
CC BY-SA 4.0 for the data.

## Status

**Planning phase complete.** Decisions are recorded in `docs/DECISIONS.md`.
Building proceeds per `docs/PLAN.md`.

## Conventions

- All changes go through git; data changes go through pull requests.
- Only work inside this directory.
- Approximate dates are first-class (see `docs/DATA_MODEL.md`).

## AI

AI was used **heavily** in both creating the frontend and doing legwork in research. 
It became clear when I neared 100 networks that the many steps to locate information
on old networks (wayback/company searches/looking for articles about mergers) was
well suited to an LLM.

## Accuracy

As at end of August 2026 I feel this is a fair representation of how the family
tree evolved, but there are very much gaps and errors.

If you have a tip-off, data correction etc please raise a PR if you're up for it.
Or drop an issue with plain text information you have, include references like articles,
old website links etc - we can feed that to the AI robot to validate and do any
checks and it can write up the PR for you.
