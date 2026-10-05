// How it works: the schedule switch works with or without motion; with motion the sketch draws itself
// once and a particle runs along each elbow arrow from one step to the next.
import { $, $$, MOTION, ScrollTrigger, gsap } from './gsap';
import { particles, type Particles } from './live';

const NOTES: Record<string, string> = {
  hour: 'Next check in 40 minutes.',
  day: 'Next check in 24 hours.',
  ask: 'No timer. Press Sync now when you want a check.',
};
const TURN: Record<string, string> = { hour: 'rotate(0deg)', day: 'rotate(270deg)', ask: 'rotate(0deg)' };

export function initHow(): void {
  const how = $('#how');
  if (!how) return;

  /* schedule switch */
  const hand = $<SVGPathElement>('.c-hand', how), note = $('#every-note', how), clock = $('.clock', how);
  const btns = $$<HTMLButtonElement>('[data-every]', how);
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    const k = b.dataset.every ?? 'hour';
    hand.style.transform = TURN[k];
    clock.classList.toggle('idle', k === 'ask');
    note.textContent = NOTES[k];
  }));

  gsap.matchMedia().add(MOTION, () => {
    const sk = $('.sketch svg', how);
    gsap.from($$('.s-bx, .s-ln', sk), {
      drawSVG: '0%', duration: 0.6, stagger: 0.1, ease: 'power1.inOut',
      scrollTrigger: { trigger: sk, start: 'top bottom', once: true },
    });
    const flows: Particles[] = $$<SVGSVGElement>('.elbow', how).map(svg => particles(svg, [{ d: 'M0 8H18V22', n: 1 }], { speed: 16, halo: 4, core: 1.6 }));
    const st = ScrollTrigger.create({
      trigger: how, start: 'top bottom', end: 'bottom top',
      onToggle: s => flows.forEach(f => (s.isActive ? f.play() : f.pause())),
    });
    return () => { flows.forEach(f => f.kill()); st.kill(); };
  });
}
