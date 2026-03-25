import { db } from "@/lib/db";
import { products, siteSettings } from "@/lib/db/schema";
import { count } from "drizzle-orm";

async function testDb() {
    try {
        console.log("Testing DB connection...");
        const productCount = await db.select({ value: count() }).from(products);
        console.log("Product count:", productCount[0].value);
        
        const settingsCount = await db.select({ value: count() }).from(siteSettings);
        console.log("Settings count:", settingsCount[0].value);
        
        console.log("DB test successful.");
        process.exit(0);
    } catch (err) {
        console.error("DB test failed:", err);
        process.exit(1);
    }
}

testDb();
