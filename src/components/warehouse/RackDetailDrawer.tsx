"use client";

import React, { useState, useEffect } from "react";
import { 
    X, Layers, Box, QrCode, AlertCircle, ArrowRightLeft, 
    Sparkles, CheckCircle2, ShieldAlert, Cpu, Tag, Hash, 
    ArrowUpRight, Check, Minimize2, Maximize2
} from "lucide-react";

interface RackDetailDrawerProps {
    rack: any;
    onClose: () => void;
    onToggleDeadSpot?: (rackId: string) => void;
    locatedTarget?: any | null;
}

export default function RackDetailDrawer({
    rack,
    onClose,
    onToggleDeadSpot,
    locatedTarget,
}: RackDetailDrawerProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Listen for Escape key to close the inspector
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
    const targetAssetCode = locatedTarget?.assetTagCode;

    // Collapsed compact mini-chip floating in the bottom-right so the user can see the entire map
    if (isCollapsed) {
        return (
            <div className="fixed bottom-6 right-6 z-40 pointer-events-auto">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#090d16] border border-amber-500/30 text-white shadow-[0_12px_32px_rgba(0,0,0,0.8)] hover:border-[var(--color-gold)] transition-all group"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-gold)] animate-pulse" />
                    <div className="text-left">
                        <span className="text-xs font-bold block text-white font-mono">
                            {rack.rackCode || rack.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                            {rack.currentUnits || 0} units slotted • Click to expand
                        </span>
                    </div>
                    <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors ml-2" />
                </button>
            </div>
        );
    }

    return (
        /* 
         * NON-BLOCKING FLOATING PANEL:
         * Container is pointer-events-none so the user can freely pan, zoom, 
         * and click on the warehouse digital twin map behind and around it.
         * NO full-screen dark backdrop overlay, zero blur lag!
         */
        <div className="fixed inset-y-0 right-0 z-40 max-w-full flex pointer-events-none pt-24 pb-4 pr-4 pl-4 select-none">
            <div className="w-screen max-w-sm md:max-w-md bg-[#090d16] border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto animate-in slide-in-from-right duration-250 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-start justify-between bg-white/[0.02]">
                    <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-white/10 text-white border border-white/15">
                                {rack.aisle || "AISLE 01"} &bull; {rack.rackCode || rack.label || "RACK"}
                            </span>
                            {isEmpty ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" /> 100% Empty
                                </span>
                            ) : isDeadSpot ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" /> Cold Dead Spot
                                </span>
                            ) : (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider border ${(rack.occupancyPercent || 0) > 80 ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"}`}>
                                    {rack.occupancyPercent || 0}% Occupied
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl font-black font-[family-name:var(--font-heading)] text-white tracking-tight truncate">
                            {rack.label || rack.rackCode}
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="text-[var(--color-gold)] font-semibold">{rack.zoneCode || rack.zoneId || "Zone A"}</span>
                            &bull;
                            <span>{rack.levels || 4} Shelving Tiers</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            id="collapse-rack-drawer-btn"
                            onClick={() => setIsCollapsed(true)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/10"
                            title="Minimize drawer to bottom chip"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                            id="close-rack-drawer-btn"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/10"
                            title="Close inspector (Esc)"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Quick Metrics KPI Strip */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.01] border-b border-white/10 text-center">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Stored Units</p>
                        <p className="text-lg font-black text-white mt-0.5 font-mono">{rack.currentUnits || 0}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Max Capacity</p>
                        <p className="text-lg font-black text-slate-200 mt-0.5 font-mono">{rack.maxCapacity || (rack.levels || 4) * 25}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Free Slots</p>
                        <p className="text-lg font-black text-cyan-400 mt-0.5 font-mono">
                            {Math.max(0, (rack.maxCapacity || (rack.levels || 4) * 25) - (rack.currentUnits || 0))}
                        </p>
                    </div>
                </div>

                {/* Shelf Tiers Breakdown & Slotted Physical Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[var(--color-gold)]" /> Vertical Shelf Breakdown
                        </p>
                        <span className="text-[9px] text-slate-500 font-mono">Tier 4 (Top) &rarr; Tier 1 (Base)</span>
                    </div>

                    {rack.tiers && rack.tiers.length > 0 ? (
                        [...rack.tiers].reverse().map((tier: any) => {
                            const hasMatchedItem = targetAssetCode && tier.items?.some((i: any) => i.assetTagCode === targetAssetCode);

                            return (
                                <div
                                    key={tier.levelNumber}
                                    className={`p-3 rounded-2xl border transition-all ${
                                        hasMatchedItem
                                            ? "bg-amber-500/[0.08] border-amber-500/50 ring-1 ring-amber-500/30"
                                            : tier.currentUnits === 0
                                            ? "bg-cyan-500/[0.02] border-cyan-500/20"
                                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-lg bg-black/60 border text-xs font-black font-mono flex items-center justify-center ${
                                                hasMatchedItem ? "border-amber-500 text-[var(--color-gold)]" : "border-white/15 text-slate-300"
                                            }`}>
                                                T{tier.levelNumber}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-white">{tier.levelName}</span>
                                                    {hasMatchedItem && (
                                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black uppercase bg-amber-500/20 text-[var(--color-gold)] border border-amber-500/30">
                                                            ★ SEARCH MATCH
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-400">
                                                    Slot Height: 1.2m
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono font-bold text-slate-200">
                                                {tier.currentUnits} / {tier.capacity}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden mb-2.5">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                hasMatchedItem
                                                    ? "bg-[var(--color-gold)]"
                                                    : tier.currentUnits === 0
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
                                        <div className="space-y-1.5">
                                            {tier.items.map((item: any) => {
                                                const isTarget = targetAssetCode && item.assetTagCode === targetAssetCode;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                                            isTarget
                                                                ? "bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10"
                                                                : "bg-black/50 border-white/10 hover:border-white/20"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                                            {item.productImage ? (
                                                                <img
                                                                    src={item.productImage}
                                                                    alt={item.productName}
                                                                    className="w-7 h-7 rounded-lg object-cover border border-white/10 bg-white/5 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                                    <Box className="w-3.5 h-3.5 text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`font-mono font-bold text-xs truncate ${isTarget ? "text-[var(--color-gold)]" : "text-white"}`}>
                                                                        {item.assetTagCode}
                                                                    </span>
                                                                    {isTarget && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] animate-ping shrink-0" />
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-slate-300 block truncate">
                                                                    {item.productName || "Equipment Unit"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                                {item.conditionStatus || "EXCELLENT"}
                                                            </span>
                                                            <span className="text-[8px] font-mono text-slate-500">
                                                                {item.shelfLocation || `T${tier.levelNumber}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-cyan-400/80 font-mono flex items-center gap-1 py-0.5">
                                            <CheckCircle2 className="w-3 h-3" /> Empty shelf &bull; ready for putaway
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                            <Box className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                            <p className="text-[11px] text-slate-400">No active item data mapped to this rack yet.</p>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 border-t border-white/10 bg-black/50 space-y-2">
                    {onToggleDeadSpot && (
                        <button
                            onClick={() => onToggleDeadSpot(rack.id)}
                            className={`w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                                isDeadSpot
                                    ? "bg-amber-500/10 text-[var(--color-gold)] border-amber-500/30 hover:bg-amber-500/20"
                                    : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                            }`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {isDeadSpot ? "Mark as Active Storage" : "Flag as Cold Dead Spot"}
                        </button>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                alert(`Directed Putaway Task generated for ${rack.rackCode || rack.label}. Check WMS Putaway page.`);
                            }}
                            className="flex-1 py-2 rounded-xl bg-[var(--color-gold)] text-black text-[11px] font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Putaway to Rack
                        </button>
                        <button
                            onClick={() => {
                                alert(`Print Job sent to Zebra ZT411 for barcode: ${rack.rackCode || rack.label}`);
                            }}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                            title="Print Rack QR / Barcode"
                        >
                            <QrCode className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Print Tag</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
