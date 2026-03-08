import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "rental.db");
const db = new Database(dbPath);

console.log("Checking for site_settings table...");

// Create site_settings table
db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
        id TEXT PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        "group" TEXT NOT NULL DEFAULT 'general',
        description TEXT,
        updated_at TEXT NOT NULL
    );
`);

console.log("Adding sample settings...");

const now = new Date().toISOString();
const sampleSettings = [
    { id: '1', key: 'site_name', value: 'Rental App', group: 'general', description: 'Name of the website', updated_at: now },
    { id: '2', key: 'primary_color', value: '#3b82f6', group: 'theme', description: 'Primary theme color', updated_at: now },
    { id: '3', key: 'contact_email', value: 'admin@example.com', group: 'contact', description: 'Main contact email', updated_at: now },
    { id: '4', key: 'whatsapp_number', value: '+1234567890', group: 'contact', description: 'WhatsApp contact number', updated_at: now }
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO site_settings (id, "key", value, "group", description, updated_at)
    VALUES (@id, @key, @value, @group, @description, @updated_at)
`);

for (const setting of sampleSettings) {
    insert.run(setting);
}

console.log("Done!");
db.close();
