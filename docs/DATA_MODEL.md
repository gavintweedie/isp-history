# Data Model

The project is a **directed graph**. Nodes are **ISPs** (entities with a name
history). Edges are **transitions** (rename, merger, acquisition, split) between
ISPs. Supporting data: **references** (evidence) and **aliases** (other names).

## Core concepts

```
        (name history)
   ┌──────────┐   renamed   ┌──────────┐
   │  ISP A   │ ───────────▶│  ISP B   │
   └──────────┘             └──────────┘
   ISP A and ISP B are the SAME entity, two names.

        (split: retail arm to X, enterprise arm to Y)
   ┌──────────┐  retail arm     ┌──────────┐
   │  ISP Z   │ ───────────────▶│  ISP X   │
   │          │  ent. arm       ┌──────────┐
   │          │ ───────────────▶│  ISP Y   │
   └──────────┘                 └──────────┘
```

### Entities vs transitions

- **Entity (ISP):** a single corporate lifespan. One row per ISP, carrying its
  `birth` (founding) and `death` facts. Its name history is stored separately so a
  rename is recorded as a name row, not a new entity.
- **Transition:** an event that links two entities: `from_isp` → `to_isp`. Types:
  - `rename` — same company, new name (1:1)
  - `merger` — two or more entities become one (many:1)
  - `acquisition` — one buys another (1:1; the acquiree continues or is absorbed)
  - `split` — one entity produces one or more successors (1:many), each arm labelled.
    **A full sale is just a split with a single 100% arm.** Ownership changes are
    therefore expressed as a split whose arm label describes what was sold and to whom.
- **Arm label:** free text on a transition, e.g. `"retail arm"`, `"enterprise arm"`,
  `"100% sold to X"`. Used heavily for splits. Never null for a split.

## Data storage (JSON files in git)

Data is the single source of truth and lives in `data/` as plain JSON, so
contributors submit changes as pull requests (each ISP is a small, diffable
file):

```
data/
├── isps/
│   ├── aarnet.json       # one file per ISP, named by slug
│   ├── iinet.json
│   └── …
└── transitions.json      # all edges in one file
```

Numeric ids (the old SQLite PKs) are **not stored**; the app derives them
deterministically at load time (ISPs by sorted slug, then each ISP's
names/aliases/events in listed order, then transitions by year). Slugs are
the stable identifiers used everywhere on disk and in URLs.

### `data/isps/<slug>.json`

| field       | notes                                                            |
|-------------|------------------------------------------------------------------|
| `name`      | current/primary display name (the headline the GUI shows; use the name the business was best known by to the public for the longest period) |
| `slug`      | unique id for URLs and file name                                 |
| `birthplace`| optional (city/country)                                          |
| `status`    | `active` / `inactive` / `unknown`                                |
| `website`   | current homepage (for Wayback linking)                           |
| `summary`   | short description                                                |
| `names`     | array of name-history entries (see below)                        |
| `aliases`   | array of other trading names (plain strings)                     |
| `events`    | array of lifecycle facts: `birth` / `death` / `note`             |
| `refs`      | array of evidence refs backing this ISP                          |

A `names` entry:

| field       | notes                                  |
|-------------|----------------------------------------|
| `name`      | trading name                            |
| `start_year`| ordering year (start of period of use)  |
| `start_disp`| display, e.g. `"c. 1995"`, `"mid-97"`   |
| `end_year`  | omitted if the name is still current    |
| `end_disp`  | display, e.g. `"c. 1995"`, `"Dec 2005"` |

**Date bounds (`end_year` / `end_disp`).** Each `names[]` row is bounded by the
period the name was actually in use: `start_year`/`start_disp` open it, and
`end_year`/`end_disp` close it (both omitted while the name is still current).
`*_year` gives the sort order and timeline position; `*_disp` is the
human-readable rendering, which may be approximate (e.g. `"c. 2001"`). The GUI
shows each row as `"start_disp → end_disp"` — e.g. the "formerly Datafast
Telecommunications, 15 Mar 1996 → 15 Dec 2005" sub-line. Rows need not be
contiguous: a brand can predate the legal rename, so one row's end and the next
row's start may overlap, which is why the end bound lives on the row rather than
being implied by the following row's start.

**Primary name.** The top-level `name` is the primary display (headline) name
the GUI shows. For an entity with a name history, set `name` to the name the
business was best known by to the public for the longest period (often not the
founding name and not necessarily the last one); all other trading names are
kept as dated `names[]` rows, so nothing is lost. The GUI renders `name` as the
headline and the `names[]` rows as a dated history — a "formerly/later" sub-line
and tooltip on the timeline, a tooltip on the tree, a "Name history" column in
the directory, and a "Name history" table on the detail page.

