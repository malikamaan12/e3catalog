import Database from 'better-sqlite3';

const db = new Database('./data/rental.db');

try {
    console.log("Creating inventory_overrides table...");
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory_overrides (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            units_offline INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
    `);
    console.log("Successfully created inventory_overrides table.");
} catch (e) {
    console.error("Migration failed:", e);
} finally {
    db.close();
}
