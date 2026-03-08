import { db } from "@/lib/db";
import { vendors, products } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const { user, error } = await requireAdmin(["vendor", "super_admin", "admin"]);
        if (error) return error;

        const vendorId = (user as any).vendorId;
        if (!vendorId) {
            return NextResponse.json({ error: "No vendor profile attached to this user." }, { status: 403 });
        }

        const vendorProfile = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId)
        });

        if (!vendorProfile) {
            return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
        }

        // Calculate Vendor Stats
        const vendorProducts = await db.select({ id: products.id }).from(products).where(eq(products.vendorId, vendorId));

        // Note: For a true enterprise app, we'd join bookings on cart items linked to these products to calculate actual revenue.
        // For this milestone, we provide structural placeholders for the financial ledger pipeline.

        return NextResponse.json({
            vendor: vendorProfile,
            stats: {
                activeProducts: vendorProducts.length,
                totalRevenue: 0,      // Placeholder for aggregated completed bookings
                pendingPayouts: 0,    // Placeholder for unpaid balances
                commissionRate: vendorProfile.commissionRate || 15 // Fallback generic rate
            }
        });

    } catch (err: any) {
        console.error("GET /api/vendors/me error:", err);
        return NextResponse.json({ error: "Failed to fetch vendor statistics" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { user, error } = await requireAdmin(["vendor", "super_admin", "admin"]);
        if (error) return error;

        const vendorId = (user as any).vendorId;
        if (!vendorId) {
            return NextResponse.json({ error: "No vendor profile attached to this user." }, { status: 403 });
        }

        const body = await req.json();
        const { letterheadHeaderUrl, letterheadFooterUrl } = body;

        await db.update(vendors)
            .set({
                letterheadHeaderUrl: letterheadHeaderUrl || null,
                letterheadFooterUrl: letterheadFooterUrl || null,
                updatedAt: new Date()
            })
            .where(eq(vendors.id, vendorId));

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("PUT /api/vendors/me error:", err);
        return NextResponse.json({ error: "Failed to update vendor settings" }, { status: 500 });
    }
}
