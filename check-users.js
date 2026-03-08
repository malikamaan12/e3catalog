const Database = require('better-sqlite3');
const db = new Database('./data/rental.db');
const users = db.prepare(`SELECT email, role, status FROM users LIMIT 10`).all();
console.log(JSON.stringify(users, null, 2));
