'use client';

import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** One place to register GSAP plugins (safe to import from any client module). */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
  gsap.defaults({ ease: 'none' });
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin };
