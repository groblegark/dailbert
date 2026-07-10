// seed-desk.mjs — push the committed repo snapshot into the AWS desk backend.
// The desk is the single source of truth at runtime; this seeds it (first cutover)
// or restores it from a baked snapshot after a disaster.
//   Run: DESK_KEY=... node engine/seed-desk.mjs [--dry-run]
//   (or put the key in engine/aws/.desk-key — gitignored)
// Reads world/{published,chosen,reviews}.json; missing files seed as empty.
// MERGE semantics: remote state wins where it already has data — published/chosen
// are unioned (remote pick kept on conflict), votes/comments only fill gaps.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry-run');

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const desk = readJson(join(ROOT, 'world', 'desk.json'), { api: '' });
if (!desk.api) { console.error('no backend: world/desk.json missing or empty'); process.exit(1); }

const keyFile = join(ROOT, 'engine', 'aws', '.desk-key');
const KEY = process.env.DESK_KEY || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '');
if (!KEY && !dry) { console.error('no desk key: set DESK_KEY or create engine/aws/.desk-key'); process.exit(1); }

const published = readJson(join(ROOT, 'world', 'published.json'), []);
const chosen = readJson(join(ROOT, 'world', 'chosen.json'), {});
const reviews = readJson(join(ROOT, 'world', 'reviews.json'), { votes: {}, comments: {} });

const remote = await fetch(desk.api + '/', { cache: 'no-store' }).then((r) => r.json());
console.log(`remote: ${remote.published.length} published, ${Object.keys(remote.chosen).length} picks, ` +
  `${Object.keys(remote.votes).length} votes, ${Object.keys(remote.comments).length} comment threads`);
console.log(`local:  ${published.length} published, ${Object.keys(chosen).length} picks, ` +
  `${Object.keys(reviews.votes || {}).length} votes, ${Object.keys(reviews.comments || {}).length} comment threads`);

const mergedPub = [...new Set([...remote.published, ...published])].sort();
const mergedChosen = { ...chosen, ...remote.chosen };

const post = async (body) => {
  if (dry) { console.log('[dry-run] POST', JSON.stringify(body).slice(0, 120)); return true; }
  const r = await fetch(desk.api + '/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-desk-key': KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${body.op} -> ${r.status} ${await r.text()}`);
  return true;
};

await post({ op: 'published', ids: mergedPub });
await post({ op: 'chosen', map: mergedChosen });
let nv = 0;
for (const [id, v] of Object.entries(reviews.votes || {})) {
  if (id in remote.votes) continue;
  await post({ op: 'vote', id, v }); nv++;
}
let nc = 0;
for (const [id, list] of Object.entries(reviews.comments || {})) {
  if (id in remote.comments) continue;
  for (const c of list) { await post({ op: 'comment', id, name: c.name, text: c.text, ts: c.ts }); nc++; }
}
console.log(`${dry ? '[dry-run] would seed' : 'seeded'}: ${mergedPub.length} published, ` +
  `${Object.keys(mergedChosen).length} picks, +${nv} votes, +${nc} comments`);
if (!dry) {
  const after = await fetch(desk.api + '/', { cache: 'no-store' }).then((r) => r.json());
  console.log(`verify: remote now has ${after.published.length} published, ${Object.keys(after.chosen).length} picks`);
}
