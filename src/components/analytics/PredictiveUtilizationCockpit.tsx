"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    TrendingUp, AlertTriangle, ShieldCheck, DollarSign, BarChart3, 
    Layers, RefreshCw, CheckCircle2, UserCheck, AlertOctagon, Plus, X 
} from "lucide-react";

interface CategoryHorizon {
    horizon: string;
    totalUnits: number;
    bookedUnits: number;
    utilizationPct: number;
    riskLevel: "safe" | "moderate" | "high" | "critical_shortage";
}

interface CategoryShortage {
    categoryId: string;
    categoryName: string;
    totalFleetUnits: number;
    horizons: CategoryHorizon[];
}

interface RevParMetric {
    categoryId: string;
    categoryName: string;
    fleetUnits: number;
    totalRevenueQar: number;
    revParDailyQar: number;
    revParMonthlyQar: number;
    capitalYieldPct: number;
    status: string;
}

interface CreditProfile {
    id: string;
    clientName: string;
    creditLimit: number;
    currentOutstanding: number;
    paymentBehaviorScore: number;
    riskTier: "low_risk" | "medium_risk" | "high_risk" | "credit_hold";
    averageDaysToPay: number;
    lastAuditedAt: string;
}

export default function PredictiveUtilizationCockpit() {
    const [shortageData, setShortageData] = useState<CategoryShortage[]>([]);
    const [revParData, setRevParData] = useState<RevParMetric[]>([]);
    const [creditProfiles, setCreditProfiles] = useState<CreditProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Audit Form
    const [clientName, setClientName] = useState("");
    const [creditLimit, setCreditLimit] = useState(80000);
    const [currentOutstanding, setCurrentOutstanding] = useState(15000);
    const [avgDays, setAvgDays] = useState(14);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const [revRes, credRes] = await Promise.all([
                fetch("/api/admin/analytics/predictive-revpar"),
                fetch("/api/admin/analytics/credit-health"),
            ]);

            if (revRes.ok) {
                const data = await revRes.json();
                setShortageData(data.heatmap?.categories || []);
                setRevParData(data.revPar || []);
            }
            if (credRes.ok) {
                const data = await credRes.json();
                setCreditProfiles(data.profiles || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const handleAuditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName) return;
        try {
            setSubmitting(true);
            const res = await fetch("/api/admin/analytics/credit-health", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientName,
                    creditLimit: Number(creditLimit),
                    currentOutstanding: Number(currentOutstanding),
                    averageDaysToPay: Number(avgDays),
                }),
            });
            if (res.ok) {
                setIsAuditModalOpen(false);
                setClientName("");
                await loadAnalytics();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && shortageData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 glass rounded-2xl border border-white/10">
                <RefreshCw className="w-8 h-8 text-[var(--color-gold)] animate-spin mb-4" />
                <p className="text-sm font-bold tracking-widest text-[var(--color-slate)] uppercase">Computing 30/60/90-Day Utilization & RevPAR Models...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full animate-fade-in">
            {/* Top Toolbar */}
            <div className="glass p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-white uppercase tracking-wider">
                            Executive RevPAR & Predictive Fleet Shortage Engine
                        </h2>
                        <p className="text-xs text-[var(--color-slate)]">
                            Macro Shortage Forecasting, Category RevPAR Yield, and Corporate Credit Health Scoring
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAuditModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[var(--color-gold)]/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Audit Corporate Client
                    </button>
                    <button
                        onClick={loadAnalytics}
                        className="p-2.5 glass rounded-xl border border-white/10 text-[var(--color-slate)] hover:text-white transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 30 / 60 / 90-Day Predictive Shortage Heatmap */}
            <div className="glass rounded-2xl border border-white/10 p-6 flex flex-col gap-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-400" /> 30 / 60 / 90-Day Predictive Equipment Shortage Heatmap
                        </h3>
                        <p className="text-xs text-[var(--color-slate)]">
                            Fleet reservation load vs physical capacity across future rolling horizons
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] uppercase font-bold font-mono">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500" /> &lt;60% Safe
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500" /> 60-75% Moderate
                        </span>
                        <span className="flex items-center gap-1.5 text-orange-400">
                            <span className="w-2.5 h-2.5 rounded bg-orange-500/40 border border-orange-500" /> 75-90% High
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-400">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500" /> &gt;90% Critical
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-white/10 text-[var(--color-slate)] text-[10px] uppercase tracking-wider font-mono">
                                <th className="py-2.5 px-3">Equipment Category</th>
                                <th className="py-2.5 px-3">Total Fleet Units</th>
                                <th className="py-2.5 px-3">1 - 10 Days Horizon</th>
                                <th className="py-2.5 px-3">11 - 30 Days Horizon</th>
                                <th className="py-2.5 px-3">31 - 60 Days Horizon</th>
                                <th className="py-2.5 px-3">61 - 90 Days Horizon</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {shortageData.slice(0, 8).map((cat) => (
                                <tr key={cat.categoryId} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 px-3 font-bold text-white">
                                        {cat.categoryName}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-[var(--color-slate)] font-bold">
                                        {cat.totalFleetUnits} units
                                    </td>
                                    {cat.horizons.map((h, idx) => {
                                        let cellStyle = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
                                        if (h.riskLevel === "critical_shortage") {
                                            cellStyle = "bg-rose-500/20 text-rose-300 border-rose-500/40 font-black animate-pulse";
                                        } else if (h.riskLevel === "high") {
                                            cellStyle = "bg-orange-500/20 text-orange-300 border-orange-500/30 font-bold";
                                        } else if (h.riskLevel === "moderate") {
                                            cellStyle = "bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold";
                                        }

                                        return (
                                            <td key={idx} className="py-3 px-3">
                                                <div className={`px-2.5 py-1.5 rounded-xl border text-center font-mono text-xs ${cellStyle}`}>
                                                    <span>{h.utilizationPct}%</span>
                                                    <span className="text-[10px] opacity-75 ml-1">
                                                        ({h.bookedUnits}/{h.totalUnits})
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Executive RevPAR Category Breakdown Grid */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-[var(--color-gold)]" /> Executive RevPAR Yield by Category
                        </h3>
                        <p className="text-xs text-[var(--color-slate)]">
                            Monthly Revenue Per Available Rental Unit (RevPAR) & Capital Efficiency Ranking
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {revParData.slice(0, 4).map((rp) => (
                        <div
                            key={rp.categoryId}
                            className="glass rounded-2xl border border-white/10 p-5 flex flex-col justify-between gap-3 relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent shadow-lg"
                        >
                            <div className="flex items-start justify-between">
                                <span className="font-bold text-xs text-white tracking-wide">
                                    {rp.categoryName}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                    rp.status === "Top Performer" 
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                }`}>
                                    {rp.status}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">
                                    Monthly RevPAR
                                </span>
                                <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                                    QAR {rp.revParMonthlyQar.toLocaleString()}
                                    <span className="text-xs text-[var(--color-slate)] font-normal">/ unit</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-[var(--color-slate)]">
                                <span>Daily: QAR {rp.revParDailyQar}/day</span>
                                <span className="text-emerald-400 font-bold">{rp.capitalYieldPct}% Yield</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Corporate Client Credit Health Scoring Leaderboard */}
            <div className="glass rounded-2xl border border-white/10 p-6 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-400" /> Corporate Client Credit Health Scoring
                        </h3>
                        <p className="text-xs text-[var(--color-slate)]">
                            Credit limit utilization, payment behavior score (0-100), and automated risk tiers
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-white/10 text-[var(--color-slate)] text-[10px] uppercase tracking-wider font-mono">
                                <th className="py-2.5 px-3">Corporate Client</th>
                                <th className="py-2.5 px-3">Credit Limit</th>
                                <th className="py-2.5 px-3">Current Outstanding</th>
                                <th className="py-2.5 px-3">Payment Score</th>
                                <th className="py-2.5 px-3">Risk Tier</th>
                                <th className="py-2.5 px-3">Avg Days to Pay</th>
                                <th className="py-2.5 px-3 text-right">Commercial Terms</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {creditProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-xs text-[var(--color-slate)] italic">
                                        No audited corporate credit profiles on file. Click "Audit Corporate Client" to evaluate client credit.
                                    </td>
                                </tr>
                            ) : (
                                creditProfiles.map((cp) => {
                                    const isHold = cp.riskTier === "credit_hold";
                                    const isHigh = cp.riskTier === "high_risk";

                                    return (
                                        <tr key={cp.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 px-3 font-bold text-white">
                                                {cp.clientName}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-white">
                                                QAR {cp.creditLimit.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3 font-mono font-bold text-amber-300">
                                                QAR {cp.currentOutstanding.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-black text-white">{cp.paymentBehaviorScore}/100</span>
                                                    <div className="w-16 h-1.5 rounded-full bg-black/40 overflow-hidden border border-white/5">
                                                        <div 
                                                            className={`h-full rounded-full ${
                                                                cp.paymentBehaviorScore >= 80 ? "bg-emerald-400" : cp.paymentBehaviorScore >= 60 ? "bg-amber-400" : "bg-rose-500"
                                                            }`}
                                                            style={{ width: `${cp.paymentBehaviorScore}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                    isHold 
                                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                                        : isHigh
                                                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                }`}>
                                                    {cp.riskTier.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 font-mono text-[var(--color-slate)]">
                                                {cp.averageDaysToPay} days
                                            </td>
                                            <td className="py-3 px-3 text-right font-semibold text-xs">
                                                {isHold ? (
                                                    <span className="text-rose-400 font-bold">100% Upfront Only</span>
                                                ) : isHigh ? (
                                                    <span className="text-amber-400 font-bold">50% Advance Required</span>
                                                ) : (
                                                    <span className="text-emerald-400 font-bold">Net-30 Invoice</span>
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

            {/* Audit Client Modal */}
            {isAuditModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={handleAuditClient} className="glass rounded-3xl border border-white/10 w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Audit Corporate Client Credit Health
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAuditModalOpen(false)}
                                className="p-1 rounded-lg text-[var(--color-slate)] hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-xs">
                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Corporate Entity / Company Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Qatar Foundation Events Directorate"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Credit Limit (QAR)</label>
                                    <input
                                        type="number"
                                        value={creditLimit}
                                        onChange={e => setCreditLimit(Number(e.target.value))}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Current Outstanding</label>
                                    <input
                                        type="number"
                                        value={currentOutstanding}
                                        onChange={e => setCurrentOutstanding(Number(e.target.value))}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Average Settle Time (Days)</label>
                                <input
                                    type="number"
                                    value={avgDays}
                                    onChange={e => setAvgDays(Number(e.target.value))}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsAuditModalOpen(false)}
                                className="px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider hover:brightness-110"
                            >
                                Calculate Risk Score
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
