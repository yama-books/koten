# 助動詞の活用表のセルごとに選んだ用例（build.py が読む）。キー: (itemId, track, formIndex, 表の語形)。
# src: "builtin"（旧組み込み例） | ("a290", 収集290例の id) | ("row", sampleId, 開始位置)＝KWIC のキー直後の語 | ("ctx", sampleId, 開始位置, 引用の手がかり)＝同じ窓の中の語 | ("public", 公開本文) | None＝実例なし（note に理由）
# target＝原文表記の対象語。pre＝直前の文もいくつ含めるか（引用「と」で文が切れる例）。
F = ["未然形", "連用形", "終止形", "連体形", "已然形", "命令形"]
P = []


def p(item, track, fi, surf, src, target=None, quote=None, note="", pre=0, retired_id=False):
    # retired_id=True: 取り下げた用例。セルは実例なしにし、その用例 id は欠番にする（監査記録と id がずれないように）
    P.append(dict(item=item, track=track, fi=fi, surf=surf, src=src, target=target, quote=quote, note=note, pre=pre, retired_id=retired_id))


# る
p("ru_aux", "main", 0, "れ", "builtin")
p("ru_aux", "main", 1, "れ", ("a290", "aux-198"))
p("ru_aux", "main", 2, "る", ("row", "30-徒然1336_01055", 280), "る")
p("ru_aux", "main", 3, "るる", ("row", "20-枕草1001_00072", 240), "るる")
p("ru_aux", "main", 4, "るれ", ("row", "30-徒然1336_01010", 3040), "るれ")
p("ru_aux", "main", 5, "れよ", ("row", "30-平家1250_04005", 11970), "れよ")
# らる
p("raru_aux", "main", 0, "られ", "builtin")
# 2026-09-28 監査で差し替え（源氏物語・夕顔 → 十訓抄・大江山）。本文は CHJ（第三・一）
p("raru_aux", "main", 1, "られ", ("ctx", "30-十訓1252_03001", 1400, "過ぎられける"), "られ")
p("raru_aux", "main", 2, "らる", ("row", "20-源氏1010_00004", 209070), "らる")
p("raru_aux", "main", 3, "らるる", ("row", "20-枕草1001_00072", 120), "らるる")
p("raru_aux", "main", 4, "らるれ", ("row", "30-徒然1336_01015", 1290), "らるれ")
p("raru_aux", "main", 5, "られよ", ("row", "30-徒然1336_01054", 2250), "られよ")
# す
p("su_aux", "main", 0, "せ", ("row", "30-徒然1336_01006", 1650), "せ")
p("su_aux", "main", 1, "せ", "builtin")
p("su_aux", "main", 2, "す", ("a290", "aux-205"))
p("su_aux", "main", 3, "する", ("row", "30-徒然1336_01060", 1510), "する")
p("su_aux", "main", 4, "すれ", ("row", "20-枕草1001_00078", 4350), "すれ")
p("su_aux", "main", 5, "せよ", ("row", "30-平家1250_02006", 7150), "せよ")
# さす
p("sasu_aux", "main", 0, "させ", ("a290", "aux-208"))
p("sasu_aux", "main", 1, "させ", "builtin")
p("sasu_aux", "main", 2, "さす", ("row", "20-源氏1010_00001", 61890), "さす")
p("sasu_aux", "main", 3, "さする", ("row", "30-徒然1336_01238", 12100), "さする")
p("sasu_aux", "main", 4, "さすれ", ("row", "30-平家1250_07006", 1300), "さすれ")
p("sasu_aux", "main", 5, "させよ", ("row", "20-源氏1010_00004", 192520), "させよ")
# しむ
p("shimu_aux", "main", 0, "しめ", ("row", "30-方丈1212_00010", 6830), "しめ")
p("shimu_aux", "main", 1, "しめ", "builtin")
p("shimu_aux", "main", 2, "しむ", ("row", "30-平家1250_04001", 7170), "しむ")
p("shimu_aux", "main", 3, "しむる", ("row", "30-徒然1336_01121", 2210), "しむる")
p("shimu_aux", "main", 4, "しむれ", ("ctx", "30-十訓1252_04001", 2810, "せしむれば"), "しむれ")
p("shimu_aux", "main", 5, "しめよ", ("public", dict(excerpt="「いで其の子返し得しめよ」と云なり。", work="今昔物語集", volume="巻第二十七・第四十三",
  sourceLabel="『今昔物語集』巻27第43話・やたがらすナビ", sourceUrl="https://yatanavi.org/text/k_konjaku/k_konjaku27-43", sourceLicense="CC BY-SA 4.0",
  chjRef="30-今昔1100_27043,9540（CHJ原文「返シ令得ヨ」）",
  contextBefore="季武、袖の上に子を受てければ、亦、女、追々ふ、", contextAfter="季武、「今は返すまじ。己」と云て、河より此方の陸に打上ぬ。")), "しめよ")
