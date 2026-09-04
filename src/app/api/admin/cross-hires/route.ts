import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crossHireOrders, products, vendors } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { differenceInCalendarDays } from "date-fns";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.SALES_REP,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        const status = url.searchParams.get("status");
        const productId = url.searchParams.get("productId");

        const orders = await db.query.crossHireOrders.findMany({
            where: and(
                status ? eq(crossHireOrders.status, status) : undefined,
                productId ? eq(crossHireOrders.productId, productId) : undefined,
            ),
            orderBy: [desc(crossHireOrders.createdAt)],
            with: {
                product: true,
                supplierVendor: true,
                booking: true,
                creator: true,
            }
        });

        return NextResponse.json({ orders });
    } catch (e: any) {
        console.error("GET /api/admin/cross-hires error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.SALES_REP,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            bookingId,
            supplierVendorId,
            supplierName,
            supplierContact,
            productId,
            unitsRequested = 1,
            periodStart,
            periodEnd,
            supplierDailyRate = 0,
            clientDailyRate = 0,
            notes,
        } = body;

        if (!supplierName || !productId || !periodStart || !periodEnd) {
            return NextResponse.json({
                error: "supplierName, productId, periodStart, and periodEnd are required."
            }, { status: 400 });
        }

        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);
        const days = Math.max(1, differenceInCalendarDays(endDate, startDate));

        const units = Math.max(1, parseInt(unitsRequested, 10) || 1);
        const costRate = parseFloat(supplierDailyRate) || 0;
        const revenueRate = parseFloat(clientDailyRate) || 0;

        const totalSupplierCost = days * units * costRate;
        const totalClientRevenue = days * units * revenueRate;
        const profitMargin = totalClientRevenue - totalSupplierCost;

        const orderId = uuid();
        const orderNumber = `XHIRE-${Date.now().toString(36).toUpperCase()}`;

        const [order] = await db.insert(crossHireOrders).values({
            id: orderId,
            orderNumber,
            bookingId: bookingId || null,
            supplierVendorId: supplierVendorId || null,
            supplierName,
            supplierContact: supplierContact || null,
            productId,
            unitsRequested: units,
            periodStart: startDate,
            periodEnd: endDate,
            supplierDailyRate: costRate,
            clientDailyRate: revenueRate,
            totalSupplierCost,
            totalClientRevenue,
            profitMargin,
            status: "requested",
            notes: notes || null,
            createdById: user.id,
        }).returning();

        return NextResponse.json({
            success: true,
            order,
            message: `Cross-Hire Order #${orderNumber} created. Spread: QAR ${profitMargin.toLocaleString()}`
        }, { status: 201 });

    } catch (e: any) {
        console.error("POST /api/admin/cross-hires error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
