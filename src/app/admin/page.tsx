export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { products, bookings, safetyCertificates, inventoryUnits } from "@/lib/db/schema";
import { inArray, eq, sql, and, gte, lte, or, desc } from "drizzle-orm";
import { 
    PackageOpen, 
    CalendarRange, 
    TrendingUp, 
    AlertCircle, 
    Store, 
    ShieldAlert, 
    Warehouse,
    ArrowRight
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_STATUS } from "@/lib/constants";
import DashboardKPIs from "@/components/admin/DashboardKPIs";
import PipelineKanban from "@/components/admin/PipelineKanban";
import ComplianceFeed from "@/components/admin/ComplianceFeed";

const calculateTrend = (current: number, previous: number): "up" | "down" | "neutral" => {
    const curr = Number(current) || 0;
    const prev = Number(previous) || 0;
    if (prev === 0) return curr > 0 ? "up" : "neutral";
    return curr > prev ? "up" : curr < prev ? "down" : "neutral";
};

const calculatePct = (current: number, previous: number): string => {
    const curr = Number(current) || 0;
    const prev = Number(previous) || 0;
    if (prev <= 0) {
        return curr > 0 ? "+100.0%" : "0.0%";
    }
    const change = ((curr - prev) / prev) * 100;
    if (!isFinite(change) || isNaN(change)) {
        return "0.0%";
    }
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
};

