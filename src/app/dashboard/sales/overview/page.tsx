import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { count, eq, sql, and, gte } from "drizzle-orm";
import { 
    Clock, 
    FileText, 
    CheckCircle2, 
    TrendingUp,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { BOOKING_STATUS } from "@/lib/constants";

export default async function SalesOverview() {
    // 1. Fetch Aggregates
    const [pendingCount] = await db
        .select({ value: count() })
        .from(bookings)
        .where(eq(bookings.status, BOOKING_STATUS.REQUEST));

    const [quotesSentCount] = await db
        .select({ value: count() })
        .from(bookings)
        .where(eq(bookings.status, BOOKING_STATUS.QUOTE_SENT));

    const [approvedCount] = await db
        .select({ value: count() })
        .from(bookings)
        .where(eq(bookings.status, BOOKING_STATUS.APPROVED));

    // Revenue for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [revenueData] = await db
        .select({ 
            total: sql<number>`SUM(CAST(${bookings.totalPrice} AS REAL))`
        })
        .from(bookings)
        .where(
            and(
                eq(bookings.status, BOOKING_STATUS.BOOKED),
                gte(bookings.createdAt, startOfMonth)
            )
        );

    const stats = [
        { 
            label: "Pending Requests", 
            value: pendingCount.value, 
            icon: Clock, 
            color: "text-amber-400", 
            bg: "bg-amber-400/10",
            href: "/dashboard/sales/pipeline?status=request"
        },
        { 
            label: "Active Quotes", 
            value: quotesSentCount.value, 
            icon: FileText, 
            color: "text-blue-400", 
            bg: "bg-blue-400/10",
            href: "/dashboard/sales/pipeline?status=quote_sent"
        },
        { 
            label: "Pending Approvals", 
            value: approvedCount.value, 
            icon: CheckCircle2, 
            color: "text-[var(--color-gold)]", 
            bg: "bg-[var(--color-gold)]/10",
            href: "/dashboard/sales/pipeline?status=approved"
        },
        { 
            label: "Revenue Secured", 
            value: `QAR ${(revenueData.total || 0).toLocaleString()}`, 
            icon: TrendingUp, 
            color: "text-emerald-400", 
            bg: "bg-emerald-400/10",
            href: "/dashboard/sales/pipeline?status=booked"
        },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col gap-12">
            <div>
                <h1 className="text-4xl font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] italic mb-2">
                    Sales Control Hub
                </h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                    Real-time operational intelligence for E3 Logistics
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Link 
                        key={stat.label} 
                        href={stat.href}
                        className="group relative p-6 rounded-3xl glass border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all overflow-hidden"
                    >
                        <div className={`p-3 rounded-2xl ${stat.bg} w-fit mb-6 transition-transform group-hover:scale-110`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-3xl font-black text-[var(--color-warm-white)] font-[family-name:var(--font-heading)] italic tracking-wider">
                                {stat.value}
                            </span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                {stat.label}
                            </span>
                        </div>
                        <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-white/0 group-hover:text-[var(--color-gold)] group-hover:translate-x-1 transition-all" />
                    </Link>
                ))}
            </div>

            {/* Quick Actions / Activity Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 rounded-[2.5rem] glass border border-white/5 bg-white/[0.01] p-10 flex flex-col gap-8 min-h-[400px]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-widest italic">
                            Pipeline Intelligence
                        </h2>
                        <Link href="/dashboard/sales/pipeline" className="text-[9px] font-black text-[var(--color-gold)] uppercase tracking-widest hover:opacity-70 transition-opacity">
                            View Board
                        </Link>
                    </div>
                    <div className="flex-1 flex flex-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pipeline Visualization Loading...</p>
                    </div>
                </div>

                <div className="rounded-[2.5rem] glass border border-white/5 bg-white/[0.01] p-10 flex flex-col gap-8">
                    <h2 className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-widest italic">
                        Recent Signals
                    </h2>
                    <div className="flex flex-col gap-6">
                        {/* Placeholder for real-time notifications */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 items-start pb-6 border-b border-white/5 last:border-0 opacity-40">
                                <div className="h-2 w-2 rounded-full bg-[var(--color-gold)] mt-1.5 shrink-0" />
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase leading-relaxed">
                                        Client requested quote for <span className="text-[var(--color-gold)]">LED Wall X-200</span>
                                    </p>
                                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">24m ago • Ref #BK-00{i}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
