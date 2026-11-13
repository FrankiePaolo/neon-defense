// Globals the game sets on window. Type-checking only, never loaded by the browser.
interface Window {
  game: import('../js/game.js').Game;
  _challengeData: { n: string; s: number; w: number };
  webkitAudioContext: typeof AudioContext;
}
