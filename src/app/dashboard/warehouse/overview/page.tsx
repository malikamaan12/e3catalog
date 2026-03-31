import { db } from "@/lib/db";
import { bookings, inventoryUnits, safetyCertificates } from "@/lib/db/schema";
import { eq, and, or, gte, lte, sql, inArray } from "drizzle-orm";
import { 
    Truck, 
    RotateCcw, 
    Wrench, 
    AlertTriangle, 
    Scan, 
    LayoutGrid, 
    Printer 
} from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

export default async function WarehouseOverviewPage() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const thirtyDaysFromNow = addDays(today, 30);

    // 1. Pending Dispatches Today (Bump-In required)
    const dispatches = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
            and(
                inArray(bookings.status, ["approved", "booked"]),
                gte(bookings.startDate, startOfToday),
                lte(bookings.startDate, endOfToday)
            )
        );

    // 2. Pending Returns Today (Bump-Out required)
    const returns = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
            and(
                gte(bookings.endDate, startOfToday),
                lte(bookings.endDate, endOfToday)
            )
        );

    // 3. Units in Maintenance
    const maintenance = await db
        .select({ id: inventoryUnits.id })
        .from(inventoryUnits)
        .where(eq(inventoryUnits.availabilityStatus, "maintenance"));

    // 4. Expiring Certificates (next 30 days)
    const certificates = await db
        .select({ id: safetyCertificates.id })
        .from(safetyCertificates)
        .where(
            and(
                gte(safetyCertificates.expiryDate, today),
                lte(safetyCertificates.expiryDate, thirtyDaysFromNow)
            )
        );

    const stats = [
        { label: "Pending Dispatches", value: dispatches.length, icon: Truck, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Pending Returns", value: returns.length, icon: RotateCcw, color: "text-sky-500", bg: "bg-sky-500/10" },
        { label: "In Maintenance", value: maintenance.length, icon: Wrench, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "Expiring Certs", value: certificates.length, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
    ];

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-100 italic uppercase">
                    Warehouse Hub <span className="text-amber-500 font-black">Control Center</span>
                </h1>
                <p className="text-slate-400 font-medium">Logistics & Asset Management Operational Zone</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <div key={idx} className="glass rounded-2xl p-6 border border-white/5 flex flex-col gap-4 relative overflow-hidden transition-all hover:scale-[1.02]">
                        <div className={`p-3 rounded-xl ${stat.bg} w-fit`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-slate-100">{stat.value}</span>
                            <span className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-1">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hub Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link 
                    href="/dashboard/warehouse/fulfillment" 
                    className="flex flex-col items-center justify-center gap-6 p-10 rounded-[3rem] bg-amber-500/10 border-2 border-amber-500/20 text-amber-500 transition-all hover:bg-amber-500 hover:text-navy hover:scale-[1.03] group shadow-2xl shadow-amber-500/5 active:scale-95"
                >
                    <div className="bg-amber-500/20 p-6 rounded-full group-hover:bg-amber-900/20">
                        <Scan className="h-16 w-16" />
                    </div>
                    <span className="text-xl font-black uppercase tracking-[0.2em] italic">Scan to Fulfill</span>
                </Link>

                <Link 
                    href="/admin/inventory" 
                    className="flex flex-col items-center justify-center gap-6 p-10 rounded-[3rem] bg-slate-800/20 border-2 border-white/10 text-slate-100 transition-all hover:bg-white/5 hover:scale-[1.03] group shadow-2xl active:scale-95"
                >
                    <div className="bg-white/5 p-6 rounded-full group-hover:bg-white/10">
                        <LayoutGrid className="h-16 w-16 text-sky-500" />
                    </div>
                    <span className="text-xl font-black uppercase tracking-[0.2em] italic text-center">Bulk Onboarding</span>
                </Link>

                <Link 
                    href="/dashboard/warehouse/labels" 
                    className="flex flex-col items-center justify-center gap-6 p-10 rounded-[3rem] bg-slate-800/20 border-2 border-white/10 text-slate-100 transition-all hover:bg-white/5 hover:scale-[1.03] group shadow-2xl active:scale-95"
                >
                    <div className="bg-white/5 p-6 rounded-full group-hover:bg-white/10">
                        <Printer className="h-16 w-16 text-slate-400" />
                    </div>
                    <span className="text-xl font-black uppercase tracking-[0.2em] italic text-center">Print Asset Labels</span>
                </Link>
            </div>

            {/* Daily Stream (Recent Activity placeholder) */}
            <div className="glass rounded-[2rem] p-8 border border-white/5 mt-4">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Operational Stream</h2>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 animate-pulse">Live</span>
                </div>
                <div className="flex flex-col gap-4 text-slate-500 text-xs italic text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                    <p>Scanning active across 4 nodes. Real-time updates engaged.</p>
                </div>
            </div>
        </div>
    );
}
