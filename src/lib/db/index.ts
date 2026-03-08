import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:Malik12amaan%40%23@db.kwswkoysskkxuezbfmyt.supabase.co:5432/postgres",
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
