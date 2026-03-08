import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "rental.db");
const db = new Database(dbPath);

const targetEmail = "malik12amaan@gmail.com";

console.log(`Checking for user: ${targetEmail}`);

const user = db.prepare('SELECT id, name, role FROM users WHERE email = ?').get(targetEmail);

if (!user) {
    console.error(`User with email ${targetEmail} not found! Please create an account first.`);
} else {
    console.log(`User found: ${user.name} (Current role: ${user.role})`);

    // Update role
    const info = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('super_admin', targetEmail);

    if (info.changes > 0) {
        console.log(`Success! ${targetEmail} is now a super_admin.`);
    } else {
        console.error("Update failed.");
    }
}

db.close();
