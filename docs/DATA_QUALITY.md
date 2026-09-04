# Data Quality

This document describes the data-quality state of the ISP history database and how
to work on it. Run `python3 tools/qa_report.py` at any time for a live report.

## Quality tiers

Each ISP falls into one of four tiers:

| Tier | Meaning | Example |
|------|---------|---------|
| **Complete** | Birth + death/merger, connected to the tree, referenced, status known | iiNet, TPG Telecom, Superloop |
| **Partial** | Some real data (birth + connected, or researched but thin) | Eftel-era acquisitions, many Vocus/Superloop purchases |
| **Placeholder** | Name + `by 2002` only — the Cynosure directory batch | none (all resolved) |
| **Stub** | Name only, no dates/edges at all | a few |

## Current state (August 2026)

Baseline from `tools/qa_report.py`:

- Total ISPs: 1017; transitions: 366
- Placeholders (Cynosure by-2002): 0 — all ~180 resolved (batches 1-10, Aug 2026)
- No birth date: 0
- Birth `by`-only (upper bound): 211
  - ~80 upgraded from `by` to `exact`/`approx` in Aug 2026 research sprints (20 batches)
  - Remaining 211 have pending-research notes embedded in each file with specific checks to run
- Inactive but no death event: 12
  - All researched; no verifiable closure found. See "Known deliberate gaps" below.
- Status unknown: 0
- Birth year > death year: 0
- Duplicate display names: 0
- Active with no website: 0
- Leaf nodes (no transitions): 614

(Orphan refs / broken transitions are structurally impossible now — refs are
nested in the entity they back, and a transition referencing an unknown slug
fails the load.)

## Working conventions

- **Dates** use the precision system from `docs/DATA_MODEL.md`: `exact` / `approx` /
  `by` / `unknown`. `by` means "known to exist by this year" (first Wayback capture,
  first reference, or ASIC/domain registration).
- **Sources** are stored as references attached to the ISP or to the event. The
  Wayback Machine and ABN Lookup are the primary evidence sources; Whirlpool and
  news are secondary. Never add an unsourced date.
- **Trading names / dedupes** are recorded via the `aliases` array in the ISP's
  `data/isps/<slug>.json` file — keep the researched entity, make the duplicate
  name an alias of it.
- **Names that look the same may be different companies** — see the "Escape"
  entities (WA Escape Net / Adelaide EscapeNet / Melbourne Escape Online Internet)
  and "On the Net" vs "OntheNet". When in doubt, research before merging.

## ACN/ABN misattribution (systemic — check with `tools/check_acn_dates.py`)

The most common defect found during the Sep-2026 verification sprints was a
cited legal entity that is **not** the ISP: a later same-name or name-collision
company (occasionally a future-dated 2026 registration, or an unrelated trust /
foreign ARBN) whose ACN/ABN was scraped in as the ISP's own. When an ISP died
in 2003 but its summary cites an ACN registered in 2019, the ACN belongs to a
different company that happened to reuse the name.

`python3 tools/check_acn_dates.py` flags these mechanically: it estimates each
cited ACN's registration year (Australian Company Numbers are allocated roughly
sequentially, so the 9-digit value encodes an era — the tool interpolates
between ~60 anchor ACNs confirmed against ABR) and reports any dead ISP citing
an ACN estimated to register after its death. It is a **verify-against-ABR
worklist**, not proof — the estimate has a few years' slop. `--json` for
machine output, `--strict` to fail CI. When a hit is confirmed: remove the ACN
from the `summary`, relabel/replace the `gov` ref (mark it "unrelated" so the
tool skips it thereafter), and add a `note` event documenting the mismatch.

Entries 1-330 (by slug) were swept in Sep 2026; the check still surfaces
genuine hits beyond that range (e.g. indigo-networks, giganet, gsn-net,
g-node, lithoptix, harvest-road) for a future pass.

## Known deliberate gaps

- **CM Value Added Services (CMvas)** — RESOLVED (Sep 2026): ABR confirms
  CM VALUE ADDED SERVICES PTY LTD, ABN 39 673 140 737 / ACN 673 140 737,
  registered 28 May 2024 (SA); birth set to that date. The earlier proposed
  1995 date was indeed wrong.
- **Colocity / NTT Australia** — ABNs still active; no firm closure date found.
- **Flowernet** — reported as a Kalgoorlie ISP by a local source, but research
  found only a nursery/florist site under that domain; likely not an ISP.
- **11 inactive-no-death ISPs** — all researched Aug 2026; no verifiable closure
  found. Each has been checked against ABR, Wayback, and news archives:
  GippsNET, ISP Ltd, Internet Victoria, One.Net, SpiderWeb, Terrigal Net,
  Warrnambool Internet, Wide Bay Internet, World Wire, Zed Connect, eis.net.
- **210 `by`-only births** — each file carries a pending-research note listing
  specific checks (Wayback CDX URL, ABN Lookup search, ASIC/CreditorWatch,
  auDA RDAP). The remaining ones are mostly pre-ABN-era sole traders with thin
  records. 80 were upgraded in Aug 2026 across 20 batches.

## Open follow-ups (to research later)

- **Holodoc OZ / Beretvale** — confirmed ISP (added); HoloHost/Beretvale
  relationship to Nella Networks still to be fully untangled.
- **IAP lineage (dates pending)** — IAP→Highway1 acquisition date still pending;
  entities added but transition date unverified.
- **PeeringDB NSP candidates declined by owner** — Megaport, BBIX/Lunet, Yurika/
  Ergon Energy Telecom, Intergrid, NXBASE, Reseau, Prodigy Communications,
  Diverse Services, Somerville Group, Christie Networks, iVox/Telcoinabox, and
  several enterprise MSPs. Not in DB per owner decision (not retail ISPs or not
  historically significant).

## Suggested next work

1. Continue upgrading `by`-only births using the pending-research notes in each
   file (prioritise those with ACN/ABN leads over pre-ABN sole traders).
2. Connect leaf nodes: mine Whirlpool news archive (1999–2013) for hidden
   acquisitions of currently-isolated ISPs.
3. Backfill refs on older transitions that lack citations (Eftel-era, early iiNet).
4. Update DATA_MODEL.md if new entity types or relationship patterns emerge.
