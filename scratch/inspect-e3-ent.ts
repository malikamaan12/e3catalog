import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function inspectE3Ent() {
    const v = await db.query.vendors.findFirst({
        where: eq(vendors.id, "E3-ENT")
    });
    console.log("Vendor E3-ENT:", v);

    if (v?.userId) {
        const u = await db.query.users.findFirst({
            where: eq(users.id, v.userId)
        });
        console.log("Associated User for E3-ENT:", u?.id, u?.name, u?.email, u?.role);
    }
}

inspectE3Ent().catch(console.error);
