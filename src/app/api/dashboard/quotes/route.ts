import { db } from "@/lib/db";
import { bookings, products, vendors } from "@/lib/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let whereCondition: any = undefined;

        if (user.role === USER_ROLES.VENDOR) {
            const vendorId = (user as any).vendorId;
            if (!vendorId) {
                return NextResponse.json({ error: "Vendor profile not attached." }, { status: 403 });
            }
            // Multi-tenant isolation: Vendor only sees bookings with their vendorId or their owned products
            whereCondition = eq(bookings.vendorId, vendorId);
        } else if (user.role === USER_ROLES.CLIENT) {
            // Customer only sees bookings they created
            whereCondition = eq(bookings.userId, user.id);
        }
        // Super Admin & Admin see all bookings (whereCondition remains undefined)

        // Fetch bookings
        const rawBookings = await db.query.bookings.findMany({
            where: whereCondition,
            with: {
                product: {
                    columns: {
                        id: true,
                        name: true,
                        slug: true,
                        thumbnailUrl: true,
                        pricePerDay: true,
                        showPrice: true,
                        vendorId: true,
                    },
                    with: {
                        vendor: {
                            columns: {
                                id: true,
                                companyName: true,
                            },
                        },
                    },
                },
            },
            orderBy: [desc(bookings.createdAt)],
        });

        // Group by projectId (or fallback to id)
        const groupedProjects = new Map<string, any>();

        for (const item of rawBookings) {
            const projectKey = item.projectId || item.id;
            if (!groupedProjects.has(projectKey)) {
                groupedProjects.set(projectKey, {
                    id: projectKey,
                    projectId: projectKey,
                    projectName: item.projectName || "Standard Rental Quote",
                    status: item.status,
                    paymentStatus: item.paymentStatus,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    createdAt: item.createdAt,
                    customerName: item.customerName,
                    customerEmail: item.customerEmail,
                    customerPhone: item.customerPhone,
                    totalPrice: item.totalPrice,
                    discount: item.discount,
                    logisticsCost: item.logisticsCost,
                    laborCost: item.laborCost,
                    itemsCount: 0,
                    items: [],
                });
            }

            const project = groupedProjects.get(projectKey);
            project.itemsCount += item.units;
            project.items.push(item);
        }

        const result = Array.from(groupedProjects.values());
        return NextResponse.json(result);
    } catch (err: any) {
        console.error("[DASHBOARD_QUOTES_GET] Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
