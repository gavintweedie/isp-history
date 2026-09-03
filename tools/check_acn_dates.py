"""Flag ISPs whose cited ACN/ABN was registered AFTER the ISP died.

Usage:
    python3 tools/check_acn_dates.py           # human-readable report
    python3 tools/check_acn_dates.py --json     # machine-readable JSON
    python3 tools/check_acn_dates.py --strict    # exit 1 if anything is flagged

Why this exists
---------------
A recurring data-quality defect in this dataset is ACN/ABN *misattribution*:
the legal entity cited in an ISP's `summary` (or a `gov`/`official` ref) is a
later, same-name or name-collision company registered years after the ISP
existed — sometimes even future-dated. See docs/DATA_QUALITY.md.

We do not store ABR registration dates, but an Australian Company Number is
allocated roughly sequentially over time, so the 9-digit ACN itself encodes an
approximate registration era. This tool estimates that era by interpolating
between ~60 anchor ACNs whose registration year was confirmed against ABR
during the Sep-2026 verification sprints, then flags any *dead* ISP that cites
an ACN whose estimated registration year is meaningfully later than the ISP's
death year (plus a slop margin), and any ACN that estimates to the future.

It is a heuristic worklist, not proof: the estimate has a few years of slop
(ASIC jumped the ACN range from ~170M to ~600M around 2014, which the
piecewise-linear model absorbs), so treat every hit as "verify against ABR",
not "definitely wrong". Refs already annotated as unrelated/collision/
successor are skipped so previously-corrected records are not re-flagged.
"""

import argparse
import datetime
import glob
import json
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISP_DIR = os.path.join(BASE, "data", "isps")
CURRENT_YEAR = datetime.date.today().year

# Margin (years) an ACN may estimate past the death year before we flag it —
# absorbs the estimator's slop and legitimate "wound down a year or two after
# the last event" cases.
MARGIN = 3

# Anchor points: 9-digit ACN -> confirmed/approx registration year. Calibrated
# from ABR lookups during the Sep-2026 verification work. Keep sorted-ish;
# the code sorts before interpolating.
ANCHORS = [
    (2954458, 1983), (10078010, 1985), (50095442, 1991), (52082416, 1991),
    (54001759, 1992), (56712228, 1992), (59950337, 1993), (64289925, 1994),
    (65617549, 1994), (68763609, 1995), (70007555, 1996), (72793858, 1996),
    (73222536, 1996), (76598582, 1996), (78302440, 1997), (80253309, 1998),
    (81355722, 1998), (82100409, 1998), (86216766, 1999), (87951004, 1999),
    (90727861, 2000), (92767381, 2000), (95899317, 2001), (96864836, 2001),
    (101635563, 2002), (103173440, 2003), (104900030, 2003), (107903195, 2004),
    (108788245, 2004), (112124231, 2005), (116498803, 2005), (120156185, 2006),
    (120449747, 2006), (126600351, 2007), (127715360, 2007), (128993608, 2007),
    (132090192, 2008), (136950082, 2009), (143897303, 2010), (144488620, 2010),
    (158289331, 2012), (160489074, 2012), (161492217, 2012), (168731913, 2014),
    (169830451, 2014), (600066948, 2014), (600896115, 2014), (609005772, 2015),
    (619334002, 2017), (620009350, 2017), (623023263, 2017), (636256052, 2019),
    (638880618, 2020), (646011832, 2020), (646331875, 2020), (656808543, 2022),
    (663309500, 2022), (673140737, 2024), (679504146, 2024),
]

# Text (in a ref label, or in the summary BEFORE the ACN) that marks the cited
# entity as deliberately-flagged unrelated / a documented later reuse — so a
# previously-corrected record is not re-flagged.
SKIP_MARKERS = (
    "unrelated", "collision", "collide", "successor", "postdate", "mismatch",
    "not this", "later same-name", "later entity", "different entity",
    "name coincidence", "distinct", "reused", "separate company", "separate,",
    "later reused", "coincidence", "not the isp", "reg 20",
)

# Foreign companies get an ARBN (allocated separately from ACNs, so the
# date estimate is meaningless); "Inc" is the usual tell in the entity name.
FOREIGN_MARKERS = ("inc", "arbn", "incorporated")

_ACN_RE = re.compile(r"ACN[:\s]*([0-9]{3}\s?[0-9]{3}\s?[0-9]{3})", re.IGNORECASE)


