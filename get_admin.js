const Database = require('better-sqlite3');
const db = new Database('data/rental.db');
const admin = db.prepare("SELECT email, password, phone_number FROM users WHERE role='admin'").get();
console.log(JSON.stringify(admin, null, 2));
