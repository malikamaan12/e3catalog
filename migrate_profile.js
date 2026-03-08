// Migration: add company profile columns to users table
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Find the correct db path
const candidates = [
    path.join(__dirname, "src/lib/db/rental.db"),
    path.join(__dirname, "data/rental.db"),
    path.join(__dirname, "src/lib/db/sqlite.db"),
    path.join(__dirname, "local.db"),
    path.join(__dirname, "sqlite.db"),
];
const dbPath = candidates.find(fs.existsSync);
if (!dbPath) { console.error("No DB found!"); process.exit(1); }
console.log("Using DB:", dbPath);
const db = new Database(dbPath);

const cols = [
    "ALTER TABLE users ADD COLUMN company_name TEXT",
    "ALTER TABLE users ADD COLUMN registration_no TEXT",
    "ALTER TABLE users ADD COLUMN location TEXT",
    "ALTER TABLE users ADD COLUMN address TEXT",
    "ALTER TABLE users ADD COLUMN designation TEXT",
    "ALTER TABLE users ADD COLUMN alternate_phone TEXT",
    "ALTER TABLE users ADD COLUMN poc_name TEXT",
    "ALTER TABLE users ADD COLUMN poc_phone TEXT",
    "ALTER TABLE users ADD COLUMN poc_email TEXT",
    "ALTER TABLE users ADD COLUMN poc_designation TEXT",
    "ALTER TABLE users ADD COLUMN project_contacts TEXT",
];

for (const sql of cols) {
    try {
        db.exec(sql);
        console.log("✓", sql);
    } catch (e) {
        if (e.message.includes("duplicate column")) {
            console.log("⚠ already exists:", sql.split(" ADD COLUMN ")[1]);
        } else {
            console.error("✗", sql, e.message);
        }
    }
}

console.log("Migration complete.");
db.close();