**Renames.** A rename within a single corporate lifespan (same ACN) is recorded
as a dated `names[]` row, **not** a new entity — see "Rename without new entity"
below. Rows are ordered by `start_year` and may overlap where a brand predates a
legal rename (e.g. an ISP brand in use before the company's legal name change),
so `end_year`/`end_disp` are kept on each row to bound its period of use.

An `events` entry (an ISP's *founding* is an event with `kind=birth`, not a
transition — there is no predecessor ISP):

| field       | notes                                                |
|-------------|------------------------------------------------------|
| `kind`      | `birth` / `death` / `note`                           |
| `year`      | ordering year                                        |
| `date_disp` | display, e.g. `"Dec 1992"`, `"c. 1995"`              |
| `precision` | `exact` / `approx` / `by` / `unknown` (see below)    |
| `details`   | e.g. reason for death / founder / parent company      |
| `refs`      | evidence for *this specific date* (the source of a date is recorded on the event itself, so a better source found later can be compared against the old evidence) |

`kind = 'note'` is for incidental facts (e.g. "was owned by X between Y and Z").

**Date precision:**

| value     | meaning                                                              |
|-----------|----------------------------------------------------------------------|
| `exact`   | confirmed calendar date/year                                          |
| `approx`  | best estimate, e.g. "c. 1995"                                         |
| `by`      | *terminus ante quem* — known to exist by this year (first website capture, first reference such as a membership list, or domain/ASN registration). The real start may be earlier. |
| `unknown` | no date at all                                                        |

### `data/transitions.json`

`{"transitions": [...]}`, one entry per directed edge (rename / merger /
acquisition / split):

| field       | notes                                              |
|-------------|----------------------------------------------------|
| `type`      | `rename`/`merger`/`acquisition`/`split`           |
| `from`      | slug of the predecessor ISP                        |
| `to`        | slug of the successor ISP                          |
| `arm_label` | nullable; required for split/sale arms, e.g. `"100% sold to X"` |
| `year`      | ordering year                                      |
| `date_disp` | display, e.g. `"Oct 2004"`, `"early 1998"`         |
| `notes`     | context                                           |
| `refs`      | evidence refs for this transition                  |

### Refs (evidence)

Every ref has `kind` (`wikipedia` / `news` / `official` / `archive`), `url`,
optional `label`, optional `archive_url`, optional `year` (the approximate year
the source confirms). Refs are **nested inside the entity they back** (an ISP,
one of its events, or a transition), which makes orphaned/stale references
structurally impossible. The frontend uses `url` directly and offers a Wayback
link; if `archive_url` is set it is preferred. `url` and `archive_url` must be
`http`/`https` with a host — other schemes (`javascript:`, `data:`, `ftp:`) are
rejected at load time (`app/db.py:_validate_refs`) to prevent stored XSS
(templates in `app/templates/_refs.html` also guard).

## Date convention (D4)

Two columns everywhere dates matter:
- `*_year` (INTEGER) — always filled with our best estimate; used for sorting and the
  graph's x-axis.
- `*_disp` (TEXT) — human-readable rendering, may be approximate: `"c. 1997"`,
  `"mid-1995"`, `"Feb 1997"`, `"2001"`.

This lets the tree sort chronologically while displaying honesty about uncertainty.

## Date sourcing when dates are unknown (D10)

When an ISP's birth year is not directly recorded, we set it to a defensible
proxy and mark `events.precision`:

1. **First website capture** (Wayback Machine) — strongest evidence of existence.
2. **First reference** (membership lists, news, Whirlpool).
3. **Domain registration / APNIC whois** (domain creation or ASN/netblock allocation).

All of these are `by`-type dates ("existed by X"), and the specific source is kept
as a reference on the birth event so later, better sources can be compared and the
date upgraded. See `docs/DECISIONS.md` D10.

## Modelling the tricky cases

1. **Rename without new entity:** one ISP row, two name rows.
   ```
   isps:  (id=5, name="iiNet")
   names: (5, "iiNet", 1995→2000, primary), (5, "iiNet Ltd", 2000→now, primary)
   ```
2. **Acquisition, brand continues:** `acquisition` transition from acquiree → buyer.
   Acquiree keeps its `status=active` as a brand; the transition records the ownership
   change and the buyer relationship.
3. **Acquisition, brand killed:** `acquisition` transition from acquiree → buyer, and
   a `death` event on the acquiree with the reason. The tree shows the arrow; the
   detail panel shows it was folded in.
4. **Split (one ISP → two buyers):** two `split` transitions from the old ISP, each
   with its own `arm_label`, `year`, and references. Old ISP gets a `death` event.
5. **Merger (two → one):** two `merger` transitions into the survivor, which also gets
   a `birth`-equivalent note. Names history handles the name of the merged entity.
6. **Full sale (single 100% arm):** one `split` transition with `arm_label` like
   `"100% sold to X"`. No need for a separate `sale` type.

## Writing style & prose conventions

The tone across all ~1,050 `data/isps/*.json` files is **terse, factual, encyclopaedic**
— compressed reference prose, not marketing copy and not full sentences where a
clause will do. Match it when adding or editing records.

### `summary` (one field, one string)

- **One packed sentence**, typically ~80–160 chars (median ≈120), clauses joined by
  **semicolons** — not multiple sentences. Fragments are fine; a leading verb/subject
  is often dropped: *"Sydney dialup ISP; gone by ~2002."*
- **Shape:** `<place> <type> ISP (<parenthetical detail>); <fate>.` e.g.
  *"Melbourne premium dialup + hosting + e-commerce ISP; dead c.2008."*
- Service lists use `+`: *"dialup + ADSL + hosting"*.
- **End with a parenthetical carrying the legal entity + ACN** where known — this is
  the single most common closing device (≈1/3 of files):
  *"…still active (ACE INTERNET SERVICES PTY LTD, ACN 071 944 959)."* Company names go
  in ALL CAPS exactly as they read on ABR; ACN as three space-separated triplets.
- State the **fate** plainly: `still active`, `defunct`, `dead c.2008`, `wound down`,
  `acquired by X (YEAR)`, `merged with Y to form Z`.
- Present tense for current status; past for history.

### `details` (on events)

- A phrase or one/two short sentences giving the *why/who/how* of that event.
- **birth:** what it was + who/where — *"Founded October 1996, Perth WA (ACN 075 343 136)."*
  When the year is a proxy, say so and cite the proxy inline: *"Earliest Wayback capture
  17 Sep 2000 (acomnet.com.au); Hornsby NSW ISP."*
- **death:** the mechanism — *"Acquired by EFTel (17 Jul 2006)."*, *"Merged with Viper…"*,
  *"Defunct."* When tightening a bound from archive evidence, describe the transition
  observed (retail page → parked/webmail/placeholder) so the reasoning is auditable.
- **note:** incidental facts — ownership between dates, domain reuse, litigation, etc.
- If a claim is inferred or uncertain, say it in the text (*"birth predates the archive
  and is unverified"*, *"flagged low-confidence"*) rather than dropping it silently.

### Date display (`start_disp` / `end_disp` / `date_disp`)

Render honesty about precision (pairs with the `precision` field):

| pattern | use with `precision` | example |
|---|---|---|
| `1997`, `2005` | `exact` (year only) | `"1992"` |
| `3 Dec 1998`, `17 Jul 2006` | `exact` (full date) | `"15 Aug 2000"` |
| `Jul 2001`, `Dec 2005` | `exact`/`approx` (month) | `"Jan 2004"` |
| `c. 1997` | `approx` | `"c. 2005"` (most common form) |
| `by 1998`, `by 2013` | `by` (terminus ante quem) | `"by Jul 2019"` |
| `c. 2010-15`, `early 1997`, `mid-97` | `approx` (range/qualitative) | `"c. 2013-15"` |

Use `c. ` (with the space) for circa; `by ` for "existed by". Keep `*_year` as the
sortable integer even when `*_disp` is fuzzy.

### `birthplace`

Most common forms, in order: `City, STATE` (≈60%), `City (Region), STATE`
(≈18%, region clarifies a suburb → metro, e.g. `"Chatswood (Sydney), NSW"`),
`Australia` (national/unknown-city, ≈15%), `Australia (national)`, or bare `STATE`.
State abbreviations: `NSW VIC QLD SA WA TAS NT ACT`.

### `refs` labels

Short, source-first, human-readable. Dominant patterns:

- Archive: `"<Name> (Wayback <date>)"` — *"Acepia (Wayback 19 Dec 1996)"*; or a
  descriptive `"Wayback <date>: <what it shows>"`.
- Cynosure directory: `"<Name> (Cynosure 2002)"`.
- ABR/gov: `"ABR: <ENTITY IN CAPS> ACN <nnn nnn nnn>"`.
- News: `"<Publication> (<date>): '<headline/quote>' - <gloss>"`.

Ref `kind` is one of `archive` / `gov` / `official` / `news` / `wikipedia`
(`archive` is by far the most used). Prefer a real page URL over a search-engine URL;
Wayback (`web.archive.org/web/<ts>/<url>`) and ABR (`abr.business.gov.au/ABN/View?abn=`)
are the primary evidence sources.

### The `source` field (added Sep 2026)

Some `names[]` and `events[]` rows also carry a `source` field: an **array of plain
strings**, each either a real URL (Wayback/ABR/etc. — never a search-engine link) or a
short description of the source. It is a lightweight, human-readable evidence note added
during verification passes; it complements but does **not** replace the structured
`refs` array, which remains the canonical machine-consumed evidence mechanism (the app
renders `refs`, not `source`). When both are present, keep them consistent. For new work,
prefer adding a structured `refs` entry; use `source` when you want a quick inline
citation without the full `{kind,url,label}` object. (Reconciling the two — or teaching
the app to render `source` — is an open follow-up.)

## Open questions (to resolve during build)

- Do we need a `parent company` / ownership chain separate from transitions, or is the
  transition graph sufficient? (Initial stance: transitions are sufficient; revisit
  if we need to model conglomerates like TPG owning dozens of brands.)
- Timestamps vs. display dates for the graph x-axis when two events share a year:
  resolve with `date_disp` ordering in code, no schema change needed.
