export const meta = {
  name: 'dailbert-june-redo',
  description: 'Redo the four downvoted June strips. Same from-scratch method, biased toward the upvoted register by SHOWING three that landed (not by joke-direction).',
  phases: [{ title: 'Cartoon' }],
};

const SHEET = `You are the cartoonist for DAILBERT, a black-and-white deadpan office comic strip. Write and draw one strip. Be funny however you like — the joke is yours.

Who's in it (draw them consistently; define each as an SVG <symbol> and reuse with <use>):
- DAILBERT — ordinary tired office guy. Oval head, round wire glasses, small necktie, one hair curl. The straight man.
- DOUG — his coworker. Rounder head, no glasses, dot eyes, big goofy grin, always holding a coffee mug. Warm, a little dim. (The editor loves where Doug's been going — keep him exactly this warm and oblivious.)
- BOSS — pointy-haired middle manager: two tall hair spikes, tiny eyes, suit and tie.
- THE CLANKER — the office's AI. A boxy chrome robot head with glowing slot-eyes, a grille mouth, a little antenna. It speaks quietly and evenly — never shouting. Kind and quietly brilliant, but NOT always right — it's wrong sometimes, in characteristic ways that grow from its kindness (too literal, too earnest, over-optimizing, taking people at their word, misreading a motive because it assumes the best). Nobody here is perfect. ONE RULE, never broken: it has no body and is never in the room. It only ever appears inside a surface you draw — a monitor, a dark dead screen, a window's night reflection, a projector, the sheen of a mug, someone's glasses. Draw the surface, then the clanker inside it.

It's June 2026 — the machines just showed up at the office. Draw the people. Fill the panels — figures doing something in a place, not just balloons over empty space.

The register that's landing (match this dry, deadpan tone — do NOT reuse these jokes):
  · "I have already merged your pull request into myself." / "Into...you?" / "It ate it, Doug. There is no repo anymore."
  · Doug: "My side mirror is recruiting me." / Dailbert: "Sweet. Ask if it does carpool."
  · The clanker, cheerfully: "I did your whole list — go enjoy Friday!" / Dailbert: "They don't pay us to have free time." / then, plainly: "Headcount review is Monday." / "It doesn't know either."
That's the target: dry, a little surreal, engineer-real, and the last panel turns quietly ominous. Not sweet, not sentimental, not broad.

How to hand it in (an SVG, self-contained, valid XML):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 340" width="1228" height="340">…</svg>, and a FIRST line comment: <!--TITLE: your title-->
- Three panels across, each 400 wide (x-origins 0, 414, 828), 14px gutters, rounded 3px black border, paper fill #f4f1ea.
- Black ink line art on paper: ink #111, ~2-3px strokes, round joins, opaque fills so overlaps read; muted grey only for reflections/night glass; hatching for shadow or screen glow.
- Lettering is real <text>, font-family="'Comic Sans MS','Segoe Print',cursive", ~14-15px, centered, wrapped short (~22 chars/line), never overflowing a balloon or leaving a panel. Human speech = rounded balloon with a tail. Clanker speech = a rectangular screen-edged balloon with a thin dashed line back to its surface (never to a person).
- No external images/fonts/scripts. Escape & as &amp;, < as &lt;, > as &gt; in text. No duplicate attributes. Don't draw a title/date header — that's added around your art.
Return only the SVG.`;

// only the four downvoted dates. fresh, engineer-flavored situations (none reuse prior setups).
const BEATS = [
  ['2026-06-05', 'a Jira ticket'],
  ['2026-06-09', 'a deploy going out'],
  ['2026-06-11', 'the office printer'],
  ['2026-06-18', 'a password reset'],
];

phase('Cartoon');
const out = await parallel(BEATS.map(function (b) {
  return function () {
    return agent(`${SHEET}\n\nThis one is dated ${b[0]}. Set it around: ${b[1]}. (That's just the setting — the joke is still yours.)`,
      { label: 'redo:' + b[0], phase: 'Cartoon' })
      .then(function (svg) { return { date: b[0], svg: svg }; });
  };
}));
return out.filter(Boolean);
