import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "rental.db");
const db = new Database(DB_PATH);

try {
    const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
    if (admin) {
        console.log("Admin found:", admin.email);
    } else {
        console.log("No admin user found!");
        // List all roles to see what we have
        const roles = db.prepare("SELECT DISTINCT role FROM users").all();
        console.log("Available roles:", roles.map(r => r.role));
    }
} catch (error) {
    console.error("Error query database:", error);
} finally {
    db.close();
}
