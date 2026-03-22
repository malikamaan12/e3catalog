"use client";

import React, { useState, useEffect } from "react";
import { 
    Banknote, 
    Upload, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    ExternalLink,
    FileText,
    TrendingUp,
    Receipt
} from "lucide-react";
import { format } from "date-fns";
import { CloudImageUpload } from "@/components/CloudImageUpload";

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

export function VendorSettlements() {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);

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

    const handleSubmitPayment = async (settlementId: string, url: string) => {
        setSubmitting(settlementId);
        try {
            const res = await fetch("/api/vendor/settlements/submit", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settlementId, paymentEvidenceUrl: url })
            });

            if (res.ok) {
                fetchSettlements();
            }
        } catch (err) {
            console.error("Failed to submit payment", err);
        } finally {
            setSubmitting(null);
        }
    };

    const stats = {
        totalOwed: settlements
            .filter(s => s.status === "pending" || s.status === "overdue")
            .reduce((acc, s) => acc + s.amountOwed, 0),
        pendingReview: settlements
            .filter(s => s.status === "submitted_for_review")
            .reduce((acc, s) => acc + s.amountOwed, 0),
        paidCount: settlements.filter(s => s.status === "approved_paid").length
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--color-slate)] font-medium">Aggregating financial ledger...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1">Dues Outstanding</p>
                    <h3 className="text-3xl font-black text-[var(--color-gold)]">{stats.totalOwed.toLocaleString()} <span className="text-xs font-medium">QAR</span></h3>
                    <p className="text-[10px] text-[var(--color-slate)] mt-2">Fees accrued from booked projects</p>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-24 h-24" />
                    </div>
                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1">Awaiting Review</p>
                    <h3 className="text-3xl font-black text-blue-400">{stats.pendingReview.toLocaleString()} <span className="text-xs font-medium">QAR</span></h3>
                    <p className="text-[10px] text-[var(--color-slate)] mt-2">Sent to E3 for verification</p>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Receipt className="w-24 h-24" />
                    </div>
                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-1">Settled Projects</p>
                    <h3 className="text-3xl font-black text-emerald-400">{stats.paidCount}</h3>
                    <p className="text-[10px] text-[var(--color-slate)] mt-2">Transactions completed</p>
                </div>
            </div>

            {/* List */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--color-warm-white)] flex items-center gap-2">
                            <Banknote className="w-6 h-6 text-[var(--color-gold)]" />
                            Commission Settlements
                        </h2>
                        <p className="text-sm text-[var(--color-slate)] mt-1">Proof of payment required for platform service fees.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-wider">Project / Booking</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-wider">Date Generated</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-wider">Amount Owed</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-wider">Settlement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                            {settlements.map((s) => (
                                <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[var(--color-warm-white)] font-bold">{s.booking.projectName}</span>
                                            <span className="text-[10px] text-[var(--color-slate)] mt-0.5 group-hover:text-[var(--color-gold)] transition-colors">
                                                 #{s.booking.id.split('-')[0]} • {s.booking.customerName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-[var(--color-slate)]">
                                        {format(new Date(s.createdAt), "MMM d, yyyy")}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-bold text-[var(--color-gold)]">
                                            {s.amountOwed.toLocaleString()} <span className="text-[10px] opacity-70 uppercase">QAR</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge status={s.status} />
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        {s.status === "approved_paid" ? (
                                            <div className="flex items-center justify-end gap-2 text-emerald-400 text-xs font-black uppercase italic">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Paid
                                            </div>
                                        ) : s.status === "submitted_for_review" ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-tight flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Under Review
                                                </div>
                                                <a 
                                                    href={s.paymentEvidenceUrl || "#"} 
                                                    target="_blank" 
                                                    className="text-[10px] text-[var(--color-slate)] hover:text-white flex items-center gap-1 underline"
                                                >
                                                    View Receipt <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end">
                                                {submitting === s.id ? (
                                                    <div className="w-6 h-6 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <CloudImageUpload
                                                        onUploadComplete={(url: string) => handleSubmitPayment(s.id, url)}
                                                        label="Pay & Upload Proof"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {settlements.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Banknote className="w-12 h-12 text-[var(--color-slate)]/20 mx-auto mb-4" />
                                        <p className="text-[var(--color-slate)] text-sm font-bold">No commission settlements found.</p>
                                        <p className="text-[var(--color-slate)]/60 text-[10px] mt-1 italic italic">
                                            Debts are generated automatically when quotes are officially booked.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help / FAQ */}
            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Payment Instructions</h4>
                    <p className="text-[10px] text-[var(--color-slate)] leading-relaxed">
                        Please perform an offline bank transfer to E3 Rentals for the total owed amount. Once completed, upload the 
                        PDF or image receipt here for our fiscal team to approve. Once approved, your project ledger will be cleared.
                    </p>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: Settlement["status"] }) {
    switch (status) {
        case "pending":
            return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-wider">
                <Clock className="w-3 h-3" /> Unpaid
            </div>;
        case "submitted_for_review":
            return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                <Upload className="w-3 h-3" /> Reviewing
            </div>;
        case "approved_paid":
            return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" /> Settled
            </div>;
        case "overdue":
            return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider">
                <AlertCircle className="w-3 h-3" /> Overdue
            </div>;
        default:
            return null;
    }
}
