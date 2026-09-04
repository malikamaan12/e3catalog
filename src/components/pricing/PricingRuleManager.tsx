"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    TrendingUp, 
    Calendar, 
    Zap, 
    Plus, 
    CheckCircle2, 
    Percent, 
    RefreshCcw, 
    Flame, 
    Sliders,
    Layers,
    Tag
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function PricingRuleManager() {
    const [surgeRules, setSurgeRules] = useState<any[]>([]);
    const [durationTiers, setDurationTiers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddSurge, setShowAddSurge] = useState(false);
    const [showAddTier, setShowAddTier] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newSurge, setNewSurge] = useState({
        name: "",
        code: "",
        multiplier: 1.25,
        startDate: "",
        endDate: "",
        dayOfWeek: "",
    });

    const [newTier, setNewTier] = useState({
        name: "",
        minDays: 4,
        maxDays: 7,
        discountPercent: 15,
    });

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/pricing/rules");
            const data = await res.json();
            if (res.ok) {
                setSurgeRules(data.surgeRules || []);
                setDurationTiers(data.durationTiers || []);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load pricing rules");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleCreateSurge = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/pricing/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "surge", ...newSurge }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Surge rule created!");
                setShowAddSurge(false);
                setNewSurge({ name: "", code: "", multiplier: 1.25, startDate: "", endDate: "", dayOfWeek: "" });
                fetchRules();
            } else {
                toast.error(data.error || "Failed to create rule");
            }
        } catch (e: any) {
            toast.error(e.message || "Error creating surge rule");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTier = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/pricing/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "tier", ...newTier }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Duration tier curve saved!");
                setShowAddTier(false);
                fetchRules();
            } else {
                toast.error(data.error || "Failed to create tier");
            }
        } catch (e: any) {
            toast.error(e.message || "Error creating tier");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Header */}
            <div className="p-6 md:p-8 rounded-3xl bg-navy border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-[family-name:var(--font-heading)] font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                        <Flame className="w-5 h-5 text-gold" />
                        Dynamic Surge & Tiered Rate Engine
                    </h2>
                    <p className="text-xs text-slate mt-1">
                        Calibrate peak holiday multipliers and non-linear duration discount curves for automated quoting.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRules}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate hover:text-white transition-all"
                        title="Refresh"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setShowAddSurge(true)}
                        className="px-4 py-2.5 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Add Surge Rule
                    </button>
                    <button
                        onClick={() => setShowAddTier(true)}
                        className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-black text-xs uppercase tracking-wider hover:bg-white/20 transition-all flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Add Duration Tier
                    </button>
                </div>
            </div>

            {/* Two Column Layout: Surge Rules & Duration Tiers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Surge Multipliers */}
                <div className="p-6 rounded-3xl bg-surface/60 border border-white/10 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-gold" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                Peak Event Surge Rules
                            </h3>
                        </div>
                        <span className="text-[10px] font-mono text-gold font-bold">
                            {surgeRules.length} Active
                        </span>
                    </div>

                    {surgeRules.length === 0 ? (
                        <div className="p-8 text-center text-slate text-xs italic rounded-2xl bg-white/[0.02]">
                            No peak surge multipliers registered.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {surgeRules.map(rule => {
                                const multPct = Math.round((rule.multiplier - 1) * 100);
                                return (
                                    <div key={rule.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-gold/10 text-gold border border-gold/20">
                                                    {rule.code}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                                {rule.startDate && rule.endDate ? (
                                                    <span>{new Date(rule.startDate).toLocaleDateString()} - {new Date(rule.endDate).toLocaleDateString()}</span>
                                                ) : rule.dayOfWeek ? (
                                                    <span className="uppercase">Days: {rule.dayOfWeek}</span>
                                                ) : (
                                                    <span>Continuous Rule</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right font-mono">
                                            <span className="text-base font-black text-gold">
                                                +{multPct}%
                                            </span>
                                            <span className="block text-[9px] text-slate-500 font-sans">
                                                ({rule.multiplier}x Rate)
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Duration Tiers Curve */}
                <div className="p-6 rounded-3xl bg-surface/60 border border-white/10 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                Non-Linear Duration Curve
                            </h3>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            Automated Proration
                        </span>
                    </div>

                    <div className="space-y-3">
                        {/* Default built-in curve display */}
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs">
                            <span className="text-slate-300">1 – 3 Days (Event Base)</span>
                            <span className="font-mono font-bold text-white">0% Discount (1.0x Base)</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs">
                            <span className="text-slate-300">4 – 7 Days (Weekly Production)</span>
                            <span className="font-mono font-bold text-emerald-400">-15% Curve Discount</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs">
                            <span className="text-slate-300">8 – 14 Days (Multi-Week Tour)</span>
                            <span className="font-mono font-bold text-emerald-400">-25% Curve Discount</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs">
                            <span className="text-slate-300">15 – 29 Days (Fortnight Residency)</span>
                            <span className="font-mono font-bold text-emerald-400">-35% Curve Discount</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs">
                            <span className="text-slate-300">30+ Days (Monthly Long-Term)</span>
                            <span className="font-mono font-bold text-emerald-400">-45% Curve Discount</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Add Surge */}
            {showAddSurge && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-navy border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">
                            Add Demand Surge Multiplier
                        </h2>
                        <form onSubmit={handleCreateSurge} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">
                                    Rule Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newSurge.name}
                                    onChange={e => setNewSurge({ ...newSurge, name: e.target.value })}
                                    placeholder="e.g. Qatar National Day Peak"
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">
                                        Rule Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newSurge.code}
                                        onChange={e => setNewSurge({ ...newSurge, code: e.target.value })}
                                        placeholder="QND_2026"
                                        className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-gold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">
                                        Multiplier (e.g. 1.25 = +25%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        required
                                        value={newSurge.multiplier}
                                        onChange={e => setNewSurge({ ...newSurge, multiplier: Number(e.target.value) })}
                                        className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={newSurge.startDate}
                                        onChange={e => setNewSurge({ ...newSurge, startDate: e.target.value })}
                                        className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={newSurge.endDate}
                                        onChange={e => setNewSurge({ ...newSurge, endDate: e.target.value })}
                                        className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowAddSurge(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-slate font-black text-xs uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    {isSubmitting ? "Saving..." : "Save Surge Rule"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