export default async function AdminDashboard() {
    try {
        const user = await getCurrentUser();
        const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any)?.vendorId;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // 1. Fetch KPI Data
        const [{ productCount }] = await db
            .select({ productCount: sql<number>`count(*)` })
            .from(products)
            .where(targetVendorId ? eq(products.vendorId, targetVendorId) : undefined);

        const activeStatuses = [BOOKING_STATUS.REQUEST, BOOKING_STATUS.QUOTE_SENT, BOOKING_STATUS.CHANGES_REQUESTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED];
        const [{ activeBookingCount }] = await db
            .select({ activeBookingCount: sql<number>`count(*)` })
            .from(bookings)
            .where(targetVendorId 
                ? and(inArray(bookings.status, activeStatuses), eq(bookings.vendorId, targetVendorId)) 
                : inArray(bookings.status, activeStatuses));

        // Comparison for previous month
        const [{ prevBookingCount }] = await db
            .select({ prevBookingCount: sql<number>`count(*)` })
            .from(bookings)
            .where(and(
                inArray(bookings.status, activeStatuses),
                gte(bookings.createdAt, startOfLastMonth),
                lte(bookings.createdAt, endOfLastMonth),
                targetVendorId ? eq(bookings.vendorId, targetVendorId) : sql`1=1`
            ));

        const [{ monthlyRevenue }] = await db
            .select({ monthlyRevenue: sql<number>`sum(${bookings.totalPrice})` })
            .from(bookings)
            .where(and(
                inArray(bookings.status, [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED] as string[]),
                gte(bookings.createdAt, startOfMonth),
                lte(bookings.createdAt, endOfMonth),
                targetVendorId ? eq(bookings.vendorId, targetVendorId) : sql`1=1`
            ));

        const [{ prevMonthlyRevenue }] = await db
            .select({ prevMonthlyRevenue: sql<number>`sum(${bookings.totalPrice})` })
            .from(bookings)
            .where(and(
                inArray(bookings.status, [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED] as string[]),
                gte(bookings.createdAt, startOfLastMonth),
                lte(bookings.createdAt, endOfLastMonth),
                targetVendorId ? eq(bookings.vendorId, targetVendorId) : sql`1=1`
            ));

        const [{ pendingActionCount }] = await db
            .select({ pendingActionCount: sql<number>`count(*)` })
            .from(bookings)
            .where(and(
                eq(bookings.status, BOOKING_STATUS.BOOKING_REQUESTED),
                targetVendorId ? eq(bookings.vendorId, targetVendorId) : sql`1=1`
            ));

        // 2. Offline Inventory Count
        const [{ offlineCount }] = await db
            .select({ offlineCount: sql<number>`count(*)` })
            .from(inventoryUnits)
            .innerJoin(products, eq(inventoryUnits.productId, products.id))
            .where(and(
                targetVendorId ? eq(products.vendorId, targetVendorId) : sql`1=1`,
                eq(inventoryUnits.availabilityStatus, 'in_maintenance')
            ));

        // 3. Expiring Certificates Scan
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringCerts = await db
            .select({
                id: safetyCertificates.id,
                certName: safetyCertificates.certName,
                expiryDate: safetyCertificates.expiryDate,
                productName: products.name,
                productId: products.id
            })
            .from(safetyCertificates)
            .innerJoin(products, eq(safetyCertificates.productId, products.id))
            .where(and(
                targetVendorId ? eq(products.vendorId, targetVendorId) : sql`1=1`,
                lte(safetyCertificates.expiryDate, thirtyDaysFromNow)
            ))
            .orderBy(safetyCertificates.expiryDate)
            .limit(10);

        // 4. Booking Snapshot for Pipeline
        const recentBookings = await db.query.bookings.findMany({
            where: targetVendorId ? eq(bookings.vendorId, targetVendorId) : undefined,
            orderBy: [desc(bookings.createdAt)],
            limit: 20
        });

        // Format KPI Stats
        const revChange = calculatePct(Number(monthlyRevenue || 0), Number(prevMonthlyRevenue || 0));
        const bookingChange = calculatePct(activeBookingCount, prevBookingCount);

        const kpiStats = [
            { label: "Fleet Items", value: productCount.toString(), icon: "PackageOpen", change: "Total Catalog Items", color: "gold", href: "/admin/products" },
            { 
                label: "Active Pipeline", 
                value: activeBookingCount.toString(), 
                icon: "CalendarRange", 
                change: `${bookingChange} vs last month`, 
                color: "blue", 
                trend: calculateTrend(activeBookingCount, prevBookingCount),
                href: "/admin/bookings"
            },
            { 
                label: "Monthly Revenue", 
                value: `${(monthlyRevenue || 0).toLocaleString()} QAR`, 
                icon: "TrendingUp", 
                change: `${revChange} vs last month`, 
                color: "emerald", 
                trend: calculateTrend(Number(monthlyRevenue || 0), Number(prevMonthlyRevenue || 0)),
                href: "/admin/financials"
            },
            { label: "Pending Tasks", value: pendingActionCount.toString(), icon: "AlertCircle", change: "Awaiting your action", color: "red", isAlert: pendingActionCount > 0, href: "/admin/bookings" },
            { label: "Expiring Certs", value: expiringCerts.length.toString(), icon: "ShieldAlert", change: "Next 30 days", color: "amber", isAlert: expiringCerts.length > 0, href: "/admin/certificates" },
            { label: "Offline Units", value: offlineCount.toString(), icon: "Warehouse", change: "Maintenance/Repair", color: "slate", isAlert: offlineCount > 0, href: "/admin/inventory" },
        ];

        // Format Compliance Alerts
        const complianceAlerts = [
            ...expiringCerts.map(c => ({
                id: c.id,
                type: "certificate" as const,
                title: "Safety Certificate Expiry",
                description: `${c.productName} - ${c.certName} expiring soon.`,
                priority: (new Date(c.expiryDate) <= now) ? "high" as const : "medium" as const,
                href: `/admin/products/${c.productId}`,
                date: c.expiryDate
            })),
            ...(offlineCount > 0 ? [{
                id: "offline-units",
                type: "inventory" as const,
                title: "Fleet Maintenance Required",
                description: `${offlineCount} units are currently offline or in maintenance.`,
                priority: "medium" as const,
                href: "/admin/inventory"
            }] : [])
        ];

        return (
            <div className="animate-fade-up">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-black text-[var(--color-warm-white)] tracking-tight">
                            Digital Operating System
                        </h1>
                        <p className="text-[var(--color-slate)] mt-2 font-medium flex items-center gap-2">
                            Welcome back, <span className="text-[var(--color-gold)]">{user?.name}</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--color-slate)]/30" />
                            System status: <span className="text-emerald-400">Optimal</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/admin/bookings" 
                            className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-bold text-sm hover:translate-y-[-2px] transition-all shadow-lg shadow-gold/10 flex items-center gap-2 group"
                        >
                            Quick Booking
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </header>

                <DashboardKPIs stats={kpiStats} />

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                    {/* Left Column: Pipeline & Actions */}
                    <div className="xl:col-span-3 space-y-12">
                        <section>
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                                    Booking Pipeline
                                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[var(--color-slate)] font-bold">Snapshot</span>
                                </h2>
                                <Link href="/admin/bookings" className="text-xs font-bold text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors">
                                    View Detailed Board →
                                </Link>
                            </div>
                            <PipelineKanban bookings={recentBookings} />
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: "Inventory Matrix", desc: "Track availability across the timeline", href: "/admin/inventory", color: "gold" },
                                { title: "Manage Fleet", desc: "Configuration & asset maintenance", href: "/admin/products", color: "blue" },
                                { title: "Communication", desc: "Real-time client collaboration", href: "/admin/chat", color: "emerald" }
                            ].map((action, i) => (
                                <Link 
                                    key={i}
                                    href={action.href}
                                    className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[var(--color-gold)]/30 hover:bg-white/[0.04] transition-all group"
                                >
                                    <h3 className="font-bold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors mb-1">{action.title}</h3>
                                    <p className="text-xs text-[var(--color-slate)]">{action.desc}</p>
                                </Link>
                            ))}
                        </section>
                    </div>

                    {/* Right Column: Operational Pulse */}
                    <aside className="xl:col-span-1">
                        <ComplianceFeed alerts={complianceAlerts} />
                    </aside>
                </div>
            </div>
        );
    } catch (error) {
        console.error("[ADMIN DASHBOARD] Server-side error:", error);
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
                <div className="glass rounded-3xl p-12 max-w-lg border-red-500/20 bg-red-500/5 shadow-2xl shadow-red-500/5">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-[var(--color-warm-white)] mb-4">Dashboard Engine Fault</h2>
                    <p className="text-[var(--color-slate)] mb-8">
                        The Operating System encountered a critical error during data aggregation.
                    </p>
                    <Link 
                         href="/admin"
                         className="px-8 py-3 rounded-xl bg-white/10 text-[var(--color-warm-white)] font-bold hover:bg-white/20 transition-all border border-white/10 inline-block"
                    >
                        Try Refreshing
                    </Link>
                </div>
            </div>
        );
    }
}
