import { db } from "./src/lib/db/index.mjs";
import { bookings } from "./src/lib/db/schema.mjs";
import { eq } from "drizzle-orm";

async function run() {
    try {
        console.log("Updating legacy statuses...");
        await db.update(bookings)
            .set({ status: "request" })
            .where(eq(bookings.status, "pending_quote"));
        console.log("Done.");
    } catch (err) {
        console.error("Migration failed:", err);
    }
}
run();
