import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, invoices, clientPayments, vendorLedgers, inventoryUnits, safetyCertificates, vendorDocuments, vendors, notificationOutbox, cronJobRuns, auditLogs } from "@/lib/db/schema";
import { eq, and, sql, lt, gt, gte, lte, or } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!hasPermission(user.role, "global_search")) {
            return NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 });
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const warningDate30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 1. Bookings & Projects
        const [activeBookings] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(or(eq(bookings.status, "approved"), eq(bookings.status, "booked")));
        const [upcomingProjects] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(gt(bookings.startDate, now));
        const [quotesAwaitingApproval] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(or(eq(bookings.status, "request"), eq(bookings.status, "quote_sent")));

        // 2. Inventory & Warehouse
        const [dispatchesToday] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(and(gte(bookings.startDate, startOfToday), lte(bookings.startDate, endOfToday)));
        const [returnsDueToday] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(and(gte(bookings.endDate, startOfToday), lte(bookings.endDate, endOfToday)));
        const [overdueReturns] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(and(lt(bookings.endDate, startOfToday), or(eq(bookings.status, "approved"), eq(bookings.status, "booked"))));
        const [maintenanceDamaged] = await db.select({ count: sql<number>`count(*)::int` }).from(inventoryUnits).where(or(eq(inventoryUnits.availabilityStatus, "in_maintenance"), eq(inventoryUnits.conditionStatus, "damaged")));
        const [assetsAwaitingInspection] = await db.select({ count: sql<number>`count(*)::int` }).from(inventoryUnits).where(eq(inventoryUnits.availabilityStatus, "inspection_pending"));

        // 3. Vendors & Compliance
        const [vendorApplications] = await db.select({ count: sql<number>`count(*)::int` }).from(vendors).where(eq(vendors.lifecycleStatus, "application_submitted"));
        const [expiringVendorDocs] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorDocuments).where(and(gt(vendorDocuments.expiryDate, now), lt(vendorDocuments.expiryDate, warningDate30d)));
        const [expiringSafetyCerts] = await db.select({ count: sql<number>`count(*)::int` }).from(safetyCertificates).where(and(gt(safetyCertificates.expiryDate, now), lt(safetyCertificates.expiryDate, warningDate30d)));

        // 4. Finance & Receivables
        const [outstandingInvoices] = await db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(or(eq(invoices.status, "issued"), eq(invoices.status, "partially_paid")));
        const [overdueReceivables] = await db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(and(lt(invoices.dueDate, now), gt(invoices.amountDue, 0)));
        const [unverifiedPayments] = await db.select({ count: sql<number>`count(*)::int` }).from(clientPayments).where(eq(clientPayments.status, "pending_verification"));
        const [settlementsAwaitingApproval] = await db.select({ count: sql<number>`count(*)::int` }).from(vendorLedgers).where(eq(vendorLedgers.status, "pending_payout"));

        // 5. Governance & Operations
        const [openComplianceAlerts] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(and(eq(auditLogs.severity, "critical"), gte(auditLogs.createdAt, startOfToday)));
        const [failedScheduledJobs] = await db.select({ count: sql<number>`count(*)::int` }).from(cronJobRuns).where(eq(cronJobRuns.status, "failed"));
        const [notificationFailures] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationOutbox).where(eq(notificationOutbox.status, "failed"));

        return NextResponse.json({
            metrics: {
                activeBookings: { count: activeBookings?.count || 0, link: "/admin/bookings?status=confirmed" },
                upcomingProjects: { count: upcomingProjects?.count || 0, link: "/admin/bookings?filter=upcoming" },
                quotesAwaitingApproval: { count: quotesAwaitingApproval?.count || 0, link: "/admin/quotes?status=pending" },
                inventoryConflicts: { count: 0, link: "/admin/inventory?status=conflict" },
                fulfillmentShortages: { count: 0, link: "/admin/fulfillment?shortage=true" },
                dispatchesToday: { count: dispatchesToday?.count || 0, link: "/admin/fleet?filter=today_dispatch" },
                returnsDue: { count: returnsDueToday?.count || 0, link: "/admin/fleet?filter=today_return" },
                overdueReturns: { count: overdueReturns?.count || 0, link: "/admin/fleet?filter=overdue" },
                assetsAwaitingInspection: { count: assetsAwaitingInspection?.count || 0, link: "/admin/fleet/inspection" },
                maintenanceDamaged: { count: maintenanceDamaged?.count || 0, link: "/admin/fleet/maintenance" },
                vendorApplications: { count: vendorApplications?.count || 0, link: "/admin/vendor/requests" },
                expiringVendorDocs: { count: expiringVendorDocs?.count || 0, link: "/admin/compliance?tab=vendor" },
                expiringSafetyCerts: { count: expiringSafetyCerts?.count || 0, link: "/admin/certificates?filter=expiring" },
                outstandingInvoices: { count: outstandingInvoices?.count || 0, link: "/admin/financials?tab=invoices" },
                overdueReceivables: { count: overdueReceivables?.count || 0, link: "/admin/financials/aging" },
                unverifiedPayments: { count: unverifiedPayments?.count || 0, link: "/admin/financials?tab=payments" },
                settlementsAwaitingApproval: { count: settlementsAwaitingApproval?.count || 0, link: "/admin/vendor/payouts" },
                openComplianceAlerts: { count: openComplianceAlerts?.count || 0, link: "/admin/logs?severity=critical" },
                failedScheduledJobs: { count: failedScheduledJobs?.count || 0, link: "/admin/system/jobs" },
                notificationFailures: { count: notificationFailures?.count || 0, link: "/admin/notifications/outbox" },
            },
            updatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
