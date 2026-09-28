"""助動詞の用例データを作る（HANDOFF §30「助動詞の用例の増補」）。

入力（GitHub には複製しない原資料）
  - CHJ の KWIC 書き出し（Drive「活用表アプリ」フォルダ。既定は G:\\マイドライブ\\活用表アプリ）
  - 助動詞290例の収集データ auxiliary_examples.json（katsuyo_v0418。既定は D:\\dev\\koten-conj-audit\\...）
入力（リポジトリ内）
  - picks.py            … 活用表のセルごとに選んだ用例（出所・原文 target・引用の手がかり）
  - meanings.py         … 用例ごとの意味の候補と根拠（Claude 案。ユーザーの監査で status を audited にする）
  - builtin-items-bdaa05e.json … 以前 index.html に組み込んでいた28例
  - ../../data/aux-example-meanings.json … 監査済みの意味（あれば引き継ぐ）
出力
  - conj/data/aux-examples.json
  - conj/data/aux-example-meanings.json
  - conj/audit/aux_examples/audit-stock.md（監査用の一覧）

使い方: python conj/audit/aux_examples/build.py [--kwic-root DIR] [--aux290 FILE]
原文の照合（target の位置・引用の手がかり）に1件でも失敗すると、何も書き出さずに止まる。
"""
import argparse, csv, glob, io, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONJ = os.path.normpath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from picks import P, F  # noqa: E402
from meanings import M, SINGLE  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--kwic-root", default=r"G:\マイドライブ\活用表アプリ")
ap.add_argument("--review-out", default=None, help="監査用に前後の文つきの全文を書き出す（リポジトリの外に置くこと）")
ap.add_argument("--aux290", default=r"D:\dev\koten-conj-audit\conj\_qa_source\extracted\katsuyo_v0418\data\auxiliary_examples.json")
args = ap.parse_args()

# ---------- 原資料の読み込み
ROWS, seen = [], set()
for f in sorted(glob.glob(os.path.join(args.kwic_root, "**", "kwic-*.csv"), recursive=True)):
    raw = open(f, "rb").read()
    enc = "utf-16" if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else "utf-8-sig"
    for r in csv.DictReader(io.StringIO(raw.decode(enc, errors="replace")), delimiter="\t"):
        k = (r["サンプル ID"], r["開始位置"])
        if k not in seen:
            seen.add(k)
            ROWS.append(r)
if not ROWS:
    sys.exit("KWIC data not found under " + args.kwic_root)
IDX = {(r["サンプル ID"], int(r["開始位置"])): r for r in ROWS}
BYSID = {}
for r in ROWS:
    BYSID.setdefault(r["サンプル ID"], []).append(r)
A290 = {r["id"]: r for r in json.load(open(args.aux290, encoding="utf-8"))["examples"]}
BUILTIN = {x["id"]: x for x in json.load(open(os.path.join(HERE, "builtin-items-bdaa05e.json"), encoding="utf-8"))["items"]}
# 活用表のセルは現行の index.html から読む（組み込み例の本文だけを固定値から取る）
TABLES = {x["id"]: x for x in json.loads(subprocess.run(["node", os.path.join(HERE, "extract-aux-tables.cjs")],
                                                         capture_output=True, check=True).stdout.decode("utf-8"))}
if set(TABLES) != set(BUILTIN):
    sys.exit("aux items in index.html differ from the builtin snapshot")
MEANINGS_PATH = os.path.join(CONJ, "data", "aux-example-meanings.json")
AUDIT_PATH = os.path.join(HERE, "audit-2026-09-28.json")
AUDIT = {r["id"]: r for r in json.load(open(AUDIT_PATH, encoding="utf-8"))["records"]} if os.path.exists(AUDIT_PATH) else {}
OLD_MEANINGS = {r["id"]: r for r in json.load(open(MEANINGS_PATH, encoding="utf-8"))["records"]} if os.path.exists(MEANINGS_PATH) else {}


def full(r):
    pre, key, post = r["原文前文脈"], r["原文キー"], r["原文後文脈"]
    return pre + key + post, len(pre), len(pre) + len(key)


