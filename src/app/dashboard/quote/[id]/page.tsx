"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Edit2, Loader2, Package, Trash2,
    CheckCircle, AlertTriangle, Download, CheckCircle2,
    Clock, FileText, XCircle, MessageCircle
} from "lucide-react";
import ClientChatWindow from "@/components/chat/ClientChatWindow";

interface QuoteItem {
    id: string;
    productId: string;
    name: string;
    thumbnailUrl: string | null;
    pricePerDay: number;
    showPrice: boolean;
    addedByAdmin: boolean;
    adminItemNote: string | null;
    units: number;
    startDate: string;
    endDate: string;
    days: number;
    lineBase: number;
}

interface QuoteDetail {
    id: string;
    projectName: string;
    vendorName: string;
    status: string;
    createdAt: string;
    notes: string | null;
    adminNotes: string | null;
    clientNotes: string | null;
    items: QuoteItem[];
    financials: {
        baseRental: number;
        discountPercent: number;
        discountAmount: number;
        logisticsCost: number;
        laborCost: number;
        additionalChargeName: string | null;
        additionalChargeAmount: number;
        additionalChargeType: string | null;
        extraCharge: number;
        subtotal: number | string;
        grandTotal: number | string;
    };
}

const STATUS_INFO: Record<string, { label: string; color: string; desc: string; icon: any }> = {
    pending_quote: { label: "Awaiting Quote", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", desc: "We are calculating your shipping and labor costs.", icon: Clock },
    request: { label: "Awaiting Quote", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", desc: "We are reviewing your request and preparing your quote.", icon: Clock },
    quote_sent: { label: "Review Quote", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", desc: "Please review the pricing and accept to lock in your rental.", icon: FileText },
    changes_requested: { label: "Changes Requested", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", desc: "We are reviewing your revision request.", icon: AlertTriangle },
    quote_accepted: { label: "Accepted", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", desc: "Your quote is accepted. Awaiting final confirmation.", icon: CheckCircle2 },
    approved: { label: "Confirmed Booking", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", desc: "Your booking is locked in and confirmed.", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/20", desc: "This quotation request was cancelled.", icon: XCircle },
};

export default function DashboardQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;
    const router = useRouter();

    const [quote, setQuote] = useState<QuoteDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [showRevisionBox, setShowRevisionBox] = useState(false);
    const [revisionNote, setRevisionNote] = useState("");

    // Edit Item State
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editUnits, setEditUnits] = useState<number>(0);
    const [editStartDate, setEditStartDate] = useState<string>("");
    const [editEndDate, setEditEndDate] = useState<string>("");

    const loadQuote = async () => {
        try {
            const res = await fetch(`/api/dashboard/quotes/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load quote");
            setQuote(data);
            if (data.clientNotes) setRevisionNote(data.clientNotes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuote();
        fetch("/api/auth/me")
            .then(r => r.json())
            .then(d => { if (d.user) setCurrentUser(d.user); })
            .catch(() => {});
    }, [id]);

    const handleQuoteAction = async (actionStatus: string, notes?: string) => {
        if (!confirm(`Are you sure you want to change the status to: ${actionStatus}?`)) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/dashboard/quotes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: actionStatus, clientNotes: notes }),
            });
            if (!res.ok) throw new Error("Failed to process action");
            await loadQuote();
            setShowRevisionBox(false);
        } catch (err) {
            console.error(err);
            alert("Error requesting action. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateItem = async (itemId: string) => {
        if (editUnits < 1) return alert("Units must be at least 1.");
        setProcessing(true);
        try {
            const res = await fetch(`/api/dashboard/bookings/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ units: editUnits, startDate: editStartDate, endDate: editEndDate }),
            });
            if (!res.ok) throw new Error("Failed to update item");
            setEditingItem(null);
            await loadQuote();
        } catch (err) {
            console.error(err);
            alert("Failed to update unit count.");
        } finally {
            setProcessing(false);
        }
    };

    const handleAcceptItem = async (itemId: string) => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/dashboard/bookings/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ addedByAdmin: false }),
            });
            if (!res.ok) throw new Error("Failed to accept item");
            await loadQuote();
        } catch (err) {
            console.error(err);
            alert("Failed to accept suggestion.");
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!confirm("Are you sure you want to remove this item from your quote?")) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/dashboard/bookings/${itemId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete item");
            if (quote?.items.length === 1) { router.push("/dashboard"); return; }
            await loadQuote();
        } catch (err) {
            console.error(err);
            alert("Failed to remove item.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 text-[var(--color-gold)] animate-spin" />
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-2">Quote Not Found</h2>
                <p className="text-[var(--color-slate)] mb-6">{error || "Could not load project data."}</p>
                <Link href="/dashboard" className="btn-primary">Return to Dashboard</Link>
            </div>
        );
    }

    const info = STATUS_INFO[quote.status] || { label: quote.status, color: "text-[var(--color-slate)] bg-white/5 border-white/10", desc: "", icon: Package };
    const StatusIcon = info.icon;
    const canEditItems = ["request", "changes_requested"].includes(quote.status) || showRevisionBox;
    const canAcceptOrRevise = quote.status === "quote_sent";
    const canBook = quote.status === "quote_accepted";
    const canCancel = !["approved", "booked", "cancelled"].includes(quote.status);

    return (
        <div className="pb-16">
            {/* ── Back nav ── */}
            <div className="mb-6">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Dashboard
                </Link>
            </div>

            {/* ── Title & Status ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-2 flex flex-wrap items-center gap-3">
                        <span className="truncate">{quote.projectName}</span>
                        <a
                            href={`/api/pdf/quote/${quote.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-sm font-medium hover:bg-[var(--color-gold)] hover:text-[var(--color-navy)] transition-colors shrink-0"
                        >
                            <Download className="h-4 w-4" />
                            PDF Quote
                        </a>
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm">
                        Vendor: <span className="text-[var(--color-gold)] font-semibold">{quote.vendorName}</span> · 
                        Submitted on {new Date(quote.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
                <div className="shrink-0">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border ${info.color} mb-2`}>
                        <StatusIcon className="h-4 w-4" />
                        {info.label}
                    </div>
                    {info.desc && <p className="text-xs text-[var(--color-slate)] max-w-xs">{info.desc}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: Equipment List + Notes ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Equipment List */}
                    <div className="glass border border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-semibold text-[var(--color-warm-white)]">Equipment List</h3>
                            <span className="text-sm text-[var(--color-slate)]">{quote.items.length} Item{quote.items.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {quote.items.map(item => (
                                <div key={item.id} className={`p-5 transition-colors flex flex-col sm:flex-row gap-5 group ${item.addedByAdmin ? "bg-amber-500/5 border-l-2 border-amber-500/30" : "hover:bg-white/2"}`}>
                                    {/* Thumbnail */}
                                    <div className="w-18 h-18 shrink-0 bg-[var(--color-navy-lighter)] rounded-xl overflow-hidden hidden sm:block" style={{ width: "72px", height: "72px" }}>
                                        {item.thumbnailUrl ? (
                                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.thumbnailUrl})` }} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="h-7 w-7 text-[var(--color-slate)]" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex flex-col gap-1.5 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Link href={`/catalog/${item.productId}`} className="font-semibold text-[var(--color-gold)] hover:underline truncate">
                                                        {item.name}
                                                    </Link>
                                                    {item.addedByAdmin && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                                            Admin Suggested
                                                        </span>
                                                    )}
                                                </div>
                                                {item.addedByAdmin && item.adminItemNote && (
                                                    <div className="text-xs text-amber-300/80 p-2 rounded-lg bg-amber-500/10 border border-amber-500/10 italic">
                                                        Note: {item.adminItemNote}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price */}
                                            {item.showPrice && quote.status !== "request" ? (
                                                <div className="text-right shrink-0">
                                                    <div className="text-[var(--color-warm-white)] font-semibold">{item.lineBase.toLocaleString()} QAR</div>
                                                    <div className="text-xs text-[var(--color-slate)]">{item.pricePerDay.toLocaleString()} QAR/day</div>
                                                </div>
                                            ) : (
                                                <div className="shrink-0">
                                                    <span className="text-xs text-[var(--color-slate)] italic px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                                                        {quote.status === "request" ? "Pending quote" : "Price on request"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs text-[var(--color-slate)] mt-2 flex flex-wrap gap-4">
                                            <div><span className="text-[var(--color-slate)]/60">Dates:</span> {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}</div>
                                            <div><span className="text-[var(--color-slate)]/60">Duration:</span> {item.days} Days</div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            {editingItem === item.id ? (
                                                <div className="flex flex-wrap gap-2 items-end bg-[var(--color-navy-lighter)] p-3 rounded-xl border border-[var(--color-gold)]/30 w-full">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider">Qty</label>
                                                        <input
                                                            type="number" min="1"
                                                            value={editUnits}
                                                            onChange={(e) => setEditUnits(Number(e.target.value))}
                                                            className="w-16 px-2 py-1.5 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider">Start Date</label>
                                                        <input
                                                            type="date"
                                                            value={editStartDate}
                                                            onChange={(e) => setEditStartDate(e.target.value)}
                                                            className="px-2 py-1.5 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider">End Date</label>
                                                        <input
                                                            type="date"
                                                            value={editEndDate}
                                                            onChange={(e) => setEditEndDate(e.target.value)}
                                                            className="px-2 py-1.5 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex items-end gap-2 ml-auto mt-2">
                                                        <button onClick={() => setEditingItem(null)} className="text-xs text-[var(--color-slate)] hover:text-[var(--color-warm-white)] px-3 py-1.5 rounded-lg border border-white/10 transition-colors">Cancel</button>
                                                        <button onClick={() => handleUpdateItem(item.id)} disabled={processing} className="text-xs btn-primary !py-1.5 !px-4">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="text-sm font-medium text-[var(--color-warm-white)] px-3 py-1 bg-white/5 rounded-lg border border-white/8 inline-block">
                                                        Qty: {item.units}
                                                    </div>
                                                    {item.addedByAdmin && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleAcceptItem(item.id)}
                                                                disabled={processing}
                                                                className="text-[10px] font-bold px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1.5"
                                                            >
                                                                <CheckCircle className="h-3 w-3" />
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveItem(item.id)}
                                                                disabled={processing}
                                                                className="text-[10px] font-bold px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {canEditItems && editingItem !== item.id && !item.addedByAdmin && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem(item.id);
                                                            setEditUnits(item.units);
                                                            setEditStartDate(new Date(item.startDate).toISOString().split('T')[0]);
                                                            setEditEndDate(new Date(item.endDate).toISOString().split('T')[0]);
                                                        }}
                                                        className="text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors p-1"
                                                        title="Edit Details"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-[var(--color-slate)] hover:text-red-400 transition-colors p-1" title="Remove Item">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Admin Message */}
                    {quote.adminNotes && (
                        <div className="glass border border-[var(--color-gold)]/25 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-gold)] opacity-5 blur-3xl rounded-full pointer-events-none" />
                            <h3 className="font-semibold text-[var(--color-gold)] mb-3 text-xs uppercase tracking-widest">Message from Admin</h3>
                            <div className="text-[var(--color-warm-white)] text-sm leading-relaxed p-4 bg-[var(--color-navy-lighter)] rounded-xl border border-white/5 whitespace-pre-wrap">
                                {quote.adminNotes}
                            </div>
                        </div>
                    )}

                    {/* Client Revision Notes */}
                    {quote.clientNotes && (
                        <div className="glass border border-white/8 rounded-2xl p-6">
                            <h3 className="font-semibold text-[var(--color-slate)] mb-3 text-xs uppercase tracking-widest">Your Revision Notes</h3>
                            <div className="text-[var(--color-warm-white)] text-sm leading-relaxed italic border-l-2 border-white/10 pl-4">
                                "{quote.clientNotes}"
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: Invoice Summary & Actions ── */}
                <div className="space-y-5">
                    <div className="glass border border-white/10 rounded-2xl p-6 sticky top-24">
                        {/* Financial Summary */}
                        {quote.status === "request" || quote.status === "changes_requested" ? (
                            <div className="text-center py-8">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--color-navy-lighter)] flex items-center justify-center">
                                    <Clock className="h-7 w-7 text-[var(--color-slate)]" />
                                </div>
                                <p className="text-[var(--color-warm-white)] font-semibold text-sm mb-2">Pricing Pending</p>
                                <p className="text-[var(--color-slate)] text-xs leading-relaxed">
                                    Our team is reviewing your request and preparing an official quote with full pricing.
                                    You will be notified when it is ready.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex justify-between text-[var(--color-slate)]">
                                    <span>Base Hardware Rental</span>
                                    <span className="text-[var(--color-warm-white)] font-medium">
                                        {typeof quote.financials.baseRental === "number" ? quote.financials.baseRental.toLocaleString() : quote.financials.baseRental} 
                                        {typeof quote.financials.baseRental === "number" && " QAR"}
                                    </span>
                                </div>
                                {quote.financials.discountPercent > 0 && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span>Discount ({quote.financials.discountPercent}%)</span>
                                        <span>-{quote.financials.discountAmount.toLocaleString()} QAR</span>
                                    </div>
                                )}
                                {quote.financials.logisticsCost > 0 && (
                                    <div className="flex justify-between text-[var(--color-slate)]">
                                        <span>Logistics & Transport</span>
                                        <span className="text-[var(--color-warm-white)] font-medium">{quote.financials.logisticsCost.toLocaleString()} QAR</span>
                                    </div>
                                )}
                                {quote.financials.laborCost > 0 && (
                                    <div className="flex justify-between text-[var(--color-slate)]">
                                        <span>Labor & Setup</span>
                                        <span className="text-[var(--color-warm-white)] font-medium">{quote.financials.laborCost.toLocaleString()} QAR</span>
                                    </div>
                                )}
                                {quote.financials.extraCharge > 0 && (
                                    <div className="flex justify-between text-[var(--color-gold)]">
                                        <span>{quote.financials.additionalChargeName || "Additional Charge"}</span>
                                        <span className="font-medium">+{quote.financials.extraCharge.toLocaleString()} QAR</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {quote.status !== "request" && quote.status !== "changes_requested" && (
                            <div className="flex justify-between items-end pt-4 border-t border-white/8 mb-6">
                                <span className="text-[var(--color-warm-white)] font-bold">Total Quote</span>
                                <span className="text-2xl font-bold text-[var(--color-gold)]">
                                    {typeof quote.financials.grandTotal === "number" ? quote.financials.grandTotal.toLocaleString() : quote.financials.grandTotal} 
                                    {typeof quote.financials.grandTotal === "number" && <span className="text-sm font-bold ml-1">QAR</span>}
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {canAcceptOrRevise && (
                                <>
                                    {!showRevisionBox ? (
                                        <>
                                            <button
                                                onClick={() => handleQuoteAction("quote_accepted")}
                                                disabled={processing}
                                                className="w-full btn-primary py-3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,168,76,0.15)]"
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                                Accept Quote
                                            </button>
                                            <button
                                                onClick={() => setShowRevisionBox(true)}
                                                disabled={processing}
                                                className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-sm font-medium text-[var(--color-warm-white)] transition-all"
                                            >
                                                Request Revision / Changes
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-[var(--color-navy-lighter)] p-4 rounded-xl border border-white/10">
                                            <label className="block text-xs text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-2">Revision Notes</label>
                                            <textarea
                                                value={revisionNote}
                                                onChange={(e) => setRevisionNote(e.target.value)}
                                                placeholder="Specify what changes you need (e.g. longer rental, removing a specific item, budget issues)..."
                                                rows={4}
                                                className="w-full bg-[var(--color-surface)] border border-white/10 rounded-lg p-3 text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] outline-none resize-none mb-3"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowRevisionBox(false)} className="flex-1 py-2 text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors bg-white/5 rounded-lg">Cancel</button>
                                                <button onClick={() => handleQuoteAction("changes_requested", revisionNote)} disabled={processing} className="flex-1 btn-primary py-2 text-sm">Send Request</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {canBook && (
                                <button
                                    onClick={() => handleQuoteAction("booking_requested")}
                                    disabled={processing}
                                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,168,76,0.15)]"
                                >
                                    <CheckCircle className="h-5 w-5" />
                                    Confirm & Book Items
                                </button>
                            )}

                            {canCancel && (
                                <button
                                    onClick={() => handleQuoteAction("cancelled")}
                                    disabled={processing}
                                    className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-sm font-medium transition-all"
                                >
                                    Cancel Request Entirely
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {currentUser && quote && (
                <ClientChatWindow 
                    currentUser={currentUser} 
                    projects={[{
                        id: quote.id,
                        projectName: quote.projectName,
                        status: quote.status,
                        vendorName: quote.vendorName
                    }]} 
                />
            )}
        </div>
    );
}
