"use client";

import React, { useState } from "react";
import { 
    AlertTriangle, 
    ShieldAlert, 
    DollarSign, 
    Wrench, 
    Download, 
    CheckCircle2, 
    X, 
    Loader2,
    FileText
} from "lucide-react";

interface DamageClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId?: string;
    unitId?: string;
    assetTag?: string;
    productName?: string;
    onClaimFiled?: () => void;
}

export function DamageClaimModal({
    isOpen,
    onClose,
    bookingId,
    unitId,
    assetTag,
    productName,
    onClaimFiled,
}: DamageClaimModalProps) {
    const [customBookingId, setCustomBookingId] = useState(bookingId || "");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState<"minor" | "moderate" | "severe" | "total_loss">("moderate");
    const [partsCost, setPartsCost] = useState<number>(350);
    const [laborCost, setLaborCost] = useState<number>(200);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [createdClaim, setCreatedClaim] = useState<any>(null);

    const totalClaim = (Number(partsCost) || 0) + (Number(laborCost) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveBookingId = bookingId || customBookingId;
        if (!effectiveBookingId) {
            setError("Booking ID is required to link the damage claim.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/warehouse/damage-claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: effectiveBookingId,
                    inventoryUnitId: unitId,
                    incidentDescription: description,
                    severity,
                    partsCost: Number(partsCost) || 0,
                    laborCost: Number(laborCost) || 0,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to file damage claim.");
            } else {
                setCreatedClaim(data.claim);
                if (onClaimFiled) onClaimFiled();
            }
        } catch (err: any) {
            setError(err.message || "Network error.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass bg-[var(--color-navy)] border border-red-500/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--color-slate)] hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {createdClaim ? (
                    <div className="py-8 text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white font-[family-name:var(--font-heading)]">
                                Claim #{createdClaim.claimNumber} Filed
                            </h3>
                            <p className="text-xs text-[var(--color-slate)] max-w-sm mx-auto mt-1">
                                Deductions executed against client security deposit. Remaining balance earmarked for refund.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[var(--color-slate)]">Total Assessed Damage:</span>
                                <span className="font-bold text-white">QAR {createdClaim.totalClaimAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-400">Deducted from Deposit:</span>
                                <span className="font-bold text-red-400">- QAR {createdClaim.amountDeducted?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-2">
                                <span className="text-emerald-400 font-bold">Client Refund Balance:</span>
                                <span className="font-black text-emerald-400">QAR {createdClaim.amountRefunded?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <a 
                                href={`/api/pdf/damage-claim/${createdClaim.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-gold/20"
                            >
                                <Download className="w-4 h-4" /> Download Official PDF Voucher
                            </a>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white font-[family-name:var(--font-heading)]">
                                    File Incident & Damage Claim
                                </h3>
                                <p className="text-[10px] text-red-400 uppercase tracking-widest font-black">
                                    Post-Return Deposit Retention & Assessment
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-[var(--color-slate)] mt-2 mb-6">
                            Damaged unit: <span className="text-white font-bold">{assetTag || "Selected Unit"}</span> · {productName || "Equipment"}
                        </p>

                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!bookingId && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Booking ID / Reference
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                                        value={customBookingId}
                                        onChange={(e) => setCustomBookingId(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-white outline-none focus:border-red-400 font-mono"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Incident Severity
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(["minor", "moderate", "severe", "total_loss"] as const).map((sev) => (
                                        <button
                                            key={sev}
                                            type="button"
                                            onClick={() => setSeverity(sev)}
                                            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                severity === sev 
                                                    ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                                                    : "bg-white/[0.02] border-white/10 text-[var(--color-slate)] hover:text-white"
                                            }`}
                                        >
                                            {sev.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Damage Audit Notes
                                </label>
                                <textarea 
                                    rows={3}
                                    placeholder="Describe physical damage, broken components, connector deformation, or fluid ingress observed during bump-out inspection..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-white outline-none focus:border-red-400"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Parts & Hardware (QAR)
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="10"
                                        value={partsCost}
                                        onChange={(e) => setPartsCost(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-white outline-none focus:border-red-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Technician Labor (QAR)
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="10"
                                        value={laborCost}
                                        onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-white outline-none focus:border-red-400"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                                <span className="text-xs text-[var(--color-slate)] font-bold">Total Damage Claim:</span>
                                <span className="text-xl font-black text-red-400">QAR {totalClaim.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-[var(--color-slate)] hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Filing Claim...</span>
                                        </>
                                    ) : (
                                        <span>File Claim & Settle Deposit</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
