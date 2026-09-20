"use client";

import React, { useState, useEffect } from "react";
import { 
    X, PackageCheck, AlertTriangle, CheckCircle2, 
    Layers, Search, Loader2, ShieldAlert, DollarSign,
    QrCode, Truck, RefreshCw
} from "lucide-react";

interface CaseContentItem {
    id: string;
    accessoryName: string;
    expectedQuantity: number;
    isPermanentChild: boolean;
    isVerifiedPacked: boolean;
    inventoryUnitId: string | null;
    assetTagCode: string | null;
    conditionStatus: string | null;
}

interface KitAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCaseId?: string;
    bookingId?: string;
    defaultMode?: "pack" | "return";
    onSuccess?: (result: any) => void;
}

export default function KitAuditModal({
    isOpen,
    onClose,
    initialCaseId,
    bookingId,
    defaultMode = "pack",
    onSuccess,
}: KitAuditModalProps) {
    const [mode, setMode] = useState<"pack" | "return">(defaultMode);
    const [searchQuery, setSearchQuery] = useState(initialCaseId || "");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [flightCase, setFlightCase] = useState<any | null>(null);
    const [contents, setContents] = useState<CaseContentItem[]>([]);
    const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
    const [penalties, setPenalties] = useState<Record<string, number>>({});
    const [resultData, setResultData] = useState<any | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialCaseId) {
            setSearchQuery(initialCaseId);
            fetchCaseDetails(initialCaseId);
        }
    }, [isOpen, initialCaseId]);

    const fetchCaseDetails = async (query: string) => {
        if (!query.trim()) return;
        setLoading(true);
        setErrorMessage(null);
        setResultData(null);

        try {
            const res = await fetch(`/api/admin/warehouse/kit-audit?query=${encodeURIComponent(query.trim())}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load flight case");

            setFlightCase(data.flightCase);
            setContents(data.contents || []);
            setPenalties(data.standardPenalties || {});

            // Auto-check all items if in pack mode
            const allIds = new Set<string>((data.contents || []).map((c: CaseContentItem) => c.id));
            setCheckedItemIds(allIds);
        } catch (err: any) {
            setErrorMessage(err.message);
            setFlightCase(null);
            setContents([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleItemCheck = (id: string) => {
        setCheckedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const calculateMissingPenalty = () => {
        if (mode !== "return") return 0;
        let total = 0;
        contents.forEach(item => {
            if (!checkedItemIds.has(item.id)) {
                total += penalties[item.accessoryName] || penalties["Default Missing Accessory"] || 200;
            }
        });
        return total;
    };

    const handleCommitAudit = async () => {
        if (!flightCase) return;
        setSubmitting(true);
        setErrorMessage(null);

        try {
            // Find scanned tags from checked items
            const scannedTags: string[] = [];
            contents.forEach(item => {
                if (checkedItemIds.has(item.id) && item.assetTagCode) {
                    scannedTags.push(item.assetTagCode);
                }
            });

            const res = await fetch("/api/admin/warehouse/kit-audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    flightCaseId: flightCase.id,
                    action: mode,
                    scannedTags,
                    bookingId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to commit audit");

            setResultData(data);
            if (onSuccess) onSuccess(data);
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const missingCount = contents.length - checkedItemIds.size;
    const totalPenalty = calculateMissingPenalty();

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#05070D] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                Flight Case & Kit Integrity Gate
                            </h2>
                            <p className="text-xs text-slate-400">
                                Verify accessories, prevent missing cables on stage, & auto-file claims.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex border-b border-white/[0.08] bg-black/40">
                    <button
                        type="button"
                        onClick={() => setMode("pack")}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            mode === "pack" 
                                ? "bg-purple-500/15 text-purple-300 border-b-2 border-purple-400" 
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <PackageCheck className="w-4 h-4" /> Outbound Pack Verification
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("return")}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            mode === "return" 
                                ? "bg-amber-500/15 text-amber-300 border-b-2 border-amber-400" 
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Truck className="w-4 h-4" /> Inbound Return Audit
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-5 border-b border-white/[0.06] bg-white/[0.01]">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Scan or enter Case # (e.g. FC-001) or Asset Tag..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && fetchCaseDetails(searchQuery)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchCaseDetails(searchQuery)}
                            disabled={loading || !searchQuery.trim()}
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Audit Case
                        </button>
                    </div>

                    {errorMessage && (
                        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                </div>

                {/* Case Info & Manifest */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {flightCase && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>{flightCase.name}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/20">
                                        {flightCase.caseNumber}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                    Tag: <span className="font-mono text-slate-300">{flightCase.assetTagCode}</span> &middot; Location: {flightCase.warehouseLocation || "Bay 01"}
                                </div>
                            </div>
                            <div className="text-right text-xs">
                                <div className="text-slate-400">Total Items</div>
                                <div className="text-sm font-bold text-white font-mono">{contents.length} Pieces</div>
                            </div>
                        </div>
                    )}

                    {/* Result Card after commit */}
                    {resultData && (
                        <div className={`p-4 rounded-xl border ${
                            resultData.isFullyPacked || resultData.missingItems?.length === 0
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                        }`}>
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Audit Committed Successfully ({resultData.action?.toUpperCase()})</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">
                                Verified: {resultData.verifiedCount} / {resultData.totalItems} items.
                                {resultData.missingItems?.length > 0 && (
                                    <span className="text-amber-400 block mt-1 font-semibold">
                                        Missing ({resultData.missingItems.length}): {resultData.missingItems.join(", ")}
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* Checklist */}
                    {contents.length > 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-bold tracking-wider px-1">
                                <span>Component / Accessory Checklist</span>
                                <span>Present Status</span>
                            </div>

                            <div className="space-y-1.5">
                                {contents.map(item => {
                                    const isChecked = checkedItemIds.has(item.id);
                                    const penaltyAmount = penalties[item.accessoryName] || penalties["Default Missing Accessory"] || 200;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleItemCheck(item.id)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                isChecked
                                                    ? "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                                                    : "bg-red-500/5 border-red-500/25 text-red-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {}} // handled by div click
                                                    className="w-4 h-4 rounded text-purple-600 focus:ring-0 border-white/20 bg-white/5"
                                                />
                                                <div>
                                                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                                                        <span>{item.accessoryName}</span>
                                                        {item.expectedQuantity > 1 && (
                                                            <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded font-mono text-slate-300">
                                                                Qty: {item.expectedQuantity}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.assetTagCode && (
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            Unit Tag: {item.assetTagCode}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {isChecked ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <div className="text-right">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                                                            MISSING
                                                        </span>
                                                        {mode === "return" && (
                                                            <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                                                                +{penaltyAmount} QAR
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : flightCase ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                            No accessory sub-assemblies registered in this flight case yet.
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 text-xs">
                            Scan a flight case barcode or RFID tag to load manifest.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between gap-4">
                    <div>
                        {mode === "return" && totalPenalty > 0 && (
                            <div className="text-xs text-amber-400 flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Deposit Claim: {totalPenalty.toLocaleString()} QAR ({missingCount} item(s) missing)</span>
                            </div>
                        )}
                        {mode === "pack" && missingCount > 0 && (
                            <div className="text-xs text-amber-400 flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Warning: {missingCount} accessory item(s) unverified.</span>
                            </div>
                        )}
                        {missingCount === 0 && contents.length > 0 && (
                            <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>100% Manifest Complete</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCommitAudit}
                            disabled={submitting || contents.length === 0}
                            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-lg disabled:opacity-50 ${
                                mode === "pack"
                                    ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/20"
                                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                            }`}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                            {mode === "pack" ? "Sign Off Pack-Out" : "Commit Return & File Penalties"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
