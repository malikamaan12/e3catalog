"use client";

import React, { useState, useEffect } from "react";
import { 
    Banknote, 
    Receipt, 
    CreditCard, 
    FileText, 
    TrendingUp, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Download, 
    Calendar,
    AlertCircle,
    Scale,
    Layers,
    Search
} from "lucide-react";
import { AdminSettlementManager } from "@/components/admin/AdminSettlementManager";
import { FinancialJournalCockpit } from "@/components/financials/FinancialJournalCockpit";

export default function AdminFinancialsPage() {
    const [activeTab, setActiveTab] = useState<"invoices" | "aging" | "payments" | "settlements" | "journals" | "reconciliation">("invoices");
    const [invoicesList, setInvoicesList] = useState<any[]>([]);
    const [paymentsList, setPaymentsList] = useState<any[]>([]);
    const [agingData, setAgingData] = useState<any>(null);
    const [journalsList, setJournalsList] = useState<any[]>([]);
    const [reconciliation, setReconciliation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [invRes, payRes, ageRes, jrnRes, recRes] = await Promise.all([
                fetch("/api/invoices").then(r => r.json()).catch(() => ({ invoices: [] })),
                fetch("/api/payments").then(r => r.json()).catch(() => ({ payments: [] })),
                fetch("/api/admin/financials/aging").then(r => r.json()).catch(() => null),
                fetch("/api/admin/financials/journals").then(r => r.json()).catch(() => ({ journals: [] })),
                fetch("/api/admin/financials/reconciliation").then(r => r.json()).catch(() => null),
            ]);

            if (invRes.invoices) setInvoicesList(invRes.invoices);
            if (payRes.payments) setPaymentsList(payRes.payments);
            if (ageRes) setAgingData(ageRes);
            if (jrnRes.journals) setJournalsList(jrnRes.journals);
            if (recRes) setReconciliation(recRes);
        } catch (err) {
            console.error("Failed to load financial overview", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleIssueInvoice = async (id: string) => {
        try {
            const res = await fetch(`/api/invoices/${id}/issue`, { method: "POST" });
            if (res.ok) fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleVerifyPayment = async (paymentId: string) => {
        try {
            const res = await fetch(`/api/payments/${paymentId}/verify`, { method: "POST" });
            if (res.ok) fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredInvoices = invoicesList.filter(inv => {
        if (!search) return true;
        const low = search.toLowerCase();
        return inv.invoiceNumber?.toLowerCase().includes(low) || 
               inv.customerName?.toLowerCase().includes(low) ||
               inv.status?.toLowerCase().includes(low);
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
            <header className="pb-4 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[var(--color-gold)] mb-1">
                        <Banknote className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Enterprise Financial Operations</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black font-[family-name:var(--font-heading)] text-white">
                        Financial Control & General Ledger
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1 font-medium">
                        Customer Invoicing, Receivables Aging, Payment Verification, Vendor Settlements & Balanced Journals.
                    </p>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
                <button
                    onClick={() => setActiveTab("invoices")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        activeTab === "invoices"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                            : "bg-white/5 text-[var(--color-slate)] hover:bg-white/10"
                    }`}
                >
                    <Receipt className="w-4 h-4" /> Customer Invoices ({invoicesList.length})
                </button>
                <button
                    onClick={() => setActiveTab("aging")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        activeTab === "aging"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                            : "bg-white/5 text-[var(--color-slate)] hover:bg-white/10"
                    }`}
                >
                    <Clock className="w-4 h-4" /> Receivables Aging
                </button>
                <button
                    onClick={() => setActiveTab("payments")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        activeTab === "payments"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                            : "bg-white/5 text-[var(--color-slate)] hover:bg-white/10"
                    }`}
                >
                    <CreditCard className="w-4 h-4" /> Payment Verification ({paymentsList.filter(p => p.status === 'pending_verification').length})
                </button>
                <button
                    onClick={() => setActiveTab("settlements")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        activeTab === "settlements"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                            : "bg-white/5 text-[var(--color-slate)] hover:bg-white/10"
                    }`}
                >
                    <Scale className="w-4 h-4" /> Vendor Settlements
                </button>
                <button
                    onClick={() => setActiveTab("journals")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        activeTab === "journals"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                            : "bg-white/5 text-[var(--color-slate)] hover:bg-white/10"
                    }`}
                >
                    <Layers className="w-4 h-4" /> Double-Entry Journals ({journalsList.length})
                </button>
                <button
                    onClick={() => setActiveTab("reconciliation")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        activeTab === "reconciliation"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                            : "bg-white/5 text-[var(--color-slate)] hover:bg-white/10"
                    }`}
                >
                    <TrendingUp className="w-4 h-4" /> Reconciliation
                </button>
            </div>

            {/* TAB: Customer Invoices */}
            {activeTab === "invoices" && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                            <input
                                type="text"
                                placeholder="Search invoices by number or client..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--color-gold)]"
                            />
                        </div>
                    </div>

                    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 text-[var(--color-slate)] uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                    <th className="px-6 py-4">Amount Due</th>
                                    <th className="px-6 py-4">Due Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            {inv.invoiceNumber}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[var(--color-warm-white)]">
                                            {inv.customerName}
                                        </td>
                                        <td className="px-6 py-4 uppercase font-bold text-[10px] text-[var(--color-slate)]">
                                            {inv.invoiceType}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            QAR {(inv.totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-amber-400">
                                            QAR {(inv.amountDue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-[var(--color-slate)]">
                                            {new Date(inv.dueDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                inv.status === 'issued' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                inv.status === 'partially_paid' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {inv.status === 'draft' && (
                                                <button
                                                    onClick={() => handleIssueInvoice(inv.id)}
                                                    className="px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-navy)] font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                                                >
                                                    Issue Invoice
                                                </button>
                                            )}
                                            <a
                                                href={`/api/pdf/invoice/${inv.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors"
                                            >
                                                <Download className="w-3 h-3" /> PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: Receivables Aging */}
            {activeTab === "aging" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass p-6 rounded-2xl border border-emerald-500/20">
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Current (0-30 Days)</p>
                            <h3 className="text-2xl font-bold font-mono text-white">QAR {(agingData?.current?.amount || 0).toLocaleString()}</h3>
                            <p className="text-xs text-[var(--color-slate)] mt-1">{agingData?.current?.count || 0} Invoices</p>
                        </div>
                        <div className="glass p-6 rounded-2xl border border-blue-500/20">
                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">31-60 Days</p>
                            <h3 className="text-2xl font-bold font-mono text-white">QAR {(agingData?.days31_60?.amount || 0).toLocaleString()}</h3>
                            <p className="text-xs text-[var(--color-slate)] mt-1">{agingData?.days31_60?.count || 0} Invoices</p>
                        </div>
                        <div className="glass p-6 rounded-2xl border border-amber-500/20">
                            <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1">61-90 Days</p>
                            <h3 className="text-2xl font-bold font-mono text-white">QAR {(agingData?.days61_90?.amount || 0).toLocaleString()}</h3>
                            <p className="text-xs text-[var(--color-slate)] mt-1">{agingData?.days61_90?.count || 0} Invoices</p>
                        </div>
                        <div className="glass p-6 rounded-2xl border border-rose-500/20">
                            <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">90+ Days Overdue</p>
                            <h3 className="text-2xl font-bold font-mono text-white">QAR {(agingData?.overdue90Plus?.amount || 0).toLocaleString()}</h3>
                            <p className="text-xs text-[var(--color-slate)] mt-1">{agingData?.overdue90Plus?.count || 0} Invoices</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Payment Verification Queue */}
            {activeTab === "payments" && (
                <div className="space-y-6">
                    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 text-[var(--color-slate)] uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Payment #</th>
                                    <th className="px-6 py-4">Invoice Ref</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4">Reference / Proof</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paymentsList.map((p) => (
                                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            {p.paymentNumber}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[var(--color-warm-white)]">
                                            {p.invoice?.invoiceNumber || `#${p.invoiceId?.slice(0, 8)}`}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                                            QAR {p.amount?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 uppercase font-bold text-[10px] text-[var(--color-slate)]">
                                            {p.paymentMethod}
                                        </td>
                                        <td className="px-6 py-4 text-[var(--color-slate)]">
                                            {p.transactionRef || "N/A"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                p.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {p.status === 'pending_verification' && (
                                                <button
                                                    onClick={() => handleVerifyPayment(p.id)}
                                                    className="px-3 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-600 transition-colors"
                                                >
                                                    Verify & Allocate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: Vendor Settlements */}
            {activeTab === "settlements" && (
                <AdminSettlementManager />
            )}

            {/* TAB: Double-Entry Journals */}
            {activeTab === "journals" && (
                <FinancialJournalCockpit />
            )}

            {/* TAB: Reconciliation */}
            {activeTab === "reconciliation" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest mb-1">Total Invoiced (AR)</p>
                            <h3 className="text-2xl font-bold font-mono text-white">QAR {(reconciliation?.invoicing?.totalInvoiced || 0).toLocaleString()}</h3>
                            <p className="text-xs text-[var(--color-slate)] mt-2">Collected: QAR {(reconciliation?.invoicing?.totalCollected || 0).toLocaleString()}</p>
                        </div>
                        <div className="glass p-6 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest mb-1">Platform Commission Retained</p>
                            <h3 className="text-2xl font-bold font-mono text-white">QAR {(reconciliation?.vendorEconomics?.totalPlatformCommissions || 0).toLocaleString()}</h3>
                            <p className="text-xs text-[var(--color-slate)] mt-2">Vendor Payables: QAR {(reconciliation?.vendorEconomics?.totalVendorPayables || 0).toLocaleString()}</p>
                        </div>
                        <div className="glass p-6 rounded-2xl border border-emerald-500/20">
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Double-Entry Balance</p>
                            <h3 className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6" /> BALANCED
                            </h3>
                            <p className="text-xs text-[var(--color-slate)] mt-2">Σ Debits = Σ Credits ({reconciliation?.generalLedger?.totalJournals || 0} posted journals)</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
