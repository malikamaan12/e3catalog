import { db } from "./src/lib/db/index";
import { users } from "./src/lib/db/schema";
import crypto from "crypto";

async function main() {
    console.log("Seeding super_admin...");
    try {
        await db.insert(users).values({
            id: crypto.randomUUID(),
            email: "malik12amaan@gmail.com",
            name: "Super Admin",
            password: "password123", // Default initial password
            phoneNumber: "0000000000",
            role: "super_admin",
            status: "active"
        });
        console.log("Super admin seeded successfully! Email: malik12amaan@gmail.com | Password: password123");
    } catch (error) {
        const e = error as any;
        if (e.code === '23505') { // Unique constraint violation (already exists)
            console.log("Super admin already exists!");
        } else {
            console.error(e);
        }
    }
    process.exit(0);
}

main();
