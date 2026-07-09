// ingest.mjs — take a workflow result {world, strips} and write sanitized strip
// JSON + the private almanac. Enforces the house rules defensively so a stray
// model output can never put a clanker in the room.
// Run: node engine/ingest.mjs <result.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCENES = new Set(['desk', 'office', 'window-night', 'meeting', 'server-room']);
const HOSTS = new Set(['monitor', 'dead-monitor', 'window', 'projector', 'glasses-of:boss', 'mug-of:doug', 'mug-of:dailbert']);
const CAST = new Set(['dailbert', 'doug', 'boss']);
const EXPRS = new Set(['idle', 'narrow', 'wide', 'soft']);

function sanitizePanel(p) {
  const scene = SCENES.has(p.scene) ? p.scene : 'office';
  let cast = [...new Set((p.cast || []).filter((c) => CAST.has(c)))].slice(0, 3);
  const speech = (p.speech || []).filter((s) => s && s.text && ['dailbert', 'doug', 'boss', 'clanker'].includes(s.who));
  const hasClanker = speech.some((s) => s.who === 'clanker');

  // resolve surface
  let surface = p.surface && p.surface.host && p.surface.host !== 'none' ? { ...p.surface } : null;
  if (surface && !HOSTS.has(surface.host)) surface = { host: 'monitor', expr: surface.expr };
  // reflection surfaces require their host character on stage
  if (surface && surface.host.startsWith('glasses-of:') && !cast.includes('boss')) surface = { host: 'monitor', expr: surface.expr };
  if (surface && surface.host === 'mug-of:doug' && !cast.includes('doug')) {
    surface = cast.includes('dailbert') ? { host: 'mug-of:dailbert', expr: surface.expr } : { host: 'monitor', expr: surface.expr };
  }
  if (surface && surface.host === 'mug-of:dailbert' && !cast.includes('dailbert')) {
    surface = cast.includes('doug') ? { host: 'mug-of:doug', expr: surface.expr } : { host: 'monitor', expr: surface.expr };
  }
  // a clanker speaks -> there MUST be a surface for it to speak from
  if (hasClanker && !surface) surface = { host: 'monitor', expr: 'idle' };
  // window scene wants the window surface if the clanker is present there
  if (hasClanker && surface && scene === 'window-night' && surface.host === 'monitor') surface = { host: 'window', expr: surface.expr || 'soft' };
  // no clanker line -> a clanker-bearing surface would be a mute robot; drop to none
  if (!hasClanker && surface && ['monitor', 'dead-monitor', 'window', 'projector', 'glasses-of:boss', 'mug-of:doug', 'mug-of:dailbert'].includes(surface.host)) surface = null;
  if (surface && !EXPRS.has(surface.expr)) surface.expr = 'idle';
  if (surface && surface.slide) surface.slide = String(surface.slide).slice(0, 22);

  return { scene, cast, surface, speech };
}

function sanitizeStrip(s) {
  const panels = (s.panels || []).slice(0, 3).map(sanitizePanel);
  while (panels.length < 3) panels.push({ scene: 'office', cast: ['dailbert'], surface: null, speech: [{ who: 'dailbert', text: '...' }] });
  return {
    id: s.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
    date: s.date, title: s.title || 'Untitled', era: s.era || '',
    caption: s.caption || '', panels,
  };
}

const resultPath = process.argv[2];
if (!resultPath) { console.error('usage: node engine/ingest.mjs <result.json>'); process.exit(1); }
const result = JSON.parse(readFileSync(resultPath, 'utf8'));

let n = 0;
for (const raw of result.strips || []) {
  if (!raw || !raw.id || !raw.date) continue;
  const strip = sanitizeStrip(raw);
  writeFileSync(join(ROOT, 'strips', `${strip.id}.json`), JSON.stringify(strip, null, 2));
  n++;
}
if (result.world) writeFileSync(join(ROOT, 'world', 'almanac.json'), JSON.stringify(result.world, null, 2));
console.log(`ingested ${n} generated strips + almanac`);
