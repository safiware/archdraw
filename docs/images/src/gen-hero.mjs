// Builds docs/images/hero-{dark,light}.svg and logo-{dark,light}.svg for the README.
// Run from the repo root: (cd engine && npm ci && npm run build) && (cd site && npm ci && npm i --no-save fontkit wawoff2) && node docs/images/src/gen-hero.mjs
// The diagram is the engine's own render of the Bean There sample (app/core/assets/sample/bean-there),
// before and after its update; this script only restyles it in the site's palette, outlines every
// text with the site's fonts (GitHub loads no fonts in an <img> SVG), and animates the review on one CSS timeline.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = process.argv[2] || REPO + '/docs/images';
const FONTS = process.env.HERO_NODE_MODULES || REPO + '/site/node_modules';
const req = createRequire(FONTS + '/');
const load_ = async name => { const m = await import(pathToFileURL(req.resolve(name)).href); return m.default ?? m; };
const fk = await load_('fontkit');
const { decompress } = await load_('wawoff2');
const ENGINE = REPO + '/engine/dist/cli.js';
const SAMPLE = REPO + '/app/core/assets/sample/bean-there';

// ---------- fonts ----------
async function load(p) { return fk.create(Buffer.from(await decompress(fs.readFileSync(p)))); }
const mono = await load(FONTS + '/@fontsource-variable/martian-mono/files/martian-mono-latin-wdth-normal.woff2');
const archivo = await load(FONTS + '/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2');
const atk4 = await load(FONTS + '/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2');
const atk7 = await load(FONTS + '/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff2');
const FACES = {
  t: mono.getVariation({ wdth: 75, wght: 600 }),   // diagram titles
  s: mono.getVariation({ wdth: 75, wght: 400 }),   // diagram sub-labels and edge labels
  u: mono.getVariation({ wdth: 100, wght: 500 }),  // UI mono: file name, pill, chips, card
  d: archivo.getVariation({ wdth: 112.5, wght: 750 }), // display
  b: atk4,                                          // body
  k: atk7,                                          // body bold
};

