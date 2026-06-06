#!/usr/bin/env node
// brave_web_e2e.cjs — full web-interface e2e in Brave (Playwright) against a LOCAL stack:
// browse home -> listing detail (schema.org JSON-LD) -> host login page -> validate-by-mail
// in the webmail (mailcatcher.py) -> confirm newly-published flats appear on the home page.
//
// Prereqs (local stack): backend (:4000) with SMTP pointed at mailcatcher, mailcatcher
// (:1025/:1080), frontend (:3000), and some PENDING flats already created with their
// validation emails captured (e.g. via host_journey.py SKIP_ADMIN=1).
//
// Usage:
//   node rental-platform/scripts/brave_web_e2e.cjs
//   WWW=http://127.0.0.1:3000 MAIL=http://127.0.0.1:1080 node .../brave_web_e2e.cjs
const path = require('path');
const fs = require('fs');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'))); }

const WWW = (process.env.WWW || 'http://127.0.0.1:3000').replace(/\/$/, '');
const MAIL = (process.env.MAIL || 'http://127.0.0.1:1080').replace(/\/$/, '');
const BRAVE_CANDIDATES = ['/usr/bin/brave-browser', '/opt/brave.com/brave/brave', '/usr/bin/brave-browser-stable'];
const bravePath = BRAVE_CANDIDATES.find(p => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({
    ...(bravePath ? { executablePath: bravePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  console.log(`${bravePath ? 'Brave' : 'Chromium'} ${browser.version()} via Playwright — LOCAL web interface\n`);
  const page = await browser.newPage();
  let pass = 0, fail = 0;
  const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); c ? pass++ : fail++; };
  const listingLinks = () => page.$$eval('a[href*="/apartment?id="]', as => [...new Set(as.map(a => a.getAttribute('href')))]);

  console.log('== Home ==');
  let r = await page.goto(WWW + '/', { waitUntil: 'networkidle', timeout: 60000 });
  ok(r.status() === 200, `home GET ${r.status()}`);
  const before = await listingLinks();
  ok(true, `home shows ${before.length} listing link(s)`);

  console.log('\n== Listing detail ==');
  if (before.length) {
    await page.goto(WWW + before[0], { waitUntil: 'networkidle', timeout: 60000 });
    const ld = await page.locator('script[type="application/ld+json"]').count();
    ok(ld > 0, `listing renders schema.org JSON-LD (${ld})`);
  } else {
    console.log('  (no listings yet — skipping detail)');
  }

  console.log('\n== Host login page ==');
  r = await page.goto(WWW + '/magic-request', { waitUntil: 'networkidle', timeout: 60000 });
  ok(r.status() === 200, `/magic-request GET ${r.status()}`);
  ok((await page.locator('input').count()) > 0, 'login form has input(s)');

  console.log('\n== Webmail / validate-by-mail ==');
  await page.goto(MAIL + '/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('.msg', { timeout: 10000 }).catch(() => {});
  ok((await page.locator('.msg').count()) > 0, `webmail renders ${await page.locator('.msg').count()} email(s)`);
  const vlinks = await page.$$eval('a', as => [...new Set(as.map(a => a.href).filter(h => h.includes('/flats/validate') && h.includes('token=')))]);
  ok(vlinks.length > 0, `found ${vlinks.length} validation link(s)`);
  let published = 0;
  for (const h of vlinks) {
    const vr = await page.goto(h, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (vr.status() === 200 && /Published|already/i.test(await page.locator('body').innerText())) published++;
  }
  ok(published === vlinks.length && published > 0, `clicked links -> ${published}/${vlinks.length} published`);

  console.log('\n== Home after validation ==');
  await page.goto(WWW + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const after = await listingLinks();
  ok(after.length >= before.length + published, `home now shows ${after.length} listing(s) (was ${before.length}, +${published})`);

  await browser.close();
  console.log(`\nRESULT: ${fail === 0 ? '✅ PASS' : '⚠️  ' + fail + ' failed'} (${pass} passed)`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(2); });
