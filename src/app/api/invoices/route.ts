import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { createInvoiceFromBooking } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const status = url.searchParams.get("status");
        const projectId = url.searchParams.get("projectId");
        const bookingId = url.searchParams.get("bookingId");

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES_REP;

        // If client, restrict to client's invoices
        const whereConditions: any[] = [];
        if (!isStaff) {
            whereConditions.push(eq(invoices.userId, user.id));
        }

        if (status && status !== "all") {
            whereConditions.push(eq(invoices.status, status));
        }
        if (projectId) {
            whereConditions.push(eq(invoices.projectId, projectId));
        }
        if (bookingId) {
            whereConditions.push(eq(invoices.bookingId, bookingId));
        }

        const invoiceList = await db.query.invoices.findMany({
            where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
            with: {
                items: true,
                payments: true,
                creditNotes: true,
            },
            orderBy: [desc(invoices.createdAt)],
        });

        return NextResponse.json({ invoices: invoiceList });
    } catch (e: any) {
        console.error("Invoices GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || (user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SALES_REP)) {
            return NextResponse.json({ error: "Unauthorized — Staff role required" }, { status: 403 });
        }

        const body = await req.json();
        const { bookingId, projectId, invoiceType, dueDateDays, depositPercentage, customNotes } = body;

        const result = await createInvoiceFromBooking({
            bookingId,
            projectId,
            invoiceType,
            dueDateDays,
            depositPercentage,
            customNotes,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Invoices POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to create invoice" }, { status: 500 });
    }
}
