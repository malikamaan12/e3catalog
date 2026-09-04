"use client";

import React, { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { QuoteProposalPDF } from "@/components/pdf/QuoteProposalPDF";
import { 
    ChevronLeft, 
    FileText, 
    MessageSquare, 
    ShieldCheck, 
    ArrowRight, 
    Loader2,
    CheckCircle,
    Download,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    Layers,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import SignaturePad from "./SignaturePad";
import EmbeddedChat from "@/components/chat/EmbeddedChat";
import { approveBookingWithSignature } from "@/actions/client";
import { toast } from "react-hot-toast";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    { ssr: false, loading: () => <div className="h-full w-full bg-navy/50 animate-pulse flex items-center justify-center text-slate/20 font-black tracking-widest uppercase text-xs">Loading Commercial Document...</div> }
);

interface QuoteSignOffClientProps {
    booking: any;
    financials: any;
    user: any;
    corporateContext?: any;
}

export default function QuoteSignOffClient({ booking, financials, user, corporateContext }: QuoteSignOffClientProps) {
    const [activeTab, setActiveTab] = useState<"review" | "negotiate" | "sign">("review");
    const [isPending, startTransition] = useTransition();
    const [isSuccess, setIsSuccess] = useState(booking.status === "approved" || booking.status === "booked");
    const [approvalError, setApprovalError] = useState("");
    const [clientQid, setClientQid] = useState("");

    // Corporate governance state
    const [selectedCostCenterId, setSelectedCostCenterId] = useState(
        booking.costCenterId || corporateContext?.costCenters?.[0]?.id || ""
    );
    const [internalApprovalStatus, setInternalApprovalStatus] = useState(
        booking.internalApprovalStatus || corporateContext?.approvalRequest?.status || "not_required"
    );
    const [activeApprovalReq, setActiveApprovalReq] = useState(corporateContext?.approvalRequest || null);
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    const org = corporateContext?.organization;
    const member = corporateContext?.membership;
    const costCenters = corporateContext?.costCenters || [];
    const isCorporate = Boolean(org);

    const spendLimit = Number(member?.spendLimitPerBooking) || 5000;
    const thresholdAmount = Number(org?.approvalThresholdAmount) || 5000;
    const grandTotal = financials.grandTotal || 0;
    const requiresInternalSignoff = isCorporate && (
        grandTotal > spendLimit || 
        grandTotal > thresholdAmount || 
        internalApprovalStatus === "pending_approval"
    );
    const isInternallyApproved = internalApprovalStatus === "approved" || (!requiresInternalSignoff && internalApprovalStatus !== "pending_approval" && internalApprovalStatus !== "rejected");
    const canSignOff = member?.canApprove || member?.role === "org_admin" || ["admin", "super_admin"].includes(user.role);

    const handleSubmitCorporateApproval = async () => {
        setIsSubmittingApproval(true);
        try {
            const res = await fetch("/api/corporate/approvals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: booking.projectId || booking.id,
                    costCenterId: selectedCostCenterId || undefined,
                    notes: "Submitted via quote sign-off portal",
                }),
            });
            const data = await res.json();
            if (res.ok && data.approvalRequest) {
                setInternalApprovalStatus("pending_approval");
                setActiveApprovalReq(data.approvalRequest);
                toast.success("Requisition submitted for corporate review!");
            } else {
                toast.error(data.error || "Failed to submit approval request");
            }
        } catch (e: any) {
            toast.error(e.message || "Error submitting requisition");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleAuthorizeApproval = async () => {
        if (!activeApprovalReq?.id) return;
        setIsSubmittingApproval(true);
        try {
            const res = await fetch(`/api/corporate/approvals/${activeApprovalReq.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve", notes: "Authorized directly in digital sign-off room" }),
            });
            const data = await res.json();
            if (res.ok) {
                setInternalApprovalStatus("approved");
                toast.success("Corporate internal sign-off authorized!");
            } else {
                toast.error(data.error || "Approval failed");
            }
        } catch (e: any) {
            toast.error(e.message || "Error approving requisition");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleSignatureSave = (signatureData: string) => {
        setApprovalError("");
        startTransition(async () => {
            const res = await approveBookingWithSignature(booking.projectId || booking.id, signatureData, clientQid);
            if (res.success) {
                setIsSuccess(true);
                toast.success("Proposal & Rental Agreement Digitally Signed!");
            } else {
                setApprovalError(res.error || "Approval failed");
                toast.error(res.error || "Approval failed");
            }
        });
    };

    const handleDownloadPDF = () => {
        const url = `/api/pdf/quote-proposal/${booking.projectId || booking.id}`;
        window.open(url, "_blank");
    };

    const handleDownloadAgreementPDF = () => {
        const url = `/api/pdf/agreement/${booking.id || booking.projectId}`;
        window.open(url, "_blank");
    };

    if (isSuccess) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fade-up">
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h1 className="text-4xl font-[family-name:var(--font-heading)] font-black text-white italic uppercase mb-4 tracking-tight">
                    Operation <span className="text-emerald-500">Confirmed</span>
                </h1>
                <p className="text-slate max-w-md mx-auto mb-6 font-medium leading-relaxed text-sm">
                    Your digital signature has been recorded and formal equipment rental agreement executed under Qatar Law. The E3 Operations and Warehouse Fulfillment team has been mobilized.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <button 
                        onClick={handleDownloadPDF}
                        className="px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <Download className="w-4 h-4 text-gold" />
                        Proposal PDF
                    </button>
                    <button 
                        onClick={handleDownloadAgreementPDF}
                        className="px-6 py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs uppercase tracking-widest hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                    >
                        <Download className="w-4 h-4 text-emerald-400" />
                        Signed Rental Agreement PDF
                    </button>
                    <Link 
                        href="/dashboard/client/overview" 
                        className="px-6 py-3.5 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                    >
                        Return to Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full grid grid-cols-1 xl:grid-cols-2 bg-navy border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
            
            {/* ── Left Column: Digital Document (PDF) ── */}
            <div className="hidden xl:flex flex-col border-r border-white/10 bg-black/40">
                <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gold/10">
                            <FileText className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Commercial Proposal Preview</span>
                    </div>
                    <button 
                        onClick={handleDownloadPDF}
                        className="text-[10px] font-black text-gold hover:underline uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <Download className="w-3 h-3" /> Download PDF
                    </button>
                </div>
                <div className="flex-1 p-0 overflow-hidden relative">
                    <PDFViewer className="w-full h-full border-none shadow-2xl">
                        <QuoteProposalPDF 
                            booking={booking} 
                            financials={financials} 
                            paymentTerms={booking.paymentTerms || "100% Advance"} 
                        />
                    </PDFViewer>
                </div>
            </div>

            {/* ── Right Column: Interactive Panel ── */}
            <div className="flex flex-col overflow-hidden bg-surface relative">
                
                {/* Panel Navigation */}
                <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-navy/40">
                    <div className="flex gap-1 p-1 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                        <button 
                            onClick={() => setActiveTab("review")}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                activeTab === "review" ? "bg-gold text-navy shadow-lg" : "text-slate hover:text-white"
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" /> Summary
                        </button>
                        <button 
                            onClick={() => setActiveTab("negotiate")}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                activeTab === "negotiate" ? "bg-gold text-navy shadow-lg" : "text-slate hover:text-white"
                            }`}
                        >
                            <MessageSquare className="w-3.5 h-3.5" /> Negotiate
                        </button>
                    </div>

                    <Link href="/dashboard/client/overview" className="p-3 rounded-xl bg-white/5 text-slate hover:text-white transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar overscroll-contain">
                    {approvalError && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                            {approvalError}
                        </div>
                    )}

                    {activeTab === "review" && (
                        <div className="space-y-8 animate-fade-up">
                            <div>
                                <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black text-white uppercase tracking-tight italic mb-1">
                                    Commercial <span className="text-gold">Summary</span>
                                </h1>
                                <p className="text-slate text-xs font-bold uppercase tracking-widest opacity-60">
                                    Reference #{(booking.projectId || booking.id).slice(0, 8).toUpperCase()}
                                </p>
                            </div>

                            {/* Itemized Assets */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate uppercase tracking-widest">Selected Fleet Assets ({financials.items.length})</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                                    {financials.items.map((item: any) => (
                                        <div key={item.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                                                <span className="text-[9px] text-slate-400">
                                                    {item.units} Units • {item.days} Days • {item.unitPrice} QAR/Day
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-gold">
                                                {item.rentalTotal.toLocaleString()} QAR
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Financial breakdown */}
                            <div className="glass rounded-3xl p-6 border border-white/10 bg-white/[0.02] shadow-2xl space-y-3">
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Base Rental</span>
                                    <span className="text-white font-bold">QAR {financials.baseRentalSubtotal.toLocaleString()}</span>
                                </div>
                                {financials.discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-xs text-red-400">
                                        <span>Applied Discount ({financials.discountPercent}%)</span>
                                        <span>- QAR {financials.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                {financials.logisticsCost > 0 && (
                                    <div className="flex justify-between items-center text-xs text-slate-400">
                                        <span>Logistics / Transport</span>
                                        <span className="text-white font-bold">+ QAR {financials.logisticsCost.toLocaleString()}</span>
                                    </div>
                                )}
                                {financials.laborCost > 0 && (
                                    <div className="flex justify-between items-center text-xs text-slate-400">
                                        <span>Setup / Labor Fee</span>
                                        <span className="text-white font-bold">+ QAR {financials.laborCost.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                    <span className="text-sm font-black text-gold uppercase tracking-[0.2em]">Grand Total</span>
                                    <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-gold">
                                        QAR {financials.grandTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Corporate Governance & Cost Center Card */}
                            {isCorporate && (
                                <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gold" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                                {org.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">
                                            Limit: {Number(spendLimit).toLocaleString()} QAR
                                        </span>
                                    </div>

                                    {/* Cost Center Selector */}
                                    {costCenters.length > 0 && (
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">
                                                Assign Cost Center / Project Code
                                            </label>
                                            <select
                                                value={selectedCostCenterId}
                                                onChange={e => setSelectedCostCenterId(e.target.value)}
                                                className="w-full bg-navy/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold font-mono"
                                            >
                                                {costCenters.map((cc: any) => (
                                                    <option key={cc.id} value={cc.id}>
                                                        {cc.code} - {cc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Internal Sign-Off Banner */}
                                    {internalApprovalStatus === "pending_approval" ? (
                                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <Clock className="w-4 h-4 animate-spin text-amber-400" />
                                                Requisition Pending Corporate Sign-Off
                                            </div>
                                            <p className="text-[10px] text-slate-300">
                                                This proposal has been routed to corporate finance/signatories for expenditure sign-off.
                                            </p>
                                            {canSignOff && (
                                                <button
                                                    onClick={handleAuthorizeApproval}
                                                    disabled={isSubmittingApproval}
                                                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs uppercase tracking-wider hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {isSubmittingApproval ? "Authorizing..." : "Approve Now as Authorized Signatory"}
                                                </button>
                                            )}
                                        </div>
                                    ) : internalApprovalStatus === "approved" ? (
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5 text-xs font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            <span>Corporate Sign-Off Authorized</span>
                                        </div>
                                    ) : requiresInternalSignoff ? (
                                        <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gold">
                                                <AlertCircle className="w-4 h-4" />
                                                Corporate Approval Required
                                            </div>
                                            <p className="text-[10px] text-slate-300">
                                                The total amount ({grandTotal.toLocaleString()} QAR) exceeds your authorized booking threshold ({spendLimit.toLocaleString()} QAR).
                                            </p>
                                            <button
                                                onClick={handleSubmitCorporateApproval}
                                                disabled={isSubmittingApproval}
                                                className="w-full py-2.5 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-102 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isSubmittingApproval ? "Submitting..." : "Submit for Corporate Sign-Off"}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Terms highlight */}
                            <div className="p-5 rounded-2xl bg-gold/5 border border-gold/10">
                                <h4 className="text-[10px] font-black text-gold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Payment & Compliance Terms
                                </h4>
                                <p className="text-xs font-bold text-white mb-1">{booking.paymentTerms || "100% Advance Payment"}</p>
                                <p className="text-[9px] text-slate-400 leading-relaxed">
                                    By proceeding to digitally sign, you confirm acceptance of the commercial proposal, delivery timetable, and asset terms.
                                </p>
                            </div>

                            {/* Action Button */}
                            {requiresInternalSignoff && !isInternallyApproved ? (
                                <button 
                                    disabled
                                    className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-slate-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-not-allowed"
                                >
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    Corporate Approval Pending Sign-Off
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setActiveTab("sign")}
                                    className="w-full h-16 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-gold/20"
                                >
                                    Proceed to Digital Signing
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === "negotiate" && (
                        <div className="h-full min-h-[500px]">
                            <EmbeddedChat 
                                currentUser={user} 
                                projectId={booking.projectId || booking.id} 
                                receiverId="admin" 
                                receiverName="E3 Operations Lead"
                                title="Project Negotiation Room"
                            />
                        </div>
                    )}

                    {activeTab === "sign" && (
                        <div className="animate-fade-up max-w-md mx-auto space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-[family-name:var(--font-heading)] font-black text-white uppercase italic tracking-tight mb-1">
                                    Digitally <span className="text-gold">Authorize</span>
                                </h2>
                                <p className="text-[9px] text-slate font-black uppercase tracking-widest opacity-60">
                                    Draw or Type Signature Below to Authorize Proposal
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        Qatar ID / Signer National ID <span className="text-gold font-normal">(Optional, for formal contract audit)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={clientQid}
                                        onChange={e => setClientQid(e.target.value)}
                                        placeholder="e.g. 28463400..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                    />
                                </div>
                                
                                <SignaturePad 
                                    onSave={handleSignatureSave} 
                                    isLoading={isPending} 
                                />
                            </div>

                            <button 
                                onClick={() => setActiveTab("review")}
                                className="w-full py-3 text-[10px] font-black text-slate hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-3 h-3" /> Back to Summary
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Mobile PDF floating action */}
            <div className="xl:hidden fixed bottom-6 left-6 right-6 z-50">
               <button 
                    onClick={handleDownloadPDF}
                    className="w-full h-14 rounded-2xl bg-navy/90 backdrop-blur-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl"
                >
                    <FileText className="w-4 h-4 text-gold" />
                    Download Commercial PDF Version
               </button>
            </div>
        </div>
    );
}
