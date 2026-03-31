"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ShieldAlert, Search, Loader2, Plus, X, CheckCircle2,
    Clock, ChevronDown, Save, Camera
} from "lucide-react";
import { format } from "date-fns";
import QRScannerModal from "@/components/warehouse/QRScannerModal";

type InspectionLog = {
    id: string;
    unitId: string;
    assetTagCode?: string;
    inspectorName: string | null;
    inspectionType: string;
    conditionBefore: string;
    conditionAfter: string;
    notes: string | null;
    createdAt: string;
};

type UnitLookup = {
    id: string;
    assetTagCode: string;
    productName: string | null;
    conditionStatus: string;
    availabilityStatus: string;
};

const INSPECTION_TYPES = ["routine", "damage", "return", "pre_rental"];
const CONDITIONS = ["excellent", "good", "fair", "poor", "maintenance_required"];

const CONDITION_COLOR: Record<string, string> = {
    excellent: "text-emerald-400",
    good: "text-green-400",
    fair: "text-yellow-400",
    poor: "text-orange-400",
    maintenance_required: "text-red-400",
};

const TYPE_COLOR: Record<string, string> = {
    routine: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    damage: "bg-red-500/10 text-red-400 border-red-500/20",
    return: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pre_rental: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function InspectionsPage() {
    const [logs, setLogs] = useState<InspectionLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [assetTagInput, setAssetTagInput] = useState("");
    const [lookupResult, setLookupResult] = useState<UnitLookup | null>(null);
    const [lookupError, setLookupError] = useState("");
    const [lookingUp, setLookingUp] = useState(false);
    const [inspType, setInspType] = useState("routine");
    const [condBefore, setCondBefore] = useState("good");
    const [condAfter, setCondAfter] = useState("good");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);

    const handleInspectionScan = async (tag: string) => {
        setScannerOpen(false);
        setAssetTagInput(tag);
        // auto-trigger lookup using the scanned value directly
        setLookingUp(true);
        setLookupError("");
        setLookupResult(null);
        try {
            const res = await fetch(`/api/passport/${encodeURIComponent(tag)}`);
            const data = await res.json();
            if (res.ok) {
                setLookupResult({
                    id: data.id,
                    assetTagCode: data.assetTagCode,
                    productName: data.productName,
                    conditionStatus: data.conditionStatus,
                    availabilityStatus: data.availabilityStatus,
                });
                setCondBefore(data.conditionStatus || "good");
                setCondAfter(data.conditionStatus || "good");
            } else {
                setLookupError(data.error || "Asset not found.");
            }
        } catch {
            setLookupError("Network error.");
        }
        setLookingUp(false);
    };

    const loadLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            // Fetch recent logs for all units via fleet
            const fleet = await fetch("/api/admin/fleet").then(r => r.json());
            if (!Array.isArray(fleet) || fleet.length === 0) { setLoadingLogs(false); return; }

            // Fetch logs for first 10 units and merge
            const first10 = fleet.slice(0, 10);
            const allLogs: InspectionLog[] = [];
            await Promise.all(first10.map(async (unit: any) => {
                try {
                    const res = await fetch(`/api/admin/fleet/inspection?unitId=${unit.id}`);
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        allLogs.push(...data.map((l: any) => ({ ...l, assetTagCode: unit.assetTagCode })));
                    }
                } catch {}
            }));
            allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLogs(allLogs.slice(0, 50));
        } catch {}
        setLoadingLogs(false);
    }, []);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    async function lookupUnit() {
        const tag = assetTagInput.trim().toUpperCase();
        if (!tag) return;
        setLookingUp(true);
        setLookupError("");
        setLookupResult(null);
        try {
            const res = await fetch(`/api/passport/${encodeURIComponent(tag)}`);
            const data = await res.json();
            if (res.ok) {
                setLookupResult({
                    id: data.id,
                    assetTagCode: data.assetTagCode,
                    productName: data.productName,
                    conditionStatus: data.conditionStatus,
                    availabilityStatus: data.availabilityStatus,
                });
                setCondBefore(data.conditionStatus || "good");
                setCondAfter(data.conditionStatus || "good");
            } else {
                setLookupError(data.error || "Asset not found.");
            }
        } catch {
            setLookupError("Network error.");
        }
        setLookingUp(false);
    }

    async function handleSubmit() {
        if (!lookupResult) return;
        setSubmitting(true);
        setSubmitMsg("");
        try {
            const res = await fetch("/api/admin/fleet/inspection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unitId: lookupResult.id,
                    inspectionType: inspType,
                    conditionBefore: condBefore,
                    conditionAfter: condAfter,
                    notes: notes || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitMsg("✓ Inspection logged successfully.");
                // Reset form
                setAssetTagInput("");
                setLookupResult(null);
                setNotes("");
                setShowForm(false);
                loadLogs();
            } else {
                setSubmitMsg("Error: " + (data.error || "Failed to log."));
            }
        } catch {
            setSubmitMsg("Network error.");
        }
        setSubmitting(false);
    }

    return (
        <div className="flex flex-col gap-0 min-h-full">
            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleInspectionScan}
                title="Scan Asset for Inspection"
            />
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-100 italic">
                        Damage <span className="text-red-500">Inspections</span>
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">{logs.length} recent inspection logs</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        showForm
                            ? "bg-white/5 border border-white/10 text-slate-400"
                            : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                    }`}
                >
                    {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showForm ? "Cancel" : "New Inspection"}
                </button>
            </div>

            {/* New Inspection Form */}
            {showForm && (
                <div className="p-4 md:p-6 border-b border-white/[0.06] bg-red-500/[0.03] flex flex-col gap-4">
                    <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest">Log New Inspection</h2>

                    {/* Asset Lookup */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Tag</label>
                        <div className="flex gap-2">
                            <input
                                value={assetTagInput}
                                onChange={e => setAssetTagInput(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === "Enter" && lookupUnit()}
                                placeholder="e.g. E3-TRUSS-001"
                                className="flex-1 bg-white/5 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-red-500/50"
                            />
                            {/* Camera Scan button */}
                            <button
                                onClick={() => setScannerOpen(true)}
                                title="Scan QR code"
                                className="h-12 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1"
                            >
                                <Camera className="h-5 w-5" />
                            </button>
                            <button
                                onClick={lookupUnit}
                                disabled={lookingUp}
                                className="h-12 px-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all flex items-center gap-2"
                            >
                                {lookingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                Look Up
                            </button>
                        </div>
                        {lookupError && <p className="text-xs text-red-400">{lookupError}</p>}

                        {lookupResult && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span className="font-bold">{lookupResult.assetTagCode} · {lookupResult.productName}</span>
                            </div>
                        )}
                    </div>

                    {lookupResult && (
                        <>
                            {/* Inspection Type */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspection Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {INSPECTION_TYPES.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setInspType(t)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                                                inspType === t ? `${TYPE_COLOR[t]} border-current` : "bg-transparent border-white/10 text-slate-500 hover:text-slate-300"
                                            }`}
                                        >
                                            {t.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditions */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Condition Before", value: condBefore, set: setCondBefore },
                                    { label: "Condition After", value: condAfter, set: setCondAfter },
                                ].map(({ label, value, set }) => (
                                    <div key={label} className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
                                        <div className="relative">
                                            <select
                                                value={value}
                                                onChange={e => set(e.target.value)}
                                                className="w-full appearance-none bg-white/5 border border-white/10 text-slate-100 rounded-xl px-3 py-3 pr-8 text-sm focus:outline-none focus:border-red-500/50"
                                            >
                                                {CONDITIONS.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Notes */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Describe damage, findings, or repairs needed..."
                                    className="bg-white/5 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-red-500/50"
                                />
                            </div>

                            {submitMsg && (
                                <p className={`text-xs font-bold ${submitMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{submitMsg}</p>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                            >
                                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                Log Inspection
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Inspection Log Feed */}
            <div className="flex flex-col divide-y divide-white/[0.04]">
                {loadingLogs && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    </div>
                )}
                {!loadingLogs && logs.length === 0 && (
                    <div className="text-center py-16 text-slate-600 italic text-sm">No inspection logs found.</div>
                )}
                {logs.map(log => (
                    <div key={log.id} className="flex gap-4 p-4 hover:bg-white/[0.02]">
                        <div className={`w-1 rounded-full shrink-0 ${
                            log.inspectionType === "damage" ? "bg-red-500" :
                            log.inspectionType === "return" ? "bg-emerald-500" :
                            log.inspectionType === "pre_rental" ? "bg-amber-500" : "bg-sky-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-sm text-slate-100 tracking-widest">{log.assetTagCode || "–"}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${TYPE_COLOR[log.inspectionType] || "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                                        {log.inspectionType.replace("_", " ")}
                                    </span>
                                </div>
                                <span className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(log.createdAt), "MMM do, HH:mm")}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className={`font-bold ${CONDITION_COLOR[log.conditionBefore] || "text-slate-400"}`}>{log.conditionBefore}</span>
                                <span className="text-slate-700">→</span>
                                <span className={`font-bold ${CONDITION_COLOR[log.conditionAfter] || "text-slate-400"}`}>{log.conditionAfter}</span>
                            </div>
                            {log.notes && <p className="text-xs text-slate-500 mt-1 italic">{log.notes}</p>}
                            <p className="text-[10px] text-slate-700 mt-0.5">by {log.inspectorName || "System"}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
