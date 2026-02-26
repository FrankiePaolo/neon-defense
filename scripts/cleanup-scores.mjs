import { neon } from "@netlify/neon";

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error("Usage: node scripts/cleanup-scores.mjs <DATABASE_URL>");
  console.error("  or set NETLIFY_DATABASE_URL env var");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Preview what will be deleted
const bad = await sql`
  SELECT id, name, score, wave
  FROM scores
  WHERE score > (wave * wave * 500 + 5000) OR wave > 35 OR wave < 1 OR score < 0
`;
console.log(`Found ${bad.length} unreasonable scores:`);
for (const row of bad) {
  console.log(`  id=${row.id} name=${row.name} score=${row.score} wave=${row.wave}`);
}

if (bad.length === 0) {
  console.log("Nothing to clean up.");
  process.exit(0);
}

// Delete them
const result = await sql`
  DELETE FROM scores
  WHERE score > (wave * wave * 500 + 5000) OR wave > 35 OR wave < 1 OR score < 0
`;
console.log(`Deleted ${bad.length} rows.`);
