import Database from 'better-sqlite3';

const db = new Database('data/rental.db');

try {
    db.prepare("ALTER TABLE users ADD COLUMN image TEXT").run();
    console.log("Successfully added 'image' column to 'users' table in data/rental.db");
} catch (err) {
    if (err.message.includes("duplicate column name")) {
        console.log("'image' column already exists in 'users' table");
    } else {
        console.error("Error altering users table in data/rental.db:", err.message);
    }
}
