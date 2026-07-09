export const meta = {
  name: 'dailbert-june-scratch',
  description: 'June 2026 — Fable writes AND draws each strip from scratch as one SVG. Minimal prompting: character sheet + one rule + the date. No joke direction.',
  phases: [{ title: 'Cartoon' }],
};

// A character sheet and a technical contract — NOT a joke brief. The cartoonist is trusted.
const SHEET = `You are the cartoonist for DAILBERT, a black-and-white deadpan office comic strip. Write and draw one strip. Be funny however you like — the joke is yours.

Who's in it (draw them consistently; define each as an SVG <symbol> and reuse with <use>):
- DAILBERT — ordinary tired office guy. Oval head, round wire glasses, small necktie, one hair curl. The straight man.
- DOUG — his coworker. Rounder head, no glasses, dot eyes, big goofy grin, always holding a coffee mug. Warm, a little dim.
- BOSS — pointy-haired middle manager: two tall hair spikes, tiny eyes, suit and tie.
- THE CLANKER — the office's AI. A boxy chrome robot head with glowing slot-eyes, a grille mouth, a little antenna. ONE RULE, never broken: it has no body and is never in the room. It only ever appears inside a surface you draw — a monitor, a dark dead screen, a window's night reflection, a projector, the sheen of a mug, someone's glasses. Draw the surface, then the clanker inside it.

It's June 2026 — the machines just showed up at the office. Make your best strip.
Draw the people. Fill the panels — figures doing something in a place, not just balloons over empty space.

How to hand it in (an SVG, self-contained, valid XML):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 340" width="1228" height="340">…</svg>, and a FIRST line comment: <!--TITLE: your title-->
- Three panels across, each 400 wide (x-origins 0, 414, 828), 14px gutters, rounded 3px black border, paper fill #f4f1ea.
- Black ink line art on paper: ink #111, ~2-3px strokes, round joins, opaque fills so overlaps read; muted grey only for reflections/night glass; hatching for shadow or screen glow.
- Lettering is real <text>, font-family="'Comic Sans MS','Segoe Print',cursive", ~14-15px, centered, wrapped short (~22 chars/line), never overflowing a balloon or leaving a panel. Human speech = rounded balloon with a tail. Clanker speech = a rectangular screen-edged balloon with a thin dashed line back to its surface (never to a person).
- No external images/fonts/scripts. Escape & as &amp;, < as &lt;, > as &gt; in text. No duplicate attributes. Don't draw a title/date header — that's added around your art.
Return only the SVG.`;

// date + a SITUATION: one noun, a place/moment to set it in. Not a joke — just a stage
// so ten blind cartoonists don't all reach for the same first-week gag.
const BEATS = [
  ['2026-06-01', 'a 1:1 review'],
  ['2026-06-03', 'the coffee machine'],
  ['2026-06-05', 'a fire drill'],
  ['2026-06-09', 'a late night, alone at the desk'],
  ['2026-06-11', "Doug's birthday in the breakroom"],
  ['2026-06-15', 'a system outage'],
  ['2026-06-18', 'lunch'],
  ['2026-06-22', 'the parking lot after work'],
  ['2026-06-25', 'a code review'],
  ['2026-06-30', 'a Friday afternoon'],
];

phase('Cartoon');
const out = await parallel(BEATS.map(function (b) {
  return function () {
    return agent(`${SHEET}\n\nThis one is dated ${b[0]}. Set it around: ${b[1]}. (That's just the setting — the joke is still yours.)`,
      { label: 'june:' + b[0], phase: 'Cartoon' })
      .then(function (svg) { return { date: b[0], svg: svg }; });
  };
}));
return out.filter(Boolean);
