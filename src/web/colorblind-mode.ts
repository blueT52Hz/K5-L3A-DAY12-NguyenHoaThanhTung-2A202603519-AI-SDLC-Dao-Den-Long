// Colorblind-friendly palette switch (live-toggleable). Shade outline/eyes -> #00B3FF; UI warning -> #FFFFFF + warning icon.
let on = false;

export function setColorblind(v: boolean): void {
  on = v;
  document.body.classList.toggle('colorblind', v);
}

export const isColorblind = (): boolean => on;

/** Prefix warning texts with an icon in colorblind mode (color alone must not carry the signal). */
export const warnText = (text: string): string => (on ? `⚠ ${text}` : text);
