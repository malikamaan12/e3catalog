export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { QuotesClient } from "./QuotesClient";

export default async function MyQuotesPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const rows = await db
        .select({ booking: bookings, product: products })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .where(eq(bookings.userId, user.id))
        .orderBy(desc(bookings.createdAt));

    // Group by project
    const projectsMap = rows.reduce((acc, { booking, product }) => {
        const key = booking.projectId || booking.id;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                projectName: booking.projectName || "Quote Request",
                status: booking.status,
                createdAt: booking.createdAt,
                startDate: booking.startDate,
                endDate: booking.endDate,
                totalUnits: 0,
                itemCount: 0,
                products: [],
            };
        }
        acc[key].totalUnits += booking.units;
        acc[key].itemCount += 1;
        if (!acc[key].products.includes(product.name)) acc[key].products.push(product.name);
        return acc;
    }, {} as Record<string, any>);

    const projects = Object.values(projectsMap) as any[];

    return <QuotesClient initialProjects={projects} />;
}
