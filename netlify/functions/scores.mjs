import { neon } from "@netlify/neon";

const MAX_NAME_LENGTH = 12;
const MAX_WAVES = 35;
const DIFFICULTIES = ["easy", "normal", "hard"];

// Highest score a real run can have after the given wave: at least 2x the
// best score scripts/simulate-balance.mjs produces at every wave
const CAP_BASE = 76000;
const CAP_GROWTH = 1.16;

export function maxPlausibleScore(wave) {
  return CAP_BASE * CAP_GROWTH ** wave;
}

export default async (req) => {
  const sql = neon();

  if (req.method === "GET") {
    // Top 50 of each difficulty, one board per difficulty
    const rows = await sql`
      SELECT name, score, wave, difficulty, created_at FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY difficulty ORDER BY score DESC) AS rank
        FROM scores
      ) ranked
      WHERE rank <= 50
      ORDER BY score DESC
    `;
    return Response.json(rows);
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Clients from before difficulty was recorded send none
    const { name, score, wave } = body;
    const difficulty = body.difficulty ?? "normal";

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
      return new Response("Invalid name", { status: 400 });
    }
    if (!Number.isInteger(score) || score < 0) {
      return new Response("Invalid score", { status: 400 });
    }
    if (!Number.isInteger(wave) || wave < 1 || wave > MAX_WAVES) {
      return new Response("Invalid wave", { status: 400 });
    }
    if (!DIFFICULTIES.includes(difficulty)) {
      return new Response("Invalid difficulty", { status: 400 });
    }

    if (score > maxPlausibleScore(wave)) {
      return new Response("Score rejected", { status: 400 });
    }

    const rows = await sql`
      INSERT INTO scores (name, score, wave, difficulty)
      VALUES (${name.trim()}, ${score}, ${wave}, ${difficulty})
      RETURNING name, score, wave, difficulty, created_at
    `;

    return Response.json(rows[0], { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/scores" };
