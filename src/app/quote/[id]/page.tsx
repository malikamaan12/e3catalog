"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

interface QuoteDetail {
    id: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    notes: string | null; // Original request notes
    startDate: string;
    endDate: string;
    units: number;
    product: {
        name: string;
        pricePerDay: number;
        thumbnailUrl: string | null;
    };
    totalPrice: number | null;
    discount: number;
    logisticsCost: number;
    laborCost: number;
    additionalChargeName: string | null;
    additionalChargeAmount: number;
    additionalChargeType: string | null;
    adminNotes: string | null; // Message from Reyati to Client
    clientNotes: string | null; // Message from Client during negotiation
}

const STATUS_MESSAGES: Record<string, { title: string, desc: string, color: string }> = {
    quote_sent: { title: "Quote Ready for Review", desc: "Please review the pricing below and confirm your booking.", color: "text-[var(--color-gold)]" },
    changes_requested: { title: "Changes Requested", desc: "Our team is reviewing your requested changes.", color: "text-[var(--color-slate)]" },
    quote_accepted: { title: "Quote Accepted", desc: "Thank you! Our team will manually approve and block out this hardware.", color: "text-[var(--color-success)]" },
    approved: { title: "Booking Approved", desc: "Your equipment is reserved and confirmed for these dates.", color: "text-[var(--color-success)]" },
    booked: { title: "Equipment Dispatched", desc: "Your booking is currently active.", color: "text-[var(--color-success)]" }
};