# ず
p("zu", "main", 0, "ず", ("a290", "aux-001"))
p("zu", "main", 1, "ず", ("a290", "aux-005"))
p("zu", "main", 2, "ず", ("row", "20-枕草1001_00095", 21590), "ず")
p("zu", "main", 3, "ぬ", "builtin")
p("zu", "main", 4, "ね", ("a290", "aux-017"))
p("zu", "sub", 0, "ざら", ("a290", "aux-030"))
p("zu", "sub", 1, "ざり", ("a290", "aux-033"))
p("zu", "sub", 3, "ざる", ("a290", "aux-047"))
p("zu", "sub", 4, "ざれ", ("a290", "aux-059"))
p("zu", "sub", 5, "ざれ", ("a290", "aux-066"))
# む
p("mu_aux", "main", 2, "む", ("a290", "aux-182"))
p("mu_aux", "main", 3, "む", "builtin")
p("mu_aux", "main", 4, "め", ("row", "20-枕草1001_00039", 5780), "め")
# むず
p("muzu_aux", "main", 2, "むず", ("ctx", "20-竹取0900_00001", 137290, "失せなむず"), "むず")
p("muzu_aux", "main", 3, "むずる", "builtin")
p("muzu_aux", "main", 4, "むずれ", ("ctx", "30-平家1250_04010", 5930, "寄せんずれ"), "んずれ")
# じ
p("ji_aux", "main", 2, "じ", "builtin")
p("ji_aux", "main", 3, "じ", ("ctx", "20-蜻蛉0974_00001", 65750, "負けじ心"), "じ")
p("ji_aux", "main", 4, "じ", None, note="こそ…じ（已然形）の実例は収集資料に見当たらない")
# まし
p("mashi_aux", "main", 0, "ましか", ("row", "30-徒然1336_01235", 1350), "ましか")
p("mashi_aux", "main", 0, "ませ", ("row", "20-伊勢0920_00001", 107290), "ませ")
p("mashi_aux", "main", 2, "まし", "builtin")
p("mashi_aux", "main", 3, "まし", ("a290", "aux-193"))
p("mashi_aux", "main", 4, "ましか", ("row", "20-枕草1001_00095", 20470), "ましか")
# まほし
p("mahoshi_aux", "main", 0, "まほしく", ("row", "20-大鏡1100_02011", 132870), "まほしく")
p("mahoshi_aux", "main", 1, "まほしく", ("a290", "aux-146"))
p("mahoshi_aux", "main", 2, "まほし", ("row", "20-枕草1001_00153", 440), "まほし")
p("mahoshi_aux", "main", 3, "まほしき", ("a290", "aux-151"), pre=1)
p("mahoshi_aux", "main", 4, "まほしけれ", "builtin")
p("mahoshi_aux", "sub", 0, "まほしから", ("a290", "aux-160"))
p("mahoshi_aux", "sub", 1, "まほしかり", ("a290", "aux-162"))
p("mahoshi_aux", "sub", 3, "まほしかる", ("a290", "aux-165"))
# き
p("ki_aux", "main", 0, "せ", ("row", "20-伊勢0920_00001", 165600), "せ")
p("ki_aux", "main", 2, "き", ("row", "20-土佐0934_00001", 118640), "き")
p("ki_aux", "main", 3, "し", "builtin")
p("ki_aux", "main", 4, "しか", ("a290", "aux-215"))
# けり
p("keri", "main", 0, "けら", None, note="「けら」の実例は収集資料に見当たらない（CHJ 収集範囲で0件）")
p("keri", "main", 2, "けり", "builtin")
p("keri", "main", 3, "ける", ("a290", "aux-218"))
p("keri", "main", 4, "けれ", ("a290", "aux-217"))
# つ
p("tsu_aux", "main", 0, "て", ("a290", "aux-229"))
p("tsu_aux", "main", 1, "て", ("row", "20-伊勢0920_00001", 630), "て")
p("tsu_aux", "main", 2, "つ", "builtin")
p("tsu_aux", "main", 3, "つる", ("row", "20-枕草1001_00260", 20510), "つる")
p("tsu_aux", "main", 4, "つれ", ("row", "20-源氏1010_00009", 21650), "つれ")
p("tsu_aux", "main", 5, "てよ", ("row", "20-竹取0900_00001", 119290), "てよ")
# ぬ
p("nu_aux", "main", 0, "な", ("row", "30-徒然1336_01139", 1130), "な")
p("nu_aux", "main", 1, "に", ("a290", "aux-234"))
p("nu_aux", "main", 2, "ぬ", ("a290", "aux-236"))
p("nu_aux", "main", 3, "ぬる", "builtin")
p("nu_aux", "main", 4, "ぬれ", ("row", "20-土佐0934_00001", 78390), "ぬれ")
p("nu_aux", "main", 5, "ね", ("row", "20-竹取0900_00001", 145750), "ね")
# たり（完了）
p("tari_comp_aux", "main", 0, "たら", ("a290", "aux-226"))
p("tari_comp_aux", "main", 1, "たり", ("a290", "aux-235"))
p("tari_comp_aux", "main", 2, "たり", ("a290", "aux-232"))
p("tari_comp_aux", "main", 3, "たる", "builtin")
p("tari_comp_aux", "main", 4, "たれ", ("ctx", "20-土佐0934_00001", 37200, "寝たれば"), "たれ")
p("tari_comp_aux", "main", 5, "たれ", ("row", "20-枕草1001_00264", 500), "たれ")
# り
p("ri_aux", "main", 0, "ら", "builtin")
p("ri_aux", "main", 1, "り", ("row", "20-伊勢0920_00001", 99040), "り", pre=1)
p("ri_aux", "main", 2, "り", ("row", "20-竹取0900_00001", 66770), "り", pre=1)
p("ri_aux", "main", 3, "る", ("row", "20-土佐0934_00001", 23100), "る", pre=1)
p("ri_aux", "main", 4, "れ", ("row", "20-土佐0934_00001", 97890), "れ")
p("ri_aux", "main", 5, "れ", ("row", "30-宇治1220_07005", 39180), "れ")
# けむ
p("kemu_aux", "main", 2, "けむ", ("a290", "aux-254"))
p("kemu_aux", "main", 3, "けむ", ("a290", "aux-253"))
p("kemu_aux", "main", 4, "けめ", "builtin")
# らむ
p("ramu_aux", "main", 2, "らむ", "builtin")
p("ramu_aux", "main", 3, "らむ", ("a290", "aux-264"))
p("ramu_aux", "main", 4, "らめ", ("row", "30-平家1250_11016", 20560), "らめ")
# べし
p("beshi_aux", "main", 0, "べく", ("row", "20-伊勢0920_00001", 93510), "べく")
p("beshi_aux", "main", 1, "べく", ("a290", "aux-071"))
p("beshi_aux", "main", 2, "べし", ("a290", "aux-077"))
p("beshi_aux", "main", 3, "べき", "builtin")
p("beshi_aux", "main", 4, "べけれ", ("a290", "aux-087"))
p("beshi_aux", "sub", 0, "べから", ("a290", "aux-099"))
p("beshi_aux", "sub", 1, "べかり", ("a290", "aux-105"))
p("beshi_aux", "sub", 3, "べかる", ("a290", "aux-109"))
# まじ
p("maji_aux", "main", 0, "まじく", ("row", "20-大鏡1100_02004", 6000), "まじく")
p("maji_aux", "main", 1, "まじく", ("a290", "aux-117"))
p("maji_aux", "main", 2, "まじ", "builtin")
p("maji_aux", "main", 3, "まじき", ("a290", "aux-127"))
p("maji_aux", "main", 4, "まじけれ", ("a290", "aux-130"))
p("maji_aux", "sub", 0, "まじから", ("a290", "aux-137"))
p("maji_aux", "sub", 1, "まじかり", ("a290", "aux-141"))
p("maji_aux", "sub", 3, "まじかる", ("ctx", "30-平家1250_03017", 6230, "限るまじかんなり"), "まじかん",
  note="撥音便「まじかん」（まじかる＋なり）。源氏物語・若紫「違ふまじかなるものを」は撥音無表記の同例")
