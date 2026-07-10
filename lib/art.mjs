// art.mjs — Dailbert black-and-white line-art engine.
// Everything is hand-authored SVG. Characters are drawn as consistent "busts"
// (waist-up) so the cast is identical strip to strip. The clanker is NEVER a
// physical figure — it can only be rendered *inside a surface* (monitor, window
// reflection, mug sheen, glasses, projector). The data model enforces this: a
// panel's `surface.line` is the only channel through which a clanker speaks.

export const PANEL = { w: 400, h: 340, pad: 16 };
export const INK = '#111';
export const PAPER = '#f4f1ea';

// ---------- low-level helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function g(children, attrs = '') { return `<g ${attrs}>${children}</g>`; }
function path(d, extra = '') { return `<path d="${d}" ${extra}/>`; }
const stroke = (w = 3) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const fillW = (w = 3) => `fill="${PAPER}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const fillK = () => `fill="${INK}" stroke="none"`;

// crude but reliable word-wrap by character budget
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const wd of words) {
    if (!cur) { cur = wd; continue; }
    if ((cur + ' ' + wd).length <= maxChars) cur += ' ' + wd;
    else { lines.push(cur); cur = wd; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- halftone screen (for shading / "screen glow") ----------
export function halftoneDefs() {
  return `
  <defs>
    <pattern id="halftone" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="${PAPER}"/>
      <circle cx="3" cy="3" r="1.1" fill="${INK}"/>
    </pattern>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="none"/>
      <line x1="0" y1="0" x2="4" y2="0" stroke="${INK}" stroke-width="0.6" opacity="0.5"/>
    </pattern>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="${INK}" stroke-width="1"/>
    </pattern>
  </defs>`;
}

// ============================================================
//  THE CLANKER  — only ever drawn inside a surface
// ============================================================
// expr: 'idle' | 'narrow' (deadpan) | 'wide' (alarm) | 'soft' (wistful)
export function clankerFace(cx, cy, s = 1, expr = 'idle') {
  const eye = {
    idle:   { w: 16, h: 9,  y: -6 },
    narrow: { w: 18, h: 4,  y: -5 },
    wide:   { w: 15, h: 15, y: -8 },
    soft:   { w: 14, h: 6,  y: -5 },
  }[expr] || { w: 16, h: 9, y: -6 };
  const P = (x, y) => `${cx + x * s},${cy + y * s}`;
  const grille = [];
  for (let i = -2; i <= 2; i++) grille.push(`<line x1="${cx + i * 6 * s}" y1="${cy + 14 * s}" x2="${cx + i * 6 * s}" y2="${cy + 22 * s}" stroke="${INK}" stroke-width="${2 * s}"/>`);
  return g(`
    <!-- antenna -->
    <line x1="${cx}" y1="${cy - 30 * s}" x2="${cx}" y2="${cy - 40 * s}" stroke="${INK}" stroke-width="${2.5 * s}"/>
    <circle cx="${cx}" cy="${cy - 43 * s}" r="${3.5 * s}" fill="${INK}"/>
    <!-- head: angular chrome -->
    <path d="M ${P(-30, -28)} L ${P(30, -28)} L ${P(34, 10)} L ${P(22, 26)} L ${P(-22, 26)} L ${P(-34, 10)} Z" ${fillW(3 * s)}/>
    <!-- side bolts -->
    <circle cx="${cx - 30 * s}" cy="${cy - 6 * s}" r="${2.5 * s}" fill="${INK}"/>
    <circle cx="${cx + 30 * s}" cy="${cy - 6 * s}" r="${2.5 * s}" fill="${INK}"/>
    <!-- brow ridge -->
    <line x1="${cx - 26 * s}" y1="${cy - 16 * s}" x2="${cx + 26 * s}" y2="${cy - 16 * s}" stroke="${INK}" stroke-width="${2 * s}"/>
    <!-- glowing slot eyes -->
    <rect x="${cx - 20 * s}" y="${cy + (eye.y - eye.h / 2) * s}" width="${eye.w * s}" height="${eye.h * s}" rx="${2 * s}" fill="${INK}"/>
    <rect x="${cx + (20 - eye.w) * s}" y="${cy + (eye.y - eye.h / 2) * s}" width="${eye.w * s}" height="${eye.h * s}" rx="${2 * s}" fill="${INK}"/>
    <!-- mouth grille -->
    <rect x="${cx - 15 * s}" y="${cy + 12 * s}" width="${30 * s}" height="${12 * s}" rx="${2 * s}" ${stroke(2 * s)}/>
    ${grille.join('')}
  `);
}

// ============================================================
//  CHARACTER BUSTS  (physical, in the room)
//  Anchor: (x = horizontal center, base = panel bottom y). Bust ~ 210 tall.
// ============================================================

// mouth by expression
function mouth(cx, y, expr) {
  switch (expr) {
    case 'talk': return `<ellipse cx="${cx}" cy="${y}" rx="7" ry="6" ${fillW(2.5)}/>`;
    case 'smile': return path(`M ${cx - 12} ${y - 3} Q ${cx} ${y + 9} ${cx + 12} ${y - 3}`, stroke(2.5));
    case 'grin': return `<path d="M ${cx - 16} ${y - 4} Q ${cx} ${y + 14} ${cx + 16} ${y - 4} Z" ${fillW(2.5)}/><line x1="${cx - 12}" y1="${y}" x2="${cx + 12}" y2="${y}" stroke="${INK}" stroke-width="1.5"/>`;
    case 'frown': return path(`M ${cx - 11} ${y + 4} Q ${cx} ${y - 6} ${cx + 11} ${y + 4}`, stroke(2.5));
    case 'flat': default: return `<line x1="${cx - 11}" y1="${y}" x2="${cx + 11}" y2="${y}" stroke="${INK}" stroke-width="2.5"/>`;
  }
}

// DAILBERT — everyman: oval head, round glasses, one hair curl, tie.
export function dailbert(x, base, expr = 'flat', flip = false) {
  const f = flip ? -1 : 1;
  const hy = base - 202;            // head center y
  const body = `
    <!-- shoulders / shirt -->
    <path d="M ${x - 78} ${base} Q ${x - 74} ${base - 96} ${x - 40} ${base - 118} L ${x + 40} ${base - 118} Q ${x + 74} ${base - 96} ${x + 78} ${base} Z" ${fillW()}/>
    <!-- collar -->
    <path d="M ${x - 22} ${base - 116} L ${x} ${base - 96} L ${x + 22} ${base - 116}" ${stroke(2.5)}/>
    <!-- tie -->
    <path d="M ${x - 6} ${base - 102} L ${x + 6} ${base - 102} L ${x + 10} ${base - 60} L ${x} ${base - 48} L ${x - 10} ${base - 60} Z" ${fillK()}/>
    <path d="M ${x - 6} ${base - 102} L ${x} ${base - 92} L ${x + 6} ${base - 102}" fill="none" stroke="${PAPER}" stroke-width="2" stroke-linecap="round"/>`;
  const head = `
    <!-- neck (bridges chin to shoulders) -->
    <rect x="${x - 11}" y="${hy + 28}" width="22" height="66" ${fillW(2.5)}/>
    <!-- head -->
    <ellipse cx="${x}" cy="${hy}" rx="37" ry="43" ${fillW()}/>
    <!-- ears -->
    <circle cx="${x - 37}" cy="${hy + 2}" r="5" ${fillW(2.5)}/>
    <circle cx="${x + 37}" cy="${hy + 2}" r="5" ${fillW(2.5)}/>
    <!-- side hair tufts + one curl -->
    <path d="M ${x - 34} ${hy - 20} Q ${x - 42} ${hy - 6} ${x - 36} ${hy + 6}" ${stroke(2.5)}/>
    <path d="M ${x + 34} ${hy - 20} Q ${x + 42} ${hy - 6} ${x + 36} ${hy + 6}" ${stroke(2.5)}/>
    <path d="M ${x - 6} ${hy - 40} q ${6 * f} -14 ${16 * f} -8 q ${8 * f} 5 ${2 * f} 12" ${stroke(2.5)}/>
    <!-- glasses -->
    <circle cx="${x - 15}" cy="${hy - 4}" r="13" ${fillW(2.5)}/>
    <circle cx="${x + 15}" cy="${hy - 4}" r="13" ${fillW(2.5)}/>
    <line x1="${x - 2}" y1="${hy - 4}" x2="${x + 2}" y2="${hy - 4}" stroke="${INK}" stroke-width="2.5"/>
    <!-- eyes -->
    <circle cx="${x - 15}" cy="${hy - 4}" r="2.6" fill="${INK}"/>
    <circle cx="${x + 15}" cy="${hy - 4}" r="2.6" fill="${INK}"/>
    <!-- nose -->
    <path d="M ${x} ${hy + 4} q ${4 * f} 6 ${-2 * f} 9" ${stroke(2)}/>
    ${mouth(x, hy + 24, expr)}`;
  return g(body + head, `data-who="dailbert"`);
}

// DOUG — round, dim, ever-present mug, oblivious grin, dot eyes.
export function doug(x, base, expr = 'grin', flip = false) {
  const hy = base - 198;
  const body = `
    <path d="M ${x - 80} ${base} Q ${x - 78} ${base - 92} ${x - 42} ${base - 112} L ${x + 42} ${base - 112} Q ${x + 78} ${base - 92} ${x + 80} ${base} Z" ${fillW()}/>
    <!-- polo placket -->
    <line x1="${x}" y1="${base - 108}" x2="${x}" y2="${base - 70}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="${x}" cy="${base - 96}" r="2" fill="${INK}"/>
    <circle cx="${x}" cy="${base - 82}" r="2" fill="${INK}"/>
    <!-- mug in hand (lower right) -->
    <g transform="translate(${x + 52},${base - 40})">
      <rect x="-16" y="-20" width="32" height="34" rx="4" ${fillW(2.5)}/>
      <path d="M 16 -12 q 14 0 14 12 q 0 12 -14 12" ${stroke(2.5)}/>
      <path d="M -8 -20 q 8 -8 16 0" ${stroke(1.6)}/>
    </g>`;
  const head = `
    <rect x="${x - 10}" y="${hy + 34}" width="20" height="62" ${fillW(2.5)}/>
    <circle cx="${x}" cy="${hy}" r="44" ${fillW()}/>
    <!-- three hair strokes -->
    <path d="M ${x - 14} ${hy - 44} q 4 -8 10 0" ${stroke(2.5)}/>
    <path d="M ${x - 2} ${hy - 46} q 4 -8 10 0" ${stroke(2.5)}/>
    <path d="M ${x + 10} ${hy - 44} q 4 -7 9 0" ${stroke(2.5)}/>
    <!-- dot eyes -->
    <circle cx="${x - 16}" cy="${hy - 6}" r="3.6" fill="${INK}"/>
    <circle cx="${x + 16}" cy="${hy - 6}" r="3.6" fill="${INK}"/>
    <!-- little brows for variety -->
    <line x1="${x - 24}" y1="${hy - 16}" x2="${x - 9}" y2="${hy - 14}" stroke="${INK}" stroke-width="2"/>
    <line x1="${x + 9}" y1="${hy - 14}" x2="${x + 24}" y2="${hy - 16}" stroke="${INK}" stroke-width="2"/>
    <path d="M ${x + 6} ${hy + 6} q 4 6 -2 9" ${stroke(2)}/>
    ${mouth(x, hy + 24, expr)}`;
  return g(body + head, `data-who="doug"`);
}

// BOSS — pointy-haired, tiny eyes, wide gesturing arms.
export function boss(x, base, expr = 'grin', flip = false, arms = true) {
  const hy = base - 202;
  const armSvg = arms ? `
    <path d="M ${x - 60} ${base - 96} q -40 -6 -60 -44" ${stroke(3)}/>
    <path d="M ${x + 60} ${base - 96} q 40 -6 60 -44" ${stroke(3)}/>
    <circle cx="${x - 122}" cy="${base - 142}" r="7" ${fillW(2.5)}/>
    <circle cx="${x + 122}" cy="${base - 142}" r="7" ${fillW(2.5)}/>` : '';
  const body = `
    <path d="M ${x - 74} ${base} Q ${x - 72} ${base - 96} ${x - 40} ${base - 116} L ${x + 40} ${base - 116} Q ${x + 72} ${base - 96} ${x + 74} ${base} Z" ${fillW()}/>
    <!-- lapels -->
    <path d="M ${x - 20} ${base - 114} L ${x - 6} ${base - 78} L ${x - 30} ${base - 60}" ${stroke(2.5)}/>
    <path d="M ${x + 20} ${base - 114} L ${x + 6} ${base - 78} L ${x + 30} ${base - 60}" ${stroke(2.5)}/>
    <path d="M ${x - 6} ${base - 100} L ${x + 6} ${base - 100} L ${x + 8} ${base - 66} L ${x} ${base - 58} L ${x - 8} ${base - 66} Z" ${fillK()}/>
    ${armSvg}`;
  const head = `
    <rect x="${x - 10}" y="${hy + 30}" width="20" height="62" ${fillW(2.5)}/>
    <ellipse cx="${x}" cy="${hy}" rx="35" ry="40" ${fillW()}/>
    <!-- THE pointy hair -->
    <path d="M ${x - 30} ${hy - 30} L ${x - 46} ${hy - 74} L ${x - 8} ${hy - 40} Z" ${fillK()}/>
    <path d="M ${x + 4} ${hy - 40} L ${x + 46} ${hy - 74} L ${x + 30} ${hy - 30} Z" ${fillK()}/>
    <!-- tiny close eyes -->
    <circle cx="${x - 10}" cy="${hy - 2}" r="2.4" fill="${INK}"/>
    <circle cx="${x + 10}" cy="${hy - 2}" r="2.4" fill="${INK}"/>
    <line x1="${x - 18}" y1="${hy - 12}" x2="${x - 4}" y2="${hy - 10}" stroke="${INK}" stroke-width="2"/>
    <line x1="${x + 4}" y1="${hy - 10}" x2="${x + 18}" y2="${hy - 12}" stroke="${INK}" stroke-width="2"/>
    <path d="M ${x} ${hy + 2} q 4 6 -2 9" ${stroke(2)}/>
    ${mouth(x, hy + 22, expr)}`;
  return g(body + head, `data-who="boss"`);
}

export const CHARS = { dailbert, doug, boss };
export const CHAR_LABEL = { dailbert: 'DAILBERT', doug: 'DOUG', boss: 'BOSS' };

// ============================================================
//  SURFACES  — the only place a clanker may appear
// ============================================================

// a desktop monitor sitting in the scene
export function monitorSurface(x, y, { clanker = true, expr = 'idle' } = {}) {
  const w = 150, h = 108;
  return g(`
    <!-- stand -->
    <rect x="${x - 14}" y="${y + h / 2}" width="28" height="20" ${fillW(2.5)}/>
    <rect x="${x - 34}" y="${y + h / 2 + 18}" width="68" height="8" rx="3" ${fillW(2.5)}/>
    <!-- bezel -->
    <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" ${fillW(3.5)}/>
    <!-- screen -->
    <rect x="${x - w / 2 + 10}" y="${y - h / 2 + 10}" width="${w - 20}" height="${h - 20}" rx="3" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>
    <rect x="${x - w / 2 + 10}" y="${y - h / 2 + 10}" width="${w - 20}" height="${h - 20}" rx="3" fill="url(#scan)"/>
    ${clanker ? clankerFace(x, y - 4, 0.92, expr) : ''}
  `, `data-surface="monitor"`);
}

// a dead / crashed monitor (clanker faint, reflected in dark glass)
export function deadMonitorSurface(x, y, { expr = 'soft' } = {}) {
  const w = 150, h = 108;
  return g(`
    <rect x="${x - 14}" y="${y + h / 2}" width="28" height="20" ${fillW(2.5)}/>
    <rect x="${x - 34}" y="${y + h / 2 + 18}" width="68" height="8" rx="3" ${fillW(2.5)}/>
    <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" ${fillW(3.5)}/>
    <rect x="${x - w / 2 + 10}" y="${y - h / 2 + 10}" width="${w - 20}" height="${h - 20}" rx="3" fill="url(#hatch)" stroke="${INK}" stroke-width="2"/>
    <g opacity="0.55">${clankerFace(x, y - 4, 0.9, expr)}</g>
  `, `data-surface="dead-monitor"`);
}

// window at night — clanker as a faint reflection in the glass
export function windowSurface({ clanker = true, expr = 'soft' } = {}) {
  const x = PANEL.pad + 8, y = PANEL.pad + 8, w = PANEL.w - 2 * PANEL.pad - 16, h = 210;
  const cx = x + w * 0.66, cy = y + h * 0.44;
  return g(`
    <rect x="${x}" y="${y}" width="${w}" height="${h}" ${fillW(3.5)}/>
    <rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="url(#hatch)" stroke="${INK}" stroke-width="1.5" opacity="0.8"/>
    <!-- mullions -->
    <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${INK}" stroke-width="3"/>
    <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${INK}" stroke-width="3"/>
    <!-- distant city dots -->
    ${Array.from({ length: 26 }, (_, i) => `<rect x="${x + 12 + (i * 53) % (w - 24)}" y="${y + 12 + ((i * 37) % (h - 40))}" width="4" height="6" fill="${INK}" opacity="0.5"/>`).join('')}
    ${clanker ? `<g opacity="0.72">${clankerFace(cx, cy, 0.95, expr)}</g>` : ''}
  `, `data-surface="window"`);
}

// clanker reflected in a character's glasses (boss) — small
export function glassesSurface(charX, charBase, { expr = 'narrow' } = {}) {
  const hy = charBase - 202;       // matches boss head center
  return g(`<g opacity="0.9">${clankerFace(charX, hy - 2, 0.3, expr)}</g>`, `data-surface="glasses"`);
}

// clanker in the sheen of a mug — tiny. If drawCup, render a standalone cup
// (used when the holder isn't Doug, who already holds his own mug).
export function mugSurface(charX, charBase, { expr = 'narrow', drawCup = false } = {}) {
  const mx = charX + 52, my = charBase - 42;
  const cup = drawCup ? `
    <g transform="translate(${mx},${my})">
      <rect x="-17" y="-20" width="34" height="34" rx="4" ${fillW(2.5)}/>
      <path d="M 17 -12 q 14 0 14 12 q 0 12 -14 12" ${stroke(2.5)}/>
      <ellipse cx="0" cy="-20" rx="17" ry="5" ${fillW(2)}/>
    </g>` : '';
  return g(`${cup}<g opacity="0.85">${clankerFace(mx, my - 6, 0.34, expr)}</g>`, `data-surface="mug"`);
}

// clanker on a projector screen behind the scene — wide
export function projectorSurface({ clanker = true, expr = 'idle', slide = '' } = {}) {
  const x = PANEL.pad + 40, y = PANEL.pad + 6, w = PANEL.w - 2 * PANEL.pad - 90, h = 150;
  return g(`
    <line x1="${x + w / 2}" y1="${y - 6}" x2="${x + w / 2}" y2="${y}" stroke="${INK}" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" ${fillW(3.5)}/>
    <rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" fill="url(#scan)" stroke="${INK}" stroke-width="1.5"/>
    ${clanker ? clankerFace(x + w * 0.5, y + h * 0.46, 1.0, expr) : ''}
    ${slide ? `<text x="${x + w / 2}" y="${y + h - 12}" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="${INK}">${esc(slide)}</text>` : ''}
  `, `data-surface="projector"`);
}

// ============================================================
//  BALLOONS
// ============================================================
// kind: 'speech' (rounded, character) | 'screen' (rect, clanker) | 'think'
export function balloon(bx, by, text, { kind = 'speech', tailTo = null, maxChars = 26 } = {}) {
  const lines = wrap(text, maxChars);
  const lh = 19, padX = 14, padY = 12;
  const tw = Math.min(maxChars, Math.max(...lines.map((l) => l.length))) * 8.4;
  const w = tw + padX * 2, h = lines.length * lh + padY * 2;
  const x = bx - w / 2, y = by;
  let shape;
  if (kind === 'screen') {
    // rectangular, screen-edged, double border — clanker "speaks from a surface"
    shape = `
      <rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="3" ${fillW(2)}/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" ${fillW(2.5)}/>
      <line x1="${x}" y1="${y + 6}" x2="${x + w}" y2="${y + 6}" stroke="${INK}" stroke-width="1" opacity="0.4"/>`;
  } else {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" ${fillW(2.5)}/>`;
  }
  let tail = '';
  if (tailTo) {
    const [tx, ty] = tailTo;
    const anchorX = Math.max(x + 14, Math.min(x + w - 14, tx));
    if (kind === 'screen') {
      tail = `<line x1="${anchorX}" y1="${y + h}" x2="${tx}" y2="${ty}" stroke="${INK}" stroke-width="2" stroke-dasharray="3 3"/><circle cx="${tx}" cy="${ty}" r="3" fill="${INK}"/>`;
    } else {
      tail = `<path d="M ${anchorX - 10} ${y + h - 2} L ${tx} ${ty} L ${anchorX + 10} ${y + h - 2} Z" ${fillW(2.5)}/>`;
    }
  }
  const txt = lines.map((l, i) => `<text x="${bx}" y="${y + padY + 14 + i * lh}" text-anchor="middle" font-family="'Comic Sans MS','Chalkboard SE','Comic Neue',sans-serif" font-size="14.5" fill="${INK}">${esc(l)}</text>`).join('');
  return { svg: g(tail + shape + txt, `data-balloon="${kind}"`), w, h, x, y };
}
