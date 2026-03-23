const { db } = require('./src/lib/db');
const { inventoryUnits, bookingUnitAssignments, bookings } = require('./src/lib/db/schema');
const { eq, and, ne } = require('drizzle-orm');

async function test() {
    try {
        const unit = await db.query.inventoryUnits.findFirst();
        const booking = await db.query.bookings.findFirst();

        if (!unit || !booking) {
            console.log("No data to test with.");
            return;
        }

        console.log(`Testing assignment: Unit ${unit.assetTagCode} to Booking ${booking.id}`);

        // Try to assign
        const res = await fetch(`http://localhost:3000/api/passport/${unit.assetTagCode}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id })
        });

        const data = await res.json();
        console.log("Response:", data);

        if (res.ok) {
            console.log("Assignment Successful!");
            // Verify DB
            const updatedUnit = await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.id, unit.id) });
            console.log("Updated Status:", updatedUnit.availabilityStatus);
        } else {
            console.log("Assignment Failed:", data.error);
        }
    } catch (e) {
        console.error("Test Error:", e);
    }
}

test();
