// The live-system runtime: glowing particles along edges, and the drafted update as a timeline.
// Transform and opacity only, so nothing triggers layout while it runs.
import { gsap, reduceMotion } from './gsap';
import { MORPH, P, PB } from '../lib/bean';

const NS = 'http://www.w3.org/2000/svg';

export interface Route { d: string; k?: 'add' | 'you' | 'mate' | 'agent'; n?: number; off?: number; len?: number }
export interface Particles { el: SVGGElement; play(): void; pause(): void; kill(): void }

function pathLen(d: string): number {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  try { return p.getTotalLength(); } catch { return 200; }
}

/* Looping animations register here, so one control can hold them all (WCAG 2.2.2, pause, stop, hide).
   A loop plays only when its section wants it and the visitor has not held the motion. */
interface Loop { wanted: boolean; run(on: boolean): void }
const loops = new Set<Loop>();
let held = false;
export interface LoopHandle { play(): void; pause(): void; kill(): void }
export function loop(run: (on: boolean) => void, onKill?: () => void): LoopHandle {
  const l: Loop = { wanted: false, run };
  loops.add(l);
  return {
    play() { l.wanted = true; if (!held && !reduceMotion.matches) run(true); },
    pause() { l.wanted = false; run(false); },
    kill() { loops.delete(l); run(false); onKill?.(); },
  };
}
/** Hold (or release) every looping animation on the page, CSS ones included. */
export function hold(on: boolean): void {
  held = on;
  document.documentElement.classList.toggle('motion-held', on);
  loops.forEach(l => l.run(!on && l.wanted && !reduceMotion.matches));
}

/** A layer of particles running along the given paths inside an overlay svg. */
export function particles(overlay: SVGSVGElement, routes: Route[], opts: { speed?: number; halo?: number; core?: number } = {}): Particles {
  const speed = opts.speed ?? 70; // svg units per second
  const g = document.createElementNS(NS, 'g');
  overlay.appendChild(g);
  const tls: gsap.core.Timeline[] = [];
  for (const r of routes) {
    const len = r.len ?? pathLen(r.d);
    const n = r.n ?? Math.max(1, Math.min(3, Math.round(len / 150)));
    const dur = Math.max(1.4, len / speed);
    for (let i = 0; i < n; i++) {
      const p = document.createElementNS(NS, 'g');
      p.setAttribute('class', 'pt' + (r.k ? ' k-' + r.k : ''));
      const halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('class', 'halo'); halo.setAttribute('r', String(opts.halo ?? 7));
      const core = document.createElementNS(NS, 'circle');
      core.setAttribute('class', 'core'); core.setAttribute('r', String(opts.core ?? 2.4));
      p.append(halo, core);
      gsap.set(p, { opacity: 0 });
      g.appendChild(p);
      const tl = gsap.timeline({ repeat: -1, paused: true });
      tl.to(p, { motionPath: { path: r.d }, duration: dur, ease: 'none' }, 0)
        .fromTo(p, { opacity: 0 }, { opacity: 1, duration: dur * 0.18, ease: 'sine.out' }, 0)
        .to(p, { opacity: 0, duration: dur * 0.18, ease: 'sine.in' }, dur * 0.82);
      tl.progress((i + (r.off ?? 0)) / n);
      tls.push(tl);
    }
  }
  const handle = loop(on => tls.forEach(t => (on ? t.play() : t.pause())), () => { tls.forEach(t => t.kill()); g.remove(); });
  return { el: g, ...handle };
}

export const AFTER_ROUTES: Route[] = [{ d: P.taps }, { d: P.https }, { d: P.enq }, { d: P.sql }, { d: P.charge }, { d: P.deliv }];
export const BEFORE_ROUTES: Route[] = [{ d: PB.taps }, { d: PB.https }, { d: PB.enq }, { d: PB.sql }, { d: PB.charge }, { d: PB.fax }];
export { P };

/** Put a story drawing into its "before" state: what the old drawing said. */
export function setBefore(svg: SVGSVGElement): void {
  const q = (s: string) => svg.querySelectorAll(s), one = (s: string) => svg.querySelector(s)!;
  gsap.set(one('.colB'), { x: -MORPH.DX });
  gsap.set(one('.nd-pay .box'), { attr: { d: MORPH.payBefore } });
  gsap.set(one('.eg-https .edge'), { attr: { d: MORPH.httpsBefore } });
  gsap.set(one('.lb-https'), { x: -25.25 });
  gsap.set(q('.only-before'), { opacity: 1 });
  gsap.set(one('.nd-pay .s-before'), { opacity: 1 });
  gsap.set(one('.nd-pay .s-after'), { opacity: 0 });
  gsap.set(one('.nd-delivery'), { opacity: 1 });
  gsap.set(one('.nd-delivery .box'), { drawSVG: '0%', fillOpacity: 0 });
  gsap.set(q('.nd-delivery text'), { opacity: 0 });
  const de = one('.eg-deliv .edge') as SVGPathElement;
  if (!de.dataset.m) de.dataset.m = de.getAttribute('marker-end') ?? '';
  gsap.set(de, { drawSVG: '0%', attr: { 'marker-end': 'none' } });
  gsap.set(one('.eg-deliv .lb'), { opacity: 0 });
  gsap.set(q('.ring'), { opacity: 0, transformOrigin: '50% 50%' });
}

/** The drafted update: fax orders goes red and leaves, the column slides, Payments grows,
 *  Delivery partner is drawn in, and the marks glow on the real boxes. */
export function draftTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const q = (s: string) => [...svg.querySelectorAll(s)], one = (s: string) => svg.querySelector(s)!;
  const de = one('.eg-deliv .edge') as SVGPathElement;
  const tl = gsap.timeline();
  tl.fromTo(one('.r-fax'), { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 0)
    .to(q('.nd-fax, .eg-fax'), { opacity: 0.25, duration: 0.3, ease: 'power1.in' }, 0.4)
    .to([...q('.nd-fax, .eg-fax'), one('.r-fax')], { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.75)
    .to(one('.colB'), { x: 0, duration: 0.7, ease: 'power3.inOut' }, 0.55)
    .to(one('.eg-https .edge'), { morphSVG: MORPH.httpsAfter, duration: 0.7, ease: 'power3.inOut' }, 0.55)
    .to(one('.lb-https'), { x: 0, duration: 0.7, ease: 'power3.inOut' }, 0.55)
    .to(one('.nd-pay .box'), { morphSVG: MORPH.payAfter, duration: 0.7, ease: 'power3.inOut' }, 0.55)
    .to(one('.nd-pay .s-before'), { opacity: 0, duration: 0.2 }, 0.8)
    .to(one('.nd-pay .s-after'), { opacity: 1, duration: 0.3 }, 0.95)
    .to(one('.nd-delivery .box'), { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut' }, 1.0)
    .to(one('.nd-delivery .box'), { fillOpacity: 1, duration: 0.3 }, 1.45)
    .set(one('.nd-delivery .box'), { strokeDasharray: '6 4', strokeDashoffset: 0 }, 1.62)
    .to(q('.nd-delivery text'), { opacity: 1, duration: 0.3, stagger: 0.08 }, 1.45)
    .to(de, { drawSVG: '100%', duration: 0.55, ease: 'power2.inOut' }, 1.5)
    .set(de, { attr: { 'marker-end': de.dataset.m ?? '' } }, 2.02)
    .to(one('.eg-deliv .lb'), { opacity: 1, duration: 0.3 }, 1.85)
    .fromTo(one('.r-pay'), { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.3)
    .fromTo(one('.r-deliv'), { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.8);
  return tl;
}
