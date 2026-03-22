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

        // 2. Fetch all messages involving ANY staff member
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

        // 3. Group by the "Other" (Client) party
        const conversationsMap = new Map();

        for (const msg of allMessages) {
            const isSenderStaff = staffIds.includes(msg.senderId);
            const isReceiverStaff = staffIds.includes(msg.receiverId);
            
            // The person we are talking to is the one who isn't staff
            // If both are staff (internal chat), pick the other staff member
            const otherUserId = isSenderStaff 
                ? (isReceiverStaff ? (msg.receiverId === currentAdmin.id ? msg.senderId : msg.receiverId) : msg.receiverId)
                : msg.senderId;

            if (!conversationsMap.has(otherUserId)) {
                const [otherUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.id, otherUserId))
                    .limit(1);

                if (otherUser) {
                    conversationsMap.set(otherUserId, {
                        userId: otherUserId,
                        name: otherUser.name,
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
                // Update unread count if message was sent TO the current admin
                // OR if we want to show a global "unread" state for the conversation
                if (!msg.isRead && msg.receiverId === currentAdmin.id) {
                    const conv = conversationsMap.get(otherUserId);
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
