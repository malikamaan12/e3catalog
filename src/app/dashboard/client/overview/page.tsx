import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq, and, gte, desc, or, ne } from "drizzle-orm";
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

    // Fetch Client Data
    const clientBookings = await db.query.bookings.findMany({
        where: eq(bookings.userId, user.id),
        with: {
            product: true,
        },
        orderBy: [desc(bookings.createdAt)],
        limit: 10,
    });

    const pendingQuotes = clientBookings.filter(b => 
        [BOOKING_STATUS.QUOTE_SENT, BOOKING_STATUS.CHANGES_REQUESTED].includes(b.status as any)
    );
    const activeBookings = clientBookings.filter(b => 
        [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED].includes(b.status as any)
    );

    const stats = [
        { label: "Pending Quotes", value: pendingQuotes.length, icon: MessageSquareQuote, color: "text-amber-400", bg: "bg-amber-400/10" },
        { label: "Active Orders", value: activeBookings.length, icon: CalendarCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { label: "Draft Requests", value: clientBookings.filter(b => b.status === BOOKING_STATUS.REQUEST).length, icon: FileText, color: "text-sky-400", bg: "bg-sky-400/10" },
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
                        Welcome, <span className="text-[var(--color-gold)]">{user.name.split(' ')[0]}</span>
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
                            Browse New Assets
                        </Link>
                        <Link 
                            href="/catalog?newquote=1" 
                            className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--color-warm-white)] font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Request Custom Quote
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
                
                {/* Left Column: Actionable Pipeline */}
                <div className="xl:col-span-2 space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h2 className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase italic tracking-tight">
                                Pending <span className="text-[var(--color-gold)]">Sign-Offs</span>
                            </h2>
                            <Link href="/dashboard/client/quotes" className="text-[10px] font-black text-[var(--color-slate)] hover:text-[var(--color-gold)] uppercase tracking-widest transition-colors">
                                View All Quotes →
                            </Link>
                        </div>

                        {pendingQuotes.length === 0 ? (
                            <div className="py-20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                                <div className="p-6 rounded-full bg-white/5 mb-4 opacity-40">
                                    <ShieldCheck className="w-10 h-10 text-[var(--color-gold)]" />
                                </div>
                                <p className="text-[var(--color-slate)] font-bold text-sm">All quotes are currently up to date.</p>
                                <p className="text-[10px] text-[var(--color-slate)] opacity-40 uppercase tracking-widest mt-1">Check back when your sales rep provides a proposal</p>
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
                                                <div className="w-16 h-16 rounded-2xl glass border border-white/10 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform">
                                                    {quote.product?.thumbnailUrl ? (
                                                        <img src={quote.product.thumbnailUrl} alt={quote.product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FileText className="w-6 h-6 text-[var(--color-gold)]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-[var(--color-warm-white)] tracking-tight">{quote.projectName || quote.product?.name || "Quote Proposal"}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded uppercase tracking-widest">
                                                            Awaiting Action
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-widest flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(quote.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between md:justify-end gap-10">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Total Quote</p>
                                                    <p className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)] tracking-tighter">
                                                        QAR {quote.totalPrice?.toLocaleString() || "—"}
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
                </div>

                {/* Right Column: Mini Activity / Status */}
                <aside className="space-y-8">
                    <section className="glass rounded-[2.5rem] p-8 border border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-black text-[var(--color-warm-white)] uppercase tracking-widest mb-8 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[var(--color-gold)]" />
                            Recent Tracking
                        </h3>
                        
                        {clientBookings.length === 0 ? (
                            <p className="text-xs font-bold text-[var(--color-slate)] opacity-40 italic">No recent tracking data available.</p>
                        ) : (
                            <div className="space-y-8 relative">
                                {/* Vertical connector */}
                                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/5" />
                                
                                {clientBookings.slice(0, 5).map((b, i) => (
                                    <div key={b.id} className="relative pl-10">
                                        <div className={`absolute left-0 top-0.5 w-5 h-5 rounded-full border-2 border-[var(--color-surface)] z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                                            b.status === "approved" ? "bg-emerald-500" :
                                            b.status === "booked" ? "bg-[var(--color-gold)]" :
                                            "bg-white/10"
                                        }`} />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40 leading-none">
                                                {new Date(b.updatedAt).toLocaleDateString()}
                                            </span>
                                            <p className="text-[11px] font-bold text-[var(--color-warm-white)] leading-relaxed">
                                                Booking <span className="text-[var(--color-gold)]">#BK-{b.id.slice(0, 4)}</span> moved to <span className="text-[var(--color-gold)] uppercase tracking-widest text-[9px]">{b.status.replace('_', ' ')}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Link 
                            href="/dashboard/client/bookings" 
                            className="mt-10 w-full h-14 flex items-center justify-center rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-slate)] hover:bg-white/5 transition-all"
                        >
                            Logistics Vault
                        </Link>
                    </section>
                </aside>
            </div>
        </div>
    );
}
