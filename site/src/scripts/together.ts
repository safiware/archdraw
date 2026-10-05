// Every collaborator, one drawing: three streams of change run into one reviewed update.
import { $, $$, MOTION, ScrollTrigger, gsap } from './gsap';
import { particles } from './live';

export function initTogether(): void {
  const sec = $('#together');
  if (!sec) return;
  gsap.matchMedia().add(MOTION, () => {
    const opts = { speed: 60, halo: 5, core: 2.6 };
    const flows = [
      particles($<SVGSVGElement>('.streams', sec), [
        { d: 'M0 48 C150 48 130 164 268 164', k: 'you', n: 2 },
        { d: 'M0 164 L268 164', k: 'mate', n: 2 },
        { d: 'M0 280 C150 280 130 164 268 164', k: 'agent', n: 2 },
        { d: 'M268 164H300', n: 1 },
      ], opts),
      particles($<SVGSVGElement>('.streams-v', sec), [
        { d: 'M50 0 C50 60 150 40 150 96', k: 'you', n: 1 },
        { d: 'M150 0 L150 96', k: 'mate', n: 1 },
        { d: 'M250 0 C250 60 150 40 150 96', k: 'agent', n: 1 },
      ], opts),
    ];
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'bottom top',
      onToggle: s => flows.forEach(f => (s.isActive ? f.play() : f.pause())),
    });
    gsap.from($$('.src', sec), { x: -16, opacity: 0.4, duration: 0.7, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: $('.flow-fig', sec), start: 'top 80%', once: true } });
    return () => { flows.forEach(f => f.kill()); st.kill(); };
  });
}
