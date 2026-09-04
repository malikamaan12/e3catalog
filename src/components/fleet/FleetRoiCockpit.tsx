"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    TrendingUp, 
    Wrench, 
    AlertTriangle, 
    CheckCircle2, 
    DollarSign, 
    Activity, 
    RefreshCcw, 
    Zap, 
    ShieldAlert, 
    Clock, 
    Search, 
    ArrowUpRight, 
    Layers, 
    SlidersHorizontal,
    Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";

interface AssetMetrics {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    currentBookValue: number;
    netLifetimeRoiPercent: number;
    healthScore: number;
    daysSinceLastMaintenance: number;
    daysOverdue: number;
    maintenanceUrgency: "healthy" | "due_soon" | "overdue" | "critical";
}

interface FleetUnit {
    id: string;
    serialNumber: string;
    assetTagCode: string;
    productName: string;
    conditionStatus: string;
    availabilityStatus: string;
    acquisitionCost: number;
    salvageValue: number;
    usefulLifeYears: number;
    totalRentalDays: number;
    operatingHours: number;
    cumulativeRevenue: number;
    cumulativeMaintenanceCost: number;
    lastMaintenanceDate: string | null;
    preventiveMaintenanceIntervalDays: number;
    metrics: AssetMetrics;
}

interface FleetSummary {
    totalCapExInvested: number;
    totalCurrentBookValue: number;
    totalAccumulatedDepreciation: number;
    totalCumulativeRevenue: number;
    totalCumulativeMaintenanceCost: number;
    netFleetRoiPercent: number;
    averageHealthScore: number;
    totalUnitsCount: number;
    unitsRequiringMaintenanceCount: number;
}