def sentence_span(text, pos):
    a = text.rfind("#", 0, pos) + 1
    b = text.find("#", pos)
    return a, (len(text) if b < 0 else b)


def stitch(r, text, pos):
    """同じサンプルの重なる窓をつないで、target を含む文を最後まで取る。"""
    for _ in range(12):
        a, b = sentence_span(text, pos)
        need_left = a == 0 or text.rfind("#", 0, a - 1) < 0
        need_right = b == len(text)
        if not (need_left or need_right):
            break
        grown = False
        for o in BYSID[r["サンプル ID"]]:
            if abs(int(o["開始位置"]) - int(r["開始位置"])) > 3000:
                continue
            t2 = o["原文前文脈"] + o["原文キー"] + o["原文後文脈"]
            lo = max(0, pos - 15)
            k = t2.find(text[lo:pos + 15])
            if k < 0:
                continue
            p2 = k + (pos - lo)
            gain_l, gain_r = p2 - pos, (len(t2) - p2) - (len(text) - pos)
            if (need_left and gain_l > 0) or (need_right and gain_r > 0):
                left = t2[:p2] if gain_l > 0 else text[:pos]
                right = t2[p2:] if gain_r > 0 else text[pos:]
                text, pos, grown = left + right, len(left), True
        if not grown:
            break
    return text, pos


MAXLEN = 46


def trim(ex, tpos, tlen):
    """長い文は target を含む「、」区切りのまとまりを中心に切り出す。"""
    if len(ex) <= MAXLEN + 6:
        return ex, tpos, False, False
    bounds = [0] + [m.end() for m in re.finditer("[、，]", ex)] + [len(ex)]
    segs = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]
    lo = hi = next(i for i, (a, b) in enumerate(segs) if a <= tpos < b)
    while segs[hi][1] < tpos + tlen:
        hi += 1
    while True:
        grew = False
        if lo > 0 and segs[hi][1] - segs[lo - 1][0] <= MAXLEN:
            lo, grew = lo - 1, True
        if hi < len(segs) - 1 and segs[hi + 1][1] - segs[lo][0] <= MAXLEN:
            hi, grew = hi + 1, True
        if not grew:
            break
    a, b = segs[lo][0], segs[hi][1]
    out = ex[a:b]
    if b < len(ex):
        out = out.rstrip("、，")
    return out, tpos - a, a > 0, b < len(ex)


def nth_pos(ex, target, n):
    k, f = -1, 0
    for _ in range(n + 1):
        k = ex.find(target, f)
        if k < 0:
            raise SystemExit(f"target #{n} not in {ex}")
        f = k + len(target)
    return k


def occurrence_of(ex, target, tpos):
    """画面の highlight() と同じ数え方（重ならない出現の何番目か）。"""
    occ, f = 0, 0
    while True:
        k = ex.find(target, f)
        if k < 0 or k >= tpos:
            break
        occ, f = occ + 1, k + len(target)
    if ex.find(target, f) != tpos:
        raise SystemExit(f"occurrence alignment failed: {ex} / {target}")
    return occ


