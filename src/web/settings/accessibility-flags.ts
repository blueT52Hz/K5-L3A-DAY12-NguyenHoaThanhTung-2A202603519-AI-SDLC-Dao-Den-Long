// Live accessibility flags read by render code (reduced motion) and mirrored to CSS (large text, reduced motion).
let reduced = false;

export const isReducedMotion = (): boolean => reduced;

/** Apply reduced-motion + large-text; large text scales UI via --ui-scale (x1.25). */
export function applyAccessibility(opts: { reducedMotion: boolean; largeText: boolean }): void {
  reduced = opts.reducedMotion;
  document.body.classList.toggle('reduced-motion', opts.reducedMotion);
  document.body.classList.toggle('large-text', opts.largeText);
  document.documentElement.style.setProperty('--ui-scale', opts.largeText ? '1.25' : '1');
}
