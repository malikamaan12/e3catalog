import { db } from "@/lib/db";
import { bookings, users, products } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { 
    Clock, 
    FileText, 
    CheckCircle2, 
    Target,
    Search,
    Filter,
    Plus,
    Calendar,
    ArrowUpRight,
    UserCircle,
    Package
} from "lucide-react";
import Link from "next/link";
import { BOOKING_STATUS } from "@/lib/constants";

export default async function SalesPipelinePage() {
    // 1. Fetch Pipeline Data (Optimized with inner joins)
    const allBookings = await db
        .select({
            id: bookings.id,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            status: bookings.status,
            totalPrice: bookings.totalPrice,
            units: bookings.units,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            productName: products.name,
            productImage: products.thumbnailUrl,
        })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .orderBy(desc(bookings.createdAt));

    const stages = [
        { key: BOOKING_STATUS.REQUEST, label: "Incoming Requests", icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10" },
        { key: BOOKING_STATUS.QUOTE_SENT, label: "Active Quotes", icon: FileText, color: "text-amber-400", bg: "bg-amber-400/10" },
        { key: BOOKING_STATUS.APPROVED, label: "Client Approved", icon: CheckCircle2, color: "text-[var(--color-gold)]", bg: "bg-[var(--color-gold)]/10" },
        { key: BOOKING_STATUS.BOOKED, label: "Closed / Booked", icon: Target, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    ];

    return (
        <div className="p-8 h-[calc(100vh-64px)] flex flex-col gap-8">
            {/* Header / Search Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-widest italic">
                        Booking Pipeline
                    </h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                        Drag metrics are simulated. Use Deal Room for status transitions.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[var(--color-gold)] transition-colors" />
                        <input 
                            placeholder="Filter pipeline..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-2.5 text-xs text-white outline-none focus:border-[var(--color-gold)]/50 transition-all w-64"
                        />
                    </div>
                    <button className="p-2.5 rounded-xl border border-white/10 glass text-slate-400 hover:text-[var(--color-gold)] transition-all">
                        <Filter className="h-4 w-4" />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-gold)] text-[var(--color-navy)] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-gold)]/10 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="h-4 w-4" />
                        New Quote
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                {stages.map((stage) => {
                    const stageBookings = allBookings.filter(b => b.status === stage.key);
                    const totalValue = stageBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

                    return (
                        <div key={stage.key} className="flex flex-col min-w-[320px] w-1/4 h-full">
                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${stage.bg} ${stage.color}`}>
                                        <stage.icon className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-[var(--color-warm-white)] uppercase tracking-[0.2em]">
                                        {stage.label}
                                    </h3>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-400">{stageBookings.length}</span>
                                    <span className="text-[8px] font-bold text-slate-600 uppercase">QAR {totalValue.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Column Body */}
                            <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-[2rem] p-4 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                                {stageBookings.length > 0 ? (
                                    stageBookings.map((booking) => (
                                        <Link 
                                            key={booking.id}
                                            href={`/dashboard/sales/deal/${booking.id}`}
                                            className="group block p-5 rounded-2xl glass border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[var(--color-gold)]/30 transition-all shadow-xl"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 px-2 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                                                        #{booking.id.slice(0, 8)}
                                                    </div>
                                                </div>
                                                <ArrowUpRight className="h-4 w-4 text-slate-700 group-hover:text-[var(--color-gold)] transition-colors" />
                                            </div>

                                            <h4 className="text-sm font-black text-[var(--color-warm-white)] font-[family-name:var(--font-heading)] truncate mb-1">
                                                {booking.projectName || "Standard Rental Request"}
                                            </h4>
                                            
                                            <div className="flex items-center gap-2 mb-4">
                                                <UserCircle className="h-3 w-3 text-[var(--color-gold)]/40" />
                                                <span className="text-[10px] font-bold text-slate-400 capitalize">{booking.customerName}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/20 border border-white/5 mb-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Event Date</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-2.5 w-2.5 text-[var(--color-gold)]" />
                                                        <span className="text-[9px] font-bold text-slate-300">
                                                            {new Date(booking.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Secured Value</span>
                                                    <span className="text-[10px] font-black text-[var(--color-gold)]">
                                                        QAR {(booking.totalPrice || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Deal</span>
                                                </div>
                                                <div className="flex -space-x-2">
                                                    <div className="w-5 h-5 rounded-full border border-[var(--color-navy)] bg-slate-800" />
                                                    <div className="w-5 h-5 rounded-full border border-[var(--color-navy)] bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">+2</div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20">
                                        <Package className="h-10 w-10 mb-4 text-slate-500" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No active deals in this stage</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
