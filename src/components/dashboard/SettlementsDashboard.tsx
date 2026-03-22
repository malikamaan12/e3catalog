"use client";

import React, { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { 
    Banknote, Clock, CheckCircle2, AlertCircle, 
    TrendingUp, Receipt, ExternalLink, ArrowRight,
    Search, Filter, Calendar, LayoutGrid, List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { EvidenceUploadModal } from "./EvidenceUploadModal";
import { cn } from "@/lib/utils";

interface Settlement {
    id: string;
    amountOwed: number;
    status: "pending" | "submitted_for_review" | "approved_paid" | "overdue";
    paymentEvidenceUrl: string | null;
    createdAt: string;
    submittedAt: string | null;
    booking: {
        id: string;
        projectName: string;
        customerName: string;
        startDate: string;
    };
}

export default function SettlementsDashboard() {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

    const fetchSettlements = async () => {
        try {
            const res = await fetch("/api/vendor/settlements");
            const data = await res.json();
            if (data.settlements) {
                setSettlements(data.settlements);
            }
        } catch (err) {
            console.error("Failed to fetch settlements", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettlements();
    }, []);

    const stats = {
        totalOwed: settlements
            .filter(s => s.status === "pending" || s.status === "overdue")
            .reduce((acc, s) => acc + s.amountOwed, 0),
        pendingReview: settlements
            .filter(s => s.status === "submitted_for_review")
            .reduce((acc, s) => acc + s.amountOwed, 0),
        lifetimePaid: settlements
            .filter(s => s.status === "approved_paid")
            .reduce((acc, s) => acc + s.amountOwed, 0),
    };

    const pendingSettlements = settlements.filter(s => s.status === "pending" || s.status === "overdue");
    const historySettlements = settlements.filter(s => s.status === "submitted_for_review" || s.status === "approved_paid");

    const filterList = (list: Settlement[]) => list.filter(s => 
        s.booking.projectName.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--color-slate)] font-bold text-sm uppercase tracking-widest">Auditing Marketplace Ledger...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-32">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard 
                    title="Current Debt" 
                    value={stats.totalOwed} 
                    icon={TrendingUp} 
                    subtitle="Fees awaiting settlement" 
                    color="gold"
                />
                <KPICard 
                    title="Under Review" 
                    value={stats.pendingReview} 
                    icon={Clock} 
                    subtitle="Proofs sent to admin" 
                    color="blue"
                />
                <KPICard 
                    title="Lifetime Paid" 
                    value={stats.lifetimePaid} 
                    icon={CheckCircle2} 
                    subtitle="Successfully settled" 
                    color="emerald"
                />
            </div>

            {/* Main Tabs Container */}
            <Tabs.Root defaultValue="pending" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                    <Tabs.List className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1.5 p-1.5 self-start">
                        <Tabs.Trigger 
                            value="pending"
                            className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all data-[state=active]:bg-[var(--color-gold)] data-[state=active]:text-[var(--color-navy)] data-[state=inactive]:text-[var(--color-slate)] hover:data-[state=inactive]:text-[var(--color-warm-white)]"
                        >
                            Pending Action
                        </Tabs.Trigger>
                        <Tabs.Trigger 
                            value="history"
                            className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all data-[state=active]:bg-[var(--color-gold)] data-[state=active]:text-[var(--color-navy)] data-[state=inactive]:text-[var(--color-slate)] hover:data-[state=inactive]:text-[var(--color-warm-white)]"
                        >
                            Audit History
                        </Tabs.Trigger>
                    </Tabs.List>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input 
                            type="search"
                            placeholder="Find settlement ID or Project..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none transition-all"
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <Tabs.Content value="pending" key="pending" asChild>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            <SettlementList 
                                settlements={filterList(pendingSettlements)} 
                                onSettle={(s) => setSelectedSettlement(s)}
                            />
                        </motion.div>
                    </Tabs.Content>

                    <Tabs.Content value="history" key="history" asChild>
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-4"
                        >
                            <SettlementList 
                                settlements={filterList(historySettlements)} 
                            />
                        </motion.div>
                    </Tabs.Content>
                </AnimatePresence>
            </Tabs.Root>

            <EvidenceUploadModal 
                isOpen={!!selectedSettlement}
                onClose={() => setSelectedSettlement(null)}
                settlementId={selectedSettlement?.id || ""}
                amount={selectedSettlement?.amountOwed || 0}
                onSuccess={fetchSettlements}
            />
        </div>
    );
}

function KPICard({ title, value, icon: Icon, subtitle, color = "gold" }: any) {
    const colors = {
        gold: "text-[var(--color-gold)] bg-[var(--color-gold)]/10 border-[var(--color-gold)]/20 shadow-[0_0_40px_rgba(255,191,0,0.05)]",
        blue: "text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_40px_rgba(96,165,250,0.05)]",
        emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_40px_rgba(52,211,153,0.05)]"
    } as any;

    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn("p-8 rounded-[32px] glass border relative overflow-hidden group", colors[color])}
        >
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-28 h-28" />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black">{value.toLocaleString()}</span>
                <span className="text-xs font-bold opacity-60">QAR</span>
            </div>
            <p className="text-[10px] font-black mt-2 opacity-60 uppercase tracking-tighter">{subtitle}</p>
        </motion.div>
    );
}

