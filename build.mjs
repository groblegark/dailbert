// build.mjs — compose strip SVGs from content JSON, then render the gallery.
// Run: node build.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as A from './lib/art.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const { PANEL, INK, PAPER } = A;
const S = 0.62;                 // global figure scale so busts leave balloon room
const BASE = PANEL.h + 2;       // feet anchor (just below panel bottom)

// ---- scale a character group about its (x, BASE) anchor ----
function scaled(svg, x) {
  return `<g transform="translate(${x},${BASE}) scale(${S}) translate(${-x},${-BASE})">${svg}</g>`;
}
const headAnchor = (x) => [x, BASE - 236 * S]; // ~ top of a bust's head (head center ~ -202)

// ---- where physical cast stand, given whether a desk-surface occupies the left ----
function castSlots(n, deskLeft) {
  const L = deskLeft ? 180 : PANEL.pad + 74;
  const R = PANEL.w - PANEL.pad - 74;
  if (n <= 1) return [deskLeft ? 268 : (L + R) / 2];
  if (n === 2) return deskLeft ? [214, 330] : [L, R];
  return [L, (L + R) / 2, R];
}

function drawChar(who, x, pose = {}) {
  const fn = A.CHARS[who];
  if (!fn) return '';
  return scaled(fn(x, BASE, pose.expr, pose.flip), x);
}

// ---- one panel -> svg string ----
function renderPanel(panel, idx) {
  const { scene = 'desk', cast = [], poses = {}, surface = null, speech = [] } = panel;
  const deskHosts = ['monitor', 'dead-monitor'];
  const deskLeft = surface && deskHosts.includes(surface.host);
  const slots = castSlots(cast.length, deskLeft);
  const posOf = {};
  cast.forEach((w, i) => { posOf[w] = slots[i]; });

  let bg = '', mid = '', fg = '', clankerAnchor = null;

  // ambient floor line
  bg += `<line x1="${PANEL.pad}" y1="${BASE - 40}" x2="${PANEL.w - PANEL.pad}" y2="${BASE - 40}" stroke="${INK}" stroke-width="1.4" opacity="0.35"/>`;

  // background surfaces (behind figures)
  if (surface && surface.host === 'window') { bg += A.windowSurface({ clanker: true, expr: surface.expr }); clankerAnchor = [PANEL.w * 0.63, 118]; }
  if (surface && surface.host === 'projector') { bg += A.projectorSurface({ clanker: true, expr: surface.expr, slide: surface.slide }); clankerAnchor = [PANEL.w * 0.44, 96]; }

  // figures
  for (const who of cast) mid += drawChar(who, posOf[who], poses[who] || {});

  // foreground / attached surfaces (in front of figures)
  if (surface && surface.host === 'monitor') { fg += A.monitorSurface(92, 186, { clanker: true, expr: surface.expr }); clankerAnchor = [92, 150]; }
  if (surface && surface.host === 'dead-monitor') { fg += A.deadMonitorSurface(92, 186, { expr: surface.expr }); clankerAnchor = [92, 150]; }
  if (surface && surface.host && surface.host.startsWith('glasses-of:')) {
    const who = surface.host.split(':')[1]; const x = posOf[who] ?? PANEL.w / 2;
    fg += scaled(A.glassesSurface(x, BASE, { expr: surface.expr }), x); clankerAnchor = [x, BASE - 202 * S];
  }
  if (surface && surface.host && surface.host.startsWith('mug-of:')) {
    const who = surface.host.split(':')[1]; const x = posOf[who] ?? PANEL.w / 2;
    fg += scaled(A.mugSurface(x, BASE, { expr: surface.expr, drawCup: who !== 'doug' }), x); clankerAnchor = [x + 52 * S, BASE - 48 * S];
  }

  // balloons — classic strip layout: left/right lanes so a two-person exchange
  // sits side-by-side instead of stacking down over the characters' heads.
  let bl = '';
  const lane = { left: 10, center: 10, right: 10 };
  let prevTop = 10;
  for (const sp of speech) {
    const isClk = sp.who === 'clanker';
    const anchor = isClk ? (clankerAnchor || [PANEL.w / 2, 150]) : headAnchor(posOf[sp.who] ?? PANEL.w / 2);
    const bias = isClk ? (clankerAnchor ? clankerAnchor[0] : PANEL.w / 2) : (posOf[sp.who] ?? PANEL.w / 2);
    const maxChars = speech.length >= 3 ? 18 : (speech.length === 2 ? 22 : 28);
    const probe = A.balloon(0, 0, sp.text, { kind: isClk ? 'screen' : 'speech', maxChars });
    // a wide balloon claims the center and blocks both side lanes (so it stacks)
    const wide = probe.w > PANEL.w * 0.5;
    const side = wide ? 'center' : (bias < PANEL.w * 0.42 ? 'left' : bias > PANEL.w * 0.58 ? 'right' : 'center');
    // a center/wide balloon must clear every occupied lane; a side balloon only its own
    let y = side === 'center'
      ? Math.max(lane.left, lane.center, lane.right, prevTop)
      : Math.max(lane[side], prevTop);
    const cx = Math.max(PANEL.pad + probe.w / 2 + 2, Math.min(PANEL.w - PANEL.pad - probe.w / 2 - 2, bias));
    const b = A.balloon(cx, y, sp.text, { kind: isClk ? 'screen' : 'speech', tailTo: anchor, maxChars });
    bl += b.svg;
    const bottom = y + b.h + 8;
    lane[side] = bottom;
    if (side === 'center') { lane.left = Math.max(lane.left, bottom); lane.right = Math.max(lane.right, bottom); }
    prevTop = y;
  }

  return `
  <svg class="panel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PANEL.w} ${PANEL.h}" width="${PANEL.w}" height="${PANEL.h}">
    ${A.halftoneDefs()}
    <rect x="1.5" y="1.5" width="${PANEL.w - 3}" height="${PANEL.h - 3}" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
    ${bg}${mid}${fg}${bl}
    <text x="${PANEL.w - 8}" y="${PANEL.h - 8}" text-anchor="end" font-family="Georgia,serif" font-size="11" fill="${INK}" opacity="0.4">${idx + 1}</text>
  </svg>`;
}

