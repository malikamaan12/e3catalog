import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Parse individual params from DATABASE_URL or use separate env vars.
// Using individual params avoids URL-encoding issues with special chars in passwords.
function getDbConfig() {
    const url = process.env.DATABASE_URL;
    if (url) {
        try {
            // Try to use it as a connection string first
            return { connectionString: url, ssl: { rejectUnauthorized: false } };
        } catch {
            // Fall through to individual params
        }
    }
    // Fallback: individual connection params (avoids URL encoding issues)
    return {
        host: process.env.DB_HOST || "db.kwswkoysskkxuezbfmyt.supabase.co",
        port: parseInt(process.env.DB_PORT || "5432"),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "Malik12amaan@#",
        database: process.env.DB_NAME || "postgres",
        ssl: { rejectUnauthorized: false },
    };
}

const pool = new Pool({
    ...getDbConfig(),
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
