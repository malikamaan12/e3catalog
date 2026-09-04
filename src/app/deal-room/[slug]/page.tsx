"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
    ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Clock, Calendar, 
    FileText, ArrowRight, Check, X, RefreshCw, Layers, Zap, Truck, Box,
    ChevronDown, ChevronUp, Lock, Send, Download, Phone, Mail 
} from "lucide-react";

interface DealRoomData {
    room: {
        id: string;
        title: string;
        slug: string;
        status: string;
        viewCount: number;
        expiresAt: string;
        allowAmendments: boolean;
        brandingConfig: {
            clientCompanyName?: string;
            primaryColorHex?: string;
            customWelcomeMessage?: string;
            clientLogoUrl?: string;
        };
    };
    booking: {
        id: string;
        projectName: string;
        customerName: string;
        customerEmail: string;
        startDate: string;
        endDate: string;
        totalPrice: number;
        notes?: string;
    };
    items: Array<{
        id: string;
        units: number;
        startDate: string;
        endDate: string;
        productName: string;
        pricePerDay: number;
        description?: string | null;
        dimensions?: string | null;
        weight?: string | null;
        powerRequirements?: string | null;
    }>;
    availableAddons: Array<{
        id: string;
        title: string;
        description: string;
        priceQar: number;
        category: string;
    }>;
    amendments: Array<{
        id: string;
        requestedChanges: any[];
        proposedSubtotal: number;
        status: string;
        clientComment?: string;
        createdAt: string;
    }>;
}

