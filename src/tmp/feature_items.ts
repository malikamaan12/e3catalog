import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

async function featureItems() {
    try {
        console.log("Featuring items for display...");
        
        // Let's take the first 6 items and mark as featured
        const items = await db.select({ id: products.id, name: products.name }).from(products).limit(6);
        const ids = items.map(i => i.id);
        
        if (ids.length > 0) {
            await db.update(products).set({ featured: true }).where(inArray(products.id, ids));
            console.log(`Successfully featured ${ids.length} items:`, items.map(i => i.name).join(", "));
        } else {
            console.log("No items found to feature.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Feature items failed:", err);
        process.exit(1);
    }
}

featureItems();