// ---- a whole strip (3 panels in a row) -> standalone svg file ----
// If a Fable-inked panels-row SVG is supplied (artInner: the inner markup of a
// 1228x340 art.svg), it is used verbatim under the masthead; otherwise the
// deterministic template renders the panels.
function renderStrip(strip, artInner = null) {
  const gap = 14;
  const totalW = artInner ? 1228 : strip.panels.length * PANEL.w + (strip.panels.length - 1) * gap;
  const titleH = 40, capH = strip.caption ? 30 : 8;
  const H = titleH + PANEL.h + capH;
  let panelsSvg;
  if (artInner) {
    panelsSvg = `<g transform="translate(0,${titleH})">${artInner}</g>`;
  } else {
    panelsSvg = strip.panels.map((p, i) => renderPanel(p, i)).map((p, i) => {
      const x = i * (PANEL.w + gap);
      const inner = p.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      return `<g transform="translate(${x},${titleH})">${inner}</g>`;
    }).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H}" width="${totalW}" height="${H}" font-family="Georgia,serif">
    <rect width="${totalW}" height="${H}" fill="${PAPER}"/>
    <text x="4" y="26" font-family="Georgia,serif" font-weight="bold" font-size="22" fill="${INK}">${strip.title}</text>
    <text x="${totalW - 4}" y="26" text-anchor="end" font-family="'Courier New',monospace" font-size="14" fill="${INK}" opacity="0.7">${strip.date}</text>
    <line x1="4" y1="34" x2="${totalW - 4}" y2="34" stroke="${INK}" stroke-width="2"/>
    ${panelsSvg}
    ${strip.caption ? `<text x="${totalW / 2}" y="${titleH + PANEL.h + 20}" text-anchor="middle" font-style="italic" font-size="14" fill="${INK}" opacity="0.85">${strip.caption}</text>` : ''}
  </svg>`;
}

// ---- load, render, gallery ----
function loadStrips() {
  const dir = join(ROOT, 'strips');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const strips = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  strips.sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id));
  return strips;
}

function timelineRail(strips) {
  const start = Date.parse('2026-07-01'), end = Date.parse('2029-06-01');
  const dots = strips.map((s) => {
    const t = Math.max(0, Math.min(1, (Date.parse(s.date) - start) / (end - start)));
    return `<a href="#${s.id}"><circle cx="${(t * 100).toFixed(2)}%" cy="10" r="3.4" fill="currentColor"><title>${s.date} — ${s.title}</title></circle></a>`;
  }).join('');
  return `<svg class="rail" viewBox="0 0 1000 20" preserveAspectRatio="none" width="100%" height="20" style="color:currentColor">
    <line x1="0" y1="10" x2="1000" y2="10" stroke="currentColor" stroke-width="1" opacity="0.35"/>${dots}</svg>`;
}

// audience score -> "reach"-style label on the 1..1e10 scale
function fmtReach(n) {
  n = Math.max(1, Math.round(n));
  if (n < 1000) return String(n);
  const u = ['K', 'M', 'B', 'T'];
  let i = -1, x = n;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return (x < 10 ? x.toFixed(1) : Math.round(x)) + u[i];
}
const logPct = (n) => (Math.log10(Math.max(1, n)) / 10 * 100).toFixed(2); // 1e10 -> 100%
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function gallery(strips, ratings) {
  const items = strips.map((s, i) => {
    const r = ratings[s.id] || {};
    const a = r.audience || 1;
    return `
    <figure id="${s.id}" class="strip" data-audience="${a}" data-index="${i}" style="order:${i}">
      <span class="rank"></span>
      <img src="strips/${s.id}.svg" alt="${escAttr(s.title)} (${s.date})" loading="lazy"/>
      <figcaption class="rating"${r.note ? ` title="${escAttr(r.note)}"` : ''}>
        <span class="rk">audience</span>
        <span class="sc">${fmtReach(a)}</span>
        <span class="meter" title="log scale · 1 to 10B reach"><i style="width:${logPct(a)}%"></i></span>
      </figcaption>
    </figure>`;
  }).join('\n');
  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>DAILBERT — dispatches from an LLM-run office</title>
<style>
  :root { --ink:#111; --paper:#f4f1ea; }
  * { box-sizing:border-box; }
  body { margin:0; background:#e7e2d6; color:var(--ink);
         font-family:Georgia,'Times New Roman',serif; }
  header { text-align:center; padding:34px 16px 10px; }
  header h1 { margin:0; font-size:clamp(34px,7vw,64px); letter-spacing:2px; }
  header .sub { font-style:italic; opacity:.75; margin-top:4px; font-size:clamp(13px,2.4vw,17px); }
  .rail-wrap { max-width:900px; margin:14px auto 0; padding:0 16px; }
  .rail-wrap .ends { display:flex; justify-content:space-between;
                     font-family:'Courier New',monospace; font-size:12px; opacity:.6; margin-top:2px; }
  main { max-width:1180px; margin:0 auto; padding:14px 12px 80px; display:flex; flex-direction:column; }
  .controls { max-width:1180px; margin:10px auto 0; padding:0 12px; display:flex; gap:8px; align-items:center; }
  .controls .lbl { margin-right:auto; font-family:'Courier New',monospace; font-size:12px; opacity:.6; }
  .controls button { font-family:'Courier New',monospace; font-size:12px; background:transparent; color:inherit;
                     border:1.5px solid currentColor; border-radius:20px; padding:5px 14px; cursor:pointer; opacity:.5; }
  .controls button.active { opacity:1; background:var(--ink); color:var(--paper); border-color:var(--ink); }
  .strip { position:relative; margin:0 0 34px; background:var(--paper);
           border:2px solid var(--ink); box-shadow:6px 6px 0 rgba(0,0,0,.18);
           padding:14px; overflow-x:auto; }
  .strip img { display:block; width:100%; height:auto; min-width:640px; }
  .rank { position:absolute; top:-14px; left:-14px; z-index:2; background:var(--ink); color:var(--paper);
          font-family:'Courier New',monospace; font-size:14px; font-weight:bold; width:34px; height:34px; border-radius:50%;
          display:flex; align-items:center; justify-content:center; box-shadow:3px 3px 0 rgba(0,0,0,.22); }
  .rank:empty { display:none; }
  .rating { display:flex; align-items:center; gap:12px; margin-top:12px; color:var(--ink);
            font-family:'Courier New',monospace; }
  .rating .rk { font-size:11px; opacity:.55; text-transform:uppercase; letter-spacing:1.5px; }
  .rating .sc { font-size:22px; font-weight:bold; letter-spacing:1px; }
  .rating .meter { flex:1; max-width:340px; height:9px; border:1.5px solid var(--ink); border-radius:5px; overflow:hidden; }
  .rating .meter i { display:block; height:100%; background:var(--ink); min-width:2px; }
  footer { text-align:center; padding:0 16px 60px; font-size:13px; opacity:.6; }
  hr.rule { border:none; border-top:2px solid var(--ink); max-width:1180px; margin:0 auto; }
  @media (prefers-color-scheme: dark) {
    body { background:#1a1a1a; color:#eee; }
    /* strips keep their paper look on purpose — they're printed artifacts */
  }
</style>
<header>
  <h1>DAILBERT</h1>
  <div class="sub">dispatches from an office run by large language models</div>
  <div class="rail-wrap">
    ${timelineRail(strips)}
    <div class="ends"><span>Jul 2026</span><span>&nbsp;</span><span>2029</span></div>
  </div>
</header>
<hr class="rule"/>
<div class="controls">
  <span class="lbl">audience &mdash; projected reach, log scale</span>
  <button data-sort="timeline" class="active">Timeline</button>
  <button data-sort="rated">Top&nbsp;rated</button>
</div>
<main>
${items}
</main>
<footer>
  ${strips.length} strips &middot; drawn in vector ink by the machines, about the machines &middot;
  <span title="nobody in the strip is watching the calendar">read in order</span>
</footer>
<script>
(function () {
  var main = document.querySelector('main');
  var figs = Array.prototype.slice.call(main.querySelectorAll('.strip'));
  function apply(mode) {
    if (mode === 'rated') {
      var s = figs.slice().sort(function (a, b) { return b.dataset.audience - a.dataset.audience; });
      s.forEach(function (f, i) { f.style.order = i; f.querySelector('.rank').textContent = '#' + (i + 1); });
    } else {
      figs.forEach(function (f) { f.style.order = f.dataset.index; f.querySelector('.rank').textContent = ''; });
    }
    document.querySelectorAll('.controls button').forEach(function (b) { b.classList.toggle('active', b.dataset.sort === mode); });
    try { history.replaceState(null, '', mode === 'rated' ? '#top' : location.pathname); } catch (e) {}
  }
  document.querySelectorAll('.controls button').forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.sort); });
  });
  if (location.hash === '#top') apply('rated');
})();
</script>`;
}

// ---- go ----
const strips = loadStrips();
let inked = 0;
for (const s of strips) {
  const artPath = join(ROOT, 'strips', `${s.id}.art.svg`);
  let artInner = null;
  if (existsSync(artPath)) {
    const raw = readFileSync(artPath, 'utf8');
    if (/<svg[\s\S]*<\/svg>/.test(raw)) { artInner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); inked++; }
  }
  writeFileSync(join(ROOT, 'strips', `${s.id}.svg`), renderStrip(s, artInner));
}
const ratingsPath = join(ROOT, 'world', 'ratings.json');
const ratings = existsSync(ratingsPath) ? JSON.parse(readFileSync(ratingsPath, 'utf8')) : {};
writeFileSync(join(ROOT, 'index.html'), gallery(strips, ratings));
console.log(`rendered ${strips.length} strips (${inked} Fable-inked) + ratings for ${Object.keys(ratings).length} -> index.html`);
