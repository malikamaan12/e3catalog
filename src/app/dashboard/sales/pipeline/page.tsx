import { db } from "@/lib/db";
import { bookings, users, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

export const dynamic = "force-dynamic";

export default async function SalesPipelinePage() {
    // 1. Fetch all bookings with product
    const allBookingRows = await db
        .select({
            id: bookings.id,
            projectId: bookings.projectId,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            customerEmail: bookings.customerEmail,
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

    // Group by Project
    const groupedMap = new Map<string, any>();

    for (const b of allBookingRows) {
        const key = b.projectId || b.id;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                id: key,
                projectId: key,
                projectName: b.projectName || b.productName || "Proposal",
                customerName: b.customerName,
                customerEmail: b.customerEmail,
                status: b.status,
                totalPrice: 0,
                totalUnits: 0,
                startDate: b.startDate,
                endDate: b.endDate,
                productImage: b.productImage,
                itemsCount: 0,
            });
        }
        const proj = groupedMap.get(key);
        proj.totalPrice += (b.totalPrice || 0);
        proj.totalUnits += b.units;
        proj.itemsCount += 1;
    }

    const allProjects = Array.from(groupedMap.values());

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
                        Select any deal card to enter the multi-item Sales Deal Room and negotiate pricing.
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
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                {stages.map((stage) => {
                    const stageBookings = allProjects.filter(p => p.status === stage.key);
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

                            {/* Drop Zone / Card List */}
                            <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-3xl p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar">
                                {stageBookings.length === 0 ? (
                                    <div className="h-32 border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                        Empty Stage
                                    </div>
                                ) : (
                                    stageBookings.map((deal) => (
                                        <Link 
                                            key={deal.id}
                                            href={`/dashboard/sales/deal/${deal.id}`}
                                            className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[var(--color-gold)]/30 hover:bg-white/[0.04] transition-all flex flex-col gap-4 relative overflow-hidden shadow-xl"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                    #{deal.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowUpRight className="h-3 w-3 text-[var(--color-gold)]" />
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-black text-[var(--color-warm-white)] uppercase tracking-wider group-hover:text-[var(--color-gold)] transition-colors line-clamp-1">
                                                    {deal.projectName}
                                                </h4>
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1">
                                                    <UserCircle className="h-3 w-3 text-slate-600" />
                                                    <span className="truncate">{deal.customerName || "Anonymous"}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                                    <Package className="h-3 w-3" />
                                                    <span>{deal.itemsCount} Asset{deal.itemsCount > 1 ? 's' : ''}</span>
                                                </div>
                                                <span className="text-[11px] font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)]">
                                                    {deal.totalPrice > 0 ? `QAR ${deal.totalPrice.toLocaleString()}` : "TBD"}
                                                </span>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
