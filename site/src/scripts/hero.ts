// Hero: the logo's arrow draws once, the headline assembles from a readable scatter, particles run along
// the edges, and the live ticker shows changes landing from you, a teammate and a coding agent, with
// archdraw's hourly check sweeping the drawing. Everything here is decoration over a complete page.
import { $, Flip, MOTION, ScrollTrigger, SplitText, gsap } from './gsap';
import { AFTER_ROUTES, hold, loop, particles } from './live';

type Who = 'you' | 'mate' | 'agent' | 'arch';
interface Ev { at: number; w: Who; n: string; a?: string; t: string; node?: string }

// One two-hour cycle, minutes after the hour the cycle starts. None of these changes the shape of the
// system, so each hourly check finds the drawing still true. (The real update already landed at 10:00.)
const CYCLE: Ev[] = [
  { at: 12, w: 'mate', n: 'Maya', a: 'M', t: 'gave Menu DB a faster item lookup.', node: 'menu' },
  { at: 31, w: 'agent', n: 'Coding agent', a: 'AI', t: 'added a retry to the Orders API.', node: 'api' },
  { at: 47, w: 'you', n: 'You', a: 'Y', t: 'renamed a field in the Customer app.', node: 'app' },
  { at: 60, w: 'arch', n: 'archdraw', t: 'checked 3 new commits. The drawing still matches.' },
  { at: 74, w: 'agent', n: 'Coding agent', a: 'AI', t: 'tidied the Barista queue worker.', node: 'queue' },
  { at: 92, w: 'you', n: 'You', a: 'Y', t: 'fixed a rounding bug in Payments.', node: 'pay' },
  { at: 103, w: 'mate', n: 'Maya', a: 'M', t: 'updated the Delivery partner client.', node: 'delivery' },
  { at: 120, w: 'arch', n: 'archdraw', t: 'checked 3 new commits. The drawing still matches.' },
];
const START = 10 * 60; // the cycle starts at 10:00, just after the approved update
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function initHero(): void {
  const hero = $('.hero');
  if (!hero) return;

  /* one control holds every looping animation on the page */
  const holdBtn = $<HTMLButtonElement>('.hold', hero);
  holdBtn?.addEventListener('click', () => {
    const on = holdBtn.getAttribute('aria-pressed') !== 'true';
    holdBtn.setAttribute('aria-pressed', String(on));
    $('.hold-t', holdBtn).textContent = on ? 'Play motion' : 'Pause motion';
    hold(on);
  });
  const mm = gsap.matchMedia();
  mm.add(MOTION, () => {
    /* logo: the arrow draws once from block to block */
    const mark = $('.top .mark');
    if (mark) {
      gsap.timeline({ delay: 0.15 })
        .from($('.mk-l', mark), { drawSVG: '0%', duration: 0.7, ease: 'power2.inOut' })
        .from($('.mk-h', mark), { scale: 0, transformOrigin: '50% 0%', duration: 0.35, ease: 'back.out(3)' }, '-=.15');
    }

    /* headline assembles from a visible, scattered state */
    let split: SplitText | undefined;
    document.fonts.ready.then(() => {
      split = SplitText.create('#hero-h', {
        type: 'words,chars', autoSplit: true,
        onSplit(self) {
          return gsap.from(self.chars, {
            opacity: 0.3, x: () => gsap.utils.random(-26, 26), y: () => gsap.utils.random(-18, 22), rotation: () => gsap.utils.random(-14, 14),
            duration: 1.1, ease: 'expo.out', stagger: { each: 0.016, from: 'random' },
          });
        },
      });
    });

    /* particles along every edge */
    const stage = $('.hero-stage');
    const svg = $<SVGSVGElement>('.hero-dg', stage);
    const flow = particles($<SVGSVGElement>('.pts', stage), AFTER_ROUTES, { speed: 80 });

    /* archdraw's check: a scan sweeps the drawing and the pill shows the time */
    const scan = $('.scan', stage), time = $('#hero-time');
    const sweep = (at: string) => gsap.timeline()
      .set(scan, { opacity: 0, x: -90 })
      .to(scan, { opacity: 1, duration: 0.25 })
      .to(scan, { x: () => stage.clientWidth, duration: 2.2, ease: 'power1.inOut' }, 0)
      .to(scan, { opacity: 0, duration: 0.3 }, 1.95)
      .call(() => { time.textContent = at; });

    /* the live ticker: changes landing, Flip moves the rows */
    const list = $('#ticks');
    const logo = mark ? mark.outerHTML : '';
    let i = 0;
    const tick = () => {
      const e = CYCLE[i % CYCLE.length];
      const at = hhmm(START + Math.floor(i / CYCLE.length) * 120 + e.at);
      i++;
      const li = document.createElement('li');
      li.className = 'tk who-' + e.w;
      const av = document.createElement('span');
      av.className = 'av'; av.setAttribute('aria-hidden', 'true');
      if (e.w === 'arch') av.innerHTML = logo; else av.textContent = e.a ?? '';
      const t = document.createElement('span');
      t.className = 'tk-t';
      const b = document.createElement('b'); b.textContent = e.n;
      t.append(b, e.t);
      const tm = document.createElement('time'); tm.textContent = at;
      li.append(av, t, tm);
      const state = Flip.getState(list.children);
      list.prepend(li);
      while (list.children.length > 3) list.lastElementChild!.remove();
      Flip.from(state, {
        duration: 0.55, ease: 'power3.out', targets: list.children,
        onEnter: els => gsap.fromTo(els, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }),
      });
      if (e.w === 'arch') sweep(at);
      if (e.node) {
        const fl = svg.querySelector('.fl-' + e.node);
        if (fl) { fl.setAttribute('class', 'fl fl-' + e.node + ' who-' + e.w); gsap.fromTo(fl, { opacity: 1 }, { opacity: 0, duration: 1.8, ease: 'power2.in' }); }
      }
    };
    const ticker = gsap.timeline({ repeat: -1, delay: 2.4, paused: true }).call(tick).to({}, { duration: 3.2 });
    const tk = loop(on => (on ? ticker.resume() : ticker.pause()), () => ticker.kill());

    /* everything rests while the hero is off screen */
    const st = ScrollTrigger.create({
      trigger: hero, start: 'top bottom', end: 'bottom top',
      onToggle: s => {
        hero.classList.toggle('off', !s.isActive);
        if (s.isActive) { flow.play(); tk.play(); } else { flow.pause(); tk.pause(); }
      },
    });
    flow.play();
    tk.play();
    return () => { flow.kill(); tk.kill(); st.kill(); split?.revert(); };
  });
}
