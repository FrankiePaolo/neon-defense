import { Game } from './game.js';
import { decodeChallenge } from './challenge.js';

const game = new Game();

// Expose globally for debugging
window.game = game;

// A challenge link (?c=) shows its banner on the menu
const challengeParam = new URLSearchParams(window.location.search).get('c');
if (challengeParam) {
  game.ui.showChallengeBanner(decodeChallenge(challengeParam));
  // Clean URL without reloading
  history.replaceState(null, '', window.location.pathname);
}