def resolve(pk):
    src = pk["src"]
    if src == "builtin":
        it = BUILTIN[pk["item"]]
        return dict(example=it["example"], target=it["target"], occurrence=it.get("occurrence") or 0,
                    work="小倉百人一首" if it.get("poem") else it["source"].split("・")[0],
                    source=None if it.get("poem") else it["source"], poem=it.get("poem"),
                    origin="builtin", provenance={"builtinSnapshot": "builtin-items-bdaa05e.json#" + it["id"]})
    if src[0] == "public":
        d = src[1]
        if d["excerpt"].count(pk["target"]) != 1:
            raise SystemExit("public target not unique: " + d["excerpt"])
        return dict(example=d["excerpt"], target=pk["target"], occurrence=0, work=d["work"], source=d["work"], poem=None,
                    origin="public-text", provenance={"volume": d["volume"], "chj": d["chjRef"]},
                    publicSource={"sourceLabel": d["sourceLabel"], "sourceUrl": d["sourceUrl"], "sourceLicense": d["sourceLicense"]},
                    review={"before": d.get("contextBefore", ""), "sentence": d["excerpt"].replace(pk["target"], "［" + pk["target"] + "］", 1),
                            "after": d.get("contextAfter", ""), "windowCutLeft": True, "windowCutRight": True})
    if src[0] == "a290":
        a = A290[src[1]]
        r = IDX[(a["sampleId"], a["start"])]
        target = a["originalTarget"]
        text, ks, ke = full(r)
        if r["品詞"].startswith("助動詞"):
            pos = ks
        else:
            pos = ke
            if text[pos:pos + len(target)] != target:
                q = text.find(a["anchor"], max(0, ks - 40))
                if q < 0:
                    raise SystemExit(f"{a['id']}: anchor not found")
                pos = q + a["anchor"].rfind(target)
        if text[pos:pos + len(target)] != target:
            raise SystemExit(f"{a['id']}: target not at position")
        collected = a["id"]
    else:
        kind, sid, start = src[:3]
        r = IDX[(sid, start)]
        text, ks, ke = full(r)
        target = pk["target"]
        if kind == "row":
            pos = ks if (r["品詞"].startswith("助動詞") and text[ks:ks + len(target)] == target) else ke
            if text[pos:pos + len(target)] != target:
                raise SystemExit(f"{pk['item']} {F[pk['fi']]}: target does not follow the key")
        else:
            quote = src[3]
            hits = [m.start() for m in re.finditer(re.escape(quote), text)]
            if not hits or quote.rfind(target) < 0:
                raise SystemExit(f"{pk['item']} {F[pk['fi']]}: quote {quote} not found")
            q = min(hits, key=lambda h: abs(h - ks))
            pos = q if quote.startswith(target) else q + quote.rfind(target)
        collected = None
    text, pos = stitch(r, text, pos)
    a_, b_ = sentence_span(text, pos)
    # 監査用の文脈：前後1文ずつ（CHJ の窓にある範囲で）
    s0, s1 = sentence_span(text, pos)
    p0 = sentence_span(text, s0 - 2)[0] if s0 >= 2 else s0
    n1 = sentence_span(text, s1 + 1)[1] if s1 < len(text) else s1
    review = {"before": text[p0:s0].replace("#", "／").rstrip("／"), "sentence": text[s0:pos] + "［" + target + "］" + text[pos + len(target):s1],
              "after": text[s1:n1].replace("#", "／").lstrip("／"), "windowCutLeft": p0 == 0, "windowCutRight": n1 == len(text)}
    for _ in range(pk.get("pre", 0)):
        a_ = sentence_span(text, a_ - 2)[0] if a_ >= 2 else a_
    raw_ex = text[a_:b_]
    ex = raw_ex.lstrip("\u3000 ")
    tpos = pos - a_ - (len(raw_ex) - len(ex))
    cut_left = a_ == 0
    cut_right = b_ == len(text) and not re.search(r"[。」』]$", ex)
    ex, tpos, cl, cr = trim(ex, tpos, len(target))
    cut_left, cut_right = cut_left or cl, cut_right or cr
    # CHJ の「#」は文・行の区切り（歌と地の文の境など）。表示では全角空白にする。
    ex = ex.replace("#", "\u3000")
    if cut_left:
        ex, tpos = "…" + ex, tpos + 1
    if cut_right:
        ex = ex + "…"
    occ = occurrence_of(ex, target, tpos)
    prov = {"corpus": "CHJ", "sampleId": r["サンプル ID"], "start": int(r["開始位置"]), "volume": r["巻名等"], "part": r["部"]}
    if r["歌番号"]:
        prov["poemNumber"] = r["歌番号"]
    if collected:
        prov["collectedId"] = collected
    return dict(example=ex, target=target, occurrence=occ, work=r["作品名"], source=r["作品名"], poem=None, origin="chj", provenance=prov, review=review)


