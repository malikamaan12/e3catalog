import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { 
    LayoutDashboard, 
    FileText, 
    CalendarCheck, 
    Clock, 
    ArrowRight,
    Sparkles,
    ShieldCheck,
    MessageSquareQuote
} from "lucide-react";
import Link from "next/link";
import { BOOKING_STATUS } from "@/lib/constants";

export const metadata = {
    title: "Client Hub | E3 Rentals",
    description: "Manage your premium event assets and project timelines.",
};

export default async function ClientOverviewPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    // Fetch Client Bookings with Product Details
    const clientBookings = await db.query.bookings.findMany({
        where: eq(bookings.userId, user.id),
        with: {
            product: true,
        },
        orderBy: [desc(bookings.createdAt)],
    });

    // Group Bookings by Project
    const groupedProjects = new Map<string, any>();

    for (const b of clientBookings) {
        const key = b.projectId || b.id;
        if (!groupedProjects.has(key)) {
            groupedProjects.set(key, {
                id: key,
                projectId: key,
                projectName: b.projectName || b.product?.name || "Event Proposal",
                status: b.status,
                createdAt: b.createdAt,
                startDate: b.startDate,
                endDate: b.endDate,
                totalPrice: b.totalPrice || 0,
                itemsCount: 0,
                thumbnailUrl: b.product?.thumbnailUrl,
                items: [],
            });
        }
        const proj = groupedProjects.get(key);
        proj.itemsCount += b.units;
        proj.items.push(b);
    }

    const allProjects = Array.from(groupedProjects.values());

    const pendingQuotes = allProjects.filter(p => 
        [BOOKING_STATUS.QUOTE_SENT, BOOKING_STATUS.CHANGES_REQUESTED].includes(p.status as any)
    );
    const activeBookings = allProjects.filter(p => 
        [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED, "packing", "packed", "out_for_delivery", "delivered"].includes(p.status as any)
    );
    const draftRequests = allProjects.filter(p => 
        [BOOKING_STATUS.REQUEST, BOOKING_STATUS.PENDING_QUOTE].includes(p.status as any)
    );

    const stats = [
        { label: "Pending Proposals", value: pendingQuotes.length, icon: MessageSquareQuote, color: "text-amber-400", bg: "bg-amber-400/10" },
        { label: "Active Orders", value: activeBookings.length, icon: CalendarCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { label: "Draft Requests", value: draftRequests.length, icon: FileText, color: "text-sky-400", bg: "bg-sky-400/10" },
    ];

    return (
        <div className="animate-fade-up space-y-10">
            {/* Header / Welcome Section */}
            <header className="relative py-12 px-10 rounded-[3rem] overflow-hidden bg-[var(--color-navy-lighter)] border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <LayoutDashboard className="w-64 h-64 text-[var(--color-gold)]" />
                </div>
                
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="px-3 py-1 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 text-[var(--color-gold)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Premium Client Portal
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] tracking-tight italic uppercase">
                        Welcome, <span className="text-[var(--color-gold)]">{user.name?.split(' ')[0] || "Client"}</span>
                    </h1>
                    <p className="text-[var(--color-slate)] mt-4 text-lg font-medium leading-relaxed">
                        Control your event logistics and scale your projects. 
                        Sign off on pending quotes or track your live assets below.
                    </p>
                    
                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link 
                            href="/catalog" 
                            className="px-8 py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20"
                        >
                            Browse Live Fleet
                        </Link>
                        <Link 
                            href="/cart" 
                            className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--color-warm-white)] font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            View Active Proposal Cart
                        </Link>
                    </div>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="glass group rounded-3xl p-8 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 shadow-inner`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-1 opacity-60">{stat.label}</span>
                            <span className="text-4xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] tracking-tighter">{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                
                {/* Left Column: Actionable Proposals & Active Orders */}
                <div className="xl:col-span-2 space-y-12">
                    {/* Pending Proposals Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h2 className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase italic tracking-tight">
                                Pending <span className="text-[var(--color-gold)]">Proposals</span>
                            </h2>
                        </div>

                        {pendingQuotes.length === 0 ? (
                            <div className="py-16 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                                <div className="p-6 rounded-full bg-white/5 mb-4 opacity-40">
                                    <ShieldCheck className="w-8 h-8 text-[var(--color-gold)]" />
                                </div>
                                <p className="text-[var(--color-slate)] font-bold text-sm">All proposals are currently processed.</p>
                                <p className="text-[10px] text-[var(--color-slate)] opacity-40 uppercase tracking-widest mt-1">New proposals will appear here for your digital sign-off</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {pendingQuotes.map((quote) => (
                                    <Link 
                                        key={quote.id} 
                                        href={`/dashboard/client/quote/${quote.id}`}
                                        className="group p-1 rounded-[2rem] bg-gradient-to-r from-[var(--color-gold)]/20 to-transparent hover:from-[var(--color-gold)]/40 transition-all duration-500 shadow-2xl"
                                    >
                                        <div className="bg-[var(--color-surface)] rounded-[1.9rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-2xl glass border border-white/10 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform bg-navy-dark">
                                                    {quote.thumbnailUrl ? (
                                                        <img src={quote.thumbnailUrl} alt={quote.projectName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FileText className="w-6 h-6 text-[var(--color-gold)]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-[var(--color-warm-white)] tracking-tight">{quote.projectName}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded uppercase tracking-widest">
                                                            {quote.status === 'quote_sent' ? 'Awaiting Signature' : 'In Review'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-widest flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {quote.itemsCount} Assets
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between md:justify-end gap-8">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Proposal Amount</p>
                                                    <p className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)] tracking-tighter">
                                                        {quote.totalPrice ? `QAR ${quote.totalPrice.toLocaleString()}` : "TBD"}
                                                    </p>
                                                </div>
                                                <div className="h-12 w-12 rounded-full border border-[var(--color-gold)]/30 group-hover:bg-[var(--color-gold)] flex items-center justify-center transition-all group-hover:scale-110">
                                                    <ArrowRight className="w-5 h-5 text-[var(--color-gold)] group-hover:text-[var(--color-navy)]" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Active Confirmed Orders Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h2 className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase italic tracking-tight">
                                Active <span className="text-emerald-400">Confirmed Orders</span>
                            </h2>
                        </div>

                        {activeBookings.length === 0 ? (
                            <div className="py-12 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                                <p className="text-[var(--color-slate)] text-xs font-bold uppercase tracking-widest">No active orders scheduled.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {activeBookings.map((order) => (
                                    <div 
                                        key={order.id} 
                                        className="p-6 rounded-[2rem] glass border border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                                                ✓
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{order.projectName}</h4>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    {String(order.startDate).split('T')[0]} to {String(order.endDate).split('T')[0]} • {order.itemsCount} Units Reserved
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                                                {order.status}
                                            </span>
                                            <Link 
                                                href={`/dashboard/client/quote/${order.id}`}
                                                className="text-[10px] font-black text-gold hover:underline uppercase tracking-wider"
                                            >
                                                View Agreement →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Support & Logistics Guidance */}
                <div className="space-y-8">
                    <div className="p-8 rounded-[3rem] glass border border-white/5 bg-white/[0.01] space-y-6">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-gold" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Logistics & Compliance</h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            All confirmed bookings are backed by E3 certified logistics, on-site setup crews, and Civil Defence approved event hardware.
                        </p>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-slate-300 space-y-2">
                            <div className="font-bold text-white uppercase tracking-wider">Direct Hotline</div>
                            <div>Doha Logistics Support: +974 4400 0000</div>
                            <div>Email: operations@e3rentals.qa</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
