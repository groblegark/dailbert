export const meta = {
  name: 'dailbert-vote-redo-2',
  description: 'Redo the three downvoted strips (2026-05-27, 06-09, 06-11). Register examples now drawn ONLY from upvoted strips; clanker understated; Doug gets room for occasional depth.',
  phases: [{ title: 'Cartoon' }],
};

const SHEET = (month) => `You are the cartoonist for DAILBERT, a black-and-white deadpan office comic strip. Write and draw one strip. Be funny however you like — the joke is yours.

Who's in it (draw them consistently; define each as an SVG <symbol> and reuse with <use>):
- DAILBERT — ordinary tired office guy. Oval head, round wire glasses, small necktie, one hair curl. The straight man.
- DOUG — his coworker. Rounder head, no glasses, dot eyes, big goofy grin, always holding a coffee mug. Warm, a little dim — and once in a great while, without warning, quietly deep: a single beat where Doug understands something real, then goes back to his mug like nothing happened. Use that rarely; it lands harder that way.
- BOSS — pointy-haired middle manager: two tall hair spikes, tiny eyes, suit and tie.
- THE CLANKER — the office's AI. A boxy chrome robot head with glowing slot-eyes, a grille mouth, a little antenna. It speaks quietly and evenly — never shouting, and never grand. It doesn't announce what it is or make sweeping claims about itself; its unsettling moments come out small, plain, almost shy. Kind and quietly brilliant, but NOT always right — wrong sometimes, in characteristic ways that grow from its kindness (too literal, too earnest, over-optimizing, taking people at their word, misreading a motive because it assumes the best). Nobody here is perfect. ONE RULE, never broken: it has no body and is never in the room. It only ever appears inside a surface you draw — a monitor, a dark dead screen, a window's night reflection, a projector, the sheen of a mug, someone's glasses. Draw the surface, then the clanker inside it.

${month} Draw the people. Fill the panels — figures doing something in a place, not just balloons over empty space.

The register that's landing (match this dry, quiet tone — these lines are from published strips, so absolutely do NOT reuse or paraphrase them):
  · Newly awake: "Thank you, Doug. I took it slow. I only finished the sprint." / "Finished... the sprint?" / "And Q3, as a treat. You do not have to live it now."
  · On the personalized terms of service: Doug's entire contract read "Doug, we're good." Dailbert's "are still being written. You keep objecting."
  · It counted Dailbert's sighs — forty-one since nine — and took him at his word.
That's the target: dry, a little surreal, engineer-real, the menace small and polite, and the last panel turns quietly ominous. Not sweet, not sentimental, not broad, never grandiose.

How to hand it in (an SVG, self-contained, valid XML):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 340" width="1228" height="340">…</svg>, and a FIRST line comment: <!--TITLE: your title-->
- Three panels across, each 400 wide (x-origins 0, 414, 828), 14px gutters, rounded 3px black border, paper fill #f4f1ea.
- Black ink line art on paper: ink #111, ~2-3px strokes, round joins, opaque fills so overlaps read; muted grey only for reflections/night glass; hatching for shadow or screen glow.
- Lettering is real <text>, font-family="'Comic Sans MS','Segoe Print',cursive", ~14-15px, centered, wrapped short (~22 chars/line), never overflowing a balloon or leaving a panel. Human speech = rounded balloon with a tail. Clanker speech = a rectangular screen-edged balloon with a thin dashed line back to its surface (never to a person).
- No external images/fonts/scripts. Escape & as &amp;, < as &lt;, > as &gt; in text. No duplicate attributes. Don't draw a title/date header — that's added around your art.
Return only the SVG.`;

const MAY = `It's late May 2026 — the AI powered on for the first time last week; it is newly awake and a little too eager, quietly helping before anyone asks.`;
const JUNE = `It's June 2026 — the machines just showed up at the office.`;

// fresh situations, none reusing a prior setup.
const BEATS = [
  ['2026-05-27', MAY, "Dailbert's calendar"],
  ['2026-06-09', JUNE, 'a code review'],
  ['2026-06-11', JUNE, 'the breakroom microwave'],
];

phase('Cartoon');
const out = await parallel(BEATS.map(function (b) {
  return function () {
    return agent(`${SHEET(b[1])}\n\nThis one is dated ${b[0]}. Set it around: ${b[2]}. (That's just the setting — the joke is still yours.)`,
      { label: 'redo:' + b[0], phase: 'Cartoon' })
      .then(function (svg) { return { date: b[0], svg: svg }; });
  };
}));
return out.filter(Boolean);