def base_letters(t):
    """濁点・半濁点と読点を除き、踊り字（ゝゞ）を前の字に戻した文字列（校訂表記の補正がそれだけであることの確認用）。"""
    import unicodedata
    out = []
    for ch in unicodedata.normalize("NFD", t):
        if ch in "゙゚、，":
            continue
        out.append(out[-1] if ch in "ゝゞ" and out else ch)
    return "".join(out)


PREFIX = {"zu": "zu", "keri": "keri"}


def prefix(item_id):
    return PREFIX.get(item_id) or item_id.replace("_aux", "").replace("_", "-")


# ---------- 組み立て
items_order = list(BUILTIN)
REVIEW = {}
cells, records, meanings = [], [], []
counters = {}
ordered = sorted(P, key=lambda pk: (items_order.index(pk["item"]), pk["fi"], pk["track"] != "main"))
for pk in ordered:
    item = TABLES[pk["item"]]
    forms = item["forms"] if pk["track"] == "main" else item.get("forms2")
    if not forms or pk["surf"] not in (forms[pk["fi"]] or []):
        raise SystemExit(f"{pk['item']} {pk['track']} {F[pk['fi']]} {pk['surf']}: not a cell of the table")
    cell = {"itemId": pk["item"], "track": pk["track"], "formIndex": pk["fi"], "form": F[pk["fi"]], "surface": pk["surf"]}
    if pk["src"] is None:
        c = {**cell, "status": "unattested", "exampleIds": [], "note": pk["note"]}
        if pk.get("retired_id"):
            n = counters[pk["item"]] = counters.get(pk["item"], 0) + 1
            c["retiredExampleId"] = f"aux-{prefix(pk['item'])}-{n:03d}"
        cells.append(c)
        continue
    res = resolve(pk)
    n = counters[pk["item"]] = counters.get(pk["item"], 0) + 1
    rid = f"aux-{prefix(pk['item'])}-{n:03d}"
    audit = AUDIT.get(rid)
    if audit and (audit["itemId"] != pk["item"] or audit["normalizedKey"] != pk["surf"]):
        raise SystemExit(f"{rid}: the audit record is for {audit['itemId']} {audit['normalizedKey']}")
    # 校訂表記（濁点・読点の補い）。元の本文との違いがそれだけであることを確かめてから差し替える
    if audit and audit.get("display"):
        d = audit["display"]
        if base_letters(d["example"]) != base_letters(res["example"]) or base_letters(d["target"]) != base_letters(res["target"]):
            raise SystemExit(f"{rid}: display override differs from the source text beyond dakuten/commas")
        res["provenance"]["sourceOrthography"] = {"example": res["example"], "target": res["target"]}
        res.update(example=d["example"], target=d["target"], occurrence=d["occurrence"])
        occurrence_of(res["example"], res["target"], nth_pos(res["example"], res["target"], res["occurrence"]))
    rec = {"id": rid, "itemId": pk["item"], "track": pk["track"], "formIndex": pk["fi"], "form": F[pk["fi"]],
           "normalizedKey": pk["surf"], "target": res["target"], "occurrence": res["occurrence"], "example": res["example"],
           "work": res["work"], "source": res["source"], "poem": res["poem"], "origin": res["origin"], "provenance": res["provenance"]}
    if res.get("publicSource"):
        rec["publicSource"] = res["publicSource"]
    if pk.get("note"):
        rec["note"] = pk["note"]
    if audit and audit.get("pattern"):
        rec["pattern"] = audit["pattern"]
    if audit and audit.get("display"):
        rec["orthography"] = "濁点・読点を補った校訂表記（" + audit.get("auditChange", "") + "）"
    records.append(rec)
    REVIEW[rid] = res.get("review")
    cells.append({**cell, "status": "example", "exampleIds": [rid]})
    # 意味
    key = (pk["item"], pk["track"], pk["fi"], pk["surf"])
    item_meanings = item["meaning"].split("・")
    if pk["src"] == "builtin":
        old = OLD_MEANINGS.get(rid) or OLD_MEANINGS.get(pk["item"])
        if not old:
            raise SystemExit("no audited meaning for builtin " + pk["item"])
        mrec = {"exampleMeanings": old["exampleMeanings"], "basis": old["basis"], "confidence": old.get("confidence", ""), "status": old["status"]}
    elif pk["item"] in SINGLE:
        prev = OLD_MEANINGS.get(rid, {})
        mrec = {"exampleMeanings": [SINGLE[pk["item"]]], "basis": "意味が1つの語", "confidence": "—", "status": prev.get("status", "candidate")}
    else:
        if key not in M:
            raise SystemExit(f"no meaning proposal for {key}")
        ms, basis, conf = M[key]
        prev = OLD_MEANINGS.get(rid)
        # 監査済みの記録は、同じ用例・同じ意味のときだけ引き継ぐ
        status = prev["status"] if prev and prev.get("exampleMeanings") == ms and prev.get("target") == res["target"] else "candidate"
        mrec = {"exampleMeanings": ms, "basis": basis, "confidence": conf, "status": status}
    # ユーザーの監査（2026-09-28）：主（primary）と別解（secondary）
    if audit and audit["decision"] in ("approved", "changed", "audited-previously"):
        mrec = {"exampleMeanings": audit["primary"], "altMeanings": audit["secondary"],
                "basis": audit.get("basis") or mrec["basis"], "confidence": mrec.get("confidence", ""),
                "status": "audited", "decision": audit["decision"]}
    elif audit:
        raise SystemExit(f"{rid}: audit decision {audit['decision']} but the example is still picked")
    mrec.setdefault("altMeanings", [])
    if not all(m in item_meanings for m in mrec["exampleMeanings"] + mrec["altMeanings"]):
        raise SystemExit(f"{rid}: meaning not in item list")
    if set(mrec["exampleMeanings"]) & set(mrec["altMeanings"]):
        raise SystemExit(f"{rid}: a meaning is both primary and secondary")
    meanings.append({"id": rid, "itemId": pk["item"], "target": res["target"], "occurrence": res["occurrence"], **mrec})

