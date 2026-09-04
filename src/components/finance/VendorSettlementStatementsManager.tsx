"use client";

import React, { useState, useEffect } from "react";
import { 
    FileText, 
    Download, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Plus, 
    Calendar, 
    Building2, 
    CreditCard, 
    Search, 
    ExternalLink,
    DollarSign,
    Layers,
    ArrowUpRight,
    RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface StatementItem {
    id: string;
    bookingId: string;
    bookingAmount: number;
    commissionRate: number;
    commissionAmount: number;
    vendorEarnings: number;
    booking?: {
        id: string;
        projectName?: string;
        startDate: string;
        endDate: string;
    };
}

interface Statement {
    id: string;
    statementNumber: string;
    vendorId: string;
    periodStart: string;
    periodEnd: string;
    totalBookingsCount: number;
    grossRentalRevenue: number;
    platformCommissionTotal: number;
    netPayableToVendor: number;
    status: "draft" | "generated" | "approved" | "paid" | "disputed";
    bankName: string | null;
    bankIban: string | null;
    transactionReference: string | null;
    paidAt: string | null;
    notes: string | null;
    createdAt: string;
    vendor?: {
        id: string;
        name?: string;
        companyName?: string;
        crNumber?: string;
        commercialRegistration?: string;
    };
    items?: StatementItem[];
}

export function VendorSettlementStatementsManager() {
    const [statements, setStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [activeStatement, setActiveStatement] = useState<Statement | null>(null);

    // Form states
    const [vendorsList, setVendorsList] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [commissionRate, setCommissionRate] = useState("15");
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState("");

    // Wire payment states
    const [wireRef, setWireRef] = useState("");
    const [wireBank, setWireBank] = useState("Qatar National Bank (QNB)");
    const [wireIban, setWireIban] = useState("");
    const [paying, setPaying] = useState(false);

    const fetchStatements = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/settlements/statements");
            const data = await res.json();
            if (data.statements) {
                setStatements(data.statements);
            }
        } catch (e) {
            console.error("Failed to fetch statements:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch("/api/admin/vendors");
            const data = await res.json();
            if (data.vendors) {
                setVendorsList(data.vendors);
                if (data.vendors.length > 0 && !selectedVendorId) {
                    setSelectedVendorId(data.vendors[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch vendors:", e);
        }
    };

    useEffect(() => {
        fetchStatements();
        fetchVendors();

        // Default to current month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setPeriodStart(start.toISOString().split("T")[0]);
        setPeriodEnd(end.toISOString().split("T")[0]);
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        setGenerateError("");

        try {
            const res = await fetch("/api/admin/settlements/statements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: selectedVendorId,
                    periodStart,
                    periodEnd,
                    commissionRate: parseFloat(commissionRate) || 15,
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setGenerateError(data.error || "Failed to generate settlement statement.");
            } else {
                setIsGenerateModalOpen(false);
                fetchStatements();
            }
        } catch (err: any) {
            setGenerateError(err.message || "Network error.");
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/settlements/statements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "approved" })
            });
            if (res.ok) fetchStatements();
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStatement) return;
        setPaying(true);

        try {
            const res = await fetch(`/api/admin/settlements/statements/${activeStatement.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "paid",
                    transactionReference: wireRef,
                    bankName: wireBank,
                    bankIban: wireIban,
                })
            });
            if (res.ok) {
                setIsPayModalOpen(false);
                setActiveStatement(null);
                setWireRef("");
                fetchStatements();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPaying(false);
        }
    };

    const filtered = statements.filter(s => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            const vendorName = s.vendor?.companyName || s.vendor?.name || "";
            return s.statementNumber.toLowerCase().includes(q) ||
                   vendorName.toLowerCase().includes(q);
        }
        return true;
    });

    const stats = {
        totalStatements: statements.length,
        totalNetPayable: statements.reduce((acc, s) => acc + s.netPayableToVendor, 0),
        totalSettledPaid: statements.filter(s => s.status === "paid").reduce((acc, s) => acc + s.netPayableToVendor, 0),
        pendingApproval: statements.filter(s => s.status === "generated" || s.status === "approved").length,
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 rounded-3xl glass border border-white/10 relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Generated Statements</p>
                    <p className="text-3xl font-black text-[var(--color-warm-white)]">{stats.totalStatements}</p>
                    <p className="text-[10px] text-[var(--color-gold)] font-bold mt-1">Official B2B Settlement Cycles</p>
                </div>
                <div className="p-6 rounded-3xl glass border border-white/10 relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Total Payout Volume</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[var(--color-gold)]">{stats.totalNetPayable.toLocaleString()}</span>
                        <span className="text-xs font-bold text-[var(--color-slate)]">QAR</span>
                    </div>
                    <p className="text-[10px] text-[var(--color-slate)] font-bold mt-1">Net payable to suppliers</p>
                </div>
                <div className="p-6 rounded-3xl glass border border-white/10 relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Disbursed Wires</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-400">{stats.totalSettledPaid.toLocaleString()}</span>
                        <span className="text-xs font-bold text-[var(--color-slate)]">QAR</span>
                    </div>
                    <p className="text-[10px] text-emerald-400/80 font-bold mt-1">Confirmed bank remittances</p>
                </div>
                <div className="p-6 rounded-3xl glass border border-white/10 relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Awaiting Release</p>
                    <p className="text-3xl font-black text-amber-400">{stats.pendingApproval}</p>
                    <p className="text-[10px] text-amber-400/80 font-bold mt-1">Pending approval / wire transfer</p>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input 
                            type="search"
                            placeholder="Search statement # or vendor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="generated">Generated (Draft)</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid & Settled</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchStatements}
                        className="p-2.5 rounded-2xl glass border border-white/10 hover:border-white/20 text-[var(--color-slate)] hover:text-white transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20"
                    >
                        <Plus className="w-4 h-4" />
                        Run Settlement Cycle
                    </button>
                </div>
            </div>

            {/* Statements List Table */}
            {filtered.length === 0 ? (
                <div className="py-24 text-center glass rounded-3xl border border-dashed border-white/10">
                    <FileText className="w-12 h-12 text-[var(--color-slate)]/30 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[var(--color-warm-white)]">No Settlement Statements Found</h3>
                    <p className="text-xs text-[var(--color-slate)] max-w-sm mx-auto mt-1">
                        Run a settlement cycle to calculate gross rental revenues, commissions, and generate official PDF remittance vouchers.
                    </p>
                </div>
            ) : (
                <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Statement #</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Vendor Partner</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Cycle Window</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Gross Revenue</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">E3 Commission</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Net Payout</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-[var(--color-gold)]">{s.statementNumber}</span>
                                                <span className="text-[10px] text-[var(--color-slate)]">
                                                    {format(new Date(s.createdAt), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[var(--color-warm-white)]">{s.vendor?.name || "Equipment Partner"}</span>
                                                <span className="text-[10px] text-[var(--color-slate)]">
                                                    {s.totalBookingsCount} booking(s) reconciled
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-[var(--color-warm-white)]">
                                            {format(new Date(s.periodStart), "MMM d")} - {format(new Date(s.periodEnd), "MMM d, yyyy")}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-[var(--color-warm-white)]">
                                            QAR {s.grossRentalRevenue.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-red-400">
                                            - QAR {s.platformCommissionTotal.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-emerald-400">
                                                QAR {s.netPayableToVendor.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatementStatusBadge status={s.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Official PDF Download */}
                                                <a 
                                                    href={`/api/pdf/settlement-statement/${s.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-[var(--color-gold)] border border-white/10 hover:border-[var(--color-gold)]/30 transition-all"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> PDF Statement
                                                </a>

                                                {/* Status Transitions */}
                                                {s.status === "generated" && (
                                                    <button 
                                                        onClick={() => handleApprove(s.id)}
                                                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[10px] font-black uppercase text-blue-400 border border-blue-500/20 transition-all"
                                                    >
                                                        Approve
                                                    </button>
                                                )}

                                                {s.status === "approved" && (
                                                    <button 
                                                        onClick={() => {
                                                            setActiveStatement(s);
                                                            setIsPayModalOpen(true);
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/20 transition-all"
                                                    >
                                                        Mark Paid
                                                    </button>
                                                )}

                                                {s.status === "paid" && s.transactionReference && (
                                                    <span className="text-[10px] text-emerald-400 font-mono" title={`Paid: ${s.paidAt || 'Done'}`}>
                                                        Ref: {s.transactionReference}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Generate Statement Run */}
            {isGenerateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass bg-[var(--color-navy)] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
                        <h3 className="text-xl font-black text-[var(--color-warm-white)] flex items-center gap-2 mb-2">
                            <Layers className="w-5 h-5 text-[var(--color-gold)]" />
                            Run Periodic Settlement Engine
                        </h3>
                        <p className="text-xs text-[var(--color-slate)] mb-6">
                            Aggregates all completed, booked, and on-rent projects for the selected vendor in this date window and produces a compliant remittance statement.
                        </p>

                        {generateError && (
                            <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{generateError}</span>
                            </div>
                        )}

                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Equipment Partner / Vendor
                                </label>
                                <select 
                                    value={selectedVendorId}
                                    onChange={(e) => setSelectedVendorId(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                    required
                                >
                                    {vendorsList.map(v => (
                                        <option key={v.id} value={v.id} className="bg-[var(--color-navy)]">
                                            {v.companyName || v.name || "Vendor"} ({v.crNumber || v.commercialRegistration || "CR on file"})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Period Start
                                    </label>
                                    <input 
                                        type="date"
                                        value={periodStart}
                                        onChange={(e) => setPeriodStart(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Period End
                                    </label>
                                    <input 
                                        type="date"
                                        value={periodEnd}
                                        onChange={(e) => setPeriodEnd(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Platform Commission Cut (%)
                                </label>
                                <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={commissionRate}
                                    onChange={(e) => setCommissionRate(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsGenerateModalOpen(false)}
                                    className="px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-[var(--color-slate)] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="px-6 py-2.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20 disabled:opacity-50"
                                >
                                    {generating ? "Calculating..." : "Execute Settlement"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Mark Paid with Bank Wire Reference */}
            {isPayModalOpen && activeStatement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass bg-[var(--color-navy)] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                        <h3 className="text-xl font-black text-[var(--color-warm-white)] flex items-center gap-2 mb-2">
                            <CreditCard className="w-5 h-5 text-emerald-400" />
                            Record Bank Wire Payout
                        </h3>
                        <p className="text-xs text-[var(--color-slate)] mb-6">
                            Statement #{activeStatement.statementNumber} · Payout amount: <span className="text-emerald-400 font-bold">QAR {activeStatement.netPayableToVendor.toLocaleString()}</span>
                        </p>

                        <form onSubmit={handleConfirmPayment} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Wire Transfer Reference / Cheque #
                                </label>
                                <input 
                                    type="text"
                                    placeholder="e.g. QNB-TXN-984021"
                                    value={wireRef}
                                    onChange={(e) => setWireRef(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Originating / Receiving Bank
                                </label>
                                <input 
                                    type="text"
                                    value={wireBank}
                                    onChange={(e) => setWireBank(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Vendor IBAN
                                </label>
                                <input 
                                    type="text"
                                    placeholder="QA00QNBA0000..."
                                    value={wireIban}
                                    onChange={(e) => setWireIban(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-xs text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPayModalOpen(false);
                                        setActiveStatement(null);
                                    }}
                                    className="px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-[var(--color-slate)] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={paying}
                                    className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {paying ? "Recording..." : "Confirm Wire Release"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatementStatusBadge({ status }: { status: Statement["status"] }) {
    const config = {
        draft: { label: "Draft", color: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
        generated: { label: "Generated", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
        approved: { label: "Approved for Wire", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
        paid: { label: "Settled & Paid", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 font-bold" },
        disputed: { label: "Disputed", color: "text-red-400 bg-red-400/10 border-red-400/20" },
    }[status] || { label: status, color: "text-slate-400 bg-slate-400/10 border-slate-400/20" };

    return (
        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.color}`}>
            {config.label}
        </span>
    );
}
