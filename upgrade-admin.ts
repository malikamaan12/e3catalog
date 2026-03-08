import { db } from "./src/lib/db/index";
import { users } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Upgrading malik12amaan@gmail.com to super_admin...");
    try {
        await db.update(users)
            .set({ role: "super_admin", status: "active" })
            .where(eq(users.email, "malik12amaan@gmail.com"));

        console.log("Successfully upgraded role to super_admin.");
        console.log("Your login password has been set by your vendor application: 8858204920");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main();
