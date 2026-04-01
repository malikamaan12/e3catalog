import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "rental.db");
const db = new Database(DB_PATH);

console.log("Adding booking_id to chat_messages table...");

try {
    const tableInfo = db.prepare("PRAGMA table_info(chat_messages)").all();
    const hasBookingId = tableInfo.some(c => c.name === "booking_id");

    if (!hasBookingId) {
        console.log("Column 'booking_id' does not exist. Adding it...");
        db.exec("ALTER TABLE chat_messages ADD COLUMN booking_id TEXT REFERENCES bookings(id)");
        console.log("Column 'booking_id' added successfully.");
    } else {
        console.log("Column 'booking_id' already exists.");
    }
} catch (error) {
    console.error("Error updating database:", error);
} finally {
    db.close();
}
