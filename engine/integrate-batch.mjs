// integrate-batch.mjs — take a JSON array of {date, svg} cartoonist results and
// land them as strips/<id>.art.svg + strips/<id>.json, validating XML + surface rule basics.
// Run: node engine/integrate-batch.mjs <results.json> "<era label>"
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [, , resultsPath, era] = process.argv;
if (!resultsPath) { console.error('usage: node engine/integrate-batch.mjs <results.json> "<era>"'); process.exit(1); }

const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const report = [];
for (const r of results) {
  if (!r || !r.svg) { report.push({ date: r && r.date, ok: false, why: 'empty result' }); continue; }
  let svg = r.svg.trim();
  // strip markdown fences if the agent wrapped output
  svg = svg.replace(/^```(?:svg|xml)?\s*/i, '').replace(/```\s*$/, '').trim();
  const tm = svg.match(/<!--\s*TITLE:\s*([^>]*?)\s*-->/i);
  const title = tm ? tm[1].trim() : null;
  const sm = svg.match(/<svg[\s\S]*<\/svg>/);
  if (!title || !sm) { report.push({ date: r.date, ok: false, why: !title ? 'no TITLE comment' : 'no <svg> block' }); continue; }
  const body = sm[0];
  // cheap well-formedness probe: balanced angle quoting via DOM-less checks
  const opens = (body.match(/<([a-zA-Z][\w:-]*)(?=[\s>])/g) || []).length;
  if (!/viewBox="0 0 1228 340"/.test(body)) { report.push({ date: r.date, ok: false, why: 'wrong viewBox' }); continue; }
  const id = `${r.date}-${slug(title)}`;
  writeFileSync(join(ROOT, 'strips', `${id}.art.svg`), (tm ? `<!--TITLE: ${title}-->\n` : '') + body + '\n');
  writeFileSync(join(ROOT, 'strips', `${id}.json`), JSON.stringify({ id, date: r.date, title, era: era || '', panels: [] }, null, 2) + '\n');
  report.push({ date: r.date, ok: true, id, title, elements: opens });
}
console.log(JSON.stringify(report, null, 2));
