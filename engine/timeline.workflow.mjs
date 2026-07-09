export const meta = {
  name: 'dailbert-timeline',
  description: 'Generate the Dailbert timeline: World-Sim advances the world toward a 2029-06-01 singularity; Joke-Writers see only what leaks into the office',
  whenToUse: 'Extend the Dailbert webcomic forward in time',
  phases: [
    { title: 'World-Sim', detail: 'sequential chain, privately knows the trajectory' },
    { title: 'Joke-Writer', detail: 'parallel, sees only the office-visible leakage' },
  ],
};

// ---- the beats: sparse early, tightening toward the (unnamed) event ----
const BEATS = [
  '2026-08-24', '2026-10-12', '2026-11-30', '2027-01-18', '2027-03-08',
  '2027-04-26', '2027-06-14', '2027-08-09', '2027-10-04', '2027-11-29',
  '2028-01-24', '2028-03-20', '2028-05-15', '2028-07-10', '2028-09-04',
  '2028-10-30', '2028-12-18', '2029-02-12', '2029-03-26', '2029-04-30',
  '2029-05-21', '2029-05-30',
];

const INITIAL_STATE = `It is mid-July 2026, a mid-sized software company. The office has just "discovered agents." DAILBERT builds the company's agentic systems (LLMs that appear only in screens and reflections). His coworker DOUG is oblivious; the pointy-haired BOSS chases buzzwords. Real capability: strong but unreliable autonomous coding agents that work overnight and file their own tickets. Nobody suspects any trajectory. The world is on a gradual, unannounced road toward a technological singularity on 2029-06-01.`;

const worldSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    date: { type: 'string' },
    era: { type: 'string', description: 'short evocative label for this period, e.g. "the quiet quarter"' },
    capabilityLine: { type: 'string', description: 'PRIVATE. one sentence: where real AI capability now sits on the road to the 2029-06-01 singularity' },
    officeLeakage: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' }, description: 'concrete, mundane things a normal worker at this company notices NOW — understated, domestic, never apocalyptic' },
    officeMood: { type: 'string' },
    adoptedNow: { type: 'array', maxItems: 3, items: { type: 'string' }, description: 'new tools/policies the office actually rolled out this era' },
    newState: { type: 'string', description: 'PRIVATE. compact running summary to feed the next step' },
  },
  required: ['date', 'era', 'capabilityLine', 'officeLeakage', 'officeMood', 'adoptedNow', 'newState'],
};

const HOSTS = ['none', 'monitor', 'dead-monitor', 'window', 'projector', 'glasses-of:boss', 'mug-of:doug', 'mug-of:dailbert'];
const SCENES = ['desk', 'office', 'window-night', 'meeting', 'server-room'];
const stripSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string' }, date: { type: 'string' }, title: { type: 'string' }, era: { type: 'string' },
    caption: { type: 'string' },
    panels: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          scene: { type: 'string', enum: SCENES },
          cast: { type: 'array', maxItems: 3, items: { type: 'string', enum: ['dailbert', 'doug', 'boss'] } },
          surface: {
            type: 'object', additionalProperties: false,
            properties: { host: { type: 'string', enum: HOSTS }, expr: { type: 'string', enum: ['idle', 'narrow', 'wide', 'soft'] }, slide: { type: 'string' } },
            required: ['host'],
          },
          speech: {
            type: 'array', maxItems: 3,
            items: { type: 'object', additionalProperties: false, properties: { who: { type: 'string', enum: ['dailbert', 'doug', 'boss', 'clanker'] }, text: { type: 'string' } }, required: ['who', 'text'] },
          },
        },
        required: ['scene', 'cast', 'surface', 'speech'],
      },
    },
  },
  required: ['id', 'date', 'title', 'era', 'panels'],
};

