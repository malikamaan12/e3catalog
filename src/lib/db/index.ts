import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Always use individual connection params — avoids URL encoding issues
// IMPORTANT: Use port 6543 for Supabase Transaction Pooler (not 5432 Session Pooler)
// Transaction Pooler is required for serverless environments like Vercel.
function getDbConfig() {
    if (process.env.DATABASE_URL) {
        const isLocal = process.env.DATABASE_URL.includes("localhost") || 
                        process.env.DATABASE_URL.includes("127.0.0.1") || 
                        process.env.DATABASE_URL.includes("@postgres:") ||
                        process.env.DATABASE_URL.includes("sslmode=disable");
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: isLocal ? false : { rejectUnauthorized: false },
        };
    }
    return {
        host: process.env.DB_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
        port: parseInt(process.env.DB_PORT || "6543"),
        user: process.env.DB_USER || "postgres.kwswkoysskkxuezbfmyt",
        password: process.env.DB_PASSWORD || "Malik12amaan@#",
        database: process.env.DB_NAME || "postgres",
        ssl: { rejectUnauthorized: false },
    };
}

const pool = new Pool({
    ...getDbConfig(),
    connectionTimeoutMillis: 10000,  // fail fast if can't connect
    idleTimeoutMillis: 10000,        // release idle connections quickly
    max: 3,                          // keep it small for serverless
    allowExitOnIdle: false,
});

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err) => {
    console.error("[DB POOL ERROR]", err.message);
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { pool }; // exported for raw SQL queries when needed
