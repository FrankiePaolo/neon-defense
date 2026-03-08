import { Game } from './game.js';

const game = new Game();

// Expose globally for debugging
window.game = game;

// Parse challenge URL parameter
try {
  const params = new URLSearchParams(window.location.search);
  const challengeParam = params.get('c');
  if (challengeParam) {
    const data = JSON.parse(atob(challengeParam));
    if (data && data.n && typeof data.s === 'number' && typeof data.w === 'number') {
      window._challengeData = data;
      game.ui.showChallengeBanner(data);
    }
    // Clean URL without reloading
    history.replaceState(null, '', window.location.pathname);
  }
} catch {
  // Invalid challenge data, ignore
}
