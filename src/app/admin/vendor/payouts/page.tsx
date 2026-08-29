"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { CreditCard, DollarSign, Download, Calendar, Activity, TrendingUp, AlertCircle } from "lucide-react";

export default function VendorPayouts() {
    const [stats, setStats] = useState<any>(null);
    const [ledgers, setLedgers] = useState<any[]>([]);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/vendors/me").then(res => res.json()).catch(() => ({})),
            fetch("/api/vendor/settlements").then(res => res.json()).catch(() => ({})),
        ]).then(([meData, settlementData]) => {
            if (meData.stats) setStats(meData.stats);
            if (settlementData.ledgers) setLedgers(settlementData.ledgers);
            if (settlementData.settlements) setSettlements(settlementData.settlements);
            if (settlementData.totals && meData.stats) {
                setStats({
                    ...meData.stats,
                    totalRevenue: settlementData.totals.grossEarnings,
                    pendingPayouts: settlementData.totals.pendingPayouts,
                });
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" />
            </div>
        );
    }

    const { totalRevenue = 0, pendingPayouts = 0, commissionRate = 20 } = stats || {};

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-[var(--color-gold)]" />
                        Financial Ledger & Settlements
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1">Track your revenue, platform commissions, and pending payouts.</p>
                </div>
            </div>

            {/* Core Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-gold)]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center mb-4">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-[var(--color-slate)] font-medium mb-1">Total Gross Revenue</p>
                        <h3 className="text-3xl font-bold font-mono text-[var(--color-warm-white)]">QAR {totalRevenue.toLocaleString()}</h3>
                        <p className="text-xs text-[var(--color-slate)] mt-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-[var(--color-success)]" /> Since joining
                        </p>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                            <Activity className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-[var(--color-slate)] font-medium mb-1">Pending Payout</p>
                        <h3 className="text-3xl font-bold font-mono text-[var(--color-warm-white)]">QAR {pendingPayouts.toLocaleString()}</h3>
                        <p className="text-xs text-[var(--color-slate)] mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-yellow-500" /> Clearance holds may apply
                        </p>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-[var(--color-slate)] font-medium mb-1">Platform Commission</p>
                        <h3 className="text-3xl font-bold font-mono text-[var(--color-warm-white)]">{commissionRate}%</h3>
                        <p className="text-xs text-[var(--color-slate)] mt-2">Deducted per successful transaction</p>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 bg-[var(--color-navy-dark)] flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold tracking-wider text-[var(--color-warm-white)]">
                        COMMERCIAL LEDGER & TRANSACTION BREAKDOWN
                    </h2>
                    <span className="text-xs text-[var(--color-slate)] font-mono">{ledgers.length} records</span>
                </div>
                {ledgers.length === 0 ? (
                    <div className="p-8 text-center text-[var(--color-slate)] bg-[var(--color-navy)]/30">
                        <DollarSign className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p>No recent payouts found.</p>
                        <p className="text-xs mt-1 opacity-70">Your ledger will populate once bookings involving your products are confirmed and approved.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 text-[var(--color-slate)] uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Project / Item</th>
                                    <th className="px-6 py-3">Gross Amount</th>
                                    <th className="px-6 py-3">Platform Cut</th>
                                    <th className="px-6 py-3">Net Payout</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ledgers.map((l: any) => (
                                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            {l.booking?.projectName || `#${(l.bookingId || "").slice(0, 8)}`}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[var(--color-warm-white)]">
                                            QAR {(l.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-rose-400">
                                            -QAR {(l.platformFee || 0).toLocaleString()} ({l.commissionRate}%)
                                        </td>
                                        <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                                            QAR {(l.vendorPayout || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                l.status === 'paid' 
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {l.status === 'paid' ? 'Paid / Settled' : 'Pending Payout'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--color-slate)]">
                                            {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
