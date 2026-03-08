import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "rental.db");
const db = new Database(DB_PATH);

console.log("Checking for chat_messages table...");

try {
    const tableInfo = db.prepare("PRAGMA table_info(chat_messages)").all();
    if (tableInfo.length === 0) {
        console.log("Table 'chat_messages' does not exist. Creating it...");
        db.exec(`
            CREATE TABLE chat_messages (
                id TEXT PRIMARY KEY,
                sender_id TEXT NOT NULL REFERENCES users(id),
                receiver_id TEXT NOT NULL REFERENCES users(id),
                project_id TEXT,
                content TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        `);
        console.log("Table 'chat_messages' created successfully.");
    } else {
        console.log("Table 'chat_messages' already exists.");
        console.log("Columns:", tableInfo.map(c => c.name).join(", "));
    }
} catch (error) {
    console.error("Error updating database:", error);
} finally {
    db.close();
}
