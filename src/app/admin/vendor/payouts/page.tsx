"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { CreditCard, DollarSign, Download, Calendar, Activity, TrendingUp, AlertCircle } from "lucide-react";

export default function VendorPayouts() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/vendors/me")
            .then(res => res.json())
            .then(data => {
                if (data.stats) setStats(data.stats);
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" />
            </div>
        );
    }

    const { totalRevenue = 0, pendingPayouts = 0, commissionRate = 15 } = stats || {};

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-[var(--color-gold)]" />
                        Financial Ledger
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1">Track your revenue, platform commissions, and pending payouts.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-navy-dark)] border border-white/10 hover:border-white/30 rounded-xl text-sm font-medium transition-colors">
                    <Download className="w-4 h-4" /> Download Statement
                </button>
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
                        RECENT PAYMENTS
                    </h2>
                </div>
                <div className="p-8 text-center text-[var(--color-slate)] bg-[var(--color-navy)]/30">
                    <DollarSign className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>No recent payouts found.</p>
                    <p className="text-xs mt-1 opacity-70">Your ledger will populate once bookings involving your products are completed and cleared.</p>
                </div>
            </div>
        </div>
    );
}
