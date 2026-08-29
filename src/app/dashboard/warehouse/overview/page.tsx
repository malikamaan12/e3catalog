import { db } from "@/lib/db";
import { bookings, inventoryUnits, safetyCertificates, stagingInventory } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { 
    Truck, RotateCcw, Wrench, AlertTriangle,
    Scan, LayoutGrid, Printer, ShieldAlert, BoxesIcon
} from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import WarehouseActivityFeed from "@/components/warehouse/ActivityFeed";

export default async function WarehouseOverviewPage() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const thirtyDaysFromNow = addDays(today, 30);

    // 1. Pending Dispatches Today
    const dispatches = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
            inArray(bookings.status, ["approved", "booked"]),
            gte(bookings.startDate, startOfToday),
            lte(bookings.startDate, endOfToday)
        ));

    // 2. Pending Returns Today
    const returns = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
            gte(bookings.endDate, startOfToday),
            lte(bookings.endDate, endOfToday)
        ));

    // 3. Units in Maintenance
    const maintenance = await db
        .select({ id: inventoryUnits.id })
        .from(inventoryUnits)
        .where(inArray(inventoryUnits.availabilityStatus, ["in_maintenance", "maintenance"]));

    // 4. Units Awaiting Inspection
    const awaitingInspection = await db
        .select({ id: inventoryUnits.id })
        .from(inventoryUnits)
        .where(eq(inventoryUnits.availabilityStatus, "awaiting_inspection"));

    // 5. Total Units On Rent / Deployed
    const onRent = await db
        .select({ id: inventoryUnits.id })
        .from(inventoryUnits)
        .where(inArray(inventoryUnits.availabilityStatus, ["on_rent", "dispatched"]));

    // 6. Expiring Certificates (next 30 days)
    const certificates = await db
        .select({ id: safetyCertificates.id })
        .from(safetyCertificates)
        .where(and(
            gte(safetyCertificates.expiryDate, today),
            lte(safetyCertificates.expiryDate, thirtyDaysFromNow)
        ));

    const stats = [
        { label: "Dispatches Today",      value: dispatches.length,         icon: Truck,          color: "text-amber-500",   bg: "bg-amber-500/10",   href: "/dashboard/warehouse/dispatch" },
        { label: "Returns Today",         value: returns.length,            icon: RotateCcw,       color: "text-sky-500",     bg: "bg-sky-500/10",     href: "/dashboard/warehouse/dispatch" },
        { label: "On Rent / Deployed",    value: onRent.length,             icon: BoxesIcon,       color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/dashboard/warehouse/fleet" },
        { label: "Awaiting Inspection",   value: awaitingInspection.length, icon: ShieldAlert,     color: "text-orange-400",  bg: "bg-orange-500/10",  href: "/dashboard/warehouse/inspections" },
        { label: "In Maintenance",        value: maintenance.length,        icon: Wrench,          color: "text-red-500",     bg: "bg-red-500/10",     href: "/dashboard/warehouse/fleet" },
        { label: "Expiring Certs",        value: certificates.length,       icon: AlertTriangle,   color: "text-amber-400",   bg: "bg-amber-400/10",   href: "/dashboard/warehouse/fleet" },
    ];

    const QUICK_ACTIONS = [
        {
            href: "/dashboard/warehouse/fulfillment",
            icon: Scan,
            label: "Scan to Fulfill",
            sub: "Dispatch · Return",
            accent: "from-amber-500/20 to-amber-600/5 border-amber-500/25 hover:border-amber-500/60",
            iconColor: "text-amber-500",
        },
        {
            href: "/dashboard/warehouse/fleet",
            icon: LayoutGrid,
            label: "Fleet Manager",
            sub: "Browse · Update",
            accent: "from-sky-500/20 to-sky-600/5 border-sky-500/25 hover:border-sky-500/60",
            iconColor: "text-sky-500",
        },
        {
            href: "/dashboard/warehouse/onboarding",
            icon: BoxesIcon,
            label: "Bulk Onboarding",
            sub: "Count · Convert",
            accent: "from-violet-500/20 to-violet-600/5 border-violet-500/25 hover:border-violet-500/60",
            iconColor: "text-violet-400",
        },
        {
            href: "/dashboard/warehouse/inspections",
            icon: ShieldAlert,
            label: "Log Damage",
            sub: "Inspect · Report",
            accent: "from-red-500/20 to-red-600/5 border-red-500/25 hover:border-red-500/60",
            iconColor: "text-red-400",
        },
        {
            href: "/dashboard/warehouse/labels",
            icon: Printer,
            label: "Print Labels",
            sub: "QR · Batch",
            accent: "from-slate-500/20 to-slate-600/5 border-slate-500/25 hover:border-slate-400/40",
            iconColor: "text-slate-400",
        },
    ];

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-6xl mx-auto w-full">
            {/* Header */}
            <header className="flex flex-col gap-1 pt-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black tracking-tight text-[var(--color-warm-white)] uppercase italic">
                        Warehouse <span className="text-[var(--color-gold)]">Hub</span>
                    </h1>
                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 text-[var(--color-gold)] uppercase tracking-widest animate-pulse">Live</span>
                </div>
                <p className="text-[var(--color-slate)] text-sm font-medium">{format(today, "EEEE, MMMM do yyyy")}</p>
            </header>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.map((stat, idx) => (
                    <Link
                        key={idx}
                        href={stat.href}
                        className="glass rounded-xl p-5 border border-white/10 flex flex-col gap-4 relative overflow-hidden transition-all hover:translate-y-[-2px] hover:border-[var(--color-gold)]/30 active:scale-[0.98] group"
                    >
                        <div className={`p-2.5 rounded-lg ${stat.bg} w-fit transition-transform group-hover:scale-110`}>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-[family-name:var(--font-heading)] font-bold text-[var(--color-warm-white)] leading-none">{stat.value}</span>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-slate)] mt-3 leading-tight">{stat.label}</span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {QUICK_ACTIONS.map((action) => (
                    <Link
                        key={action.href}
                        href={action.href}
                        className="flex flex-col items-center justify-center gap-5 py-10 px-4 rounded-xl glass border border-white/10 transition-all hover:translate-y-[-4px] hover:border-[var(--color-gold)]/50 active:scale-[0.97] group shadow-2xl relative overflow-hidden"
                    >
                        {/* Subtle Background Glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.accent} opacity-20 group-hover:opacity-40 transition-opacity`} />
                        
                        <action.icon className={`h-12 w-12 ${action.iconColor} transition-transform group-hover:scale-110 relative z-10`} />
                        <div className="text-center relative z-10">
                            <p className="text-sm font-[family-name:var(--font-heading)] font-bold uppercase tracking-widest text-[var(--color-warm-white)]">{action.label}</p>
                            <p className="text-[10px] font-bold text-[var(--color-slate)] mt-1 uppercase tracking-widest opacity-60">{action.sub}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Live Activity Feed */}
            <WarehouseActivityFeed />
        </div>
    );
}