# らし
p("rashi_aux", "main", 2, "らし", "builtin")
p("rashi_aux", "main", 3, "らし", ("ctx", "20W古今0905_06007", 2190, "まゝさるらし"), "らし")
p("rashi_aux", "main", 4, "らし", ("a290", "aux-257"))
# めり
p("meri_aux", "main", 1, "めり", ("row", "20-枕草1001_00047", 17260), "めり")
p("meri_aux", "main", 2, "めり", "builtin")
p("meri_aux", "main", 3, "める", ("a290", "aux-275"))
p("meri_aux", "main", 4, "めれ", ("a290", "aux-276"))
# なり（伝聞・推定）
p("nari_hearsay_aux", "main", 1, "なり", ("row", "20-枕草1001_00083", 45860), "なり")
p("nari_hearsay_aux", "main", 2, "なり", "builtin")
p("nari_hearsay_aux", "main", 3, "なる", ("a290", "aux-280"))
p("nari_hearsay_aux", "main", 4, "なれ", ("a290", "aux-279"))
# なり（断定）
p("nari_assert_aux", "main", 0, "なら", ("ctx", "30-平家1250_06010", 9460, "男子ならば"), "なら")
p("nari_assert_aux", "main", 1, "なり", "builtin")
p("nari_assert_aux", "sub", 1, "に", ("ctx", "20-竹取0900_00001", 158890, "人にもあらず"), "に")
p("nari_assert_aux", "main", 2, "なり", ("ctx", "20-土佐0934_00001", 200, "とてするなり"), "なり")
p("nari_assert_aux", "main", 3, "なる", ("ctx", "20-伊勢0920_00001", 22500, "駿河なる"), "なる")
p("nari_assert_aux", "main", 4, "なれ", ("ctx", "20-伊勢0920_00001", 80300, "人の子なれば"), "なれ")
p("nari_assert_aux", "main", 5, "なれ", None, note="断定「なり」の命令形の実例は収集資料に見当たらない")
# たり（断定）
p("tari_assert_aux", "main", 0, "たら", ("ctx", "30-平家1250_02007", 22710, "君君たらず"), "たら")
p("tari_assert_aux", "main", 1, "たり", ("ctx", "30-平家1250_07015", 3220, "神竜たりき"), "たり")
p("tari_assert_aux", "sub", 1, "と", None, retired_id=True,
  note="例文を立てない（2026-09-28 監査）。「と」は主に「として」の形で現れ、格助詞とみる説もあるため（精選版日本国語大辞典・デジタル大辞泉は両説併記）。連用形は「たり」の例文（神竜たりき）で示す")
