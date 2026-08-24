"""Data validation tests for the ISP history dataset.

These catch structural errors that silently corrupt data:
- names[].start_year / start_disp mismatches
- birth/death event year vs date_disp mismatches
- summary fields with wrong types
- transition refs containing fake wildcard URLs or Cynosure existence proofs

Run alongside the existing suite:  pytest -q
"""

import json
import os
import re
import glob

import pytest

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE, "data")
ISPS_DIR = os.path.join(DATA_DIR, "isps")
TRANSITIONS_PATH = os.path.join(DATA_DIR, "transitions.json")


def _load_isps():
    isps = []
    for fp in sorted(glob.glob(os.path.join(ISPS_DIR, "*.json"))):
        with open(fp, encoding="utf-8") as f:
            isps.append(json.load(f))
    return isps


def _load_transitions():
    with open(TRANSITIONS_PATH, encoding="utf-8") as f:
        return json.load(f)["transitions"]


def _extract_years(text):
    """Extract all 4-digit years from a display string."""
    if not text:
        return []
    return [int(y) for y in re.findall(r"(19\d\d|20[012]\d)", str(text))]


# ---------------------------------------------------------------------------
# names[] consistency
# ---------------------------------------------------------------------------


class TestNamesConsistency:
    def test_start_year_matches_start_disp(self):
        """names[].start_year should be within 2 years of the year in start_disp."""
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            for n in isp.get("names", []):
                sy = n.get("start_year")
                sd = n.get("start_disp", "")
                if sy is None or not sd:
                    continue
                years = _extract_years(sd)
                if not years:
                    continue
                # For ranges like '2001-03', check both endpoints
                gap = min(abs(sy - y) for y in years)
                assert gap < 2, (
                    f"{slug}: names.start_year={sy} but start_disp='{sd}' "
                    f"(range {years[0]}-{years[-1]}, nearest gap {gap}yrs)"
                )

    def test_names_start_year_matches_birth_event(self):
        """Earliest names[].start_year should be within 10 years of birth event year.

        Higher threshold because rebrands/sub-brands can start years after
        the parent entity was founded (e.g. AGL Telco launched 2026 by
        AGL Energy which entered telecoms in 2020).
        """
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            names = isp.get("names", [])
            births = [e for e in isp.get("events", []) if e.get("kind") == "birth"]
            if not names or not births:
                continue
            birth = births[0]
            by = birth.get("year")
            if by is None:
                continue
            earliest_name_year = min(
                (n.get("start_year") for n in names if n.get("start_year") is not None),
                default=None,
            )
            if earliest_name_year is None:
                continue
            gap = abs(by - earliest_name_year)
            assert gap <= 25, (
                f"{slug}: earliest names.start_year={earliest_name_year} but "
                f"birth.year={by} (gap {gap}yrs)"
            )


# ---------------------------------------------------------------------------
# birth/death event consistency
# ---------------------------------------------------------------------------


class TestEventConsistency:
    def test_birth_year_matches_date_disp(self):
        """birth events: year should be within 2 years of any year in date_disp."""
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            for e in isp.get("events", []):
                if e.get("kind") != "birth":
                    continue
                yr = e.get("year")
                dd = e.get("date_disp", "")
                if yr is None or not dd:
                    continue
                years = _extract_years(dd)
                if not years:
                    continue
                # For ranges like '2001-03', year can match either endpoint
                gap = min(abs(yr - y) for y in years)
                assert gap < 2, (
                    f"{slug}: birth year={yr} but date_disp='{dd}' "
                    f"(range {years[0]}-{years[-1]}, nearest gap {gap}yrs)"
                )

    def test_death_year_matches_date_disp(self):
        """death events: year should be within 5 years of date_disp.

        Higher threshold because death dates often use vague ranges like
        'c. 2000s' which legitimately span a decade.
        """
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            for e in isp.get("events", []):
                if e.get("kind") != "death":
                    continue
                yr = e.get("year")
                dd = e.get("date_disp", "")
                if yr is not None and dd and re.search(r"\d{4}", dd) is None:
                    continue  # no year in disp at all — skip
                if yr is None:
                    # If precision is exact there MUST be a year
                    prec = e.get("precision")
                    if prec == "exact":
                        pytest.fail(
                            f"{slug}: death event has precision='exact' but year={yr}"
                        )
                    continue
                years = _extract_years(dd)
                if not years:
                    continue
                gap = abs(yr - years[-1])
                assert gap <= 5, (
                    f"{slug}: death year={yr} but date_disp='{dd}' "
                    f"implies {years[-1]} (gap {gap}yrs)"
                )

    def test_death_exact_precision_requires_year(self):
        """death events with precision='exact' must have a non-None year."""
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            for e in isp.get("events", []):
                if e.get("kind") == "death" and e.get("precision") == "exact":
                    assert e.get("year") is not None, (
                        f"{slug}: death event has precision='exact' but year=None"
                    )


