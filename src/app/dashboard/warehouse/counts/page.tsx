"use client";

import React, { useState, useEffect } from "react";
import { 
    ClipboardList, 
    Plus, 
    Search, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    RefreshCw, 
    Layers, 
    Barcode, 
    Check, 
    X,
    Sparkles,
    Radio,
    Zap,
    Volume2
} from "lucide-react";

interface CycleCount {
    id: string;
    countNumber: string;
    warehouseId: string;
    warehouse: { name: string };
    zoneId: string | null;
    zone: { name: string; code: string } | null;
    title: string;
    status: "planned" | "in_progress" | "completed" | "reconciled";
    countedBy: { name: string; email: string } | null;
    totalExpectedUnits: number;
    totalScannedUnits: number;
    discrepancyCount: number;
    startedAt: string | null;
    completedAt: string | null;
    reconciledAt: string | null;
    createdAt: string;
    items: Array<{
        id: string;
        inventoryUnitId: string | null;
        inventoryUnit: { assetTagCode: string; conditionStatus: string; product: { name: string } | null } | null;
        expectedBin: { binCode: string } | null;
        scannedBin: { binCode: string } | null;
        expectedStatus: string | null;
        scannedStatus: string | null;
        discrepancyType: "none" | "missing" | "wrong_bin" | "condition_mismatch" | "wrong_location";
        isResolved: boolean;
        resolutionNotes: string | null;
    }>;
}

