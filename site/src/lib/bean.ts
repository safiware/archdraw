// The Bean There example: the product's own render coordinates (before-overview and after-overview),
// shared by the server-rendered drawing and the client animations. Same boxes, labels and layout as the
// app draws them; never add architecture the example does not have.

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** A rounded rectangle as one path, so MorphSVG can grow it. */
export function rr(x: number, y: number, w: number, h: number, r = 9): string {
  const X = r2;
  return `M${X(x + r)} ${X(y)}H${X(x + w - r)}A${r} ${r} 0 0 1 ${X(x + w)} ${X(y + r)}V${X(y + h - r)}A${r} ${r} 0 0 1 ${X(x + w - r)} ${X(y + h)}H${X(x + r)}A${r} ${r} 0 0 1 ${X(x)} ${X(y + h - r)}V${X(y + r)}A${r} ${r} 0 0 1 ${X(x + r)} ${X(y)}Z`;
}

/** The API column sits this much further right after Payments grew. */
export const DX = 50.5;
export const VB_AFTER = '34 24 900 390';
export const VB_BEFORE = '34 24 846 390';

export type NodeId = 'app' | 'api' | 'queue' | 'menu' | 'pay' | 'fax' | 'delivery';
export interface BeanNode {
  x: number; y: number; w: number; h: number;
  cls: 'ours' | 'store' | 'ext';
  t: string; s?: string; sb?: string; cx: number;
  col?: 'B'; icon?: 'db'; bx?: number; bw?: number;
  only?: 'before' | 'after';
}
export const NODES: Record<NodeId, BeanNode> = {
  app: { x: 214.4, y: 187.4, w: 138, h: 66, cls: 'ours', t: 'Customer app', s: 'iOS + Android', cx: 283.4 },
  api: { x: 576.3, y: 187.4, w: 112, h: 66, cls: 'ours', t: 'Orders API', s: 'Node', cx: 632.3, col: 'B' },
  queue: { x: 563.3, y: 334.8, w: 138, h: 47, cls: 'ours', t: 'Barista queue', cx: 632.3, col: 'B' },
  menu: { x: 786.7, y: 187.4, w: 135, h: 66, cls: 'store', t: 'Menu DB', cx: 830.2, col: 'B', icon: 'db' },
  pay: { x: 550.8, y: 40, w: 163, h: 66, cls: 'ours', t: 'Payments', s: 'card + Apple Pay', sb: 'card', cx: 632.3, col: 'B', bx: 584.3, bw: 96 },
  fax: { x: 227.4, y: 309.4, w: 112, h: 66, cls: 'ext', t: 'Fax orders', s: 'legacy', cx: 283.4, only: 'before' },
  delivery: { x: 201.9, y: 309.4, w: 163, h: 66, cls: 'ext', t: 'Delivery partner', s: 'API', cx: 283.4, only: 'after' },
};

export type EdgeId = 'taps' | 'https' | 'enq' | 'sql' | 'charge' | 'deliv' | 'fax';
export interface BeanEdge {
  id: EdgeId; d: string; db?: string; l: string; lx: number; ly: number; lshift?: number;
  col?: 'B'; only?: 'before' | 'after';
}
export const EDGES: BeanEdge[] = [
  { id: 'taps', d: 'M 108 220.4 C 150.56 220.4, 171.84 220.4, 203.2 220.4 L 214.4 220.4', l: 'taps', lx: 159.8, ly: 224.3 },
  { id: 'https', d: 'M 352.4 220.4 C 441.96 220.4, 486.74 220.4, 565.1 220.4 L 576.3 220.4', db: 'M 352.4 220.4 C 421.76 220.4, 456.44 220.4, 514.6 220.4 L 525.8 220.4', l: 'HTTPS', lx: 462.95, ly: 224.3, lshift: -25.25 },
  { id: 'enq', col: 'B', d: 'M 632.3 253.4 C 632.3 285.96, 632.3 302.24, 632.3 323.6 L 632.3 334.8', l: 'enqueue', lx: 632.3, ly: 296.6 },
  { id: 'sql', col: 'B', d: 'M 688.3 220.4 C 727.66 220.4, 747.34 220.4, 775.5 220.4 L 786.7 220.4', l: 'SQL', lx: 736.1, ly: 224.3 },
  { id: 'charge', col: 'B', d: 'M 632.3 187.4 C 632.3 154.84, 632.3 138.56, 632.3 117.2 L 632.3 106', l: 'charge', lx: 632.3, ly: 152 },
  { id: 'deliv', only: 'after', d: 'M 364.9 342.4 C 444.51 342.4, 483.69 358.3, 552.1 358.3 L 563.3 358.3', l: 'delivery orders', lx: 462.7, ly: 354.25 },
  { id: 'fax', only: 'before', d: 'M 339.4 342.4 C 409.05 342.4, 443.15 358.3, 501.6 358.3 L 512.8 358.3', l: 'manual entry', lx: 424.7, ly: 354.25 },
];

const edge = (id: EdgeId) => EDGES.find(e => e.id === id)!;

/** Move every x coordinate of a path (the path data is plain "x y" pairs). */
export function shiftX(d: string, dx: number): string {
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, m => (i++ % 2 === 0 ? String(r2(+m + dx)) : m));
}

/** Edge paths for particles in the drawing as it is now. */
export const P: Record<EdgeId, string> = Object.fromEntries(EDGES.map(e => [e.id, e.d])) as Record<EdgeId, string>;
/** Edge paths for particles in the drawing as it was before the update. */
export const PB = {
  taps: edge('taps').d,
  https: edge('https').db!,
  enq: shiftX(edge('enq').d, -DX),
  sql: shiftX(edge('sql').d, -DX),
  charge: shiftX(edge('charge').d, -DX),
  fax: edge('fax').d,
};
/** Shapes the drafted update morphs between. */
export const MORPH = {
  payBefore: rr(NODES.pay.bx!, 40, NODES.pay.bw!, 66),
  payAfter: rr(NODES.pay.x, 40, NODES.pay.w, 66),
  httpsBefore: edge('https').db!,
  httpsAfter: edge('https').d,
  DX,
};
