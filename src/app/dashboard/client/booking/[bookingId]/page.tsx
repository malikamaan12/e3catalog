import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { 
    LayoutDashboard, 
    FileText, 
    ShieldCheck, 
    Truck, 
    PackageCheck, 
    Calendar,
    CloudDownload,
    Eye,
    Clock,
    ChevronRight,
    MapPin,
    AlertCircle
} from "lucide-react";
import { BookingExtensionCard } from "@/components/client/BookingExtensionCard";
import Link from "next/link";

export const metadata = {
    title: "Logistics Vault | E3 Rentals",
    description: "Track fulfillment and access safety compliance documentation.",
};

export default async function BookingLogisticsPage({ params }: { params: { bookingId: string } }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { bookingId } = await params;

    const booking = await db.query.bookings.findFirst({
        where: and(
            eq(bookings.id, bookingId),
            eq(bookings.userId, user.id)
        ),
        with: {
            product: {
                with: {
                    safetyCertificates: true,
                    installationGuides: true,
                    documents: true,
                }
            },
            dispatchLog: true,
            extensions: {
                orderBy: (ext, { desc }) => [desc(ext.createdAt)],
            },
        }
    });

    if (!booking) {
        notFound();
    }

    const FULFILLMENT_STEPS = [
        { id: "pending", label: "Booking Confirmed", icon: ShieldCheck, description: "Order secured in our system" },
        { id: "packing", label: "Warehouse Prep", icon: PackageCheck, description: "Assets retrieved and inspected" },
        { id: "out_for_delivery", label: "Dispatching", icon: Truck, description: "En route to project location" },
        { id: "delivered", label: "On-Site / Serving", icon: MapPin, description: "Assets deployed at venue" },
        { id: "returned", label: "Decommissioned", icon: Calendar, description: "Returned and verified by E3" },
    ];

    const currentStepIndex = FULFILLMENT_STEPS.findIndex(s => s.id === booking.fulfillmentStatus) ?? 0;

    return (
        <div className="animate-fade-up space-y-10">
            {/* Header / Meta */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div>
                    <Link href="/dashboard/client/overview" className="inline-flex items-center gap-2 text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest hover:text-[var(--color-gold)] transition-colors mb-4">
                        <ChevronRight className="w-3 h-3 rotate-180" /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase italic tracking-tight">
                        Logistics <span className="text-[var(--color-gold)]">Vault</span>
                    </h1>
                    <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-40 mt-1">
                        Tracking Sequence #BK-{booking.id.slice(0, 8).toUpperCase()} • {booking.projectName || "Standard Event"}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-end">
                        <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Operational Status</span>
                        <span className="text-xs font-black text-[var(--color-gold)] uppercase tracking-widest">{booking.status.replace('_', ' ')}</span>
                    </div>
                </div>
            </header>

            {/* Fulfillment Timeline */}
            <section className="glass rounded-[3rem] p-10 border border-white/5 bg-white/[0.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Truck className="w-48 h-48 text-[var(--color-gold)]" />
                </div>

                <div className="flex items-center gap-3 mb-12">
                    <div className="p-2.5 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                        <Clock className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-black text-[var(--color-warm-white)] uppercase tracking-widest">
                        Real-Time Fulfillment Timeline
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
                    {/* Progress Bar (Desktop Only) */}
                    <div className="hidden md:block absolute top-7 left-12 right-12 h-0.5 bg-white/5 z-0">
                        <div 
                            className="h-full bg-[var(--color-gold)] transition-all duration-1000 shadow-[0_0_15px_rgba(212,175,55,0.5)]" 
                            style={{ width: `${(currentStepIndex / (FULFILLMENT_STEPS.length - 1)) * 100}%` }}
                        />
                    </div>

                    {FULFILLMENT_STEPS.map((step, i) => {
                        const isCompleted = i <= currentStepIndex;
                        const isCurrent = i === currentStepIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center text-center group">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                    isCurrent ? "bg-[var(--color-gold)] border-[var(--color-gold)] shadow-[0_0_30px_rgba(212,175,55,0.4)] scale-110" :
                                    isCompleted ? "bg-[var(--color-navy)] border-[var(--color-gold)] text-[var(--color-gold)]" :
                                    "bg-white/[0.02] border-white/5 text-[var(--color-slate)]/40"
                                }`}>
                                    <Icon className={`w-6 h-6 ${isCurrent ? "text-[var(--color-navy)]" : ""}`} />
                                </div>
                                <div className="mt-4">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? "text-[var(--color-warm-white)]" : "text-[var(--color-slate)] opacity-40"}`}>
                                        {step.label}
                                    </p>
                                    <p className="text-[9px] text-[var(--color-slate)] mt-1 font-medium opacity-60 leading-relaxed max-w-[120px]">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Left: Asset Detail & Logistics Logs */}
                <div className="xl:col-span-2 space-y-8">
                    <section className="glass rounded-[2.5rem] p-10 border border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-black text-[var(--color-warm-white)] uppercase tracking-widest mb-10 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--color-gold)]" />
                            Asset Fulfillment Profile
                        </h3>

                        <div className="flex flex-col md:flex-row gap-10 items-start">
                            <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden glass border border-white/10 shrink-0">
                                {booking.product?.thumbnailUrl ? (
                                    <img src={booking.product.thumbnailUrl} alt={booking.product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate/20">
                                        <PackageCheck className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h4 className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] italic uppercase tracking-tight">{booking.product?.name}</h4>
                                    <p className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] mt-1">{booking.units} {booking.product?.unit || 'Units'} Requested</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                                        <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-[var(--color-gold)]" /> Start Date
                                        </span>
                                        <p className="text-xs font-bold text-[var(--color-warm-white)] mt-1">{new Date(booking.startDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                                        <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                                            <AlertCircle className="w-3 h-3 text-red-400" /> End Date
                                        </span>
                                        <p className="text-xs font-bold text-[var(--color-warm-white)] mt-1">{new Date(booking.endDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                
                                {booking.dispatchLog && (
                                    <div className="p-5 rounded-2xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/20 flex items-center justify-center">
                                                <Truck className="w-5 h-5 text-[var(--color-gold)]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest">Courier Designated</p>
                                                <p className="text-xs font-bold text-white capitalize">{booking.dispatchLog.driverName} • {booking.dispatchLog.vehiclePlateNumber}</p>
                                            </div>
                                        </div>
                                        <Link href={`/dashboard/client/manifest/${booking.id}`} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-black text-white uppercase tracking-widest transition-all">
                                            Manifest
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* On-Site Rental Extension Card (Option D) */}
                    <BookingExtensionCard
                        bookingId={booking.id}
                        productName={booking.product?.name || "Equipment Rental"}
                        currentEndDate={booking.endDate.toISOString()}
                        units={booking.units}
                        extensions={booking.extensions as any}
                    />
                </div>

                {/* Right: Document Vault */}
                <aside className="space-y-8">
                    <section className="glass rounded-[2.5rem] p-8 border border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-black text-[var(--color-warm-white)] uppercase tracking-widest mb-8 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[var(--color-gold)]" />
                            Compliance Documents
                        </h3>

                        <div className="space-y-4">
                            {/* Standard Signed Proposal */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-[var(--color-gold)]/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-[var(--color-warm-white)] uppercase tracking-widest leading-none">Signed Quote</p>
                                            <p className="text-[9px] text-[var(--color-slate)] mt-1 opacity-60">PDF Agreement • Signed {booking.signedAt ? new Date(booking.signedAt).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <button className="text-slate/40 hover:text-[var(--color-gold)] transition-colors">
                                        <CloudDownload className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Safety Certificates */}
                            {booking.product?.safetyCertificates?.map((cert: any) => (
                                <div key={cert.id} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/40 transition-all cursor-pointer">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-[var(--color-warm-white)] uppercase tracking-widest leading-none">{cert.certName}</p>
                                                <p className="text-[9px] text-emerald-400/60 mt-1 font-bold">Valid until {new Date(cert.expiryDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button className="text-slate/40 hover:text-emerald-400 transition-colors">
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Standard T&C */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group opacity-60 hover:opacity-100 transition-opacity">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate uppercase tracking-widest leading-none">General Terms</p>
                                            <p className="text-[9px] text-slate/40 mt-1">E3 Rental Standard Policy 2024</p>
                                        </div>
                                    </div>
                                    <button className="text-slate/20">
                                        <CloudDownload className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {booking.product?.installationGuides && booking.product.installationGuides.length > 0 && (
                            <div className="mt-10 pt-10 border-t border-white/5">
                                <h4 className="text-[9px] font-black text-slate uppercase tracking-[0.3em] mb-6 mb-6">Technical Manuals</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {booking.product.installationGuides.map((guide: any) => (
                                        <button key={guide.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 text-left group hover:bg-white/[0.04]">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{guide.guideType} Guide</span>
                                            <ChevronRight className="w-4 h-4 text-slate group-hover:translate-x-1 group-hover:text-gold transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}
