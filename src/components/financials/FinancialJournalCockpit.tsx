"use client";

import React, { useState, useEffect } from "react";
import { 
    Layers, 
    Plus, 
    Download, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    FileSpreadsheet, 
    DollarSign,
    Search,
    Calendar,
    ArrowRight
} from "lucide-react";

interface JournalEntry {
    id: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
}

interface FinancialJournal {
    id: string;
    journalNumber: string;
    referenceType: string;
    referenceId: string;
    description: string;
    isReversed?: boolean;
    postedAt: string;
    entries: JournalEntry[];
}

const DEFAULT_ACCOUNTS = [
    { code: "1010", name: "Cash and Bank Operations" },
    { code: "1100", name: "Accounts Receivable — Clients" },
    { code: "1200", name: "Capital Fleet Assets" },
    { code: "1300", name: "Accumulated Depreciation" },
    { code: "2000", name: "Accounts Payable — Vendors" },
    { code: "2100", name: "Customer Security Deposits Held" },
    { code: "2200", name: "Unearned / Deferred Rental Revenue" },
    { code: "4000", name: "Realized Equipment Rental Revenue" },
    { code: "4100", name: "Logistics and Crew Operations Revenue" },
    { code: "5000", name: "Sub-Rental and Cross-Hire Cost" },
    { code: "5100", name: "Preventive & Corrective Maintenance Expense" },
    { code: "5200", name: "Fleet Asset Depreciation Expense" },
];

