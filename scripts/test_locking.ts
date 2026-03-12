import { db } from "../src/lib/db";
import { bookings, products, inventoryUnits } from "../src/lib/db/schema";
import { checkAvailability } from "../src/lib/availability";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function testInventoryLocking() {
    console.log("Starting Inventory Locking Verification...");

    // 1. Pick a product
    const product = await db.query.products.findFirst({
        with: { inventoryUnits: true }
    });

    if (!product || product.inventoryUnits.length === 0) {
        console.error("No product with inventory found for testing.");
        return;
    }

    console.log(`Testing with Product: ${product.name} (Total units: ${product.inventoryUnits.length})`);

    const startDate = "2026-12-01";
    const endDate = "2026-12-05";

    // 2. Initial availability check
    const initialAvailability = await checkAvailability({
        productId: product.id,
        startDate,
        endDate,
        quantity: 1
    });

    console.log(`Initial Availability: ${initialAvailability.unitsAvailable}/${initialAvailability.totalUnits}`);

    // 3. Create a 'quote_accepted' booking
    const testBookingId = uuidv4();
    await db.insert(bookings).values({
        id: testBookingId,
        productId: product.id,
        userId: "test-user-id", // placeholder
        units: 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "quote_accepted",
        projectName: "Test Locking Project",
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date()
    });

    console.log("Created 'quote_accepted' booking for 1 unit.");

    // 4. Re-check availability
    const postBookingAvailability = await checkAvailability({
        productId: product.id,
        startDate,
        endDate,
        quantity: 1
    });

    console.log(`Post-Booking Availability: ${postBookingAvailability.unitsAvailable}/${postBookingAvailability.totalUnits}`);

    if (postBookingAvailability.unitsAvailable === initialAvailability.unitsAvailable - 1) {
        console.log("SUCCESS: Inventory correctly locked for 'quote_accepted' status!");
    } else {
        console.error("FAILURE: Inventory NOT locked correctly.");
    }

    // 5. Cleanup
    await db.delete(bookings).where(eq(bookings.id, testBookingId));
    console.log("Cleanup: Deleted test booking.");
}

testInventoryLocking().catch(console.error);
