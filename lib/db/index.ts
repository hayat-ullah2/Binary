import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

// Neon's HTTP driver — serverless-friendly, no native binaries, no pool to
// manage. Ideal for Next.js route handlers and Vercel.
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export * from "./schema";
