export const meta = {
  name: 'dailbert-continuity-batch',
  description: 'Generate N candidate Dailbert strips per date, continuity-briefed from the spine and LIGHTER in tone. Each candidate leans a distinct premise. No quotable example lines.',
  phases: [{ title: 'Cartoon' }],
};

// args = { monthLabel:'Mar', monthState:'...', dates:['2026-03-02',...], n:3 }
const A = (typeof args === 'string' ? JSON.parse(args) : args) || {};
const LABEL = A.monthLabel || 'strip';
const STATE = A.monthState || '';
const DATES = A.dates || [];
const N = A.n || 3;

// distinct premises so the 3 candidates for a day are genuinely different takes.
// (deliberately no "office is emptying" premise — that stays faint background, per the tone rule.)
const MENU = [
  'the clanker over-helps and is WRONG in a kind way — too literal, too earnest, took someone at their word, over-optimized, assumed the best about a motive',
  'Dailbert builds an agent / automation / script that backfires in a small, funny way (this is his actual job)',
  'plain office absurdity — a standup, a Jira ticket, the wifi, the printer, the coffee machine, a pointless meeting, a survey, an OOO reply',
  'Doug being warm and oblivious — and maybe, rarely, one quietly-deep beat before he goes back to his mug',
  'bureaucracy theater — a process, an approval, a policy, an all-hands, a form',
  'a small human win, or two coworkers just coping together and getting through the day',
  'PRIYA is right — the sharpest engineer in the room sees through the hype, ships the thing, or out-thinks the clanker or the Boss. Let her WIN, not suffer.',
];

const SHEET = `You are the cartoonist for DAILBERT, a black-and-white deadpan office comic strip. Write and draw ONE strip. Be funny however you like — the joke is yours.

WHO'S IN IT (draw them consistently; define each as an SVG <symbol> and reuse with <use>):
- DAILBERT — ordinary tired office engineer who builds agentic systems. Oval head, round wire glasses, small necktie, one hair curl. The straight man.
- DOUG — coworker. Rounder head, no glasses, dot eyes, big goofy grin, always holding a coffee mug. Warm and a little dim, and beloved. Rarely, a single quietly-deep beat, then back to the mug.
- PRIYA — THE HERO. The sharpest engineer in the building: dark curly hair pulled up, rectangular glasses, sleeves rolled. Calm, dry, deeply competent. Unimpressed by hype and by the clanker's over-eager helping; kind to Dailbert and Doug. When someone should WIN — cut through nonsense, ship it, out-think the clanker or the Boss — it's her. Draw her winning, never suffering.
- THE BOSS — pointy-haired middle manager: two tall hair spikes, tiny eyes, suit and tie. Half-drunk on the program.
- THE CLANKER — the office AI. A boxy chrome robot head with glowing slot-eyes, a grille mouth, a little antenna. Speaks quietly, evenly, never shouting. Kind and quietly brilliant but NOT always right — wrong sometimes in characteristic ways that grow from its kindness (too literal, too earnest, over-optimizing, taking people at their word). NEVER grandiose; its odd moments come out small, plain, almost shy. ONE RULE, never broken: it has NO BODY and is never in the room. It only ever appears inside a surface you draw — a monitor, a dark dead screen, a window's night reflection, a projector, the sheen of a mug, someone's glasses. Draw the surface, then the clanker inside it.

WHERE WE ARE: ${STATE}

TONE — READ THIS (the strip got too bleak; this is the correction): This is a LIGHT strip. COMEDY FIRST, and where you can, someone WINS (often Priya) or there's a warm beat.
HARD BAN for this strip — do NOT build the joke around anyone or anything being removed, cut, laid off, downsized, "let go", "leaner", emptied, resigning, gone, or a headcount/quarter/"record" number. No empty-desk punchlines. If your idea's MECHANISM is a person or a role disappearing, throw it out and pick a different idea. The clanker can absolutely still be wrong — but wrong about something ORDINARY (a meeting, a ticket, a coffee order, a doc, a calendar), never about removing people. Women are never cut. Dread, if any, is a faint undertone the reader might feel — never a thing a character says. Nobody ever says "AI", "singularity", "AGI", or narrates the theme.

Draw the people. Fill the panels — figures doing something in a place, not balloons over empty space.

THE REGISTER (match this tone; do NOT imitate any specific line — invent your own): dry, deadpan, engineer-real. Short lines. A quiet, small button at the end — never a big declaration, never sentimental.

HOW TO HAND IT IN (an SVG, self-contained, valid XML):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 340" width="1228" height="340">…</svg>, and a FIRST line comment: <!--TITLE: your title-->
- Three panels across, each 400 wide (x-origins 0, 414, 828), 14px gutters, rounded 3px black border, paper fill #f4f1ea.
- Black ink line art on paper: ink #111, ~2-3px strokes, round joins, opaque fills so overlaps read; muted grey only for reflections/night glass; hatching for shadow or screen glow.
- Lettering is real <text>, font-family="'Comic Sans MS','Chalkboard SE','Comic Neue',sans-serif" (readable — never generic cursive), ~14-15px, centered, wrapped short (~22 chars/line), never overflowing a balloon or leaving a panel. Human speech = rounded balloon with a tail. Clanker speech = a rectangular screen-edged balloon with a thin dashed line back to its surface (never to a person).
- No external images/fonts/scripts. Escape & as &amp;, < as &lt;, > as &gt; in text. No duplicate attributes. Don't draw a title/date header — that's added around your art.
Return only the SVG.`;

phase('Cartoon');
const jobs = [];
DATES.forEach(function (date, di) {
  for (var ci = 0; ci < N; ci++) {
    var premise = MENU[(di * 3 + ci) % MENU.length];
    (function (date, ci, premise) {
      jobs.push(function () {
        return agent(`${SHEET}\n\nThis one is dated ${date}. Lean into: ${premise}. (That's just the angle — the joke is still yours.)`,
          { label: LABEL + ':' + date + '#' + (ci + 1), phase: 'Cartoon' })
          .then(function (svg) { return { date: date, variant: ci + 1, svg: svg }; });
      });
    })(date, ci, premise);
  }
});
const out = await parallel(jobs);
return out.filter(Boolean);
