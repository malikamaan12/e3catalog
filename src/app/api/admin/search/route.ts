import { db } from "@/lib/db";
import { products, bookings, vendors } from "@/lib/db/schema";
import { or, like, and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "vendor"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;
    const searchTerm = `%${query.toLowerCase()}%`;

    try {
        const results: any[] = [];

        // 1. Search Products
        const foundProducts = await db.query.products.findMany({
            where: and(
                targetVendorId ? eq(products.vendorId, targetVendorId) : sql`1=1`,
                or(
                    like(sql`lower(${products.name})`, searchTerm),
                    like(sql`lower(${products.slug})`, searchTerm),
                    like(sql`lower(${products.itemCode})`, searchTerm)
                )
            ),
            limit: 5,
        });

        foundProducts.forEach(p => {
            results.push({
                id: p.id,
                type: "product",
                title: p.name,
                subtitle: `ID: ${p.itemCode || p.id} | ${p.pricePerDay} QAR/day`,
                href: `/admin/products?search=${p.slug}`
            });
        });

        // 2. Search Bookings / Quotes
        const foundBookings = await db.query.bookings.findMany({
            where: and(
                targetVendorId ? eq(bookings.vendorId, targetVendorId) : sql`1=1`,
                or(
                    like(sql`lower(${bookings.projectName})`, searchTerm),
                    like(sql`lower(${bookings.customerName})`, searchTerm),
                    like(sql`lower(${bookings.customerEmail})`, searchTerm),
                    like(bookings.id, searchTerm)
                )
            ),
            limit: 5,
        });

        foundBookings.forEach(b => {
            results.push({
                id: b.id,
                type: "booking",
                title: b.projectName || "Unnamed Project",
                subtitle: `Quote: ${b.id.slice(0, 8)} | Client: ${b.customerName}`,
                href: `/admin/bookings/${b.id}`
            });
        });

        // 3. Search Vendors (Super Admin only)
        if (isSuperAdmin) {
            const foundVendors = await db.query.vendors.findMany({
                where: or(
                    like(sql`lower(${vendors.companyName})`, searchTerm),
                    like(sql`lower(${vendors.taxId})`, searchTerm)
                ),
                limit: 5,
            });

            foundVendors.forEach(v => {
                results.push({
                    id: v.id,
                    type: "vendor",
                    title: v.companyName,
                    subtitle: `Tax ID: ${v.taxId || 'N/A'} | KYC: ${v.kycStatus}`,
                    href: `/admin/super/vendors`
                });
            });
        }

        return NextResponse.json(results);
    } catch (err) {
        console.error("Global search error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
