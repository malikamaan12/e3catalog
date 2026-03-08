import { db } from "./src/lib/db/index";
import { users } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const user = await db.select().from(users).where(eq(users.email, "malik12amaan@gmail.com"));
    console.log("Current Admin Data:", JSON.stringify(user, null, 2));
    process.exit(0);
}

main();
