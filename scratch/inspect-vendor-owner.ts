import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function inspectUser() {
    const u = await db.query.users.findFirst({
        where: eq(users.id, "db77382e-2002-44d9-a734-369d0e394825")
    });
    console.log("User for 1485-unit vendor:", u?.email, u?.name, u?.role);
}

inspectUser().catch(console.error);
