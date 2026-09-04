import fs from 'fs';

process.chdir('b:/rental website/rental-app');

if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
}
if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
}

import { pool } from 'b:/rental website/rental-app/src/lib/db';

async function migrate() {
    console.log('--- Applying 4 Pillars Migrations ---');

    await pool.query(`
        -- Add is_kit column to products if not exists
        ALTER TABLE products ADD COLUMN IF NOT EXISTS is_kit BOOLEAN DEFAULT FALSE;

        -- 1. Product Kit Items (Bill of Materials)
        CREATE TABLE IF NOT EXISTS product_kit_items (
            id VARCHAR(255) PRIMARY KEY,
            parent_product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            child_product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INT NOT NULL DEFAULT 1,
            is_optional BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS product_kit_items_parent_idx ON product_kit_items(parent_product_id);
        CREATE INDEX IF NOT EXISTS product_kit_items_child_idx ON product_kit_items(child_product_id);

        -- 2. Damage Claims & Deposit Deductions
        CREATE TABLE IF NOT EXISTS damage_claims (
            id VARCHAR(255) PRIMARY KEY,
            claim_number VARCHAR(100) NOT NULL UNIQUE,
            booking_id VARCHAR(255) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            inventory_unit_id VARCHAR(255) REFERENCES inventory_units(id),
            inspection_log_id VARCHAR(255) REFERENCES inspection_logs(id),
            incident_description TEXT NOT NULL,
            photo_urls JSONB DEFAULT '[]',
            severity VARCHAR(50) NOT NULL DEFAULT 'moderate',
            parts_cost REAL NOT NULL DEFAULT 0,
            labor_cost REAL NOT NULL DEFAULT 0,
            total_claim_amount REAL NOT NULL DEFAULT 0,
            security_deposit_held REAL NOT NULL DEFAULT 0,
            amount_deducted REAL NOT NULL DEFAULT 0,
            amount_refunded REAL NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'filed',
            filed_by VARCHAR(255) REFERENCES users(id),
            settled_at TIMESTAMP,
            client_dispute_reason TEXT,
            admin_resolution_notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS damage_claims_booking_idx ON damage_claims(booking_id);
        CREATE INDEX IF NOT EXISTS damage_claims_unit_idx ON damage_claims(inventory_unit_id);
        CREATE INDEX IF NOT EXISTS damage_claims_status_idx ON damage_claims(status);

        -- 3. Sub-Rentals & Cross-Hiring Orders
        CREATE TABLE IF NOT EXISTS cross_hire_orders (
            id VARCHAR(255) PRIMARY KEY,
            order_number VARCHAR(100) NOT NULL UNIQUE,
            booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE SET NULL,
            supplier_vendor_id VARCHAR(255) REFERENCES vendors(id),
            supplier_name VARCHAR(255) NOT NULL,
            supplier_contact VARCHAR(255),
            product_id VARCHAR(255) NOT NULL REFERENCES products(id),
            units_requested INT NOT NULL DEFAULT 1,
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            supplier_daily_rate REAL NOT NULL DEFAULT 0,
            client_daily_rate REAL NOT NULL DEFAULT 0,
            total_supplier_cost REAL NOT NULL DEFAULT 0,
            total_client_revenue REAL NOT NULL DEFAULT 0,
            profit_margin REAL NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'requested',
            asset_tag_allocations JSONB DEFAULT '[]',
            notes TEXT,
            created_by_id VARCHAR(255) REFERENCES users(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS cross_hire_orders_booking_idx ON cross_hire_orders(booking_id);
        CREATE INDEX IF NOT EXISTS cross_hire_orders_product_idx ON cross_hire_orders(product_id);
        CREATE INDEX IF NOT EXISTS cross_hire_orders_status_idx ON cross_hire_orders(status);

        -- 4. Real-Time Fleet Dispatch GPS Telemetry
        CREATE TABLE IF NOT EXISTS fleet_gps_pings (
            id VARCHAR(255) PRIMARY KEY,
            dispatch_log_id VARCHAR(255) NOT NULL REFERENCES booking_dispatch_logs(id) ON DELETE CASCADE,
            driver_id VARCHAR(255) REFERENCES users(id),
            vehicle_plate VARCHAR(100),
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            heading REAL,
            speed REAL,
            status VARCHAR(50) NOT NULL DEFAULT 'in_transit',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS fleet_gps_pings_dispatch_idx ON fleet_gps_pings(dispatch_log_id);
        CREATE INDEX IF NOT EXISTS fleet_gps_pings_created_idx ON fleet_gps_pings(created_at);
    `);

    console.log('✅ 4 Pillars Tables and Indexes applied successfully to PostgreSQL!');
}

migrate().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
