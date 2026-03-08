import Link from "next/link";
import { db } from "@/lib/db";
import { products, bookings } from "@/lib/db/schema";
import { inArray, eq, sql, and, gte, lte } from "drizzle-orm";
import { PackageOpen, CalendarRange, TrendingUp, AlertCircle, Store } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminDashboard() {
    const user = await getCurrentUser();
    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any)?.vendorId;
    // Determine current month range for revenue calculation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Total Products
    const [{ productCount }] = await db
        .select({ productCount: sql<number>`count(*)` })
        .from(products)
        .where(targetVendorId ? eq(products.vendorId, targetVendorId) : undefined);

    // 2. Active Bookings (In Pipeline)
    const activeStatuses = [
        "request",
        "quote_sent",
        "changes_requested",
        "quote_accepted",
        "booking_requested"
    ];

    const activeCondition = targetVendorId
        ? and(inArray(bookings.status, activeStatuses), eq(bookings.vendorId, targetVendorId))
        : inArray(bookings.status, activeStatuses);

    const [{ activeBookingCount }] = await db
        .select({ activeBookingCount: sql<number>`count(*)` })
        .from(bookings)
        .where(activeCondition);

    // 3. Monthly Revenue (Approved/Booked this month)
    const revenueCondition = targetVendorId
        ? and(
            inArray(bookings.status, ["approved", "booked"]),
            gte(bookings.createdAt, startOfMonth),
            lte(bookings.createdAt, endOfMonth),
            eq(bookings.vendorId, targetVendorId)
        )
        : and(
            inArray(bookings.status, ["approved", "booked"]),
            gte(bookings.createdAt, startOfMonth),
            lte(bookings.createdAt, endOfMonth)
        );

    const [{ monthlyRevenue }] = await db
        .select({ monthlyRevenue: sql<number>`sum(${bookings.totalPrice})` })
        .from(bookings)
        .where(revenueCondition);

    // 4. Pending Actions (Awaiting Final Approval)
    const pendingCondition = targetVendorId
        ? and(eq(bookings.status, "booking_requested"), eq(bookings.vendorId, targetVendorId))
        : eq(bookings.status, "booking_requested");

    const [{ pendingActionCount }] = await db
        .select({ pendingActionCount: sql<number>`count(*)` })
        .from(bookings)
        .where(pendingCondition);

    const revenueAmount = monthlyRevenue || 0;

    return (
        <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] mb-2">
                Admin Dashboard
            </h1>
            <p className="text-[var(--color-slate)] mb-10">Manage your inventory, bookings, and compliance.</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {[
                    { label: "Total Products", value: productCount.toString(), icon: PackageOpen, iconStyle: "text-[var(--color-slate)]", change: "Available in Catalog" },
                    { label: "Active Quotes", value: activeBookingCount.toString(), icon: CalendarRange, iconStyle: "text-[var(--color-slate)]", change: "In Negotiation Pipeline" },
                    { label: "Monthly Revenue", value: `${revenueAmount.toLocaleString()} QAR`, icon: TrendingUp, iconStyle: "text-[var(--color-success)]", change: "Approved This Month" },
                    { label: "Pending Approvals", value: pendingActionCount.toString(), icon: AlertCircle, iconStyle: "text-[var(--color-danger)]", change: "Awaiting Action" },
                ].map((stat, i) => (
                    <div key={i} className={`glass rounded-xl p-5 border group hover:border-[var(--color-gold)]/30 transition-colors ${stat.label === "Pending Approvals" && pendingActionCount > 0 ? "border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5" : "border-white/10"}`}>
                        <div className="flex items-center justify-between mb-3">
                            <stat.icon className={`w-6 h-6 ${stat.label === "Pending Approvals" && pendingActionCount > 0 ? "text-[var(--color-gold)] animate-pulse" : stat.iconStyle} group-hover:scale-110 transition-transform`} />
                            <span className="text-2xl font-bold gradient-text-gold font-[family-name:var(--font-heading)]">{stat.value}</span>
                        </div>
                        <p className="text-sm font-medium text-[var(--color-warm-white)]">{stat.label}</p>
                        <p className="text-xs text-[var(--color-slate)] mt-1">{stat.change}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-warm-white)] mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/admin/products" className="glass rounded-xl p-6 hover:border-[var(--color-gold)] hover:border-opacity-30 transition-all group block">
                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors mb-2">
                        Manage Products
                    </h3>
                    <p className="text-sm text-[var(--color-slate)]">Add, edit, or remove equipment from your fleet.</p>
                </Link>
                <Link href="/admin/bookings" className="glass rounded-xl p-6 hover:border-[var(--color-gold)] hover:border-opacity-30 transition-all group block">
                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors mb-2">
                        Booking Pipeline
                    </h3>
                    <p className="text-sm text-[var(--color-slate)]">Review requests, send quotes, and approve bookings.</p>
                </Link>
                <Link href="/admin/inventory" className="glass rounded-xl p-6 hover:border-[var(--color-gold)] hover:border-opacity-30 transition-all group block">
                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors mb-2">
                        Inventory Matrix
                    </h3>
                    <p className="text-sm text-[var(--color-slate)]">Track stock availability across your catalog.</p>
                </Link>
                {isSuperAdmin && (
                    <Link href="/admin/super/vendors" className="glass rounded-xl p-6 hover:border-[var(--color-gold)] hover:border-opacity-30 transition-all group block">
                        <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors mb-2 flex items-center gap-2">
                            <Store className="w-5 h-5 text-[var(--color-gold)]" />
                            Review Vendors
                        </h3>
                        <p className="text-sm text-[var(--color-slate)]">Approve KYC applications and manage seller logic.</p>
                    </Link>
                )}
            </div>
        </div>
    );
}
