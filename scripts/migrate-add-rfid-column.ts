import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
    console.log("⚡ Checking and applying rfid_tag column to inventory_units...");
    try {
        await db.execute(sql`
            ALTER TABLE inventory_units 
            ADD COLUMN IF NOT EXISTS rfid_tag varchar(100);

            CREATE INDEX IF NOT EXISTS inventory_units_rfid_tag_idx 
            ON inventory_units(rfid_tag);
        `);
        console.log("✅ Successfully added rfid_tag column and index to inventory_units!");
        process.exit(0);
    } catch (err: any) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

run();
