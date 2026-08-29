import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Run once to add new columns to existing tables
export async function POST() {
    const results: string[] = [];

    const migrations = [
        {
            name: "bookings.added_by_admin",
            sql: `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS added_by_admin INTEGER DEFAULT 0`,
        },
        {
            name: "bookings.admin_item_note",
            sql: `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_item_note TEXT`,
        },
        {
            name: "products.status",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`,
        },
        {
            name: "products.brand",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)`,
        },
        {
            name: "products.model",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS model VARCHAR(255)`,
        },
        {
            name: "products.replacement_value",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS replacement_value REAL`,
        },
        {
            name: "products.meta_title",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255)`,
        },
        {
            name: "products.meta_description",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description VARCHAR(500)`,
        },
        {
            name: "products.keywords",
            sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS keywords VARCHAR(500)`,
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
