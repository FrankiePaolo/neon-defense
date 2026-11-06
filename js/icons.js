// Small inline SVG icons for the HUD, tower panel and stats. They use
// currentColor, so they take the colour of the surrounding text.

const svg = (body, viewBox = '0 0 24 24') =>
  `<svg class="icon" viewBox="${viewBox}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  coin: svg('<circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="5.5" stroke="#000" stroke-opacity="0.45" stroke-width="1.8"/>'),
  heart: svg('<path fill="currentColor" stroke="none" d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 5.9 3.8 4.5 7.2C19.5 16.4 12 21 12 21z"/>'),
  wave: svg('<path d="M5 21V4"/><path fill="currentColor" d="M5 4h12l-3 4 3 4H5"/>'),
  star: svg('<path fill="currentColor" stroke="none" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>'),
  pause: svg('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>'),
  speakerOn: svg('<path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  speakerOff: svg('<path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  damage: svg('<path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/>'),
  fireRate: svg('<path fill="currentColor" stroke="none" d="M13 2L4 14h6l-1 8 9-12h-6z"/>'),
  range: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/>'),
  slow: svg('<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/>'),
  chain: svg('<path d="M3 12l5-6 4 8 4-8 5 6"/>'),
  splash: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>'),
  boost: svg('<path d="M12 20V4M5 11l7-7 7 7"/>'),
};
