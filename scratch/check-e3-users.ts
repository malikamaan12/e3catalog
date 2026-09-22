import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function checkE3Users() {
    const existing = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        hasPassword: sql<boolean>`${users.password} IS NOT NULL`
    }).from(users).where(sql`lower(${users.email}) LIKE '%@e3rentals.com' OR lower(${users.email}) LIKE '%admin%'`);

    console.log(`Found ${existing.length} matching users:`);
    for (const u of existing) {
        console.log(`- [${u.role}] ${u.name} <${u.email}> (HasPassword: ${u.hasPassword}, Status: ${u.status})`);
    }
}

checkE3Users().catch(console.error);
