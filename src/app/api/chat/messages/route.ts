import { db } from "@/lib/db";
import { chatMessages, users } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");
        const otherUserId = searchParams.get("otherUserId");

        let query = db.select().from(chatMessages);

        const conditions = [];

        if (["admin", "super_admin", "vendor", "sales_rep"].includes(user.role)) {
            if (otherUserId) {
                conditions.push(
                    or(
                        and(eq(chatMessages.senderId, user.id), eq(chatMessages.receiverId, otherUserId)),
                        and(eq(chatMessages.senderId, otherUserId), eq(chatMessages.receiverId, user.id))
                    )
                );
            } else {
                // Admin might want all messages or grouped by user? 
                // For a specific user view, otherUserId is required.
                return NextResponse.json({ error: "otherUserId is required for admin" }, { status: 400 });
            }
        } else {
            // Client: messages involving themselves
            conditions.push(
                or(
                    eq(chatMessages.senderId, user.id),
                    eq(chatMessages.receiverId, user.id)
                )
            );
        }

        if (projectId) {
            conditions.push(eq(chatMessages.projectId, projectId));
        }

        const messages = await db
            .select()
            .from(chatMessages)
            .where(and(...conditions))
            .orderBy(desc(chatMessages.createdAt))
            .limit(100);

        return NextResponse.json(messages.reverse());

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { content, projectId, receiverId, attachmentUrl, attachmentType, attachmentName } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        let finalReceiverId = receiverId;

        if (!["admin", "super_admin", "vendor", "sales_rep"].includes(user.role)) {
            // If client is sending, find an admin to receive
            if (!finalReceiverId) {
                const [admin] = await db
                    .select()
                    .from(users)
                    .where(eq(users.role, "admin"))
                    .limit(1);

                if (!admin) {
                    return NextResponse.json({ error: "No admin available to receive messages" }, { status: 500 });
                }
                finalReceiverId = admin.id;
            }
        } else {
            // Admin must provide a receiverId
            if (!finalReceiverId) {
                return NextResponse.json({ error: "receiverId is required for admin" }, { status: 400 });
            }
        }

        const [newMessage] = await db.insert(chatMessages).values({
            id: uuid(),
            senderId: user.id,
            receiverId: finalReceiverId,
            projectId: projectId || null,
            content,
            attachmentUrl,
            attachmentType,
            attachmentName,
            isRead: false,
            createdAt: new Date(),
        }).returning();

        return NextResponse.json(newMessage);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
