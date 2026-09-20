"use client";

import React from "react";
import { X, Layers, Box, QrCode, AlertCircle, ArrowRightLeft, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";

interface RackDetailDrawerProps {
    rack: any;
    onClose: () => void;
    onToggleDeadSpot?: (rackId: string) => void;
}

export default function RackDetailDrawer({ rack, onClose, onToggleDeadSpot }: RackDetailDrawerProps) {
    if (!rack) return null;

    const isDeadSpot = rack.isDeadSpot || rack.status === "dead_spot";
    const isEmpty = rack.isEmpty || rack.currentUnits === 0;

    return (
        <div className="fixed top-20 bottom-0 right-0 z-40 w-full max-w-md bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                            {rack.aisle || "Aisle"} &bull; {rack.rackCode || "Rack"}
                        </span>
                        {isEmpty ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                100% Empty
                            </span>
                        ) : isDeadSpot ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Dead Spot
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {rack.occupancyPercent}% Occupied
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-black text-white">{rack.label}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{rack.zoneCode || "Zone"} &middot; {rack.levels || 4} Shelving Tiers</p>
                </div>
                <button
                    id="close-rack-drawer-btn"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-white/[0.02] border-b border-white/10 text-center">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Units</p>
                    <p className="text-lg font-black text-white mt-1">{rack.currentUnits || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</p>
                    <p className="text-lg font-black text-slate-200 mt-1">{rack.maxCapacity || (rack.levels || 4) * 25}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available</p>
                    <p className="text-lg font-black text-cyan-400 mt-1">
                        {Math.max(0, (rack.maxCapacity || (rack.levels || 4) * 25) - (rack.currentUnits || 0))}
                    </p>
                </div>
            </div>

            {/* Shelf Tiers Breakdown */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[var(--color-gold)]" /> Vertical Shelf Levels
                    </p>
                    <span className="text-[11px] text-slate-500 font-mono">Tier 4 (Top) &rarr; Tier 1 (Base)</span>
                </div>

                {rack.tiers && rack.tiers.length > 0 ? (
                    // Display reverse order so Tier 4 is at the top physically
                    [...rack.tiers].reverse().map((tier: any) => (
                        <div
                            key={tier.levelNumber}
                            className={`p-4 rounded-2xl border transition-all ${
                                tier.currentUnits === 0
                                    ? "bg-cyan-500/[0.03] border-cyan-500/20 hover:border-cyan-500/40"
                                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 text-[11px] font-black font-mono flex items-center justify-center text-white">
                                        T{tier.levelNumber}
                                    </span>
                                    <span className="text-sm font-bold text-white">{tier.levelName}</span>
                                </div>
                                <span className="text-xs font-mono text-slate-400">
                                    {tier.currentUnits} / {tier.capacity} units
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        tier.currentUnits === 0
                                            ? "bg-cyan-400"
                                            : tier.currentUnits / tier.capacity > 0.8
                                            ? "bg-rose-500"
                                            : "bg-amber-400"
                                    }`}
                                    style={{ width: `${Math.min(100, (tier.currentUnits / tier.capacity) * 100)}%` }}
                                />
                            </div>

                            {/* Items preview */}
                            {tier.items && tier.items.length > 0 ? (
                                <div className="space-y-1.5">
                                    {tier.items.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="font-mono font-bold text-white">{item.assetTagCode}</span>
                                            </div>
                                            <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                                {item.productName || "Equipment Unit"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-cyan-400/80 font-mono flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Empty shelf ready for incoming putaway
                                </p>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                        <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No active item data mapped to this rack yet.</p>
                    </div>
                )}
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-white/10 bg-black/40 space-y-2">
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
                        {isDeadSpot ? "Mark as Active Storage" : "Flag as Low-Turnover Dead Spot"}
                    </button>
                )}
                <div className="flex gap-2">
                    <button
                        onClick={() => alert(`Direct Putaway assigned to Rack ${rack.rackCode || rack.label}`)}
                        className="flex-1 py-2.5 rounded-xl bg-[var(--color-gold)] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Putaway to Rack
                    </button>
                    <button
                        onClick={() => alert(`Printing shelf barcode for ${rack.rackCode || rack.label}`)}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center"
                        title="Print Rack QR / Barcode"
                    >
                        <QrCode className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
