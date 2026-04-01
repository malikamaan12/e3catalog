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
    CheckCircle
} from "lucide-react";
import Link from "next/link";
import SignaturePad from "./SignaturePad";
import EmbeddedChat from "@/components/chat/EmbeddedChat";
import { approveBookingWithSignature } from "@/actions/client";
import { toast } from "react-hot-toast";

// Client-only PDF Viewer
const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    { ssr: false, loading: () => <div className="h-full w-full bg-navy/50 animate-pulse flex items-center justify-center text-slate/20 font-black tracking-widest uppercase">Initializing Canvas...</div> }
);

interface QuoteSignOffClientProps {
    booking: any;
    financials: any;
    user: any;
}

export default function QuoteSignOffClient({ booking, financials, user }: QuoteSignOffClientProps) {
    const [activeTab, setActiveTab] = useState<"review" | "negotiate" | "sign">("review");
    const [isPending, startTransition] = useTransition();
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSignatureSave = (signatureData: string) => {
        startTransition(async () => {
            const res = await approveBookingWithSignature(booking.id, signatureData);
            if (res.success) {
                setIsSuccess(true);
                toast.success("Proposal Digitally Signed & Approved!");
            } else {
                toast.error(res.error || "Approval failed");
            }
        });
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
                <p className="text-slate max-w-md mx-auto mb-10 font-medium leading-relaxed">
                    Your digital signature has been recorded. The E3 Operations Team has been notified and will begin the fulfillment sequence.
                </p>
                <Link 
                    href="/dashboard/client/overview" 
                    className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3"
                >
                    Return to Dashboard
                    <ArrowRight className="w-4 h-4" />
                </Link>
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
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar overscroll-contain">
                    {activeTab === "review" && (
                        <div className="space-y-10 animate-fade-up">
                            <div>
                                <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black text-white uppercase tracking-tight italic mb-2">
                                    Commercial <span className="text-gold">Summary</span>
                                </h1>
                                <p className="text-slate text-xs font-bold uppercase tracking-widest opacity-60">Verification Profile #BK-{booking.id.slice(0, 8).toUpperCase()}</p>
                            </div>

                            {/* Financial breakdown for mobile since they can't see the PDF */}
                            <div className="xl:hidden glass rounded-3xl p-8 border border-white/10 bg-white/[0.02] shadow-2xl">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <span className="text-xs font-black text-slate uppercase tracking-widest">Base Logistics</span>
                                        <span className="text-sm font-bold text-white">QAR {financials.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <span className="text-xs font-black text-slate uppercase tracking-widest">Management Fee</span>
                                        <span className="text-sm font-bold text-white">QAR {financials.logistics.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-sm font-black text-gold uppercase tracking-[0.2em]">Grand Total</span>
                                        <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-gold">QAR {financials.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Terms highlight */}
                            <div className="p-6 rounded-3xl bg-gold/5 border border-gold/10">
                                <h4 className="text-[10px] font-black text-gold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3" /> Locked Payment Matrix
                                </h4>
                                <p className="text-sm font-bold text-white mb-2">{booking.paymentTerms || "100% Advance Payment"}</p>
                                <p className="text-[10px] text-slate leading-relaxed">
                                    This proposal is valid for 7 working days. Changes after approval may incur additional logistical overhead charges.
                                </p>
                            </div>

                            {/* Digital signature trigger */}
                            <div className="pt-10 border-t border-white/5">
                                <button 
                                    onClick={() => setActiveTab("sign")}
                                    className="w-full h-20 rounded-3xl bg-white/5 border border-white/10 hover:border-gold/50 text-white font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all group shadow-2xl"
                                >
                                    Proceed to Digital Signing
                                    <ArrowRight className="w-5 h-5 text-gold group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "negotiate" && (
                        <div className="h-full min-h-[500px]">
                            <EmbeddedChat 
                                currentUser={user} 
                                projectId={booking.id} 
                                receiverId={booking.vendorId || "admin"} 
                                receiverName="E3 Operations Lead"
                                title="Project Negotiation Room"
                            />
                        </div>
                    )}

                    {activeTab === "sign" && (
                        <div className="animate-fade-up max-w-md mx-auto">
                            <div className="mb-10 text-center">
                                <h2 className="text-2xl font-[family-name:var(--font-heading)] font-black text-white uppercase italic tracking-tight mb-2">
                                    Digitally <span className="text-gold">Authorize</span>
                                </h2>
                                <p className="text-[10px] text-slate font-black uppercase tracking-widest opacity-40">Verification Protocol Required</p>
                            </div>
                            
                            <SignaturePad 
                                onSave={handleSignatureSave} 
                                isLoading={isPending} 
                            />

                            <button 
                                onClick={() => setActiveTab("review")}
                                className="mt-8 w-full py-4 text-[10px] font-black text-slate hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-3 h-3" /> Back to Summary
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Mobile PDF floating action */}
            <div className="xl:hidden fixed bottom-6 left-6 right-6 z-50">
               {/* Mobile users can download the PDF instead of viewing it on a small screen */}
               <button className="w-full h-14 rounded-2xl bg-navy/90 backdrop-blur-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl">
                    <FileText className="w-4 h-4 text-gold" />
                    Download Commercial Version
               </button>
            </div>
        </div>
    );
}
