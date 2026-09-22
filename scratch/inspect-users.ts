import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";

async function checkUsers() {
    const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        vendorId: users.vendorId,
        companyName: users.companyName
    }).from(users);

    console.log(`Found ${allUsers.length} total users in DB:`);
    for (const u of allUsers) {
        console.log(`- [${u.role}] ${u.name} <${u.email}> (Status: ${u.status}, VendorId: ${u.vendorId || "none"})`);
    }

    const allVendors = await db.select({
        id: vendors.id,
        companyName: vendors.companyName,
        userId: vendors.userId,
        lifecycleStatus: vendors.lifecycleStatus
    }).from(vendors);

    console.log(`\nFound ${allVendors.length} vendors in DB:`);
    for (const v of allVendors) {
        console.log(`- Vendor "${v.companyName}" (ID: ${v.id}, User: ${v.userId}, Status: ${v.lifecycleStatus})`);
    }
}

checkUsers().catch(console.error);
