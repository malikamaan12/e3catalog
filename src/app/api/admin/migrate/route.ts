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
        {
            name: "maintenance_records_table",
            sql: `CREATE TABLE IF NOT EXISTS maintenance_records (
                id VARCHAR(255) PRIMARY KEY,
                unit_id VARCHAR(255) NOT NULL REFERENCES inventory_units(id),
                reported_by VARCHAR(255) REFERENCES users(id),
                issue_category VARCHAR(100) NOT NULL,
                severity VARCHAR(50) NOT NULL DEFAULT 'medium',
                assigned_technician VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'open',
                work_notes TEXT,
                resolution_notes TEXT,
                estimated_cost REAL,
                actual_cost REAL,
                opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
                target_completion_date TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )`,
        },
        {
            name: "maintenance_records_indexes",
            sql: `CREATE INDEX IF NOT EXISTS maintenance_records_unit_id_idx ON maintenance_records(unit_id);
                  CREATE INDEX IF NOT EXISTS maintenance_records_status_idx ON maintenance_records(status);`,
        },
        {
            name: "vendors.extended_columns",
            sql: `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(50) DEFAULT 'application_draft';
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trading_name VARCHAR(255);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cr_number VARCHAR(255);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trade_license_number VARCHAR(255);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_type VARCHAR(100);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Qatar';
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address VARCHAR(500);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Doha';
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS year_established INTEGER;
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(1000);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS changes_requested_reason VARCHAR(1000);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(1000);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS equipment_categories JSONB;
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS warehouse_locations JSONB;
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fleet_size VARCHAR(100);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS operating_regions JSONB;
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);
                  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS brand_story TEXT;
                  CREATE INDEX IF NOT EXISTS vendors_lifecycle_status_idx ON vendors(lifecycle_status);
                  UPDATE vendors SET lifecycle_status = 'approved' WHERE store_status = 'active' AND (lifecycle_status IS NULL OR lifecycle_status = 'application_draft');`,
        },
        {
            name: "vendor_documents_table",
            sql: `CREATE TABLE IF NOT EXISTS vendor_documents (
                id VARCHAR(255) PRIMARY KEY,
                vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id),
                document_type VARCHAR(100) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR(100),
                issue_date TIMESTAMP,
                expiry_date TIMESTAMP,
                issuing_authority VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
                reviewer_id VARCHAR(255) REFERENCES users(id),
                reviewer_notes VARCHAR(1000),
                rejection_reason VARCHAR(1000),
                verified_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS vendor_documents_vendor_id_idx ON vendor_documents(vendor_id);
            CREATE INDEX IF NOT EXISTS vendor_documents_status_idx ON vendor_documents(status);`,
        },
        {
            name: "vendor_team_members_table",
            sql: `CREATE TABLE IF NOT EXISTS vendor_team_members (
                id VARCHAR(255) PRIMARY KEY,
                vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id),
                user_id VARCHAR(255) REFERENCES users(id),
                invited_email VARCHAR(255) NOT NULL,
                invitation_token VARCHAR(255) UNIQUE,
                role VARCHAR(50) NOT NULL DEFAULT 'viewer',
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                token_expires_at TIMESTAMP,
                accepted_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS vendor_team_members_vendor_id_idx ON vendor_team_members(vendor_id);
            CREATE INDEX IF NOT EXISTS vendor_team_members_user_id_idx ON vendor_team_members(user_id);
            CREATE INDEX IF NOT EXISTS vendor_team_members_token_idx ON vendor_team_members(invitation_token);`,
        },
        {
            name: "vendor_commercial_terms_table",
            sql: `CREATE TABLE IF NOT EXISTS vendor_commercial_terms (
                id VARCHAR(255) PRIMARY KEY,
                vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id),
                version INTEGER NOT NULL DEFAULT 1,
                commission_type VARCHAR(50) NOT NULL DEFAULT 'percentage',
                commission_value REAL NOT NULL DEFAULT 20,
                effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
                payout_terms VARCHAR(255),
                special_conditions VARCHAR(1000),
                approved_by VARCHAR(255) REFERENCES users(id),
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS vendor_commercial_terms_vendor_id_idx ON vendor_commercial_terms(vendor_id);
            CREATE INDEX IF NOT EXISTS vendor_commercial_terms_status_idx ON vendor_commercial_terms(status);`,
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
