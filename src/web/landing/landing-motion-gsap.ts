// GSAP motion for the landing page: hero intro, scrubbed story reveal, pinned rules split,
// card entrances. Returns a cleanup that kills every tween/trigger before the game boots.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PIN_MIN_WIDTH_PX = 900; // below this the rules stack in one column, no pin

export function initLandingMotion(root: HTMLElement): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = gsap.context(() => {
    if (reduceMotion) return; // content is fully visible by default; skip all animation

    // Hero: heavy staggered fade-up (with de-blur) of eyebrow, title, lede and CTAs.
    gsap.from('[data-hero-reveal]', {
      y: 48, opacity: 0, filter: 'blur(6px)', duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.05,
      clearProps: 'filter',
    });

    // Story: each word scrubs from 0.1 to 1 opacity as the paragraph crosses the viewport.
    gsap.fromTo('[data-scrub-text] .ln-word', { opacity: 0.1 }, {
      opacity: 1, stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: '[data-scrub-text]', start: 'top 80%', end: 'bottom 45%', scrub: true },
    });

    // Every [data-reveal] element: heavy fade-up resolving from blur, once, as it enters the viewport.
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 64, opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'expo.out', clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    // Rules: pin the title column on the left while rule cards scroll up on the right (desktop only).
    const mm = gsap.matchMedia();
    mm.add(`(min-width: ${PIN_MIN_WIDTH_PX}px)`, () => {
      ScrollTrigger.create({
        trigger: '.ln-rules', pin: '[data-pin]', start: 'top 20%', end: 'bottom 70%', pinSpacing: false,
      });
    });
    gsap.utils.toArray<HTMLElement>('[data-rule]').forEach((el) => {
      gsap.fromTo(el, { scale: 0.9, y: 40, opacity: 0.15 }, {
        scale: 1, y: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 60%', scrub: true },
      });
    });

    // Final CTA glow breathes slowly.
    gsap.to('.ln-final-glow', { scale: 1.15, opacity: 0.85, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }, root);

  return () => ctx.revert();
}

/** Fade the landing page out, then resolve so the caller can remove it and boot the game. */
export function playLandingExit(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(root, { opacity: 0, scale: 1.03, filter: 'blur(8px)', duration: 0.7, ease: 'expo.in', onComplete: resolve });
  });
}
