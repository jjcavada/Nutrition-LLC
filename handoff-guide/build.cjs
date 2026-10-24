// Builds the Amber handoff guide v2: guide.src.html (+ the website logo) -> Amber_Handoff_Guide_v2.html and .pdf (4.5 x 8 in pages,
// phone-friendly, page numbers in the footer). Run from this folder: node build.cjs
const fs = require('fs'); const path = require('path');
const { chromium } = require('C:/Users/JJ/AppData/Roaming/npm/node_modules/playwright');
const ROOT = path.join(__dirname, '..');
const logo = fs.readFileSync(path.join(ROOT, 'website/dist/assets/img/logo.webp')).toString('base64');
const html = fs.readFileSync(path.join(__dirname, 'guide.src.html'), 'utf8').replace(/\{\{LOGO\}\}/g, logo);
for (const ch of ['\u2014', '\u2013']) if (html.includes(ch)) { console.log('em/en dash found, fix the copy'); process.exit(1); }
const outHtml = path.join(__dirname, 'Amber_Handoff_Guide_v2.html');
fs.writeFileSync(outHtml, html);
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto('file:///' + outHtml.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight));
  console.log('fonts loaded:', [...new Set(fonts)].join(', ') || 'NONE');
  await page.pdf({ path: path.join(__dirname, 'Amber_Handoff_Guide_v2.pdf'), width: '4.5in', height: '8in', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font:8px Helvetica,Arial,sans-serif;color:#6B7363;padding:0 0.4in;display:flex;justify-content:space-between"><span>Nutrition Intuition handoff guide, v2</span><span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>' });
  await browser.close(); console.log('built Amber_Handoff_Guide_v2.html + .pdf');
})();
