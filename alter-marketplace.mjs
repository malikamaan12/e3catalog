import Database from 'better-sqlite3';
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "rental.db");
console.log("Using Database at:", DB_PATH);

if (!fs.existsSync(DB_PATH)) {
    console.error("Database file not found at", DB_PATH);
    process.exit(1);
}

const db = new Database(DB_PATH);
console.log("Running marketplace migration...");

const addColumn = (table, column, def) => {
    try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
        console.log(`Added ${column} to ${table}`);
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log(`Column ${column} already exists in ${table}`);
        } else {
            console.error(`Error adding ${column} to ${table}:`, e.message);
        }
    }
};

// Users
addColumn('users', 'vendor_id', 'TEXT');

// Vendors
addColumn('vendors', 'website', 'TEXT');
addColumn('vendors', 'tax_id', 'TEXT');
addColumn('vendors', 'tax_card_url', 'TEXT');
addColumn('vendors', 'poc_name', 'TEXT');
addColumn('vendors', 'poc_phone', 'TEXT');
addColumn('vendors', 'alternate_poc_name', 'TEXT');
addColumn('vendors', 'alternate_poc_phone', 'TEXT');
addColumn('vendors', 'logo_url', 'TEXT');

// Products
addColumn('products', 'vendor_id', 'TEXT');

// Bookings
addColumn('bookings', 'vendor_id', 'TEXT');
addColumn('bookings', 'fulfillment_status', "TEXT NOT NULL DEFAULT 'pending'");
addColumn('bookings', 'warehouse_notes', 'TEXT');

console.log("Migration complete.");
