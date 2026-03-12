import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getAvailabilityTimeline } from "@/lib/availability";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq } from "drizzle-orm";

export async function GET(req: any) {
    try {
        const { searchParams } = new URL(req.url);
        const fromDate = searchParams.get("from");
        const toDate = searchParams.get("to");

        let lookahead = 14;
        let actualStart = fromDate;

        const parseDate = (d: any) => {
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        if (fromDate && toDate) {
            const start = parseDate(fromDate);
            const end = parseDate(toDate);
            
            if (start && end) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                lookahead = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                // Cap at 45 days for performance
                if (lookahead > 45) lookahead = 45;

                // Ensure we start from the earlier date if user swapped them
                if (start > end) actualStart = toDate;
            }
        }

        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        // Fetch all active products alongside their current unit count
        const allProducts = await db.query.products.findMany({
            where: targetVendorId ? eq(products.vendorId, targetVendorId) : undefined,
            columns: {
                id: true,
                name: true,
                unit: true,
                categoryId: true
            },
            with: {
                category: {
                    columns: { name: true }
                },
                inventoryUnits: {
                    columns: { id: true }
                }
            }
        });

        // Batch calculate timelines
        const matrixData = [];
        for (const product of allProducts) {
            const timeline = await getAvailabilityTimeline(product.id, lookahead, actualStart || undefined);
            matrixData.push({
                product: {
                    id: product.id,
                    name: product.name,
                    totalUnits: product.inventoryUnits.length,
                    unit: product.unit,
                    category: product.category?.name || "Uncategorized"
                },
                timeline
            });
        }

        // Sort alphabetically by product name
        matrixData.sort((a, b) => a.product.name.localeCompare(b.product.name));

        return NextResponse.json(matrixData);
    } catch (matrixError: any) {
        console.error("MATRIX API ERROR [CRITICAL]:", matrixError);
        if (matrixError.stack) console.error(matrixError.stack);
        return NextResponse.json({ error: matrixError.message || "Failed to generate inventory matrix" }, { status: 500 });
    }
}
