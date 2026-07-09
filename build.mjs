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
  const sigY = titleH + PANEL.h - 8; // faint signature, bottom-right corner of the art
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H}" width="${totalW}" height="${H}" font-family="Georgia,serif">
    <rect width="${totalW}" height="${H}" fill="${PAPER}"/>
    <text x="6" y="29" font-family="Georgia,serif" font-weight="bold" font-size="27" letter-spacing="2" fill="${INK}">DAILBERT</text>
    <text x="${totalW - 6}" y="19" text-anchor="end" font-family="Georgia,serif" font-style="italic" font-size="16" fill="${INK}">${strip.title}</text>
    <text x="${totalW - 6}" y="34" text-anchor="end" font-family="'Courier New',monospace" font-size="12" fill="${INK}" opacity="0.65">${strip.date}</text>
    <line x1="6" y1="37" x2="${totalW - 6}" y2="37" stroke="${INK}" stroke-width="2"/>
    ${panelsSvg}
    <text x="${totalW - 10}" y="${sigY}" text-anchor="end" font-family="'Segoe Script','Comic Sans MS',cursive" font-style="italic" font-size="11" fill="${INK}" opacity="0.32">Matt Clanker</text>
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

// Shared client sync module. Mirrors the AWS desk backend into localStorage so the
// existing pages read/write exactly as before, but now cross-device & persistent.
// - pull(cb): fetch remote truth, overwrite the localStorage mirror, then cb(state).
// - vote/comment/published/chosen: optimistic localStorage + POST (needs desk key).
// Offline or keyless -> silently no-ops the POST; committed baselines still seed.
function deskSync(desk) {
  return `<script>
var DESK = ${JSON.stringify(desk || { api: '' })};
var Desk = (function () {
  var api = (DESK && DESK.api) || '';
  function key() { try { return localStorage.getItem('dv.key') || ''; } catch (e) { return ''; } }
  function clearPrefix(p) { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(p) === 0) localStorage.removeItem(k); } }
  function pull(cb) {
    if (!api) { if (cb) cb(null); return; }
    fetch(api + '/', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) {
      try {
        localStorage.setItem('dv.pub', JSON.stringify(s.published || []));
        localStorage.setItem('dv.chosen', JSON.stringify(s.chosen || {}));
        clearPrefix('dv.v.'); var V = s.votes || {}; for (var id in V) localStorage.setItem('dv.v.' + id, String(V[id]));
        clearPrefix('dv.cm.'); var C = s.comments || {}; for (var cid in C) localStorage.setItem('dv.cm.' + cid, JSON.stringify(C[cid]));
      } catch (e) {}
      if (cb) cb(s);
    }).catch(function () { if (cb) cb(null); });
  }
  function post(body) {
    if (!api || !key()) return Promise.resolve(false);
    return fetch(api + '/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-desk-key': key() }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  return {
    api: api,
    hasKey: function () { return !!key(); },
    setKey: function (k) { try { localStorage.setItem('dv.key', k); } catch (e) {} },
    pull: pull,
    vote: function (id, v) { return post({ op: 'vote', id: id, v: v }); },
    comment: function (id, name, text, ts) { return post({ op: 'comment', id: id, name: name, text: text, ts: ts }); },
    published: function (ids) { return post({ op: 'published', ids: ids }); },
    chosen: function (map) { return post({ op: 'chosen', map: map }); }
  };
})();
</` + `script>`;
}

