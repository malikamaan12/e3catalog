import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { senderId } = body;

        if (!senderId) {
            return NextResponse.json({ error: "senderId is required" }, { status: 400 });
        }

        // Mark all messages from the other user to me as read
        await db.update(chatMessages)
            .set({ isRead: true })
            .where(
                and(
                    eq(chatMessages.senderId, senderId),
                    eq(chatMessages.receiverId, user.id),
                    eq(chatMessages.isRead, false)
                )
            );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
