import { db } from "../src/lib/db";
import { chatMessages, users, bookings, vendors } from "../src/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function testChatRouting() {
    console.log("Starting Chat Routing Verification...");

    // 1. Setup mock data
    // Find a client
    const client = await db.query.users.findFirst({
        where: eq(users.role, "user")
    });

    // Find a vendor with a user
    const vendorWithUser = await db.query.vendors.findFirst({
        with: { user: true }
    });

    if (!client || !vendorWithUser || !vendorWithUser.user) {
        console.error("Missing test data (client or vendor with user).");
        return;
    }

    console.log(`Testing Routing for Client: ${client.name} to Vendor User: ${vendorWithUser.user.name}`);

    // Create a mock project for this vendor
    const projectId = uuidv4();
    await db.insert(bookings).values({
        id: projectId,
        productId: "mock-product-id", // placeholder
        userId: client.id,
        units: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: "request",
        projectName: "Chat Test Project",
        customerName: client.name,
        customerEmail: client.email,
        vendorId: vendorWithUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    console.log(`Created mock project ${projectId} for vendor ${vendorWithUser.id}`);

    // Simulate the logic in POST /api/chat/messages
    // In actual API:
    /*
    if (projectId) {
        const booking = await db.query.bookings.findFirst({
            where: or(eq(bookings.projectId, projectId), eq(bookings.id, projectId)),
        });

        if (booking?.vendorId) {
            const vendor = await db.query.vendors.findFirst({
                where: eq(vendors.id, booking.vendorId),
                with: { user: true }
            });
            if (vendor?.user?.id) {
                finalReceiverId = vendor.user.id;
            }
        }
    }
    */

    const booking = await db.query.bookings.findFirst({
        where: or(eq(bookings.projectId, projectId), eq(bookings.id, projectId)),
    });

    let routedReceiverId = null;
    if (booking?.vendorId) {
        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, booking.vendorId),
            with: { user: true }
        });
        if (vendor?.user?.id) {
            routedReceiverId = vendor.user.id;
        }
    }

    console.log(`Routed Receiver ID: ${routedReceiverId}`);

    if (routedReceiverId === vendorWithUser.user.id) {
        console.log("SUCCESS: Chat routed correctly to vendor owner!");
    } else {
        console.error("FAILURE: Chat routing failed.");
    }

    // Cleanup
    await db.delete(bookings).where(eq(bookings.id, projectId));
    console.log("Cleanup: Deleted mock project.");
}

testChatRouting().catch(console.error);
