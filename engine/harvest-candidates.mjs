// harvest-candidates.mjs — take a continuity-batch workflow result (JSON array of
// {date, variant, svg}) and write each as a NEW candidate strip. NON-DESTRUCTIVE:
// never deletes or overwrites existing strips; multiple candidates per date coexist
// (distinct ids), and the desk picker lets Matt choose the keeper per day.
// Usage: node engine/harvest-candidates.mjs <result.json>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const inPath = process.argv[2];
if (!inPath || !existsSync(inPath)) { console.error('need a result JSON path'); process.exit(1); }

let raw = JSON.parse(readFileSync(inPath, 'utf8'));
// accept either the array, or { result: [...] }, or workflow-journal shapes
const items = Array.isArray(raw) ? raw : (raw.result || raw.output || []);

const kebab = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'untitled';
const eraOf = (date) => {
  const y = date.slice(0, 4);
  return `${y} — the office adjusts`;
};

let wrote = 0, skipped = 0;
for (const it of items) {
  if (!it || !it.svg || !it.date) { skipped++; continue; }
  const m = String(it.svg).match(/<svg[\s\S]*<\/svg>/);
  if (!m) { skipped++; continue; }
  const svg = m[0];
  const tm = String(it.svg).match(/<!--\s*TITLE:\s*(.+?)\s*-->/i);
  const title = (tm ? tm[1] : '').trim() || 'Untitled';
  let id = `${it.date}-${kebab(title)}`;
  // guarantee uniqueness against existing strips AND other candidates in this run
  if (existsSync(join(ROOT, 'strips', `${id}.json`))) {
    let n = it.variant || 2;
    while (existsSync(join(ROOT, 'strips', `${id}-v${n}.json`))) n++;
    id = `${id}-v${n}`;
  }
  writeFileSync(join(ROOT, 'strips', `${id}.art.svg`), svg);
  writeFileSync(join(ROOT, 'strips', `${id}.json`), JSON.stringify({
    id, date: it.date, title, era: eraOf(it.date), panels: [],
  }, null, 2));
  wrote++;
}
console.log(`harvested ${wrote} candidate strips (${skipped} skipped) from ${items.length} results`);
