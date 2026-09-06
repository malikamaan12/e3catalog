import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
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

    const host = process.env.DB_HOST || "aws-1-ap-northeast-1.pooler.supabase.com";
    let port = parseInt(process.env.DB_PORT || "6543", 10);
    // Automatically force port 6543 (transaction pooler) if connecting to Supabase pooler with 5432 or invalid port
    if (isNaN(port) || (host.includes("pooler.supabase.com") && port === 5432)) {
        port = 6543;
    }

    return {
        host,
        port,
        user: process.env.DB_USER || "postgres.kwswkoysskkxuezbfmyt",
        password: process.env.DB_PASSWORD || "Malik12amaan@#",
        database: process.env.DB_NAME || "postgres",
        ssl: { rejectUnauthorized: false },
    };
}

declare global {
    var _dbPool: Pool | undefined;
    var _db: NodePgDatabase<typeof schema> | undefined;
}

const pool = globalThis._dbPool ?? new Pool({
    ...getDbConfig(),
    connectionTimeoutMillis: 10000,  // fail fast if can't connect
    idleTimeoutMillis: 10000,        // release idle connections quickly
    max: 10,                         // pool connections safely for concurrent route calls
    allowExitOnIdle: false,
});

if (process.env.NODE_ENV !== "production") {
    globalThis._dbPool = pool;
}

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err) => {
    console.error("[DB POOL ERROR]", err.message);
});

export const db = globalThis._db ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
    globalThis._db = db;
}

export type DB = typeof db;
export { pool }; // exported for raw SQL queries when needed
