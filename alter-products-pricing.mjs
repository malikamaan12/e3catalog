import Database from 'better-sqlite3';

const db = new Database('./data/rental.db', { verbose: console.log });

console.log("Starting product pricing fields migration...");

try {
    // 1. Add show_price
    try {
        db.prepare(`ALTER TABLE products ADD COLUMN show_price integer NOT NULL DEFAULT 1`).run();
        console.log("Added show_price column.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("show_price column already exists.");
        } else {
            throw e;
        }
    }

    // 2. Add price_type
    try {
        db.prepare(`ALTER TABLE products ADD COLUMN price_type text NOT NULL DEFAULT 'daily'`).run();
        console.log("Added price_type column.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("price_type column already exists.");
        } else {
            throw e;
        }
    }

    // 3. Add price_range_max
    try {
        db.prepare(`ALTER TABLE products ADD COLUMN price_range_max real`).run();
        console.log("Added price_range_max column.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("price_range_max column already exists.");
        } else {
            throw e;
        }
    }

    console.log("Migration completed successfully.");

} catch (error) {
    console.error("Migration failed:", error);
} finally {
    db.close();
}
