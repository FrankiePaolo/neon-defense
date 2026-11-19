// The simulation modules read window and navigator for the board shape
globalThis.window ??= /** @type {any} */ ({});
if (!globalThis.navigator) Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
