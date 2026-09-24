# -*- coding: utf-8 -*-
"""为钢琴站生成双语音频（it-IT-ElsaNeural / zh-CN-XiaoxiaoNeural）。
断点续跑：已存在且 >500B 跳过；失败重试 4 次；并发 14。
"""
import asyncio, json, os
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
VOICE = {'it': 'it-IT-ElsaNeural', 'zh': 'zh-CN-XiaoxiaoNeural'}
RATE = {'it': '-6%', 'zh': '-5%'}
SEM = asyncio.Semaphore(14)
jobs = json.load(open('work/piano_audio_jobs.json', encoding='utf-8'))
todo = [j for j in jobs
        if not (os.path.exists(j['path']) and os.path.getsize(j['path']) > 500)]
print('任务 %d，待生成 %d' % (len(jobs), len(todo)), flush=True)
fails = []


async def synth(j):
    for attempt in range(4):
        try:
            await edge_tts.Communicate(j['text'], VOICE[j['voice']], rate=RATE[j['voice']]).save(j['path'])
            if os.path.getsize(j['path']) > 500:
                return True
        except Exception:
            await asyncio.sleep(1.5 + attempt * 2.5)
    return False


async def main():
    done = 0

    async def worker(j):
        nonlocal done
        async with SEM:
            ok = await synth(j)
        done += 1
        if not ok:
            fails.append(j)
            print('FAIL', j['path'], repr(j['text'])[:60], flush=True)
        elif done % 20 == 0 or done == len(todo):
            print('进度 %d/%d' % (done, len(todo)), flush=True)

    await asyncio.gather(*[worker(j) for j in todo])
    print('完成：成功 %d，失败 %d' % (len(todo) - len(fails), len(fails)), flush=True)
    if fails:
        json.dump(fails, open('work/piano_audio_failed.json', 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)


asyncio.run(main())