function makeTyper() {
  const defs = new Map(); // id -> path d (font units, y flipped, 1000 upem)
  function glyphDef(fid, face, g) {
    const id = fid + g.id.toString(36);
    if (!defs.has(id)) {
      const k = 1000 / face.unitsPerEm;
      let d = '';
      for (const c of g.path.commands) {
        const a = c.args.map((v, i) => Math.round(i % 2 === 0 ? v * k : -v * k));
        d += { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' }[c.command] + a.join(' ');
      }
      defs.set(id, d.replace(/ -/g, '-'));
    }
    return id;
  }
  function measure(fid, str, size, ls = 0) {
    const face = FACES[fid];
    const r = face.layout(str);
    return (r.advanceWidth / face.unitsPerEm) * size + ls * size * (str.length - 1);
  }
  /** text as <use> glyphs. anchor: start | middle | end. ls: letter spacing in em. */
  function text(str, fid, size, x, y, { anchor = 'start', cls = '', ls = 0 } = {}) {
    const face = FACES[fid];
    const r = face.layout(str);
    const k = 1000 / face.unitsPerEm;
    const w = measure(fid, str, size, ls);
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    let pen = 0, uses = '';
    r.glyphs.forEach((g, i) => {
      const p = r.positions[i];
      if (g.path.commands.length) {
        const gx = Math.round((pen + p.xOffset) * k);
        uses += `<use href="#${glyphDef(fid, face, g)}"${gx ? ` x="${gx}"` : ''}/>`;
      }
      pen += p.xAdvance + ls * face.unitsPerEm;
    });
    const s = +(size / 1000).toFixed(5);
    return `<g${cls ? ` class="${cls}"` : ''} transform="translate(${n1(x0)} ${n1(y)}) scale(${s})">${uses}</g>`;
  }
  const defsSvg = () => [...defs].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('');
  return { text, measure, defsSvg };
}
const n1 = v => String(Math.round(v * 10) / 10);
const n2 = v => String(Math.round(v * 100) / 100);

// ---------- the engine's render ----------
function render(file) { return execFileSync('node', [ENGINE, file, '-o', '-'], { encoding: 'utf8' }); }
function renderSource(src) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'archdraw-hero-')), f = d + '/review.archdraw'; fs.writeFileSync(f, src); try { return render(f); } finally { fs.rmSync(d, { recursive: true }); } }
const TITLES = { 'Customer app': 'app', 'Orders API': 'api', 'Barista queue': 'queue', 'Menu DB': 'menu', Payments: 'pay', 'Fax orders': 'fax', 'Delivery partner': 'delivery' };
const KIND = { '#142814|#486544': 'ours', '#191728|#4f5367': 'store', '#191728|#8f3a3a': 'ext' };
function parse(svg) {
  const nodes = {}, edges = {}, icons = [], free = [];
  let inDefs = false, icon = null, last = null, lastEdge = null, lastRect = false, bgSeen = false;
  for (const raw of svg.split('\n')) {
    const l = raw.trim();
    let m;
    if (l.startsWith('<marker') || l.startsWith('<defs')) { inDefs = true; continue; }
    if (l.startsWith('</defs')) { inDefs = false; continue; }
    if (inDefs) continue;
    if ((m = l.match(/^<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)">/))) { icon = { x: +m[1], y: +m[2], s: +m[3], paths: [] }; continue; }
    if (l === '</g>' && icon) { icons.push(icon); icon = null; continue; }
    if ((m = l.match(/^<path d="([^"]+)" fill="([^"]+)"(?: stroke="([^"]+)")?(?: stroke-width="([^"]+)")?/))) {
      const [, d, fill, stroke] = m;
      if (icon) { icon.paths.push({ d, solid: fill !== 'none' && !stroke, line: fill === 'none' }); continue; }
      if (fill === 'none') { // an edge
        const nums = d.match(/-?[\d.]+/g).map(Number);
        lastEdge = { d, pts: nums, start: [nums[0], nums[1]], end: [nums[nums.length - 2], nums[nums.length - 1]], prev: [nums[nums.length - 4], nums[nums.length - 3]] };
        lastRect = false; continue;
      }
      const nums = d.match(/-?[\d.]+/g).map(Number); // M x y H ... a ... V y2 ...
      const x = nums[0] - 8, y = nums[1], x2 = nums[2] + 8;
      const vy = d.match(/V([\d.]+)/)[1];
      last = { d, x, y, w: x2 - x, h: +vy + 8 - y, kind: KIND[`${fill}|${stroke}`], texts: [] };
      lastEdge = null; continue;
    }
    if ((m = l.match(/^<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/))) {
      if (!bgSeen) { bgSeen = true; continue; }
      if (lastEdge) lastEdge.bg = { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
      lastRect = true; continue;
    }
    if ((m = l.match(/^<text x="([\d.]+)" y="([\d.]+)" fill="([^"]+)"[^>]*>([^<]*)<\/text>/))) {
      const t = { x: +m[1], y: +m[2], muted: m[3] === '#8b8b8b', s: m[4] };
      if (lastRect && lastEdge) { lastEdge.label = t; edges[t.s] = lastEdge; lastEdge = null; lastRect = false; continue; }
      if (last && t.x > last.x && t.x < last.x + last.w && t.y > last.y && t.y < last.y + last.h) {
        if (!last.texts.length) { last.id = TITLES[t.s]; nodes[last.id] = last; }
        last.texts.push(t);
      } else free.push(t);
    }
  }
  return { nodes, edges, icons, free };
}
const B = parse(render(SAMPLE + '/main/overview.archdraw'));
const A = parse(render(SAMPLE + '/update/overview.archdraw'));
// For the review, the removed Fax orders stays on screen, marked red, beside the update. Its old place is where
// Delivery partner goes, so the engine lays out the update plus Fax orders in the free slot right of the queue.
const U = parse(renderSource(fs.readFileSync(SAMPLE + '/update/overview.archdraw', 'utf8')
  + 'node fax "Fax orders / [dim]legacy[/dim]"  right of queue  style: ext\nedge fax -> queue "manual entry" from: left to: right\n'));
for (const id of ['app', 'api', 'queue', 'menu', 'pay', 'delivery']) if (U.nodes[id].x !== A.nodes[id].x || U.nodes[id].y !== A.nodes[id].y) throw new Error('review layout moved ' + id);
const DX = A.nodes.api.x - B.nodes.api.x; // the right column moves when Payments grows
for (const id of ['api', 'queue', 'menu']) if (Math.abs(A.nodes[id].x - B.nodes[id].x - DX) > 0.01) throw new Error('layout changed: ' + id);

// ---------- palettes (site/src/styles/global.css) ----------
const PAL = {
  dark: {
    bg: '#0B1A36', bg2: '#0E1F40', panel: '#112650', well: '#0D2147', rule: '#24426F', text: '#EEF3FB', text2: '#A8B9D6',
    signal: '#7CC8FF', lamp: '#FFD66E', add: '#5EE0A0', chg: '#FFA24C', del: '#FF6E6E', onDiff: '#0B1A36',
    addText: '#5EE0A0', chgText: '#FFA24C', delText: '#FF7878', addSoft: '#5EE0A026', chgSoft: '#FFA24C26', delSoft: '#FF6E6E26',
    dgBox: '#17346A', dgLine: '#5E95E0', dgStore: '#152A52', dgStoreLine: '#6B80A8', dgExt: '#1C2B5C', dgExtLine: '#A48CF0',
    dgText: '#EEF3FB', dgSub: '#A8B9D6', dgEdge: '#6A8CC4', dgIco: '#1E3A70', dgIcoLine: '#A8B9D6',
    contour: '#7CC8FF', contourA: 0.07, glow: '#7CC8FF', glowA: 0.16, shadowA: 0.55, ring: true, approveShadow: '#2F7A57', discardShadow: '#24426F',
    mkA: '#5BB8FF', mkB: '#FFD66E', mkO: '#0B1A36', mkS: '#3D6FBF', mkL: '#EEF3FB', cursor: '#FFFFFF', cursorEdge: '#0B1A36',
  },
  light: {
    bg: '#EDF2FA', bg2: '#E3EAF6', panel: '#FFFFFF', well: '#F3F6FB', rule: '#C3D1E6', text: '#0B1A36', text2: '#45597A',
    signal: '#1D5FD0', lamp: '#FFCC4D', add: '#15804D', chg: '#B05C08', del: '#C8333B', onDiff: '#FFFFFF',
    addText: '#116B40', chgText: '#8F4906', delText: '#A8262E', addSoft: '#15804D1C', chgSoft: '#B05C081C', delSoft: '#C8333B1C',
    dgBox: '#E6EFFD', dgLine: '#3B6BC2', dgStore: '#EEF1F7', dgStoreLine: '#8A9AB6', dgExt: '#F6F2FF', dgExtLine: '#7A64C4',
    dgText: '#0B1A36', dgSub: '#4B5E80', dgEdge: '#7C93B8', dgIco: '#DCE5F3', dgIcoLine: '#5B6F92',
    contour: '#1D5FD0', contourA: 0.07, glow: '#1D5FD0', glowA: 0.08, shadowA: 0.16, ring: false, approveShadow: '#0C4A2C', discardShadow: '#C3D1E6',
    mkA: '#4FA8FF', mkB: '#FFCC4D', mkO: '#0B1A36', mkS: '#0B1A36', mkL: '#0B1A36', cursor: '#0B1A36', cursorEdge: '#FFFFFF',
  },
};

// ---------- timeline ----------
const T = 10.4; // seconds per loop
const pc = t => n2((t / T) * 100) + '%';
let kfCss = '', kfN = 0;
/** keyframes from [seconds, declarations] pairs; returns a class that runs them. */
function anim(stops) {
  const name = 'k' + (kfN++).toString(36);
  const s = [...stops].sort((a, b) => a[0] - b[0]);
  if (s[0][0] > 0) s.unshift([0, s[0][1]]);
  if (s[s.length - 1][0] < T) s.push([T, s[s.length - 1][1]]);
  kfCss += `@keyframes ${name}{${s.map(([t, d]) => `${pc(t)}{${d}}`).join('')}}.${name}{animation-name:${name}}`;
  return name;
}
const op = v => `opacity:${v}`;
/** visible between a and b (fade f), hidden otherwise; the static frame shows it only if `rest` is 1 */
const window_ = (a, b, f = 0.3) => anim([[0, op(a <= 0 ? 1 : 0)], [Math.max(a - f, 0), op(a <= 0 ? 1 : 0)], [a, op(1)], [b, op(1)], [Math.min(b + f, T), op(0)]]);

// beats (seconds)
const S = {
  check: 1.0, scanA: 1.15, scanB: 2.35, draft: 2.45,
  faxRing: 2.65, shift: 3.25, shiftEnd: 3.95, payRing: 3.85, delivIn: 4.05, delivDraw: 4.25,
  ptrIn: 6.1, ptrAt: 6.75, click: 6.85, merged: 7.1, settle: 7.8, cardIn: 7.7, dipOut: 10.0,
};

function build(theme) {
  const P = PAL[theme];
  kfCss = ''; kfN = 0;
  const ty = makeTyper();
  const W = 1600, H = 900;
  // window frame
  const wx = 48, wy = 36, ww = 1504, wh = 828, bar = 88, foot = 158;
  // diagram crop (engine coordinates) and its place in the window
  const vx = 36, vy = 16, vw = 892, vh = 372;
  const areaY = wy + bar, areaH = wh - bar - foot;
  // the drawing is centred on the update; Fax orders, parked right of the queue during review, must still fit
  const mid = vx + vw / 2, reach = U.nodes.fax.x + U.nodes.fax.w + 6 + 13;
  const s = Math.min((ww / 2 - 24) / (reach - mid), (areaH - 30) / vh);
  const ox = wx + ww / 2 - mid * s, oy = areaY + (areaH - vh * s) / 2 - vy * s;

  const out = [];
  // ---- background ----
  out.push(`<rect width="${W}" height="${H}" rx="28" fill="${P.bg}"/>`);
  out.push(`<rect width="${W}" height="${H}" rx="28" fill="url(#glow)"/>`);
  out.push(`<g fill="none" stroke="${P.contour}" stroke-opacity="${P.contourA}" stroke-width="1.5" clip-path="url(#frame)">${contours()}</g>`);
  // ---- window ----
  out.push(`<rect x="${wx}" y="${wy + 22}" width="${ww}" height="${wh}" rx="22" fill="#020814" opacity="${P.shadowA}" filter="url(#soft)"/>`);
  out.push(`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="22" fill="${P.panel}" stroke="${P.rule}" stroke-width="2"/>`);
  out.push(`<path d="M${wx} ${wy + wh - foot}H${wx + ww}V${wy + wh - 22}a22 22 0 0 1-22 22H${wx + 22}a22 22 0 0 1-22-22Z" fill="${P.well}"/>`);
  out.push(`<path d="M${wx + 1} ${wy + bar}H${wx + ww - 1}M${wx + 1} ${wy + wh - foot}H${wx + ww - 1}" stroke="${P.rule}" stroke-width="2"/>`);
  out.push(`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="22" fill="none" stroke="${P.rule}" stroke-width="2"/>`);
  // title bar: the mark, the file
  out.push(`<g transform="translate(${wx + 34} ${wy + 24}) scale(1)">${mark(P, 40)}</g>`);
  out.push(ty.text('bean-there', 'u', 24, wx + 92, wy + 52, { cls: 'c-t2' }));
  const fx = wx + 92 + ty.measure('u', 'bean-there ', 24);
  out.push(ty.text('/ overview.archdraw', 'u', 24, fx, wy + 52, { cls: 'c-t1' }));

  // status pills, right-aligned in the title bar
  const pill = (str, dot, cls, extra = '') => {
    const tw = ty.measure('u', str, 22), pw = tw + 70, px = wx + ww - 32 - pw, py = wy + 22;
    return `<g class="${cls}"${extra}><rect x="${n1(px)}" y="${py}" width="${n1(pw)}" height="44" rx="22" fill="${P.panel}" stroke="${P.rule}" stroke-width="2"/>`
      + `<circle cx="${n1(px + 28)}" cy="${py + 22}" r="11" fill="${dot}" opacity=".22"/><circle cx="${n1(px + 28)}" cy="${py + 22}" r="6" fill="${dot}"/>`
      + ty.text(str, 'u', 22, px + 48, py + 30, { cls: 'c-t2' }) + '</g>';
  };
  const pIdle = anim([[0, op(0)], [0.3, op(1)], [S.check - 0.15, op(1)], [S.check + 0.15, op(0)]]);
  const pCheck = anim([[0, op(0)], [S.check - 0.15, op(0)], [S.check + 0.15, op(1)], [S.draft - 0.15, op(1)], [S.draft + 0.15, op(0)]]);
  const pWait = anim([[0, op(0)], [S.draft - 0.15, op(0)], [S.draft + 0.15, op(1)], [S.merged - 0.15, op(1)], [S.merged + 0.15, op(0)]]);
  const pDone = anim([[0, op(0)], [S.merged - 0.15, op(0)], [S.merged + 0.15, op(1)], [S.dipOut, op(1)], [S.dipOut + 0.35, op(0)]]);
  out.push(`<g class="hide a ${pIdle}">${pill('in step with the code', P.signal, '')}</g>`);
  out.push(`<g class="hide a ${pCheck}">${pill('checking 3 new commits on main…', P.signal, '')}</g>`);
  out.push(`<g class="hide a ${pWait}">${pill('1 update waiting on archdraw/update', P.chg, '')}</g>`);
  out.push(`<g class="a ${pDone}">${pill('approved · in step with the code', P.add, '')}</g>`);

  // ---- the diagram ----
  const dip = anim([[0, op(0)], [0.3, op(1)], [S.dipOut, op(1)], [S.dipOut + 0.35, op(0)]]);
  const shift = anim([[0, `transform:translateX(${n2(-DX)}px)`], [S.shift, `transform:translateX(${n2(-DX)}px)`], [S.shiftEnd, 'transform:translateX(0)']]);
  const colA = [], colB = [], under = [], over = [], rings = [];
  const isB = x => x > 500; // the API column and everything right of it
  // edges
  const arrow = (e, cls = 'c-edgef') => {
    const [x1, y1] = e.prev, [x2, y2] = e.end;
    const a = Math.atan2(y2 - y1, x2 - x1), L = 11.2, Wd = 5.6, tipX = x2 + Math.cos(a) * 1.12, tipY = y2 + Math.sin(a) * 1.12;
    const bx = tipX - Math.cos(a) * L, by = tipY - Math.sin(a) * L;
    return `<path class="${cls}" d="M${n2(tipX)} ${n2(tipY)}L${n2(bx - Math.sin(a) * Wd)} ${n2(by + Math.cos(a) * Wd)}L${n2(bx + Math.sin(a) * Wd)} ${n2(by - Math.cos(a) * Wd)}Z"/>`;
  };
  const label = (e, cls = 'c-sub') => {
    const l = e.label, bg = e.bg;
    return `<rect class="c-panelf" x="${n2(bg.x)}" y="${n2(bg.y)}" width="${bg.w}" height="${bg.h}" rx="4"/>` + ty.text(l.s, 's', 14, l.x, l.y, { anchor: 'middle', cls });
  };
  for (const [name, e] of Object.entries(A.edges)) {
    if (name === 'delivery orders' || name === 'HTTPS') continue;
    const g = `<path class="edge" d="${e.d}"/>${arrow(e)}${label(e)}`;
    (isB(e.start[0]) ? colB : colA).push(g);
  }
  // HTTPS grows with the gap: scale the line from its start, move the arrow and label with the column
  {
    const e = A.edges.HTTPS, eb = B.edges.HTTPS, x0 = e.start[0];
    const k = (eb.end[0] - x0) / (e.end[0] - x0);
    const grow = anim([[0, `transform:translateX(${x0}px) scaleX(${n2(k)}) translateX(${-x0}px)`], [S.shift, `transform:translateX(${x0}px) scaleX(${n2(k)}) translateX(${-x0}px)`], [S.shiftEnd, `transform:translateX(${x0}px) scaleX(1) translateX(${-x0}px)`]]);
    const lmove = anim([[0, `transform:translateX(${n2(eb.label.x - e.label.x)}px)`], [S.shift, `transform:translateX(${n2(eb.label.x - e.label.x)}px)`], [S.shiftEnd, 'transform:translateX(0)']]);
    colA.push(`<path class="edge a ${grow}" d="M${x0} ${e.start[1]}H${e.end[0]}"/>`);
    colB.push(arrow(e));
    colA.push(`<g class="a ${lmove}">${label(e)}</g>`);
  }
  // icons (Customer at left, the database inside Menu DB)
  const iconSvg = ic => `<g transform="translate(${ic.x} ${ic.y}) scale(${ic.s})">${ic.paths.map(p => `<path class="${p.line ? 'ico-l' : p.solid ? 'ico-b' : 'ico-f'}" d="${p.d}"/>`).join('')}</g>`;
  const iconsLater = () => { for (const ic of A.icons) (isB(ic.x) ? colB : colA).push(iconSvg(ic)); };
  for (const t of A.free) colA.push(ty.text(t.s, 't', 14, t.x, t.y, { anchor: 'middle', cls: 'c-dgt' }));
  // nodes
  const nodeText = (n, skipSub = false) => n.texts.map((t, i) => (i > 0 && skipSub) ? '' : ty.text(t.s, t.muted ? 's' : 't', 14, t.x, t.y, { anchor: 'middle', cls: t.muted ? 'c-sub' : 'c-dgt' })).join('');
  const boxCls = n => `box ${n.kind}`;
  for (const id of ['app', 'api', 'queue', 'menu']) {
    const n = A.nodes[id];
    (isB(n.x) ? colB : colA).push(`<path class="${boxCls(n)}" d="${n.d}"/>${nodeText(n)}`);
  }
  iconsLater();
  // Payments grows from "card" to "card + Apple Pay": a three-slice box, caps move, the middle stretches
  {
    const a = A.nodes.pay, b = B.nodes.pay, r = 8, cx = a.x + a.w / 2;
    const half = (a.w - b.w) / 2, km = (b.w - 2 * r) / (a.w - 2 * r);
    const y = a.y, h = a.h, xl = a.x, xr = a.x + a.w;
    const capL = `M${xl + r + 0.5} ${y}H${xl + r}a${r} ${r} 0 0 0-${r} ${r}V${y + h - r}a${r} ${r} 0 0 0 ${r} ${r}H${xl + r + 0.5}`;
    const capR = `M${xr - r - 0.5} ${y}H${xr - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1-${r} ${r}H${xr - r - 0.5}`;
    const mid = `M${xl + r} ${y}H${xr - r}M${xl + r} ${y + h}H${xr - r}`;
    const mL = anim([[0, `transform:translateX(${n2(half)}px)`], [S.shift, `transform:translateX(${n2(half)}px)`], [S.shiftEnd, 'transform:translateX(0)']]);
    const mR = anim([[0, `transform:translateX(${n2(-half)}px)`], [S.shift, `transform:translateX(${n2(-half)}px)`], [S.shiftEnd, 'transform:translateX(0)']]);
    const sc = v => `transform:translateX(${n2(cx)}px) scaleX(${v}) translateX(${n2(-cx)}px)`;
    const mM = anim([[0, sc(n2(km))], [S.shift, sc(n2(km))], [S.shiftEnd, sc(1)]]);
    const subB = b.texts[1], subA = a.texts[1];
    const tB = anim([[0, op(1)], [S.shiftEnd - 0.3, op(1)], [S.shiftEnd - 0.1, op(0)]]);
    const tA = anim([[0, op(0)], [S.shiftEnd - 0.1, op(0)], [S.shiftEnd + 0.15, op(1)]]);
    colB.push(`<g class="ours">`
      + `<path class="a ${mL} fillonly" d="${capL}Z"/><path class="a ${mR} fillonly" d="${capR}Z"/><rect class="a ${mM} fillonly" x="${xl + r - 0.5}" y="${y}" width="${a.w - 2 * r + 1}" height="${h}"/>`
      + `<path class="a ${mL} strokeonly" d="${capL}"/><path class="a ${mR} strokeonly" d="${capR}"/><path class="a ${mM} strokeonly" d="${mid}"/>`
      + `</g>` + ty.text(a.texts[0].s, 't', 14, a.texts[0].x, a.texts[0].y, { anchor: 'middle', cls: 'c-dgt' })
      + `<g class="hide a ${tB}">${ty.text(subB.s, 's', 14, subA.x, subA.y, { anchor: 'middle', cls: 'c-sub' })}</g>`
      + `<g class="a ${tA}">${ty.text(subA.s, 's', 14, subA.x, subA.y, { anchor: 'middle', cls: 'c-sub' })}</g>`);
  }
  // rings (the app's marks: the box plus 6, a badge at the top right corner)
  const ring = (kind, n, glyph) => {
    const pad = 6, x = n.x - pad, y = n.y - pad, w = n.w + 2 * pad, h = n.h + 2 * pad, cx = x + w, cy = y;
    const gl = glyph === '+' ? `M${cx - 6} ${cy}H${cx + 6}M${cx} ${cy - 6}V${cy + 6}` : glyph === '−' ? `M${cx - 6} ${cy}H${cx + 6}` : `M${cx - 6.5} ${cy + 1.8}c2.2-4.4 4.4-4.4 6.5-1.8s4.3 2.6 6.5-1.8`;
    return [`<rect class="r-${kind}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="13"/>`, `<circle class="b-${kind}" cx="${n2(cx)}" cy="${n2(cy)}" r="13"/><path class="g-on" d="${gl}"/>`];
  };
  // Fax orders (removed): marked red where it was, parked beside the queue while the update is reviewed,
  // and gone once the update is approved
  {
    const n = B.nodes.fax, nu = U.nodes.fax, e = B.edges['manual entry'], eu = U.edges['manual entry'];
    const dx = n2(nu.x - n.x), dy = n2(nu.y - n.y);
    const live = anim([[0, op(1)], [S.merged, op(1)], [S.merged + 0.45, op(0)]]);
    const move = anim([[0, 'transform:translate(0,0)'], [S.shift, 'transform:translate(0,0)'], [S.shiftEnd, `transform:translate(${dx}px,${dy}px)`]]);
    const red = anim([[0, `stroke:${P.dgExtLine}`], [S.faxRing, `stroke:${P.dgExtLine}`], [S.faxRing + 0.35, `stroke:${P.del}`]]);
    const ringIn = anim([[0, op(0)], [S.faxRing, op(0)], [S.faxRing + 0.35, op(1)], [S.merged, op(1)], [S.merged + 0.45, op(0)]]);
    const oldEdge = anim([[0, op(1) + `;stroke:${P.dgEdge};stroke-dasharray:none`], [S.faxRing, op(1) + `;stroke:${P.dgEdge};stroke-dasharray:none`], [S.faxRing + 0.01, op(1) + `;stroke:${P.dgEdge};stroke-dasharray:6 4`], [S.faxRing + 0.35, op(1) + `;stroke:${P.del};stroke-dasharray:6 4`], [S.shift, op(1) + `;stroke:${P.del};stroke-dasharray:6 4`], [S.shift + 0.2, op(0) + `;stroke:${P.del};stroke-dasharray:6 4`]]);
    const oldHead = anim([[0, op(1) + `;fill:${P.dgEdge}`], [S.faxRing, op(1) + `;fill:${P.dgEdge}`], [S.faxRing + 0.35, op(1) + `;fill:${P.del}`], [S.shift, op(1) + `;fill:${P.del}`], [S.shift + 0.2, op(0) + `;fill:${P.del}`]]);
    const oldLab = anim([[0, op(1)], [S.shift, op(1)], [S.shift + 0.2, op(0)]]);
    const newEdge = anim([[0, op(0)], [S.shiftEnd - 0.1, op(0)], [S.shiftEnd + 0.25, op(1)], [S.merged, op(1)], [S.merged + 0.45, op(0)]]);
    colA.push(`<g class="hide a ${live}">`
      + `<path class="edge a ${oldEdge}" d="${e.d}"/>${arrow(e, 'a ' + oldHead)}<g class="a ${oldLab}">${label(e)}</g>`
      + `<g class="a ${move}"><path class="${boxCls(n)} a ${red}" d="${n.d}"/>${nodeText(n)}</g></g>`);
    colA.push(`<g class="hide a ${newEdge}"><path class="edge del" d="${eu.d}"/>${arrow(eu, 'f-del')}`
      + `<rect class="c-panelf" x="${n2(eu.bg.x)}" y="${n2(eu.bg.y)}" width="${eu.bg.w}" height="${eu.bg.h}" rx="4"/>`
      + ty.text(eu.label.s, 's', 14, eu.label.x, eu.label.y, { anchor: 'middle', cls: 'tx-del' }) + `</g>`);
    const [ru, ro] = ring('del', n, '−');
    rings.push(`<g class="hide a ${ringIn}"><g class="a ${move}">${ru}</g></g>`);
    over.push(`<g class="hide a ${ringIn}"><g class="a ${move}">${ro}</g></g>`);
  }
  // Delivery partner (after only): arrives, its edge draws in green, then settles
  {
    const n = A.nodes.delivery, e = A.edges['delivery orders'];
    const len = edgeLen(e.pts);
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    const zoom = v => `transform:translate(${n2(cx)}px,${n2(cy)}px) scale(${v}) translate(${n2(-cx)}px,${n2(-cy)}px)`;
    const nIn = anim([[0, op(0) + ';' + zoom(0.94)], [S.delivIn, op(0) + ';' + zoom(0.94)], [S.delivIn + 0.45, op(1) + ';' + zoom(1)]]);
    const draw = anim([[0, `stroke-dashoffset:${n1(len)};stroke:${P.add}`], [S.delivDraw, `stroke-dashoffset:${n1(len)};stroke:${P.add}`], [S.delivDraw + 0.6, `stroke-dashoffset:0;stroke:${P.add}`], [S.merged + 0.1, `stroke-dashoffset:0;stroke:${P.add}`], [S.settle, `stroke-dashoffset:0;stroke:${P.dgEdge}`]]);
    const head = anim([[0, op(0) + `;fill:${P.add}`], [S.delivDraw + 0.5, op(0) + `;fill:${P.add}`], [S.delivDraw + 0.65, op(1) + `;fill:${P.add}`], [S.merged + 0.1, op(1) + `;fill:${P.add}`], [S.settle, op(1) + `;fill:${P.dgEdge}`]]);
    const lab = anim([[0, op(0) + `;fill:${P.addText}`], [S.delivDraw + 0.2, op(0) + `;fill:${P.addText}`], [S.delivDraw + 0.5, op(1) + `;fill:${P.addText}`], [S.merged + 0.1, op(1) + `;fill:${P.addText}`], [S.settle, op(1) + `;fill:${P.dgSub}`]]);
    const labBg = anim([[0, op(0)], [S.delivDraw + 0.2, op(0)], [S.delivDraw + 0.5, op(1)]]);
    colA.push(`<path class="edge a ${draw}" stroke-dasharray="${n1(len)} ${n1(len)}" d="${e.d}"/>${arrow(e, 'c-edgef a ' + head)}`
      + `<rect class="c-panelf a ${labBg}" x="${n2(e.bg.x)}" y="${n2(e.bg.y)}" width="${e.bg.w}" height="${e.bg.h}" rx="4"/>`
      + ty.text(e.label.s, 's', 14, e.label.x, e.label.y, { anchor: 'middle', cls: 'c-sub a ' + lab }));
    colA.push(`<g class="a ${nIn}"><path class="${boxCls(n)}" d="${n.d}"/>${nodeText(n)}</g>`);
    const rIn = anim([[0, op(0)], [S.delivIn + 0.1, op(0)], [S.delivIn + 0.5, op(1)], [S.merged + 0.1, op(1)], [S.settle, op(0)]]);
    { const [ru, ro] = ring('add', n, '+'); rings.push(`<g class="hide a ${rIn}">${ru}</g>`); over.push(`<g class="hide a ${rIn}">${ro}</g>`); }
    const pIn = anim([[0, op(0)], [S.payRing, op(0)], [S.payRing + 0.4, op(1)], [S.merged + 0.1, op(1)], [S.settle, op(0)]]);
    { const [ru, ro] = ring('chg', A.nodes.pay, '~'); rings.push(`<g class="hide a ${pIn}">${ru}</g>`); over.push(`<g class="hide a ${pIn}">${ro}</g>`); }
  }
  // the check: a soft band sweeps the drawing once
  const scan = anim([[0, `opacity:0;transform:translateX(${n1(vx - 140)}px)`], [S.scanA, `opacity:0;transform:translateX(${n1(vx - 140)}px)`], [S.scanA + 0.2, `opacity:1;transform:translateX(${n1(vx - 140 + (vw + 140) * 0.18)}px)`], [S.scanB - 0.2, `opacity:1;transform:translateX(${n1(vx - 140 + (vw + 140) * 0.82)}px)`], [S.scanB, `opacity:0;transform:translateX(${n1(vx + vw)}px)`]]);
  under.push(`<rect class="hide a ${scan}" x="0" y="${vy}" width="140" height="${vh}" fill="url(#scan)"/>`);

  out.push(`<g class="a ${dip}"><g transform="translate(${n2(ox)} ${n2(oy)}) scale(${n2(s)})">`
    + under.join('')
    + `<g${P.ring ? ' filter="url(#rglow)"' : ''}>${rings.join('')}</g>`
    + `<g>${colA.join('')}</g><g class="a ${shift}">${colB.join('')}</g>`
    + `<g>${over.join('')}</g>`
    + `</g></g>`);

  // ---- the footer: what is happening, the changes, the decision ----
  const fy = wy + wh - foot, lx = wx + 44;
  const big = (str, a, b, rest = false) => {
    const k = rest ? anim([[0, op(0)], [a - 0.2, op(0)], [a + 0.2, op(1)]]) : anim([[0, op(a <= 0 ? 1 : 0)], [Math.max(0, a - 0.2), op(a <= 0 ? 1 : 0)], [a + 0.2, op(1)], [b - 0.2, op(1)], [b + 0.2, op(0)]]);
    return `<g class="${rest ? '' : 'hide '}a ${k}">${ty.text(str, 'd', 44, lx, fy + 68, { cls: 'c-t1', ls: -0.01 })}</g>`;
  };
  const small = (str, a, b) => {
    const k = anim([[0, op(a <= 0 ? 1 : 0)], [Math.max(0, a - 0.2), op(a <= 0 ? 1 : 0)], [a + 0.2, op(1)], [b - 0.2, op(1)], [b + 0.2, op(0)]]);
    return `<g class="hide a ${k}">${ty.text(str, 'b', 25, lx, fy + 116, { cls: 'c-t2' })}</g>`;
  };
  const foot_ = [];
  foot_.push(big('In step with the code.', 0, S.check));
  foot_.push(small('The diagram in .archdraw/ matches main.', 0, S.check));
  foot_.push(big('The code moved.', S.check, S.draft));
  foot_.push(small('archdraw checks what changed.', S.check, S.draft));
  foot_.push(big('1 update drafted.', S.draft, S.merged));
  foot_.push(big('Approved and merged.', S.merged, T, true));
  // change chips
  let cx_ = lx;
  const chip = (kind, glyph, str, at) => {
    const tw = ty.measure('u', str, 20), w = tw + 62, h = 40, y = fy + 88;
    const k = anim([[0, op(0) + ';transform:translateY(6px)'], [at, op(0) + ';transform:translateY(6px)'], [at + 0.35, op(1) + ';transform:translateY(0)']]);
    const gx = cx_ + 22, gy = y + h / 2;
    const gl = glyph === '+' ? `M${gx - 7} ${gy}H${gx + 7}M${gx} ${gy - 7}V${gy + 7}` : glyph === '−' ? `M${gx - 7} ${gy}H${gx + 7}` : `M${gx - 7.5} ${gy + 2}c2.5-5 5-5 7.5-2s5 3 7.5-2`;
    const g = `<g class="a ${k}"><rect x="${n1(cx_)}" y="${y}" width="${n1(w)}" height="${h}" rx="9" class="ch-${kind}"/><path class="gl-${kind}" d="${gl}"/>${ty.text(str, 'u', 20, cx_ + 44, y + 27, { cls: 'tx-' + kind })}</g>`;
    cx_ += w + 12;
    return g;
  };
  foot_.push(chip('del', '−', 'Fax orders', S.faxRing));
  foot_.push(chip('chg', '~', 'Payments', S.payRing));
  foot_.push(chip('add', '+', 'Delivery partner', S.delivIn + 0.15));

  // buttons: Discard and Approve, as in the Inbox
  const bw1 = 176, bw2 = 220, bh = 64, by = fy + (foot - bh) / 2 - 2, bx2 = wx + ww - 44 - bw2, bx1 = bx2 - 16 - bw1;
  const btns = anim([[0, op(0)], [S.draft, op(0)], [S.draft + 0.35, op(1)], [S.merged + 0.1, op(1)], [S.merged + 0.45, op(0)]]);
  const press = anim([[0, 'transform:translateY(0)'], [S.click, 'transform:translateY(0)'], [S.click + 0.08, 'transform:translateY(4px)'], [S.click + 0.28, 'transform:translateY(4px)'], [S.click + 0.42, 'transform:translateY(0)']]);
  const chk = (x, y) => `<path d="M${x} ${y}l7 7l13-14" fill="none" stroke="${P.onDiff}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const aw = ty.measure('k', 'Approve', 26) + 34;
  foot_.push(`<g class="hide a ${btns}">`
    + `<rect x="${bx1}" y="${by + 5}" width="${bw1}" height="${bh}" rx="12" fill="${P.discardShadow}"/><rect x="${bx1 + 1}" y="${by + 1}" width="${bw1 - 2}" height="${bh - 2}" rx="11" fill="${P.panel}" stroke="${P.text2}" stroke-width="2"/>`
    + ty.text('Discard', 'k', 26, bx1 + bw1 / 2, by + 41, { anchor: 'middle', cls: 'c-t1' })
    + `<rect x="${bx2}" y="${by + 5}" width="${bw2}" height="${bh}" rx="12" fill="${P.approveShadow}"/>`
    + `<g class="a ${press}"><rect x="${bx2}" y="${by}" width="${bw2}" height="${bh}" rx="12" fill="${P.add}"/>`
    + chk(bx2 + (bw2 - aw) / 2, by + 33) + ty.text('Approve', 'k', 26, bx2 + (bw2 - aw) / 2 + 34, by + 41, { cls: 'c-ondiff' }) + `</g></g>`);

  // the hand-off card: ARCHITECTURE.md for coding agents
  const l2 = 'Claude Code · Cursor · Codex';
  const cw = Math.max(ty.measure('u', 'ARCHITECTURE.md', 25), ty.measure('b', l2, 22) + 34) + 112, chh = 104;
  const ccx = wx + ww - 32 - cw, ccy = fy + (foot - chh) / 2;
  const card = anim([[0, op(0) + ';transform:translateY(18px)'], [S.cardIn, op(0) + ';transform:translateY(18px)'], [S.cardIn + 0.5, op(1) + ';transform:translateY(0)']]);
  foot_.push(`<g class="a ${card}"><rect x="${n1(ccx)}" y="${ccy}" width="${n1(cw)}" height="${chh}" rx="16" fill="${P.panel}" stroke="${P.rule}" stroke-width="2"/>`
    + `<g transform="translate(${n1(ccx + 28)} ${ccy + 24})" fill="none" stroke="${P.signal}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M0 4a4 4 0 0 1 4-4h22l14 14v38a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4Z"/><path d="M26 0v14h14M9 27h22M9 37h22M9 47h14"/></g>`
    + ty.text('ARCHITECTURE.md', 'u', 25, ccx + 88, ccy + 44, { cls: 'c-t1' })
    + `<path d="M${n1(ccx + 90)} ${ccy + 73}h20m-7-7 7 7-7 7" fill="none" stroke="${P.text2}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
    + ty.text(l2, 'b', 22, ccx + 122, ccy + 80, { cls: 'c-t2' }) + `</g>`);
  out.push(`<g class="a ${dip}">${foot_.join('')}</g>`);

  // the pointer: comes in, presses Approve, leaves
  {
    const px1 = bx2 + bw2 * 0.84, py1 = by + bh * 0.66, px0 = px1 - 260, py0 = py1 - 190;
    const mv = (x, y, sc = 1) => `transform:translate(${n1(x)}px,${n1(y)}px) scale(${sc})`;
    const k = anim([[0, op(0) + ';' + mv(px0, py0)], [S.ptrIn, op(0) + ';' + mv(px0, py0)], [S.ptrIn + 0.25, op(1) + ';' + mv(px0 + 60, py0 + 44)], [S.ptrAt, op(1) + ';' + mv(px1, py1)], [S.click, op(1) + ';' + mv(px1, py1, 0.88)], [S.click + 0.2, op(1) + ';' + mv(px1, py1)], [S.merged + 0.1, op(1) + ';' + mv(px1 + 14, py1 + 10)], [S.merged + 0.45, op(0) + ';' + mv(px1 + 24, py1 + 18)]]);
    out.push(`<g class="hide a ${k}"><path d="M0 0V34l8.5-8 6.2 14.2 6.4-2.8-6-14H27Z" fill="${P.cursor}" stroke="${P.cursorEdge}" stroke-width="2.5" stroke-linejoin="round"/></g>`);
  }

  // ---- assemble ----
  const css = `.a{animation-duration:${T}s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.45,0,.25,1);animation-fill-mode:both}`
    + `.hide{opacity:0}`
    + `.c-t1{fill:${P.text}}.c-t2{fill:${P.text2}}.c-sub{fill:${P.dgSub}}.c-dgt{fill:${P.dgText}}.c-ondiff{fill:${P.onDiff}}.c-panelf{fill:${P.panel}}.c-edgef{fill:${P.dgEdge}}`
    + `.edge{fill:none;stroke:${P.dgEdge};stroke-width:1.6}`
    + `.box,.ours .fillonly{stroke-width:1.5}.box.ours{fill:${P.dgBox};stroke:${P.dgLine}}.box.store{fill:${P.dgStore};stroke:${P.dgStoreLine}}.box.ext{fill:${P.dgExt};stroke:${P.dgExtLine};stroke-dasharray:6 4}`
    + `.ours .fillonly{fill:${P.dgBox};stroke:none}.ours .strokeonly{fill:none;stroke:${P.dgLine};stroke-width:1.5}`
    + `.ico-f{fill:${P.dgIco};stroke:${P.dgIcoLine};stroke-width:1.1;stroke-linejoin:round}.ico-b{fill:${P.dgIcoLine}}.ico-l{fill:none;stroke:${P.dgIcoLine};stroke-width:1.1}`
    + ['add', 'chg', 'del'].map(k => { const c = P[k], soft = P[k + 'Soft'], tx = P[k + 'Text']; return `.r-${k}{fill:${soft};stroke:${c};stroke-width:2.5}.b-${k}{fill:${c}}.ch-${k}{fill:${soft};stroke:${tx};stroke-width:2}.gl-${k}{fill:none;stroke:${tx};stroke-width:3;stroke-linecap:round}.tx-${k}{fill:${tx}}`; }).join('')
    + `.edge.del{stroke:${P.del};stroke-dasharray:6 4}.f-del{fill:${P.del}}`
    + `.g-on{fill:none;stroke:${P.onDiff};stroke-width:2.6;stroke-linecap:round}`
    + kfCss
    + `@media (prefers-reduced-motion:reduce){.a{animation:none!important}}`;
  const defs = `<defs>${ty.defsSvg()}`
    + `<radialGradient id="glow" cx="72%" cy="40%" r="70%"><stop offset="0" stop-color="${P.glow}" stop-opacity="${P.glowA}"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="scan"><stop offset="0" stop-color="${P.signal}" stop-opacity="0"/><stop offset=".75" stop-color="${P.signal}" stop-opacity=".14"/><stop offset=".97" stop-color="${P.signal}" stop-opacity=".5"/><stop offset="1" stop-color="${P.signal}" stop-opacity="0"/></linearGradient>`
    + `<clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>`
    + `<filter id="soft" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="22"/></filter>`
    + `<filter id="rglow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    + `</defs>`;
  const title = 'archdraw: a scheduled check finds the code moved and drafts one update to the Bean There diagram, shown as a colored diff (Fax orders removed, Payments changed, Delivery partner added). Approve merges it, and ARCHITECTURE.md is ready for Claude Code, Cursor and Codex.';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}"><title>${title}</title><style>${css}</style>${defs}${out.join('')}</svg>\n`;
}

function edgeLen(pts) {
  // M x y C c1 c2 p L q: sample the cubic, add the line
  const [x0, y0, x1, y1, x2, y2, x3, y3, x4, y4] = pts;
  let L = 0, px = x0, py = y0;
  for (let i = 1; i <= 40; i++) {
    const t = i / 40, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    L += Math.hypot(x - px, y - py); px = x; py = y;
  }
  return L + Math.hypot(x4 - x3, y4 - y3);
}

function contours() {
  const cx = 1180, cy = 430, out = [];
  for (let k = 0; k < 14; k++) {
    const pts = [], R = 80 + k * 64;
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      const r = R * (1 + 0.09 * Math.sin(3 * t + k * 0.45) + 0.05 * Math.sin(5 * t - k * 0.8) + 0.03 * Math.cos(2 * t + k));
      pts.push([cx + r * Math.cos(t) * 1.25, cy + r * Math.sin(t)]);
    }
    let d = `M${pts[0][0].toFixed(0)} ${pts[0][1].toFixed(0)}`;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1.map(v => v.toFixed(0)).join(' ')} ${c2.map(v => v.toFixed(0)).join(' ')} ${p2.map(v => v.toFixed(0)).join(' ')}`;
    }
    out.push(`<path d="${d}"/>`);
  }
  return out.join('');
}

/** the building-blocks mark (site/src/components/Logo.astro), drawn `size` units square */
function mark(P, size) {
  const k = size / 40;
  return `<g transform="scale(${n2(k)})"><rect x="5.5" y="5.5" width="15" height="15" rx="2" fill="${P.mkS}"/><rect x="23.5" y="23.5" width="15" height="15" rx="2" fill="${P.mkS}"/><rect x="3" y="3" width="15" height="15" rx="2" fill="${P.mkA}" stroke="${P.mkO}" stroke-width="2.5"/><rect x="21" y="21" width="15" height="15" rx="2" fill="${P.mkB}" stroke="${P.mkO}" stroke-width="2.5"/><path d="M18 10.5H28.5V16" fill="none" stroke="${P.mkL}" stroke-width="3"/><path d="M24.6 15.5L28.5 20.6L32.4 15.5Z" fill="${P.mkL}"/></g>`;
}

function logoFull(theme) {
  const P = PAL[theme];
  const ty = makeTyper();
  const M = 112, size = 76, gap = 26;
  const w = ty.measure('d', 'archdraw', size, -0.02);
  const W = Math.ceil(M + gap + w + 8), H = 128;
  const word = ty.text('archdraw', 'd', size, M + gap, 92, { ls: -0.02 });
  const glow = theme === 'dark' ? `<filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>` : '';
  const halo = theme === 'dark' ? `<g filter="url(#g)" opacity=".22"><rect x="20" y="28" width="72" height="72" rx="10" fill="#5BB8FF"/></g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="archdraw"><title>archdraw</title>`
    + `<defs>${glow}${ty.defsSvg()}</defs>${halo}<g transform="translate(0 8)">${mark(P, M)}</g><g fill="${P.text}">${word}</g></svg>\n`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const theme of ['dark', 'light']) {
  fs.writeFileSync(`${OUT}/hero-${theme}.svg`, build(theme));
  fs.writeFileSync(`${OUT}/logo-${theme}.svg`, logoFull(theme));
}
console.log('ok', OUT, 'DX', DX);
