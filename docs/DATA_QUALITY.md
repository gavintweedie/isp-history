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

The placeholders exist because we imported the full Cynosure Australian ISP
directory (2002) to capture every ISP that existed at that time. They are captured
but not researched — each needs a Wayback/ABN sweep to become Partial or Complete.

## Current state (August 2026)

Baseline from `tools/qa_report.py` (data in `data/`, from the 2026 export of the
old SQLite DB):

- Total ISPs: 911; transitions: 333
- Placeholders (Cynosure by-2002): 0 — all ~180 resolved (batches 1-10, Aug 2026)
- No birth date: 3
- Birth `by`-only (upper bound): 246
- Inactive but no death event: 0
- Status unknown: 0
- Birth year > death year: 0
- Duplicate display names: 0
- Active with no website: 0

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

## Known deliberate gaps

- **CM Value Added Services (CMvas)** — the entity that acquired Uniti assets in
  2024 has no birth date (a proposed 1995 date was rejected as implausible). Needs
  a proper incorporation date.
- **Colocity / NTT Australia** — ABNs still active; no firm closure date found.
- **Flowernet** — reported as a Kalgoorlie ISP by a local source, but research
  found only a nursery/florist site under that domain; likely not an ISP.
- **The ~180 Cynosure placeholders** — the long tail. Best worked on in small
  batches of ~10 (see the record of the first batch already researched). Down to 82
  after 7 research batches (Cynosure batches 1-7). **Fully resolved in batches 1-10
  (Aug 2026)** — every Cynosure-listed ISP now has researched data.

## Open follow-ups (to research later)

- **Amaze Communications / XYZ Telecom (Maret sub-entity)** — the user noted that
  Maret Group's fixed-wireless and data-centre infrastructure ended up in an
  "XYZ Telecom" subcompany (AS38790). Our DB has a separate, unrelated VIC "XYZ
  Telecom". The AS38790 XYZ Telecom under Maret needs its own entity + details.
  (Update: XYZ Telecom confirmed as Maret-owned wholesale carrier, added to DB;
  MarchNet entity added; Maret structure documented. **Resolved** — XYZ Telecom
  (2022, AS38790), MarchNet (2012), New Wave Infrastructure (2021, ex-Maret
  Infrastructure) and Maret Group all present with transitions.)
- **Holodoc OZ** — confirmed as an ISP (holodoc.net.au, c.1999 Melbourne, acquired
  by Amaze Communications Aug 2000). Added to DB. The later HoloHost/Beretvale
  relationship to Nella Networks is still to be fully untangled.
- **MyNetFone / Vonex** — Vonex acquired MyNetFone's direct small-business and
  residential business for $31M (July 2021). MyNetFone entity added (birth 2004).
- **IAP lineage (dates pending)** — user report: IAP (Internet Access Providers)
  acquired by Highway1; Globaldial acquired Highway1/Zetta; Up'N'Away (via iiNet)
  took all the dialup/DSL; Highway1/Zetta took the VoIP (Simtex). IAP Direct and
  Global Dial entities added; the IAP->Highway1/Globaldial date is still pending.
- **SpinTel / Planet Ozi** — added as entities (2026): SpinTel is the current
  trading name of Spin Internet (Com-Cen absorbed ~2015); Planet Ozi absorbed
  CairnsNet customers (2017) and later showed the DoveNetQ/ISPX brand (2018).

## Suggested next work

1. Continue researching Cynosure placeholders in batches of ~10 (use the
   `tools/qa_report.py` placeholder list as the queue). 82 remain after batches 1-7.
   **Done — all resolved in batches 8-10.**
2. Resolve the 10 inactive-no-death ISPs when sources surface.
3. Fill the missing birth dates (needs CMvas incorporation record especially).
4. Notable recent additions: Pegasus Networks (1989, Australia's first public ISP),
   TrumpNet/Intas (Tasmania), One.Tel, Davnet/UXC, Comindico, vividwireless,
   Granite Internet Services, the SA peering-archive ISPs (Creative, ESC, Pinnacle,
   World-Link), and the GetOnIt/All Hours/RegionalConnect chain.
