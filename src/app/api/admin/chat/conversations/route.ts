import { db } from "@/lib/db";
import { chatMessages, users } from "@/lib/db/schema";
import { eq, or, desc, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    try {
        const { user: currentAdmin, error } = await requireAdmin(["admin", "super_admin", "vendor", "sales_rep"]);
        if (error) return error;

        // Staff roles that constitute the "Support Team"
        const STAFF_ROLES = ["admin", "super_admin", "vendor", "sales_rep"];

        // 1. Fetch ALL users with staff roles
        const staffList = await db.select({ id: users.id }).from(users).where(or(...STAFF_ROLES.map(role => eq(users.role, role))));
        const staffIds = staffList.map(s => s.id);

        if (staffIds.length === 0) return NextResponse.json([]);

        // 2. Determine Vendor Access
        let vendorProjectIds: string[] = [];
        if (currentAdmin.role === "vendor" && currentAdmin.vendorId) {
            // Vendors can only see chats tied to their bookings
            const { bookings } = await import("@/lib/db/schema");
            const vBookings = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.vendorId, currentAdmin.vendorId));
            vendorProjectIds = vBookings.map(b => b.id);
        }

        // 3. Fetch all messages involving ANY staff member
        const allMessages = await db
            .select()
            .from(chatMessages)
            .where(
                or(
                    inArray(chatMessages.senderId, staffIds),
                    inArray(chatMessages.receiverId, staffIds)
                )
            )
            .orderBy(desc(chatMessages.createdAt));

        // 4. Group by Client and Project
        const conversationsMap = new Map();

        for (const msg of allMessages) {
            // Apply Vendor Security Filter
            if (currentAdmin.role === "vendor") {
                // If it's a quote chat, must be one of their quotes
                if (msg.projectId && !vendorProjectIds.includes(msg.projectId)) continue;
                // If no quote ID, they shouldn't see it unless they are specifically the sender/receiver
                if (!msg.projectId && msg.senderId !== currentAdmin.id && msg.receiverId !== currentAdmin.id) continue;
            }

            const isSenderStaff = staffIds.includes(msg.senderId);
            const isReceiverStaff = staffIds.includes(msg.receiverId);
            
            const otherUserId = isSenderStaff 
                ? (isReceiverStaff ? (msg.receiverId === currentAdmin.id ? msg.senderId : msg.receiverId) : msg.receiverId)
                : msg.senderId;

            const conversationKey = msg.projectId ? `project_${msg.projectId}` : `user_${otherUserId}`;

            if (!conversationsMap.has(conversationKey)) {
                const [otherUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.id, otherUserId))
                    .limit(1);

                if (otherUser) {
                    conversationsMap.set(conversationKey, {
                        id: conversationKey, // unique identifier for the conversation
                        userId: otherUserId,
                        projectId: msg.projectId,
                        name: msg.projectId ? `${otherUser.name} (Quote)` : otherUser.name,
                        email: otherUser.email,
                        companyName: otherUser.companyName,
                        image: otherUser.image,
                        lastMessage: msg.content,
                        lastMessageAt: msg.createdAt,
                        lastMessageSenderId: msg.senderId,
                        lastMessageIsRead: msg.isRead,
                        unreadCount: (!msg.isRead && msg.receiverId === currentAdmin.id) ? 1 : 0
                    });
                }
            } else {
                if (!msg.isRead && msg.receiverId === currentAdmin.id) {
                    const conv = conversationsMap.get(conversationKey);
                    conv.unreadCount += 1;
                }
            }
        }

        const conversations = Array.from(conversationsMap.values());

        return NextResponse.json(conversations);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

