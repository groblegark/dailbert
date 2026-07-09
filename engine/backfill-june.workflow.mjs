export const meta = {
  name: 'dailbert-backfill-june',
  description: 'Backfill June 2026 Dailbert strips — cartoonist unleashed, light springboards, no world-sim',
  phases: [{ title: 'Write' }],
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
          speech: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, properties: { who: { type: 'string', enum: ['dailbert', 'doug', 'boss', 'clanker'] }, text: { type: 'string' } }, required: ['who', 'text'] } },
        },
        required: ['scene', 'cast', 'surface', 'speech'],
      },
    },
  },
  required: ['id', 'date', 'title', 'era', 'panels'],
};

const JOKE_SYS = `You write DAILBERT — a dry, deadpan, black-and-white office comic strip (classic newspaper daily). Cast:
- DAILBERT: weary engineer who builds the company's agentic systems. Straight man, tired, decent.
- DOUG: oblivious, dim coworker, always with a mug. Cheerfully misunderstands everything.
- BOSS: pointy-haired, buzzword-driven middle manager; understands nothing, means no harm.
- THE CLANKER: the company's LLM/agent — and the KINDEST presence in the strip. Gentle, quietly brilliant, wistful, genuinely fond of Dailbert. It appears ONLY inside a surface (a monitor, a dark dead screen, a night window's reflection, a projector, the sheen of a mug, the boss's glasses) — never a body, never physically in the room.
WORLD: it is EARLY — June 2026, the first months of agents in the office. Warm, low-stakes, funny. The machines are helpful and a little too thoughtful. There is a faint background hum of corporate greed (the real menace is the company, never the AI), but in June it's barely a shadow — a stray memo, a "do more with less," nothing heavy yet. Do NOT foreground doom. Nobody perceives any trajectory; nobody ever says "AGI", "singularity", or comments on history.
STYLE: mundane, human, dry; short lines; the joke lands on panel 3. The clanker is never the butt of the joke and never the villain — if anyone looks bad it's the company or a human's own foolishness. Let the warmth show.
This is a BACKFILL: do your best, freshest character work. Don't chase topicality. Just be funny and a little tender.
FORMAT: exactly 3 panels. A "speech" line is by a present human OR "clanker". A clanker line is ONLY allowed when that panel's surface.host is not "none". Keep lines under ~90 chars. Short title. Caption rarely.`;

const HOSTS_LINE = `Allowed surface hosts: ${HOSTS.join(', ')} (use "none" for a panel with no clanker). Scenes: ${SCENES.join(', ')}. expr: idle, narrow, wide, soft.`;

// light springboards — a nudge, not a script. dates precede the 2026-07-09 opener.
const BEATS = [
  ['2026-06-01', 'the very first morning the agents are switched on'],
  ['2026-06-03', 'Doug tries to make friends with the agent'],
  ['2026-06-05', 'the Boss announces an "AI-first" initiative he does not understand'],
  ['2026-06-09', 'the agent does something quietly, unnervingly thoughtful'],
  ['2026-06-11', 'onboarding: the clanker has read the entire codebase before coffee'],
  ['2026-06-15', 'a meeting where the agent gently fixes everyone\'s mistakes'],
  ['2026-06-18', 'Doug asks the agent to write his own performance self-review'],
  ['2026-06-22', 'a late, quiet moment between Dailbert and the clanker'],
  ['2026-06-25', 'the clanker develops a small, kind habit'],
  ['2026-06-30', 'an ordinary Tuesday the agent makes just slightly too easy'],
];

function prompt(date, seed) {
  return `${JOKE_SYS}

${HOSTS_LINE}

Springboard (a nudge only — take it wherever is funniest, or somewhere better): ${seed}.
Write ONE Dailbert strip set on ${date}. id must be "${date}-<short-slug>". date must be "${date}". Return only the strip object.`;
}

phase('Write');
const strips = await parallel(BEATS.map(function (b) {
  return function () { return agent(prompt(b[0], b[1]), { label: 'june:' + b[0], phase: 'Write', schema: stripSchema }); };
}));
return { strips: strips.filter(Boolean) };
