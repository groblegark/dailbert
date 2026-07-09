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

function archive(strips, ratings) {
  const items = strips.map((s, i) => {
    const r = ratings[s.id] || {};
    const a = r.audience || 1;
    return `
    <figure id="${s.id}" class="strip" data-audience="${a}" data-index="${i}" style="order:${i}">
      <span class="rank"></span>
      <a class="frame" href="index.html?id=${s.id}" aria-label="Open ${escAttr(s.title)}">
        <img src="strips/${s.id}.svg" alt="${escAttr(s.title)} (${s.date})" loading="lazy"/>
        <span class="open-hint">open &rarr;</span>
      </a>
      <figcaption class="meta"${r.note ? ` title="${escAttr(r.note)}"` : ''}>
        <span class="rating">
          <span class="rk">editor</span>
          <span class="sc">${fmtReach(a)}</span>
          <span class="meter" title="log scale · 1 to 10B reach"><i style="width:${logPct(a)}%"></i></span>
        </span>
        <span class="actions">
          <button class="uv" data-id="${s.id}" title="Upvote this strip">&#9650; <b class="uvn">0</b></button>
          <a class="cm" href="index.html?id=${s.id}#comments" title="Read & comment">&#128172; <span class="cmn">0</span></a>
        </span>
      </figcaption>
    </figure>`;
  }).join('\n');
  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>DAILBERT — archive</title>
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
  .rating .meter { flex:1; max-width:260px; height:9px; border:1.5px solid var(--ink); border-radius:5px; overflow:hidden; }
  .rating .meter i { display:block; height:100%; background:var(--ink); min-width:2px; }
  .frame { display:block; position:relative; text-decoration:none; color:inherit; }
  .frame .open-hint { position:absolute; top:8px; right:10px; font-family:'Courier New',monospace; font-size:12px;
                      opacity:0; color:var(--ink); background:var(--paper); border:1.5px solid var(--ink);
                      border-radius:14px; padding:2px 9px; transition:opacity .12s; }
  .strip:hover .open-hint { opacity:.9; }
  .meta { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-top:12px; }
  .meta .rating { margin-top:0; }
  .actions { display:flex; align-items:center; gap:8px; font-family:'Courier New',monospace; }
  .uv, .cm { font-family:'Courier New',monospace; font-size:14px; border:1.5px solid var(--ink); background:transparent;
             color:inherit; border-radius:20px; padding:5px 12px; cursor:pointer; text-decoration:none;
             display:inline-flex; align-items:center; gap:6px; }
  .uv.voted { background:var(--ink); color:var(--paper); }
  .cm { opacity:.85; }
  .topnav { max-width:1180px; margin:0 auto; padding:2px 12px 0; display:flex; gap:16px;
            font-family:'Courier New',monospace; font-size:13px; }
  .topnav a { color:inherit; opacity:.7; text-decoration:none; border-bottom:1.5px solid transparent; }
  .topnav a:hover { opacity:1; border-color:currentColor; }
  footer { text-align:center; padding:0 16px 60px; font-size:13px; opacity:.6; }
  hr.rule { border:none; border-top:2px solid var(--ink); max-width:1180px; margin:0 auto; }
  @media (prefers-color-scheme: dark) {
    body { background:#1a1a1a; color:#eee; }
    /* strips keep their paper look on purpose — they're printed artifacts */
  }
</style>
<div class="topnav"><a href="index.html">&larr;&nbsp;Today's strip</a><span style="margin-left:auto;opacity:.5">the archive</span></div>
<header>
  <h1>DAILBERT</h1>
  <div class="sub">the archive &middot; every dispatch, by date or by reach</div>
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

  // engagement counts (browser-local preview; shared totals arrive with the backend)
  figs.forEach(function (f) {
    var id = f.id;
    var voted = localStorage.getItem('dv.up.' + id) === '1';
    var uvn = f.querySelector('.uvn'); if (uvn) uvn.textContent = voted ? 1 : 0;
    var b = f.querySelector('.uv');
    if (b) {
      b.classList.toggle('voted', voted);
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var v = localStorage.getItem('dv.up.' + id) === '1';
        if (v) localStorage.removeItem('dv.up.' + id); else localStorage.setItem('dv.up.' + id, '1');
        b.classList.toggle('voted', !v); if (uvn) uvn.textContent = !v ? 1 : 0;
      });
    }
    var cc = 0; try { cc = JSON.parse(localStorage.getItem('dv.cm.' + id) || '[]').length; } catch (e) {}
    var cmn = f.querySelector('.cmn'); if (cmn) cmn.textContent = cc;
  });
})();
</script>`;
}

// ---- solo viewer (index.html): today's comic + prev/next + score + upvote + comments ----
function solo(manifest) {
  const data = JSON.stringify(manifest).replace(/</g, '\\u003c');
  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>DAILBERT</title>
<style>
  :root { --ink:#111; --paper:#f4f1ea; }
  * { box-sizing:border-box; }
  body { margin:0; background:#e7e2d6; color:var(--ink); font-family:Georgia,'Times New Roman',serif; }
  .wrap { max-width:1180px; margin:0 auto; padding:12px 14px 90px; }
  .topnav { display:flex; gap:18px; align-items:center; font-family:'Courier New',monospace; font-size:13px;
            padding:6px 2px 12px; border-bottom:2px solid var(--ink); }
  .topnav a { color:inherit; opacity:.7; text-decoration:none; }
  .topnav a:hover { opacity:1; text-decoration:underline; }
  .topnav .brand { margin-left:auto; font-family:Georgia,serif; font-weight:bold; letter-spacing:2px; font-size:19px; }
  .nav { display:flex; align-items:center; gap:10px; justify-content:center; padding:18px 0; flex-wrap:wrap; }
  .nav.bottom { padding:28px 0 0; }
  .nav .ctr { min-width:260px; text-align:center; }
  .nav .ctr #title { font-family:Georgia,serif; font-weight:bold; font-size:20px; }
  .nav .ctr #date { font-family:'Courier New',monospace; opacity:.6; font-size:13px; margin-left:8px; }
  .nav button { font-family:'Courier New',monospace; font-size:14px; background:transparent; color:inherit;
                border:1.5px solid currentColor; border-radius:20px; padding:6px 14px; cursor:pointer; }
  .nav button:disabled { opacity:.28; cursor:default; }
  .stage { background:var(--paper); border:2px solid var(--ink); box-shadow:6px 6px 0 rgba(0,0,0,.18);
           padding:16px; overflow-x:auto; }
  .stage img { display:block; width:100%; height:auto; min-width:640px; }
  .bar { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
         margin-top:16px; font-family:'Courier New',monospace; }
  .rating { display:flex; align-items:center; gap:12px; }
  .rating .rk { font-size:11px; opacity:.55; text-transform:uppercase; letter-spacing:1.5px; }
  .rating .sc { font-size:22px; font-weight:bold; }
  .rating .meter { width:200px; height:9px; border:1.5px solid var(--ink); border-radius:5px; overflow:hidden; }
  .rating .meter i { display:block; height:100%; background:var(--ink); min-width:2px; }
  .eng { display:flex; gap:10px; align-items:center; }
  .uv, .cm { font-family:'Courier New',monospace; font-size:15px; border:1.5px solid var(--ink); background:transparent;
             color:inherit; border-radius:22px; padding:8px 16px; cursor:pointer; text-decoration:none;
             display:inline-flex; align-items:center; gap:7px; }
  .uv .lbl { opacity:.7; font-size:13px; }
  .uv.voted { background:var(--ink); color:var(--paper); }
  .note { font-family:'Courier New',monospace; font-size:12px; opacity:.6; margin:10px 2px 0; }
  #comments { margin-top:34px; border-top:2px solid var(--ink); padding-top:20px; }
  #comments h2 { font-size:22px; margin:0 0 4px; }
  #comments .prev { font-family:'Courier New',monospace; font-size:12px; opacity:.6; margin:0 0 16px; }
  #cform { display:flex; flex-direction:column; gap:8px; max-width:640px; }
  #cform input, #cform textarea { font-family:inherit; font-size:15px; background:var(--paper);
                                  border:1.5px solid var(--ink); border-radius:8px; padding:9px 11px; color:inherit; }
  #cform button { align-self:flex-start; font-family:'Courier New',monospace; background:var(--ink); color:var(--paper);
                  border:none; border-radius:20px; padding:9px 22px; cursor:pointer; font-size:14px; }
  #clist { list-style:none; padding:0; margin:22px 0 0; max-width:720px; }
  #clist li { border:1.5px solid var(--ink); border-radius:10px; padding:12px 14px; margin:0 0 12px; background:var(--paper); }
  #clist .ch { font-family:'Courier New',monospace; font-size:13px; margin-bottom:5px; }
  #clist .ts { opacity:.5; margin-left:6px; }
  #clist .cb { white-space:pre-wrap; line-height:1.45; }
  @media (prefers-color-scheme:dark) { body { background:#1a1a1a; color:#eee; } }
</style>
<div class="wrap">
  <div class="topnav">
    <a href="index.html">Today</a>
    <a href="archive.html">Archive</a>
    <a href="archive.html#top">Top&nbsp;rated</a>
    <span class="brand">DAILBERT</span>
  </div>
  <div class="nav">
    <button id="first" title="First strip">&laquo;</button>
    <button id="prev" title="Previous (&larr;)">&lsaquo;&nbsp;Prev</button>
    <div class="ctr"><span id="title"></span><span id="date"></span></div>
    <button id="next" title="Next (&rarr;)">Next&nbsp;&rsaquo;</button>
    <button id="latest" title="Latest strip">&raquo;</button>
  </div>
  <div class="stage"><img id="art" alt=""/></div>
  <div class="bar">
    <span class="rating"><span class="rk">editor</span><span class="sc" id="sc"></span>
      <span class="meter" title="log scale · 1 to 10B reach"><i id="mtr"></i></span></span>
    <span class="eng">
      <button class="uv" id="uv">&#9650; <b id="uvn">0</b> <span class="lbl">upvote</span></button>
      <a class="cm" href="#comments">&#128172; <span id="cmc">0</span></a>
    </span>
  </div>
  <p class="note" id="ednote"></p>
  <section id="comments">
    <h2>Comments <span id="ch"></span></h2>
    <p class="prev">Preview &mdash; comments are saved in your browser until the shared backend is connected.</p>
    <form id="cform">
      <input id="cname" maxlength="40" placeholder="name (optional)"/>
      <textarea id="ctext" maxlength="800" rows="3" placeholder="Say something about this strip…"></textarea>
      <button type="submit">Post comment</button>
    </form>
    <ul id="clist"></ul>
  </section>
  <div class="nav bottom">
    <button id="prev2">&lsaquo;&nbsp;Prev</button>
    <button id="next2">Next&nbsp;&rsaquo;</button>
  </div>
</div>
<script>
var M = ${data};
function fmtReach(n){n=Math.max(1,Math.round(n));if(n<1000)return''+n;var u=['K','M','B','T'],i=-1,x=n;while(x>=1000&&i<3){x/=1000;i++;}return (x<10?x.toFixed(1):Math.round(x))+u[i];}
function pct(n){return (Math.log10(Math.max(1,n))/10*100).toFixed(2);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function byId(id){for(var i=0;i<M.length;i++)if(M[i].id===id)return i;return -1;}
function todayIdx(){var t=new Date().toISOString().slice(0,10),idx=0;for(var i=0;i<M.length;i++){if(M[i].date<=t)idx=i;}return idx;}
function ukey(id){return 'dv.up.'+id;} function ckey(id){return 'dv.cm.'+id;}
function loadC(id){try{return JSON.parse(localStorage.getItem(ckey(id))||'[]');}catch(e){return [];}}
function saveC(id,a){localStorage.setItem(ckey(id),JSON.stringify(a));}
var cur=(function(){var p=new URLSearchParams(location.search).get('id');var i=p?byId(p):-1;return i>=0?i:todayIdx();})();
function $(x){return document.getElementById(x);}
function renderComments(){var s=M[cur],arr=loadC(s.id);$('cmc').textContent=arr.length;$('ch').textContent='('+arr.length+')';var ul=$('clist');ul.innerHTML='';arr.slice().reverse().forEach(function(c){var li=document.createElement('li');var d=new Date(c.ts);li.innerHTML='<div class="ch"><b>'+esc(c.name||'anon')+'</b><span class="ts">'+d.toLocaleDateString()+'</span></div><div class="cb">'+esc(c.text)+'</div>';ul.appendChild(li);});}
function render(){var s=M[cur];$('art').src='strips/'+s.id+'.svg';$('art').alt=s.title;$('title').textContent=s.title;$('date').textContent=s.date;$('sc').textContent=fmtReach(s.audience);$('mtr').style.width=pct(s.audience)+'%';$('ednote').textContent=s.note?('editor \\u2014 '+s.note):'';var voted=localStorage.getItem(ukey(s.id))==='1';$('uv').classList.toggle('voted',voted);$('uvn').textContent=voted?1:0;renderComments();$('prev').disabled=$('prev2').disabled=(cur<=0);$('next').disabled=$('next2').disabled=(cur>=M.length-1);document.title='DAILBERT \\u2014 '+s.title;}
function go(i){if(i<0||i>=M.length)return;cur=i;try{history.replaceState(null,'','?id='+M[cur].id);}catch(e){}render();window.scrollTo(0,0);}
$('uv').addEventListener('click',function(){var s=M[cur];if(localStorage.getItem(ukey(s.id))==='1')localStorage.removeItem(ukey(s.id));else localStorage.setItem(ukey(s.id),'1');render();});
$('cform').addEventListener('submit',function(e){e.preventDefault();var s=M[cur],t=$('ctext').value.trim();if(!t)return;var arr=loadC(s.id);arr.push({name:$('cname').value.trim(),text:t,ts:Date.now()});saveC(s.id,arr);$('ctext').value='';renderComments();});
$('first').addEventListener('click',function(){go(0);});
$('latest').addEventListener('click',function(){go(M.length-1);});
$('prev').addEventListener('click',function(){go(cur-1);});
$('next').addEventListener('click',function(){go(cur+1);});
$('prev2').addEventListener('click',function(){go(cur-1);});
$('next2').addEventListener('click',function(){go(cur+1);});
document.addEventListener('keydown',function(e){if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;if(e.key==='ArrowLeft')go(cur-1);else if(e.key==='ArrowRight')go(cur+1);});
render();
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
const manifest = strips.map((s) => ({
  id: s.id, title: s.title, date: s.date,
  audience: (ratings[s.id] && ratings[s.id].audience) || 1,
  note: (ratings[s.id] && ratings[s.id].note) || '',
}));
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(join(ROOT, 'archive.html'), archive(strips, ratings));
writeFileSync(join(ROOT, 'index.html'), solo(manifest));
console.log(`rendered ${strips.length} strips (${inked} Fable-inked); index.html=solo viewer, archive.html=ratings grid`);
