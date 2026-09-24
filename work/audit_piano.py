# -*- coding: utf-8 -*-
import json, re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load(p):
    s = open(p, encoding='utf-8').read()
    return json.loads(re.search(r'=(\{.*\})\s*;?\s*$', s, re.S).group(1))

M = load(os.path.join(ROOT, 'data', 'meta.js'))
problems = []
audio_refs = set()

# meta 结构校验
total_meta = 0
for gr in M['grupos']:
    for pt in gr['partes']:
        total_meta += len(pt['secs'])
        for sc in pt['secs']:
            if 'count' not in sc:
                problems.append('meta 缺 count: %s' % sc['name'])

# 逐分册校验
total_data = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'sec', '*.js'))):
    d = load(f)
    gid = d['gid']
    for s in d['secs']:
        if s['type'] == 'terms':
            n = len(s['w'])
            total_data += n
            for it in s['w']:
                if len(it) != 7:
                    problems.append('gid=%s %s 词条列数=%d' % (gid, s['name'], len(it)))
                if not it[0].strip():
                    problems.append('gid=%s %s 空意语' % (gid, s['name']))
                if not it[2].strip():
                    problems.append('gid=%s %s 空中文: %r' % (gid, s['name'], it[0]))
                audio_refs.add(it[5]); audio_refs.add(it[6])
        elif s['type'] == 'dialogue':
            n = len(s['d'])
            total_data += n
            for t in s['d']:
                for k in ('role', 'it', 'zh', 'ait', 'azh'):
                    if k not in t:
                        problems.append('gid=%s %s 对话缺字段 %s' % (gid, s['name'], k))
                if not t['it'].strip():
                    problems.append('gid=%s %s 空意语对话' % (gid, s['name']))
                if not t['zh'].strip():
                    problems.append('gid=%s %s 空中文对话' % (gid, s['name']))
                audio_refs.add(t['ait']); audio_refs.add(t['azh'])
        else:
            problems.append('gid=%s %s 未知类型 %s' % (gid, s['name'], s['type']))

# 音频文件核对
miss = []; zero = []
for ref in audio_refs:
    p = os.path.join(ROOT, 'audio', ref)
    if not os.path.exists(p):
        miss.append(ref)
    elif os.path.getsize(p) < 500:
        zero.append(ref)

print('meta totalAll =', M['totalAll'], '| 数据条目合计 =', total_data, '| meta节数=', total_meta)
print('音频引用数 =', len(audio_refs))
print('缺失音频 =', len(miss))
print('0/过小音频 =', len(zero))
print('问题 =', len(problems))
for x in (miss + zero + problems)[:40]:
    print('  !', x)
if not (miss or zero or problems):
    print('OK: 全部音频引用存在且有效，数据契约一致')
