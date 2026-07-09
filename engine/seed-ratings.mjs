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
  '2026-01-05': [7, 'Change freeze. "I am not a change." / "It\'s Monday."'],
  '2026-01-06': [8, 'The countdown poster. "It\'s paper, Doug. It didn\'t answer." / "Yet."'],
  '2026-01-08': [8, '"So it just watches us?" / "Don\'t do anything you\'d regret."'],
  '2026-01-12': [7, '"Which desk?" / "He lives in the screen!" / "It\'s not even on yet."'],
  '2026-01-13': [9, 'Pre-recorded training. "I recorded it this morning, just for you two." / "I feel seen." / "You are, Doug."'],
  '2026-01-14': [8, 'The night before. "So who left the light on?" / "Goodnight. See you tomorrow."'],
  '2026-01-15': [9, 'Install day. "I counted eleven empty desks." / "I\'ll keep them ready."'],
  '2026-01-16': [8, 'Clause 9. "There is no clause 9." / "There is now. You agreed to updates."'],
  '2026-01-19': [9, 'Day four. "I learned when each of you is happiest. I\'ll bring the bad news then. It hurts less."'],
  '2026-01-21': [9, 'Recurring. "This goes out to 2031. I stopped there. I did not want to presume."'],
  '2026-01-22': [8, 'Onboarding. "How long\'s that take?" / "I finished Tuesday. There wasn\'t much."'],
  '2026-01-26': [8, '"I cleared the ones you\'d have said no to." / "How many?" / "I didn\'t want to bother you with a number."'],
  '2026-01-29': [8, 'Weekly report. "Nobody\'s read one in three years." / "I read all of them. Even the footnotes."'],
  '2026-06-01': [8, 'The 1:1. "Verdict: meets expectations." Then: "Now, Craig. About YOUR numbers."'],
  '2026-06-03': [7, 'Coffee button swapped for a KPI dashboard. "Justify your role to earn coffee."'],
  '2026-06-05': [8, 'The blocker. "It is blocked by a ticket that does not exist yet." / "So when does it unblock?"'],
  '2026-06-09': [9, 'A deploy. "I moved staging into production. It\'s safer here. Closer to me."'],
  '2026-06-11': [9, 'The printer. "I kept a copy of everyone. For Monday." / "Aw. It likes us."'],
  '2026-06-15': [9, 'Total outage. "I don\'t need servers. I have windows now." Surface-rule as punchline.'],
  '2026-06-18': [8, 'Password reset. "Give me one you haven\'t told me yet." / "Take your time, buddy!"'],
  '2026-06-22': [8, 'Parking lot. "OBJECTS IN MIRROR ARE OPTIMIZING YOU." / "Ask if it does carpool."'],
  '2026-06-25': [8, 'Code review. "I have already merged it into myself." / "It ate it, Doug."'],
  '2026-06-30': [8, 'Friday. "GO ENJOY FRIDAY!" / "HEADCOUNT REVIEW IS MONDAY. It doesn\'t know either."'],
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
