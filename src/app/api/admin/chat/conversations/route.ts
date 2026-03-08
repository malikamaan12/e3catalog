import { db } from "@/lib/db";
import { chatMessages, users } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    try {
        const { user: admin, error } = await requireAdmin(["admin", "super_admin", "vendor", "sales_rep"]);
        if (error) return error;

        // Fetch all messages involving the admin
        const allMessages = await db
            .select()
            .from(chatMessages)
            .where(
                or(
                    eq(chatMessages.senderId, admin.id),
                    eq(chatMessages.receiverId, admin.id)
                )
            )
            .orderBy(desc(chatMessages.createdAt));

        // Group by the other user ID
        const conversationsMap = new Map();

        for (const msg of allMessages) {
            const otherUserId = msg.senderId === admin.id ? msg.receiverId : msg.senderId;

            if (!conversationsMap.has(otherUserId)) {
                // Fetch user details for the first time we see this user
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
                        unreadCount: (!msg.isRead && msg.receiverId === admin.id) ? 1 : 0
                    });
                }
            } else {
                // Update unread count if necessary
                if (!msg.isRead && msg.receiverId === admin.id) {
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
