// scripts/report-stub-and-missing.js
import { readFileSync, writeFileSync } from 'fs';
import path                            from 'path';
import fetch                           from 'node-fetch';
import { fileURLToPath }              from 'url';

// ─── shim __dirname ───────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── config & data load ────────────────────────────────────────────────────────
const API_KEY     = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  console.error('❌  Missing CONGRESS_API_KEY in env');
  process.exit(1);
}

const specsPath   = path.resolve(__dirname, '../generated-specs.json');
const specs       = JSON.parse(readFileSync(specsPath, 'utf8'));
const bioguideIds = Object.keys(specs);

// ─── helper: fetch a member’s terms ─────────────────────────────────────────────
async function fetchTerms(bioguideId) {
  const url = new URL(`https://api.congress.gov/v3/member/${bioguideId}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('format',  'json');

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠️ Congress.gov API returned ${res.status} for ${bioguideId}`);
    return [];
  }
  const json = await res.json();
  return json.member?.terms ?? [];
}

// ─── main reporting ────────────────────────────────────────────────────────────
const notIn119 = [];
const stubIn119 = [];

for (const id of bioguideIds) {
  const doc    = specs[id];
  const steps  = doc.contact_form?.steps ?? [];
  const isStub = steps.some(s => s.visit === 'stubforcwc');

  const terms  = await fetchTerms(id);
  const in119  = terms.some(t => t.congress === 119);

  if (!in119) {
    notIn119.push(id);
  } else if (isStub) {
    stubIn119.push(id);
  }
}

// ─── write out the report ───────────────────────────────────────────────────────
const report = {
  generatedAt: new Date().toISOString(),
  totalSpecs:  bioguideIds.length,
  notIn119,
  stubIn119
};

const outPath = path.resolve(__dirname, '../stub-and-missing-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`✅ Report saved to stub-and-missing-report.json`);
console.log(` • ${notIn119.length} specs NOT in 119th Congress`);
console.log(` • ${stubIn119.length} stubs   IN 119th Congress`);
