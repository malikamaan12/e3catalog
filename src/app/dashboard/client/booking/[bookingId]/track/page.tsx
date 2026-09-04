import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { LiveTrackingMap } from "@/components/fleet/LiveTrackingMap";
import { Truck, ChevronRight, Phone, ShieldCheck, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "Live Courier Tracking | E3 Rentals Qatar",
    description: "Real-time GPS delivery vehicle tracking and ETA for your event assets.",
};

export default async function ClientLiveTrackPage({ params }: { params: { bookingId: string } }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { bookingId } = await params;

    const booking = await db.query.bookings.findFirst({
        where: and(
            eq(bookings.id, bookingId),
            eq(bookings.userId, user.id)
        ),
        with: {
            product: true,
            dispatchLog: true,
        }
    });

    if (!booking) {
        notFound();
    }

    if (!booking.dispatchLog) {
        return (
            <div className="max-w-4xl mx-auto py-24 px-4 text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[var(--color-gold)]">
                    <Truck className="w-8 h-8 opacity-40" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white font-[family-name:var(--font-heading)]">
                        Dispatch Run Pending
                    </h2>
                    <p className="text-xs text-[var(--color-slate)] max-w-sm mx-auto mt-2">
                        Your equipment is currently being staged and prepped at the warehouse. Live GPS tracking will activate once the courier departs for the venue.
                    </p>
                </div>
                <Link
                    href={`/dashboard/client/booking/${booking.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-[var(--color-gold)] border border-white/10 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" /> Return to Booking Details
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        href={`/dashboard/client/booking/${booking.id}`}
                        className="inline-flex items-center gap-2 text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest hover:text-[var(--color-gold)] transition-colors mb-2"
                    >
                        <ChevronRight className="w-3 h-3 rotate-180" /> Back to Booking Vault
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-black text-white font-[family-name:var(--font-heading)] uppercase italic">
                        Live Vehicle <span className="text-[var(--color-gold)]">Tracker</span>
                    </h1>
                    <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest mt-1">
                        Run #DSP-{booking.dispatchLog.id.slice(0, 8).toUpperCase()} · {booking.projectName || "Live Production"}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-2.5">
                        <Truck className="w-4 h-4 text-[var(--color-gold)]" />
                        <div>
                            <p className="text-[9px] text-[var(--color-slate)] font-black uppercase">Designated Courier</p>
                            <p className="text-xs font-bold text-white">{booking.dispatchLog.driverName}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Live GPS Component */}
            <LiveTrackingMap
                dispatchLogId={booking.dispatchLog.id}
                driverName={booking.dispatchLog.driverName}
                vehiclePlate={booking.dispatchLog.vehiclePlateNumber}
                destinationName={booking.projectName || undefined}
                destinationAddress={booking.notes || booking.customNotes || "Doha Site"}
            />
        </div>
    );
}
