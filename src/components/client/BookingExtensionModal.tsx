"use client";

import React, { useState, useEffect } from "react";
import { 
    CalendarPlus, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles, 
    X, 
    Loader2, 
    ArrowRight,
    ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

interface BookingExtensionModalProps {
    bookingId: string;
    productName: string;
    currentEndDate: string;
    units: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function BookingExtensionModal({
    bookingId,
    productName,
    currentEndDate,
    units,
    isOpen,
    onClose,
    onSuccess,
}: BookingExtensionModalProps) {
    const router = useRouter();
    const [selectedDays, setSelectedDays] = useState<number>(1);
    const [reason, setReason] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewError, setPreviewError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Fetch live quote and availability on days change
    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        async function fetchPreview() {
            setPreviewLoading(true);
            setPreviewError("");
            try {
                const res = await fetch(`/api/dashboard/bookings/${bookingId}/extend?days=${selectedDays}`);
                const data = await res.json();
                if (isCancelled) return;
                if (!res.ok) {
                    setPreviewError(data.error || "Failed to calculate extension preview.");
                    setPreviewData(null);
                } else {
                    setPreviewData(data);
                }
            } catch (err: any) {
                if (!isCancelled) {
                    setPreviewError(err.message || "Network error.");
                    setPreviewData(null);
                }
            } finally {
                if (!isCancelled) setPreviewLoading(false);
            }
        }

        fetchPreview();
        return () => {
            isCancelled = true;
        };
    }, [isOpen, bookingId, selectedDays]);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!previewData?.available) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/dashboard/bookings/${bookingId}/extend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    additionalDays: selectedDays,
                    reason: reason || "On-site live production rental extension"
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setPreviewError(data.error || "Failed to confirm extension.");
            } else {
                setSubmitSuccess(true);
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    router.refresh();
                    onClose();
                }, 1600);
            }
        } catch (err: any) {
            setPreviewError(err.message || "Failed to submit extension.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass bg-[var(--color-navy)] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--color-slate)] hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {submitSuccess ? (
                    <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">
                            Rental Extension Confirmed!
                        </h3>
                        <p className="text-xs text-[var(--color-slate)] max-w-sm mx-auto">
                            Your booking has been extended by +{selectedDays} day(s). Warehouse and dispatch schedules have been automatically synchronized.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                                <CalendarPlus className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">
                                    Extend Rental On-Site
                                </h3>
                                <p className="text-[10px] text-[var(--color-gold)] uppercase tracking-widest font-black">
                                    Instant Availability Re-Check & Prorated Billing
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-[var(--color-slate)] mt-2 mb-6 leading-relaxed">
                            Extend the active rental window for <span className="text-[var(--color-warm-white)] font-bold">{productName} ({units} Units)</span> without returning equipment or placing a separate booking.
                        </p>

                        {/* Quick Presets */}
                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-2">
                                Select Extension Duration
                            </label>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {[1, 2, 3].map((days) => (
                                    <button
                                        key={days}
                                        type="button"
                                        onClick={() => setSelectedDays(days)}
                                        className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                                            selectedDays === days
                                                ? "bg-[var(--color-gold)] text-[var(--color-navy)] border-[var(--color-gold)] shadow-lg shadow-gold/20"
                                                : "bg-white/[0.03] border-white/10 text-[var(--color-slate)] hover:text-white hover:bg-white/[0.06]"
                                        }`}
                                    >
                                        +{days * 24}h ({days} Day{days > 1 ? "s" : ""})
                                    </button>
                                ))}
                            </div>

                            {/* Custom Slider / Input */}
                            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                                <span className="text-[10px] text-[var(--color-slate)] font-bold uppercase shrink-0">Custom Days:</span>
                                <input 
                                    type="range"
                                    min="1"
                                    max="14"
                                    value={selectedDays}
                                    onChange={(e) => setSelectedDays(parseInt(e.target.value, 10))}
                                    className="flex-1 accent-[var(--color-gold)] cursor-pointer"
                                />
                                <span className="text-xs font-black text-[var(--color-gold)] w-8 text-right font-mono">
                                    +{selectedDays}d
                                </span>
                            </div>
                        </div>

                        {/* Live Calculation & Conflict Verification */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 mb-6 space-y-4">
                            {previewLoading ? (
                                <div className="flex items-center justify-center py-6 gap-2 text-xs text-[var(--color-gold)] font-bold">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Auditing calendar availability...</span>
                                </div>
                            ) : previewError ? (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{previewError}</span>
                                </div>
                            ) : previewData ? (
                                <>
                                    {/* Date Shift */}
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-[var(--color-slate)] uppercase tracking-widest font-black">Current End Date</span>
                                            <span className="font-bold text-[var(--color-warm-white)] mt-0.5">{previewData.formattedOriginalEndDate}</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-[var(--color-gold)]" />
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] text-[var(--color-slate)] uppercase tracking-widest font-black">New End Date</span>
                                            <span className="font-bold text-[var(--color-gold)] mt-0.5">{previewData.formattedNewEndDate}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/5" />

                                    {/* Availability Status */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-[var(--color-slate)]">Stock Availability:</span>
                                        {previewData.available ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Guaranteed Available
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                                                <AlertCircle className="w-3.5 h-3.5" /> Overlap Conflict
                                            </span>
                                        )}
                                    </div>

                                    {/* Cost Breakdown */}
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-black">Prorated Extension Fee</p>
                                            <p className="text-[9px] text-[var(--color-slate)] opacity-60">
                                                {units} units × {selectedDays} day(s) @ QAR {previewData.dailyRate}/day
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-[var(--color-gold)]">
                                                QAR {previewData.additionalAmount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Optional Reason */}
                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                Operational Reason (Optional)
                            </label>
                            <input 
                                type="text"
                                placeholder="e.g. Shooting overtime, venue booking extended"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-[var(--color-slate)] hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={submitting || previewLoading || !previewData?.available}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Confirming...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>Confirm & Extend Booking</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
