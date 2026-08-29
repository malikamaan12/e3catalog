"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    QrCode, Plus, Search, Printer, CheckCircle2,
    Package, RefreshCcw, ScanLine, X, Camera,
    Building2, List, History as HistoryIcon,
    MapPin, AlertTriangle
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

// Types matching the admin fleet
interface InventoryUnit {
    id: string;
    productId: string;
    productName: string;
    vendorId: string;
    vendorName: string;
    assetTagCode: string;
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
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Simplification for warehouse view: List view with grouping toggle
    const [groupByProduct, setGroupByProduct] = useState(false);

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
                    <p className="text-[var(--color-slate)] text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Global Asset Management & Telemetry</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={fetchFleet} aria-label="Refresh fleet index" className="p-3 rounded-xl glass border border-white/10 hover:text-white transition-all text-[var(--color-slate)] shadow-xl">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[var(--color-gold)]/20">
                        <Plus className="w-4 h-4" /> Add Asset
                    </button>
                </div>
            </div>

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
                                    <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-40">Serial: {unit.serialNumber || 'UNLOGGED_PROTOCOL'}</span>
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
                            <button aria-label="Scan barcode" className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 rounded-xl glass border border-white/10 hover:border-[var(--color-gold)]/40 hover:text-[var(--color-gold)] transition-all h-12 w-full md:w-12">
                                <ScanLine className="w-5 h-5 shadow-inner" />
                            </button>
                            <button aria-label="View asset history" className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 rounded-xl glass border border-white/10 hover:bg-white/5 transition-all h-12 w-full md:w-12">
                                <HistoryIcon className="w-5 h-5 opacity-40" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