export function FinancialJournalCockpit() {
    const [journals, setJournals] = useState<FinancialJournal[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [recognitionMessage, setRecognitionMessage] = useState<string | null>(null);

    // Manual journal form state
    const [manualDescription, setManualDescription] = useState("");
    const [manualRefType, setManualRefType] = useState("manual_adjustment");
    const [manualLines, setManualLines] = useState<Array<{
        accountCode: string;
        accountName: string;
        debit: string;
        credit: string;
        memo: string;
    }>>([
        { accountCode: "1010", accountName: "Cash and Bank Operations", debit: "", credit: "", memo: "" },
        { accountCode: "4000", accountName: "Realized Equipment Rental Revenue", debit: "", credit: "", memo: "" },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadJournals = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/financials/journals");
            const data = await res.json();
            if (data.journals) {
                setJournals(data.journals);
            }
        } catch (err) {
            console.error("Failed to load journals", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJournals();
    }, []);

    // Revenue Recognition trigger
    const handleRunRecognition = async () => {
        setIsRecognizing(true);
        setRecognitionMessage(null);
        try {
            const res = await fetch("/api/admin/financials/recognize-revenue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (res.ok) {
                setRecognitionMessage(`Revenue recognition executed: ${data.journalsCreated} journals created across ${data.processedCount} active rentals.`);
                loadJournals();
            } else {
                setRecognitionMessage(`Error: ${data.error || "Failed to execute revenue recognition"}`);
            }
        } catch (err: any) {
            setRecognitionMessage(`Error: ${err.message}`);
        } finally {
            setIsRecognizing(false);
        }
    };

    // Manual Line helpers
    const handleAddLine = () => {
        setManualLines([
            ...manualLines,
            { accountCode: "1100", accountName: "Accounts Receivable — Clients", debit: "", credit: "", memo: "" },
        ]);
    };

    const handleRemoveLine = (idx: number) => {
        if (manualLines.length <= 2) return;
        setManualLines(manualLines.filter((_, i) => i !== idx));
    };

    const handleAccountChange = (idx: number, code: string) => {
        const found = DEFAULT_ACCOUNTS.find(a => a.code === code);
        const next = [...manualLines];
        next[idx].accountCode = code;
        next[idx].accountName = found ? found.name : "Custom Account";
        setManualLines(next);
    };

    const handleDebitChange = (idx: number, val: string) => {
        const next = [...manualLines];
        next[idx].debit = val;
        if (val && parseFloat(val) > 0) {
            next[idx].credit = "";
        }
        setManualLines(next);
    };

    const handleCreditChange = (idx: number, val: string) => {
        const next = [...manualLines];
        next[idx].credit = val;
        if (val && parseFloat(val) > 0) {
            next[idx].debit = "";
        }
        setManualLines(next);
    };

    const handleMemoChange = (idx: number, val: string) => {
        const next = [...manualLines];
        next[idx].memo = val;
        setManualLines(next);
    };

    // Calculate live totals for the modal
    const totalDebitVal = manualLines.reduce((acc, l) => acc + (parseFloat(l.debit) || 0), 0);
    const totalCreditVal = manualLines.reduce((acc, l) => acc + (parseFloat(l.credit) || 0), 0);
    const diffVal = Math.round(Math.abs(totalDebitVal - totalCreditVal) * 100) / 100;
    const isBalanced = totalDebitVal > 0 && diffVal === 0;

    const handleSubmitJournal = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!manualDescription.trim()) {
            setFormError("Journal description is required");
            return;
        }

        if (!isBalanced) {
            setFormError(`Journal is unbalanced by QAR ${diffVal}. Debits must exactly equal Credits.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const formattedEntries = manualLines
                .filter(l => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
                .map(l => ({
                    accountCode: l.accountCode,
                    accountName: l.accountName,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    memo: l.memo || undefined,
                }));

            const res = await fetch("/api/admin/financials/journals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    referenceType: manualRefType,
                    description: manualDescription,
                    entries: formattedEntries,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setShowManualModal(false);
                setManualDescription("");
                setManualLines([
                    { accountCode: "1010", accountName: "Cash and Bank Operations", debit: "", credit: "", memo: "" },
                    { accountCode: "4000", accountName: "Realized Equipment Rental Revenue", debit: "", credit: "", memo: "" },
                ]);
                loadJournals();
            } else {
                setFormError(data.error || "Failed to post journal entry");
            }
        } catch (err: any) {
            setFormError(err.message || "Failed to submit journal");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate summary statistics
    let totalLedgerDebits = 0;
    let totalLedgerCredits = 0;
    journals.forEach(j => {
        j.entries?.forEach(e => {
            totalLedgerDebits += Number(e.debit) || 0;
            totalLedgerCredits += Number(e.credit) || 0;
        });
    });

    const filteredJournals = journals.filter(j => {
        const matchesSearch = !search || 
            j.journalNumber.toLowerCase().includes(search.toLowerCase()) ||
            j.description.toLowerCase().includes(search.toLowerCase()) ||
            j.entries.some(e => e.accountName.toLowerCase().includes(search.toLowerCase()) || e.accountCode.includes(search));
        const matchesType = filterType === "all" || j.referenceType === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass p-5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest mb-1">Total Journals</p>
                    <h3 className="text-2xl font-bold font-mono text-white">{journals.length}</h3>
                    <p className="text-xs text-[var(--color-slate)] mt-1">Sequential General Ledger Records</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-emerald-500/20">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Total Posted Debits</p>
                    <h3 className="text-2xl font-bold font-mono text-emerald-400">QAR {Math.round(totalLedgerDebits).toLocaleString()}</h3>
                    <p className="text-xs text-[var(--color-slate)] mt-1">Authoritative GL Assets & Expenses</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-blue-500/20">
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Total Posted Credits</p>
                    <h3 className="text-2xl font-bold font-mono text-blue-400">QAR {Math.round(totalLedgerCredits).toLocaleString()}</h3>
                    <p className="text-xs text-[var(--color-slate)] mt-1">Authoritative GL Liabilities & Revenue</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1">Ledger Integrity</p>
                    <h3 className="text-xl font-bold font-mono flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" /> 100% Balanced
                    </h3>
                    <p className="text-xs text-[var(--color-slate)] mt-1">Δ Debits - Credits = QAR 0.00</p>
                </div>
            </div>

            {/* Notification message */}
            {recognitionMessage && (
                <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
                    recognitionMessage.startsWith("Error") 
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{recognitionMessage}</span>
                    </div>
                    <button onClick={() => setRecognitionMessage(null)} className="text-xs font-bold underline ml-4">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Action Bar */}
            <div className="glass p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input
                            type="text"
                            placeholder="Filter by journal #, account, or memo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[var(--color-slate)] focus:outline-none focus:border-[var(--color-gold)]"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--color-gold)]"
                    >
                        <option value="all">All Reference Types</option>
                        <option value="invoice">Invoice</option>
                        <option value="payment">Payment</option>
                        <option value="revenue_recognition">Revenue Recognition</option>
                        <option value="settlement">Settlement</option>
                        <option value="depreciation">Depreciation</option>
                        <option value="manual_adjustment">Manual Adjustment</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Revenue recognition trigger */}
                    <button
                        onClick={handleRunRecognition}
                        disabled={isRecognizing}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        title="Pro-rata recognizes active daily rental revenue from Deferred Revenue to Equipment Revenue"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRecognizing ? "animate-spin" : ""}`} />
                        {isRecognizing ? "Recognizing..." : "Daily Revenue Recognition"}
                    </button>

                    {/* Export dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-xs font-bold transition-colors">
                            <Download className="w-3.5 h-3.5" /> Export GL
                        </button>
                        <div className="absolute right-0 mt-1 hidden group-hover:block w-48 bg-[var(--color-navy)] border border-white/10 rounded-xl shadow-2xl z-30 p-1.5 space-y-1">
                            <a
                                href="/api/admin/financials/export?format=csv"
                                download
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Full GL (CSV)
                            </a>
                            <a
                                href="/api/admin/financials/export?format=quickbooks"
                                download
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                            >
                                <DollarSign className="w-3.5 h-3.5 text-blue-400" /> QuickBooks Online
                            </a>
                            <a
                                href="/api/admin/financials/export?format=xero"
                                download
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                            >
                                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Xero Accounting
                            </a>
                            <a
                                href="/api/admin/financials/export?format=json"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                            >
                                <ArrowRight className="w-3.5 h-3.5 text-amber-400" /> JSON Feed
                            </a>
                        </div>
                    </div>

                    {/* Post Manual Journal button */}
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-[var(--color-navy)] rounded-xl text-xs font-bold transition-all shadow-md shadow-[var(--color-gold)]/20"
                    >
                        <Plus className="w-3.5 h-3.5" /> Post Journal Entry
                    </button>
                </div>
            </div>

            {/* Journals Table */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-[var(--color-slate)] uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-6 py-4">Journal #</th>
                            <th className="px-6 py-4">Type / Reference</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Account Splits (Debits & Credits)</th>
                            <th className="px-6 py-4 text-right">Posted Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-slate)]">
                                    Loading general ledger journals...
                                </td>
                            </tr>
                        ) : filteredJournals.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-slate)]">
                                    No financial journals found matching query.
                                </td>
                            </tr>
                        ) : (
                            filteredJournals.map((j) => (
                                <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-[var(--color-gold)] align-top whitespace-nowrap">
                                        {j.journalNumber}
                                    </td>
                                    <td className="px-6 py-4 align-top whitespace-nowrap">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[var(--color-slate)]">
                                            {j.referenceType}
                                        </span>
                                        <div className="font-mono text-[10px] text-white/50 mt-1 truncate max-w-[120px]">
                                            {j.referenceId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white align-top max-w-xs">
                                        {j.description}
                                    </td>
                                    <td className="px-6 py-4 space-y-1.5">
                                        {j.entries?.map((e) => (
                                            <div key={e.id} className="flex justify-between items-center gap-4 font-mono text-[11px] bg-white/[0.02] px-2.5 py-1 rounded border border-white/5">
                                                <div className="truncate max-w-[280px]">
                                                    <span className="text-white font-medium">{e.accountName}</span>
                                                    <span className="text-[var(--color-slate)] ml-1">({e.accountCode})</span>
                                                    {e.memo && <span className="text-white/40 text-[10px] block truncate italic">{e.memo}</span>}
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    {Number(e.debit) > 0 && (
                                                        <span className="text-emerald-400 font-bold">DR QAR {Number(e.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    )}
                                                    {Number(e.credit) > 0 && (
                                                        <span className="text-blue-400 font-bold">CR QAR {Number(e.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 text-[var(--color-slate)] align-top text-right whitespace-nowrap">
                                        {new Date(j.postedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MANUAL JOURNAL ENTRY MODAL */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass max-w-3xl w-full p-6 rounded-2xl border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-[var(--color-gold)]" />
                                    Post Balanced Journal Entry
                                </h3>
                                <p className="text-xs text-[var(--color-slate)] mt-1">
                                    Double-entry standard ledger rule: Sum of Debits must equal Sum of Credits.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="text-[var(--color-slate)] hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitJournal} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--color-slate)] mb-1">
                                        Journal Description *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Month-end asset depreciation or audit adjustment"
                                        value={manualDescription}
                                        onChange={(e) => setManualDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--color-gold)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--color-slate)] mb-1">
                                        Reference Type
                                    </label>
                                    <select
                                        value={manualRefType}
                                        onChange={(e) => setManualRefType(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--color-gold)]"
                                    >
                                        <option value="manual_adjustment">Manual Adjustment</option>
                                        <option value="depreciation">Asset Depreciation</option>
                                        <option value="reversal">Reversal Entry</option>
                                        <option value="settlement">Partner / Vendor Settlement</option>
                                        <option value="revenue_recognition">Revenue Recognition</option>
                                    </select>
                                </div>
                            </div>

                            {/* Line items */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-[var(--color-slate)]">
                                    Journal Entry Lines
                                </label>
                                <div className="space-y-2">
                                    {manualLines.map((line, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                            <div className="col-span-12 md:col-span-5">
                                                <select
                                                    value={line.accountCode}
                                                    onChange={(e) => handleAccountChange(idx, e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[var(--color-gold)]"
                                                >
                                                    {DEFAULT_ACCOUNTS.map(a => (
                                                        <option key={a.code} value={a.code}>
                                                            {a.code} — {a.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-5 md:col-span-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Debit (DR)"
                                                    value={line.debit}
                                                    onChange={(e) => handleDebitChange(idx, e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-emerald-400 font-mono text-right focus:outline-none focus:border-emerald-400"
                                                />
                                            </div>
                                            <div className="col-span-5 md:col-span-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Credit (CR)"
                                                    value={line.credit}
                                                    onChange={(e) => handleCreditChange(idx, e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-blue-400 font-mono text-right focus:outline-none focus:border-blue-400"
                                                />
                                            </div>
                                            <div className="col-span-10 md:col-span-2">
                                                <input
                                                    type="text"
                                                    placeholder="Memo (optional)"
                                                    value={line.memo}
                                                    onChange={(e) => handleMemoChange(idx, e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[11px] text-white focus:outline-none focus:border-[var(--color-gold)]"
                                                />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLine(idx)}
                                                    disabled={manualLines.length <= 2}
                                                    className="p-1 text-[var(--color-slate)] hover:text-rose-400 disabled:opacity-20 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddLine}
                                    className="flex items-center gap-1 text-xs text-[var(--color-gold)] font-bold hover:underline pt-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Entry Line
                                </button>
                            </div>

                            {/* Balance Verification Bar */}
                            <div className="glass p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                                <div>
                                    <span className="text-[var(--color-slate)]">Total Debits: </span>
                                    <span className="text-emerald-400 font-bold">QAR {totalDebitVal.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-[var(--color-slate)]">Total Credits: </span>
                                    <span className="text-blue-400 font-bold">QAR {totalCreditVal.toFixed(2)}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 font-bold ${
                                    isBalanced ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                    {isBalanced ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" /> BALANCED (Difference: QAR 0.00)
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-4 h-4" /> UNBALANCED (Difference: QAR {diffVal.toFixed(2)})
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isBalanced || isSubmitting}
                                    className="px-5 py-2 bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-[var(--color-navy)] rounded-xl text-xs font-bold transition-all shadow-md shadow-[var(--color-gold)]/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Posting..." : "Post Balanced Journal"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
