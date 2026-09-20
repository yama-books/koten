"""Regression tests for the marker/target audit findings (conj/index.html,
the public 129-item embedded dataset: 動詞89 / 形容詞11 / 形容動詞1 / 助動詞28).

Background: an audit on 2026-09-21 found that of the 28 auxiliary items,
only 11 had `target` exactly equal to one of their own conjugation-table
values (`forms`/`forms2`), with no surrounding verb stem or neighboring
word at all -- e.g. sasu_aux "させ", keri "けり", beshi_aux "べき". The other
17 mixed in a preceding content-word stem, a preceding different auxiliary,
and/or (for ri_aux/ru_aux/raru_aux) a trailing different auxiliary. All 17
have since been fixed to exactly match the tested word's own form, per the
principle: the marker must highlight only the word being asked about, no
matter how distinctive the surrounding text is. Two of them (su_aux "せ",
tsu_aux "つ") need an explicit `occurrence` index because their now-short
target string also appears earlier in the same example sentence as part of
a different word -- `highlight()` in conj/index.html was extended to accept
an optional occurrence argument (mirroring the internal QA package's
`highlightTarget`) to support this.

Run with: python -m pytest conj/audit/test_marker_regression.py -v
(or plain `python conj/audit/test_marker_regression.py`, no pytest needed).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ITEMS_PATH = HERE.parent / "_qa_source" / "index-html-items-129.json"


def compact(s: str) -> str:
    return re.sub(r"[　 ]+", "", s or "")


def load_items():
    return {it["id"]: it for it in json.loads(ITEMS_PATH.read_text(encoding="utf-8"))}


def marker_span(item):
    """Replicates conj/index.html's highlight(text,target,occurrence)."""
    example = compact(item.get("example", ""))
    target = compact(item.get("target", ""))
    if not target:
        return None
    occurrence = item.get("occurrence")
    occurrence = occurrence if isinstance(occurrence, int) else 0
    positions = []
    frm = 0
    while True:
        i = example.find(target, frm)
        if i < 0:
            break
        positions.append(i)
        frm = i + len(target)
    if occurrence >= len(positions):
        return None
    start = positions[occurrence]
    return start, start + len(target)


def flattened_forms(item):
    out = set()
    for key in ("forms", "forms2"):
        for group in item.get(key, []) or []:
            for v in (group or []):
                out.add(v)
    return out


def test_all_items_target_found_in_example():
    items = load_items()
    missing = [iid for iid, it in items.items() if marker_span(it) is None]
    assert not missing, f"target not found in example for: {missing}"


def test_all_aux_targets_exact_match_own_conjugation_forms():
    """Every auxiliary item's target must be exactly one of its own
    forms/forms2 values -- no leading verb stem, no trailing word."""
    items = load_items()
    bad = []
    for iid, it in items.items():
        if it.get("pos") != "aux":
            continue
        forms = flattened_forms(it)
        target = compact(it.get("target", ""))
        if forms and target not in forms:
            bad.append((iid, target, sorted(forms)))
    assert not bad, f"aux items whose target isn't an exact own-form match: {bad}"


# --- fix confirmation for the 17 items identified in the 2026-09-21 audit ---

_FIXED_CASES = [
    ("ri_aux", "ら"),
    ("ru_aux", "れ"),
    ("raru_aux", "られ"),
    ("su_aux", "せ"),
    ("zu", "ぬ"),
    ("mu_aux", "む"),
    ("ji_aux", "じ"),
    ("mashi_aux", "まし"),
    ("ki_aux", "し"),
    ("tsu_aux", "つ"),
    ("tari_comp_aux", "たる"),
    ("kemu_aux", "けめ"),
    ("ramu_aux", "らむ"),
    ("rashi_aux", "らし"),
    ("meri_aux", "めり"),
    ("nari_hearsay_aux", "なり"),
    ("nari_assert_aux", "なり"),
]


def test_known_marker_boundary_fixes_are_in_place():
    items = load_items()
    bad = []
    for item_id, expected_target in _FIXED_CASES:
        actual = items[item_id]["target"]
        if actual != expected_target:
            bad.append((item_id, actual, expected_target))
    assert not bad, f"regression: target reverted for {bad}"


def test_su_aux_and_tsu_aux_resolve_to_the_correct_occurrence():
    """These two targets ("せ" / "つ") also occur earlier in their own
    example sentence as part of a different word, so they need an explicit
    occurrence index to highlight the right one. Guards against someone
    dropping the `occurrence:1` field during a future edit."""
    items = load_items()
    su = items["su_aux"]
    start, end = marker_span(su)
    example = compact(su["example"])
    assert example[start:end] == "せ"
    assert example[max(0, start - 2):start] == "歌は", "su_aux marker landed on the wrong occurrence of 'せ'"

    tsu = items["tsu_aux"]
    start, end = marker_span(tsu)
    example = compact(tsu["example"])
    assert example[start:end] == "つ"
    assert example[max(0, start - 2):start] == "つけ", "tsu_aux marker landed on the wrong occurrence of 'つ'"


def _tiny_runner():
    test_all_items_target_found_in_example()
    print("PASS: test_all_items_target_found_in_example")
    test_all_aux_targets_exact_match_own_conjugation_forms()
    print("PASS: test_all_aux_targets_exact_match_own_conjugation_forms")
    test_known_marker_boundary_fixes_are_in_place()
    print("PASS: test_known_marker_boundary_fixes_are_in_place")
    test_su_aux_and_tsu_aux_resolve_to_the_correct_occurrence()
    print("PASS: test_su_aux_and_tsu_aux_resolve_to_the_correct_occurrence")


if __name__ == "__main__":
    _tiny_runner()
