import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await db.update(bookings)
            .set({ status: "request" })
            .where(eq(bookings.status, "pending_quote"));

        return NextResponse.json({ success: true, message: "Updated pending_quote to request" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
