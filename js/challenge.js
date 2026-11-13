import { CONFIG } from './config.js';

// A challenge link: ?c= followed by base64url of {v, seed, b, d, n, s, w}.
// The seed and the board class replay the sender's map and waves; name,
// score and wave are what the friend has to beat. Nothing here is verified:
// anyone can edit a link.

/**
 * @typedef {object} Challenge
 * @property {number | null} seed  null on a link from before seeds: banner only
 * @property {'phone' | 'desktop' | null} board
 * @property {'easy' | 'normal' | 'hard'} difficulty
 * @property {string} name
 * @property {number} score
 * @property {number} wave
 */

const VERSION = 1;
const DIFFICULTIES = ['easy', 'normal', 'hard'];
const BOARDS = ['phone', 'desktop'];
const MAX_NAME_LENGTH = 12;

/** @param {Challenge} c */
export function encodeChallenge(c) {
  const json = JSON.stringify({ v: VERSION, seed: c.seed, b: c.board, d: c.difficulty, n: c.name, s: c.score, w: c.wave });
  const bytes = new TextEncoder().encode(json);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Reads base64url and the standard base64 of older links, whose '+' the query
// string turns into a space. Returns null for anything that is not a valid
// challenge.
/** @param {string} param @returns {Challenge | null} */
export function decodeChallenge(param) {
  let data;
  try {
    const binary = atob(param.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    let json;
    try {
      json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      json = binary; // older links encoded the name with btoa as Latin-1
    }
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  const { seed = null, b = null, d = 'normal', n, s, w } = data;
  const seeded = seed !== null;
  if (seeded && !(Number.isInteger(seed) && seed >= 0 && seed <= 0xFFFFFFFF)) return null;
  if (seeded && !BOARDS.includes(b)) return null;
  if (!DIFFICULTIES.includes(d)) return null;
  if (typeof n !== 'string' || n.trim().length === 0 || n.length > MAX_NAME_LENGTH) return null;
  if (!Number.isInteger(s) || s < 0) return null;
  if (!Number.isInteger(w) || w < 1 || w > CONFIG.MAX_WAVES) return null;

  return { seed, board: seeded ? b : null, difficulty: d, name: n.trim(), score: s, wave: w };
}
