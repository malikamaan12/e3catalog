import { db } from "../src/lib/db";
import { vendorWarehouses, warehouseZones, inventoryUnits, products, bookings } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const warehouseId = "9300db24-4419-4722-944c-fbb7c6bb2770";
    const w = await db.query.vendorWarehouses.findFirst({
        where: eq(vendorWarehouses.id, warehouseId),
    });
    console.log("Warehouse:", w?.name, "(ID:", w?.id, ")");

    const zones = await db.select().from(warehouseZones).where(eq(warehouseZones.warehouseId, warehouseId));
    console.log("Zones in warehouse:", zones.map(z => ({ id: z.id, name: z.name, code: z.zoneCode })));

    const units = await db.select().from(inventoryUnits).where(eq(inventoryUnits.warehouseId, warehouseId));
    console.log("Units assigned to this warehouse:", units.length);

    const allProducts = await db.select({ id: products.id, name: products.name, categoryId: products.categoryId, vendorId: products.vendorId }).from(products).limit(15);
    console.log("Sample products:", allProducts);

    const existingBookings = await db.select().from(bookings).limit(5);
    console.log("Existing bookings count:", existingBookings.length);
    if (existingBookings.length > 0) {
        console.log("Sample booking:", existingBookings[0]);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