export default function FleetRoiCockpit() {
    const [loading, setLoading] = useState(true);
    const [isTriggeringPm, setIsTriggeringPm] = useState(false);
    const [summary, setSummary] = useState<FleetSummary | null>(null);
    const [units, setUnits] = useState<FleetUnit[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [urgencyFilter, setUrgencyFilter] = useState<"all" | "attention" | "healthy">("all");

    const fetchRoiData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/fleet/roi");
            const data = await res.json();
            if (res.ok && data.summary) {
                setSummary(data.summary);
                setUnits(data.units || []);
            } else {
                toast.error(data.error || "Failed to load Fleet ROI telemetry");
            }
        } catch (err: any) {
            console.error("Failed to load Fleet ROI:", err);
            toast.error("Telemetry server offline");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoiData();
    }, [fetchRoiData]);

    const handleTriggerPmSweep = async (unitId?: string) => {
        setIsTriggeringPm(true);
        try {
            const res = await fetch("/api/admin/fleet/preventive-maintenance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(unitId ? { unitId } : {}),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "Preventive Maintenance orders dispatched!");
                fetchRoiData();
            } else {
                toast.error(data.error || "PM trigger failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to dispatch maintenance orders");
        } finally {
            setIsTriggeringPm(false);
        }
    };

    const filteredUnits = units.filter(u => {
        const matchesQuery = 
            u.assetTagCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.serialNumber || "").toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;

        if (urgencyFilter === "attention") {
            return u.metrics.maintenanceUrgency === "overdue" || 
                   u.metrics.maintenanceUrgency === "critical" || 
                   u.metrics.maintenanceUrgency === "due_soon";
        }
        if (urgencyFilter === "healthy") {
            return u.metrics.maintenanceUrgency === "healthy";
        }
        return true;
    });

    if (loading && !summary) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-slate space-y-4">
                <Activity className="w-10 h-10 text-gold animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-widest text-gold">Computing Straight-Line Depreciation & Asset ROI...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-up">
            {/* Top Financial KPI Row */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* CapEx Invested */}
                    <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate">Total CapEx Invested</span>
                            <DollarSign className="w-4 h-4 text-gold" />
                        </div>
                        <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-white">
                            {summary.totalCapExInvested.toLocaleString()} <span className="text-xs text-gold font-mono">QAR</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            {summary.totalUnitsCount} active units tracked
                        </p>
                    </div>

                    {/* Current Book Value */}
                    <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate">Current Book Valuation</span>
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-emerald-400">
                            {summary.totalCurrentBookValue.toLocaleString()} <span className="text-xs text-gold font-mono">QAR</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            -{(summary.totalAccumulatedDepreciation).toLocaleString()} QAR Depreciated
                        </p>
                    </div>

                    {/* Cumulative Revenue */}
                    <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate">Lifetime Rental Revenue</span>
                            <Sparkles className="w-4 h-4 text-gold" />
                        </div>
                        <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-white">
                            {summary.totalCumulativeRevenue.toLocaleString()} <span className="text-xs text-gold font-mono">QAR</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            Spend: {(summary.totalCumulativeMaintenanceCost).toLocaleString()} QAR
                        </p>
                    </div>

                    {/* Net Fleet ROI */}
                    <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate">Net Fleet ROI</span>
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className={`text-2xl font-[family-name:var(--font-heading)] font-black ${
                            summary.netFleetRoiPercent >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                            {summary.netFleetRoiPercent > 0 ? "+" : ""}{summary.netFleetRoiPercent}%
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            Net Capital Yield
                        </p>
                    </div>

                    {/* Fleet Health Index */}
                    <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate">Fleet Health Index</span>
                            <Activity className="w-4 h-4 text-gold" />
                        </div>
                        <div className={`text-2xl font-[family-name:var(--font-heading)] font-black ${
                            summary.averageHealthScore >= 80 ? "text-emerald-400" :
                            summary.averageHealthScore >= 60 ? "text-amber-400" : "text-red-400"
                        }`}>
                            {summary.averageHealthScore} <span className="text-xs text-slate font-mono">/100</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            {summary.unitsRequiringMaintenanceCount} units require service
                        </p>
                    </div>
                </div>
            )}

            {/* Preventive Maintenance Action Bar */}
            <div className="p-6 rounded-3xl bg-navy border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-4 h-4 text-gold" />
                        <h2 className="text-base font-bold text-white uppercase tracking-tight">
                            Automated Preventive Servicing Dispatcher
                        </h2>
                    </div>
                    <p className="text-xs text-slate max-w-xl">
                        Scans equipment operational run-time and rental cycles against calibrated maintenance intervals. Triggers work orders automatically when overdue.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRoiData}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate hover:text-white transition-all"
                        title="Refresh Telemetry"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>

                    <button
                        onClick={() => handleTriggerPmSweep()}
                        disabled={isTriggeringPm || summary?.unitsRequiringMaintenanceCount === 0}
                        className="px-6 py-3.5 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Zap className="w-4 h-4 fill-navy" />
                        {isTriggeringPm ? "Generating Work Orders..." : `Dispatch PM Sweep (${summary?.unitsRequiringMaintenanceCount || 0} Units)`}
                    </button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search assets by tag, serial number, or product name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                    />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-white/10">
                    <button
                        onClick={() => setUrgencyFilter("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            urgencyFilter === "all" ? "bg-gold text-navy shadow-md" : "text-slate hover:text-white"
                        }`}
                    >
                        All Units ({units.length})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter("attention")}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            urgencyFilter === "attention" ? "bg-amber-500 text-navy shadow-md" : "text-amber-400 hover:text-amber-300"
                        }`}
                    >
                        <AlertTriangle className="w-3 h-3" />
                        Needs Servicing ({summary?.unitsRequiringMaintenanceCount || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter("healthy")}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            urgencyFilter === "healthy" ? "bg-emerald-500 text-navy shadow-md" : "text-emerald-400 hover:text-emerald-300"
                        }`}
                    >
                        Healthy
                    </button>
                </div>
            </div>

            {/* Units ROI & Health Ledger Table */}
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-surface/50 shadow-2xl">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate">
                            <th className="p-4">Asset Identification</th>
                            <th className="p-4">CapEx (Original)</th>
                            <th className="p-4">Current Book Valuation</th>
                            <th className="p-4">Lifetime Revenue</th>
                            <th className="p-4">Lifetime ROI</th>
                            <th className="p-4">Health Score</th>
                            <th className="p-4">PM Urgency</th>
                            <th className="p-4 text-right">Quick Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUnits.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-slate italic">
                                    No assets match the active search and filter criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredUnits.map((unit) => {
                                const m = unit.metrics;
                                const isOverdue = m.maintenanceUrgency === "overdue" || m.maintenanceUrgency === "critical";
                                const isDueSoon = m.maintenanceUrgency === "due_soon";

                                return (
                                    <tr key={unit.id} className="hover:bg-white/[0.02] transition-colors">
                                        {/* Identification */}
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{unit.productName}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="font-mono text-[10px] text-gold font-bold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                                                    {unit.assetTagCode}
                                                </span>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                    SN: {unit.serialNumber || "N/A"}
                                                </span>
                                            </div>
                                        </td>

                                        {/* CapEx */}
                                        <td className="p-4 font-mono text-white font-bold">
                                            {Number(unit.acquisitionCost || 0).toLocaleString()} QAR
                                        </td>

                                        {/* Current Book Value */}
                                        <td className="p-4 font-mono font-bold text-emerald-400">
                                            {m.currentBookValue.toLocaleString()} QAR
                                            <div className="text-[9px] text-slate-500 font-sans">
                                                -{(m.accumulatedDepreciation).toLocaleString()} QAR depr.
                                            </div>
                                        </td>

                                        {/* Cumulative Revenue */}
                                        <td className="p-4 font-mono text-white">
                                            <div>{Number(unit.cumulativeRevenue || 0).toLocaleString()} QAR</div>
                                            <div className="text-[9px] text-slate-500 font-sans">
                                                Repair cost: {Number(unit.cumulativeMaintenanceCost || 0).toLocaleString()} QAR
                                            </div>
                                        </td>

                                        {/* Net ROI */}
                                        <td className="p-4 font-mono font-black">
                                            <span className={m.netLifetimeRoiPercent >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                {m.netLifetimeRoiPercent > 0 ? "+" : ""}{m.netLifetimeRoiPercent}%
                                            </span>
                                        </td>

                                        {/* Health Score */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 rounded-full bg-white/5 overflow-hidden">
                                                    <div 
                                                        className={`h-full ${
                                                            m.healthScore >= 80 ? "bg-emerald-500" :
                                                            m.healthScore >= 60 ? "bg-amber-500" : "bg-red-500"
                                                        }`}
                                                        style={{ width: `${m.healthScore}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-[11px] font-bold text-white">
                                                    {m.healthScore}/100
                                                </span>
                                            </div>
                                        </td>

                                        {/* PM Urgency */}
                                        <td className="p-4">
                                            {m.maintenanceUrgency === "critical" ? (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/20 border border-red-500/40 text-red-400 flex items-center gap-1 w-fit">
                                                    <ShieldAlert className="w-3 h-3" /> Critical ({m.daysOverdue}d overdue)
                                                </span>
                                            ) : m.maintenanceUrgency === "overdue" ? (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1 w-fit">
                                                    <AlertTriangle className="w-3 h-3" /> Overdue ({m.daysOverdue}d)
                                                </span>
                                            ) : m.maintenanceUrgency === "due_soon" ? (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1 w-fit">
                                                    <Clock className="w-3 h-3" /> Due Soon
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Healthy
                                                </span>
                                            )}
                                            <div className="text-[9px] text-slate-500 mt-1 font-mono">
                                                Cycle: {m.daysSinceLastMaintenance} / {unit.preventiveMaintenanceIntervalDays || 90}d
                                            </div>
                                        </td>

                                        {/* Quick Action */}
                                        <td className="p-4 text-right">
                                            {isOverdue || isDueSoon ? (
                                                <button
                                                    onClick={() => handleTriggerPmSweep(unit.id)}
                                                    disabled={isTriggeringPm}
                                                    className="px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/30 text-gold hover:bg-gold hover:text-navy font-black text-[10px] uppercase tracking-wider transition-all"
                                                >
                                                    Initiate WO
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 font-mono">In Spec</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
