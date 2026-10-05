// For agents: the exported map writes itself in, from a dim but readable state.
import { $, $$, MOTION, gsap } from './gsap';

export function initAgents(): void {
  const file = $('#agents .file');
  if (!file) return;
  gsap.matchMedia().add(MOTION, () => {
    gsap.from($$('.ln', file), { opacity: 0.35, x: -6, duration: 0.4, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: file, start: 'top 75%', once: true } });
  });
}
