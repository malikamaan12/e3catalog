import { getCurrentUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { bookings, products, vendors, commissionSettlements } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { USER_ROLES, BOOKING_STATUS } from "@/lib/constants";

export default async function DashboardPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const minimalUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    let projects: any[] = [];
    let stats: any = {
        total: 0,
        awaitingQuote: 0,
        reviewQuote: 0,
        confirmed: 0,
        active: 0,
    };

    if (user.role === USER_ROLES.WAREHOUSE_MANAGER) {
        redirect("/dashboard/warehouse/overview");
    }

    if (user.role === USER_ROLES.VENDOR || user.role === "sales_manager") {
        const vendorData = await db
            .select()
            .from(vendors)
            .where(eq(vendors.userId, user.vendorId || user.id)) // If staff, use vendorId, else use their own id
            .limit(1);
        
        const vendor = vendorData[0];
        
        if (vendor) {
            // Fetch bookings for this vendor's products
            const vendorBookings = await db
                .select({ booking: bookings, product: products })
                .from(bookings)
                .innerJoin(products, eq(bookings.productId, products.id))
                .where(eq(products.vendorId, vendor.id))
                .orderBy(desc(bookings.createdAt));

            const vendorProjectsMap = vendorBookings.reduce((acc, { booking, product }) => {
                const key = booking.projectId ? `${booking.projectId}` : booking.id;
                if (!acc[key]) {
                    acc[key] = {
                        id: key,
                        projectName: booking.projectName || "Booking Request",
                        status: booking.status,
                        itemCount: 0,
                        totalUnits: 0,
                        startDate: booking.startDate,
                        endDate: booking.endDate,
                        createdAt: booking.createdAt,
                        products: [] as string[],
                        vendorName: vendor.companyName,
                    };
                }
                acc[key].totalUnits += booking.units;
                acc[key].itemCount += 1;
                if (!acc[key].products.includes(product.name)) {
                    acc[key].products.push(product.name);
                }
                return acc;
            }, {} as Record<string, any>);

            projects = Object.values(vendorProjectsMap);

            // Vendor-specific stats (Financials)
            const settlements = await db
                .select()
                .from(commissionSettlements)
                .where(eq(commissionSettlements.vendorId, vendor.id));

            stats = {
                total: projects.length,
                awaitingQuote: projects.filter((p: any) => p.status === BOOKING_STATUS.REQUEST).length,
                reviewQuote: projects.filter((p: any) => p.status === BOOKING_STATUS.QUOTE_SENT).length,
                confirmed: projects.filter((p: any) => [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED].includes(p.status)).length,
                // Marketplace metrics
                grossEarnings: projects.filter((p: any) => ["approved", "booked"].includes(p.status)).reduce((sum: number, p: any) => sum + (p.totalUnits * 100), 0), // Placeholder logic, actual price logic in finance.ts
                amountOwed: settlements.filter(s => s.status !== "approved_paid").reduce((sum, s) => sum + s.amountOwed, 0),
                score: vendor.scoreRating || 5.0,
            };
        }
    } else {
        // Fetch all bookings for this user (Client View)
        const userBookings = await db
            .select({ booking: bookings, product: products, vendor: vendors })
            .from(bookings)
            .innerJoin(products, eq(bookings.productId, products.id))
            .leftJoin(vendors, eq(products.vendorId, vendors.id))
            .where(eq(bookings.userId, user.id))
            .orderBy(desc(bookings.createdAt));

        const projectsMap = userBookings.reduce((acc, { booking, product, vendor }) => {
            const vendorId = booking.vendorId || "platform";
            const key = booking.projectId ? `${booking.projectId}::${vendorId}` : booking.id;

            if (!acc[key]) {
                acc[key] = {
                    id: key,
                    projectId: booking.projectId,
                    vendorId: vendorId,
                    vendorName: vendor?.companyName || "E3 Rentals",
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

        projects = Object.values(projectsMap);

        stats = {
            total: projects.length,
            awaitingQuote: projects.filter((p: any) => [BOOKING_STATUS.REQUEST, BOOKING_STATUS.PENDING_QUOTE].includes(p.status)).length,
            reviewQuote: projects.filter((p: any) => p.status === BOOKING_STATUS.QUOTE_SENT).length,
            confirmed: projects.filter((p: any) => [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED, BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.BOOKING_REQUESTED].includes(p.status)).length,
            active: projects.filter((p: any) => ![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(p.status)).length,
        };
    }


    return <DashboardClient user={minimalUser} projects={projects as any[]} stats={stats} />;
}
