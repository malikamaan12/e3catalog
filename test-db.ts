import { db } from "./src/lib/db";
import { users } from "./src/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

async function run() {
    try {
        console.log("Testing DB query repeatedly to catch pooler issues");
        for (let i = 0; i < 5; i++) {
            const [user] = await db
                .select()
                .from(users)
                .where(
                    and(
                        eq(users.email, "adil@eeeqa.com"),
                        or(
                            eq(users.password, "Adil@e3qatar"),
                            eq(users.phoneNumber, "Adil@e3qatar")
                        )
                    )
                )
                .limit(1);
            console.log(`Success ${i}`, user ? user.email : "Not found");
        }
    } catch (e) {
        console.error("Error sequence:", e);
    }
}
run();
