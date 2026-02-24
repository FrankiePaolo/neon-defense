import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error("Usage: node scripts/setup-db.mjs <DATABASE_URL>");
  console.error("  or set NETLIFY_DATABASE_URL env var");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(12) NOT NULL,
    score INTEGER NOT NULL,
    wave INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS idx_scores_top ON scores (score DESC)`;

console.log("Database ready.");
