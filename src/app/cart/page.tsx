"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";

interface CartItem {
    id: string;
    quantity: number;
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    product: {
        id: string;
        name: string;
        slug: string;
        pricePerDay: number;
        pricePerHour: number | null;
        showPrice: boolean;
        thumbnailUrl: string | null;
        dimensions: string | null;
        unit: string;
        vendorId: string | null;
        vendor: { id: string; companyName: string } | null;
    };
}

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [loginPrompt, setLoginPrompt] = useState(false);
    const [existingQuotes, setExistingQuotes] = useState<{ id: string, projectName: string }[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("new");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editData, setEditData] = useState({ quantity: 1, startDate: "", endDate: "" });
    const [userRole, setUserRole] = useState<"admin" | "client" | null>(null);
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        projectName: "",
        notes: "",
    });

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const fetchCartAndUser = useCallback(async () => {
        try {
            const res = await fetch("/api/cart", { credentials: "include" });
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);

            const userRes = await fetch("/api/auth/me", { credentials: "include" });
            const userData = await userRes.json();
            if (userData.user) {
                setUserRole(userData.user.role === "admin" ? "admin" : "client");
                setFormData(prev => ({
                    ...prev,
                    customerName: userData.user.name || "",
                    customerEmail: userData.user.email || ""
                }));

                try {
                    const quotesRes = await fetch("/api/dashboard/quotes");
                    if (quotesRes.ok) {
                        const quotesData = await quotesRes.json();
                        if (Array.isArray(quotesData)) {
                            const activeQuotes = quotesData
                                .filter(q => ["request", "changes_requested", "quote_sent"].includes(q.status))
                                .map(q => ({ id: q.id, projectName: q.projectName }));
                            setExistingQuotes(activeQuotes);
                        }
                    }
                } catch (e) {}
            }
        } catch {
            setItems([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchCartAndUser(); }, [fetchCartAndUser]);

    const removeItem = async (id: string) => {
        await fetch(`/api/cart?id=${id}`, { method: "DELETE", credentials: "include" });
        fetchCartAndUser();
    };

    const clearCart = async () => {
        await fetch("/api/cart", { method: "DELETE", credentials: "include" });
        fetchCartAndUser();
    };

    const updateQuantity = async (id: string, currentQuantity: number, change: number) => {
        const newQuantity = Math.max(1, currentQuantity + change);
        if (newQuantity === currentQuantity) return;
        await fetch("/api/cart", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id, quantity: newQuantity })
        });
        fetchCartAndUser();
    };

    const saveEdit = async (id: string) => {
        if (editData.quantity < 1 || !editData.startDate || !editData.endDate) return;
        await fetch("/api/cart", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id, ...editData })
        });
        setEditingItemId(null);
        fetchCartAndUser();
    };

    const calcDays = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    };

    const subtotal = items.reduce((sum, item) => {
        if (!item.product.showPrice) return sum;
        return sum + item.product.pricePerDay * item.quantity * calcDays(item.startDate, item.endDate);
    }, 0);

    const total = subtotal;
    const hasHiddenPrices = items.some(item => !item.product.showPrice);
    const allHidden = items.length > 0 && items.every(item => !item.product.showPrice);

    const generateQuoteAndRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const bookRes = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, projectId: selectedProjectId === "new" ? undefined : selectedProjectId }),
            });
            const responseData = await bookRes.json();
            if (!bookRes.ok) {
                if (bookRes.status === 409 && responseData.requiresLogin) {
                    setLoginPrompt(true);
                    setSubmitting(false);
                    return;
                }
                throw new Error(responseData.error || "Failed to create booking request");
            }
            setSuccessMessage("Quote request established. Syncing profile...");
            fetchCartAndUser();
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 2000);
        } catch (err) {
            console.error(err);
        }
        setSubmitting(false);
    };

    return (
        <>
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-7xl mx-auto px-6">
                    {/* ── Enhanced Header ── */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <span className="text-[10px] font-black text-gold uppercase tracking-[0.4em] mb-3 block italic">Step 02: Logistics & Configuration</span>
                            <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-6xl font-bold text-white tracking-tighter leading-tight">
                                Live <span className="gradient-text-gold">Proposal</span> Builder
                            </h1>
                            <p className="text-slate/60 mt-4 font-medium text-lg max-w-xl">
                                Review your fleet selection, configure project logistics, and establish a secure proposal request for our logistics team.
                            </p>
                        </motion.div>
                        {items.length > 0 && (
                            <button onClick={clearCart} className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/40 hover:text-red-400 transition-all flex items-center gap-2 border border-red-400/10 px-4 py-2 rounded-full hover:bg-red-400/5">
                                <span>×</span> Reset Proposal
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 glass-dark rounded-[3rem] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-40 glass-dark rounded-[4rem] border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gold/5 blur-[120px]" />
                            <div className="relative z-10">
                                <div className="text-7xl mb-8 opacity-20">📂</div>
                                <h3 className="text-3xl font-bold text-white mb-3 italic tracking-tighter uppercase">Proposal is Empty</h3>
                                <p className="text-slate/60 mb-12 max-w-sm mx-auto text-lg">Add assets from our high-end catalog to begin architecting your project proposal.</p>
                                <Link href="/catalog" className="bg-gold text-navy px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-gold/20 hover:scale-105 transition-all active:scale-95">Open Live Catalog</Link>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                            {/* LEFT: Items List */}
                            <div className="lg:col-span-8 space-y-16">
                                {Object.entries(
                                    items.reduce((acc, item) => {
                                        const vId = item.product.vendorId || "platform";
                                        const vName = item.product.vendor?.companyName || "E3 Premium Logistics";
                                        if (!acc[vId]) acc[vId] = { name: vName, items: [] };
                                        acc[vId].items.push(item);
                                        return acc;
                                    }, {} as Record<string, { name: string; items: CartItem[] }>)
                                ).map(([vendorId, group]) => (
                                    <div key={vendorId} className="space-y-8">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gold/30">Fulfillment Hub</span>
                                                <h2 className="text-xs font-black text-slate uppercase tracking-[0.2em] mt-1">{group.name}</h2>
                                            </div>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <AnimatePresence initial={false}>
                                                {group.items.map((item) => {
                                                    const days = calcDays(item.startDate, item.endDate);
                                                    return (
                                                        <motion.div 
                                                            key={item.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            className="glass-dark rounded-[2.5rem] p-6 md:p-8 border border-white/10 group hover:border-gold/30 transition-all shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative overflow-hidden"
                                                        >
                                                            <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            
                                                            <div className="flex flex-col sm:flex-row gap-8 relative z-10">
                                                                <div className="w-32 h-32 shrink-0 rounded-3xl bg-navy-dark overflow-hidden border border-white/5 relative shadow-2xl">
                                                                    {item.product.thumbnailUrl && (
                                                                        <Image src={item.product.thumbnailUrl} alt={item.product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="min-w-0">
                                                                            <Link href={`/catalog/${item.product.slug}`} className="text-xl md:text-2xl font-bold text-white hover:text-gold transition-colors block truncate tracking-tighter">
                                                                                {item.product.name}
                                                                            </Link>
                                                                            <span className="text-[9px] font-black text-gold/40 uppercase tracking-[0.3em] mt-1 block">Asset Reference: {item.product.id.slice(0,8).toUpperCase()}</span>
                                                                        </div>
                                                                        <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate/40 hover:text-red-400 hover:bg-red-400/10 transition-all text-xl">×</button>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 mb-8 pb-6 border-b border-white/5">
                                                                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                                                            <span className="text-gold text-xs">📅</span>
                                                                            <span className="text-[10px] font-black uppercase text-white tracking-widest">{item.startDate} — {item.endDate}</span>
                                                                            <span className="text-[9px] font-black text-gold/60 ml-1">({days} DAYS)</span>
                                                                        </div>
                                                                        {item.product.dimensions && (
                                                                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                                                                <span className="text-gold text-xs">📏</span>
                                                                                <span className="text-[10px] font-black uppercase text-white tracking-widest">{item.product.dimensions}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                                                        <div className="flex items-center gap-4 bg-navy-dark p-2 rounded-2xl border border-white/10 shadow-inner">
                                                                            <button onClick={() => updateQuantity(item.id, item.quantity, -1)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gold hover:text-navy transition-all font-bold border border-white/5">−</button>
                                                                            <span className="px-4 text-sm font-black text-white min-w-[3rem] text-center">{item.quantity} <span className="text-[9px] opacity-30 text-slate ml-1 uppercase">{item.product.unit || 'Units'}</span></span>
                                                                            <button onClick={() => updateQuantity(item.id, item.quantity, 1)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gold hover:text-navy transition-all font-bold border border-white/5">+</button>
                                                                        </div>
                                                                        
                                                                        <div className="text-right">
                                                                            {item.product.showPrice ? (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-2xl font-black text-white italic tracking-tighter">{(item.product.pricePerDay * item.quantity * days).toLocaleString()} <span className="text-[10px] text-slate opacity-40 non-italic ml-1">QAR</span></span>
                                                                                    <span className="text-[9px] text-slate/40 font-bold uppercase tracking-[0.2em] mt-1">RATE: {item.product.pricePerDay} QAR / DAY</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[10px] px-4 py-2 rounded-2xl bg-gold/5 border border-gold/20 text-gold font-black uppercase tracking-[0.2em] italic">Awaiting Quotation</span>
                                                                                    <span className="text-[8px] text-slate/30 font-bold uppercase tracking-widest mt-2">Team Review Required</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ))}

                                {/* ── Chat Negotiation Briefing ── */}
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-8 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-[60px]" />
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                        <span className="text-2xl">💬</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-300 mb-2 italic">Real-Time Negotiation Aware</h4>
                                        <p className="text-sm text-slate/60 leading-relaxed font-medium">
                                            Established proposals unlock a direct, multi-party chat channel between you, the vendors, and our logistics team. You can refine specs, negotiate pricing, and finalize logistics in real-time within your Project Dashboard.
                                        </p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* RIGHT: Summary Card */}
                            <div className="lg:col-span-4 sticky top-28">
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-dark rounded-[3rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 blur-[100px]" />
                                    
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-10 italic flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                                        Proposal Overview
                                    </h3>

                                    <div className="space-y-6 mb-12 pb-10 border-b border-white/5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate/40">Secure Subtotal</span>
                                            <span className="text-2xl font-black text-white italic tracking-tighter">
                                                {hasHiddenPrices ? "TBD" : subtotal.toLocaleString()} 
                                                {!hasHiddenPrices && <span className="text-[10px] text-slate non-italic ml-1">QAR</span>}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate/40">Logistics Fee</span>
                                            <span className="text-[9px] font-black text-gold uppercase tracking-[0.3em] bg-gold/5 px-3 py-1 rounded-full border border-gold/10">TBD ON REVIEW</span>
                                        </div>
                                        {hasHiddenPrices && (
                                            <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <p className="text-[9px] text-slate/50 italic leading-relaxed uppercase tracking-widest font-bold">
                                                    * Includes unpriced assets. Official Quote will be generated following logistics assessment.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <form onSubmit={generateQuoteAndRequest} className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-slate/50 uppercase tracking-[0.3em] ml-1 block">Project Identity</label>
                                            <div className="space-y-4">
                                                {existingQuotes.length > 0 && (
                                                    <select
                                                        value={selectedProjectId}
                                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:border-gold focus:outline-none transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="new" className="bg-[#0a0f1e] text-white">New Strategic Project</option>
                                                        {existingQuotes.map(q => (
                                                            <option key={q.id} value={q.id} className="bg-[#0a0f1e] text-white">{q.projectName}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {selectedProjectId === "new" && (
                                                    <input required type="text" name="projectName" value={formData.projectName} onChange={handleFormChange} placeholder="Strategic Project Name..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/20" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-slate/50 uppercase tracking-[0.3em] ml-1 block">Entity Details</label>
                                            <input required type="text" name="customerName" value={formData.customerName} onChange={handleFormChange} placeholder="Client / Entity Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/20 shadow-inner" />
                                            <input required type="email" name="customerEmail" value={formData.customerEmail} onChange={handleFormChange} placeholder="Authorized Contact Email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/20 shadow-inner" />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || userRole === "admin"}
                                            className="w-full py-8 rounded-[2rem] bg-gold text-navy font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(251,191,36,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-4 relative overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                                                    Encrypting Proposal...
                                                </>
                                            ) : (
                                                <span className="relative z-10">Submit for Review</span>
                                            )}
                                        </button>
                                        
                                        <p className="text-[8px] text-center font-black text-slate/30 uppercase tracking-[0.3em] px-8 leading-relaxed">
                                            Automated logistics appraisal and PDF generation initiated upon submission.
                                        </p>
                                    </form>

                                    {/* Success Message */}
                                    {successMessage && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em] text-center">
                                            <span className="mr-2">✓</span> {successMessage}
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