export default function DealRoomPage() {
    const params = useParams();
    const slug = (params?.slug as string) || "";

    const [data, setData] = useState<DealRoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
    const [expandedItemSpecs, setExpandedItemSpecs] = useState<Set<string>>(new Set());
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [signSuccess, setSignSuccess] = useState(false);

    // E-Sign Form
    const [signerName, setSignerName] = useState("");
    const [signerTitle, setSignerTitle] = useState("Head of Events & Production");

    // Amendment Form
    const [amendmentText, setAmendmentText] = useState("");
    const [amendmentSent, setAmendmentSent] = useState(false);

    const loadDealRoom = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/deal-rooms/${slug}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                if (json.room.status === "accepted") {
                    setSignSuccess(true);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDealRoom();
    }, [slug]);

    const toggleAddon = (id: string) => {
        setSelectedAddons(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleItemSpec = (id: string) => {
        setExpandedItemSpecs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Digital Acceptance & E-Signature
    const handleSignProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signerName || !signerTitle) return;

        try {
            setSubmitting(true);
            const res = await fetch(`/api/deal-rooms/${slug}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signerName,
                    signerTitle,
                    signatureDataUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjx0ZXh0IHk9IjI1IiBmb250LWZhbWlseT0iQ3Vyc2l2ZSI+U2lnbmVkPC90ZXh0Pjwvc3ZnPg==",
                    selectedAddonIds: Array.from(selectedAddons),
                }),
            });

            if (res.ok) {
                setSignSuccess(true);
                setIsSignModalOpen(false);
                await loadDealRoom();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Submit Digital Amendment
    const handleSendAmendment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amendmentText) return;

        try {
            setSubmitting(true);
            const res = await fetch(`/api/deal-rooms/${slug}/amend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestedChanges: [{ text: amendmentText }],
                    clientComment: amendmentText,
                }),
            });

            if (res.ok) {
                setAmendmentSent(true);
                setTimeout(() => {
                    setIsAmendModalOpen(false);
                    setAmendmentSent(false);
                    setAmendmentText("");
                }, 2000);
                await loadDealRoom();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white">
                <RefreshCw className="w-8 h-8 text-[var(--color-gold)] animate-spin mb-4" />
                <p className="text-xs font-black tracking-widest uppercase text-[var(--color-slate)]">
                    Loading Secure Executive Proposal Deal Room...
                </p>
            </div>
        );
    }

    const { room, booking, items, availableAddons, amendments } = data;
    const isAccepted = room.status === "accepted" || signSuccess;

    // Calculate dynamic pricing
    const baseTotal = booking?.totalPrice || items.reduce((s, it) => s + (it.pricePerDay * it.units), 0);
    const addonsTotal = Array.from(selectedAddons).reduce((sum, aId) => {
        const addon = availableAddons.find(a => a.id === aId);
        return sum + (addon ? addon.priceQar : 0);
    }, 0);
    const grandTotal = baseTotal + addonsTotal;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased pb-24">
            {/* Top Luxury Client Header */}
            <header className="border-b border-white/10 bg-neutral-900/60 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">E3 Live Rentals</span>
                                <span className="text-[10px] text-[var(--color-slate)]">•</span>
                                <span className="text-xs font-bold text-white tracking-wide">
                                    {room.brandingConfig?.clientCompanyName || booking?.customerName || "Enterprise Partner"}
                                </span>
                            </div>
                            <h1 className="text-sm font-black text-white uppercase tracking-wider line-clamp-1">
                                {room.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isAccepted ? (
                            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 className="w-4 h-4" /> Signed & Confirmed
                            </span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[var(--color-slate)] flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Active Proposal
                                </span>
                                <button
                                    onClick={() => setIsSignModalOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--color-gold)]/20 flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" /> Accept Proposal
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Proposal Container */}
            <main className="max-w-6xl mx-auto px-4 pt-8 flex flex-col gap-8">
                {/* Welcome Card */}
                <div className="glass rounded-3xl border border-white/10 p-6 md:p-8 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex flex-col gap-3 relative overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">
                        <ShieldCheck className="w-4 h-4" /> Official Technical Specification & Production Quotation
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                        {booking?.projectName || "VIP Production & Staging Package"}
                    </h2>
                    <p className="text-sm text-[var(--color-slate)] max-w-3xl leading-relaxed">
                        {room.brandingConfig?.customWelcomeMessage || "Review your reserved event equipment specifications, configure optional on-site technical crew and logistics add-ons, and execute digital agreement sign-off below."}
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-white/10 text-xs font-mono text-[var(--color-slate)]">
                        <div>Dates: <span className="text-white font-bold">{new Date(booking.startDate).toLocaleDateString()} — {new Date(booking.endDate).toLocaleDateString()}</span></div>
                        <div>Venue: <span className="text-white font-bold">{booking.notes || "Doha, Qatar"}</span></div>
                        <div>Client Representative: <span className="text-white font-bold">{booking.customerName}</span></div>
                    </div>
                </div>

                {/* Section 1: Reserved Equipment Manifest & Tech Specs */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Box className="w-4 h-4 text-amber-400" /> Reserved Equipment Package
                            </h3>
                            <p className="text-xs text-[var(--color-slate)]">
                                Certified touring inventory with complete electrical and staging specifications
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {items.map((it) => {
                            const isSpecOpen = expandedItemSpecs.has(it.id);

                            return (
                                <div
                                    key={it.id}
                                    className="glass rounded-2xl border border-white/10 p-5 flex flex-col gap-3 hover:border-white/20 transition-all shadow-md"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                                                <Layers className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-white">{it.productName}</h4>
                                                <p className="text-xs text-[var(--color-slate)] font-mono mt-0.5">
                                                    Units: <span className="text-white font-bold">{it.units}</span> • Daily Rate: <span className="text-amber-300">QAR {it.pricePerDay}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right font-mono">
                                                <p className="text-base font-black text-white">QAR {(it.pricePerDay * it.units).toLocaleString()}</p>
                                                <p className="text-[10px] text-[var(--color-slate)]">Line Subtotal</p>
                                            </div>
                                            <button
                                                onClick={() => toggleItemSpec(it.id)}
                                                className="p-2 rounded-xl glass border border-white/10 text-[var(--color-slate)] hover:text-white transition-all"
                                                title="Toggle Tech Specs"
                                            >
                                                {isSpecOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable Technical Specification Sheet */}
                                    {isSpecOpen && (
                                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono animate-fade-in">
                                            <div>
                                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider block font-sans font-bold">
                                                    Power Requirements
                                                </span>
                                                <span className="text-amber-300 font-bold">{it.powerRequirements || "220V 50Hz / 16A CEE"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider block font-sans font-bold">
                                                    Physical Dimensions
                                                </span>
                                                <span className="text-white">{it.dimensions || "Standard Flight Case Spec"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider block font-sans font-bold">
                                                    Unit Weight
                                                </span>
                                                <span className="text-white">{it.weight || "32 kg"}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Interactive Optional Add-Ons */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[var(--color-gold)]" /> Customized Production & Logistics Add-Ons
                        </h3>
                        <p className="text-xs text-[var(--color-slate)]">
                            Select optional certified engineering labor, flight casing, or insurance for your event
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableAddons.map((addon) => {
                            const isSelected = selectedAddons.has(addon.id);

                            return (
                                <div
                                    key={addon.id}
                                    onClick={() => !isAccepted && toggleAddon(addon.id)}
                                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                                        isSelected 
                                            ? "bg-amber-500/10 border-[var(--color-gold)] shadow-xl shadow-[var(--color-gold)]/10" 
                                            : "glass border-white/10 hover:border-white/20 bg-white/[0.01]"
                                    } ${isAccepted ? "cursor-default" : ""}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider font-bold">
                                                {addon.category}
                                            </span>
                                            <h4 className="font-bold text-sm text-white">{addon.title}</h4>
                                            <p className="text-xs text-[var(--color-slate)] leading-relaxed mt-1">
                                                {addon.description}
                                            </p>
                                        </div>

                                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                            isSelected 
                                                ? "bg-[var(--color-gold)] border-[var(--color-gold)] text-[var(--color-navy)]" 
                                                : "border-white/20 bg-black/40"
                                        }`}>
                                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs font-mono">
                                        <span className="text-[var(--color-slate)]">Commercial Add-on:</span>
                                        <span className="font-black text-amber-300 text-sm">
                                            + QAR {addon.priceQar.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 3: Dynamic Price Summary & Sign-off CTA */}
                <div className="glass rounded-3xl border border-[var(--color-gold)]/40 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-white/[0.02] to-amber-500/5 shadow-2xl">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-mono text-[var(--color-slate)] uppercase tracking-wider font-bold">
                            Total Quotation Value
                        </span>
                        <div className="text-3xl md:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                            QAR {grandTotal.toLocaleString()}
                            <span className="text-xs font-normal text-[var(--color-slate)] font-sans">
                                (Base: QAR {baseTotal.toLocaleString()} + Addons: QAR {addonsTotal.toLocaleString()})
                            </span>
                        </div>
                        <p className="text-xs text-[var(--color-slate)]">
                            Includes Qatar logistics, venue dispatch clearance, and tour-grade preparation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {!isAccepted && (
                            <button
                                onClick={() => setIsAmendModalOpen(true)}
                                className="px-5 py-3 rounded-2xl glass border border-white/20 text-xs font-black uppercase tracking-wider text-white hover:bg-white/5 transition-all"
                            >
                                Request Amendment
                            </button>
                        )}

                        {isAccepted ? (
                            <div className="px-6 py-3.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Digitally Signed & Locked
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsSignModalOpen(true)}
                                className="px-8 py-3.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[var(--color-gold)]/20 flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Accept & E-Sign Proposal
                            </button>
                        )}
                    </div>
                </div>

                {/* Previous Amendments Log */}
                {amendments.length > 0 && (
                    <div className="glass rounded-2xl border border-white/10 p-5 flex flex-col gap-3 text-xs">
                        <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                            Proposal Amendment Log ({amendments.length})
                        </h4>
                        <div className="divide-y divide-white/5">
                            {amendments.map((am) => (
                                <div key={am.id} className="py-2.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">{am.clientComment || "Modification requested"}</p>
                                        <p className="text-[10px] text-[var(--color-slate)] font-mono">{new Date(am.createdAt).toLocaleString()}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        {am.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* E-Sign Modal */}
            {isSignModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={handleSignProposal} className="glass rounded-3xl border border-white/10 w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Execute Digital Sign-Off
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsSignModalOpen(false)}
                                className="p-1 rounded-lg text-[var(--color-slate)] hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-xs">
                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Authorized Signer Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Dr. Sheikh Saud Al-Thani"
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Official Title / Role</label>
                                <input
                                    type="text"
                                    required
                                    value={signerTitle}
                                    onChange={e => setSignerTitle(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                                />
                            </div>

                            {/* Digital Signature Pad Box */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Digital Signature Certificate</label>
                                <div className="h-24 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center p-3 text-center">
                                    <span className="font-serif italic text-2xl text-[var(--color-gold)]">
                                        {signerName || "Your Signature"}
                                    </span>
                                </div>
                                <p className="text-[10px] text-[var(--color-slate)] text-center mt-1">
                                    Legally binding electronic signature under State of Qatar e-Commerce & Transactions Law No. 16 of 2010.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsSignModalOpen(false)}
                                className="px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5"
                            >
                                <Check className="w-4 h-4" /> Sign & Confirm (QAR {grandTotal.toLocaleString()})
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Request Amendment Modal */}
            {isAmendModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={handleSendAmendment} className="glass rounded-3xl border border-white/10 w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Request Digital Amendment
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAmendModalOpen(false)}
                                className="p-1 rounded-lg text-[var(--color-slate)] hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {amendmentSent ? (
                            <div className="p-6 text-center flex flex-col items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="w-8 h-8" />
                                <p className="text-xs font-bold">Amendment submitted to your E3 Production Manager!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 text-xs">
                                <p className="text-[var(--color-slate)]">
                                    Specify equipment quantity changes, schedule modifications, or special venue requests:
                                </p>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="e.g. Please add 2 additional wireless hand-held microphones and adjust call time to 12:00 PM."
                                    value={amendmentText}
                                    onChange={e => setAmendmentText(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[var(--color-gold)]"
                                />

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAmendModalOpen(false)}
                                        className="px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" /> Submit Amendment
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}