p("tari_assert_aux", "main", 2, "たり", "builtin")
p("tari_assert_aux", "main", 3, "たる", ("ctx", "30-平家1250_01003", 3530, "嫡男たる"), "たる")
p("tari_assert_aux", "main", 4, "たれ", None, note="断定「たり」の已然形の実例は収集資料に見当たらない")
p("tari_assert_aux", "main", 5, "たれ", None, note="断定「たり」の命令形の実例は収集資料に見当たらない")
# たし
p("tashi_aux", "main", 0, "たく", ("row", "30-平家1250_10002", 4520), "たく")
p("tashi_aux", "main", 1, "たく", ("a290", "aux-167"))
p("tashi_aux", "main", 2, "たし", ("a290", "aux-290"))
p("tashi_aux", "main", 3, "たき", ("a290", "aux-172"))
p("tashi_aux", "main", 4, "たけれ", ("a290", "aux-179"))
p("tashi_aux", "sub", 0, "たから", ("a290", "aux-286"))
p("tashi_aux", "sub", 1, "たかり", "builtin")
p("tashi_aux", "sub", 3, "たかる", None, note="CHJ 全1,277件で0件。外部調査でも確実な実例なし（HANDOFF §5）")
# ごとし
p("gotoshi_aux", "main", 1, "ごとく", ("ctx", "30-徒然1336_01217", 3220, "君のごとく"), "ごとく")
p("gotoshi_aux", "main", 2, "ごとし", "builtin")
p("gotoshi_aux", "main", 3, "ごとき", ("ctx", "20-伊勢0920_00001", 145810, "桂のごとき"), "ごとき")
