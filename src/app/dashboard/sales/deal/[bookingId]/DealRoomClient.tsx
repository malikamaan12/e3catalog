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
    Loader2,
    Plus,
    Trash2,
    CheckCircle,
    Download
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { updateBookingQuote, addQuoteItem, removeQuoteItem, sendNegotiationMessage } from "@/actions/sales";
import { BOOKING_STATUS } from "@/lib/constants";
import { calculateQuoteFinancials } from "@/lib/pricing";
import { toast } from "react-hot-toast";

interface DealRoomProps {
    quote: any;
    messages: any[];
    catalogProducts: any[];
    currentUser: any;
}

export default function DealRoomClient({ quote, messages, catalogProducts, currentUser }: DealRoomProps) {
    const [isUpdating, startUpdate] = useTransition();
    const [sending, startSending] = useTransition();
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Optimistic Chat
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state, newMessage: any) => [...state, newMessage]
    );

    // Commercial Form States
    const [discount, setDiscount] = useState(quote.discount || 0);
    const [logistics, setLogistics] = useState(quote.logisticsCost || 0);
    const [labor, setLabor] = useState(quote.laborCost || 0);
    const [terms, setTerms] = useState(quote.paymentTerms || "100% Advance");
    const [adminNotes, setAdminNotes] = useState(quote.adminNotes || "");
    const [status, setStatus] = useState(quote.status);

    // Add Item Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [addUnits, setAddUnits] = useState(1);
    const [addStart, setAddStart] = useState(quote.startDate ? String(quote.startDate).split('T')[0] : "");
    const [addEnd, setAddEnd] = useState(quote.endDate ? String(quote.endDate).split('T')[0] : "");
    const [isAddingItem, startAddItem] = useTransition();

    // Recalculate Live Financials
    const financials = calculateQuoteFinancials({
        items: quote.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            name: item.product?.name,
            units: item.units,
            pricePerDay: item.product?.pricePerDay || 0,
            startDate: item.startDate,
            endDate: item.endDate,
            showPrice: item.product?.showPrice !== false,
            packagingFee: item.product?.packagingFee || 0,
            handlingFee: item.product?.handlingFee || 0,
            setupFee: item.product?.setupFee || 0,
            vendorId: item.vendorId,
        })),
        discountPercent: discount,
        logisticsCost: Number(logistics) || 0,
        laborCost: Number(labor) || 0,
    });

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [optimisticMessages]);

    const handleSaveQuote = (targetStatus?: string) => {
        const finalStatus = targetStatus || status;
        startUpdate(async () => {
            const res = await updateBookingQuote(quote.projectId || quote.id, {
                discount,
                logisticsCost: Number(logistics),
                laborCost: Number(labor),
                totalPrice: financials.grandTotal,
                paymentTerms: terms,
                adminNotes,
                status: finalStatus,
            });

            if (res.success) {
                if (targetStatus === BOOKING_STATUS.QUOTE_SENT) {
                    setStatus(BOOKING_STATUS.QUOTE_SENT);
                    toast.success("Official Proposal Sent to Client!");
                } else {
                    toast.success("Proposal Draft Saved!");
                }
            } else {
                toast.error(res.error || "Save failed");
            }
        });
    };

    const handleAddItem = () => {
        if (!selectedProductId || addUnits < 1 || !addStart || !addEnd) {
            toast.error("Please fill all item fields");
            return;
        }

        startAddItem(async () => {
            const res = await addQuoteItem(quote.projectId || quote.id, {
                productId: selectedProductId,
                units: addUnits,
                startDate: addStart,
                endDate: addEnd,
            });

            if (res.success) {
                toast.success("Item added to proposal!");
                setShowAddModal(false);
            } else {
                toast.error(res.error || "Failed to add item");
            }
        });
    };

    const handleRemoveItem = (itemId: string) => {
        startUpdate(async () => {
            const res = await removeQuoteItem(itemId, quote.projectId || quote.id);
            if (res.success) {
                toast.success("Item removed");
            } else {
                toast.error(res.error || "Failed to remove item");
            }
        });
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatInput("");

        const receiverId = quote.userId || "CLIENT";

        addOptimisticMessage({
            id: Date.now().toString(),
            senderId: currentUser.id,
            content: msg,
            createdAt: new Date(),
        });

        startSending(async () => {
            await sendNegotiationMessage(quote.id, receiverId, msg, quote.projectId);
        });
    };

    const handleDownloadProposal = async () => {
        const url = `/api/pdf/quote-proposal/${quote.projectId || quote.id}`;
        window.open(url, "_blank");
    };

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-[#0A0F1C]">
            {/* ── Left Column: Quoting Engine & Items ── */}
            <div className="w-7/12 border-r border-white/5 flex flex-col overflow-y-auto no-scrollbar">
                <div className="p-8 flex flex-col gap-8">
                    {/* Back link */}
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard/sales/pipeline" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-[var(--color-gold)] transition-colors">
                            <ArrowLeft className="h-3 w-3" /> Back to Pipeline
                        </Link>
                        <button 
                            onClick={handleDownloadProposal}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                            <Download className="w-3.5 h-3.5 text-gold" /> Preview PDF Proposal
                        </button>
                    </div>

                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-slate-500 uppercase">Ref: #{(quote.projectId || quote.id).slice(0, 8).toUpperCase()}</span>
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
                            {quote.projectName || "Event Production Proposal"}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            Client: <span className="text-white font-bold">{quote.customerName}</span> ({quote.customerEmail})
                        </p>
                    </div>

                    {/* ── Line Items Table ── */}
                    <div className="p-6 rounded-[2rem] glass border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                                Proposal Line Items ({financials.items.length})
                            </h3>
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-navy text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add Product
                            </button>
                        </div>

                        <div className="space-y-3">
                            {financials.items.map((item: any) => (
                                <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-navy-dark overflow-hidden border border-white/10 shrink-0 relative">
                                            {item.thumbnailUrl && (
                                                <Image src={item.thumbnailUrl} alt={item.name} fill className="object-cover" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                                <span>Qty: <strong className="text-white">{item.units}</strong></span>
                                                <span>•</span>
                                                <span>{item.days} Day{item.days > 1 ? 's' : ''}</span>
                                                <span>•</span>
                                                <span>{item.unitPrice} QAR/Day</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="text-sm font-black text-gold">
                                                {item.rentalTotal.toLocaleString()} QAR
                                            </span>
                                            {item.customFees > 0 && (
                                                <span className="text-[9px] text-slate-400 block">+ {item.customFees} QAR fees</span>
                                            )}
                                        </div>
                                        {financials.items.length > 1 && (
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                title="Remove Item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Commercial Controls ── */}
                    <div className="p-8 rounded-[2rem] glass border border-white/5 bg-white/[0.01] flex flex-col gap-6">
                        <h3 className="flex items-center gap-3 text-xs font-black text-[var(--color-gold)] uppercase tracking-[0.2em]">
                            <Calculator className="h-4 w-4" /> Commercial Margin & Logistics Controls
                        </h3>
                        
                        <div className="space-y-6">
                            {/* Discount */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commercial Discount (%)</label>
                                    <span className="text-xs font-black text-[var(--color-gold)]">{discount}% (-{financials.discountAmount.toLocaleString()} QAR)</span>
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Truck className="h-3 w-3 text-blue-400" /> Logistics Fee (QAR)
                                    </label>
                                    <input 
                                        type="number" min="0"
                                        value={logistics}
                                        onChange={(e) => setLogistics(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--color-gold)]/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Settings className="h-3 w-3 text-emerald-400" /> Labor & Setup (QAR)
                                    </label>
                                    <input 
                                        type="number" min="0"
                                        value={labor}
                                        onChange={(e) => setLabor(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--color-gold)]/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Terms</label>
                                <input 
                                    type="text"
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                    placeholder="e.g. 50% Advance, 50% on Delivery"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--color-gold)]/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Sales Notes (Admin Only)</label>
                                <textarea 
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Add notes for operations / warehouse..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[var(--color-gold)]/50"
                                />
                            </div>
                        </div>

                        {/* Breakdown Summary */}
                        <div className="pt-6 border-t border-white/5 space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Base Rental Subtotal</span>
                                <span className="text-white font-bold">{financials.baseRentalSubtotal.toLocaleString()} QAR</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-xs text-red-400">
                                    <span>Discount ({discount}%)</span>
                                    <span>-{financials.discountAmount.toLocaleString()} QAR</span>
                                </div>
                            )}
                            {Number(logistics) > 0 && (
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Logistics & Transport</span>
                                    <span className="text-white font-bold">+{Number(logistics).toLocaleString()} QAR</span>
                                </div>
                            )}
                            {Number(labor) > 0 && (
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Technician & Setup</span>
                                    <span className="text-white font-bold">+{Number(labor).toLocaleString()} QAR</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-4 border-t border-white/10">
                                <span className="text-xs font-black text-gold uppercase tracking-wider">Final Proposal Amount</span>
                                <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-gold">
                                    {financials.grandTotal.toLocaleString()} QAR
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={() => handleSaveQuote()}
                                disabled={isUpdating}
                                className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Draft"}
                            </button>
                            <button 
                                onClick={() => handleSaveQuote(BOOKING_STATUS.QUOTE_SENT)}
                                disabled={isUpdating}
                                className="flex-1 py-4 bg-gold text-navy rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" /> Send Proposal to Client
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right Column: Interactive Negotiation Chat ── */}
            <div className="w-5/12 flex flex-col bg-[#070B14]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Client Deal Channel</h3>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                    {optimisticMessages.length === 0 ? (
                        <div className="text-center py-20 text-slate-600 text-xs uppercase tracking-widest">
                            No negotiation messages yet. Start the conversation below.
                        </div>
                    ) : (
                        optimisticMessages.map((msg: any) => {
                            const isMe = msg.senderId === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                                        isMe ? 'bg-gold text-navy font-medium rounded-br-none' : 'bg-white/5 text-white border border-white/10 rounded-bl-none'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[9px] text-slate-600 mt-1 px-1">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type negotiation update to client..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold/50"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={sending || !chatInput.trim()}
                            className="px-4 bg-gold text-navy rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Add Product Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0e1424] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                        <h3 className="text-lg font-bold text-white">Add Equipment to Proposal</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400 font-semibold">Select Asset from Catalog</label>
                                <select 
                                    value={selectedProductId} 
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold"
                                >
                                    <option value="" className="bg-[#0e1424]">Choose an equipment...</option>
                                    {catalogProducts.map(p => (
                                        <option key={p.id} value={p.id} className="bg-[#0e1424]">
                                            {p.name} ({p.pricePerDay} QAR/Day)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-400 font-semibold">Quantity</label>
                                <input 
                                    type="number" min="1" 
                                    value={addUnits} 
                                    onChange={(e) => setAddUnits(Math.max(1, Number(e.target.value)))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400 font-semibold">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={addStart} 
                                        onChange={(e) => setAddStart(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400 font-semibold">End Date</label>
                                    <input 
                                        type="date" 
                                        value={addEnd} 
                                        onChange={(e) => setAddEnd(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddItem}
                                disabled={isAddingItem}
                                className="px-6 py-2.5 rounded-xl bg-gold text-navy text-xs font-black uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {isAddingItem ? "Checking Stock..." : "Add to Proposal"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
