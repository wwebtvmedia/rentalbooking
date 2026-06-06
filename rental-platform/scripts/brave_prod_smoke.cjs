#!/usr/bin/env node
// brave_prod_smoke.cjs — render the production site in Brave (Playwright) and smoke-test
// the guest-facing web pages, discovery files, and (if any) a listing's schema.org JSON-LD.
//
// Usage:
//   node rental-platform/scripts/brave_prod_smoke.cjs
//   WWW=https://www.bestflats.vip API=https://api.bestflats.vip node .../brave_prod_smoke.cjs
//
// Needs Playwright (resolved from the frontend's node_modules) and, ideally, Brave installed.
// Falls back to Playwright's bundled Chromium if Brave isn't found.
const path = require('path');
const fs = require('fs');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'))); }

const WWW = (process.env.WWW || 'https://www.bestflats.vip').replace(/\/$/, '');
const API = (process.env.API || 'https://api.bestflats.vip').replace(/\/$/, '');
const BRAVE_CANDIDATES = ['/usr/bin/brave-browser', '/opt/brave.com/brave/brave', '/usr/bin/brave-browser-stable'];
const bravePath = BRAVE_CANDIDATES.find(p => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({
    ...(bravePath ? { executablePath: bravePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  console.log(`${bravePath ? 'Brave' : 'Chromium'} ${browser.version()} via Playwright — PRODUCTION ${WWW}\n`);
  const page = await browser.newPage();
  let pass = 0, fail = 0, warn = 0;
  const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); c ? pass++ : fail++; };

  console.log('== Core + static pages ==');
  for (const p of ['/', '/collections', '/owners', '/story', '/help', '/safety', '/terms']) {
    try {
      const r = await page.goto(WWW + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      ok(r.status() === 200, `${p} -> ${r.status()}  «${(await page.title()).slice(0, 42)}»`);
    } catch (e) { ok(false, `${p} -> ERROR ${e.message.slice(0, 40)}`); }
  }

  console.log('\n== Discovery / LLM files ==');
  for (const p of ['/robots.txt', '/llms.txt', '/.well-known/ucp.json', '/sitemap.xml']) {
    try { const r = await page.goto(WWW + p, { waitUntil: 'domcontentloaded', timeout: 20000 }); ok(r.status() === 200, `${p} -> ${r.status()}`); }
    catch (e) { ok(false, `${p} -> ERROR`); }
  }

  console.log('\n== Listings ==');
  let flats = [];
  try { flats = await (await fetch(`${API}/apartments`)).json(); } catch {}
  console.log(`     API reports ${flats.length} published flat(s)`);
  if (!flats.length) {
    console.log('     ⚠️  DB empty — re-seed/restore to verify the listing + JSON-LD flow.');
    warn++;
  } else {
    await page.goto(`${WWW}/apartment?id=${flats[0]._id}`, { waitUntil: 'networkidle', timeout: 30000 });
    const ld = await page.locator('script[type="application/ld+json"]').count();
    ok(ld > 0, `listing renders schema.org JSON-LD (${ld})`);
  }

  await browser.close();
  console.log(`\nRESULT: ${fail === 0 ? '✅ PASS' : '⚠️  ' + fail + ' failed'} (${pass} passed${warn ? ', ' + warn + ' warning' : ''})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(2); });
