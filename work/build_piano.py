# -*- coding: utf-8 -*-
# 把两份钢琴课意大利语 Markdown 解析为本站数据契约（同 vocal 站）：
#   meta.js  -> window.BOOK_META
#   data/sec/{gid}.js -> window.BOOK_DATA[gid]
# 术语: w:[[意,词性,中,例,备,it,zh],...]
# 对话: d:[{role,it,sub,zh,ait,azh},...]
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE_TERMS = r"C:\Users\迪丽希斯\OneDrive\Desktop\钢琴课意大利语（技术词表 + 语法要点）.md"
FILE_DLG   = r"C:\Users\迪丽希斯\OneDrive\Desktop\钢琴课意大利语（课堂高频句 + 师生对话）.md"

ZW = "\u200b"  # 零宽空格
clean = lambda s: (s or "").replace(ZW, "").replace("\ufeff", "").strip()

def read(p):
    return open(p, encoding="utf-8").read()

def split_h2(md):
    """返回 [(标题, 正文)]，按 ## 切分（保留 # 一级标题忽略）"""
    parts = re.split(r'(?m)^##\s+(.+?)\s*$', md)
    # parts[0] 是文件头（# 标题 + 目录），之后是 (h2标题, 内容) 交替
    out = []
    for i in range(1, len(parts), 2):
        out.append((parts[i].strip(), parts[i + 1]))
    return out

def split_h3(body):
    parts = re.split(r'(?m)^###\s+(.+?)\s*$', body)
    out = []
    for i in range(1, len(parts), 2):
        out.append((parts[i].strip(), parts[i + 1]))
    return out

def parse_table(body):
    rows = []
    for line in body.splitlines():
        line = line.rstrip()
        if not line.startswith("|"):
            continue
        if re.match(r'^\s*\|[\s:|-]+\|\s*$', line):  # 分隔行
            continue
        cells = [clean(c) for c in line.strip().strip("|").split("|")]
        # 去掉表头
        if cells and cells[0] in ("意大利语", "**意大利语**"):
            continue
        if not any(cells):
            continue
        rows.append(cells)
    return rows

def parse_dialogue(body):
    turns = []
    cur = None
    role_re = re.compile(r'^\*\*\s*【(.+?)】\s*\*\*\s*(.*)$')
    for line in body.splitlines():
        line = line.rstrip()
        if not line.strip():
            continue
        m = role_re.match(line)
        if m:
            if cur:
                turns.append(cur)
            role = m.group(1).strip()
            role = {"教授": "教授", "学生·女": "学生（女）", "学生": "学生"}.get(role, role)
            it = clean(m.group(2))
            cur = {"role": role, "it": it, "zh": "", "sub": None}
            continue
        # 中文翻译行：_ ... _ （可能带行外括号注）
        if cur is not None and not cur["zh"]:
            zh = line.replace("_", "").strip()
            if zh:
                cur["zh"] = zh
    if cur:
        turns.append(cur)
    return turns

# ---------- 全局音频 id 计数器 ----------
AID = 0
def next_id():
    global AID
    AID += 1
    return "%05d" % AID

def zh_audio_text(zh):
    """配音用的中文文本：去掉（语法注）括号注，避免 TTS 念乱码"""
    t = re.sub(r'（[^）]*）', '', zh)
    t = re.sub(r'\([^)]*\)', '', t)
    return t.strip()

# ---------- 解析术语（文件A：一、钢琴技术术语表）----------
terms_secs = []
h2 = split_h2(read(FILE_TERMS))
for title, body in h2:
    if title.startswith("一、钢琴技术术语表"):
        for h3title, h3body in split_h3(body):
            rows = parse_table(h3body)
            w = []
            for r in rows:
                # 补齐到 5 列
                while len(r) < 5:
                    r.append("")
                it_text = clean(r[0])
                if not it_text:
                    continue
                zh_text = clean(r[2])
                aid = next_id()
                w.append([
                    it_text,
                    clean(r[1]),
                    zh_text,
                    clean(r[3]),
                    clean(r[4]),
                    "it/%s.mp3" % aid,
                    "zh/%s.mp3" % aid,
                ])
            if w:
                terms_secs.append({"name": h3title, "w": w})

# ---------- 解析对话（文件B：二、课堂高频句 / 三、师生对话示例）----------
dlg_secs_2 = []  # 二
dlg_secs_3 = []  # 三
h2b = split_h2(read(FILE_DLG))
for title, body in h2b:
    if title.startswith("二、课堂高频句"):
        for h3title, h3body in split_h3(body):
            turns = parse_dialogue(h3body)
            d = []
            for t in turns:
                aid = next_id()
                d.append({
                    "role": t["role"],
                    "it": t["it"],
                    "sub": None,
                    "zh": t["zh"],
                    "ait": "it/%s.mp3" % aid,
                    "azh": "zh/%s.mp3" % aid,
                })
            if d:
                dlg_secs_2.append({"name": h3title, "d": d})
    elif title.startswith("三、师生对话示例"):
        for h3title, h3body in split_h3(body):
            turns = parse_dialogue(h3body)
            d = []
            for t in turns:
                aid = next_id()
                d.append({
                    "role": t["role"],
                    "it": t["it"],
                    "sub": None,
                    "zh": t["zh"],
                    "ait": "it/%s.mp3" % aid,
                    "azh": "zh/%s.mp3" % aid,
                })
            if d:
                dlg_secs_3.append({"name": h3title, "d": d})

