import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { differenceInDays } from "date-fns";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const sessionId = req.cookies.get("rental_session")?.value;
    const currentUser = await getCurrentUser().catch(() => null);

    if (!sessionId && !currentUser) {
        return NextResponse.json({ error: "No cart session found" }, { status: 400 });
    }

    const whereClause = currentUser?.id
        ? (sessionId ? or(eq(cartItems.sessionId, sessionId), eq(cartItems.userId, currentUser.id)) : eq(cartItems.userId, currentUser.id))
        : eq(cartItems.sessionId, sessionId!);

    const items = await db.query.cartItems.findMany({
        where: whereClause,
        with: {
            product: {
                with: {
                    category: true,
                    safetyCertificates: true,
                },
            },
        },
    });

    if (items.length === 0) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Build quote data for PDF generation
    const body = await req.json().catch(() => ({}));
    const customerName = body.customerName || "Valued Client";
    const customerEmail = body.customerEmail || "";
    const customerPhone = body.customerPhone || "";
    const notes = body.notes || "";

    const quoteItems = items.map((item) => {
        const days = Math.max(1, differenceInDays(new Date(item.endDate), new Date(item.startDate)) + 1);
        const unitPrice = item.product.pricePerDay;
        const lineTotal = unitPrice * item.quantity * days;

        return {
            name: item.product.name,
            slug: item.product.slug,
            category: item.product.category?.name || "",
            dimensions: item.product.dimensions || "",
            quantity: item.quantity,
            startDate: item.startDate,
            endDate: item.endDate,
            days,
            unitPrice,
            lineTotal,
            thumbnailUrl: item.product.thumbnailUrl,
            certificates: item.product.safetyCertificates?.map((c) => c.certName) || [],
        };
    });

    const subtotal = quoteItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = subtotal; // no tax anymore

    const quoteData = {
        quoteNumber: `QT-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toISOString().split("T")[0],
        customer: { name: customerName, email: customerEmail, phone: customerPhone },
        notes,
        items: quoteItems,
        subtotal,
        total,
    };

    return NextResponse.json(quoteData);
}
