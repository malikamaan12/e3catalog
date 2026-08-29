import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, bookings, invoices, users, vendors, inventoryUnits } from "@/lib/db/schema";
import { ilike, or, eq, and } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "global_search")) {
            return NextResponse.json({ error: "Forbidden: Clients and unauthorized roles cannot access global search" }, { status: 403 });
        }

        const url = new URL(req.url);
        const query = url.searchParams.get("q")?.trim() || "";

        if (query.length < 2) {
            return NextResponse.json({ results: { products: [], bookings: [], invoices: [], clients: [], vendors: [] } });
        }

        // 1. Search Products
        const matchedProducts = await db.select({
            id: products.id,
            name: products.name,
            itemCode: products.itemCode,
            category: products.categoryId,
        }).from(products)
          .where(or(ilike(products.name, `%${query}%`), ilike(products.itemCode, `%${query}%`)))
          .limit(10);

        // 2. Search Bookings
        const matchedBookings = await db.select({
            id: bookings.id,
            customerName: bookings.customerName,
            status: bookings.status,
            totalPrice: bookings.totalPrice,
        }).from(bookings)
          .where(or(ilike(bookings.customerName, `%${query}%`), ilike(bookings.customerEmail, `%${query}%`)))
          .limit(10);

        // 3. Search Invoices (finance authorized only)
        let matchedInvoices: any[] = [];
        if (hasPermission(user.role, "view_financial_analytics")) {
            matchedInvoices = await db.select({
                id: invoices.id,
                invoiceNumber: invoices.invoiceNumber,
                customerName: invoices.customerName,
                totalAmount: invoices.totalAmount,
                status: invoices.status,
            }).from(invoices)
              .where(or(ilike(invoices.invoiceNumber, `%${query}%`), ilike(invoices.customerName, `%${query}%`)))
              .limit(10);
        }

        // 4. Search Vendors (if vendor role, tenant isolate to own record)
        let matchedVendors: any[] = [];
        if (user.role === "vendor" && user.vendorId) {
            matchedVendors = await db.select({
                id: vendors.id,
                companyName: vendors.companyName,
            }).from(vendors).where(eq(vendors.id, user.vendorId)).limit(1);
        } else if (hasPermission(user.role, "review_vendor_kyc")) {
            matchedVendors = await db.select({
                id: vendors.id,
                companyName: vendors.companyName,
            }).from(vendors)
              .where(ilike(vendors.companyName, `%${query}%`))
              .limit(10);
        }

        return NextResponse.json({
            query,
            results: {
                products: matchedProducts,
                bookings: matchedBookings,
                invoices: matchedInvoices,
                vendors: matchedVendors,
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
