// Run with: node migrate-products.mjs
// This adds all missing columns to the Neon PostgreSQL database

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
console.log('Connected to PostgreSQL...');

const migrations = [
    // Products: add missing columns
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 1 NOT NULL DEFAULT 1`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'excellent' NOT NULL DEFAULT 'excellent'`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(500)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS power_requirements VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS materials VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS show_price BOOLEAN DEFAULT true NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS price_type VARCHAR(50) DEFAULT 'daily' NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS price_range_max REAL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_hour REAL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_fee REAL DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS handling_fee REAL DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS setup_fee REAL DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unit' NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1 NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS install_time INTEGER DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS dismantle_time INTEGER DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS cleaning_time INTEGER DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS manpower VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tools VARCHAR(255)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_notes VARCHAR(1000)`,

    // Inventory units table
    `CREATE TABLE IF NOT EXISTS inventory_units (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id),
        serial_number VARCHAR(255),
        condition VARCHAR(50) NOT NULL DEFAULT 'excellent',
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        warehouse_location VARCHAR(255),
        purchase_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,

    // Safety certificates: add missing columns
    `ALTER TABLE safety_certificates ADD COLUMN IF NOT EXISTS issuing_body VARCHAR(255)`,

    // Products: add newer columns  
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_license BOOLEAN DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false`,

    // Vendors table
    `CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) UNIQUE,
        company_name VARCHAR(255) NOT NULL,
        kyc_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        agreement_status VARCHAR(50) NOT NULL DEFAULT 'unsigned',
        payout_details VARCHAR(500),
        commission_rate REAL,
        website VARCHAR(255),
        tax_id VARCHAR(255),
        tax_card_url VARCHAR(500),
        company_registration_url VARCHAR(500),
        letterhead_header_url VARCHAR(500),
        letterhead_footer_url VARCHAR(500),
        tax_card_expiry TIMESTAMP,
        company_registration_expiry TIMESTAMP,
        poc_name VARCHAR(255),
        poc_phone VARCHAR(255),
        alternate_poc_name VARCHAR(255),
        alternate_poc_phone VARCHAR(255),
        logo_url VARCHAR(500),
        bank_name VARCHAR(255),
        account_name VARCHAR(255),
        account_number VARCHAR(255),
        iban VARCHAR(255),
        swift VARCHAR(255),
        payment_terms VARCHAR(255),
        store_status VARCHAR(50) NOT NULL DEFAULT 'active',
        score_delivery INTEGER DEFAULT 100,
        score_condition INTEGER DEFAULT 100,
        score_rating REAL DEFAULT 5.0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,

    // Users: add vendor_id column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS image VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_no VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(500)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS poc_name VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS poc_phone VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS poc_email VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS poc_designation VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS project_contacts JSONB`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_location VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP`,
];

let success = 0;
let skipped = 0;
for (const sql of migrations) {
    try {
        await client.query(sql);
        console.log(`✅ OK: ${sql.substring(0, 60)}...`);
        success++;
    } catch (err) {
        console.log(`⚠️  Skipped (${err.message.substring(0, 80)}): ${sql.substring(0, 40)}`);
        skipped++;
    }
}

console.log(`\n✅ Migration complete! ${success} applied, ${skipped} skipped.`);
await client.end();
