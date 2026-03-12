import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Always use individual connection params — avoids URL encoding issues & always uses IPv4 Session Pooler
function getDbConfig() {
    return {
        host: process.env.DB_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
        port: parseInt(process.env.DB_PORT || "5432"),
        user: process.env.DB_USER || "postgres.kwswkoysskkxuezbfmyt",
        password: process.env.DB_PASSWORD || "Malik12amaan@#",
        database: process.env.DB_NAME || "postgres",
        ssl: { rejectUnauthorized: false },
    };
}

const pool = new Pool({
    ...getDbConfig(),
    // Supabase Session Pooler drops idle connections after ~25s.
    // We must release connections before that to avoid "Failed query" on reuse.
    connectionTimeoutMillis: 10000,  // fail fast if can't connect
    idleTimeoutMillis: 10000,        // release idle connections before Supabase drops them (was 30s — too long)
    max: 10,                         // allow more concurrent connections
    allowExitOnIdle: false,          // keep pool alive in serverless context
});

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err) => {
    console.error("[DB POOL ERROR]", err.message);
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { pool }; // exported for raw SQL queries when needed
