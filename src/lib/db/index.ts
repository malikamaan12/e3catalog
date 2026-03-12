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
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { pool }; // exported for raw SQL queries when needed
