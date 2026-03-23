/**
 * E3 Initial Audit Log Injection
 * Bootstraps the system_logs table with a "Welcome" entry.
 */
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

const ADMIN_ID = "2adff05b-e0e6-4f82-bc7e-e724cd9dcafa";

async function createInitialLogs() {
    const client = await pool.connect();
    try {
        console.log("🚀 Injecting Initial Audit Logs...\n");

        const logs = [
            {
                action: "system_initialized",
                targetId: "INFRA-001",
                targetType: "infrastructure",
                details: { message: "Platform audit trails and system configuration initialized successfully." }
            },
            {
                action: "seed_settings",
                targetId: "SITE_CONF",
                targetType: "configuration",
                details: { message: "Site settings (WhatsApp, Email, Theme) synchronized from master seed." }
            }
        ];

        for (const log of logs) {
            await client.query(`
                INSERT INTO system_logs (id, admin_id, action, target_id, target_type, details, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [uuidv4(), ADMIN_ID, log.action, log.targetId, log.targetType, JSON.stringify(log.details)]);
            
            console.log(`  ✅ Logged: ${log.action}`);
        }

        console.log(`\n🎉 Audit trail bootstrapped!`);
    } finally {
        client.release();
        await pool.end();
    }
}

createInitialLogs().catch(err => {
    console.error("❌ Log injection failed:", err.message);
    process.exit(1);
});
