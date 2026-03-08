import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const minimalUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    // Fetch all bookings for this user
    const userBookings = await db
        .select({ booking: bookings, product: products })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .where(eq(bookings.userId, user.id))
        .orderBy(desc(bookings.createdAt));

    // Group into projects
    const projectsMap = userBookings.reduce((acc, { booking, product }) => {
        const key = booking.projectId || booking.id;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                projectName: booking.projectName || "Quote Request",
                status: booking.status,
                itemCount: 0,
                totalUnits: 0,
                startDate: booking.startDate,
                endDate: booking.endDate,
                createdAt: booking.createdAt,
                products: [] as string[],
            };
        }
        acc[key].totalUnits += booking.units;
        acc[key].itemCount += 1;
        if (!acc[key].products.includes(product.name)) {
            acc[key].products.push(product.name);
        }
        return acc;
    }, {} as Record<string, any>);

    const projects = Object.values(projectsMap);

    // Stats
    const stats = {
        total: projects.length,
        awaitingQuote: projects.filter((p: any) => p.status === "request").length,
        reviewQuote: projects.filter((p: any) => p.status === "quote_sent").length,
        confirmed: projects.filter((p: any) => ["approved", "booked"].includes(p.status)).length,
        active: projects.filter((p: any) => !["cancelled", "completed"].includes(p.status)).length,
    };

    return <DashboardClient user={minimalUser} projects={projects as any[]} stats={stats} />;
}
