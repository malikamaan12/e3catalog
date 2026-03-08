import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
    const result: Record<string, any> = {
        version: "2026-03-09-v3",
        timestamp: new Date().toISOString(),
        env: {
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
            nodeEnv: process.env.NODE_ENV,
        },
        db: {}
    };

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        result.db.connected = true;

        const tableRes = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `);
        result.db.tables = tableRes.rows.map(r => r.table_name);

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
