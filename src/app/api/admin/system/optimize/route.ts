import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { sql } from "drizzle-orm";

export async function POST() {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        console.log("🚀 Starting database optimization...");

        // 1. Create indices for performance
        // Products indices
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);`);

        // Inventory Units indices (Critical for availability logic)
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_units (product_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_units (status);`);

        // Bookings indices (Critical for overlap detection)
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bookings_product_dates ON bookings (product_id, start_date, end_date);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);`);

        // Overrides indices
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_overrides_product_dates ON inventory_overrides (product_id, start_date, end_date);`);

        console.log("✅ Database indices created successfully.");

        return NextResponse.json({
            success: true,
            message: "Database optimization completed: indices created/verified."
        });
    } catch (err) {
        console.error("❌ Database optimization failed:", err);
        return NextResponse.json({ error: "Optimization failed" }, { status: 500 });
    }
}