export default function WarehouseCycleCountsPage() {
    const [counts, setCounts] = useState<CycleCount[]>([]);
    const [selectedCount, setSelectedCount] = useState<CycleCount | null>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [scanTagInput, setScanTagInput] = useState("");
    const [scanBinInput, setScanBinInput] = useState("");
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [rfidWandActive, setRfidWandActive] = useState(true);
    const [sweepLoading, setSweepLoading] = useState(false);

    // New Count Form
    const [newForm, setNewForm] = useState({
        warehouseId: "",
        zoneId: "",
        title: "",
    });

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const playCountChime = (hasDiscrepancy: boolean) => {
        if (typeof window === "undefined") return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = hasDiscrepancy ? "sawtooth" : "sine";
            osc.frequency.setValueAtTime(hasDiscrepancy ? 220 : 880, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch {}
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cntRes, whRes, znRes] = await Promise.all([
                fetch("/api/dashboard/warehouse/cycle-counts"),
                fetch("/api/dashboard/warehouses"),
                fetch("/api/dashboard/warehouse/zones")
            ]);

            if (cntRes.ok) {
                const cntData = await cntRes.json();
                setCounts(cntData.counts || []);
                if (cntData.counts?.length > 0) {
                    // Refresh selected count or select first
                    if (selectedCount) {
                        const updatedSelected = cntData.counts.find((c: any) => c.id === selectedCount.id);
                        if (updatedSelected) setSelectedCount(updatedSelected);
                    } else {
                        setSelectedCount(cntData.counts[0]);
                    }
                }
            }

            if (whRes.ok) {
                const whData = await whRes.json();
                setWarehouses(whData);
                if (whData.length > 0 && !newForm.warehouseId) {
                    setNewForm(prev => ({ ...prev, warehouseId: whData[0].id }));
                }
            }

            if (znRes.ok) {
                const znData = await znRes.json();
                setZones(znData.zones || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // RFID Wand Sled Sweep Listener (Burst Accumulator)
    useEffect(() => {
        if (!rfidWandActive || !selectedCount || selectedCount.status !== "in_progress") return;

        let buffer = "";
        let burstSet = new Set<string>();
        let timer: NodeJS.Timeout | null = null;

        const dispatchBurst = async (tags: string[]) => {
            if (tags.length === 0) return;
            setSweepLoading(true);
            try {
                const res = await fetch(`/api/dashboard/warehouse/cycle-counts/${selectedCount.id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tags,
                        scannedBinCode: scanBinInput.trim() || undefined,
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    playCountChime(data.discrepanciesFound > 0);
                    showToast(`📡 RFID Sweep: ${data.matchedCount} units verified in zone!`);
                    fetchData();
                }
            } catch (e: any) {
                console.error("RFID Sweep Dispatch Error:", e);
            } finally {
                setSweepLoading(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

            if (e.key === "Enter" || e.key === "Tab") {
                if (buffer.trim().length >= 3) {
                    burstSet.add(buffer.trim().toUpperCase());
                    buffer = "";
                }
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    if (burstSet.size > 0) {
                        dispatchBurst(Array.from(burstSet));
                        burstSet = new Set();
                    }
                }, 300);
                return;
            }

            if (e.key.length === 1) {
                buffer += e.key;
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    if (buffer.trim().length >= 3) {
                        burstSet.add(buffer.trim().toUpperCase());
                        buffer = "";
                    }
                    if (burstSet.size > 0) {
                        dispatchBurst(Array.from(burstSet));
                        burstSet = new Set();
                    }
                }, 300);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (timer) clearTimeout(timer);
        };
    }, [rfidWandActive, selectedCount, scanBinInput]);

    const handleSimulateSweep = async () => {
        if (!selectedCount) return;
        setSweepLoading(true);
        try {
            const sampleTags = selectedCount.items.slice(0, 6).map(i => i.inventoryUnit?.assetTagCode).filter(Boolean) as string[];
            if (sampleTags.length === 0) {
                sampleTags.push("E3-TRUSS-001", "E3-LED-042");
            }
            const res = await fetch(`/api/dashboard/warehouse/cycle-counts/${selectedCount.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tags: sampleTags,
                    scannedBinCode: scanBinInput.trim() || undefined,
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                playCountChime(data.discrepanciesFound > 0);
                showToast(`📡 Simulated RFID Sweep: Verified ${data.matchedCount} units!`);
                fetchData();
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSweepLoading(false);
        }
    };

    const handleCreateCount = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch("/api/dashboard/warehouse/cycle-counts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newForm)
            });

            if (res.ok) {
                showToast("✅ Inventory Cycle Count initiated!");
                setShowNewModal(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to start count.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleScanItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCount || !scanTagInput.trim()) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/dashboard/warehouse/cycle-counts/${selectedCount.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetTagCode: scanTagInput.trim(),
                    scannedBinCode: scanBinInput.trim() || undefined
                })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`✅ Scanned ${data.unit?.assetTagCode} (${data.discrepancyType === 'none' ? 'Match' : data.discrepancyType})`);
                setScanTagInput("");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to process scan.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReconcile = async () => {
        if (!selectedCount) return;
        if (!confirm("Automatically update database bin locations for all scanned items?")) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/dashboard/warehouse/cycle-counts/${selectedCount.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "reconciled",
                    applyReconciliation: true,
                })
            });

            if (res.ok) {
                showToast("🎉 All stock discrepancies reconciled cleanly!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to reconcile.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-semibold border border-emerald-400/30 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle2 className="w-5 h-5" />
                    {toastMessage}
                </div>
            )}

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-amber-400" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">Cycle Counts & Physical Stock Audits</h1>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Conduct periodic shelf audits, detect misplaced or missing serialized gear, and reconcile stock.
                    </p>
                </div>

                <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-1.5 bg-[var(--color-gold)] hover:brightness-110 text-slate-950 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Start Cycle Count
                </button>
            </div>

            {/* Master Detail Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Count Audits List */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                        Audit Sessions ({counts.length})
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                            <span>Loading audits...</span>
                        </div>
                    ) : counts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                            No cycle counts recorded.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                            {counts.map(cnt => {
                                const active = selectedCount?.id === cnt.id;
                                const statusColors: any = {
                                    in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                    completed: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                                    reconciled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                    planned: "bg-slate-800 text-slate-400 border-slate-700",
                                };

                                return (
                                    <div
                                        key={cnt.id}
                                        onClick={() => setSelectedCount(cnt)}
                                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                                            active
                                                ? "bg-slate-800 border-amber-400/80 ring-1 ring-amber-400/30"
                                                : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-mono text-xs font-black text-white">{cnt.countNumber}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[cnt.status] || ''}`}>
                                                {cnt.status.replace("_", " ")}
                                            </span>
                                        </div>

                                        <div className="text-sm font-bold text-slate-200">{cnt.title}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                                            <span>📍 {cnt.zone?.name || cnt.warehouse?.name}</span>
                                            <span className="font-semibold text-slate-300">
                                                {cnt.totalScannedUnits} / {cnt.totalExpectedUnits} Scanned
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Active Count Runner & Discrepancy Matrix */}
                <div className="lg:col-span-8">
                    {selectedCount ? (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-black text-white">{selectedCount.countNumber}</span>
                                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            {selectedCount.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-200 mt-1">{selectedCount.title}</div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Scanned</div>
                                        <div className="text-base font-black text-emerald-400 font-mono">
                                            {selectedCount.totalScannedUnits}
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Discrepancies</div>
                                        <div className="text-base font-black text-rose-400 font-mono">
                                            {selectedCount.discrepancyCount}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rapid Scan & RFID Wand Sweep Station for this Count */}
                            {selectedCount.status === "in_progress" && (
                                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                                <Radio className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                    RFID Wand Sweep &amp; Barcode Intake
                                                    <span className={`w-2 h-2 rounded-full ${rfidWandActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                                                </div>
                                                <p className="text-[10px] text-slate-400">
                                                    Chainway R6 / Bluetooth sled sweeps accumulate in 300ms burst window
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSimulateSweep}
                                                disabled={sweepLoading}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                                            >
                                                <Zap className="w-3.5 h-3.5" />
                                                {sweepLoading ? "Sweeping..." : "Simulate RFID Sweep"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setRfidWandActive(!rfidWandActive)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                                                    rfidWandActive
                                                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                                        : "bg-slate-800 text-slate-400 border-slate-700"
                                                }`}
                                            >
                                                {rfidWandActive ? "Wand ON" : "Wand OFF"}
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleScanItem} className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Scan Asset Tag (e.g. E3-EXH-001) or 24-Hex RFID EPC..."
                                                    value={scanTagInput}
                                                    onChange={(e) => setScanTagInput(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs md:text-sm px-4 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                                />
                                            </div>

                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Confirm Bin (Optional)..."
                                                    value={scanBinInput}
                                                    onChange={(e) => setScanBinInput(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span>Pull RFID sled trigger in aisle to auto-ingest stream, or scan single optical barcodes.</span>
                                            <button
                                                type="submit"
                                                disabled={actionLoading || !scanTagInput.trim()}
                                                className="bg-[var(--color-gold)] hover:brightness-110 text-black font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40"
                                            >
                                                {actionLoading ? "Recording..." : "Record Single Scan"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Discrepancy Breakdown Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Audit Items Breakdown ({selectedCount.items.length})
                                    </span>
                                </div>

                                <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
                                    {selectedCount.items.map(itm => {
                                        const isMissing = itm.discrepancyType === "missing";
                                        const isWrongBin = itm.discrepancyType === "wrong_bin";
                                        const isMatch = itm.discrepancyType === "none";

                                        return (
                                            <div
                                                key={itm.id}
                                                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                                    isMatch
                                                        ? "bg-slate-950/40 border-slate-800 text-slate-300"
                                                        : isWrongBin
                                                        ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                                                        : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                                                }`}
                                            >
                                                <div className="space-y-0.5">
                                                    <div className="font-mono font-bold text-white flex items-center gap-2">
                                                        <span>{itm.inventoryUnit?.assetTagCode || "Unknown Tag"}</span>
                                                        <span className="text-slate-400 font-sans font-normal truncate max-w-xs">
                                                            {itm.inventoryUnit?.product?.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        Expected Bin: <span className="font-mono text-slate-200">{itm.expectedBin?.binCode || "Unassigned"}</span>
                                                        {itm.scannedBin && (
                                                            <span> • Scanned in: <span className="font-mono text-amber-300 font-bold">{itm.scannedBin.binCode}</span></span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className={`font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 rounded ${
                                                    isMatch
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : isWrongBin
                                                        ? "bg-amber-500/20 text-amber-400"
                                                        : "bg-rose-500/20 text-rose-400"
                                                }`}>
                                                    {itm.discrepancyType.replace("_", " ")}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Reconcile Footer */}
                            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Reconciling will auto-update current bin placements in the live database.
                                </span>

                                <div className="flex items-center gap-2">
                                    {selectedCount.status === "in_progress" && (
                                        <button
                                            disabled={actionLoading}
                                            onClick={handleReconcile}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Reconcile Stock
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                            Select a cycle count on the left to start scanning.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Start Cycle Count */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-amber-400" />
                                <h3 className="text-lg font-bold text-white">Start New Cycle Count</h3>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCount} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Audit Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Q3 Audio Zone Inventory Audit"
                                    value={newForm.title}
                                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Warehouse</label>
                                    <select
                                        required
                                        value={newForm.warehouseId}
                                        onChange={(e) => setNewForm({ ...newForm, warehouseId: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                    >
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Zone (Optional)</label>
                                    <select
                                        value={newForm.zoneId}
                                        onChange={(e) => setNewForm({ ...newForm, zoneId: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                    >
                                        <option value="">All Zones</option>
                                        {zones.map(z => (
                                            <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-[var(--color-gold)] text-slate-950 text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                                >
                                    {actionLoading ? "Initializing..." : "Launch Audit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
