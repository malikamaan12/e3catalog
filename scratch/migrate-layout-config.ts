import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function runMigration() {
    console.log("Migrating database: adding layout_config to vendor_warehouses...");
    await db.execute(sql`ALTER TABLE vendor_warehouses ADD COLUMN IF NOT EXISTS layout_config jsonb;`);
    console.log("✅ Column layout_config added successfully!");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
