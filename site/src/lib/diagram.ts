// Server-side markup for the Bean There drawing, restyled through CSS classes (see styles/diagram.css).
// mode 'after' is the drawing now, 'before' the drawing before the update, 'story' holds both so the
// review story can animate from one to the other. No inline styles: the CSP allows none.
import { DX, EDGES, NODES, VB_AFTER, VB_BEFORE, r2, rr, type BeanEdge, type BeanNode, type NodeId } from './bean';

type Mode = 'after' | 'before' | 'story';

const CW = 7.9; // Martian Mono advance at 12px with font-stretch 87.5%, measured in the browser
const lblW = (s: string) => r2(s.length * CW + 14);

const ICON_DESKTOP = `<g class="ico" transform="translate(55 186.9) scale(1.58333)"><path class="f" d="M1.2 2.6 h12.4 v9.2 h-12.4 Z"/><path class="b" d="M6.3 11.8 h2.2 v1.7 h-2.2 Z"/><path class="b" d="M4.2 13.5 h6.4 v1.1 h-6.4 Z"/><path class="f" d="M1.2 16.4 h12.4 v3.2 h-12.4 Z"/><path class="b" d="M2.6 17.6 h7.8 v0.9 h-7.8 Z"/><path class="f" d="M16.2 2.6 h6.6 v17 h-6.6 Z"/><path class="b" d="M18.6 5.2 a0.9 0.9 0 1 0 1.8 0 a0.9 0.9 0 1 0 -1.8 0 Z"/><path class="b" d="M17.4 9.4 h4.2 v0.7 h-4.2 Z M17.4 11.4 h4.2 v0.7 h-4.2 Z M17.4 13.4 h4.2 v0.7 h-4.2 Z"/></g>`;
const ICON_DB = `<g class="ico" transform="translate(869.7 201.4) scale(1.58333)"><path class="f" d="M3 6.4 v11.2 a9 3.4 0 0 0 18 0 v-11.2 Z"/><path class="f" d="M3 6.4 a9 3.4 0 0 1 18 0 a9 3.4 0 0 1 -18 0 Z"/><path class="l" d="M3 11 a9 3.4 0 0 0 18 0"/><path class="l" d="M3 15.6 a9 3.4 0 0 0 18 0"/></g>`;

function nodeSvg(id: NodeId, n: BeanNode, mode: Mode): string {
  const before = mode === 'before';
  let x = n.x, w = n.w;
  if (before && n.bx !== undefined && n.bw !== undefined) { x = n.bx; w = n.bw; }
  let s = `<g class="nd nd-${id} ${n.cls}" data-node="${id}"><path class="box" d="${rr(x, n.y, w, n.h)}"/>`;
  if (!n.s) {
    const ty = id === 'menu' ? n.y + 37.4 : n.y + n.h / 2 + 4.4;
    s += `<text class="t" x="${n.cx}" y="${r2(ty)}">${n.t}</text>`;
  } else {
    s += `<text class="t" x="${n.cx}" y="${r2(n.y + 28.4)}">${n.t}</text>`;
    if (mode === 'story' && n.sb) {
      s += `<text class="s s-before" x="${n.cx}" y="${r2(n.y + 47.4)}" opacity="0">${n.sb}</text>`;
      s += `<text class="s s-after" x="${n.cx}" y="${r2(n.y + 47.4)}">${n.s}</text>`;
    } else {
      s += `<text class="s" x="${n.cx}" y="${r2(n.y + 47.4)}">${before && n.sb ? n.sb : n.s}</text>`;
    }
  }
  if (n.icon === 'db') s += ICON_DB;
  return s + '</g>';
}

function edgeSvg(e: BeanEdge, uid: string, mode: Mode, diff: boolean): string {
  const before = mode === 'before';
  const d = before && e.db ? e.db : e.d;
  const lx = before && e.lshift ? e.lx + e.lshift : e.lx;
  const w = lblW(e.l);
  const add = diff && e.only === 'after';
  return `<g class="eg eg-${e.id}${add ? ' eg-add' : ''}" data-edge="${e.id}"><path class="edge" d="${d}" marker-end="url(#${uid}-arr${add ? '-add' : ''})"/><g class="lb lb-${e.id}"><rect class="lbl-bg" x="${r2(lx - w / 2)}" y="${r2(e.ly - 13.5)}" width="${w}" height="19" rx="4"/><text class="lbl" x="${lx}" y="${e.ly}">${e.l}</text></g></g>`;
}

function ring(kind: 'add' | 'chg' | 'del', x: number, y: number, w: number, h: number, extra = ''): string {
  const g = { add: '+', chg: '~', del: '−' }[kind];
  return `<g class="ring ring-${kind}${extra}"><rect x="${r2(x)}" y="${r2(y)}" width="${w}" height="${h}" rx="13"/><circle cx="${r2(x + w)}" cy="${r2(y)}" r="11"/><text x="${r2(x + w)}" y="${r2(y + 4.6)}">${g}</text></g>`;
}

