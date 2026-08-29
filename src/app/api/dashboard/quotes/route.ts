import { db } from "@/lib/db";
import { bookings, products, vendors } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all bookings belonging to this user
        const userBookings = await db.query.bookings.findMany({
            where: eq(bookings.userId, user.id),
            with: {
                product: {
                    columns: {
                        id: true,
                        name: true,
                        slug: true,
                        thumbnailUrl: true,
                        pricePerDay: true,
                        showPrice: true,
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

        for (const item of userBookings) {
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
