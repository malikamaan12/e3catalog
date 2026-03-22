"use client";

import React, { useState, useEffect } from "react";
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ExternalLink, 
    Banknote, 
    Search,
    MessageSquare,
    Eye,
    ReceiptText
} from "lucide-react";
import { format } from "date-fns";

interface Settlement {
    id: string;
    amountOwed: number;
    status: "pending" | "submitted_for_review" | "approved_paid" | "overdue";
    paymentEvidenceUrl: string | null;
    adminNotes: string | null;
    createdAt: string;
    submittedAt: string | null;
    vendor: {
        companyName: string;
        kycStatus: string;
    };
    booking: {
        id: string;
        projectName: string;
        customerName: string;
    };
}

export function AdminSettlementManager() {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    const fetchSettlements = async () => {
        try {
            const res = await fetch("/api/admin/settlements");
            const data = await res.json();
            if (data.settlements) {
                setSettlements(data.settlements);
            }
        } catch (err) {
            console.error("Failed to fetch admin settlements", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettlements();
    }, []);

    const handleAction = async (settlementId: string, status: string, notes?: string) => {
        try {
            const res = await fetch("/api/admin/settlements/approve", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settlementId, status, adminNotes: notes })
            });
            if (res.ok) fetchSettlements();
        } catch (err) {
            console.error("Failed to update settlement", err);
        }
    };

    const filtered = settlements.filter(s => {
        if (filter !== "all" && s.status !== filter) return false;
        if (search) {
            const low = search.toLowerCase();
            return s.vendor.companyName.toLowerCase().includes(low) || 
                   s.booking.projectName.toLowerCase().includes(low) ||
                   s.booking.id.includes(search);
        }
        return true;
    });

    const stats = {
        totalReceivable: settlements.filter(s => s.status !== "approved_paid").reduce((sum, s) => sum + s.amountOwed, 0),
        pendingReviews: settlements.filter(s => s.status === "submitted_for_review").length,
        settledTotal: settlements.filter(s => s.status === "approved_paid").reduce((sum, s) => sum + s.amountOwed, 0),
    };

    if (loading) return <div className="p-12 text-center text-[var(--color-slate)] animate-pulse">Loading settlement queue...</div>;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                        <Banknote className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-[var(--color-slate)] mb-1 tracking-widest">Expected Commissions</p>
                    <p className="text-3xl font-black text-[var(--color-gold)]">{stats.totalReceivable.toLocaleString()} <span className="text-sm font-normal opacity-60">QAR</span></p>
                    <p className="text-[10px] text-yellow-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Still in circulation
                    </p>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                        <ReceiptText className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-[var(--color-slate)] mb-1 tracking-widest">Pending Review</p>
                    <p className="text-3xl font-black text-blue-400">{stats.pendingReviews}</p>
                    <p className="text-[10px] text-blue-400 mt-2">Vendors awaiting verification</p>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                        <CheckCircle2 className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-[var(--color-slate)] mb-1 tracking-widest">Platform Revenue</p>
                    <p className="text-3xl font-black text-emerald-400">{stats.settledTotal.toLocaleString()} <span className="text-sm font-normal opacity-60">QAR</span></p>
                    <p className="text-[10px] text-emerald-400 mt-2">Successfully collected</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                    <input 
                        type="text" 
                        placeholder="Search by vendor, project or ID..."
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-[var(--color-gold)] outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {["all", "submitted_for_review", "pending", "approved_paid"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filter === f ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg" : "text-[var(--color-slate)] hover:text-white"
                            }`}
                        >
                            {f === "all" ? "All" : f.replace(/_/g, " ").toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase">Vendor / Project</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase">Debt Amount</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase">Proofs</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-slate)] uppercase">Decision</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.map(s => (
                            <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-[var(--color-warm-white)] font-bold">{s.vendor.companyName}</span>
                                        <span className="text-[10px] text-[var(--color-slate)] group-hover:text-[var(--color-gold)] transition-colors">
                                            {s.booking.projectName} • #{s.booking.id.split('-')[0]}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="text-sm font-black text-[var(--color-gold)]">
                                        {s.amountOwed.toLocaleString()} <span className="text-[10px] opacity-60">QAR</span>
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    {s.paymentEvidenceUrl ? (
                                        <a 
                                            href={s.paymentEvidenceUrl} 
                                            target="_blank" 
                                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all inline-flex items-center gap-2"
                                        >
                                            <Eye className="w-3 h-3" /> View Evidence
                                        </a>
                                    ) : (
                                        <span className="text-[10px] text-[var(--color-slate)] italic">No proof yet</span>
                                    )}
                                </td>
                                <td className="px-6 py-5">
                                    <StatusBadge status={s.status} />
                                </td>
                                <td className="px-6 py-5 text-right">
                                    {s.status === "submitted_for_review" && (
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleAction(s.id, "approved_paid")}
                                                className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all shadow-lg shadow-emerald-500/10"
                                                title="Approve Payment"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const note = prompt("Reason for rejection:");
                                                    if (note) handleAction(s.id, "pending", note);
                                                }}
                                                className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all shadow-lg shadow-red-500/10"
                                                title="Reject / Ask for resubmission"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    {s.status === "approved_paid" && (
                                        <div className="text-[10px] font-black text-emerald-400 uppercase italic flex items-center justify-end gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Settled
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
    switch (status) {
        case "pending":
            return <span className="text-[9px] font-black uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-full">Pending</span>;
        case "submitted_for_review":
            return <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-1 rounded-full">Review Input</span>;
        case "approved_paid":
            return <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">Settled</span>;
        case "overdue":
            return <span className="text-[9px] font-black uppercase text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-full">Overdue</span>;
        default: return null;
    }
}
