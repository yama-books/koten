"""910-example marker/target/anchor + historical-kana display audit.

Scope: 古典活用表アプリ 内部QA 910例 (verb360 / adjective140 / adjectivalVerb120 / auxiliary290).

This script performs READ-ONLY analysis. It never rewrites raw quotation text,
raw target text, or any source data file. It only emits a review CSV/Markdown
so a human can decide what (if anything) needs fixing.

Marker computation replicates the *actual* runtime logic used by the internal
QA build's app.js (`highlightTarget`), not an idealized algorithm:

    function highlightTarget(text, target, occurrence=0) {
      // find ALL non-overlapping occurrences of `target` in `text`
      // pick positions[occurrence]; if it doesn't exist, NO mark is rendered
      // (silent failure -- the raw text is shown with no <mark> at all)
    }

    function displayExample(ex) {
      quotation = ex.displayQuotationExcerpt || ex.quotationExcerpt
      target    = ex.displayTarget || ex.originalTarget
      occurrence= Number.isInteger(ex.displayTargetOccurrence)
                    ? ex.displayTargetOccurrence
                    : (ex.targetOccurrence || 0)
    }

IMPORTANT: this script's CSV/MD output contains raw CHJ quotation excerpts.
Per project policy, CHJ raw text must never be published to GitHub. Do not
`git add`/commit/push the generated CSV or MD files -- keep them local only
until a human clears them for any further distribution.
"""
from __future__ import annotations

import csv
import json
import statistics
import sys
import unicodedata
from pathlib import Path

QA_ROOT = Path(__file__).resolve().parents[1] / "_qa_source" / "extracted" / "katsuyo_v0418" / "data"
OUT_DIR = Path(__file__).resolve().parent

CATEGORY_LABELS = {
    "verb": "動詞",
    "adjective": "形容詞",
    "adjectivalVerb": "形容動詞",
    "auxiliary": "助動詞",
}

DATA_FILES = {
    "verb": "verb_examples.json",
    "adjective": "adjective_examples.json",
    "adjectivalVerb": "adjectival_verb_examples.json",
    "auxiliary": "auxiliary_examples.json",
}

# Trailing strings that commonly belong to a *following* word (auxiliary verb /
# particle) rather than the conjugated form itself. If a target string ends
# with one of these AND the example is not itself testing that auxiliary,
# the marker is a candidate for "crosses into next word" review.
SUSPECT_TRAILING = [
    "らず", "にき", "たりき", "なりけり", "たりけり", "べし",
    "まじ", "らむ", "らし", "なむ", "もぞ", "もこそ",
    "とも", "ものを", "をば", "にけり", "つべし", "ぬべし",
]

CJK_RANGES = [
    (0x4E00, 0x9FFF),
    (0x3400, 0x4DBF),
    (0xF900, 0xFAFF),
]


def has_kanji(s: str) -> bool:
    return any(any(a <= ord(ch) <= b for a, b in CJK_RANGES) for ch in s)


def find_occurrences(text: str, target: str) -> list[int]:
    if not target:
        return []
    positions = []
    frm = 0
    while True:
        i = text.find(target, frm)
        if i < 0:
            break
        positions.append(i)
        frm = i + len(target)
    return positions


def load_examples():
    lexical_path = QA_ROOT / "lexical_annotations_adj_adjv.json"
    lexical = json.loads(lexical_path.read_text(encoding="utf-8"))
    lexical_map = {a["id"]: a for a in lexical.get("annotations", [])}

    rows = []
    for category, filename in DATA_FILES.items():
        data = json.loads((QA_ROOT / filename).read_text(encoding="utf-8"))
        for ex in data["examples"]:
            merged = {**ex, **lexical_map.get(ex["id"], {})}
            merged["_category"] = category
            merged["_lexical_covered"] = ex["id"] in lexical_map
            rows.append(merged)
    return rows


def group_length_baseline(rows):
    """Median target length per (category, conjugationType, form) group,
    used as the baseline for the 'unusually long target' heuristic."""
    buckets: dict[tuple, list[int]] = {}
    for ex in rows:
        target_used = ex.get("displayTarget") or ex.get("originalTarget") or ""
        key = (ex["_category"], ex.get("conjugationType"), ex.get("form"))
        buckets.setdefault(key, []).append(len(target_used))
    return {k: statistics.median(v) for k, v in buckets.items() if v}


