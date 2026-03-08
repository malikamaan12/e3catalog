import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
    const hasUrl = !!process.env.DATABASE_URL;
    const hasDbHost = !!process.env.DB_HOST;

    const result: Record<string, any> = {
        version: "2026-03-09-v4",
        timestamp: new Date().toISOString(),
        env: {
            hasDatabaseUrl: hasUrl,
            databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 40) + "...",
            hasDbHost,
            dbHost: process.env.DB_HOST || "(not set)",
            nodeEnv: process.env.NODE_ENV,
        },
        db: {}
    };

    // Try individual params first if DB_HOST is set
    const poolConfig: any = hasDbHost ? {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    } : {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    };

    const pool = new Pool(poolConfig);

    try {
        const client = await pool.connect();
        result.db.connected = true;
        const tableRes = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `);
        result.db.tables = tableRes.rows.map((r: any) => r.table_name);
        const userRes = await client.query(`SELECT count(*) FROM users`);
        result.db.userCount = userRes.rows[0].count;
        client.release();
    } catch (err: any) {
        result.db.connected = false;
        result.db.error = err.message;
        result.db.code = err.code;
    } finally {
        await pool.end();
    }

    return NextResponse.json(result);
}
