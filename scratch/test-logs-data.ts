import { db } from "@/lib/db";
import { systemLogs, auditLogs, users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function testLogsData() {
    const sysLogsCount = await db.select({ count: sql<number>`count(*)` }).from(systemLogs);
    const auditLogsCount = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    console.log(`system_logs rows: ${sysLogsCount[0]?.count || 0}`);
    console.log(`audit_logs rows: ${auditLogsCount[0]?.count || 0}`);

    const sampleSysLogs = await db.select().from(systemLogs).limit(3);
    console.log("Sample system_logs:", sampleSysLogs);
}

testLogsData().catch(console.error);
