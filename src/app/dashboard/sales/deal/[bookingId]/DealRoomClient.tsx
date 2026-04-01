"use client";

import React, { useState, useTransition, useOptimistic, useRef, useEffect } from "react";
import { 
    ArrowLeft, 
    MessageSquare, 
    ShieldCheck, 
    Calculator, 
    Send, 
    FileText, 
    Zap,
    Truck,
    Settings,
    User,
    Calendar,
    ChevronRight,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { updateBookingQuote, sendNegotiationMessage } from "@/actions/sales";
import { BOOKING_STATUS } from "@/lib/constants";

interface DealRoomProps {
    booking: any;
    messages: any[];
    currentUser: any;
}

export default function DealRoomClient({ booking, messages, currentUser }: DealRoomProps) {
    const [isUpdating, startUpdate] = useTransition();
    const [sending, startSending] = useTransition();
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Optimistic Chat
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state, newMessage: any) => [...state, newMessage]
    );

    // Form States
    const [discount, setDiscount] = useState(booking.discount || 0);
    const [logistics, setLogistics] = useState(booking.logisticsCost || 0);
    const [setup, setSetup] = useState(booking.laborCost || 0);
    const [terms, setTerms] = useState(booking.paymentTerms || "100% Advance");
    const [status, setStatus] = useState(booking.status);

    // Pricing Calculation
    const basePrice = (booking.product?.pricePerDay || 0) * (booking.units || 1);
    const discountAmount = (basePrice * discount) / 100;
    const finalTotal = basePrice - discountAmount + Number(logistics) + Number(setup);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [optimisticMessages]);

    const handleSaveQuote = () => {
        startUpdate(async () => {
            await updateBookingQuote(booking.id, {
                discount,
                logisticsCost: Number(logistics),
                laborCost: Number(setup),
                totalPrice: finalTotal,
                paymentTerms: terms,
                status
            });
        });
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatInput("");

        const receiverId = booking.userId === currentUser.id ? "ADMIN" : booking.userId; // Simplified logic

        addOptimisticMessage({
            id: Date.now().toString(),
            senderId: currentUser.id,
            content: msg,
            createdAt: new Date(),
        });

        startSending(async () => {
            await sendNegotiationMessage(booking.id, receiverId, msg);
        });
    };

    const handleDownloadProposal = async () => {
        const url = `/api/pdf/quote-proposal/${booking.id}`;
        window.open(url, "_blank");
    };

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-[#0A0F1C]">
            {/* ── Left Column: Quoting Engine ── */}
            <div className="w-1/2 border-r border-white/5 flex flex-col overflow-y-auto no-scrollbar">
                <div className="p-8 flex flex-col gap-8">
                    {/* Back link */}
                    <Link href="/dashboard/sales/pipeline" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-[var(--color-gold)] transition-colors">
                        <ArrowLeft className="h-3 w-3" /> Back to Pipeline
                    </Link>

                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-slate-500 uppercase">#{booking.id.slice(0, 8)}</span>
                            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider
                                ${status === 'request' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  status === 'quote_sent' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  status === 'approved' ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/20 text-[var(--color-gold)]' :
                                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}
                            `}>
                                {String(status).replace('_', ' ')}
                            </span>
                        </div>
                        <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-widest italic leading-tight">
                            {booking.projectName || "Standard Rental Proposal"}
                        </h1>
                    </div>

                    {/* Pricing Form */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="p-8 rounded-[2rem] glass border border-white/5 bg-white/[0.01] flex flex-col gap-6">
                            <h3 className="flex items-center gap-3 text-xs font-black text-[var(--color-gold)] uppercase tracking-[0.2em]">
                                <Calculator className="h-4 w-4" /> Commercial Controls
                            </h3>
                            
                            <div className="space-y-6">
                                {/* Discount */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Discount (%)</label>
                                        <span className="text-[10px] font-black text-[var(--color-gold)]">{discount}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" step="1"
                                        value={discount}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[var(--color-gold)]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Truck className="h-3 w-3" /> Logistics Cost
                                        </label>
                                        <input 
                                            type="number"
                                            value={logistics}
                                            onChange={(e) => setLogistics(Number(e.target.value))}
                                            placeholder="0.00"
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--color-gold)]/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck className="h-3 w-3" /> Setup / Labor
                                        </label>
                                        <input 
                                            type="number"
                                            value={setup}
                                            onChange={(e) => setSetup(Number(e.target.value))}
                                            placeholder="0.00"
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--color-gold)]/50"
                                        />
                                    </div>
                                </div>

                                {/* Terms & Conditions */}
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">MOCI Compliance Terms</label>
                                    <select 
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:border-[var(--color-gold)]/50"
                                    >
                                        <option value="100% Advance">100% Advance Payment</option>
                                        <option value="50% Advance / 50% Post-Event">50/50 - Half on Booking</option>
                                        <option value="Net 30 Days">Net 30 (Corporate Only)</option>
                                        <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Summary & Actions */}
                        <div className="p-8 rounded-[2rem] bg-[var(--color-gold)] text-[var(--color-navy)] flex flex-col gap-6 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
                                <Calculator className="h-32 w-32" />
                           </div>
                           
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Payable Proposal</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-black">QAR</span>
                                    <span className="text-4xl font-[family-name:var(--font-heading)] font-black tracking-tighter italic">
                                        {finalTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={handleSaveQuote}
                                    disabled={isUpdating}
                                    className="flex items-center justify-center gap-2 h-12 bg-[var(--color-navy)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-[var(--color-gold)]" />}
                                    Sync Quote
                                </button>
                                <button 
                                    onClick={handleDownloadProposal}
                                    className="flex items-center justify-center gap-2 h-12 border-2 border-[var(--color-navy)] text-[var(--color-navy)] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--color-navy)] hover:text-white transition-all shadow-sm"
                                >
                                    <FileText className="h-4 w-4" />
                                    Gen Proposal
                                </button>
                            </div>
                        </div>

                        {/* Status Management */}
                        <div className="flex flex-wrap gap-3">
                            {Object.values(BOOKING_STATUS).slice(0, 4).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border
                                        ${status === s 
                                            ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20 shadow-xl' 
                                            : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/20'}
                                    `}
                                >
                                    {s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right Column: Integrated Chat ── */}
            <div className="w-1/2 flex flex-col bg-black/20">
                {/* Chat Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0A0F1C]">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm uppercase">
                            {booking.customerName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-[var(--color-warm-white)] uppercase tracking-widest">{booking.customerName}</h3>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Client Connection: Optimal</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button className="p-2.5 rounded-xl border border-white/10 glass text-slate-400 hover:text-[var(--color-gold)] transition-all">
                           <Settings className="h-4 w-4" />
                       </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 no-scrollbar custom-scrollbar">
                    {optimisticMessages.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10">
                            <MessageSquare className="h-16 w-16 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-[0.3em]">Negotiation Signal Ready</p>
                        </div>
                    )}
                    
                    {optimisticMessages.map((msg: any) => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                            <div 
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-2`}
                            >
                                <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] leading-relaxed tracking-wide
                                    ${isMe 
                                        ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 text-white rounded-tr-none' 
                                        : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'}
                                `}>
                                    {msg.content}
                                </div>
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">
                                    {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[#0A0F1C] border-t border-white/5">
                    <div className="relative group">
                        <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="TRANSMIT MESSAGE TO CLIENT..."
                            className="w-full bg-black/40 border-2 border-white/5 focus:border-[var(--color-gold)]/50 rounded-2xl pl-6 pr-20 py-4 outline-none text-[var(--color-warm-white)] font-bold text-[11px] tracking-wide placeholder:text-slate-600 transition-all shadow-2xl"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={sending || !chatInput.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] active:scale-95 transition-all disabled:opacity-30"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 shadow-sm" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
