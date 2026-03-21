import { db } from "./src/lib/db";
import { products, bookings, inventoryOverrides } from "./src/lib/db/schema";
import { eq, and, inArray, lte, gte } from "drizzle-orm";

async function main() {
    try {
        console.log("Fetching products...");
        const allProducts = await db.query.products.findMany({
            columns: { id: true, name: true, unit: true, categoryId: true },
            with: { category: { columns: { name: true } }, inventoryUnits: { columns: { id: true } } }
        });
        console.log(`Found ${allProducts.length} products`);

        const productIds = allProducts.map(p => p.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 14);

        console.log("Fetching bookings...");
        const allBookings = productIds.length > 0 ? await db.query.bookings.findMany({
            where: and(
                inArray(bookings.productId, productIds),
                inArray(bookings.status, ["approved", "booked", "quote_accepted", "booking_requested"]),
                lte(bookings.startDate, endDate),
                gte(bookings.endDate, today)
            ),
        }) : [];
        console.log(`Found ${allBookings.length} bookings`);

        console.log("Fetching overrides...");
        const allOverrides = productIds.length > 0 ? await db.query.inventoryOverrides.findMany({
            where: and(
                inArray(inventoryOverrides.productId, productIds),
                lte(inventoryOverrides.startDate, endDate),
                gte(inventoryOverrides.endDate, today)
            ),
        }) : [];
        console.log(`Found ${allOverrides.length} overrides`);

        console.log("SUCCESS");
        process.exit(0);
    } catch (e: any) {
        console.error("ERROR CAUGHT:");
        console.error(e);
        process.exit(1);
    }
}

main();
