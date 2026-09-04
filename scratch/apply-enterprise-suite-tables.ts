import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function applyEnterpriseSuiteTables() {
    console.log("Applying Enterprise Suite database tables...");

    // 1. Dispatch Routes
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "dispatch_routes" (
            "id" VARCHAR(255) PRIMARY KEY,
            "cluster_number" VARCHAR(100) NOT NULL UNIQUE,
            "zone" VARCHAR(100) NOT NULL,
            "driver_id" VARCHAR(255) REFERENCES "users"("id") ON DELETE SET NULL,
            "driver_name" VARCHAR(255),
            "vehicle_plate" VARCHAR(100),
            "vehicle_capacity_kg" INTEGER DEFAULT 3500,
            "scheduled_date" TIMESTAMP NOT NULL,
            "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
            "total_stops" INTEGER NOT NULL DEFAULT 0,
            "total_weight_kg" REAL NOT NULL DEFAULT 0,
            "total_volume_cbm" REAL NOT NULL DEFAULT 0,
            "notes" TEXT,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "dispatch_routes_zone_idx" ON "dispatch_routes" ("zone");
        CREATE INDEX IF NOT EXISTS "dispatch_routes_date_idx" ON "dispatch_routes" ("scheduled_date");
        CREATE INDEX IF NOT EXISTS "dispatch_routes_status_idx" ON "dispatch_routes" ("status");
    `);
    console.log("[OK] dispatch_routes table created/verified.");

    // 2. Dispatch Stops
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "dispatch_stops" (
            "id" VARCHAR(255) PRIMARY KEY,
            "route_id" VARCHAR(255) NOT NULL REFERENCES "dispatch_routes"("id") ON DELETE CASCADE,
            "booking_id" VARCHAR(255) REFERENCES "bookings"("id") ON DELETE SET NULL,
            "sequence_index" INTEGER NOT NULL DEFAULT 0,
            "venue_address" VARCHAR(500) NOT NULL,
            "contact_person" VARCHAR(255),
            "contact_phone" VARCHAR(100),
            "time_window_start" VARCHAR(20),
            "time_window_end" VARCHAR(20),
            "stop_type" VARCHAR(50) NOT NULL DEFAULT 'delivery',
            "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
            "notes" TEXT,
            "completed_at" TIMESTAMP,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "dispatch_stops_route_idx" ON "dispatch_stops" ("route_id");
        CREATE INDEX IF NOT EXISTS "dispatch_stops_booking_idx" ON "dispatch_stops" ("booking_id");
        CREATE INDEX IF NOT EXISTS "dispatch_stops_sequence_idx" ON "dispatch_stops" ("sequence_index");
    `);
    console.log("[OK] dispatch_stops table created/verified.");

    // 3. Pricing Surge Rules
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "pricing_surge_rules" (
            "id" VARCHAR(255) PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "code" VARCHAR(100) NOT NULL UNIQUE,
            "start_date" TIMESTAMP,
            "end_date" TIMESTAMP,
            "multiplier" REAL NOT NULL DEFAULT 1.2,
            "day_of_week" VARCHAR(100),
            "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "pricing_surge_rules_code_idx" ON "pricing_surge_rules" ("code");
        CREATE INDEX IF NOT EXISTS "pricing_surge_rules_active_idx" ON "pricing_surge_rules" ("is_active");
    `);
    console.log("[OK] pricing_surge_rules table created/verified.");

    // 4. Pricing Duration Tiers
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "pricing_duration_tiers" (
            "id" VARCHAR(255) PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "min_days" INTEGER NOT NULL,
            "max_days" INTEGER,
            "discount_percent" REAL NOT NULL DEFAULT 15,
            "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "pricing_duration_tiers_active_idx" ON "pricing_duration_tiers" ("is_active");
    `);
    console.log("[OK] pricing_duration_tiers table created/verified.");

    // 5. Verify/Create cross_hire_orders
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "cross_hire_orders" (
            "id" VARCHAR(255) PRIMARY KEY,
            "order_number" VARCHAR(100) NOT NULL UNIQUE,
            "booking_id" VARCHAR(255) REFERENCES "bookings"("id") ON DELETE SET NULL,
            "supplier_vendor_id" VARCHAR(255) REFERENCES "vendors"("id"),
            "supplier_name" VARCHAR(255) NOT NULL,
            "supplier_contact" VARCHAR(255),
            "product_id" VARCHAR(255) NOT NULL REFERENCES "products"("id"),
            "units_requested" INTEGER NOT NULL DEFAULT 1,
            "period_start" TIMESTAMP NOT NULL,
            "period_end" TIMESTAMP NOT NULL,
            "supplier_daily_rate" REAL NOT NULL DEFAULT 0,
            "client_daily_rate" REAL NOT NULL DEFAULT 0,
            "total_supplier_cost" REAL NOT NULL DEFAULT 0,
            "total_client_revenue" REAL NOT NULL DEFAULT 0,
            "profit_margin" REAL NOT NULL DEFAULT 0,
            "status" VARCHAR(50) NOT NULL DEFAULT 'requested',
            "asset_tag_allocations" JSONB DEFAULT '[]',
            "notes" TEXT,
            "created_by_id" VARCHAR(255) REFERENCES "users"("id"),
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "cross_hire_orders_booking_idx" ON "cross_hire_orders" ("booking_id");
        CREATE INDEX IF NOT EXISTS "cross_hire_orders_product_idx" ON "cross_hire_orders" ("product_id");
        CREATE INDEX IF NOT EXISTS "cross_hire_orders_status_idx" ON "cross_hire_orders" ("status");
    `);
    console.log("[OK] cross_hire_orders table created/verified.");

    // 6. Verify/Create financial_journals & journal_entries
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "financial_journals" (
            "id" VARCHAR(255) PRIMARY KEY,
            "journal_number" VARCHAR(100) NOT NULL UNIQUE,
            "reference_type" VARCHAR(50) NOT NULL,
            "reference_id" VARCHAR(255) NOT NULL,
            "description" VARCHAR(500) NOT NULL,
            "is_reversed" BOOLEAN DEFAULT FALSE,
            "reversal_journal_id" VARCHAR(255),
            "posted_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "financial_journals_journal_number_idx" ON "financial_journals" ("journal_number");
        CREATE INDEX IF NOT EXISTS "financial_journals_reference_idx" ON "financial_journals" ("reference_type", "reference_id");
        CREATE INDEX IF NOT EXISTS "financial_journals_posted_at_idx" ON "financial_journals" ("posted_at");

        CREATE TABLE IF NOT EXISTS "journal_entries" (
            "id" VARCHAR(255) PRIMARY KEY,
            "journal_id" VARCHAR(255) NOT NULL REFERENCES "financial_journals"("id") ON DELETE CASCADE,
            "account_code" VARCHAR(100) NOT NULL,
            "account_name" VARCHAR(255) NOT NULL,
            "debit" REAL NOT NULL DEFAULT 0,
            "credit" REAL NOT NULL DEFAULT 0,
            "memo" VARCHAR(500),
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "journal_entries_journal_id_idx" ON "journal_entries" ("journal_id");
        CREATE INDEX IF NOT EXISTS "journal_entries_account_code_idx" ON "journal_entries" ("account_code");
    `);
    console.log("[OK] financial_journals & journal_entries tables created/verified.");

    console.log("All Enterprise Suite DDL migrations completed successfully!");
}

applyEnterpriseSuiteTables()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
