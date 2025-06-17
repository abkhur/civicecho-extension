// scripts/build-specs.js
import fs    from 'fs';
import path  from 'path';
import yaml  from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const inDir      = path.resolve(__dirname, '../specs/contact-congress/members');
const specsOut   = path.resolve(__dirname, '../generated-specs.json');
const hostMapOut = path.resolve(__dirname, '../host-map.json');

const specs   = {};
const hostMap = {};
let skipped   = 0;

fs.readdirSync(inDir).forEach(file => {
  if (!file.match(/\.(ya?ml)$/)) return;

  const ext  = path.extname(file);
  const slug = path.basename(file, ext);
  const text = fs.readFileSync(path.join(inDir, file), 'utf8');

  try {
    const doc = yaml.load(text);
    specs[slug] = doc;

    // extract the first visit host
    const visitStep = doc.contact_form?.steps?.find(s => s.visit);
    if (visitStep) {
      const host = new URL(visitStep.visit).host;
      hostMap[host] = slug;
    }
  } catch (err) {
    console.warn(`✂️ Skipping ${file}: ${err.message.split('\n')[0]}`);
    skipped++;
  }
});

fs.writeFileSync(specsOut,   JSON.stringify(specs,   null, 2));
fs.writeFileSync(hostMapOut, JSON.stringify(hostMap, null, 2));
console.log(`→ Wrote ${Object.keys(specs).length} specs (skipped ${skipped})`);
console.log(`→ Wrote host-map with ${Object.keys(hostMap).length} entries`);
