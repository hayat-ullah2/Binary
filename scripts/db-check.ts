import "dotenv/config";
import { neon } from "@neondatabase/serverless";

/**
 * Minimal connectivity check: runs a trivial query against Neon and prints
 * the server version + current table list. Run with: npm run db:check
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing in .env");

  const sql = neon(url);

  const ping = await sql`select 1 as ok`;
  console.log("✓ Connected to Neon. ping =", ping[0]?.ok);

  const version = await sql`select version()`;
  console.log("✓ Server:", String(version[0]?.version).split(",")[0]);

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log(
    "✓ Public tables:",
    tables.length ? tables.map((t) => t.table_name).join(", ") : "(none yet)"
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Connection failed:", err.message);
    process.exit(1);
  });
