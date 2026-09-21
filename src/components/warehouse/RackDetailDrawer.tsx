"use client";

import React, { useEffect } from "react";
import { 
    X, Layers, Box, QrCode, AlertCircle, ArrowRightLeft, 
    Sparkles, CheckCircle2, ShieldAlert, Cpu, Tag, Hash, 
    ArrowUpRight, Check
} from "lucide-react";

interface RackDetailDrawerProps {
    rack: any;
    onClose: () => void;
    onToggleDeadSpot?: (rackId: string) => void;
}

export default function RackDetailDrawer({ rack, onClose, onToggleDeadSpot }: RackDetailDrawerProps) {
    // Listen for Escape key to close the slide-over drawer
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!rack) return null;

    const isDeadSpot = rack.isDeadSpot || rack.status === "dead_spot";
    const isEmpty = rack.isEmpty || rack.currentUnits === 0;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
            {/* ─── Backdrop Overlay (Clicking outside dismisses the slider drawer) ─── */}
            <div
                id="rack-drawer-backdrop"
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                aria-hidden="true"
            />

            {/* ─── Slide-over Drawer Panel ─── */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
                <div className="w-screen max-w-md md:max-w-lg bg-slate-950/98 backdrop-blur-2xl border-l border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-start justify-between bg-white/[0.02]">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-white/10 text-white border border-white/15">
                                    {rack.aisle || "AISLE 01"} &bull; {rack.rackCode || rack.label || "RACK"}
                                </span>
                                {isEmpty ? (
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> 100% Empty
                                    </span>
                                ) : isDeadSpot ? (
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Cold Dead Spot
                                    </span>
                                ) : (
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider border ${(rack.occupancyPercent || 0) > 80 ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"}`}>
                                        {rack.occupancyPercent || 0}% Occupied
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-black font-[family-name:var(--font-heading)] text-white tracking-tight">
                                {rack.label || rack.rackCode}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                <span className="text-[var(--color-gold)] font-semibold">{rack.zoneCode || rack.zoneId || "Zone A"}</span>
                                &bull;
                                <span>{rack.levels || 4} Shelving Tiers (Vertical Storage)</span>
                            </p>
                        </div>
                        <button
                            id="close-rack-drawer-btn"
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/10"
                            title="Close drawer (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Metrics KPI Strip */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-white/[0.01] border-b border-white/10 text-center">
                        <div className="p-3 rounded-2xl bg-black/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stored Units</p>
                            <p className="text-xl font-black text-white mt-1 font-mono">{rack.currentUnits || 0}</p>
                            <span className="text-[9px] text-slate-500 font-mono">Slotted in tiers</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-black/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Capacity</p>
                            <p className="text-xl font-black text-slate-200 mt-1 font-mono">{rack.maxCapacity || (rack.levels || 4) * 25}</p>
                            <span className="text-[9px] text-slate-500 font-mono">{(rack.levels || 4)} tiers &times; 25 pos</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-black/50 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Free Slots</p>
                            <p className="text-xl font-black text-cyan-400 mt-1 font-mono">
                                {Math.max(0, (rack.maxCapacity || (rack.levels || 4) * 25) - (rack.currentUnits || 0))}
                            </p>
                            <span className="text-[9px] text-cyan-500/70 font-mono">Ready for putaway</span>
                        </div>
                    </div>

                    {/* Shelf Tiers Breakdown & Slotted Physical Items */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[var(--color-gold)]" /> Vertical Shelf Breakdown
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono">Tier 4 (Top) &rarr; Tier 1 (Base)</span>
                        </div>

                        {rack.tiers && rack.tiers.length > 0 ? (
                            // Display reverse order so Tier 4 is at the top physically
                            [...rack.tiers].reverse().map((tier: any) => (
                                <div
                                    key={tier.levelNumber}
                                    className={`p-4 rounded-2xl border transition-all ${
                                        tier.currentUnits === 0
                                            ? "bg-cyan-500/[0.02] border-cyan-500/20 hover:border-cyan-500/30"
                                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-lg bg-black/60 border border-white/15 text-xs font-black font-mono flex items-center justify-center text-[var(--color-gold)]">
                                                T{tier.levelNumber}
                                            </span>
                                            <div>
                                                <span className="text-sm font-bold text-white block">{tier.levelName}</span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    Slot Height: 1.2m &bull; Rated Max: 1,500 kg
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono font-bold text-slate-200">
                                                {tier.currentUnits} / {tier.capacity}
                                            </span>
                                            <span className="text-[10px] text-slate-500 block font-mono">
                                                {tier.capacity > 0 ? Math.round((tier.currentUnits / tier.capacity) * 100) : 0}% capacity
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden mb-3">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                tier.currentUnits === 0
                                                    ? "bg-cyan-400"
                                                    : tier.currentUnits / tier.capacity > 0.8
                                                    ? "bg-rose-500"
                                                    : "bg-[var(--color-gold)]"
                                            }`}
                                            style={{ width: `${Math.min(100, (tier.currentUnits / tier.capacity) * 100)}%` }}
                                        />
                                    </div>

                                    {/* Items preview list */}
                                    {tier.items && tier.items.length > 0 ? (
                                        <div className="space-y-2 mt-3">
                                            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                                                Slotted Serialized Hardware:
                                            </p>
                                            {tier.items.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between text-xs hover:border-[var(--color-gold)]/40 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {item.productImage ? (
                                                            <img
                                                                src={item.productImage}
                                                                alt={item.productName}
                                                                className="w-9 h-9 rounded-lg object-cover border border-white/10 bg-white/5"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                                                <Box className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="font-mono font-bold text-white block text-xs">
                                                                {item.assetTagCode}
                                                            </span>
                                                            <span className="text-[11px] text-slate-300 line-clamp-1">
                                                                {item.productName || "Equipment Unit"}
                                                            </span>
                                                            {item.serialNumber && (
                                                                <span className="text-[10px] font-mono text-slate-500 block">
                                                                    S/N: {item.serialNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                            {item.conditionStatus || "EXCELLENT"}
                                                        </span>
                                                        <span className="text-[9px] font-mono text-slate-500">
                                                            {item.shelfLocation || `T${tier.levelNumber}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-cyan-400/80 font-mono flex items-center gap-1.5 py-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Empty shelf level &bull; ready for incoming putaway
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                                <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">No active item data mapped to this rack yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Action Buttons */}
                    <div className="p-5 border-t border-white/10 bg-black/60 space-y-2.5">
                        {onToggleDeadSpot && (
                            <button
                                onClick={() => onToggleDeadSpot(rack.id)}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                                    isDeadSpot
                                        ? "bg-amber-500/10 text-[var(--color-gold)] border-amber-500/30 hover:bg-amber-500/20"
                                        : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                                }`}
                            >
                                <ShieldAlert className="w-4 h-4" />
                                {isDeadSpot ? "Mark as Active High-Throughput Storage" : "Flag as Low-Turnover Dead Spot"}
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    alert(`Directed Putaway Task generated for ${rack.rackCode || rack.label}. Check WMS Putaway page.`);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--color-gold)] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                            >
                                <ArrowRightLeft className="w-3.5 h-3.5" /> Putaway to Rack
                            </button>
                            <button
                                onClick={() => {
                                    alert(`Print Job sent to Zebra ZT411 for barcode: ${rack.rackCode || rack.label}`);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                title="Print Rack QR / Barcode"
                            >
                                <QrCode className="w-4 h-4" />
                                <span className="hidden sm:inline">Print Tag</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
