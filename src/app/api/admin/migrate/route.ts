import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Run once to add new columns to existing tables
export async function POST() {
    const results: string[] = [];

    const migrations = [
        {
            name: "bookings.added_by_admin",
            sql: `ALTER TABLE bookings ADD COLUMN added_by_admin INTEGER DEFAULT 0`,
        },
        {
            name: "bookings.admin_item_note",
            sql: `ALTER TABLE bookings ADD COLUMN admin_item_note TEXT`,
        },
    ];

    for (const migration of migrations) {
        try {
            await db.execute(sql.raw(migration.sql));
            results.push(`✅ ${migration.name}: added`);
        } catch (e: any) {
            // "duplicate column name" means it already exists — safe to ignore
            if (e?.message?.includes("duplicate column")) {
                results.push(`⏭️  ${migration.name}: already exists`);
            } else {
                results.push(`❌ ${migration.name}: ${e?.message}`);
            }
        }
    }

    return NextResponse.json({ results });
}
