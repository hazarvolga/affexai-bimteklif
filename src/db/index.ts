import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import pg from "pg";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