function SettlementList({ settlements, onSettle }: { settlements: Settlement[], onSettle?: (s: Settlement) => void }) {
    if (settlements.length === 0) {
        return (
            <div className="py-32 text-center glass rounded-[40px] border border-dashed border-white/10">
                <Banknote className="w-16 h-16 text-[var(--color-slate)]/20 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-[var(--color-warm-white)]">No records found</h3>
                <p className="text-sm text-[var(--color-slate)] max-w-xs mx-auto mt-2 italic opacity-60">
                    Your financial audit history is currently empty or matches no filters.
                </p>
            </div>
        );
    }

    return (
        <div className="glass rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                            <th className="px-8 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Target Project</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Platform Cut</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Status</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Audit Trail</th>
                            <th className="px-8 py-6 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Collections</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                        {settlements.map((s) => (
                            <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-[var(--color-warm-white)] font-bold text-lg group-hover:text-[var(--color-gold)] transition-colors">{s.booking.projectName}</span>
                                        <span className="text-[10px] text-[var(--color-slate)] mt-1 font-black uppercase tracking-tighter opacity-60">
                                             REF: {s.id.split('-')[0]} • {s.booking.customerName}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-black text-[var(--color-gold)]">{s.amountOwed.toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-[var(--color-slate)] uppercase">QAR</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <StatusBadge status={s.status} />
                                </td>
                                <td className="px-8 py-6 text-xs text-[var(--color-slate)] font-bold italic">
                                    Generated {format(new Date(s.createdAt), "MMM d, yyyy")}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    {onSettle && s.status === "pending" || s.status === "overdue" ? (
                                        <button 
                                            onClick={() => onSettle && onSettle(s)}
                                            className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/10"
                                        >
                                            Settle Balance
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-3">
                                            {s.paymentEvidenceUrl && (
                                                <a 
                                                    href={s.paymentEvidenceUrl} 
                                                    target="_blank" 
                                                    className="flex items-center gap-2 text-[10px] font-black text-[var(--color-slate)] uppercase hover:text-[var(--color-gold)] transition-colors border border-white/10 px-3 py-2 rounded-lg bg-white/5"
                                                >
                                                    Receipt <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: Settlement["status"] }) {
    const config = {
        pending: { label: "Awaiting Payment", icon: Clock, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
        overdue: { label: "Collection Overdue", icon: AlertCircle, color: "text-red-400 bg-red-400/10 border-red-400/20 animate-pulse" },
        submitted_for_review: { label: "Under E3 Audit", icon: Clock, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
        approved_paid: { label: "Successfully Settled", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 font-black italic" }
    } as any;

    const { label, icon: Icon, color } = config[status];

    return (
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", color)}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </div>
    );
}
