"use client";

import React, { useState, useEffect } from "react";
import { 
    Receipt, 
    Download, 
    CreditCard, 
    Upload, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Calendar,
    ArrowUpRight
} from "lucide-react";
import { CloudImageUpload } from "@/components/CloudImageUpload";

export default function ClientInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [transactionRef, setTransactionRef] = useState<string>("");
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const fetchInvoices = async () => {
        try {
            const res = await fetch("/api/invoices");
            const data = await res.json();
            if (data.invoices) setInvoices(data.invoices);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleOpenPayModal = (inv: any) => {
        setSelectedInvoice(inv);
        setPaymentAmount(inv.amountDue);
        setPaymentProofUrl("");
        setTransactionRef("");
        setPaymentSuccess(false);
    };

    const handleSubmitPayment = async () => {
        if (!selectedInvoice || !paymentAmount || paymentAmount <= 0) return;
        setSubmittingPayment(true);
        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId: selectedInvoice.id,
                    amount: paymentAmount,
                    paymentMethod: "bank_transfer",
                    transactionRef,
                    paymentProofUrl,
                })
            });

            if (res.ok) {
                setPaymentSuccess(true);
                fetchInvoices();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const totalDue = invoices.reduce((s, i) => s + (i.amountDue || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
            <header className="pb-4 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[var(--color-gold)] mb-1">
                        <Receipt className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Client Billing Portal</span>
                    </div>
                    <h1 className="text-3xl font-black font-[family-name:var(--font-heading)] text-white">
                        My Invoices & Remittances
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1 font-medium">
                        View official corporate commercial invoices, download PDF copies, and submit remittance confirmations.
                    </p>
                </div>
            </header>

            {/* Quick KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl border border-amber-500/20">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1">Total Outstanding Balance</p>
                    <h3 className="text-3xl font-bold font-mono text-white">QAR {totalDue.toLocaleString()}</h3>
                    <p className="text-xs text-[var(--color-slate)] mt-2">Payable across {invoices.filter(i => i.amountDue > 0).length} active invoices</p>
                </div>
                <div className="glass p-6 rounded-2xl border border-emerald-500/20">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Total Remittances Cleared</p>
                    <h3 className="text-3xl font-bold font-mono text-white">QAR {totalPaid.toLocaleString()}</h3>
                    <p className="text-xs text-[var(--color-slate)] mt-2">Verified payments credited to your account</p>
                </div>
            </div>

            {/* Invoices List */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-[var(--color-navy-dark)] flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-white">
                        INVOICES & PROGRESS BILLS
                    </h2>
                </div>
                {invoices.length === 0 ? (
                    <div className="p-12 text-center text-[var(--color-slate)]">
                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-white">No Invoices Issued Yet</p>
                        <p className="text-xs mt-1">Invoices will be generated automatically once your equipment proposals are confirmed.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 text-[var(--color-slate)] uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                    <th className="px-6 py-4">Amount Due</th>
                                    <th className="px-6 py-4">Due Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            {inv.invoiceNumber}
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
                                                inv.status === 'partially_paid' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <a
                                                href={`/api/pdf/invoice/${inv.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors"
                                            >
                                                <Download className="w-3 h-3" /> PDF
                                            </a>
                                            {inv.amountDue > 0 && (
                                                <button
                                                    onClick={() => handleOpenPayModal(inv)}
                                                    className="px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-navy)] font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                                                >
                                                    Submit Payment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass max-w-md w-full p-6 rounded-2xl border border-white/10 space-y-6 animate-scale-up">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-bold text-lg text-white">
                                Submit Remittance for {selectedInvoice.invoiceNumber}
                            </h3>
                            <button onClick={() => setSelectedInvoice(null)} className="text-[var(--color-slate)] hover:text-white">✕</button>
                        </div>

                        {paymentSuccess ? (
                            <div className="p-6 text-center space-y-3">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                                <h4 className="font-bold text-white text-lg">Remittance Submitted!</h4>
                                <p className="text-xs text-[var(--color-slate)]">
                                    Your proof of transfer has been sent to E3 Rentals Accounts Receivable. You will receive confirmation once the wire is verified.
                                </p>
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="w-full py-2 bg-[var(--color-gold)] text-[var(--color-navy)] font-bold rounded-xl text-sm mt-4"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase mb-1">
                                        Remittance Amount (QAR)
                                    </label>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-gold)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase mb-1">
                                        Bank Transfer Reference / Transaction ID
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. QNB-TRX-882941"
                                        value={transactionRef}
                                        onChange={(e) => setTransactionRef(e.target.value)}
                                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[var(--color-gold)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase mb-1">
                                        Proof of Transfer (Receipt / Bank Slip)
                                    </label>
                                    <CloudImageUpload
                                        label="Upload Bank Confirmation Slip"
                                        existingUrl={paymentProofUrl}
                                        onUploadComplete={(url) => setPaymentProofUrl(url)}
                                    />
                                </div>
                                <button
                                    onClick={handleSubmitPayment}
                                    disabled={submittingPayment || !paymentAmount}
                                    className="w-full py-3 bg-[var(--color-gold)] hover:opacity-90 disabled:opacity-50 text-[var(--color-navy)] font-bold rounded-xl text-sm transition-opacity"
                                >
                                    {submittingPayment ? "Submitting..." : "Confirm Remittance"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