export default function ClientQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;
    const [quote, setQuote] = useState<QuoteDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [clientMessage, setClientMessage] = useState("");
    const [showRevisionForm, setShowRevisionForm] = useState(false);

    useEffect(() => {
        fetch(`/api/quote/${id}`)
            .then(async (r) => {
                if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
                return r.json();
            })
            .then((data) => {
                setQuote(data);
                if (data.clientNotes) setClientMessage(data.clientNotes);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="min-h-screen pt-32 text-center text-[var(--color-slate)]">Loading Quote...</div>;

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-[family-name:var(--font-heading)] font-bold text-[var(--color-warm-white)] mb-4">Quote Unavailable</h1>
            <p className="text-[var(--color-slate)] max-w-md">{error}</p>
            <Link href="/" className="mt-8 btn-primary">Return Home</Link>
        </div>
    );

    if (!quote) return null;

    // Derived logic
    const calcDays = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    };

    const days = calcDays(quote.startDate, quote.endDate);
    const baseRental = quote.product.pricePerDay * quote.units * days;
    const discountAmount = baseRental * (quote.discount / 100);

    let extraCharge = 0;
    if (quote.additionalChargeAmount > 0) {
        switch (quote.additionalChargeType) {
            case "percent":
                extraCharge = (baseRental - discountAmount) * (quote.additionalChargeAmount / 100);
                break;
            case "per_unit":
                extraCharge = quote.additionalChargeAmount * quote.units;
                break;
            case "per_day":
                extraCharge = quote.additionalChargeAmount * days;
                break;
            case "fixed":
            default:
                extraCharge = quote.additionalChargeAmount;
                break;
        }
    }

    const subtotal = baseRental - discountAmount + quote.logisticsCost + quote.laborCost + extraCharge;
    const grandTotal = quote.totalPrice || subtotal; // Use locked total if exists

    const messageBlock = STATUS_MESSAGES[quote.status] || { title: "Quote Status Unknown", desc: "", color: "text-[var(--color-slate)]" };
    const canRespond = quote.status === "quote_sent";

    const handleAction = async (action: "accept" | "revise") => {
        if (action === "revise" && !clientMessage.trim()) {
            alert("Please include a message describing the changes you'd like.");
            return;
        }

        setSubmitting(true);
        const newStatus = action === "accept" ? "quote_accepted" : "changes_requested";

        try {
            await fetch(`/api/quote/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    ...(action === "revise" && { clientNotes: clientMessage })
                }),
            });
            setQuote({ ...quote, status: newStatus, clientNotes: action === 'revise' ? clientMessage : quote.clientNotes });
            setShowRevisionForm(false);
        } catch (err) {
            console.error("Failed to respond to quote:", err);
            alert("Something went wrong. Please try again or contact support.");
        }
        setSubmitting(false);
    };

    return (
        <>
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-4xl mx-auto px-6">

                    {/* Status Header */}
                    <div className="text-center mb-10">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold glass uppercase tracking-wider mb-4 border border-[var(--color-gold)] border-opacity-30">
                            Quote Ref: {quote.id.split("-")[0].toUpperCase()}
                        </span>
                        <h1 className={`font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold mb-3 ${messageBlock.color}`}>
                            {messageBlock.title}
                        </h1>
                        <p className="text-[var(--color-slate)]">{messageBlock.desc}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Summary Column */}
                        <div className="space-y-6">
                            <div className="card p-6">
                                <h3 className="font-semibold text-[var(--color-warm-white)] mb-4 border-b border-white/10 pb-2">Rental Hardware</h3>
                                <div className="flex gap-4 mb-4">
                                    <div className="w-16 h-16 shrink-0 rounded-lg bg-[var(--color-navy-lighter)] overflow-hidden">
                                        {quote.product.thumbnailUrl && (
                                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${quote.product.thumbnailUrl})` }} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-[var(--color-gold)]">{quote.product.name}</p>
                                        <p className="text-sm text-[var(--color-slate)] mt-1">{quote.units} Units</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-white/5 p-4 rounded-lg">
                                    <div>
                                        <span className="block text-xs text-[var(--color-slate)] mb-1">From</span>
                                        {quote.startDate}
                                    </div>
                                    <div>
                                        <span className="block text-xs text-[var(--color-slate)] mb-1">To</span>
                                        {quote.endDate}
                                    </div>
                                    <div className="col-span-2 text-center text-xs text-[var(--color-slate)] mt-2">
                                        {days} Day Period
                                    </div>
                                </div>
                            </div>

                            {(quote.adminNotes || quote.notes) && (
                                <div className="card p-6 border border-[var(--color-gold)] border-opacity-20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-gold)] opacity-5 blur-3xl rounded-full" />
                                    <h3 className="font-semibold text-[var(--color-warm-white)] mb-4 border-b border-white/10 pb-2 relative z-10">Project Details</h3>

                                    {quote.notes && (
                                        <div className="mb-4 relative z-10">
                                            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">
                                                <span className="w-4 h-px bg-white/20" /> Your Original Request
                                            </span>
                                            <p className="text-sm text-[var(--color-warm-white)] pl-6 border-l-2 border-white/10 italic">
                                                "{quote.notes}"
                                            </p>
                                        </div>
                                    )}

                                    {quote.adminNotes && (
                                        <div className="relative z-10">
                                            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-2 mt-6">
                                                <span className="w-4 h-px bg-[var(--color-gold)] opacity-30" /> Message from Reyati
                                            </span>
                                            <div className="p-4 bg-[var(--color-gold)] bg-opacity-5 rounded-lg border border-[var(--color-gold)] border-opacity-20 text-sm text-[var(--color-warm-white)]">
                                                {quote.adminNotes}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pricing Column */}
                        <div className="space-y-6">
                            <div className="glass rounded-xl p-6 md:p-8">
                                <h3 className="font-semibold text-[var(--color-warm-white)] mb-6 border-b border-[var(--color-border-subtle)] pb-4 tracking-wider uppercase text-sm">Official Quote</h3>

                                <div className="space-y-4 mb-6 text-sm">
                                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                        <span className="text-[var(--color-slate)]">Base Hardware Rental</span>
                                        <span className="text-[var(--color-warm-white)]">{baseRental.toLocaleString()} QAR</span>
                                    </div>

                                    {quote.discount > 0 && (
                                        <div className="flex justify-between items-center text-[var(--color-success)] pb-2 border-b border-white/5">
                                            <span>Partner Discount ({quote.discount}%)</span>
                                            <span>-{discountAmount.toLocaleString()} QAR</span>
                                        </div>
                                    )}

                                    {quote.logisticsCost > 0 && (
                                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                            <span className="text-[var(--color-slate)]">Logistics & Transport</span>
                                            <span className="text-[var(--color-warm-white)]">{quote.logisticsCost.toLocaleString()} QAR</span>
                                        </div>
                                    )}

                                    {quote.laborCost > 0 && (
                                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                            <span className="text-[var(--color-slate)]">Install & Dismantle Labor</span>
                                            <span className="text-[var(--color-warm-white)]">{quote.laborCost.toLocaleString()} QAR</span>
                                        </div>
                                    )}

                                    {extraCharge > 0 && (
                                        <div className="flex justify-between items-center pb-2 border-b border-white/5 font-medium text-[var(--color-gold)]">
                                            <span>{quote.additionalChargeName || "Additional Charge"}</span>
                                            <span>+{extraCharge.toLocaleString()} QAR</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-end pt-4 mb-8">
                                    <span className="text-[var(--color-warm-white)] font-bold text-lg">Total Due</span>
                                    <span className="text-3xl font-bold gradient-text-gold">{grandTotal.toLocaleString()} QAR</span>
                                </div>

                                {/* Call to Actions */}
                                {canRespond ? (
                                    <div className="space-y-4 pt-6 border-t border-[var(--color-gold)] border-opacity-20">
                                        {!showRevisionForm ? (
                                            <>
                                                <button
                                                    onClick={() => handleAction("accept")}
                                                    disabled={submitting}
                                                    className="w-full btn-primary bg-[var(--color-gold)] text-[var(--color-navy)] py-3.5 text-base shadow-[0_0_20px_rgba(207,181,59,0.3)] hover:shadow-[0_0_30px_rgba(207,181,59,0.5)] border-none"
                                                >
                                                    {submitting ? "Processing..." : "Accept & Proceed"}
                                                </button>
                                                <button
                                                    onClick={() => setShowRevisionForm(true)}
                                                    disabled={submitting}
                                                    className="w-full py-3 rounded-lg border border-white/10 hover:border-white/30 text-sm font-medium text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-all bg-white/5 hover:bg-white/10"
                                                >
                                                    Request Changes
                                                </button>
                                            </>
                                        ) : (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className="block text-sm font-medium text-[var(--color-warm-white)] mb-2">
                                                    What changes do you need?
                                                </label>
                                                <textarea
                                                    value={clientMessage}
                                                    onChange={(e) => setClientMessage(e.target.value)}
                                                    placeholder="E.g., Can we extend the rental by 1 day? Is there flexibility on the labor cost?"
                                                    rows={4}
                                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none resize-none mb-3"
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowRevisionForm(false)}
                                                        className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-all bg-white/5"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction("revise")}
                                                        disabled={submitting}
                                                        className="flex-1 btn-primary py-2.5"
                                                    >
                                                        {submitting ? "Sending..." : "Submit Revision"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pt-6 border-t border-[var(--color-gold)] border-opacity-20 text-center">
                                        <p className="text-sm font-medium text-white mb-2">Quote is Locked</p>
                                        <p className="text-xs text-[var(--color-slate)]">
                                            This quote has already been responded to. Please contact your account manager if you need further adjustments.
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>

                    </div>

                </div>
            </div>
            <Footer />
        </>
    );
}
