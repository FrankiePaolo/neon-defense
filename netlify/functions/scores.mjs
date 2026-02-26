import { neon } from "@netlify/neon";

const MAX_NAME_LENGTH = 12;
const MAX_WAVES = 35;

export default async (req) => {
  const sql = neon();

  if (req.method === "GET") {
    const rows = await sql`
      SELECT name, score, wave, created_at
      FROM scores
      ORDER BY score DESC
      LIMIT 50
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

    const { name, score, wave } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
      return new Response("Invalid name", { status: 400 });
    }
    if (!Number.isInteger(score) || score < 0) {
      return new Response("Invalid score", { status: 400 });
    }
    if (!Number.isInteger(wave) || wave < 1 || wave > MAX_WAVES) {
      return new Response("Invalid wave", { status: 400 });
    }

    const maxPlausible = wave * wave * 500 + 5000;
    if (score > maxPlausible) {
      return new Response("Score rejected", { status: 400 });
    }

    const rows = await sql`
      INSERT INTO scores (name, score, wave)
      VALUES (${name.trim()}, ${score}, ${wave})
      RETURNING name, score, wave, created_at
    `;

    return Response.json(rows[0], { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/scores" };
