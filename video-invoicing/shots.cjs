// Real NI Today screens for the video (video-motion rule: b-roll is the real thing the line names).
// The app is served by the local stub (scratchpad/guide_stub.mjs on :8789): static files + the Oct 12 to 17 dry run as
// /api/invoices/latest. Any passcode unlocks locally (the stub answers /api/unlock with 200), so a dummy key is planted.
// Run: node shots.cjs   -> public/shots/app_*.png (iPhone 13 viewport at 3x)
const {chromium, devices} = require('C:/Users/JJ/AppData/Roaming/npm/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'public', 'shots');
fs.mkdirSync(OUT, {recursive: true});
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({...devices['iPhone 13'], viewport: {width: 390, height: 844}, colorScheme: 'dark'}); // full phone height, so the screenshot fills the frame
  await ctx.addInitScript(() => {
    localStorage.setItem('nitoday:key', JSON.stringify('local-preview-key'));
    localStorage.setItem('nitoday:theme', JSON.stringify('dark'));
  });
  const page = await ctx.newPage();
  // the dry run as it will look once live: the same rows, mode live, 43 created (the app's own live-mode rendering)
  const fixture = JSON.parse(fs.readFileSync('C:/Users/JJ/AppData/Local/Temp/claude/C--Users-JJ-OneDrive-Documents-Claude-Projects-JJ-Work/26596622-24b2-4bc2-ad07-97a04ebb6f1f/scratchpad/amber1019/latest_fixture.json', 'utf8'));
  fixture.mode = 'live'; fixture.latest.mode = 'live'; fixture.latest.created = 43; fixture.latest.at = '2026-10-26T02:00:00Z';
  await page.route('**/api/invoices/latest*', (route) => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(fixture)}));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 120)); });
  await page.goto('http://localhost:8789/?v=' + Date.now(), {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#invoices .inv-sum', {timeout: 30000});
  await page.waitForTimeout(1200);
  const locked = await page.evaluate(() => !document.getElementById('lock').hidden);
  console.log('locked?', locked, 'title', await page.title());
  // 1. home top
  await page.screenshot({path: path.join(OUT, 'app_home.png')});
  // 2. the Invoices section scrolled to the top of the viewport
  await page.evaluate(() => { const s = document.querySelector('section[aria-labelledby="h-invoices"]'); s.scrollIntoView({block: 'start'}); window.scrollBy(0, -12); });
  await page.waitForTimeout(500);
  await page.screenshot({path: path.join(OUT, 'app_invoices.png')});
  const card = await page.$('section[aria-labelledby="h-invoices"]');
  await card.screenshot({path: path.join(OUT, 'app_invoices_card.png')});
  // 3. the full list opened
  await page.click('[data-invall]');
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.querySelector('section[aria-labelledby="h-invoices"]'); s.scrollIntoView({block: 'start'}); window.scrollBy(0, -12); });
  await page.waitForTimeout(300);
  await page.screenshot({path: path.join(OUT, 'app_invoices_all.png')});
  const txt = await page.evaluate(() => document.querySelector('#invoices').innerText.slice(0, 600));
  console.log(txt);
  await browser.close();
  console.log('done', fs.readdirSync(OUT));
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
