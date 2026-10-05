// Privacy: pick a provider and the note follows; with motion, packets run down the one wire out.
import { $, $$, MOTION, ScrollTrigger, gsap } from './gsap';
import { particles } from './live';

export function initPrivate(): void {
  const sec = $('#private');
  if (!sec) return;
  const note = $('#prov-note', sec);
  $$<HTMLInputElement>('input[name="prov"]', sec).forEach(r => r.addEventListener('change', () => {
    const s = document.createElement('strong');
    s.textContent = r.value;
    note.replaceChildren('Your code goes to ', s, ' and nowhere else.');
  }));
  gsap.matchMedia().add(MOTION, () => {
    const wire = particles($<SVGSVGElement>('.wire', sec), [{ d: 'M10 0 V64', n: 2 }], { speed: 40 });
    const st = ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: s => (s.isActive ? wire.play() : wire.pause()) });
    return () => { wire.kill(); st.kill(); };
  });
}
