import Database from 'better-sqlite3';

const db = new Database('./data/rental.db');

try {
    // Create users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone_number TEXT,
      role TEXT NOT NULL DEFAULT 'client',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

    // Add user_id to bookings
    try {
        db.exec(`ALTER TABLE bookings ADD COLUMN user_id TEXT REFERENCES users(id);`);
        console.log("Added user_id to bookings");
    } catch (e) {
        if (!e.message.includes("duplicate column")) {
            console.warn("Failed to add user_id to bookings", e.message);
        } else {
            console.log("user_id already exists on bookings");
        }
    }

    // Add user_id to cart_items
    try {
        db.exec(`ALTER TABLE cart_items ADD COLUMN user_id TEXT REFERENCES users(id);`);
        console.log("Added user_id to cart_items");
    } catch (e) {
        if (!e.message.includes("duplicate column")) {
            console.warn("Failed to add user_id to cart_items", e.message);
        } else {
            console.log("user_id already exists on cart_items");
        }
    }

    console.log("Successfully migrated DB for Users!");
} catch (e) {
    console.error("Migration error:", e);
} finally {
    db.close();
}
