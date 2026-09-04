"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Box, QrCode, Plus, CheckCircle2, AlertTriangle, Search, Filter, 
    Layers, Package, ShieldAlert, ArrowRightLeft, DollarSign, X, Check,
    Sparkles, RefreshCw, Barcode, HardDriveDownload
} from "lucide-react";

interface FlightCaseItem {
    id: string;
    caseNumber: string;
    name: string;
    caseType: string;
    assetTagCode: string;
    rfidTag?: string | null;
    tareWeightKg: number;
    maxCapacityKg: number;
    status: string;
    warehouseLocation: string;
    notes?: string | null;
    itemCount: number;
    createdAt: string;
}

interface ManifestContent {
    id: string;
    accessoryName: string;
    expectedQuantity: number;
    isPermanentChild: boolean;
    isVerifiedPacked: boolean;
    assetTagCode?: string | null;
    productName?: string | null;
}

interface MissingClaim {
    id: string;
    bookingId?: string | null;
    flightCaseId?: string | null;
    caseNumber?: string | null;
    itemName: string;
    penaltyFee: number;
    status: string;
    claimNotes?: string | null;
    createdAt: string;
}

export default function FlightCaseManager() {
    const [cases, setCases] = useState<FlightCaseItem[]>([]);
    const [claims, setClaims] = useState<MissingClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedCase, setSelectedCase] = useState<any | null>(null);
    const [manifestLoading, setManifestLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New case form state
    const [formCaseNumber, setFormCaseNumber] = useState("");
    const [formName, setFormName] = useState("");
    const [formCaseType, setFormCaseType] = useState("Heavy Duty Trunk");
    const [formAssetTag, setFormAssetTag] = useState("");
    const [formTareWeight, setFormTareWeight] = useState(18);
    const [formCapacity, setFormCapacity] = useState(90);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [caseRes, claimRes] = await Promise.all([
                fetch("/api/warehouse/flight-cases"),
                fetch("/api/warehouse/flight-cases/claims"),
            ]);

            if (caseRes.ok) {
                const data = await caseRes.json();
                setCases(data.flightCases || []);
            }
            if (claimRes.ok) {
                const data = await claimRes.json();
                setClaims(data.claims || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openCaseManifest = async (caseId: string) => {
        try {
            setManifestLoading(true);
            const res = await fetch(`/api/warehouse/flight-cases/${caseId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedCase(data.flightCase);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setManifestLoading(false);
        }
    };

    // Single-scan QR checkout simulation
    const handleSingleScanVerify = async (caseId: string) => {
        try {
            setSubmitting(true);
            const res = await fetch(`/api/warehouse/flight-cases/${caseId}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "pack", scannedTags: [] }), // single-scan master pack
            });
            if (res.ok) {
                await openCaseManifest(caseId);
                await fetchData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    // Return audit simulation (flags missing accessories)
    const handleReturnAudit = async (caseId: string) => {
        try {
            setSubmitting(true);
            const res = await fetch(`/api/warehouse/flight-cases/${caseId}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "return_audit", returnedTags: [] }), // simulates missing items
            });
            if (res.ok) {
                await openCaseManifest(caseId);
                await fetchData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    // Claim resolution (deduct deposit or invoice)
    const handleResolveClaim = async (claimId: string, action: string) => {
        try {
            const res = await fetch("/api/warehouse/flight-cases/claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    claimId,
                    action,
                    notes: `Processed by Warehouse Manager via Single-Click Ledger Resolution`,
                }),
            });
            if (res.ok) {
                await fetchData();
                if (selectedCase) openCaseManifest(selectedCase.id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Create new flight case
    const handleCreateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const res = await fetch("/api/warehouse/flight-cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caseNumber: formCaseNumber || `FC-${Date.now().toString().slice(-4)}`,
                    name: formName || "Touring Equipment Trunk",
                    caseType: formCaseType,
                    assetTagCode: formAssetTag || `QR-FC-${Date.now().toString().slice(-4)}`,
                    tareWeightKg: Number(formTareWeight),
                    maxCapacityKg: Number(formCapacity),
                    initialContents: [
                        { accessoryName: "Heavy Duty True1 Powercord (5m)", expectedQuantity: 2, isPermanentChild: true },
                        { accessoryName: "Touring DMX 5-Pin Cable (20m)", expectedQuantity: 4, isPermanentChild: false },
                        { accessoryName: "Quick-Trigger Stage Rigging Clamp", expectedQuantity: 2, isPermanentChild: false },
                    ],
                }),
            });
            if (res.ok) {
                setIsCreateOpen(false);
                setFormCaseNumber("");
                setFormName("");
                setFormAssetTag("");
                await fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCases = cases.filter(c => {
        const matchesSearch = c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.caseType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col gap-6 w-full animate-fade-in">
            {/* Header & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 glass p-5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <Box className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--color-warm-white)] uppercase tracking-wider">
                            Master Flight Cases & Kit Assemblies
                        </h2>
                        <p className="text-xs text-[var(--color-slate)]">
                            Single-Scan Case Verification, Child Accessory Bundling, and Missing Item Penalty Ledgers
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[var(--color-gold)]/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> New Flight Case
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 glass rounded-xl border border-white/10 text-[var(--color-slate)] hover:text-white transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3.5 py-2 rounded-xl w-full sm:w-80">
                    <Search className="w-4 h-4 text-[var(--color-slate)]" />
                    <input
                        type="text"
                        placeholder="Search by case #, name, or type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none text-xs text-white placeholder-[var(--color-slate)] focus:outline-none w-full"
                    />
                </div>

                <div className="flex items-center gap-1.5 glass p-1 rounded-xl border border-white/10">
                    {["all", "available", "packed", "on_site", "unpacking_audit"].map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                statusFilter === st 
                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md" 
                                    : "text-[var(--color-slate)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {st.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flight Cases Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCases.map((c) => {
                    const isPacked = c.status === "packed";
                    const isAudit = c.status === "unpacking_audit";

                    return (
                        <div
                            key={c.id}
                            className="glass rounded-2xl border border-white/10 p-5 flex flex-col justify-between gap-4 hover:border-[var(--color-gold)]/40 hover:bg-white/[0.02] transition-all group relative overflow-hidden shadow-xl"
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-amber-400" />
                                        <span className="font-mono text-xs font-black text-amber-300 tracking-wider">
                                            {c.caseNumber}
                                        </span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                        isPacked 
                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                            : isAudit 
                                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30" 
                                            : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                    }`}>
                                        {c.status.replace("_", " ")}
                                    </span>
                                </div>

                                <h3 className="font-bold text-sm text-[var(--color-warm-white)] tracking-wide">
                                    {c.name}
                                </h3>

                                <p className="text-[11px] text-[var(--color-slate)]">
                                    Type: <span className="text-white font-semibold">{c.caseType}</span> • Tag: <span className="font-mono text-amber-400/90">{c.assetTagCode}</span>
                                </p>
                            </div>

                            {/* Weight / Capacity bar */}
                            <div className="flex flex-col gap-1 text-[10px]">
                                <div className="flex justify-between text-[var(--color-slate)] font-mono">
                                    <span>Tare: {c.tareWeightKg} kg</span>
                                    <span>Max: {c.maxCapacityKg} kg</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full" 
                                        style={{ width: `${Math.min(100, (c.tareWeightKg / c.maxCapacityKg) * 100)}%` }} 
                                    />
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <span className="text-[11px] text-[var(--color-slate)] font-medium">
                                    {c.itemCount || 3} Child Accessories
                                </span>

                                <button
                                    onClick={() => openCaseManifest(c.id)}
                                    className="px-3 py-1.5 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/40 transition-all flex items-center gap-1.5 active:scale-95"
                                >
                                    <Barcode className="w-3.5 h-3.5" /> Manifest & Scan
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Missing Items Claims Ledger Card */}
            {claims.length > 0 && (
                <div className="glass rounded-2xl border border-rose-500/20 p-5 flex flex-col gap-4 mt-4 bg-rose-950/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <ShieldAlert className="w-5 h-5 text-rose-400" />
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                    Kit Missing Item Penalty Ledger ({claims.length})
                                </h3>
                                <p className="text-xs text-[var(--color-slate)]">
                                    Cables, adapters, or accessories flagged during return inspection
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-white/10 text-[var(--color-slate)] text-[10px] uppercase tracking-wider font-mono">
                                    <th className="py-2.5 px-3">Case #</th>
                                    <th className="py-2.5 px-3">Missing Item</th>
                                    <th className="py-2.5 px-3">Penalty Fee</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3 text-right">Settlement Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 px-3 font-mono font-bold text-amber-300">
                                            {claim.caseNumber || "FC-AUDIO"}
                                        </td>
                                        <td className="py-3 px-3 font-semibold text-white">
                                            {claim.itemName}
                                        </td>
                                        <td className="py-3 px-3 font-mono font-black text-rose-400">
                                            QAR {claim.penaltyFee}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                claim.status === "deducted_from_deposit"
                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                    : claim.status === "invoiced"
                                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                            }`}>
                                                {claim.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {claim.status === "open" ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleResolveClaim(claim.id, "deducted_from_deposit")}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Deduct Deposit
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolveClaim(claim.id, "invoiced")}
                                                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Invoice
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-[var(--color-slate)] font-mono">
                                                    Settled
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Case Manifest & Single-Scan Verification Modal */}
            {selectedCase && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="glass rounded-3xl border border-white/10 w-full max-w-2xl p-6 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-white/10 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                                        Flight Case {selectedCase.caseNumber}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        {selectedCase.status}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--color-slate)] mt-0.5">{selectedCase.name} • Location: {selectedCase.warehouseLocation}</p>
                            </div>
                            <button
                                onClick={() => setSelectedCase(null)}
                                className="p-2 rounded-xl text-[var(--color-slate)] hover:text-white hover:bg-white/5 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Master QR Code Simulation Banner */}
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <QrCode className="w-8 h-8 text-amber-400" />
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-wider">
                                        Master Case Asset Tag: <span className="font-mono text-amber-300">{selectedCase.assetTagCode}</span>
                                    </p>
                                    <p className="text-[11px] text-[var(--color-slate)]">
                                        Single scan checkout bundles all child accessories in 1 operation.
                                    </p>
                                </div>
                            </div>

                            <button
                                disabled={submitting}
                                onClick={() => handleSingleScanVerify(selectedCase.id)}
                                className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                            >
                                <Check className="w-3.5 h-3.5" /> Single-Scan Pack
                            </button>
                        </div>

                        {/* Child Accessories Manifest Table */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                Bundled Child Accessories & Sub-Assemblies
                            </h4>

                            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                {selectedCase.contents?.map((item: ManifestContent) => (
                                    <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <div>
                                                <p className="text-xs font-bold text-white">{item.accessoryName}</p>
                                                <p className="text-[10px] text-[var(--color-slate)] font-mono">
                                                    Qty: {item.expectedQuantity} • {item.isPermanentChild ? "Permanent Internal Loom" : "Removable Accessory"}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Verified
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <button
                                disabled={submitting}
                                onClick={() => handleReturnAudit(selectedCase.id)}
                                className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" /> Simulate Return Audit (Missing Items)
                            </button>

                            <button
                                onClick={() => setSelectedCase(null)}
                                className="px-5 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:bg-white/5 transition-all"
                            >
                                Close Manifest
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Flight Case Creation Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={handleCreateCase} className="glass rounded-3xl border border-white/10 w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Register New Master Flight Case
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="p-1.5 rounded-lg text-[var(--color-slate)] hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-xs">
                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Case Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. FC-AUDIO-04"
                                    value={formCaseNumber}
                                    onChange={e => setFormCaseNumber(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Case Name / Description</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. L-Acoustics K2 Amplifier Rack 16U"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Case Type</label>
                                    <select
                                        value={formCaseType}
                                        onChange={e => setFormCaseType(e.target.value)}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                                    >
                                        <option value="Heavy Duty Trunk">Heavy Duty Trunk</option>
                                        <option value="16U Shockmount Rack">16U Shockmount Rack</option>
                                        <option value="Microphone Pelican">Microphone Pelican</option>
                                        <option value="Cable Chest">Cable Chest</option>
                                        <option value="Lighting 4-Way Flight Case">Lighting 4-Way Flight Case</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Asset Tag Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="QR-FC-102"
                                        value={formAssetTag}
                                        onChange={e => setFormAssetTag(e.target.value)}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Tare Weight (kg)</label>
                                    <input
                                        type="number"
                                        value={formTareWeight}
                                        onChange={e => setFormTareWeight(Number(e.target.value))}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Max Capacity (kg)</label>
                                    <input
                                        type="number"
                                        value={formCapacity}
                                        onChange={e => setFormCapacity(Number(e.target.value))}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider hover:brightness-110"
                            >
                                Register Case
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