function archive(strips, ratings, forced = [], reviews = { votes: {}, comments: {} }, desk = { api: '' }, chosenBase = {}) {
  const items = strips.map((s, i) => {
    const r = ratings[s.id] || {};
    const a = r.audience || 1;
    return `
    <figure id="${s.id}" class="strip" data-audience="${a}" data-index="${i}" data-date="${s.date}" style="order:${i}">
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
          <span class="vote" data-id="${s.id}"><button class="up" title="Upvote">&#9650;</button><b class="vn">0</b><button class="down" title="Downvote">&#9660;</button></span>
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
  .cm { font-family:'Courier New',monospace; font-size:14px; border:1.5px solid var(--ink); background:transparent;
        color:inherit; border-radius:20px; padding:5px 12px; cursor:pointer; text-decoration:none;
        display:inline-flex; align-items:center; gap:6px; opacity:.85; }
  .vote { display:inline-flex; align-items:center; gap:6px; border:1.5px solid var(--ink); border-radius:20px;
          padding:3px 10px; font-family:'Courier New',monospace; }
  .vote button { border:none; background:transparent; color:inherit; cursor:pointer; font-size:13px; line-height:1;
                 padding:2px 3px; opacity:.5; }
  .vote button.on { opacity:1; transform:scale(1.18); }
  .vote .vn { min-width:16px; text-align:center; font-weight:bold; font-size:14px; }
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
${deskSync(desk)}
<script>
// committed review baseline — seed votes/comments into localStorage on first visit
var BASE = ${JSON.stringify(reviews)};
var CHOSENBASE = ${JSON.stringify(chosenBase)};
(function(){try{var V=BASE.votes||{};for(var id in V){if(localStorage.getItem('dv.v.'+id)===null)localStorage.setItem('dv.v.'+id,String(V[id]));}var C=BASE.comments||{};for(var cid in C){if(localStorage.getItem('dv.cm.'+cid)===null)localStorage.setItem('dv.cm.'+cid,JSON.stringify(C[cid]));}if(localStorage.getItem('dv.chosen')===null)localStorage.setItem('dv.chosen',JSON.stringify(CHOSENBASE));}catch(e){}})();
function boot() {
  var main = document.querySelector('main');
  // nothing is public by date — only un-drafted (force-published) strips show. The rest
  // stay hidden drafts (still in source). Manage at admin.html.
  var FORCED = ${JSON.stringify(forced)};
  var lp = [];
  try { lp = JSON.parse(localStorage.getItem('dv.pub') || '[]'); } catch (e) {}
  var chosen = {}; try { chosen = JSON.parse(localStorage.getItem('dv.chosen') || '{}'); } catch (e) {}
  var byDate = {};
  Array.prototype.slice.call(main.querySelectorAll('.strip')).forEach(function (f) { (byDate[f.dataset.date] = byDate[f.dataset.date] || []).push(f.id); });
  function isWinner(f) { var d = f.dataset.date; return chosen[d] ? chosen[d] === f.id : byDate[d].length === 1; }
  Array.prototype.slice.call(main.querySelectorAll('.strip')).forEach(function (f) {
    if (!((FORCED.indexOf(f.id) >= 0 || lp.indexOf(f.id) >= 0) && isWinner(f))) f.remove();
  });
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
    var vn = f.querySelector('.vn'), up = f.querySelector('.up'), down = f.querySelector('.down');
    function gv() { var v = localStorage.getItem('dv.v.' + id); return v === '1' ? 1 : (v === '-1' ? -1 : 0); }
    function draw() { var v = gv(); if (vn) vn.textContent = v; if (up) up.classList.toggle('on', v === 1); if (down) down.classList.toggle('on', v === -1); }
    function setv(val) { if (val === 0) localStorage.removeItem('dv.v.' + id); else localStorage.setItem('dv.v.' + id, String(val)); draw(); Desk.vote(id, val); }
    if (up) up.addEventListener('click', function (e) { e.preventDefault(); setv(gv() === 1 ? 0 : 1); });
    if (down) down.addEventListener('click', function (e) { e.preventDefault(); setv(gv() === -1 ? 0 : -1); });
    draw();
    var cc = 0; try { cc = JSON.parse(localStorage.getItem('dv.cm.' + id) || '[]').length; } catch (e) {}
    var cmn = f.querySelector('.cmn'); if (cmn) cmn.textContent = cc;
  });
}
Desk.pull(boot);
</script>`;
}

// ---- solo viewer (index.html): today's comic + prev/next + score + upvote + comments ----
function solo(manifest, forced = [], reviews = { votes: {}, comments: {} }, desk = { api: '' }, chosenBase = {}) {
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
  .cm { font-family:'Courier New',monospace; font-size:15px; border:1.5px solid var(--ink); background:transparent;
        color:inherit; border-radius:22px; padding:8px 16px; cursor:pointer; text-decoration:none;
        display:inline-flex; align-items:center; gap:7px; }
  .vote { display:inline-flex; align-items:center; gap:8px; border:1.5px solid var(--ink); border-radius:22px;
          padding:6px 14px; font-family:'Courier New',monospace; }
  .vote button { border:none; background:transparent; color:inherit; cursor:pointer; font-size:16px; line-height:1;
                 padding:2px 4px; opacity:.5; }
  .vote button.on { opacity:1; transform:scale(1.2); }
  .vote .vn { min-width:20px; text-align:center; font-weight:bold; font-size:17px; }
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
      <span class="vote"><button class="up" id="up" title="Upvote">&#9650;</button><b id="vn">0</b><button class="down" id="down" title="Downvote">&#9660;</button></span>
      <a class="cm" href="#comments">&#128172; <span id="cmc">0</span></a>
    </span>
  </div>
  <p class="note" id="ednote"></p>
  <section id="comments">
    <h2>Comments <span id="ch"></span></h2>
    <p class="prev">Comments are kept on the shared desk across devices.</p>
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
${deskSync(desk)}
<script>
var ALL = ${data};
var M = ALL;
var FORCED = ${JSON.stringify(forced)};
// public visibility: NOTHING is public by date. A strip only shows once it's
// un-drafted — force-published in world/published.json, or toggled on the admin
// desk (localStorage 'dv.pub' preview). Every unpublished strip stays a hidden draft.
// committed review baseline — seed into localStorage on first visit / new device so
// votes & comments persist everywhere (Matt reviews -> "save" -> committed here).
var BASE = ${JSON.stringify(reviews)};
var CHOSENBASE = ${JSON.stringify(chosenBase)};
(function(){try{var V=BASE.votes||{};for(var id in V){if(localStorage.getItem('dv.v.'+id)===null)localStorage.setItem('dv.v.'+id,String(V[id]));}var C=BASE.comments||{};for(var cid in C){if(localStorage.getItem('dv.cm.'+cid)===null)localStorage.setItem('dv.cm.'+cid,JSON.stringify(C[cid]));}if(localStorage.getItem('dv.chosen')===null)localStorage.setItem('dv.chosen',JSON.stringify(CHOSENBASE));}catch(e){}})();
function chosenMap(){try{return JSON.parse(localStorage.getItem('dv.chosen')||'{}');}catch(e){return {};}}
// winner of a date = the picked candidate, or the sole candidate if only one exists
function winnerId(date){var ch=chosenMap();if(ch[date])return ch[date];var c=ALL.filter(function(x){return x.date===date;});return c.length===1?c[0].id:null;}
// public = published AND is its day's winner (multi-candidate days need an explicit pick)
function applyPub(){var lp=[];try{lp=JSON.parse(localStorage.getItem('dv.pub')||'[]');}catch(e){}M=ALL.filter(function(s){return (FORCED.indexOf(s.id)>=0||lp.indexOf(s.id)>=0)&&winnerId(s.date)===s.id;});}
applyPub();
function fmtReach(n){n=Math.max(1,Math.round(n));if(n<1000)return''+n;var u=['K','M','B','T'],i=-1,x=n;while(x>=1000&&i<3){x/=1000;i++;}return (x<10?x.toFixed(1):Math.round(x))+u[i];}
function pct(n){return (Math.log10(Math.max(1,n))/10*100).toFixed(2);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function byId(id){for(var i=0;i<M.length;i++)if(M[i].id===id)return i;return -1;}
function todayIdx(){var t=new Date().toISOString().slice(0,10),idx=0;for(var i=0;i<M.length;i++){if(M[i].date<=t)idx=i;}return idx;}
function vkey(id){return 'dv.v.'+id;} function ckey(id){return 'dv.cm.'+id;}
function getV(id){var v=localStorage.getItem(vkey(id));return v==='1'?1:(v==='-1'?-1:0);}
function setV(id,val){if(val===0)localStorage.removeItem(vkey(id));else localStorage.setItem(vkey(id),String(val));}
function loadC(id){try{return JSON.parse(localStorage.getItem(ckey(id))||'[]');}catch(e){return [];}}
function saveC(id,a){localStorage.setItem(ckey(id),JSON.stringify(a));}
var HASID=!!new URLSearchParams(location.search).get('id');
var cur=(function(){var p=new URLSearchParams(location.search).get('id');var i=p?byId(p):-1;return i>=0?i:todayIdx();})();
function $(x){return document.getElementById(x);}
function renderComments(){var s=M[cur],arr=loadC(s.id);$('cmc').textContent=arr.length;$('ch').textContent='('+arr.length+')';var ul=$('clist');ul.innerHTML='';arr.slice().reverse().forEach(function(c){var li=document.createElement('li');var d=new Date(c.ts);li.innerHTML='<div class="ch"><b>'+esc(c.name||'anon')+'</b><span class="ts">'+d.toLocaleDateString()+'</span></div><div class="cb">'+esc(c.text)+'</div>';ul.appendChild(li);});}
function render(){if(!M.length){var st=document.querySelector('.stage');if(st)st.innerHTML='<p style="padding:70px 24px;text-align:center;font-style:italic;opacity:.55;font-size:18px">Nothing published yet.<br><span style="font-size:13px;font-family:monospace">un-draft a strip at <a href="admin.html">the desk</a></span></p>';['title','date','sc','ednote'].forEach(function(x){var e=$(x);if(e)e.textContent='';});['first','prev','next','latest','prev2','next2'].forEach(function(x){var e=$(x);if(e)e.disabled=true;});document.title='DAILBERT';return;}var s=M[cur];$('art').src='strips/'+s.id+'.svg';$('art').alt=s.title;$('title').textContent=s.title;$('date').textContent=s.date;$('sc').textContent=fmtReach(s.audience);$('mtr').style.width=pct(s.audience)+'%';$('ednote').textContent=s.note?('editor \\u2014 '+s.note):'';var v=getV(s.id);$('vn').textContent=v;$('up').classList.toggle('on',v===1);$('down').classList.toggle('on',v===-1);renderComments();$('prev').disabled=$('prev2').disabled=(cur<=0);$('next').disabled=$('next2').disabled=(cur>=M.length-1);document.title='DAILBERT \\u2014 '+s.title;}
function go(i){if(i<0||i>=M.length)return;cur=i;try{history.replaceState(null,'','?id='+M[cur].id);}catch(e){}render();window.scrollTo(0,0);}
$('up').addEventListener('click',function(){if(!M[cur])return;var id=M[cur].id,nv=getV(id)===1?0:1;setV(id,nv);render();Desk.vote(id,nv);});
$('down').addEventListener('click',function(){if(!M[cur])return;var id=M[cur].id,nv=getV(id)===-1?0:-1;setV(id,nv);render();Desk.vote(id,nv);});
$('cform').addEventListener('submit',function(e){e.preventDefault();if(!M[cur])return;var s=M[cur],t=$('ctext').value.trim();if(!t)return;var nm=$('cname').value.trim(),ts=Date.now();var arr=loadC(s.id);arr.push({name:nm,text:t,ts:ts});saveC(s.id,arr);$('ctext').value='';renderComments();Desk.comment(s.id,nm,t,ts);});
$('first').addEventListener('click',function(){go(0);});
$('latest').addEventListener('click',function(){go(M.length-1);});
$('prev').addEventListener('click',function(){go(cur-1);});
$('next').addEventListener('click',function(){go(cur+1);});
$('prev2').addEventListener('click',function(){go(cur-1);});
$('next2').addEventListener('click',function(){go(cur+1);});
document.addEventListener('keydown',function(e){if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;if(e.key==='ArrowLeft')go(cur-1);else if(e.key==='ArrowRight')go(cur+1);});
render();
// after remote truth arrives, re-filter; land on today's strip unless the user opened a specific one
Desk.pull(function(){applyPub();if(!HASID){cur=todayIdx();}else{if(cur>=M.length)cur=M.length-1;}if(cur<0)cur=todayIdx();render();});
</script>`;
}

// ---- admin.html (unlisted easter egg): every strip, draft vs published, publish toggle ----
function admin(manifest, forced = [], reviews = { votes: {}, comments: {} }, desk = { api: '' }) {
  const data = JSON.stringify(manifest).replace(/</g, '\\u003c');
  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>DAILBERT — desk</title>
<style>
  * { box-sizing:border-box; }
  body { margin:0; background:#14140f; color:#e8e4d8; font-family:'Courier New',monospace; }
  header { padding:22px 18px 8px; border-bottom:1px solid #333; }
  header h1 { margin:0; font-family:Georgia,serif; letter-spacing:3px; font-size:26px; }
  header .sub { opacity:.55; font-size:12px; margin-top:4px; }
  .stat { display:flex; gap:18px; margin:12px 0 0; font-size:13px; }
  .stat b { font-size:20px; }
  .pub-cnt { color:#8fce8f; } .drf-cnt { color:#e0b060; }
  .export { margin:14px 18px; padding:10px 12px; background:#1c1c15; border:1px solid #333; border-radius:6px; }
  .export textarea { width:100%; min-height:52px; background:#0d0d0a; color:#9fdca0; border:1px solid #333;
                     border-radius:4px; font-family:'Courier New',monospace; font-size:12px; padding:8px; resize:vertical; }
  .export .row { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .export button { font-family:inherit; font-size:12px; background:#2a2a20; color:inherit; border:1px solid #444;
                   border-radius:16px; padding:5px 13px; cursor:pointer; }
  .export .hint { opacity:.5; font-size:11px; }
  .sync { margin:14px 18px; padding:10px 12px; background:#12160f; border:1px solid #2c3a24; border-radius:6px;
          display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px; }
  .sync input { background:#0d0d0a; color:#9fdca0; border:1px solid #333; border-radius:4px;
                font-family:'Courier New',monospace; font-size:12px; padding:6px 8px; width:280px; }
  .sync button { font-family:inherit; font-size:12px; background:#2a2a20; color:inherit; border:1px solid #444;
                 border-radius:16px; padding:5px 13px; cursor:pointer; }
  .sync .dot { width:9px; height:9px; border-radius:50%; background:#555; display:inline-block; }
  .sync .dot.ok { background:#8fce8f; } .sync .dot.bad { background:#c66; }
  .sync .st { opacity:.75; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #262620; font-size:13px; vertical-align:middle; }
  th { position:sticky; top:0; background:#14140f; opacity:.6; font-weight:normal; font-size:11px;
       text-transform:uppercase; letter-spacing:1px; }
  tr.draft { background:rgba(224,176,96,.05); }
  td.th img { display:block; width:210px; height:auto; border:1px solid #333; background:#f4f1ea; }
  td.dt { white-space:nowrap; opacity:.8; }
  td.ti a { color:#e8e4d8; text-decoration:none; border-bottom:1px solid transparent; }
  td.ti a:hover { border-color:#666; }
  .badge { font-size:11px; padding:3px 9px; border-radius:12px; white-space:nowrap; }
  .badge.pub { background:#1e3a1e; color:#9fdca0; }
  .badge.drf { background:#3a2f14; color:#e0b060; }
  .badge.locked { opacity:.4; }
  .tog { font-family:inherit; font-size:12px; background:transparent; color:inherit; border:1px solid #555;
         border-radius:16px; padding:5px 12px; cursor:pointer; min-width:96px; }
  .tog.on { background:#e0b060; color:#14140f; border-color:#e0b060; }
  .sc { opacity:.65; }
  /* picker: one group per day, candidate cards side-by-side */
  .groups { padding:6px 14px 80px; }
  .day { border-top:1px solid #262620; padding:14px 4px 4px; }
  .day > .dh { display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:13px; }
  .day .dh .d { font-weight:bold; letter-spacing:1px; }
  .day .dh .cc { opacity:.5; font-size:12px; }
  .day .dh .pill { font-size:11px; padding:3px 10px; border-radius:12px; }
  .pill.live { background:#1e3a1e; color:#9fdca0; }
  .pill.ready { background:#2a2f3a; color:#9fb8dc; }
  .pill.needspick { background:#3a1e1e; color:#e29a9a; }
  .cands { display:flex; gap:14px; flex-wrap:wrap; }
  .cand { width:440px; max-width:100%; background:#1a1a12; border:1px solid #2c2c22; border-radius:8px; padding:10px; position:relative; }
  .cand.win { border-color:#e0b060; box-shadow:0 0 0 1px #e0b060 inset; }
  .cand.dim { opacity:.62; }
  .cand img { display:block; width:100%; height:auto; aspect-ratio:1228/340; border:1px solid #333; background:#f4f1ea; border-radius:3px; }
  .cand .t { font-size:12px; margin:8px 0 2px; color:#e8e4d8; }
  .cand .s { font-size:11px; opacity:.55; }
  .cand .crow { display:flex; align-items:center; gap:8px; margin-top:9px; flex-wrap:wrap; }
  .vote { display:inline-flex; align-items:center; gap:5px; border:1px solid #444; border-radius:14px; padding:2px 8px; }
  .vote b { min-width:14px; text-align:center; font-size:12px; }
  .vote button { border:none; background:transparent; color:inherit; cursor:pointer; font-size:12px; opacity:.5; padding:1px 3px; }
  .vote button.on { opacity:1; color:#e0b060; transform:scale(1.2); }
  .pick { font-family:inherit; font-size:12px; background:transparent; color:inherit; border:1px solid #555;
          border-radius:14px; padding:4px 11px; cursor:pointer; }
  .pick.win { background:#e0b060; color:#14140f; border-color:#e0b060; cursor:default; }
  .pubtog { font-family:inherit; font-size:12px; background:transparent; color:inherit; border:1px solid #3a5a3a;
            border-radius:14px; padding:4px 11px; cursor:pointer; }
  .pubtog.on { background:#1e3a1e; color:#9fdca0; border-color:#3a5a3a; }
  .cand .committed { font-size:11px; opacity:.4; }
</style>
<header>
  <h1>DAILBERT &middot; the desk</h1>
  <div class="sub">unlisted. one row per day; when a day has more than one candidate, <b>pick the keeper</b>. the public site shows each day's picked winner once it's published. vote &#9650;/&#9660; to steer the cartoonist. everything persists to the shared desk.</div>
  <div class="stat"><span class="pub-cnt"><b id="np">0</b> live days</span><span class="drf-cnt"><b id="nd">0</b> unpublished</span><span class="sc"><b id="nt">0</b> days</span></div>
</header>
<div class="sync">
  <span class="dot" id="syncdot"></span><span class="st" id="syncst">checking backend…</span>
  <input id="keyin" type="password" placeholder="desk key (paste once)" autocomplete="off"/>
  <button id="keybtn">connect</button>
  <span class="hint" id="synchint"></span>
</div>
<div class="export">
  <div class="row"><b>Snapshot</b><button id="copy">copy</button><span id="savedhint" class="hint">picks &amp; votes now persist live to the AWS desk (above). This is just an optional repo snapshot &mdash; hand to Claude to bake <code>world/published.json</code> + <code>world/reviews.json</code> into git.</span></div>
  <textarea id="exp" readonly></textarea>
</div>
<div id="groups" class="groups"></div>
${deskSync(desk)}
<script>
var M = ${data};
var FORCED = ${JSON.stringify(forced)};
var BASE = ${JSON.stringify(reviews)};
var CHOSENBASE = ${JSON.stringify(chosenBase)};
// seed committed baselines into localStorage on first visit / new device
(function(){try{var V=BASE.votes||{};for(var id in V){if(localStorage.getItem('dv.v.'+id)===null)localStorage.setItem('dv.v.'+id,String(V[id]));}var C=BASE.comments||{};for(var cid in C){if(localStorage.getItem('dv.cm.'+cid)===null)localStorage.setItem('dv.cm.'+cid,JSON.stringify(C[cid]));}if(localStorage.getItem('dv.chosen')===null)localStorage.setItem('dv.chosen',JSON.stringify(CHOSENBASE));}catch(e){}})();
function lp(){try{return JSON.parse(localStorage.getItem('dv.pub')||'[]');}catch(e){return [];}}
function setlp(a){localStorage.setItem('dv.pub',JSON.stringify(a));}
function chosenMap(){try{return JSON.parse(localStorage.getItem('dv.chosen')||'{}');}catch(e){return {};}}
function setChosen(m){localStorage.setItem('dv.chosen',JSON.stringify(m));}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmtReach(n){n=Math.max(1,Math.round(n));if(n<1000)return''+n;var u=['K','M','B','T'],i=-1,x=n;while(x>=1000&&i<3){x/=1000;i++;}return (x<10?x.toFixed(1):Math.round(x))+u[i];}
function isForced(id){return FORCED.indexOf(id)>=0;}
function isPubId(id){return isForced(id)||lp().indexOf(id)>=0;}
function getV(id){var v=localStorage.getItem('dv.v.'+id);return v==='1'?1:(v==='-1'?-1:0);}
// group strips by day; best editorial candidate first
var byDate={};M.forEach(function(s){(byDate[s.date]=byDate[s.date]||[]).push(s);});
Object.keys(byDate).forEach(function(d){byDate[d].sort(function(a,b){return (b.audience-a.audience)||(a.id<b.id?-1:1);});});
function winnerId(d){var ch=chosenMap();if(ch[d])return ch[d];var c=byDate[d];return c.length===1?c[0].id:null;}
function statusOf(d){var w=winnerId(d);if(!w)return 'needspick';return isPubId(w)?'live':'ready';}
function pickWinner(d,id){
  var ch=chosenMap(),old=ch[d];ch[d]=id;setChosen(ch);
  // if the day was published through its old winner, move publish to the new winner
  if(old&&old!==id){var a=lp(),i=a.indexOf(old);if(i>=0){a.splice(i,1);if(a.indexOf(id)<0)a.push(id);setlp(a);Desk.published(a);}}
  Desk.chosen(ch);render();
}
function togglePub(id){var a=lp(),i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id);setlp(a);Desk.published(a);render();}
function vote(id,dir){var nv=getV(id)===dir?0:dir;if(nv===0)localStorage.removeItem('dv.v.'+id);else localStorage.setItem('dv.v.'+id,String(nv));Desk.vote(id,nv);render();}
function render(){
  var wrap=document.getElementById('groups');wrap.innerHTML='';
  var live=0,unpub=0;
  // days needing a pick float to the top; then newest/future first
  var order=Object.keys(byDate).sort(function(a,b){var na=statusOf(a)==='needspick'?0:1,nb=statusOf(b)==='needspick'?0:1;if(na!==nb)return na-nb;return a<b?1:(a>b?-1:0);});
  order.forEach(function(d){
    var cands=byDate[d],w=winnerId(d),st=statusOf(d);
    if(st==='live')live++;else unpub++;
    var day=document.createElement('div');day.className='day';
    var pill=st==='live'?'<span class="pill live">live</span>':(st==='ready'?'<span class="pill ready">picked \\u00b7 unpublished</span>':'<span class="pill needspick">pick one</span>');
    day.innerHTML='<div class="dh"><span class="d">'+d+'</span>'+pill+'<span class="cc">'+cands.length+(cands.length>1?' candidates':' candidate')+'</span></div>';
    var row=document.createElement('div');row.className='cands';
    cands.forEach(function(s){
      var isWin=(w===s.id),v=getV(s.id);
      var c=document.createElement('div');c.className='cand'+(isWin?' win':'')+((w&&!isWin)?' dim':'');
      var pickBtn=cands.length===1?'':(isWin?'<button class="pick win" disabled>picked \\u2713</button>':'<button class="pick" data-pick="'+s.id+'" data-date="'+d+'">pick</button>');
      var pubBtn=isForced(s.id)?'<span class="committed">committed</span>':(isWin?'<button class="pubtog'+(isPubId(s.id)?' on':'')+'" data-pub="'+s.id+'">'+(isPubId(s.id)?'published':'publish')+'</button>':'');
      c.innerHTML='<a href="index.html?id='+s.id+'"><img loading="lazy" src="strips/'+s.id+'.svg" alt=""/></a>'+
        '<div class="t">'+esc(s.title)+'</div><div class="s">editor '+fmtReach(s.audience)+'</div>'+
        '<div class="crow"><span class="vote"><button class="vb'+(v===1?' on':'')+'" data-up="'+s.id+'">\\u25b2</button><b>'+v+'</b><button class="vb'+(v===-1?' on':'')+'" data-down="'+s.id+'">\\u25bc</button></span>'+pickBtn+pubBtn+'</div>';
      row.appendChild(c);
    });
    day.appendChild(row);wrap.appendChild(day);
  });
  document.getElementById('np').textContent=live;
  document.getElementById('nd').textContent=unpub;
  document.getElementById('nt').textContent=Object.keys(byDate).length;
  // snapshot: published + chosen + votes + comments from localStorage
  var pubset={};FORCED.forEach(function(id){pubset[id]=1;});lp().forEach(function(id){pubset[id]=1;});
  var votes={},comments={};
  for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);
    if(k.indexOf('dv.v.')===0){var vv=localStorage.getItem(k);if(vv==='1'||vv==='-1')votes[k.slice(5)]=parseInt(vv,10);}
    else if(k.indexOf('dv.cm.')===0){try{var a=JSON.parse(localStorage.getItem(k));if(a&&a.length)comments[k.slice(6)]=a;}catch(e){}}
  }
  document.getElementById('exp').value=JSON.stringify({published:Object.keys(pubset).sort(),chosen:chosenMap(),votes:votes,comments:comments},null,2);
}
document.getElementById('groups').addEventListener('click',function(e){
  var t=e.target.closest('button');if(!t)return;
  if(t.dataset.pick)pickWinner(t.dataset.date,t.dataset.pick);
  else if(t.dataset.pub)togglePub(t.dataset.pub);
  else if(t.dataset.up)vote(t.dataset.up,1);
  else if(t.dataset.down)vote(t.dataset.down,-1);
});
document.getElementById('copy').addEventListener('click',function(){
  var t=document.getElementById('exp');t.select();try{document.execCommand('copy');this.textContent='copied';var self=this;setTimeout(function(){self.textContent='copy';},1200);}catch(e){}
});
// backend status + desk key
function setStatus(cls,txt){var d=document.getElementById('syncdot'),s=document.getElementById('syncst');if(d)d.className='dot'+(cls?' '+cls:'');if(s)s.textContent=txt;}
function refreshStatus(){
  if(!Desk.api){setStatus('bad','no backend (world/desk.json missing)');return;}
  setStatus('',Desk.hasKey()?'connected · writes persist to everyone':'read-only — paste desk key to publish/pick from here');
  document.getElementById('synchint').textContent=Desk.hasKey()?'':'until connected, toggles preview only in this browser';
  var ki=document.getElementById('keyin');if(ki&&Desk.hasKey())ki.placeholder='desk key set ✓ (paste to replace)';
}
document.getElementById('keybtn').addEventListener('click',function(){
  var v=document.getElementById('keyin').value.trim();if(!v)return;Desk.setKey(v);document.getElementById('keyin').value='';
  setStatus('','verifying…');
  Desk.published(lp()).then(function(ok){setStatus(ok?'ok':'bad',ok?'connected · writes persist to everyone':'key rejected');refreshStatus();});
});
setStatus('','loading…');refreshStatus();
Desk.pull(function(s){ if(Desk.api) setStatus(s?'ok':'bad', s?(Desk.hasKey()?'connected · writes persist to everyone':'live · paste desk key to publish/pick'):'backend unreachable'); render(); });
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
const pubPath = join(ROOT, 'world', 'published.json');
const forced = existsSync(pubPath) ? JSON.parse(readFileSync(pubPath, 'utf8')) : [];
const reviewsPath = join(ROOT, 'world', 'reviews.json');
const reviews = existsSync(reviewsPath) ? JSON.parse(readFileSync(reviewsPath, 'utf8')) : { votes: {}, comments: {} };
const deskPath = join(ROOT, 'world', 'desk.json');
const desk = existsSync(deskPath) ? JSON.parse(readFileSync(deskPath, 'utf8')) : { api: '' };
const chosenPath = join(ROOT, 'world', 'chosen.json');
const chosenBase = existsSync(chosenPath) ? JSON.parse(readFileSync(chosenPath, 'utf8')) : {};
const manifest = strips.map((s) => ({
  id: s.id, title: s.title, date: s.date,
  audience: (ratings[s.id] && ratings[s.id].audience) || 1,
  note: (ratings[s.id] && ratings[s.id].note) || '',
}));
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(join(ROOT, 'archive.html'), archive(strips, ratings, forced, reviews, desk, chosenBase));
writeFileSync(join(ROOT, 'index.html'), solo(manifest, forced, reviews, desk, chosenBase));
writeFileSync(join(ROOT, 'admin.html'), admin(manifest, forced, reviews, desk, chosenBase));
const pub = strips.filter((s) => forced.includes(s.id)).length;
console.log(`rendered ${strips.length} strips (${inked} Fable-inked); ${pub} published, ${strips.length - pub} drafts. index/archive/admin written.`);
