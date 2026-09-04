import fs from 'fs';
process.chdir('b:/rental website/rental-app');

if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
}
if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
}

import { pool } from '../src/lib/db';

async function migrate() {
    console.log('--- Applying Corporate Accounts & Preventive Maintenance DDL Migrations ---');

    await pool.query(`
        -- 1. Inventory Units CapEx & Maintenance Columns
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS acquisition_cost REAL DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS salvage_value REAL DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS useful_life_years INT DEFAULT 5;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS total_rental_days INT DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS rental_days_since_last_maintenance INT DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS operating_hours REAL DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS cumulative_revenue REAL DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS cumulative_maintenance_cost REAL DEFAULT 0;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 100;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMP;
        ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS preventive_maintenance_interval_days INT DEFAULT 30;

        CREATE INDEX IF NOT EXISTS inventory_units_health_score_idx ON inventory_units(health_score);

        -- 2. Bookings Corporate Linkage Columns
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cost_center_id VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_approval_status VARCHAR(50) DEFAULT 'not_required';
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_approved_at TIMESTAMP;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_approved_by VARCHAR(255);

        CREATE INDEX IF NOT EXISTS bookings_organization_id_idx ON bookings(organization_id);
        CREATE INDEX IF NOT EXISTS bookings_cost_center_id_idx ON bookings(cost_center_id);
        CREATE INDEX IF NOT EXISTS bookings_internal_approval_idx ON bookings(internal_approval_status);

        -- 3. Client Organizations
        CREATE TABLE IF NOT EXISTS client_organizations (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            cr_number VARCHAR(100),
            tax_id VARCHAR(100),
            billing_address VARCHAR(500),
            credit_limit REAL NOT NULL DEFAULT 50000,
            credit_used REAL NOT NULL DEFAULT 0,
            payment_terms VARCHAR(100) NOT NULL DEFAULT 'net_30',
            approval_threshold_amount REAL NOT NULL DEFAULT 5000,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS client_organizations_slug_idx ON client_organizations(slug);
        CREATE INDEX IF NOT EXISTS client_organizations_status_idx ON client_organizations(status);

        -- 4. Organization Members
        CREATE TABLE IF NOT EXISTS organization_members (
            id VARCHAR(255) PRIMARY KEY,
            organization_id VARCHAR(255) NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL DEFAULT 'member',
            title VARCHAR(100),
            spend_limit_per_booking REAL NOT NULL DEFAULT 5000,
            can_approve BOOLEAN NOT NULL DEFAULT FALSE,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS org_members_org_user_idx ON organization_members(organization_id, user_id);
        CREATE INDEX IF NOT EXISTS org_members_user_idx ON organization_members(user_id);
        CREATE INDEX IF NOT EXISTS org_members_role_idx ON organization_members(role);

        -- 5. Organization Project Cost Centers
        CREATE TABLE IF NOT EXISTS organization_cost_centers (
            id VARCHAR(255) PRIMARY KEY,
            organization_id VARCHAR(255) NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            budget_amount REAL NOT NULL DEFAULT 100000,
            allocated_spent REAL NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS org_cost_centers_org_idx ON organization_cost_centers(organization_id);
        CREATE INDEX IF NOT EXISTS org_cost_centers_code_idx ON organization_cost_centers(code);

        -- 6. Booking Approval Requests
        CREATE TABLE IF NOT EXISTS booking_approval_requests (
            id VARCHAR(255) PRIMARY KEY,
            booking_id VARCHAR(255) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            organization_id VARCHAR(255) NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
            cost_center_id VARCHAR(255) REFERENCES organization_cost_centers(id),
            requested_by_id VARCHAR(255) NOT NULL REFERENCES users(id),
            approver_id VARCHAR(255) REFERENCES users(id),
            amount REAL NOT NULL,
            threshold_triggered REAL NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            notes TEXT,
            decided_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS booking_approval_requests_booking_idx ON booking_approval_requests(booking_id);
        CREATE INDEX IF NOT EXISTS booking_approval_requests_org_idx ON booking_approval_requests(organization_id);
        CREATE INDEX IF NOT EXISTS booking_approval_requests_status_idx ON booking_approval_requests(status);
    `);

    console.log('✅ All corporate accounts & preventive maintenance tables and columns successfully migrated!');
    await pool.end();
}

migrate().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
});
