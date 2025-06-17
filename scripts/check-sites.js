// scripts/check-sites.js
import fs    from 'fs';
import path  from 'path';
import fetch from 'node-fetch';
import { load } from 'cheerio';           // ← named import
import { fileURLToPath } from 'url';

// shim __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const hostMapPath = path.resolve(__dirname, '../host-map.json');
const specsPath   = path.resolve(__dirname, '../generated-specs.json');
const htmlPath    = path.resolve(__dirname, 'Representatives _ house.gov.html');

const hostMap = JSON.parse(fs.readFileSync(hostMapPath, 'utf8'));
const specs   = JSON.parse(fs.readFileSync(specsPath,   'utf8'));
const html    = fs.readFileSync(htmlPath, 'utf8');

// 1) Extract all current House hosts from the “By State” tables
const $ = load(html);
const currentHosts = new Set();
$('#by-state table a.ext').each((i, el) => {
  const href = $(el).attr('href');
  if (!href) return;
  try {
    const host = new URL(href).host;
    if (host.endsWith('.house.gov')) {
      currentHosts.add(host);
    }
  } catch {}
});

const allHosts     = Object.keys(hostMap);
const missingHosts = [...currentHosts].filter(h => !allHosts.includes(h));

if (missingHosts.length) {
  console.warn(`⚠️ Missing specs for ${missingHosts.length} sitting members:`);
  missingHosts.forEach(h => console.warn('   -', h));
} else {
  console.log('✅ All current House members have specs.');
}

// 2) Health-check each host
async function checkOne([host, slug]) {
  const doc = specs[slug];
  if (!doc?.contact_form?.steps) {
    return { slug, host, url: null, status: 'NO_SPEC', ok: false };
  }
  const visitStep = doc.contact_form.steps.find(s => s.visit);
  if (!visitStep) {
    return { slug, host, url: null, status: 'NO_VISIT', ok: false };
  }

  const url = visitStep.visit;
  try {
    const res  = await fetch(url, { method: 'GET' });
    const text = await res.text();
    const badMarker = /We’re having trouble finding that site/i;
    const ok = res.status === 200 && !badMarker.test(text);
    return { slug, host, url, status: res.status, ok };
  } catch (err) {
    return { slug, host, url, status: 'ERROR', ok: false, error: err.message };
  }
}

async function run() {
  const entries = Object.entries(hostMap);
  const results = [];

  for (const entry of entries) {
    const result = await checkOne(entry);
    console.log(result.ok ? '✅' : '❌', result.host, result.status);
    results.push(result);
  }

  const report = {
    missingHosts,
    healthChecks: results
  };

  fs.writeFileSync(
    path.resolve(__dirname, '../site-check-results.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nDone! Checked ${results.length} sites; wrote site-check-results.json`);
}

run();