def audit_row(ex, baseline):
    category = ex["_category"]
    quotation_raw = ex.get("quotationExcerpt", "")
    target_raw = ex.get("originalTarget", "")
    normalized_key = ex.get("normalizedKey", "")
    display_lemma = ex.get("displayLemma") or ex.get("lemma", "")
    kanji_aid = ex.get("kanjiAid", "")

    quotation_used = ex.get("displayQuotationExcerpt") or quotation_raw
    target_used = ex.get("displayTarget") or target_raw
    occ_field = ex.get("displayTargetOccurrence")
    occurrence = occ_field if isinstance(occ_field, int) else (ex.get("targetOccurrence") or 0)

    positions = find_occurrences(quotation_used, target_used)
    found = target_used != "" and 0 <= occurrence < len(positions)
    if found:
        marker_start = positions[occurrence]
        marker_end = marker_start + len(target_used)
        marker_text = target_used
    else:
        marker_start = -1
        marker_end = -1
        marker_text = ""

    raw_positions = find_occurrences(quotation_raw, target_raw)
    raw_occurrence = ex.get("targetOccurrence") or 0
    raw_found = target_raw != "" and 0 <= raw_occurrence < len(raw_positions)

    prefix_context = quotation_used[max(0, marker_start - 3):marker_start] if found else ""
    suffix_context = quotation_used[marker_end:marker_end + 3] if found else ""

    exact_target_match = found and raw_found

    # --- marker boundary heuristics (candidates for human review only) ---
    marker_flags = []
    if not found:
        marker_flags.append("target-not-found-at-occurrence(silent-no-mark)")
    else:
        key = (category, ex.get("conjugationType"), ex.get("form"))
        med = baseline.get(key)
        if med is not None and len(target_used) >= med + 2 and len(target_used) >= 3:
            marker_flags.append(f"target-length-outlier(len={len(target_used)},group-median={med})")
        if category != "auxiliary":
            for suf in SUSPECT_TRAILING:
                if target_used.endswith(suf) and len(target_used) > len(suf):
                    marker_flags.append(f"target-ends-with-suspect-trailing({suf})")
                    break
        anchor = ex.get("anchor", "")
        if anchor and target_used and anchor != target_used and target_used not in anchor:
            marker_flags.append("anchor-does-not-contain-target")
        if len(positions) > 1:
            marker_flags.append(f"multiple-occurrences-in-quotation(n={len(positions)},using-index={occurrence})")

    marker_crosses_boundary = any(
        f.startswith("target-length-outlier") or f.startswith("target-ends-with-suspect-trailing")
        for f in marker_flags
    )

    # --- historical-kana display heuristics ---
    # NOTE: verb (360) and auxiliary (290) schemas carry no per-item reading
    # field at all (targetReading is 0/360 populated for verb, 0/290 for
    # auxiliary as of this package) -- that is a structural gap, not a
    # per-row anomaly, so it is reported once in the Markdown summary rather
    # than flagged on every row (flagging ~all 360 verb rows would drown the
    # genuinely actionable adjective/adjectivalVerb signal below). Auxiliary
    # lemmas in this dataset are already hiragana (ず/り/けり/...), so the
    # missing field is not itself a display concern there.
    kana_flags = []
    lemma = ex.get("lemma", "")
    if category in ("adjective", "adjectivalVerb"):
        lemma_has_kanji = has_kanji(display_lemma or lemma)
        reviewed_by_lexical_pass = bool(ex.get("_lexical_covered"))
        if lemma_has_kanji and not reviewed_by_lexical_pass:
            kana_flags.append("kanji-lemma-not-covered-by-lexical-annotation-pass")
    if ex.get("displayLemma") and ex.get("displayLemma") == lemma and has_kanji(lemma):
        kana_flags.append("displayLemma-not-actually-overridden")

    kana_display_concern = bool(kana_flags)

    if not found:
        status = "DATA_ERROR"
    elif marker_crosses_boundary and kana_display_concern:
        status = "REVIEW_BOTH"
    elif marker_crosses_boundary:
        status = "REVIEW_MARKER"
    elif kana_display_concern:
        status = "REVIEW_KANA"
    else:
        status = "PASS"

    reason = "; ".join(marker_flags + kana_flags) or "no issues detected by heuristic pass"

    return {
        "id": ex["id"],
        "category": CATEGORY_LABELS[category],
        "lemma": lemma,
        "conjugationType": ex.get("conjugationType", ""),
        "conjugationForm": ex.get("form", ""),
        "rawQuotation": quotation_raw,
        "rawTarget": target_raw,
        "normalizedKey": normalized_key,
        "displayLemma": display_lemma,
        "displayTarget": target_used,
        "anchor": ex.get("anchor", ""),
        "markerText": marker_text,
        "markerStart": marker_start,
        "markerEnd": marker_end,
        "prefixContext": prefix_context,
        "suffixContext": suffix_context,
        "exactTargetMatch": exact_target_match,
        "markerCrossesBoundary": marker_crosses_boundary,
        "kanaDisplayConcern": kana_display_concern,
        "kanjiAid": kanji_aid,
        "status": status,
        "reason": reason,
    }


