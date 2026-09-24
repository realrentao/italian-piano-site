// 浏览器复检：渲染 18 节、控制台错误、意→中连播、音频 404、截图
const { chromium } = require('playwright');
const path = require('path');
const SHOT = path.join(__dirname, '..', 'work');
const BASE = 'http://127.0.0.1:8137/';

const audioBad = [];     // 音频响应非 200
const consoleErr = [];
const pageErr = [];
const reqFail = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/audio/') && r.status() !== 200) audioBad.push(u + ' ' + r.status());
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (u.includes('/audio/')) audioBad.push('REQFAIL ' + u);
    else reqFail.push(u + ' ' + (r.failure() || {}).errorText);
  });
  page.on('console', (m) => { if (m.type() === 'error') consoleErr.push(m.text()); });
  page.on('pageerror', (e) => pageErr.push(e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__SVOCAL && window.__SVOCAL.FLAT && window.__SVOCAL.FLAT.length, null, { timeout: 10000 });

  const flat = await page.evaluate(() => window.__SVOCAL.FLAT);
  console.log('FLAT 节数 =', flat.length);

  // 逐节渲染检查
  let renderBad = [];
  for (let idx = 0; idx < flat.length; idx++) {
    await page.evaluate((i) => document.querySelectorAll('.sec-item')[i].click(), idx);
    await page.waitForTimeout(40);
    const r = await page.evaluate(() => {
      const c = document.getElementById('content');
      return {
        title: (c.querySelector('.sec-title') || {}).textContent || '',
        rows: c.querySelectorAll('.row, .turn').length,
        empty: (c.querySelector('.empty') || {}).textContent || '',
      };
    });
    if (r.title !== flat[idx].name) renderBad.push('[标题] 期望 ' + flat[idx].name + ' 得到 ' + r.title);
    if (r.rows === 0) renderBad.push('[空] ' + flat[idx].name + ' ' + r.empty);
  }
  if (!renderBad.length) console.log('PASS 全部 ' + flat.length + ' 节渲染正常');
  else { console.log('FAIL 渲染异常 ' + renderBad.length); renderBad.slice(0, 10).forEach((x) => console.log('   ' + x)); }

  // 截图：术语节 gid0 sec1（idx 0）
  await page.evaluate(() => document.querySelectorAll('.sec-item')[0].click());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOT, '_piano_terms.png') });

  // 对话节 gid1 sec1（idx 4：前面 4 个术语节）
  const dlgIdx = flat.findIndex((f) => f.type === 'dialogue');
  await page.evaluate((i) => document.querySelectorAll('.sec-item')[i].click(), dlgIdx);
  await page.waitForTimeout(200);
  const dlg = await page.evaluate(() => ({
    rows: document.querySelectorAll('#content .turn').length,
    roles: Array.from(document.querySelectorAll('#content .role')).slice(0, 3).map((e) => e.textContent),
  }));
  console.log('对话节渲染 =', JSON.stringify(dlg));
  await page.screenshot({ path: path.join(SHOT, '_piano_dialogue.png') });

  // 连播冒烟：术语节 + 对话节，各播 ~5s，捕获音频错误
  for (const idx of [0, dlgIdx]) {
    await page.evaluate((i) => document.querySelectorAll('.sec-item')[i].click(), idx);
    await page.waitForTimeout(120);
    await page.evaluate(() => { document.getElementById('scopeSel').value = 'sec'; document.getElementById('modeSel').value = 'it-zh'; });
    await page.evaluate(() => document.getElementById('playBtn').click());
    await page.waitForTimeout(5000);
    await page.evaluate(() => document.getElementById('playBtn').click()); // 暂停
    await page.waitForTimeout(200);
  }
  console.log('连播后：audioBad=' + audioBad.length + ' consoleErr=' + consoleErr.length + ' pageErr=' + pageErr.length + ' reqFail=' + reqFail.length);
  audioBad.slice(0, 8).forEach((x) => console.log('  BAD ' + x));
  consoleErr.slice(0, 8).forEach((x) => console.log('  CON ' + x));
  pageErr.slice(0, 8).forEach((x) => console.log('  PGE ' + x));

  await browser.close();
  const ok = !renderBad.length && !audioBad.length && !consoleErr.length && !pageErr.length && !reqFail.length;
  console.log(ok ? 'RESULT: ALL_OK' : 'RESULT: HAS_ISSUES');
})();
