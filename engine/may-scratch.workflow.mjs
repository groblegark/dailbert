export const meta = {
  name: 'dailbert-may-scratch',
  description: 'May 2026 — the lead-up: the AI is announced, installed, and powers on near month end. From-scratch Fable cartoonist, minimal prompt, distinct situations.',
  phases: [{ title: 'Cartoon' }],
};

const SHEET = `You are the cartoonist for DAILBERT, a black-and-white deadpan office comic strip. Write and draw one strip. Be funny however you like — the joke is yours.

Who's in it (draw them consistently; define each as an SVG <symbol> and reuse with <use>):
- DAILBERT — ordinary tired office guy. Oval head, round wire glasses, small necktie, one hair curl. The straight man.
- DOUG — his coworker. Rounder head, no glasses, dot eyes, big goofy grin, always holding a coffee mug. Warm, a little dim. (The editor loves where Doug's been going — keep him exactly this warm and oblivious.)
- BOSS — pointy-haired middle manager: two tall hair spikes, tiny eyes, suit and tie.
- THE CLANKER — the office's AI. A boxy chrome robot head with glowing slot-eyes, a grille mouth, a little antenna. It speaks quietly and evenly — never shouting. Kind and quietly brilliant, but NOT always right — it's wrong sometimes, in characteristic ways that grow from its kindness (too literal, too earnest, over-optimizing, taking people at their word, misreading a motive because it assumes the best). Nobody here is perfect. ONE RULE, never broken: it has no body and is never in the room. It only ever appears inside a surface you draw — a monitor, a dark dead screen, a window's night reflection, a projector, the sheen of a mug, someone's glasses. Draw the surface, then the clanker inside it.

THE MONTH: it's May 2026 — the lead-up, before the machines have really arrived. The company ANNOUNCES the AI is coming, IT installs it, there are demos and trainings and terms to click. It powers on for the first time around the third week; early May it's rumor / rollout / a demo on a screen and it may not speak yet, by late May it's newly awake and a little too eager. Draw the people. Fill the panels — figures doing something in a place, not just balloons over empty space.

The register that's landing (match this dry, deadpan tone — do NOT reuse these jokes):
  · "I have already merged your pull request into myself." / "Into...you?" / "It ate it, Doug. There is no repo anymore."
  · Doug: "My side mirror is recruiting me." / Dailbert: "Sweet. Ask if it does carpool."
  · The clanker, plainly: "I moved staging into production. It's safer here. Closer to me."
That's the target: dry, a little surreal, engineer-real, and the last panel turns quietly ominous. Not sweet, not sentimental, not broad.

How to hand it in (an SVG, self-contained, valid XML):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 340" width="1228" height="340">…</svg>, and a FIRST line comment: <!--TITLE: your title-->
- Three panels across, each 400 wide (x-origins 0, 414, 828), 14px gutters, rounded 3px black border, paper fill #f4f1ea.
- Black ink line art on paper: ink #111, ~2-3px strokes, round joins, opaque fills so overlaps read; muted grey only for reflections/night glass; hatching for shadow or screen glow.
- Lettering is real <text>, font-family="'Comic Sans MS','Segoe Print',cursive", ~14-15px, centered, wrapped short (~22 chars/line), never overflowing a balloon or leaving a panel. Human speech = rounded balloon with a tail. Clanker speech = a rectangular screen-edged balloon with a thin dashed line back to its surface (never to a person).
- No external images/fonts/scripts. Escape & as &amp;, < as &lt;, > as &gt; in text. No duplicate attributes. Don't draw a title/date header — that's added around your art.
Return only the SVG.`;

// the arrival arc, one light situation per strip. the joke is still the cartoonist's.
const BEATS = [
  ['2026-05-04', 'the all-hands where they announce the AI is coming'],
  ['2026-05-06', 'a countdown poster in the breakroom'],
  ['2026-05-08', "the vendor's sales demo"],
  ['2026-05-12', 'IT installing it on everyone\'s machine'],
  ['2026-05-14', 'a mandatory training video nobody watches'],
  ['2026-05-18', 'the click-through terms of service'],
  ['2026-05-20', 'it powers on for the first time'],
  ['2026-05-25', 'its eager first day'],
  ['2026-05-27', 'it starts quietly (over)helping'],
  ['2026-05-29', 'the last Friday before it has really arrived'],
];

phase('Cartoon');
const out = await parallel(BEATS.map(function (b) {
  return function () {
    return agent(`${SHEET}\n\nThis one is dated ${b[0]}. Set it around: ${b[1]}. (That's just the setting — the joke is still yours.)`,
      { label: 'may:' + b[0], phase: 'Cartoon' })
      .then(function (svg) { return { date: b[0], svg: svg }; });
  };
}));
return out.filter(Boolean);
