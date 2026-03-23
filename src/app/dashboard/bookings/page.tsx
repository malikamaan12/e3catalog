export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Package, ChevronRight, CheckCircle2, Clock, ClipboardList, CalendarDays } from "lucide-react";
import { BOOKING_STATUS } from "@/lib/constants";

export default async function MyBookingsPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const rows = await db
        .select({ booking: bookings, product: products })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .where(eq(bookings.userId, user.id))
        .orderBy(desc(bookings.createdAt));

    // Group by project — only show confirmed/active bookings
    const allProjects = rows.reduce((acc, { booking, product }) => {
        const key = booking.projectId || booking.id;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                projectName: booking.projectName || "Booking",
                status: booking.status,
                createdAt: booking.createdAt,
                startDate: booking.startDate,
                endDate: booking.endDate,
                totalUnits: 0,
                itemCount: 0,
                products: [] as string[],
                paymentStatus: booking.paymentStatus,
                totalPrice: booking.totalPrice,
            };
        }
        acc[key].totalUnits += booking.units;
        acc[key].itemCount += 1;
        if (!acc[key].products.includes(product.name)) acc[key].products.push(product.name);
        return acc;
    }, {} as Record<string, any>);

    const confirmedStatuses = [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED, BOOKING_STATUS.QUOTE_ACCEPTED];
    const allProjectsList = Object.values(allProjects) as any[];
    const activeBookings = allProjectsList.filter(p => confirmedStatuses.includes(p.status));
    const pendingQuotes = allProjectsList.filter(p => [BOOKING_STATUS.REQUEST, BOOKING_STATUS.QUOTE_SENT, BOOKING_STATUS.CHANGES_REQUESTED].includes(p.status));
    const pastBookings = allProjectsList.filter(p => [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(p.status));

    const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

    const eventStatus = (p: any) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        if (end < today) return { label: "Completed", color: "text-slate-400 bg-white/5 border-white/10" };
        if (start <= today && end >= today) return { label: "Ongoing", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
        const days = Math.ceil((start.getTime() - today.getTime()) / 86400000);
        return { label: `In ${days} day${days !== 1 ? "s" : ""}`, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    };

    const paymentLabel = (status: string) => {
        if (status === "paid") return { label: "Paid", color: "text-emerald-400 bg-emerald-500/10" };
        if (status === "deposit_paid") return { label: "Deposit Paid", color: "text-amber-400 bg-amber-500/10" };
        return { label: "Unpaid", color: "text-red-400 bg-red-500/10" };
    };

    const BookingCard = ({ p }: { p: any }) => {
        const evt = eventStatus(p);
        const pay = paymentLabel(p.paymentStatus);
        return (
            <Link href={`/dashboard/quote/${p.id}`} className="block group">
                <div className="glass border border-white/10 rounded-xl p-5 hover:border-[var(--color-gold)]/30 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-sm text-[var(--color-warm-white)]">{p.projectName}</h3>
                            <p className="text-[10px] text-[var(--color-slate)] mt-0.5">Confirmed Booking</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${evt.color}`}>{evt.label}</span>
                    </div>

                    <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {fmt(p.startDate)} → {fmt(p.endDate)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
                            <Package className="h-3 w-3 shrink-0" />
                            {p.totalUnits} unit{p.totalUnits !== 1 ? "s" : ""} · {p.products.slice(0, 3).join(", ")}{p.products.length > 3 ? ` +${p.products.length - 3}` : ""}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex gap-2 items-center">
                            {p.totalPrice && (
                                <span className="text-xs font-semibold text-[var(--color-warm-white)]">
                                    QAR {p.totalPrice.toLocaleString()}
                                </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${pay.color}`}>{pay.label}</span>
                        </div>
                        <span className="text-xs text-[var(--color-gold)] group-hover:underline flex items-center gap-1">
                            Details <ChevronRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>
            </Link>
        );
    };

    const statChips = [
        { label: "Active / Upcoming", value: activeBookings.length, icon: CheckCircle2, color: "border-emerald-500/20 bg-emerald-500/5", iconColor: "text-emerald-400" },
        { label: "Pending Quotes", value: pendingQuotes.length, icon: Clock, color: "border-blue-500/20 bg-blue-500/5", iconColor: "text-blue-400" },
        { label: "Completed / Cancelled", value: pastBookings.length, icon: ClipboardList, color: "border-white/10 bg-white/3", iconColor: "text-[var(--color-slate)]" },
    ];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">My Bookings</h1>
                <p className="text-[var(--color-slate)] text-sm mt-1">{activeBookings.length} confirmed booking{activeBookings.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Stats chips */}
            <div className="grid grid-cols-3 gap-3 mb-7">
                {statChips.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`glass border rounded-xl p-4 ${s.color}`}>
                            <div className={`mb-2 ${s.iconColor}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="text-xl font-bold text-[var(--color-warm-white)]">{s.value}</div>
                            <div className="text-[10px] text-[var(--color-slate)] mt-0.5">{s.label}</div>
                        </div>
                    );
                })}
            </div>

            {activeBookings.length === 0 && pendingQuotes.length === 0 && pastBookings.length === 0 ? (
                <div className="text-center py-20 glass border border-dashed border-white/20 rounded-2xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <CalendarDays className="h-8 w-8 text-[var(--color-slate)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">No bookings yet</h3>
                    <p className="text-[var(--color-slate)] text-sm mb-6">Submit a quote request and our team will confirm your booking.</p>
                    <Link href="/catalog" className="btn-primary text-sm inline-flex gap-2">Browse Catalog</Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {activeBookings.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed Bookings
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeBookings.map(p => <BookingCard key={p.id} p={p} />)}
                            </div>
                        </section>
                    )}

                    {pendingQuotes.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate)] mb-3 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Pending Quotes
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingQuotes.map(p => (
                                    <Link key={p.id} href={`/dashboard/quote/${p.id}`} className="glass border border-white/8 rounded-xl p-5 hover:border-white/20 transition-all flex items-center gap-4 group">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[var(--color-warm-white)]">{p.projectName}</p>
                                            <p className="text-xs text-[var(--color-slate)] mt-0.5">{fmt(p.startDate)} → {fmt(p.endDate)}</p>
                                        </div>
                                        <span className="text-xs text-[var(--color-gold)] group-hover:underline">View Quote →</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {pastBookings.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate)] mb-3">History</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {pastBookings.map(p => (
                                    <Link key={p.id} href={`/dashboard/quote/${p.id}`} className="glass border border-white/5 rounded-xl p-4 opacity-60 hover:opacity-80 transition-all flex items-center gap-4 group">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--color-warm-white)]">{p.projectName}</p>
                                            <p className="text-xs text-[var(--color-slate)] mt-0.5">{p.status === "cancelled" ? "Cancelled" : "Completed"} · {fmt(p.startDate)}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-[var(--color-slate)]" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
