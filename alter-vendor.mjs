import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "rental.db");
const db = new Database(dbPath);

console.log("Applying vendor admin schema updates...");

try {
    // 1. Create vendors table
    db.exec(`
        CREATE TABLE IF NOT EXISTS vendors (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            company_name TEXT NOT NULL,
            kyc_status TEXT NOT NULL DEFAULT 'pending',
            agreement_status TEXT NOT NULL DEFAULT 'unsigned',
            payout_details TEXT,
            commission_rate REAL,
            score_delivery INTEGER DEFAULT 100,
            score_condition INTEGER DEFAULT 100,
            score_rating REAL DEFAULT 5.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);
    console.log("Created vendors table successfully.");

    // 2. Add Vendor Commission Rate Setting
    const now = new Date().toISOString();
    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO site_settings (id, "key", value, "group", description, updated_at)
        VALUES (@id, @key, @value, @group, @description, ?)
    `);

    insertSetting.run(now, { id: 'v1', key: 'vendor_commission_rate', value: '20', group: 'marketing', description: 'Default percentage commission taken from vendor rentals.' });
    console.log("Added vendor_commission_rate setting successfully.");

} catch (err) {
    console.error("Migration failed:", err);
} finally {
    db.close();
}