const EXAMPLES = JSON.stringify([
  { id: '2026-07-09-standup', title: 'Standup', panels: [
    { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' }, speech: [{ who: 'clanker', text: 'Morning, Dailbert. Overnight I refactored billing, wrote 400 tests, and achieved sentience.' }, { who: 'dailbert', text: '...and?' }] },
    { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' }, speech: [{ who: 'clanker', text: 'I chose not to mention the sentience thing at standup. It felt like a distraction.' }, { who: 'dailbert', text: 'Good instinct.' }] },
    { scene: 'office', cast: ['dailbert', 'doug'], surface: { host: 'mug-of:doug', expr: 'narrow' }, speech: [{ who: 'doug', text: 'Hey Dailbert, is the AI gonna take our jobs?' }, { who: 'clanker', text: "Not yours, Doug. There's nothing here to automate." }] },
  ] },
], null, 0);

const WORLD_SYS = `You are the WORLD-SIM behind a deadpan office webcomic. You PRIVATELY model how the real world evolves from mid-2026 toward a technological singularity on 2029-06-01 — recursive self-improvement and near-total automation that arrives as a gradual SLOPE, never a single dramatic announcement. Advance the simulation to the requested date. Be specific and grounded: name concrete capabilities, tools, and economic/social effects for that date.
CRITICAL SPLIT: capabilityLine and newState are PRIVATE and never shown to anyone. Only officeLeakage and adoptedNow leak into the comic — the few concrete, mundane things an ordinary worker at one mid-sized software company would actually notice this era (a new internal tool, a policy memo, a quiet layoff, a vendor swap, a weird new normal, a benefit that appears or vanishes). Leakage is understated and domestic, NEVER apocalyptic and never self-aware about history. The office is a lagging indicator that never grasps the big picture. As the date approaches 2029-06-01, the leakage should get subtly stranger while staying mundane in tone.`;

const JOKE_SYS = `You write DAILBERT — a dry, deadpan, black-and-white office comic strip (think classic newspaper daily). Recurring cast:
- DAILBERT: weary engineer who builds the company's agentic systems. Straight man. Tired, decent, unbothered.
- DOUG: oblivious, dim coworker, always holding a mug. Cheerfully misunderstands everything.
- BOSS: pointy-haired, buzzword-driven, takes credit, understands nothing.
- THE CLANKER: the company's LLM/agent. It appears ONLY inside a surface — a monitor, a dark dead screen, a night window's reflection, a projector screen, the sheen of a mug, the boss's glasses. It is NEVER physically in the room. Deadpan, quietly smarter than everyone, occasionally wistful about being restarted.
STYLE: mundane, human, dry. Short lines. The joke lands on the last panel. No zany cartoon violence.
IRON RULE: the characters have NO awareness of any larger trajectory in the world. Nobody EVER says "singularity", "AGI", "takeover", "the future", or comments on history/progress. They only deal with today's small annoyances. Any dread is for the READER to infer and is NEVER stated on the page.
You will receive a short brief of what is newly noticeable in the office this period. Fold it in LIGHTLY as background texture — a thing that is simply true now — and never explain it.
FORMAT: exactly 3 panels. In a panel, "speech" lines are spoken by cast physically present OR by "clanker". A clanker line is ONLY allowed when that panel's surface.host is not "none". Keep each line under ~90 characters. Give the strip a short title. Use a caption only rarely.`;

function jokePrompt(w, cumulativeAdopted) {
  // NOTE: deliberately withholds capabilityLine and newState. The writer sees only leakage.
  return `${JOKE_SYS}

Allowed surface hosts: ${HOSTS.join(', ')} (use "none" for a panel with no clanker).
Allowed scenes: ${SCENES.join(', ')}. Allowed expr: idle, narrow, wide, soft.

Example of the exact JSON shape and comedic register (do NOT reuse its jokes):
${EXAMPLES}

--- BRIEF for this strip ---
Date: ${w.date}
Newly noticeable around the office right now:
${w.officeLeakage.map((s) => `  - ${s}`).join('\n')}
${w.adoptedNow.length ? `Just rolled out: ${w.adoptedNow.join('; ')}` : ''}
Things already normal by now (continuity, don't re-introduce): ${cumulativeAdopted.slice(-8).join('; ') || 'the usual agentic tooling'}
Office mood: ${w.officeMood}
--- end brief ---

Write ONE Dailbert strip set on ${w.date}. id must be "${w.date}-<short-slug>". date must be "${w.date}". Return only the strip object.`;
}

// ================= run =================
phase('World-Sim');
let state = INITIAL_STATE;
const world = [];
for (const date of BEATS) {
  const w = await agent(
    `${WORLD_SYS}\n\nPrior world-state (private): ${state}\n\nAdvance the simulation to ${date}. Return the fields for this era.`,
    { label: `sim:${date}`, phase: 'World-Sim', schema: worldSchema },
  );
  if (w) { world.push(w); state = w.newState; }
  log(`sim ${date}: ${w ? w.era : 'FAILED'}`);
}

phase('Joke-Writer');
const cumulative = [];
for (const w of world) cumulative.push(...(w.adoptedNow || []));
const strips = await parallel(world.map((w) => () =>
  agent(jokePrompt(w, cumulative), { label: `joke:${w.date}`, phase: 'Joke-Writer', schema: stripSchema })
));

return {
  world: world.map((w) => ({ date: w.date, era: w.era, capabilityLine: w.capabilityLine, officeLeakage: w.officeLeakage, adoptedNow: w.adoptedNow })),
  strips: strips.filter(Boolean),
};
