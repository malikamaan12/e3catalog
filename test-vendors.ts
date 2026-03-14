import { db } from "./src/lib/db";
import { vendors } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function run() {
    try {
        console.log("Checking vendors table columns...");
        const [vendor] = await db.select().from(vendors).limit(1);
        console.log("Vendor data:", vendor);
    } catch (e) {
        console.error("Vendors check failed:", e);
    }
}
run();