def estimate_year(acn):
    """Estimate the registration year of a 9-digit ACN via piecewise-linear
    interpolation over ANCHORS."""
    pts = sorted(ANCHORS)
    if acn <= pts[0][0]:
        return pts[0][1]
    if acn >= pts[-1][0]:
        # Extrapolate past the last anchor using the final segment's slope,
        # capped at next year.
        (x0, y0), (x1, y1) = pts[-2], pts[-1]
        if x1 == x0:
            return min(y1, CURRENT_YEAR + 1)
        slope = (y1 - y0) / (x1 - x0)
        est = y1 + slope * (acn - x1)
        return min(int(round(est)), CURRENT_YEAR + 1)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= acn <= x1:
            if x1 == x0:
                return y0
            frac = (acn - x0) / (x1 - x0)
            return int(round(y0 + frac * (y1 - y0)))
    return pts[-1][1]  # unreachable


def _explicit_acns(text):
    """Yield (acn_int, start_index) for each explicit 'ACN nnn nnn nnn' in text.
    Only explicit ACN tokens are used — an ABN's trailing 9 digits are NOT
    treated as an ACN, because trust/partnership/sole-trader ABNs (and foreign
    ARBNs) do not encode a company registration era."""
    for m in _ACN_RE.finditer(text or ""):
        yield int(m.group(1).replace(" ", "")), m.start()


def cited_acns(isp):
    """ACNs cited as the entity's own, in the summary or a gov/official ref.
    Skips ACNs the record already documents as unrelated/reused, and foreign
    ARBNs. Returns {acn: source_label}."""
    found = {}
    summary = isp.get("summary", "")
    for acn, pos in _explicit_acns(summary):
        before = summary[:pos].lower()
        if any(mark in before for mark in SKIP_MARKERS):
            continue
        if any(fm in summary[max(0, pos - 25):pos].lower() for fm in FOREIGN_MARKERS):
            continue
        found[acn] = "summary"
    for ref in isp.get("refs", []):
        if ref.get("kind") not in ("gov", "official"):
            continue
        label = ref.get("label") or ""
        low = label.lower()
        if any(mark in low for mark in SKIP_MARKERS):
            continue
        for acn, pos in _explicit_acns(label):
            if any(fm in label[max(0, pos - 25):pos].lower() for fm in FOREIGN_MARKERS):
                continue
            found.setdefault(acn, "ref")
    return found


def death_year(isp):
    ys = [e.get("year") for e in isp.get("events", [])
          if e.get("kind") == "death" and isinstance(e.get("year"), int)]
    return max(ys) if ys else None


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true", help="output JSON")
    ap.add_argument("--strict", action="store_true",
                    help="exit 1 if any record is flagged")
    args = ap.parse_args()

    flagged = []
    for path in sorted(glob.glob(os.path.join(ISP_DIR, "*.json"))):
        isp = json.load(open(path))
        dyear = death_year(isp)
        for acn, src in cited_acns(isp).items():
            est = estimate_year(acn)
            reason = None
            if est > CURRENT_YEAR + 1:
                reason = "future-dated ACN"
            elif dyear is not None and est > dyear + MARGIN:
                reason = "ACN registered after death"
            if reason:
                flagged.append({
                    "slug": isp["slug"],
                    "name": isp["name"],
                    "acn": f"{acn:09d}",
                    "acn_est_year": est,
                    "death_year": dyear,
                    "cited_in": src,
                    "reason": reason,
                })

    flagged.sort(key=lambda f: (f["acn_est_year"] - (f["death_year"] or 0)),
                 reverse=True)

    if args.json:
        print(json.dumps({"flagged": flagged, "count": len(flagged)}, indent=2))
    else:
        if not flagged:
            print("No ACN-date mismatches found.")
        else:
            print(f"{len(flagged)} possible ACN misattribution(s) "
                  f"(cited ACN estimated to register after the ISP died) — "
                  f"verify each against ABR:\n")
            for f in flagged:
                gap = f["acn_est_year"] - (f["death_year"] or f["acn_est_year"])
                print(f"  {f['slug']:<32} ACN {f['acn']} "
                      f"~{f['acn_est_year']} vs death {f['death_year']} "
                      f"(+{gap}, in {f['cited_in']}) — {f['reason']}")
            print("\nNote: estimates have a few years of slop; this is a "
                  "verify-against-ABR worklist, not proof of error.")

    if args.strict and flagged:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
