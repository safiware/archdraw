// Phone drawing frames: the drawing keeps a readable size and scrolls sideways inside its frame.
// Open each frame on its busiest part, and keep the frame a keyboard stop only while it can scroll.
export function initFrames(): void {
  const frames = [...document.querySelectorAll<HTMLElement>('.stage-scroll')];
  const fit = () => frames.forEach(el => {
    const scrolls = el.scrollWidth > el.clientWidth + 1;
    if (scrolls) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'Diagram, scrolls sideways');
      const focus = Number(el.dataset.focus ?? 0.5); // where the busiest part sits, as a share of the drawing's width
      el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, focus * el.scrollWidth - el.clientWidth / 2));
    } else {
      el.removeAttribute('tabindex');
      el.setAttribute('aria-label', 'Diagram');
    }
  });
  fit();
  let w = window.innerWidth;
  window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; fit(); } });
}
