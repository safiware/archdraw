// Problem: the ground keeps shifting under the drawing. Commit bars rise when the week scrolls in.
import { $$, MOTION, gsap } from './gsap';

export function initProblem(): void {
  const bars = $$('.ground rect');
  if (!bars.length) return;
  gsap.matchMedia().add(MOTION, () => {
    gsap.from(bars, {
      scaleY: 0.15, transformOrigin: '50% 100%', duration: 0.9, ease: 'power3.out', stagger: { each: 0.012 },
      scrollTrigger: { trigger: '.week', start: 'top 85%', once: true },
    });
  });
}
