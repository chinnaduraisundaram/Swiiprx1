// Layout smoke test. Needs `npm i --no-save playwright-core` and a Chromium-based browser.
// Usage: node scripts/smoke.mjs <chrome|msedge|path-to-exe> [baseUrl] [screenshotDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [browserArg = 'msedge', base = 'http://localhost:5173', outDir] = process.argv.slice(2);
const exe = { chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', msedge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' }[browserArg] ?? browserArg;
const pages = ['', 'card-transactions.html', 'card-balance.html', 'token-utils.html', 'csv-viewer.html', 'jwt-decoder.html', 'checklist.html', 'runbook.html'];
if (outDir) mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: exe });
let failures = 0;
const fail = (m) => { failures++; console.error('FAIL', m); };

for (const [width, collapsedState] of [[1280, null], [1280, 'collapsed'], [390, null]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  if (collapsedState) await ctx.addInitScript((s) => localStorage.setItem('swiipr.sidebar', s), collapsedState);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const p of pages) {
    const tag = `${p || 'home'}@${width}${collapsedState ? '/' + collapsedState : ''}`;
    await page.goto(`${base}/${p}`);
    await page.waitForSelector('.topbar', { timeout: 5000 }).catch(() => fail(`${tag}: shell not built`));
    const box = async (sel) => page.locator(sel).first().boundingBox();
    const top = await box('.topbar');
    const side = await box('.sidebar');
    const content = await box('.content');
    if (!top || top.width < width * 0.5 || top.height < 30) fail(`${tag}: top bar missing/collapsed`);
    if (width >= 992 && (!side || side.width < (collapsedState ? 50 : 200))) fail(`${tag}: sidebar width ${side?.width}`);
    if (width < 860 && side && side.x + side.width > 0) fail(`${tag}: drawer should be off-canvas`);
    if (!content || content.x < 16 && width >= 992 && !side) fail(`${tag}: content has no offset`);
    if (content && width >= 992 && side && content.x < side.width) fail(`${tag}: content overlaps sidebar`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 0) fail(`${tag}: horizontal overflow ${overflow}px`);
    if (!collapsedState && outDir) await page.screenshot({ path: `${outDir}/${p.replace('.html', '') || 'home'}-${width}.png` });
  }
  if (errors.length) fail(`page errors @${width}: ${errors.join('; ')}`);
  await ctx.close();
}
// Session countdown must survive a reload and navigation to another page (absolute window in sessionStorage).
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const secs = async () => {
    await page.waitForSelector('#sessionClock:not([hidden])', { timeout: 5000 });
    const [m, s] = (await page.textContent('#sessionClock')).replace('Session ', '').split(':').map(Number);
    return m * 60 + s;
  };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = `${b64({ alg: 'none' })}.${b64({ name: 'Smoke Test', exp: Math.floor(Date.now() / 1000) + 7200 })}.sig`;
  await page.goto(`${base}/card-transactions.html`);
  await page.fill('#jwt', jwt);
  const first = await secs();
  await page.waitForTimeout(3000);
  await page.reload();
  const afterReload = await secs();
  if (afterReload > first - 2 || afterReload < first - 8) fail(`countdown reset/jumped on reload: ${first} -> ${afterReload}`);
  await page.goto(`${base}/runbook.html`);
  const afterNav = await secs();
  if (afterNav > afterReload || afterNav < afterReload - 8) fail(`countdown reset/jumped on navigation: ${afterReload} -> ${afterNav}`);
  if (first < 3500 || first > 3600) fail(`unexpected initial window ${first}s`);
  if ((await page.textContent('#userName')) !== 'Smoke Test') fail('display name not kept across pages');
  await page.goto(`${base}/card-transactions.html`);
  await page.waitForSelector('#jwt');
  if ((await page.inputValue('#jwt')) !== jwt) fail('pasted JWT not restored after navigation');
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} failure(s)` : 'smoke OK');
process.exit(failures ? 1 : 0);
