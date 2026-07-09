// harvest-june.mjs — take the from-scratch workflow output ([{date,svg}]),
// clean each SVG (strip preamble, keep <svg>..</svg>), pull its TITLE, and write
// strips/<id>.art.svg + a minimal strips/<id>.json. Replaces the old June set.
// Validation is done separately (python) after this writes candidates.
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRIPS = join(ROOT, 'strips');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node engine/harvest-june.mjs <task-output.json>'); process.exit(1); }

const parsed = JSON.parse(readFileSync(OUT, 'utf8'));
const items = Array.isArray(parsed) ? parsed : parsed.result;

function slug(s) {
  return (s || 'strip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'strip';
}

// wipe the old June strips (json + rendered svg + art)
for (const f of readdirSync(STRIPS)) {
  if (/^2026-06-/.test(f)) unlinkSync(join(STRIPS, f));
}

const written = [];
for (const it of items) {
  const raw = it.svg || '';
  const title = (raw.match(/<!--\s*TITLE:\s*(.*?)\s*-->/) || [])[1] || 'Untitled';
  const a = raw.indexOf('<svg');
  const b = raw.lastIndexOf('</svg>');
  if (a < 0 || b < 0) { console.warn('NO SVG for', it.date); continue; }
  const svg = raw.slice(a, b + 6);
  const id = `${it.date}-${slug(title)}`;
  writeFileSync(join(STRIPS, `${id}.art.svg`), svg);
  writeFileSync(join(STRIPS, `${id}.json`), JSON.stringify({ id, date: it.date, title, era: 'June 2026 — the machines arrive', panels: [] }, null, 2));
  written.push({ id, date: it.date, title });
}
console.log(`wrote ${written.length}:`);
for (const w of written) console.log(`  ${w.date}  ${w.title}  (${w.id})`);