for aid, a in AUDIT.items():
    if a["decision"] == "withdrawn" and any(r["id"] == aid for r in records):
        raise SystemExit(f"{aid} was withdrawn in the audit")
    if a["decision"] != "withdrawn" and not any(r["id"] == aid for r in records):
        raise SystemExit(f"{aid} is audited but missing")

# 表のセルはすべて、用例ありか実例なしのどちらかに決めてあること
listed = {(c["itemId"], c["track"], c["formIndex"], c["surface"]) for c in cells}
for iid, item in TABLES.items():
    for track, forms in (("main", item["forms"]), ("sub", item.get("forms2"))):
        for fi, fs in enumerate(forms or []):
            for s_ in fs or []:
                if (iid, track, fi, s_) not in listed:
                    raise SystemExit(f"cell without decision: {iid} {track} {F[fi]} {s_}")
cells.sort(key=lambda c: (items_order.index(c["itemId"]), c["formIndex"], c["track"] != "main"))

status_counts = {}
for c in cells:
    status_counts[c["status"]] = status_counts.get(c["status"], 0) + 1
examples_json = {
    "schemaVersion": "1.0",
    "updated": "2026-09-28",
    "policy": "活用表の各セルに、実在が確認できた歴史的用例を1つ以上。実例が確認できないセルは人工例で埋めず status=unattested（活用表ドリルのみ）。target は原文の表記、normalizedKey は活用表の語形。CHJ の本文は引用として掲載し、出典は用例ごとではなく出典一覧に示す（PUBLIC_TEXT_SOURCE_POLICY.md の裁定）。",
    "sources": {
        "chj": {"name": "国立国語研究所『日本語歴史コーパス』", "url": "https://clrd.ninjal.ac.jp/chj/"},
        "hyakunin": {"name": "『小倉百人一首』"}
    },
    "counts": {"records": len(records), "cells": len(cells), **{"cells_" + k: v for k, v in sorted(status_counts.items())}},
    "tableNotes": ["2026-09-28: べし・まじ・まほし・たし の補助活用命令形（べかれ・まじかれ・まほしかれ・たかれ）は、『新しい古典文法』付録の助動詞一覧表どおり「○」（活用形なし）のセルに改めた。"],
    "cells": cells,
    "records": records,
}
meanings_json = {
    "schemaVersion": "2.0",
    "source": "conj/audit/aux_examples/meanings.py（Claude 案）。組み込みの28例は DESIGN_GLOSS_LAYOUT_2026-09-28 §6.5 でユーザーが 2026-09-28 に監査・承認したもの",
    "policy": "id は aux-examples.json の用例 id。status が \"audited\" のものだけを画面で強調する（exampleMeanings の各要素にマーカー＋太字）。candidate は一覧を普通に表示するだけ。意味が1つの語は status によらず強調しない。exampleMeanings の各要素は問題の meaning を「・」で分けた要素のどれかと一致すること。target・occurrence が用例と一致しない記録は使わない。",
    "records": meanings,
}


