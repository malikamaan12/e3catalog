const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "rental.db");

console.log(`Connecting to database at: ${dbPath}`);

try {
    const db = new Database(dbPath);
    console.log("Adding attachment columns to chat_messages...");

    db.prepare("ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT;").run();
    db.prepare("ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT;").run();
    db.prepare("ALTER TABLE chat_messages ADD COLUMN attachment_name TEXT;").run();

    console.log("Successfully updated chat_messages table.");
    db.close();
} catch (error) {
    if (error.message.includes("duplicate column name")) {
        console.log("Columns already exist, skipping.");
    } else {
        console.error("Migration failed:", error);
    }
}
