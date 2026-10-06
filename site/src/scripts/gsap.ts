// GSAP and the plugins the page uses, registered once. Loaded only in the browser.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, SplitText, Flip);

/** Media conditions every animated piece uses. Motion only when the visitor has not asked for less. */
export const MOTION = '(prefers-reduced-motion: no-preference)';
/** The review story pins only on wide, tall-enough screens. */
export const WIDE = '(min-width: 1024px) and (min-height: 660px)';

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];

export { gsap, ScrollTrigger, SplitText, Flip };
