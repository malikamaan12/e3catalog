"use client";

import React, { useState, useRef } from "react";
import { 
    MapPin, ArrowRight, Check, X, Loader2, Sparkles, 
    AlertCircle, Layers, Barcode, CheckCircle2, Box
} from "lucide-react";

interface DirectedPutawayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPutawayComplete?: (unit: any) => void;
}

export default function DirectedPutawayModal({
    isOpen,
    onClose,
    onPutawayComplete,
}: DirectedPutawayModalProps) {
    const [assetInput, setAssetInput] = useState("");
    const [binInput, setBinInput] = useState("");
    const [loadingRecommendation, setLoadingRecommendation] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [recommendation, setRecommendation] = useState<any | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const assetRef = useRef<HTMLInputElement>(null);
    const binRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleLookup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const clean = assetInput.trim().toUpperCase();
        if (!clean) return;

        setLoadingRecommendation(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        setRecommendation(null);

        try {
            const res = await fetch(`/api/admin/warehouse/putaway?identifier=${encodeURIComponent(clean)}`);
            const data = await res.json();
            if (res.ok && data.unit) {
                setRecommendation(data);
                if (data.recommendedBin) {
                    setBinInput(data.recommendedBin.binCode);
                }
                setTimeout(() => binRef.current?.focus(), 100);
            } else {
                setErrorMessage(data.error || "Could not find item or calculate putaway bin.");
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to lookup putaway recommendation.");
        } finally {
            setLoadingRecommendation(false);
        }
    };

    const handleConfirm = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!recommendation?.unit || !binInput.trim()) return;

        setSubmitting(true);
        setErrorMessage(null);

        try {
            const res = await fetch("/api/admin/warehouse/putaway", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: recommendation.unit.id,
                    binCode: binInput.trim().toUpperCase(),
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessMessage(data.message);
                if (onPutawayComplete) onPutawayComplete(data.unit);
                // Reset for next item
                setAssetInput("");
                setBinInput("");
                setRecommendation(null);
                setTimeout(() => assetRef.current?.focus(), 200);
            } else {
                setErrorMessage(data.error || "Failed to confirm putaway location.");
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to save putaway location.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-[#0A0F1C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                Directed Putaway &amp; Smart Slotting
                            </h3>
                            <p className="text-xs text-slate-400">
                                Scan item $\rightarrow$ System prescribes optimal rack &amp; bin location
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Step 1: Scan Asset */}
                    <form onSubmit={handleLookup} className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                            Step 1: Scan Asset Barcode or RFID EPC
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Barcode className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    ref={assetRef}
                                    type="text"
                                    value={assetInput}
                                    onChange={(e) => setAssetInput(e.target.value.toUpperCase())}
                                    placeholder="e.g. E3-TRUSS-001 or scan transponder..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loadingRecommendation || !assetInput.trim()}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-500 hover:bg-sky-400 text-black disabled:opacity-40 transition-colors shrink-0"
                            >
                                {loadingRecommendation ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recommend"}
                            </button>
                        </div>
                    </form>

                    {/* Recommendation Card */}
                    {recommendation && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-sky-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            {/* Asset info */}
                            <div className="flex items-start justify-between border-b border-white/[0.06] pb-3">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Target Equipment</span>
                                    <div className="text-sm font-bold text-white">{recommendation.unit.productName}</div>
                                    <div className="text-xs font-mono text-slate-400">Tag: {recommendation.unit.assetTagCode}</div>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    recommendation.unit.conditionStatus === "excellent" || recommendation.unit.conditionStatus === "good"
                                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                        : "bg-red-500/10 text-red-300 border border-red-500/20"
                                }`}>
                                    {recommendation.unit.conditionStatus}
                                </span>
                            </div>

                            {/* Recommended Bin */}
                            {recommendation.recommendedBin ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-gold)]">
                                        <Sparkles className="w-4 h-4" />
                                        <span>Prescribed Storage Slot</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-mono font-black text-white">
                                                {recommendation.recommendedBin.binCode}
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 uppercase">
                                                {recommendation.recommendedBin.zoneName}
                                            </span>
                                        </div>

                                        {/* Breadcrumbs */}
                                        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                                            <span>Aisle: {recommendation.recommendedBin.aisle || "01"}</span>
                                            <span>&rsaquo;</span>
                                            <span>Rack: {recommendation.recommendedBin.rack || "A"}</span>
                                            <span>&rsaquo;</span>
                                            <span>Shelf: {recommendation.recommendedBin.shelf || "01"}</span>
                                            <span>&rsaquo;</span>
                                            <span>Bin: {recommendation.recommendedBin.bin || "01"}</span>
                                        </div>

                                        <p className="text-[11px] text-slate-400 italic">
                                            &ldquo;{recommendation.recommendedBin.reason}&rdquo;
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-amber-400">
                                    No designated bin available. Please assign a general warehouse location below.
                                </div>
                            )}

                            {/* Step 2: Confirm Bin */}
                            <form onSubmit={handleConfirm} className="space-y-3 pt-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                                    Step 2: Confirm Location (Scan Bin Barcode)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        ref={binRef}
                                        type="text"
                                        value={binInput}
                                        onChange={(e) => setBinInput(e.target.value.toUpperCase())}
                                        placeholder="Scan bin code to confirm..."
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting || !binInput.trim()}
                                        className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--color-gold)] text-black hover:brightness-110 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Confirm Slot
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
