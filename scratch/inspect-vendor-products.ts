import { db } from "@/lib/db";
import { vendors, products, inventoryUnits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function checkVendorInventory() {
    const vList = await db.select().from(vendors);
    console.log(`Found ${vList.length} vendors:`);
    for (const v of vList) {
        const prodCount = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.vendorId, v.id));
        const unitCount = await db.select({ count: sql<number>`count(*)` }).from(inventoryUnits).where(eq(inventoryUnits.vendorId, v.id));
        console.log(`- Vendor "${v.companyName}" (ID: ${v.id}, Status: ${v.lifecycleStatus}): ${prodCount[0]?.count || 0} products, ${unitCount[0]?.count || 0} units`);
    }
}

checkVendorInventory().catch(console.error);