def dump(obj, path):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


dump(examples_json, os.path.join(CONJ, "data", "aux-examples.json"))
dump(meanings_json, MEANINGS_PATH)

# ---------- 監査用の一覧
mby = {m["id"]: m for m in meanings}
lines = ["# 助動詞の用例ストック（監査用）", "",
         "`build.py` が生成する。用例ごとの意味は 2026-09-28 のユーザー監査（`audit-2026-09-28.json`）で全件 audited。", "",
         "| id | 語 | 活用形 | 用例（［ ］が対象） | 出典 | この用例での意味 | 根拠 | 確度 | status |", "|---|---|---|---|---|---|---|---|---|"]
for c in cells:
    item = TABLES[c["itemId"]]
    formlabel = ("補" if c["track"] == "sub" else "") + c["form"] + "「" + c["surface"] + "」"
    if not c["exampleIds"]:
        lines.append(f'| — | {item["lemma"]} | {formlabel} | （実例なし）{c["note"]} | | | | | |')
        continue
    for rid in c["exampleIds"]:
        rec = next(r for r in records if r["id"] == rid)
        ex, t = rec["example"], rec["target"]
        k, f = -1, 0
        for _ in range(rec["occurrence"] + 1):
            k = ex.find(t, f)
            f = k + len(t)
        shown = ex[:k] + "［" + t + "］" + ex[f:]
        src = (f'百人一首{rec["poem"]}' if rec["poem"] else rec["work"] + (("・" + rec["provenance"].get("volume", "")) if rec["provenance"].get("volume") else ""))
        if rec["origin"] == "builtin":
            src += "（従来の組み込み例）"
        m = mby[rid]
        note = ("<br>※" + rec["note"]) if rec.get("note") else ""
        mean = "・".join(m["exampleMeanings"]) + (("（別解：" + "・".join(m["altMeanings"]) + "）") if m.get("altMeanings") else "")
        lines.append(f'| {rid} | {item["lemma"]} | {formlabel} | {shown}{note} | {src} | {mean} | {m["basis"]} | {m["confidence"]} | {m["status"]} |')
with open(os.path.join(HERE, "audit-stock.md"), "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(lines) + "\n")
print(json.dumps(examples_json["counts"], ensure_ascii=False))
print("meanings:", {s: sum(1 for m in meanings if m["status"] == s) for s in ("audited", "candidate")})

if args.review_out:
    rows = []
    for rec in records:
        m = mby[rec["id"]]
        item = TABLES[rec["itemId"]]
        rows.append({"id": rec["id"], "itemId": rec["itemId"], "lemma": item["lemma"], "meaningList": item["meaning"].split("・"),
                     "form": ("補助活用" if rec["track"] == "sub" else "") + rec["form"], "normalizedKey": rec["normalizedKey"],
                     "target": rec["target"], "occurrence": rec["occurrence"], "example": rec["example"], "work": rec["work"],
                     "volume": rec["provenance"].get("volume", ""), "poem": rec["poem"], "origin": rec["origin"], "note": rec.get("note", ""),
                     "context": REVIEW.get(rec["id"]), "proposal": m["exampleMeanings"], "basis": m["basis"], "confidence": m["confidence"], "status": m["status"]})
    with open(args.review_out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)
    print("review rows:", len(rows), "->", args.review_out)