def main():
    rows = load_examples()
    baseline = group_length_baseline(rows)
    audited = [audit_row(ex, baseline) for ex in rows]

    csv_path = OUT_DIR / "marker-kana-audit-v1.csv"
    fieldnames = list(audited[0].keys())
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(audited)

    counts = {"PASS": 0, "REVIEW_MARKER": 0, "REVIEW_KANA": 0, "REVIEW_BOTH": 0, "DATA_ERROR": 0}
    for r in audited:
        counts[r["status"]] += 1

    by_category = {}
    for r in audited:
        by_category.setdefault(r["category"], {"PASS": 0, "REVIEW_MARKER": 0, "REVIEW_KANA": 0, "REVIEW_BOTH": 0, "DATA_ERROR": 0})
        by_category[r["category"]][r["status"]] += 1

    verb_rows = [r for r in rows if r["_category"] == "verb"]
    aux_rows = [r for r in rows if r["_category"] == "auxiliary"]
    verb_kanji_no_reading = sum(
        1 for r in verb_rows
        if has_kanji(r.get("displayLemma") or r.get("lemma", "")) and not r.get("targetReading") and not r.get("kanjiAid")
    )
    aux_no_reading = sum(1 for r in aux_rows if not r.get("targetReading"))

    md_lines = []
    md_lines.append("# marker / historical-kana display audit v1")
    md_lines.append("")
    md_lines.append(f"総件数: {len(audited)}")
    md_lines.append("")
    md_lines.append("## 構造的な注記（個別行ではなくスキーマ全体の欠落）")
    md_lines.append("")
    md_lines.append(
        f"- 動詞360例: {verb_kanji_no_reading}/360 が漢字lemmaかつ targetReading・kanjiAidフィールドを一切持たない"
        "（動詞カテゴリにはそもそも読み仮名フィールドが存在しない）。"
        "「変る→かはる」型の歴史的仮名遣い懸念は動詞カテゴリ全体で機械的に検出できない。人間による個別レビューが必要。"
    )
    md_lines.append(
        f"- 助動詞290例: {aux_no_reading}/290 が targetReading 未設定。"
        "ただしlemmaがすでに平仮名（ず・り・けり等）のため、表示上の懸念は低いと推定（要人間確認）。"
    )
    md_lines.append("")
    md_lines.append("## 全体サマリ")
    md_lines.append("")
    md_lines.append("| status | 件数 |")
    md_lines.append("|---|---|")
    for k in ["PASS", "REVIEW_MARKER", "REVIEW_KANA", "REVIEW_BOTH", "DATA_ERROR"]:
        md_lines.append(f"| {k} | {counts[k]} |")
    md_lines.append("")
    md_lines.append("## 品詞別サマリ")
    md_lines.append("")
    md_lines.append("| 品詞 | PASS | REVIEW_MARKER | REVIEW_KANA | REVIEW_BOTH | DATA_ERROR |")
    md_lines.append("|---|---|---|---|---|---|")
    for cat, c in by_category.items():
        md_lines.append(
            f"| {cat} | {c['PASS']} | {c['REVIEW_MARKER']} | {c['REVIEW_KANA']} | {c['REVIEW_BOTH']} | {c['DATA_ERROR']} |"
        )
    md_lines.append("")
    md_lines.append("## 代表的疑義 (最大20件)")
    md_lines.append("")
    reviewed = [r for r in audited if r["status"] != "PASS"]
    for r in reviewed[:20]:
        md_lines.append(
            f"- `{r['id']}` [{r['status']}] {r['category']}/{r['lemma']}/{r['conjugationForm']}"
            f" target=`{r['displayTarget']}` reason={r['reason']}"
        )
    md_lines.append("")
    md_lines.append(f"(疑義合計 {len(reviewed)} 件のうち先頭20件を表示。全件は marker-kana-audit-v1.csv を参照)")
    md_lines.append("")

    md_path = OUT_DIR / "marker-kana-audit-v1.md"
    md_path.write_text("\n".join(md_lines), encoding="utf-8")

    print(f"wrote {csv_path}")
    print(f"wrote {md_path}")
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
