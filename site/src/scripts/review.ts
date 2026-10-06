// The review story. Approve works everywhere, with or without motion. On wide screens with motion the
// section pins and scrolling plays the week: the code changes, the drawing falls out of step, archdraw
// draws the update, and you approve.
import { $, $$, MOTION, ScrollTrigger, WIDE, gsap, reduceMotion } from './gsap';
import { AFTER_ROUTES, BEFORE_ROUTES, P, draftTimeline, particles, setBefore, type Particles } from './live';

export function initReview(): void {
  const doc = document.documentElement;
  const story = $('#review');
  if (!story) return;
  const sSvg = $<SVGSVGElement>('.dg-story', story), sPts = $<SVGSVGElement>('.story-stage .pts', story);
  const approve = $<HTMLButtonElement>('#approve'), aStatus = $('#approve-status'), reset = $<HTMLButtonElement>('#reset');
  const pill = $('#story-pill'), pillT = $('#story-pill-t');
  const label = $('span', approve);
  let settled = false, pinned = false;
  let flow: Particles | null = null;
  const canMove = () => !reduceMotion.matches;
  // aria-disabled, not disabled: the button stays focusable while the story plays, and says why it waits
  const setOff = (off: boolean) => approve.setAttribute('aria-disabled', String(off));
  const isOff = () => approve.getAttribute('aria-disabled') === 'true';

  function settle() {
    if (settled) return;
    settled = true;
    story.classList.add('settled');
    approve.classList.remove('ready');
    setOff(true);
    label.textContent = 'Approved';
    aStatus.textContent = 'Approved. The drawing is true again.';
    pill.classList.remove('warn');
    pillT.textContent = 'in step with the code · 10:05';
    reset.hidden = false;
    if (canMove()) {
      flow = particles(sPts, [...AFTER_ROUTES, { d: P.deliv, k: 'add', n: 3, off: 0.5 }], { speed: 95 });
      flow.play();
    }
  }
  function unsettle() {
    if (!settled) return;
    settled = false;
    story.classList.remove('settled');
    setOff(false);
    approve.classList.add('ready');
    label.textContent = 'Approve update';
    aStatus.textContent = 'Waiting for your OK.';
    pill.classList.add('warn');
    pillT.textContent = 'update drafted · 10:00';
    reset.hidden = true;
    if (flow) { flow.kill(); flow = null; }
  }
  approve.addEventListener('click', () => {
    if (settled) return;
    if (isOff() && pinned) {
      // pressed before the story got there: jump to its end state, then approve
      const st = ScrollTrigger.getById('story');
      if (st) { window.scrollTo({ top: st.end, behavior: 'auto' }); ScrollTrigger.update(); }
    }
    settle();
    reset.focus();
  });
  reset.addEventListener('click', () => {
    unsettle();
    approve.focus();
    if (pinned) {
      const st = ScrollTrigger.getById('story');
      if (st) window.scrollTo({ top: st.start + 2, behavior: canMove() ? 'smooth' : 'auto' });
    }
  });

  const mm = gsap.matchMedia();
  mm.add({ motion: MOTION, wide: WIDE }, ctx => {
    const { motion, wide } = ctx.conditions as { motion: boolean; wide: boolean };
    if (!motion || !wide) return;

    pinned = true;
    doc.classList.add('is-pinned');
    unsettle();
    setBefore(sSvg);
    pillT.textContent = 'in step · checked Monday';
    pill.classList.remove('warn');
    const pre = particles(sPts, BEFORE_ROUTES, { speed: 80 });
    const steps = $$('.steps > li', story);
    const STATUS = ['3 changes landed in the code.', 'Out of step. The drawing still shows the old system.', 'archdraw is drawing the update.', 'Waiting for your OK.'];
    const PILL = ['in step · checked Monday', 'out of step · 3 changes', 'update drafted · 10:00', 'update drafted · 10:00'];
    let cur = -1;
    const setStep = (s: number) => {
      if (s === cur) return;
      cur = s;
      steps.forEach((li, i) => li.classList.toggle('on', i === s));
      story.dataset.step = String(s);
      sSvg.classList.toggle('is-stale', s === 1);
      if (s === 0) pre.play(); else pre.pause();
      gsap.to(pre.el, { opacity: s === 0 ? 1 : 0, duration: s === 1 ? 0.9 : 0.3, overwrite: true });
      if (s < 3 && settled) unsettle();
      if (!settled) {
        aStatus.textContent = STATUS[s];
        pillT.textContent = PILL[s];
        pill.classList.toggle('warn', s >= 1);
        setOff(s < 2);
        approve.classList.toggle('ready', s === 3);
      }
    };
    const commits = $$('.commit', story);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'story', trigger: story, start: 'top top', end: '+=2600', pin: true, scrub: 0.6, anticipatePin: 1,
        onUpdate: self => { const t = self.progress * tl.duration(); setStep(t < 1.3 ? 0 : t < 2.1 ? 1 : t < 4.1 ? 2 : 3); },
      },
    });
    tl.fromTo(commits, { opacity: 0.6, x: -14 }, { opacity: 1, x: 0, stagger: 0.3, duration: 0.4, ease: 'power2.out' }, 0.1)
      .fromTo($$('.nd-pay .box, .nd-fax .box', sSvg), { strokeWidth: 1.5 }, { strokeWidth: 3, duration: 0.3 }, 1.3)
      .to({}, { duration: 0.6 })
      .add(draftTimeline(sSvg), 2.1)
      .to({}, { duration: 1.1 }, 4.3);
    setStep(0);
    // the pin's length depends on the final layout: measure again once the fonts are in
    document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => {
      pinned = false;
      doc.classList.remove('is-pinned');
      pre.kill();
      unsettle();
      sSvg.classList.remove('is-stale');
      steps.forEach(li => li.classList.remove('on'));
      delete story.dataset.step;
      setOff(false);
      approve.classList.add('ready');
      aStatus.textContent = 'Waiting for your OK.';
      pillT.textContent = 'update drafted · 10:00';
      pill.classList.add('warn');
    };
  });
}
