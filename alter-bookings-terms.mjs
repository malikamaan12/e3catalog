import Database from 'better-sqlite3';

const db = new Database('./data/rental.db', { verbose: console.log });

console.log("Starting bookings PDF Terms & Notes migration...");

try {
    // 1. Add selected_terms
    try {
        db.prepare(`ALTER TABLE bookings ADD COLUMN selected_terms text`).run();
        console.log("Added selected_terms column to bookings.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("selected_terms column already exists.");
        } else {
            throw e;
        }
    }

    // 2. Add custom_notes
    try {
        db.prepare(`ALTER TABLE bookings ADD COLUMN custom_notes text`).run();
        console.log("Added custom_notes column to bookings.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("custom_notes column already exists.");
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
