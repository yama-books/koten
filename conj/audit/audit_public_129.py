"""Supplementary audit of the CURRENTLY PUBLISHED conj/index.html embedded
`items` array (129 entries: verb 89 / adjective 11 / adjectivalVerb 1 /
auxiliary 28, per conj/HANDOFF.md).

This is a *separate* dataset from the 910-example internal QA package
(conj/data/verb_examples.json etc. inside the Drive ZIP). The two known test
cases named in conj/CLAUDE_CODE_AUDIT_PROMPT_2026-09-21.md ("思へらず" /
"変る") only exist in THIS 129-item public array, not in the 910-example set.
See conj/audit/KNOWN_CASES_INVESTIGATION.md for the write-up.

Marker logic replicated from conj/index.html (function highlight(text,target)):
  - always the FIRST occurrence (text.indexOf(target), no occurrence index)
  - text and target are both pre-compacted by removing full/half-width spaces
    before matching (render(): .replace(/[　 ]+/g,""))
  - if target not found, the raw text is shown with no <mark> at all
"""
from __future__ import annotations

import csv
import json
import re
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
ITEMS_PATH = HERE.parent / "_qa_source" / "index-html-items-129.json"

CJK_RANGES = [(0x4E00, 0x9FFF), (0x3400, 0x4DBF), (0xF900, 0xFAFF)]

# Same curated "likely belongs to the following word" suffix list used in
# audit_marker_kana.py, applied here to catch cases like ri_aux's target
# "らず" (り 未然形「ら」+ 打消の助動詞「ず」-- ず is a separate word).
SUSPECT_TRAILING = [
    "らず", "にき", "たりき", "なりけり", "たりけり", "べし",
    "まじ", "らむ", "らし", "なむ", "もぞ", "もこそ",
    "とも", "ものを", "をば", "にけり", "つべし", "ぬべし",
]


def has_kanji(s: str) -> bool:
    return any(any(a <= ord(ch) <= b for a, b in CJK_RANGES) for ch in s)


def compact(s: str) -> str:
    return re.sub(r"[　 ]+", "", s or "")


def flattened_forms(item):
    out = set()
    for key in ("forms", "forms2"):
        for group in item.get(key, []) or []:
            for v in (group or []):
                out.add(v)
    return out


def main():
    items = json.loads(ITEMS_PATH.read_text(encoding="utf-8"))

    # baseline target length per (pos, kind) group, for the length-outlier check
    lengths: dict[tuple, list[int]] = {}
    for it in items:
        key = (it.get("pos"), it.get("kind"))
        lengths.setdefault(key, []).append(len(compact(it.get("target", ""))))
    baseline = {k: statistics.median(v) for k, v in lengths.items() if v}

    rows = []
    for it in items:
        example = compact(it.get("example", ""))
        target = compact(it.get("target", ""))
        i = example.find(target) if target else -1
        found = i >= 0
        marker_start = i if found else -1
        marker_end = i + len(target) if found else -1
        prefix = example[max(0, marker_start - 3):marker_start] if found else ""
        suffix = example[marker_end:marker_end + 3] if found else ""
        lemma_has_kanji = has_kanji(it.get("lemma", ""))

        marker_flags = []
        if found:
            key = (it.get("pos"), it.get("kind"))
            med = baseline.get(key)
            if med is not None and len(target) >= med + 2 and len(target) >= 2:
                marker_flags.append(f"target-length-outlier(len={len(target)},group-median={med})")
            lemma_compact = compact(it.get("lemma", ""))
            for suf in SUSPECT_TRAILING:
                # flag whenever target ends with a string that looks like a
                # DIFFERENT word tacked on -- except when this item's own
                # lemma IS exactly that suffix (i.e. it is legitimately
                # testing that whole word, not borrowing it from a neighbor)
                if target.endswith(suf) and lemma_compact != suf:
                    marker_flags.append(f"target-ends-with-suspect-trailing({suf})")
                    break

        # For auxiliary items specifically: 11/28 in this dataset already use
        # target == one of the item's OWN conjugation-table values, with no
        # surrounding verb stem or neighboring word at all (e.g. sasu_aux
        # "させ", keri "けり", beshi_aux "べき"). That is the established
        # in-dataset convention. Any aux item whose target is NOT an exact
        # match to one of its own forms/forms2 values deviates from that
        # convention and is a same-class candidate as the ri_aux/ru_aux/
        # raru_aux bugs (confirmed 2026-09-21).
        exact_form_match = None
        suggested_target = None
        if it.get("pos") == "aux":
            forms = flattened_forms(it)
            exact_form_match = target in forms if forms else None
            if exact_form_match is False:
                hits = [f for f in forms if f and target.endswith(f)]
                suggested_target = max(hits, key=len) if hits else None

        rows.append({
            "id": it["id"],
            "pos": it.get("pos", ""),
            "lemma": it.get("lemma", ""),
            "kind": it.get("kind", ""),
            "target": it.get("target", ""),
            "example": it.get("example", ""),
            "markerStart": marker_start,
            "markerEnd": marker_end,
            "prefixContext": prefix,
            "suffixContext": suffix,
            "targetFound": found,
            "markerCrossesBoundary": bool(marker_flags),
            "markerReason": "; ".join(marker_flags),
            "auxExactFormMatch": exact_form_match,
            "auxSuggestedTarget": suggested_target,
            "lemmaHasKanji": lemma_has_kanji,
            "hasKanjiAidField": bool(it.get("kanjiAid")),
            "hasTargetReadingField": bool(it.get("targetReading")),
        })

    csv_path = HERE / "index-html-129-audit.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    not_found = [r for r in rows if not r["targetFound"]]
    kanji_no_aid = [r for r in rows if r["lemmaHasKanji"] and not r["hasKanjiAidField"] and not r["hasTargetReadingField"]]
    crosses = [r for r in rows if r["markerCrossesBoundary"]]
    aux_not_exact = [r for r in rows if r["pos"] == "aux" and r["auxExactFormMatch"] is False]
    aux_exact = [r for r in rows if r["pos"] == "aux" and r["auxExactFormMatch"] is True]
    print(f"total items: {len(rows)}")
    print(f"target not found in example: {len(not_found)}")
    print(f"marker-crosses-boundary candidates: {len(crosses)}")
    print(f"kanji lemma with no kanjiAid/targetReading field: {len(kanji_no_aid)}")
    print(f"aux items already exact-match to own forms: {len(aux_exact)}")
    print(f"aux items NOT exact-match to own forms: {len(aux_not_exact)}")
    print(f"wrote {csv_path}")
    summary_path = HERE / "index-html-129-audit-summary.txt"
    with summary_path.open("w", encoding="utf-8") as f:
        f.write(f"total items: {len(rows)}\n")
        f.write(f"target not found in example: {len(not_found)}\n")
        for r in not_found:
            f.write(f"  - {r['id']} {r['lemma']} {r['target']!r}\n")
        f.write(f"\naux items already exact-match to own conjugation forms: {len(aux_exact)}\n")
        for r in aux_exact:
            f.write(f"  - {r['id']} {r['lemma']} target={r['target']!r}\n")
        f.write(f"\naux items NOT exact-match (same class as ri_aux/ru_aux/raru_aux): {len(aux_not_exact)}\n")
        for r in aux_not_exact:
            f.write(f"  - {r['id']} {r['lemma']} target={r['target']!r} suggestedTarget={r['auxSuggestedTarget']!r}\n")
    print(f"wrote {summary_path}")


if __name__ == "__main__":
    main()
