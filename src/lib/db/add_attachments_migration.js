const Database = require("better-sqlite3");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// The database file is usually at the root or configured in .env
// Based on typical setups, it might be 'sqlite.db' or similar.
// Let's check the .env or assume a default path for now.
const dbPath = process.env.DATABASE_URL ?
    process.env.DATABASE_URL.replace('file:', '') :
    path.join(process.cwd(), "sqlite.db");

console.log(`Connecting to database at: ${dbPath}`);

const db = new Database(dbPath);

console.log("Adding attachment columns to chat_messages...");

try {
    db.prepare("ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT;").run();
    db.prepare("ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT;").run();
    db.prepare("ALTER TABLE chat_messages ADD COLUMN attachment_name TEXT;").run();
    console.log("Successfully updated chat_messages table.");
} catch (error) {
    if (error.message.includes("duplicate column name")) {
        console.log("Columns already exist, skipping.");
    } else {
        console.error("Migration failed:", error);
    }
} finally {
    db.close();
}