function defs(uid: string): string {
  return `<defs><marker id="${uid}-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arr" d="M 0 0 L 10 5 L 0 10 z"/></marker><marker id="${uid}-arr-add" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arr arr-add" d="M 0 0 L 10 5 L 0 10 z"/></marker><filter id="${uid}-glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
}

export interface DiagramOpts {
  mode?: Mode;
  /** show the colored review marks */
  diff?: boolean;
  /** unique prefix for ids inside this svg */
  uid: string;
  /** hero only: rings that flash when a change lands on a box */
  flash?: boolean;
  /** accessible description; empty means decorative */
  label?: string;
  cls?: string;
}

export function diagram({ mode = 'after', diff = false, uid, flash = false, label = '', cls = '' }: DiagramOpts): string {
  const before = mode === 'before';
  const vb = before ? VB_BEFORE : VB_AFTER;
  const show = (n: { only?: 'before' | 'after' }) => mode === 'story' || (before ? n.only !== 'after' : n.only !== 'before');
  const colA: string[] = [ICON_DESKTOP, `<text class="t" x="74" y="249.3">Customer</text>`];
  const colB: string[] = [];
  for (const e of EDGES) {
    if (!show(e)) continue;
    const m = edgeSvg(e, uid, mode, diff);
    (e.col === 'B' ? colB : colA).push(e.only ? m.replace('class="eg ', `class="eg only-${e.only} `) : m);
  }
  for (const [id, n] of Object.entries(NODES) as [NodeId, BeanNode][]) {
    if (!show(n)) continue;
    const m = nodeSvg(id, n, mode);
    (n.col === 'B' ? colB : colA).push(n.only ? m.replace('class="nd ', `class="nd only-${n.only} `) : m);
  }
  let rings = '';
  if (diff && before) rings = ring('del', 221.4, 303.4, 124, 78);
  if (diff && !before) {
    rings = ring('chg', 544.8, 34, 175, 78, ' r-pay') + ring('add', 195.9, 303.4, 175, 78, ' r-deliv');
    if (mode === 'story') rings += ring('del', 221.4, 303.4, 124, 78, ' r-fax');
  }
  let flashes = '';
  if (flash) {
    const f = (id: NodeId) => { const n = NODES[id]; return `<rect class="fl fl-${id}" x="${r2(n.x - 6)}" y="${r2(n.y - 6)}" width="${r2(n.w + 12)}" height="${r2(n.h + 12)}" rx="13" opacity="0"/>`; };
    flashes = `<g class="flashes">${(['pay', 'delivery', 'queue', 'api', 'menu', 'app'] as NodeId[]).map(f).join('')}</g>`;
  }
  const bShift = before ? ` transform="translate(${-DX} 0)"` : '';
  const stale = mode === 'story'
    ? `<g class="stale-tags" aria-hidden="true"><g class="tag tag-pay"><rect x="392" y="57" width="134" height="24" rx="12"/><text x="459" y="73.4">still says card</text></g><g class="tag tag-fax"><rect x="86" y="385" width="272" height="24" rx="12"/><text x="222" y="401.4">still drawn, gone from the code</text></g></g>`
    : '';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="dg dg-${mode}${cls ? ' ' + cls : ''}" viewBox="${vb}" ${a11y} xmlns="http://www.w3.org/2000/svg">${defs(uid)}<g class="colA">${colA.join('')}</g><g class="colB"${bShift}>${colB.join('')}</g><g class="rings" filter="url(#${uid}-glow)">${rings}</g>${flashes}${stale}</svg>`;
}

/** Small thumbnail of the old drawing for the problem section. Boxes only, no text. */
export function thumb(): string {
  const b = (x: number, y: number, w: number, h: number, c = '') => `<rect class="tb${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>`;
  return `<svg class="thumb" viewBox="40 30 860 360" aria-hidden="true"><g class="te"><path d="M108 220H214M352 220H526M582 253V335M638 220H736M582 187V106M339 342C420 342 440 358 513 358"/></g>${b(60, 190, 46, 60, ' ic')}${b(214, 187, 138, 66)}${b(526, 187, 112, 66)}${b(513, 335, 138, 47)}${b(736, 187, 135, 66, ' st')}${b(534, 40, 96, 66, ' pay')}${b(227, 309, 112, 66, ' fax')}</svg>`;
}

/** Survey contour lines behind the hero: the ground that keeps shifting. */
export function contours(): string {
  const cx = 1080, cy = 380, out: string[] = [];
  for (let k = 0; k < 16; k++) {
    const pts: [number, number][] = [];
    const R = 70 + k * 52;
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      const r = R * (1 + 0.09 * Math.sin(3 * t + k * 0.45) + 0.05 * Math.sin(5 * t - k * 0.8) + 0.03 * Math.cos(2 * t + k));
      pts.push([cx + r * Math.cos(t) * 1.25, cy + r * Math.sin(t)]);
    }
    // closed Catmull-Rom as cubic Béziers
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    out.push(`<path d="${d}"/>`);
  }
  return `<svg viewBox="0 0 1500 900" preserveAspectRatio="xMidYMid slice">${out.join('')}</svg>`;
}

/** Commit activity under each day of the week: more change each day. Heights as SVG attributes (no inline styles). */
export function ground(day: number): string {
  let seed = day * 97 + 13;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  let s = '';
  for (let i = 0; i < 24; i++) {
    const h = i < day * 5 ? 25 + rnd() * 75 : 6 + rnd() * 8;
    s += `<rect x="${i * 10}" y="${r2(100 - h)}" width="8" height="${r2(h)}" rx="1"/>`;
  }
  return `<svg class="ground" viewBox="0 0 238 100" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
}

export const AFTER_LABEL = 'Bean There architecture: Customer taps the Customer app (iOS and Android), which calls the Orders API (Node) over HTTPS. The Orders API enqueues to the Barista queue, reads the Menu DB over SQL and charges Payments (card and Apple Pay). A Delivery partner API sends delivery orders into the Barista queue.';
export const BEFORE_LABEL = 'The drawing before the update: the same system with Payments taking card only, and a legacy Fax orders line feeding the Barista queue by manual entry. Fax orders is marked removed.';
export const DIFF_LABEL = AFTER_LABEL + ' Marked as the update: Delivery partner and its delivery orders edge added, Payments changed from card to card plus Apple Pay, Fax orders removed.';
