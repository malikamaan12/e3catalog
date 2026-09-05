import { db } from "@/lib/db";
import { bookings, products, bookingUnitAssignments } from "@/lib/db/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { 
    Package, 
    Calendar, 
    MapPin, 
    ChevronRight, 
    ScanLine,
    FileSignature,
    ArrowRightLeft
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import CrossHireCockpit from "@/components/cross-hire/CrossHireCockpit";
import DispatchRouteManager from "@/components/transport/DispatchRouteManager";
import LiveFleetRadar from "@/components/transport/LiveFleetRadar";
import FlightCaseManager from "@/components/warehouse/FlightCaseManager";
import { Compass, Radio, Box } from "lucide-react";

export default async function DispatchPipelinePage(props: { searchParams: Promise<{ tab?: string }> }) {
    const searchParams = await props.searchParams;
    const activeTab = searchParams.tab || 'outgoing';

    // ── Drizzle Query: Logistics Only (Skip Financials) ──
    const activeBookings = await db
        .select({
            id: bookings.id,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            startDate: bookings.startDate,
            startTime: bookings.startTime,
            venue: bookings.notes, // Assuming notes/location might have venue
            requiredUnits: bookings.units,
            status: bookings.status,
            fulfillmentStatus: bookings.fulfillmentStatus,
            productName: products.name,
            // Subquery for assigned units based on tab
            assignedCount: activeTab === 'incoming'
                ? sql<number>`(SELECT count(*) FROM ${bookingUnitAssignments} WHERE ${bookingUnitAssignments.bookingId} = ${bookings.id} AND ${bookingUnitAssignments.status} = 'returned')`
                : sql<number>`(SELECT count(*) FROM ${bookingUnitAssignments} WHERE ${bookingUnitAssignments.bookingId} = ${bookings.id} AND (${bookingUnitAssignments.status} = 'reserved' OR ${bookingUnitAssignments.status} = 'dispatched'))`,
        })
        .from(bookings)
        .leftJoin(products, eq(bookings.productId, products.id))
        .where(
            activeTab === 'incoming'
                ? eq(bookings.status, "dispatched")
                : or(
                    eq(bookings.status, "approved"),
                    eq(bookings.status, "dispatched"),
                    eq(bookings.status, "booked")
                )
        )
        .orderBy(bookings.startDate);

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-6xl mx-auto w-full">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black tracking-tight text-[var(--color-warm-white)] italic uppercase">
                    Dispatch <span className="text-[var(--color-gold)]">Pipeline</span>
                </h1>
                <p className="text-[var(--color-slate)] font-medium tracking-tight">Active Logistics Fulfillment Tracking</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-[var(--color-surface)] rounded-xl border border-white/10 w-fit shadow-2xl">
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=outgoing"
                    className={`px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all ${
                        activeTab === 'outgoing' 
                            ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20 font-black' 
                            : 'text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5'
                    }`}
                >
                    Outgoing (Bump-In)
                </Link>
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=incoming"
                    className={`px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all ${
                        activeTab === 'incoming' 
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 font-black' 
                            : 'text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5'
                    }`}
                >
                    Incoming (Bump-Out)
                </Link>
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=cross_hires"
                    className={`px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 ${
                        activeTab === 'cross_hires' 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 font-black' 
                            : 'text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5'
                    }`}
                >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Cross-Hire Sub-Rentals
                </Link>
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=clusters"
                    className={`px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 ${
                        activeTab === 'clusters' 
                            ? 'bg-emerald-500 text-navy shadow-lg shadow-emerald-500/20 font-black' 
                            : 'text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5'
                    }`}
                >
                    <Compass className="w-3.5 h-3.5" />
                    Route Optimization
                </Link>
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=radar"
                    className={`px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 ${
                        activeTab === 'radar' 
                            ? 'bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-400/20 font-black' 
                            : 'text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5'
                    }`}
                >
                    <Radio className="w-3.5 h-3.5" />
                    Live GPS Radar
                </Link>
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=flight_cases"
                    className={`px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 ${
                        activeTab === 'flight_cases' 
                            ? 'bg-amber-400 text-neutral-950 shadow-lg shadow-amber-400/20 font-black' 
                            : 'text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5'
                    }`}
                >
                    <Box className="w-3.5 h-3.5" />
                    Flight Cases & Kits
                </Link>
            </div>

            {activeTab === 'radar' ? (
                <LiveFleetRadar />
            ) : activeTab === 'flight_cases' ? (
                <FlightCaseManager />
            ) : activeTab === 'clusters' ? (
                <DispatchRouteManager />
            ) : activeTab === 'cross_hires' ? (
                <CrossHireCockpit />
            ) : (
                <div className="flex flex-col gap-6">
                    {activeBookings.length === 0 ? (
                    <div className="text-center py-24 glass rounded-3xl border-2 border-dashed border-white/5 text-[var(--color-slate)] italic shadow-inner">
                        No active dispatches found in the pipeline.
                    </div>
                ) : (
                    activeBookings.map((project) => {
                        const progress = Math.min(100, (Number(project.assignedCount) / project.requiredUnits) * 100);
                        const isComplete = Number(project.assignedCount) >= project.requiredUnits;

                        return (
                            <Link 
                                key={project.id} 
                                href={`/dashboard/warehouse/fulfillment?bookingId=${project.id}`}
                                className="glass rounded-xl p-6 border border-white/10 flex flex-col gap-6 transition-all hover:bg-white/[0.03] hover:border-[var(--color-gold)]/40 group active:scale-[0.98] shadow-xl relative overflow-hidden"
                            >
                                {/* Active Indicator Glow */}
                                {project.status === 'dispatched' && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
                                )}
                                {!isComplete && project.status !== 'dispatched' && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-gold)] shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                                )}

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-tight">
                                                {project.projectName || "Unnamed Project"}
                                            </h3>
                                        </div>
                                        <p className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-widest">
                                            Client: <span className="text-[var(--color-gold)]">{project.customerName}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/5 px-4 py-2.5 rounded-lg self-start md:self-center border border-white/5">
                                        <Package className="h-4 w-4 text-[var(--color-gold)]" />
                                        <span className="text-xs font-bold text-[var(--color-warm-white)] truncate max-w-[200px] uppercase tracking-wide">
                                            {project.productName}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 text-[var(--color-slate)]">
                                        <div className="p-1 px-2 rounded-md bg-white/5 border border-white/5">
                                            <Calendar className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                                        </div>
                                        <span className="text-xs font-semibold text-[var(--color-warm-white)]">
                                            {format(project.startDate, "MMM do, yyyy")} {project.startTime && ` @ ${project.startTime}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[var(--color-slate)]">
                                         <div className="p-1 px-2 rounded-md bg-white/5 border border-white/5">
                                            <MapPin className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                                        </div>
                                        <span className="text-xs font-medium truncate italic max-w-[300px]">
                                            {project.venue || "Venue not specified"}
                                        </span>
                                    </div>
                                </div>

                                {/* Fulfillment Progress Bar */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60">
                                            {activeTab === 'incoming' ? 'Return Status' : 'Fulfillment Status'}
                                        </span>
                                        <span className={`text-sm font-black tracking-tighter ${isComplete ? 'text-emerald-500' : (activeTab === 'incoming' ? 'text-sky-500' : 'text-[var(--color-gold)]')}`}>
                                            {project.assignedCount} / {project.requiredUnits} Units
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-[var(--color-navy)] rounded-full overflow-hidden border border-white/10 p-0.5">
                                        <div 
                                            className={`h-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-full ${isComplete ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : (activeTab === 'incoming' ? 'bg-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.4)]' : 'bg-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.4)]')}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-2">
                                    {activeTab === 'incoming' ? (
                                        <div className="flex items-center gap-2 text-[10px] font-black text-sky-500 uppercase italic tracking-[0.2em]">
                                            <ScanLine className="h-4 w-4" />
                                            Scan to Return
                                        </div>
                                    ) : project.status === 'dispatched' ? (
                                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase italic tracking-[0.2em]">
                                            <FileSignature className="h-4 w-4" />
                                            Manifest Ready
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--color-gold)] uppercase italic tracking-[0.2em]">
                                            <ScanLine className="h-4 w-4" />
                                            Scan to Fulfill
                                        </div>
                                    )}
                                    <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-2 ${project.status === 'dispatched' ? 'text-emerald-500' : 'group-hover:text-[var(--color-gold)] text-white/20'}`} />
                                </div>
                            </Link>
                        );
                    })
                )}
                </div>
            )}
        </div>
    );
}
