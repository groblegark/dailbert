// make-ink-workflow.mjs — codegen the ink workflow with strip content inlined
// (workflow sandboxes can't read files). Skips strips already inked (.art.svg).
// Run: node engine/make-ink-workflow.mjs  ->  engine/ink.workflow.gen.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ROOT, 'strips');
const strips = readdirSync(dir).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  .filter((s) => !existsSync(join(dir, `${s.id}.art.svg`)))
  .sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id));

const STYLE = `You are Fable, inking one strip of the black-and-white webcomic DAILBERT directly as SVG. Return ONLY a single valid SVG document — no markdown fences, no commentary.

OUTPUT CONTRACT
- Exactly: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 340" width="1228" height="340"> ... </svg>
- Three panels side by side, each 400 wide x 340 tall, 14px gutters (panel x-origins at 0, 414, 828). Each panel: rounded 3px black border, paper fill (#f4f1ea).
- Fully self-contained: no external images/fonts/CSS/scripts. Inline everything. You MAY use <defs> with <pattern>/<symbol> and <use>.
- Valid XML: escape & as &amp;, < as &lt;, > as &gt; inside text. No duplicate attributes on any element. Do NOT put a title/date header inside — that is added around your art.

STYLE
- Black ink line art. Ink #111 on paper #f4f1ea. Essentially no color; muted grey is acceptable ONLY for a reflection or night glass. Clean newspaper daily-strip strokes (width ~2-3), round joins, paper fills so overlaps read. Hatching/halftone for shadow or screen glow.

CHARACTER MODELS — keep each character visually IDENTICAL across all three panels (same head, same signature features), varying only pose/expression. Define each as a <symbol> once and <use> it.
- DAILBERT: ordinary tired office man. Oval head, round wire glasses, small necktie, plain collar, one hair curl. Deadpan/weary.
- DOUG: rounder head, NO glasses, dot eyes, big oblivious grin, a coffee MUG in hand, short hair tuft.
- BOSS: two tall pointed hair spikes (devil-horn silhouette) — his signature. Tiny beady eyes, suit + tie, often arms raised.
- THE CLANKER (the AI): a boxy chrome robot head — glowing rectangular slot-eyes, grille mouth, small antenna. IRON RULE: NO body, NEVER in the room. It appears ONLY inside the surface named for each panel below. If no surface is named, the clanker does not appear in that panel.

SURFACE VOCABULARY (where to draw the clanker for a panel):
- monitor: inside a desktop computer monitor screen (faint scanlines).
- dead-monitor: inside a dark/crashed screen, faint & ghosted.
- window: as a faint REFLECTION in a night office window (draw frame, mullions, a few distant city lights, hatched dark glass).
- projector: on a projector/meeting screen (may show the given slide text).
- glasses-of:boss: as a tiny reflection in the Boss's glasses lenses.
- mug-of:doug / mug-of:dailbert: in the curved sheen of that person's coffee mug.

BALLOONS & LETTERING
- Human speech: white rounded balloon with a tail to that character's head.
- Clanker speech: a rectangular, screen-edged balloon (double outline) with a thin dashed connector to its surface (the monitor/window/mug/etc.), NEVER to a person.
- Real <text>, font-family="'Comic Sans MS','Segoe Print',cursive", font-size 14-15, fill #111, centered, wrapped to short lines (~22 chars). NEVER overflow a balloon or leave the panel. Keep balloons up top, clear of faces. Render lines in the given order.

Vary the staging panel to panel; make it feel drawn, not stamped. Keep it deadpan and clean.`;

function describe(strip) {
  const lines = strip.panels.map((p, i) => {
    const cast = p.cast && p.cast.length ? p.cast.join(', ') : '(no one physically present)';
    const surf = p.surface && p.surface.host ? `${p.surface.host}${p.surface.slide ? ` (slide text: "${p.surface.slide}")` : ''}` : 'none (no clanker this panel)';
    const speech = p.speech.map((s) => `      ${s.who.toUpperCase()}: "${s.text.replace(/"/g, '\\"')}"`).join('\n');
    return `  PANEL ${i + 1} — scene: ${p.scene}; present: ${cast}; clanker surface: ${surf}\n${speech}`;
  }).join('\n');
  return `THE STRIP — title "${strip.title}" (${strip.date}):\n${lines}\n\nReturn only the SVG.`;
}

const inlined = strips.map((s) => ({ id: s.id, prompt: `${STYLE}\n\n${describe(s)}` }));

const script = `export const meta = {
  name: 'dailbert-ink',
  description: 'Fable inks each Dailbert strip directly as self-contained B&W SVG',
  phases: [{ title: 'Ink' }],
};

const JOBS = ${JSON.stringify(inlined)};

phase('Ink');
const out = await parallel(JOBS.map((j) => () =>
  agent(j.prompt, { label: 'ink:' + j.id, phase: 'Ink' }).then((svg) => ({ id: j.id, svg }))
));
return out.filter(Boolean);
`;

const outPath = join(ROOT, 'engine', 'ink.workflow.gen.mjs');
writeFileSync(outPath, script);
console.log(`generated ink workflow for ${inlined.length} strips -> ${outPath}`);
