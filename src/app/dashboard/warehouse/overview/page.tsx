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

    // 3. Units in Maintenance — correct status value
    const maintenance = await db
        .select({ id: inventoryUnits.id })
        .from(inventoryUnits)
        .where(inArray(inventoryUnits.availabilityStatus, ["in_maintenance", "maintenance"]));

    // 4. Expiring Certificates (next 30 days)
    const certificates = await db
        .select({ id: safetyCertificates.id })
        .from(safetyCertificates)
        .where(and(
            gte(safetyCertificates.expiryDate, today),
            lte(safetyCertificates.expiryDate, thirtyDaysFromNow)
        ));

    // 5. Staging items still being counted
    const stagingItems = await db
        .select({ id: stagingInventory.id })
        .from(stagingInventory)
        .where(eq(stagingInventory.migrationStatus, "counting"));

    const stats = [
        { label: "Dispatches Today",  value: dispatches.length,   icon: Truck,          color: "text-amber-500",   bg: "bg-amber-500/10",   href: "/dashboard/warehouse/dispatch" },
        { label: "Returns Today",     value: returns.length,      icon: RotateCcw,       color: "text-sky-500",     bg: "bg-sky-500/10",     href: "/dashboard/warehouse/dispatch" },
        { label: "In Maintenance",    value: maintenance.length,  icon: Wrench,          color: "text-red-500",     bg: "bg-red-500/10",     href: "/dashboard/warehouse/fleet" },
        { label: "Staging Items",     value: stagingItems.length, icon: BoxesIcon,       color: "text-violet-400",  bg: "bg-violet-500/10",  href: "/dashboard/warehouse/onboarding" },
        { label: "Expiring Certs",    value: certificates.length, icon: AlertTriangle,   color: "text-amber-400",   bg: "bg-amber-400/10",   href: "/dashboard/warehouse/fleet" },
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
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
            {/* Header */}
            <header className="flex flex-col gap-1 pt-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-100 italic uppercase">
                        Warehouse <span className="text-amber-500">Hub</span>
                    </h1>
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-widest animate-pulse">Live</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">{format(today, "EEEE, MMMM do yyyy")}</p>
            </header>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {stats.map((stat, idx) => (
                    <Link
                        key={idx}
                        href={stat.href}
                        className="glass rounded-2xl p-5 border border-white/5 flex flex-col gap-4 relative overflow-hidden transition-all hover:scale-[1.02] hover:border-white/10 active:scale-[0.98]"
                    >
                        <div className={`p-2.5 rounded-xl ${stat.bg} w-fit`}>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-slate-100 leading-none">{stat.value}</span>
                            <span className="text-[9px] uppercase tracking-widest font-black text-slate-600 mt-2 leading-tight">{stat.label}</span>
                        </div>
                        {stat.value > 0 && <div className={`absolute top-0 right-0 h-full w-0.5 ${stat.bg.replace("/10", "/40")}`} />}
                    </Link>
                ))}
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {QUICK_ACTIONS.map((action) => (
                    <Link
                        key={action.href}
                        href={action.href}
                        className={`flex flex-col items-center justify-center gap-4 py-8 px-4 rounded-3xl bg-gradient-to-b ${action.accent} border-2 transition-all hover:scale-[1.03] active:scale-[0.97] group shadow-lg`}
                    >
                        <action.icon className={`h-10 w-10 ${action.iconColor} transition-transform group-hover:scale-110`} />
                        <div className="text-center">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-100">{action.label}</p>
                            <p className="text-[9px] font-bold text-slate-600 mt-0.5 uppercase tracking-widest">{action.sub}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Live Activity Feed */}
            <WarehouseActivityFeed />
        </div>
    );
}
