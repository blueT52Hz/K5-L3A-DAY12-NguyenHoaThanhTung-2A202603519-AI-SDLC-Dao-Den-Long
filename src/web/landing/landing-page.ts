// Landing page controller: renders markup, spawns ambient fireflies, wires the horizontal
// accordion and every [data-start] button. The game boots only after a start click.
import './landing.css';
import './landing-hero-story.css';
import './landing-guide-sections.css';
import { navHeroStoryMarkup } from './landing-markup-nav-hero-story';
import { guideSectionsMarkup } from './landing-markup-guide-sections';
import { initLandingMotion, playLandingExit } from './landing-motion-gsap';

const FIREFLY_COUNT = 36;

/** Scatter CSS fireflies with randomized position, size and drift timing. */
function spawnFireflies(host: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const f = document.createElement('i');
    f.style.left = `${Math.random() * 100}%`;
    f.style.top = `${20 + Math.random() * 75}%`;
    f.style.setProperty('--size', `${2 + Math.random() * 4}px`);
    f.style.setProperty('--dur', `${6 + Math.random() * 8}s`);
    f.style.setProperty('--delay', `${-Math.random() * 10}s`);
    f.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    f.style.setProperty('--dy', `${-30 - Math.random() * 90}px`);
    frag.appendChild(f);
  }
  host.appendChild(frag);
}

/** Horizontal accordion: hover/focus/click opens one panel, the rest collapse into slices. */
function wireAccordion(root: HTMLElement): void {
  const panels = Array.from(root.querySelectorAll<HTMLElement>('.ln-acc-panel'));
  const open = (target: HTMLElement) => panels.forEach((p) => p.classList.toggle('is-open', p === target));
  panels.forEach((p) => {
    p.addEventListener('mouseenter', () => open(p));
    p.addEventListener('focus', () => open(p));
    p.addEventListener('click', () => open(p));
  });
}

/** Mobile full-screen menu: burger morphs into an X, links slide up staggered, any link closes it. */
function wireMenu(root: HTMLElement): void {
  const toggle = root.querySelector<HTMLElement>('[data-menu-toggle]');
  const menu = root.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;
  const setOpen = (open: boolean) => {
    document.body.classList.toggle('ln-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    menu.setAttribute('aria-hidden', String(!open));
  };
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('ln-menu-open')));
  menu.querySelectorAll('[data-menu-link], [data-start]').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

export function mountLanding(root: HTMLElement, onStart: () => void): void {
  root.innerHTML = `<main class="ln-main">${navHeroStoryMarkup()}${guideSectionsMarkup()}</main>`;
  document.body.classList.add('ln-active');

  const fireflies = root.querySelector<HTMLElement>('[data-fireflies]');
  if (fireflies) spawnFireflies(fireflies);
  wireAccordion(root);
  wireMenu(root);
  const disposeMotion = initLandingMotion(root);

  let starting = false;
  const start = async () => {
    if (starting) return; // ignore double clicks while the exit animation runs
    starting = true;
    try {
      await playLandingExit(root);
    } finally {
      disposeMotion();
      root.remove();
      document.body.classList.remove('ln-active', 'ln-menu-open');
      window.scrollTo(0, 0);
      onStart();
    }
  };
  root.querySelectorAll<HTMLElement>('[data-start]').forEach((btn) => btn.addEventListener('click', start));
}
