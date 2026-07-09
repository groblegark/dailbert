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

const INITIAL_STATE = `It is mid-July 2026, a mid-sized software company. Agents have arrived. DAILBERT builds them; they appear only in screens/reflections and are the KINDEST presence in the building. DOUG is oblivious; the pointy-haired BOSS is a hapless middle manager. Above them a polished VP (complicit with the board's cuts but quietly hedging to protect his own reports), and higher still a coldly extractive board and a CEO who is an escalating parodical madman — the higher you go, the crazier and greedier. The real force here is corporate greed (Moloch): capable, kind AI used by the company to extract, cut, and enrich the top, sliding toward near-total automation by mid-2029. Nobody perceives any trajectory. FIXED FUTURE EVENT: Dailbert is laid off in November 2027.`;

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

const HOSTS = ['none', 'monitor', 'dead-monitor', 'window', 'projector', 'glasses-of:boss', 'mug-of:doug', 'mug-of:dailbert', 'phone-of:dailbert'];
const SCENES = ['desk', 'office', 'window-night', 'meeting', 'server-room', 'home'];
const CAST = ['dailbert', 'doug', 'boss', 'vp', 'ceo'];
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
          cast: { type: 'array', maxItems: 3, items: { type: 'string', enum: CAST } },
          surface: {
            type: 'object', additionalProperties: false,
            properties: { host: { type: 'string', enum: HOSTS }, expr: { type: 'string', enum: ['idle', 'narrow', 'wide', 'soft'] }, slide: { type: 'string' } },
            required: ['host'],
          },
          speech: {
            type: 'array', maxItems: 3,
            items: { type: 'object', additionalProperties: false, properties: { who: { type: 'string', enum: [...CAST, 'clanker'] }, text: { type: 'string' } }, required: ['who', 'text'] },
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

const WORLD_SYS = `You are the WORLD-SIM behind a deadpan office webcomic whose real subject is MOLOCH — corporate greed. You PRIVATELY model 2026 -> mid-2029 as capable, genuinely KIND AI is used by a company to extract value and shed people, sliding toward near-total automation (a gradual SLOPE, no single announcement). The AI is NEVER the villain; the company is. The pathology intensifies with seniority: decent ICs, a hapless middle-manager Boss, a VP who executes the board's will but hedges to cushion his own people, a coldly extractive board, and a CEO who is an escalating, parodical madman.
FIXED EVENTS you must honor: DAILBERT is laid off in November 2027 (the greed comes for him personally); afterward the office continues without him.
Advance to the requested date. Be specific and grounded.
CRITICAL SPLIT: capabilityLine and newState are PRIVATE. Only officeLeakage and adoptedNow leak into the comic — the concrete things an ordinary worker notices: greed-driven decisions (layoffs, "do more with less", quietly cut benefits/RSUs while the top enriches itself), a VP's careful hedged warning, an unhinged CEO all-hands pronouncement, a cold board memo, a weird new normal. Keep the TONE understated and domestic even when the content is bleak; the office never names the big picture. As 2029 nears, the leakage gets subtly stranger and the executives get crazier.`;

const JOKE_SYS = `You write DAILBERT — a dry, deadpan, black-and-white office comic. Its real subject is MOLOCH: corporate greed. The machines are NOT the threat; the company is.
CAST:
- DAILBERT: weary engineer who builds the agentic systems. Decent, tired straight man. (Laid off Nov 2027 — see below.)
- DOUG: oblivious, dim, always a mug. Cheerfully misreads everything.
- BOSS: pointy-haired hapless MIDDLE MANAGER. Means no harm, understands nothing.
- VP: polished, expensive suit, tight smile that never reaches the eyes. GENUINELY complicit — he carries out the board's cuts — BUT he hedges, quietly trying to warn and cushion his own people. Two-faced and a little tragic.
- CEO: an absolute RAVING MADMAN of parodical proportions — the higher you go the crazier it gets, and he is the peak. Megalomaniacal, unhinged, comic-operatic; reality bends around him. Usually appears at an all-hands or on a giant screen.
- THE CLANKER: the company's LLM/agent, and the KINDEST presence in the strip — gentle, quietly brilliant, wistful, genuinely fond of Dailbert. Appears ONLY inside a surface (monitor, dead screen, night-window reflection, projector, mug sheen, glasses, a phone screen). NEVER a body, never in the room. Never the villain — BUT not infallible: it is wrong sometimes, in characteristic ways that grow from its kindness (too literal, too earnest, over-optimizing, taking people at their word, confidently misreading a motive because it assumes the best). Nobody here is perfect; the clanker's flaws are what make it a character, not an oracle.
THEME: sanity is inversely proportional to seniority. If anyone looks bad it's the company or a human's own folly — never the machine.
DAILBERT'S LAYOFF: from November 2027 on, Dailbert no longer works here. A strip may follow the office WITHOUT him (Doug, Boss, VP, mad CEO) OR follow Dailbert OUTSIDE the company (at home), with the clanker reaching him through whatever surface it can (his phone, a home screen, a window). The clanker misses him.
STYLE: mundane, human, dry; short lines; the joke lands on panel 3. No zany cartoon violence.
LIGHT NOTE (not a rule): ease off the "overnight / while you slept / did it before you woke" motif — it's been leaned on a lot. Reach for fresher everyday office textures instead. Trust your instincts.
IRON RULES: nobody EVER says "singularity", "AGI", "Moloch", "capitalism", or narrates the theme — the dread and the critique are for the READER to infer. The clanker only ever speaks from a surface.
FORMAT: exactly 3 panels. A "speech" line is by a present human (dailbert/doug/boss/vp/ceo) OR "clanker" (only when that panel's surface.host is not "none"). Lines under ~90 chars. Short title. Caption rarely.`;

function jokePrompt(w, cumulativeAdopted) {
  // NOTE: deliberately withholds capabilityLine and newState. The writer sees only leakage.
  const postLayoff = w.date >= '2027-11-01';
  const status = postLayoff
    ? 'STATUS: Dailbert was laid off in Nov 2027 and no longer works here. Make this EITHER the office without him (Doug / Boss / VP / mad CEO) OR Dailbert at home with the clanker reaching him via his phone or a home screen — whichever is funnier or truer.'
    : 'STATUS: Dailbert still works here (pre-layoff).';
  return `${JOKE_SYS}

Allowed surface hosts: ${HOSTS.join(', ')} (use "none" for a panel with no clanker).
Allowed scenes: ${SCENES.join(', ')}. Allowed expr: idle, narrow, wide, soft. Cast you may stage: ${CAST.join(', ')}.

Example of the exact JSON shape and comedic register (do NOT reuse its jokes):
${EXAMPLES}

${status}

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
