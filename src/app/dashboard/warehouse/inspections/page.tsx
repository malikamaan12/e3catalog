"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ShieldAlert, Search, Loader2, Plus, X, CheckCircle2,
    Clock, ChevronDown, Save, Camera, ArrowRightLeft, MapPin
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
        <div className="flex flex-col gap-0 min-h-full pb-24">
            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleInspectionScan}
                title="Telemetry: Asset Scan"
            />
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-[var(--color-navy)]/40">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black uppercase tracking-tight text-[var(--color-warm-white)] italic">
                        Damage <span className="text-red-500">Inspections</span>
                    </h1>
                    <p className="text-[var(--color-slate)] text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{logs.length} historical audit entries</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                        showForm
                            ? "bg-white/5 border border-white/10 text-[var(--color-slate)] hover:text-white"
                            : "bg-[var(--color-gold)] text-[var(--color-navy)] hover:scale-105 active:scale-95"
                    }`}
                >
                    {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showForm ? "Abort" : "New Audit"}
                </button>
            </div>

            {/* New Inspection Form */}
            {showForm && (
                <div className="p-6 md:p-8 border-b border-white/5 bg-red-500/[0.02] flex flex-col gap-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-tight text-red-400">Initialize Physical Audit</h2>
                        <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Verification of structural integrity and operational status</p>
                    </div>

                    {/* Asset Lookup */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60 ml-1">Asset Identity (Scan/Type)</label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    value={assetTagInput}
                                    onChange={e => setAssetTagInput(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === "Enter" && lookupUnit()}
                                    placeholder="E3-XXXXX"
                                    className="w-full bg-black/40 border-2 border-white/10 text-[var(--color-warm-white)] rounded-xl px-6 py-4 text-xl font-[family-name:var(--font-heading)] font-black tracking-[0.4em] focus:outline-none focus:border-red-500/50 transition-all placeholder:text-white/5"
                                />
                                {lookingUp && (
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-6 w-6 animate-spin text-red-400" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setScannerOpen(true)}
                                className="h-16 px-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all shadow-xl flex items-center justify-center"
                            >
                                <Camera className="h-6 w-6" />
                            </button>
                            <button
                                onClick={lookupUnit}
                                disabled={lookingUp || !assetTagInput.trim()}
                                className="h-16 px-8 rounded-xl bg-white/5 border border-white/10 text-[var(--color-warm-white)] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all disabled:opacity-20 shadow-xl"
                            >
                                Verify
                            </button>
                        </div>
                        {lookupError && <p className="text-xs font-bold text-red-400 uppercase tracking-tight px-1">Error: {lookupError}</p>}

                        {lookupResult && (
                            <div className="flex items-center gap-4 p-5 glass border border-emerald-500/30 rounded-xl text-emerald-400 animate-in zoom-in-95 duration-300">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-[family-name:var(--font-heading)] font-black uppercase tracking-widest text-lg">{lookupResult.assetTagCode}</span>
                                    <span className="text-[10px] font-black uppercase opacity-60 tracking-tighter">{lookupResult.productName || "Unknown SKU"}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {lookupResult && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
                            {/* Inspection Type */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60 ml-1">Audit Protocol</label>
                                <div className="flex flex-wrap gap-2">
                                    {INSPECTION_TYPES.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setInspType(t)}
                                            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${
                                                inspType === t 
                                                    ? `${TYPE_COLOR[t]} border-red-500/50 shadow-lg shadow-red-500/10` 
                                                    : "bg-black/20 border-white/10 text-[var(--color-slate)] hover:text-white"
                                            }`}
                                        >
                                            {t.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { label: "Status: Initial", value: condBefore, set: setCondBefore },
                                    { label: "Status: Post-Audit", value: condAfter, set: setCondAfter },
                                ].map(({ label, value, set }) => (
                                    <div key={label} className="flex flex-col gap-3">
                                        <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60 ml-1">{label}</label>
                                        <div className="relative group">
                                            <select
                                                value={value}
                                                onChange={e => set(e.target.value)}
                                                className="w-full appearance-none bg-black/40 border border-white/10 text-[var(--color-warm-white)] rounded-xl px-5 py-4 pr-12 text-sm font-bold uppercase transition-all focus:outline-none focus:border-red-500/50"
                                            >
                                                {CONDITIONS.map(c => <option key={c} value={c} className="bg-[var(--color-navy)]">{c.replace("_", " ")}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-slate)] pointer-events-none group-focus-within:text-red-400 transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Notes */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60 ml-1">Technical Observation</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Log structural defects, missing hardware, or required maintenance..."
                                    className="bg-black/40 border border-white/10 text-[var(--color-warm-white)] rounded-xl px-5 py-4 text-sm font-medium resize-none focus:outline-none focus:border-red-500/50 transition-all placeholder:text-[var(--color-slate)]/20"
                                />
                            </div>

                            {submitMsg && (
                                <div className={`p-4 rounded-xl border text-xs font-bold uppercase tracking-widest ${submitMsg.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                                    {submitMsg}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-16 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-red-900/40 active:scale-[0.98] disabled:opacity-30"
                            >
                                {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                                Finalize Audit Report
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Inspection Log Feed */}
            <div className="p-4 md:p-8 flex flex-col gap-4">
                {loadingLogs && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
                        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-gold)]" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-slate)]">Aggregating Audit Streams</p>
                    </div>
                )}
                {!loadingLogs && logs.length === 0 && (
                    <div className="text-center py-24 glass rounded-3xl border-2 border-dashed border-white/5 text-[var(--color-slate)] italic font-bold uppercase tracking-widest opacity-20">Secure Feed Active · No Logs Found.</div>
                )}
                {logs.map(log => (
                    <div 
                        key={log.id} 
                        className="flex gap-5 p-5 glass rounded-xl border border-white/5 hover:border-[var(--color-gold)]/20 hover:bg-white/[0.02] transition-all group relative overflow-hidden"
                    >
                        {/* Status bar */}
                        <div className={`absolute top-0 left-0 w-1 h-full shadow-lg ${
                            log.inspectionType === "damage" ? "bg-red-500 shadow-red-500/30" :
                            log.inspectionType === "return" ? "bg-emerald-500 shadow-emerald-500/30" :
                            log.inspectionType === "pre_rental" ? "bg-[var(--color-gold)] shadow-[var(--color-gold)]/30" : "bg-sky-500 shadow-sky-500/30"
                        }`} />

                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="font-[family-name:var(--font-heading)] font-black text-lg text-[var(--color-warm-white)] tracking-[0.1em]">{log.assetTagCode || "–"}</span>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${TYPE_COLOR[log.inspectionType] || "bg-white/5 text-[var(--color-slate)] border-white/10"}`}>
                                        {log.inspectionType.replace("_", " ")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--color-slate)] uppercase tracking-tighter opacity-40">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(log.createdAt), "MMM do, HH:mm")}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 self-start px-3 py-1.5 rounded-lg border border-white/5">
                                <span className={`text-[10px] font-black uppercase tracking-tight ${CONDITION_COLOR[log.conditionBefore] || "text-slate-400"}`}>{log.conditionBefore}</span>
                                <ArrowRightLeft className="h-3 w-3 text-white/10" />
                                <span className={`text-[10px] font-black uppercase tracking-tight ${CONDITION_COLOR[log.conditionAfter] || "text-slate-400"}`}>{log.conditionAfter}</span>
                            </div>
                            {log.notes && (
                                <div className="bg-white/5 p-3 rounded-lg border border-white/[0.03]">
                                    <p className="text-xs font-medium text-[var(--color-warm-white)]/80 italic leading-relaxed">"{log.notes}"</p>
                                </div>
                            )}
                            <div className="flex items-center gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-slate)]">Authenticated by {log.inspectorName || "System Protocol"}</p>
                            </div>
                        </div>
                        <ShieldAlert className={`h-6 w-6 mt-1 opacity-5 group-hover:opacity-20 transition-all ${log.inspectionType === 'damage' ? 'text-red-500 scale-125' : 'text-[var(--color-gold)]'}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}
