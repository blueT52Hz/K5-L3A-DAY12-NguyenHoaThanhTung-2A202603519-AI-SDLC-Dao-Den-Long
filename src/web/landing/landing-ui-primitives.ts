// Shared markup primitives for the landing page: island CTA buttons, eyebrow tags,
// double-bezel card shells and thin-line icons. Keeps every section visually consistent (DRY).

const ARROW_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

type ButtonSize = 'sm' | 'md' | 'xl';

/** Primary "start game" pill with a nested trailing arrow island. Clicking it boots the game. */
export function startButton(label: string, size: ButtonSize = 'md'): string {
  return `<button class="ln-btn ln-btn-primary ln-btn-${size}" data-start>
    <span class="ln-btn-label">${label}</span><span class="ln-btn-icon">${ARROW_SVG}</span></button>`;
}

/** Secondary ghost pill linking to an in-page anchor. */
export function ghostLink(label: string, href: string): string {
  return `<a class="ln-btn ln-btn-ghost ln-btn-md" href="${href}"><span class="ln-btn-label">${label}</span></a>`;
}

/** Microscopic pill shown above a heading. */
export function eyebrow(text: string): string {
  return `<span class="ln-eyebrow" data-reveal><i aria-hidden="true"></i>${text}</span>`;
}

/** Double-bezel enclosure: outer hairline shell + inner core with its own highlight and concentric radius. */
export function shell(inner: string, extraClass = '', attrs = ''): string {
  return `<div class="ln-shell ${extraClass}" ${attrs}><div class="ln-core">${inner}</div></div>`;
}

const ICON_PATHS: Record<string, string> = {
  lantern: '<path d="M12 3v2M9 5h6M8 8c0-1.7 1.8-3 4-3s4 1.3 4 3v7c0 1.7-1.8 3-4 3s-4-1.3-4-3z"/><path d="M10 21h4M12 18v3"/>',
  sunrise: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 6v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8"/>',
  shade: '<path d="M5 19c0-6 2.5-12 7-12s7 6 7 12l-2.3-1.5L14.4 19 12 17.5 9.6 19l-2.3-1.5z"/><path d="M10 12h.01M14 12h.01"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  island: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/>',
};

/** Ultra-light line icon (1.25 stroke) drawn from a small built-in set. */
export function lineIcon(name: keyof typeof ICON_PATHS): string {
  return `<svg class="ln-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}
