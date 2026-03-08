import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Prefer individual params if DB_HOST is set (avoids URL encoding issues)
function getDbConfig() {
    if (process.env.DB_HOST) {
        return {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || "5432"),
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASSWORD || "Malik12amaan@#",
            database: process.env.DB_NAME || "postgres",
            ssl: { rejectUnauthorized: false },
        };
    }
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
    }
    // Hardcoded fallback — Session Pooler (IPv4-compatible for Vercel)
    return {
        host: "aws-1-ap-northeast-1.pooler.supabase.com",
        port: 5432,
        user: "postgres.kwswkoysskkxuezbfmyt",
        password: "Malik12amaan@#",
        database: "postgres",
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
