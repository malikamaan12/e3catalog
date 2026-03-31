import { db } from "@/lib/db";
import { bookings, products, bookingUnitAssignments } from "@/lib/db/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { 
    Package, 
    Calendar, 
    MapPin, 
    ChevronRight, 
    ScanLine,
    FileSignature
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
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
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-100 italic uppercase">
                    Dispatch <span className="text-sky-500 font-black">Pipeline</span>
                </h1>
                <p className="text-slate-400 font-medium tracking-tight">Active Logistics Fulfillment Tracking</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=outgoing"
                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === 'outgoing' 
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                            : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    Outgoing (Bump-In)
                </Link>
                <Link 
                    href="/dashboard/warehouse/dispatch?tab=incoming"
                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === 'incoming' 
                            ? 'bg-amber-500 text-[#0A0F1C] shadow-lg shadow-amber-500/20' 
                            : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    Incoming (Bump-Out)
                </Link>
            </div>

            <div className="flex flex-col gap-6">
                {activeBookings.length === 0 ? (
                    <div className="text-center py-24 glass rounded-[2rem] border-2 border-dashed border-white/5 text-slate-500 italic">
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
                                className="glass rounded-3xl p-6 border border-white/10 flex flex-col gap-6 transition-all hover:border-sky-500/50 hover:bg-white/[0.02] group active:scale-[0.98]"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${project.status === 'dispatched' ? 'bg-sky-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tighter">
                                                {project.projectName || "Unnamed Project"}
                                            </h3>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-4">
                                            Client: <span className="text-slate-300">{project.customerName}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl self-start md:self-center">
                                        <Package className="h-4 w-4 text-sky-500" />
                                        <span className="text-sm font-black text-slate-100 truncate max-w-[200px]">
                                            {project.productName}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span className="text-xs font-medium">
                                            {format(project.startDate, "MMM do, yyyy")} {project.startTime && ` @ ${project.startTime}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <MapPin className="h-4 w-4 shrink-0" />
                                        <span className="text-xs font-medium truncate italic max-w-[300px]">
                                            {project.venue || "Venue not specified"}
                                        </span>
                                    </div>
                                </div>

                                {/* Fulfillment Progress Bar */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {activeTab === 'incoming' ? 'Return Status' : 'Fulfillment Status'}
                                        </span>
                                        <span className={`text-sm font-black ${isComplete ? 'text-emerald-500' : (activeTab === 'incoming' ? 'text-amber-500' : 'text-sky-500')}`}>
                                            {project.assignedCount} / {project.requiredUnits} Units
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className={`h-full transition-all duration-500 ease-out rounded-full ${isComplete ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : (activeTab === 'incoming' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]')}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
                                    {activeTab === 'incoming' ? (
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase italic tracking-widest">
                                            <ScanLine className="h-4 w-4" />
                                            Scan to Return
                                        </div>
                                    ) : project.status === 'dispatched' ? (
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase italic tracking-widest">
                                            <FileSignature className="h-4 w-4" />
                                            Manifest Ready
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase italic tracking-widest">
                                            <ScanLine className="h-4 w-4" />
                                            Scan to Fulfill
                                        </div>
                                    )}
                                    <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-2 ${project.status === 'dispatched' ? 'text-emerald-500' : 'group-hover:text-sky-500 text-slate-700'}`} />
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
