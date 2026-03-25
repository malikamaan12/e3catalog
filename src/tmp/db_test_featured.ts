import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

async function testFeatured() {
    try {
        console.log("Testing Featured Products query...");
        const featuredCount = await db.select({ value: count() }).from(products).where(eq(products.featured, true));
        console.log("Featured product count:", featuredCount[0].value);
        
        if (featuredCount[0].value === 0) {
            console.log("No featured products found. Marking first two as featured for testing...");
            const allProducts = await db.select({ id: products.id }).from(products).limit(2);
            for (const p of allProducts) {
                await db.update(products).set({ featured: true }).where(eq(products.id, p.id));
                console.log(`Marked product ${p.id} as featured.`);
            }
        }
        
        console.log("DB test successful.");
        process.exit(0);
    } catch (err) {
        console.error("DB test failed:", err);
        process.exit(1);
    }
}

testFeatured();
