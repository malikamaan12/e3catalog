import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "rental.db");
const db = new Database(dbPath);

console.log("Applying ultimate super admin schema updates...");

try {
    // 1. Add new columns to users table
    const addUserColumns = [
        "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
        "ALTER TABLE users ADD COLUMN last_login_ip TEXT;",
        "ALTER TABLE users ADD COLUMN last_login_location TEXT;",
        "ALTER TABLE users ADD COLUMN last_active TEXT;"
    ];

    for (const sql of addUserColumns) {
        try {
            db.exec(sql);
            console.log(`Added column successfully.`);
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log(`Column already exists, skipping.`);
            } else {
                console.error(`Error adding column:`, e.message);
            }
        }
    }

    // 2. Create system_logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL,
            action TEXT NOT NULL,
            target_id TEXT,
            target_type TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(admin_id) REFERENCES users(id)
        );
    `);
    console.log("Created system_logs table successfully.");

    // 3. Add Feature Flag settings
    const now = new Date().toISOString();
    const featureSettings = [
        { id: '18', key: 'feature_catalog_visible', value: 'true', group: 'features', description: 'Show the public catalog' },
        { id: '19', key: 'marketing_banner_active', value: 'false', group: 'marketing', description: 'Show the top ticker banner' },
        { id: '20', key: 'marketing_banner_text', value: 'Welcome to E3 Rentals! Book today for a 10% discount.', group: 'marketing', description: 'Text for the top banner' },
        { id: '21', key: 'marketing_popup_active', value: 'false', group: 'marketing', description: 'Show the homepage entry popup' },
        { id: '22', key: 'marketing_popup_content', value: 'Special Offer: Free logistics on orders over $5,000!', group: 'marketing', description: 'Content for the homepage entry popup' },
    ];

    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO site_settings (id, "key", value, "group", description, updated_at)
        VALUES (@id, @key, @value, @group, @description, ?)
    `);

    for (const setting of featureSettings) {
        insertSetting.run(now, setting);
    }
    console.log("Added marketing and feature settings successfully.");

} catch (err) {
    console.error("Migration failed:", err);
} finally {
    db.close();
}
