# Data

This directory is the dataset — the single source of truth for the site. It is
tracked in git and edited by **pull request**.

**License:** the contents of this directory are licensed
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see
[`LICENSE`](LICENSE). By opening a PR you license your contribution under the
same terms.

- `isps/<slug>.json` — one file per ISP. Its `names`, `aliases`, `events`
  (birth/death/note) and `refs` are nested inside the file.
- `transitions.json` — every merger/acquisition/split/rename, as `{"transitions": [...]}`,
  with `from`/`to` referencing ISP **slugs**.

Example `isps/iinet.json`:

```json
{
  "name": "iiNet",
  "slug": "iinet",
  "birthplace": "Perth, WA",
  "status": "inactive",
  "website": "https://www.iinet.net.au",
  "summary": "Perth-based ISP.",
  "names": [{ "name": "iiNet", "start_year": 1993, "start_disp": "1993" }],
  "events": [
    { "kind": "birth", "year": 1993, "date_disp": "1993", "precision": "exact",
      "details": "Founded in Perth." }
  ],
  "refs": [
    { "kind": "wikipedia", "url": "https://en.wikipedia.org/wiki/iiNet",
      "label": "Wikipedia: iiNet" }
  ]
}
```

Human-readable rules:

- **Don't invent IDs** — slugs are the identifiers; numeric ids are derived at load.
- **Slug = filename.** Keep them short, lowercase, dashes for spaces
  (`tpg-internet`). Never duplicate one.
- **Every date with evidence** is `year` + `date_disp`; add `precision`
  (`exact`/`approx`/`by`/`unknown`) when it isn't a plain confirmed year, and
  put the *source* in the event's `refs`.
- Omit empty/unknown fields rather than using `null`.

Full field reference: [`../docs/DATA_MODEL.md`](../docs/DATA_MODEL.md).
Quality expectations: [`../docs/DATA_QUALITY.md`](../docs/DATA_QUALITY.md).

Checks before opening a PR:

```sh
python3 -m pytest tests/
python3 tools/qa_report.py
```