# ---------- 组装 meta + 分册 ----------
def make_sec(no, name, items, typ):
    if typ == "terms":
        return {"no": no, "name": name, "type": "terms", "count": len(items), "w": items}
    else:
        return {"no": no, "name": name, "type": "dialogue", "count": len(items), "d": items}

# 分册 0：一、钢琴技术术语表（terms）
gid0_secs = [make_sec(i + 1, s["name"], s["w"], "terms") for i, s in enumerate(terms_secs)]

# 分册 1：二、课堂高频句（dialogue）
gid1_secs = [make_sec(i + 1, s["name"], s["d"], "dialogue") for i, s in enumerate(dlg_secs_2)]

# 分册 2：三、师生对话示例（dialogue）
gid2_secs = [make_sec(i + 1, s["name"], s["d"], "dialogue") for i, s in enumerate(dlg_secs_3)]

meta = {
    "title": "意大利语钢琴课术语与对话",
    "author": "基于真实钢琴课堂对话与术语体系整理",
    "grupos": [
        {
            "name": "钢琴技术术语",
            "partes": [
                {"gid": 0, "no": 1, "name": "一、钢琴技术术语表", "secs": [
                    {"no": s["no"], "name": s["name"], "type": "terms", "count": s["count"]} for s in gid0_secs
                ]}
            ]
        },
        {
            "name": "课堂高频句与对话",
            "partes": [
                {"gid": 1, "no": 2, "name": "二、课堂高频句", "secs": [
                    {"no": s["no"], "name": s["name"], "type": "dialogue", "count": s["count"]} for s in gid1_secs
                ]},
                {"gid": 2, "no": 3, "name": "三、师生对话示例", "secs": [
                    {"no": s["no"], "name": s["name"], "type": "dialogue", "count": s["count"]} for s in gid2_secs
                ]}
            ]
        }
    ],
    "totalAll": sum(s["count"] for s in gid0_secs + gid1_secs + gid2_secs)
}

def dump_sec(gid, secs, gname, parte_name):
    obj = {"gid": gid, "no": gid + 1, "name": parte_name, "gname": gname, "secs": secs}
    s = "window.BOOK_DATA=window.BOOK_DATA||{};window.BOOK_DATA[%d]=%s;" % (gid, json.dumps(obj, ensure_ascii=False))
    with io.open(os.path.join(ROOT, "data", "sec", "%d.js" % gid), "w", encoding="utf-8", newline="\n") as f:
        f.write(s)

import io
dump_sec(0, gid0_secs, "钢琴技术术语", "一、钢琴技术术语表")
dump_sec(1, gid1_secs, "课堂高频句与对话", "二、课堂高频句")
dump_sec(2, gid2_secs, "课堂高频句与对话", "三、师生对话示例")

with io.open(os.path.join(ROOT, "data", "meta.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write("window.BOOK_META=" + json.dumps(meta, ensure_ascii=False) + ";")

# ---------- 音频任务 ----------
jobs = []
for secs in (gid0_secs, gid1_secs, gid2_secs):
    for s in secs:
        if s["type"] == "terms":
            for it in s["w"]:
                jobs.append({"path": os.path.join(ROOT, "audio", it[5]), "text": it[0], "voice": "it"})
                jobs.append({"path": os.path.join(ROOT, "audio", it[6]), "text": it[2], "voice": "zh"})
        else:
            for t in s["d"]:
                jobs.append({"path": os.path.join(ROOT, "audio", t["ait"]), "text": t["it"], "voice": "it"})
                jobs.append({"path": os.path.join(ROOT, "audio", t["azh"]), "text": zh_audio_text(t["zh"]), "voice": "zh"})
json.dump(jobs, open(os.path.join(ROOT, "work", "piano_audio_jobs.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---------- 摘要 ----------
print("分册0 术语节数:", len(gid0_secs), "词条:", sum(len(s['w']) for s in gid0_secs))
for s in gid0_secs:
    print("   ", s["no"], s["name"], len(s["w"]))
print("分册1 对话节数:", len(gid1_secs), "轮次:", sum(len(s['d']) for s in gid1_secs))
print("分册2 对话节数:", len(gid2_secs), "轮次:", sum(len(s['d']) for s in gid2_secs))
print("音频任务总数:", len(jobs), " (it+zh 各", len(jobs)//2, ")")
print("totalAll:", meta["totalAll"])
# 抽样校验
print("--- 术语样本 gid0 sec1 前2 ---")
for r in gid0_secs[0]["w"][:2]:
    print("  ", json.dumps(r, ensure_ascii=False))
print("--- 对话样本 gid1 sec2 (2.2) 前2 ---")
for t in gid1_secs[1]["d"][:2]:
    print("  ", json.dumps(t, ensure_ascii=False))
