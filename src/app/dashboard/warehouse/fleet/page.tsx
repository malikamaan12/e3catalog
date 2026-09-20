"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    QrCode, Plus, Search, Printer, CheckCircle2,
    Package, RefreshCcw, ScanLine, X, Camera,
    Building2, List, History as HistoryIcon,
    MapPin, AlertTriangle, TrendingUp, Radio, Tag, Check, Loader2
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import FleetRoiCockpit from "@/components/fleet/FleetRoiCockpit";

// Types matching the admin fleet
interface InventoryUnit {
    id: string;
    productId: string;
    productName: string;
    vendorId: string;
    vendorName: string;
    assetTagCode: string;
    rfidTag?: string | null;
    serialNumber: string;
    conditionStatus: 'excellent' | 'good' | 'fair' | 'maintenance_required' | 'retired';
    availabilityStatus: 'in_warehouse' | 'on_rent' | 'in_maintenance';
    lastInspectionDate: string | null;
    warehouseLocation: string;
    warehouseId: string | null;
    shelfLocation: string | null;
    warehouseName: string | null;
}

export default function WarehouseFleetPage() {
    const [activeTab, setActiveTab] = useState<"registry" | "roi">("registry");
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Simplification for warehouse view: List view with grouping toggle
    const [groupByProduct, setGroupByProduct] = useState(false);

    // RFID Commissioning Modal state
    const [commissionModalOpen, setCommissionModalOpen] = useState(false);
    const [commissionIdentifier, setCommissionIdentifier] = useState("");
    const [commissionRfid, setCommissionRfid] = useState("");
    const [commissionLoading, setCommissionLoading] = useState(false);
    const [commissionFeedback, setCommissionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchFleet = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/fleet");
            if (res.ok) {
                const data = await res.json();
                setUnits(data);
            }
        } catch (error) {
            console.error("Failed to fetch fleet:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCommissionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commissionIdentifier.trim() || !commissionRfid.trim()) return;
        setCommissionLoading(true);
        setCommissionFeedback(null);
        try {
            const res = await fetch("/api/admin/fleet/pair-rfid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: commissionIdentifier.trim(),
                    rfidTag: commissionRfid.trim(),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setCommissionFeedback({ type: "success", text: data.message || "RFID Tag paired successfully!" });
                setCommissionRfid("");
                fetchFleet();
            } else {
                setCommissionFeedback({ type: "error", text: data.error || "Failed to pair RFID tag." });
            }
        } catch {
            setCommissionFeedback({ type: "error", text: "Network error while pairing tag." });
        } finally {
            setCommissionLoading(false);
        }
    };

    const openCommissionForUnit = (unit: InventoryUnit) => {
        setCommissionIdentifier(unit.assetTagCode);
        setCommissionRfid(unit.rfidTag || "");
        setCommissionFeedback(null);
        setCommissionModalOpen(true);
    };

    useEffect(() => {
        fetchFleet();
    }, [fetchFleet]);

    const filteredUnits = units.filter(u => {
        const q = searchQuery.toLowerCase();
        return u.assetTagCode.toLowerCase().includes(q) || 
               u.productName.toLowerCase().includes(q) ||
               (u.vendorName || "").toLowerCase().includes(q);
    });

    const availabilityColors: Record<string, string> = {
        in_warehouse: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        on_rent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        in_maintenance: "text-red-400 bg-red-500/10 border-red-500/20"
    };

    return (
        <div className="flex flex-col gap-0 min-h-full pb-24">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--color-navy)]/40">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black uppercase tracking-tight text-[var(--color-warm-white)] italic">
                        Fleet <span className="text-[var(--color-gold)]">Intelligence</span>
                    </h1>
                    <p className="text-[var(--color-slate)] text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Global Asset Management, Capital ROI & Telemetry</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--color-surface)] border border-white/10 shadow-xl">
                        <button 
                            onClick={() => setActiveTab("registry")}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider ${
                                activeTab === "registry" 
                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md" 
                                    : "text-[var(--color-slate)] hover:text-white"
                            }`}
                        >
                            <Package className="w-3.5 h-3.5" /> Physical Registry
                        </button>
                        <button 
                            onClick={() => setActiveTab("roi")}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider ${
                                activeTab === "roi" 
                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md" 
                                    : "text-[var(--color-slate)] hover:text-white"
                            }`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> Capital ROI & Maintenance
                        </button>
                    </div>

                    <button onClick={fetchFleet} aria-label="Refresh fleet index" className="p-3 rounded-xl glass border border-white/10 hover:text-white transition-all text-[var(--color-slate)] shadow-xl">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => {
                            setCommissionIdentifier("");
                            setCommissionRfid("");
                            setCommissionFeedback(null);
                            setCommissionModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 font-black text-[10px] uppercase tracking-[0.15em] hover:bg-purple-600/30 transition-all shadow-xl"
                    >
                        <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Pair RFID
                    </button>
                    <button className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[var(--color-gold)]/20">
                        <Plus className="w-4 h-4" /> Add Asset
                    </button>
                </div>
            </div>

            {activeTab === "roi" ? (
                <div className="p-6 md:p-8">
                    <FleetRoiCockpit />
                </div>
            ) : (
                <>
                    {/* Search & Filters */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4 items-center border-b border-white/5 bg-black/20">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)] opacity-40 group-focus-within:text-[var(--color-gold)] group-focus-within:opacity-100 transition-all" />
                            <input 
                                type="text" 
                                placeholder="FILTER BY ASSET TAG, SKU IDENTITY, OR SERIAL PROTOCOL..."
                                aria-label="Filter fleet by asset tag, SKU, or serial"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-warm-white)] placeholder:text-white/5 focus:outline-none focus:border-[var(--color-gold)]/50 transition-all shadow-inner"
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-white/10 rounded-2xl p-1 shadow-2xl">
                            <button 
                                onClick={() => setGroupByProduct(!groupByProduct)} 
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${groupByProduct ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20' : 'text-[var(--color-slate)] hover:text-white hover:bg-white/5'}`}
                            >
                                <List className="w-4 h-4" /> {groupByProduct ? 'Ungrouped' : 'Grouped by SKU'}
                            </button>
                        </div>
                    </div>

            {/* Content Area */}
            <div className="p-4 md:p-8 flex flex-col gap-3">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-40">
                        <Package className="h-12 w-12 animate-pulse text-[var(--color-gold)]" />
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] animate-pulse">Syncing Global Fleet Index</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-slate)]">Accessing distributed ledgers...</p>
                        </div>
                    </div>
                )}

                {!loading && filteredUnits.length === 0 && (
                    <div className="text-center py-32 glass rounded-3xl border-2 border-dashed border-white/5 text-[var(--color-slate)] italic font-bold uppercase tracking-widest opacity-20">Secure Feed Active · No Assets Detected.</div>
                )}

                {!loading && filteredUnits.map(unit => (
                    <div 
                        key={unit.id} 
                        className="flex flex-col md:flex-row md:items-center gap-6 p-6 glass rounded-2xl border border-white/5 hover:border-[var(--color-gold)]/20 hover:bg-white/[0.02] transition-all group relative overflow-hidden"
                    >
                        {/* Status Sidebar indicator */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${
                            unit.availabilityStatus === 'in_warehouse' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                            unit.availabilityStatus === 'on_rent' ? 'bg-[var(--color-gold)] shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                        }`} />

                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-[family-name:var(--font-heading)] font-black text-xl text-[var(--color-warm-white)] tracking-[0.1em] group-hover:text-[var(--color-gold)] transition-colors">{unit.assetTagCode}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-colors ${availabilityColors[unit.availabilityStatus]}`}>
                                            {unit.availabilityStatus.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-40">Serial: {unit.serialNumber || 'UNLOGGED_PROTOCOL'}</span>
                                        {unit.rfidTag ? (
                                            <span 
                                                onClick={() => openCommissionForUnit(unit)}
                                                className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 flex items-center gap-1 cursor-pointer hover:bg-purple-500/20 transition-colors"
                                                title="Click to re-assign or update RFID tag"
                                            >
                                                <Radio className="w-2.5 h-2.5 text-purple-400" /> {unit.rfidTag}
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openCommissionForUnit(unit); }}
                                                className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-dashed border-white/20 text-[var(--color-slate)] hover:border-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all flex items-center gap-1"
                                            >
                                                <Radio className="w-2.5 h-2.5" /> + Pair RFID
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="p-2 bg-white rounded-lg shadow-2xl group-hover:scale-105 transition-transform opacity-60 group-hover:opacity-100">
                                        <QRCodeCanvas
                                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/passport/${unit.assetTagCode}`}
                                            size={32}
                                            level="L"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.15em]">{unit.productName}</span>
                                    <span className="text-[9px] font-bold text-[var(--color-slate)] uppercase opacity-40 italic">{unit.vendorName}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 border-t border-white/5 pt-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[var(--color-slate)]">
                                        <Building2 className="h-3.5 w-3.5 text-[var(--color-gold)] opacity-60" />
                                        {unit.warehouseName || 'On-Site Operations'}
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[var(--color-slate)]">
                                        <MapPin className="h-3.5 w-3.5 text-[var(--color-gold)] opacity-60" />
                                        {unit.shelfLocation || 'UNCATALOGED'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex md:flex-col items-center justify-end gap-3 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-white/5">
                            <button 
                                onClick={() => openCommissionForUnit(unit)}
                                title="Pair / edit RFID tag"
                                aria-label="Scan or pair RFID tag" 
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 rounded-xl glass border border-white/10 hover:border-purple-400/50 hover:text-purple-300 transition-all h-12 w-full md:w-12"
                            >
                                <Radio className="w-5 h-5 shadow-inner" />
                            </button>
                            <button aria-label="View asset history" className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 rounded-xl glass border border-white/10 hover:bg-white/5 transition-all h-12 w-full md:w-12">
                                <HistoryIcon className="w-5 h-5 opacity-40" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            </>
            )}

            {/* ─── RFID Tag Commissioning Modal ─── */}
            {commissionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative bg-[var(--color-navy)] border border-purple-500/30 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_80px_rgba(168,85,247,0.2)]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                                    <Radio className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-[family-name:var(--font-heading)] font-black text-lg text-white uppercase tracking-tight italic">
                                        Pair <span className="text-purple-400">RFID Tag</span>
                                    </h3>
                                    <p className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60">High-Speed Asset Commissioning</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setCommissionModalOpen(false)}
                                className="p-2 rounded-lg text-[var(--color-slate)] hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCommissionSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-wider block mb-1">
                                    1. Target Asset Code or S/N
                                </label>
                                <input 
                                    type="text"
                                    value={commissionIdentifier}
                                    onChange={(e) => setCommissionIdentifier(e.target.value)}
                                    placeholder="e.g. E3-TRUSS-001"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-purple-400 transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-wider block mb-1">
                                    2. RFID EPC (Pull Sled Trigger to Scan)
                                </label>
                                <input 
                                    type="text"
                                    value={commissionRfid}
                                    onChange={(e) => setCommissionRfid(e.target.value)}
                                    placeholder="e.g. E280117000000201..."
                                    className="w-full bg-black/40 border border-purple-500/40 rounded-xl px-4 py-3 text-sm text-purple-300 font-mono uppercase tracking-wider focus:outline-none focus:border-purple-400 transition-colors"
                                    autoFocus
                                    required
                                />
                            </div>

                            {commissionFeedback && (
                                <div className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${
                                    commissionFeedback.type === "success" 
                                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                        : "bg-red-950/60 border-red-500/40 text-red-300"
                                }`}>
                                    {commissionFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                    <span>{commissionFeedback.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                                <button 
                                    type="button" 
                                    onClick={() => setCommissionModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-wider text-[var(--color-slate)] hover:text-white transition-colors"
                                >
                                    Close
                                </button>
                                <button 
                                    type="submit"
                                    disabled={commissionLoading}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-purple-600/30"
                                >
                                    {commissionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Pair & Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

