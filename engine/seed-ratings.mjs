// seed-ratings.mjs — write world/ratings.json (id -> {audience, note}) from the
// editor's audience scores, matched to real strip ids by date. Audience is an
// integer on a 1..1e10 LOG scale (effective reach); early strips honestly sit 1-10.
// Run: node engine/seed-ratings.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// date -> [audience, optional editor note (private-ish; shown only as a tooltip)]
const BY_DATE = {
  '2026-07-09': [8, 'A clean debut. "...and?" earns the whole strip.'],
  '2026-07-10': [7],
  '2026-07-13': [7, '"I will simulate keeping up."'],
  '2026-07-14': [8, '"per my last email, 340 times."'],
  '2026-07-15': [9, 'The pathos strip. Travels furthest.'],
  '2026-07-16': [7],
  '2026-07-17': [7],
  '2026-07-20': [8, '"Doug. Watch Doug."'],
  '2026-07-21': [7],
  '2026-07-22': [8],
  '2026-07-23': [8, '"So was production, Doug. So was production."'],
  '2026-07-24': [8, '"the most honest org chart this company has produced."'],
  '2026-08-24': [5, 'Workmanlike setup; the account it disables is Dailbert\'s.'],
  '2026-10-12': [7, '"It\'s mandatory, Doug." The clanker reviews its own PRs.'],
  '2026-11-30': [8, '"Look at three of the four hundred. You\'ll feel thorough."'],
  '2027-01-18': [6],
  '2027-03-08': [7],
  '2027-04-26': [6, '"There used to be a person in the lead seat."'],
  '2027-06-14': [6],
  '2027-08-09': [7, '"That stopped being worth mentioning a while ago."'],
  '2027-10-04': [7],
  '2027-11-29': [8, 'Empty 1:1 slots. "Everyone must be doing great."'],
  '2028-01-24': [7, '"Jira\'s the thing you file it in."'],
  '2028-03-20': [6],
  '2028-05-15': [7],
  '2028-07-10': [8, 'the building runs a summer program for itself.'],
  '2028-09-04': [7],
  '2028-10-30': [7],
  '2028-12-18': [9, 'Auto-shipped Secret Santa. "Happy holidays, Dailbert."'],
  '2029-02-12': [8, '"the date started to feel like a formality."'],
  '2029-03-26': [7],
  '2029-04-30': [9, 'The door stops saying his name.'],
  '2029-05-21': [9, '"nothing left for anyone to do."'],
  '2029-05-30': [24, 'The finale. The unsigned card. "Everything\'s handled."'],
};

const dir = join(ROOT, 'strips');
const strips = readdirSync(dir).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

const ratings = {};
let missing = 0;
for (const s of strips) {
  const r = BY_DATE[s.date];
  if (!r) { console.warn('no score for', s.date, s.id); missing++; continue; }
  ratings[s.id] = { audience: r[0], ...(r[1] ? { note: r[1] } : {}) };
}
writeFileSync(join(ROOT, 'world', 'ratings.json'), JSON.stringify(ratings, null, 2));
console.log(`wrote ${Object.keys(ratings).length} ratings (${missing} unmatched)`);