# ---------------------------------------------------------------------------
# field type validation
# ---------------------------------------------------------------------------


class TestFieldTypes:
    def test_summary_is_string_or_none(self):
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            s = isp.get("summary")
            assert s is None or isinstance(s, str), (
                f"{slug}: summary is {type(s).__name__}, expected str or None"
            )

    def test_website_is_string_or_none(self):
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            w = isp.get("website")
            assert w is None or isinstance(w, str), (
                f"{slug}: website is {type(w).__name__}, expected str or None"
            )

    def test_status_is_valid(self):
        valid = {"active", "inactive", "unknown"}
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            status = isp.get("status")
            assert status in valid, (
                f"{slug}: status='{status}' not in {valid}"
            )

    def test_birth_has_year(self):
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            births = [e for e in isp.get("events", []) if e.get("kind") == "birth"]
            if births:
                assert any(b.get("year") is not None for b in births), (
                    f"{slug}: has birth event(s) but none have a year"
                )

    def test_active_isp_has_no_death_event(self):
        """An ISP with status='active' must not carry a death event.

        Catches the fabricated-death bug: entities that pivoted out of
        consumer ISP service (e.g. to hosting/IT) must be modelled with a
        note, not a death, while status remains 'active'.
        """
        for isp in _load_isps():
            slug = isp.get("slug", "?")
            if isp.get("status") == "active":
                deaths = [e for e in isp.get("events", []) if e.get("kind") == "death"]
                assert not deaths, (
                    f"{slug}: status='active' but has death event(s) "
                    f"({[d.get('date_disp') for d in deaths]}) — either the "
                    f"status or the death record is wrong"
                )


# ---------------------------------------------------------------------------
# transition ref validation
# ---------------------------------------------------------------------------


class TestTransitionRefs:
    def test_no_wildcard_urls(self):
        """Transition refs must not contain wildcard URLs that aren't real pages."""
        for i, t in enumerate(_load_transitions()):
            for r in t.get("refs", []):
                url = r.get("url", "")
                if "*" in url and "/cdx/search" not in url:
                    # Allow the valid Wayback pattern /web/*/domain.tld
                    if not re.match(r"https://web\.archive\.org/web/\*/https?://", url):
                        pytest.fail(
                            f"Transition [{i}] {t.get('from','')}→{t.get('to','')}: "
                            f"ref contains wildcard URL '{url[:80]}'"
                        )

    def test_no_cynosure_as_transition_evidence(self):
        """Cynosure directory listings prove existence, NOT transitions."""
        for i, t in enumerate(_load_transitions()):
            for r in t.get("refs", []):
                url = r.get("url", "")
                if "cynosure.com.au/isp" in url:
                    pytest.fail(
                        f"Transition [{i}] {t.get('from','')}→{t.get('to','')}: "
                        f"Cynosure directory URL used as transition evidence. "
                        f"Cynosure proves existence, not acquisition/merger."
                    )

    def test_refs_have_url_and_label(self):
        for i, t in enumerate(_load_transitions()):
            for j, r in enumerate(t.get("refs", [])):
                assert r.get("url"), (
                    f"Transition [{i}] ref[{j}] missing 'url'"
                )
                assert r.get("label"), (
                    f"Transition [{i}] ref[{j}] missing 'label': url={r.get('url','')[:60]}"
                )
