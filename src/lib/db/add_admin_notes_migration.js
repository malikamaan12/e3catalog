const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "rental.db");

console.log(`Connecting to database at: ${dbPath}`);

try {
    const db = new Database(dbPath);
    console.log("Adding admin_notes column to products...");

    db.prepare("ALTER TABLE products ADD COLUMN admin_notes TEXT;").run();

    console.log("Successfully updated products table.");
    db.close();
} catch (error) {
    if (error.message.includes("duplicate column name")) {
        console.log("Column 'admin_notes' already exists, skipping.");
    } else {
        console.error("Migration failed:", error);
    }
}
