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
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold text-[var(--color-warm-white)] tracking-tighter">
                                Quote <span className="gradient-text-gold">Builder</span>
                            </h1>
                            <p className="text-[var(--color-slate)] mt-2 font-medium">
                                Review your selection and establish a project request.
                            </p>
                        </motion.div>
                        {items.length > 0 && (
                            <button onClick={clearCart} className="text-xs font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-2">
                                <span>×</span> Clear Entire Selection
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 glass-dark rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-32 glass-dark rounded-[3rem] border border-white/5">
                            <div className="text-6xl mb-6">📦</div>
                            <h3 className="text-2xl font-bold text-white mb-2">Selection is Empty</h3>
                            <p className="text-slate mb-10 max-w-sm mx-auto">Add assets from our catalog to begin building your professional quote.</p>
                            <Link href="/catalog" className="btn-primary px-10">Return to Catalog</Link>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* LEFT: Items List */}
                            <div className="lg:col-span-8 space-y-12">
                                {Object.entries(
                                    items.reduce((acc, item) => {
                                        const vId = item.product.vendorId || "platform";
                                        const vName = item.product.vendor?.companyName || "E3 Premium Rentals";
                                        if (!acc[vId]) acc[vId] = { name: vName, items: [] };
                                        acc[vId].items.push(item);
                                        return acc;
                                    }, {} as Record<string, { name: string; items: CartItem[] }>)
                                ).map(([vendorId, group]) => (
                                    <div key={vendorId} className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/40">Fulfillment Source</span>
                                            <h2 className="text-sm font-bold text-slate uppercase tracking-widest">{group.name}</h2>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <AnimatePresence initial={false}>
                                                {group.items.map((item) => {
                                                    const days = calcDays(item.startDate, item.endDate);
                                                    return (
                                                        <motion.div 
                                                            key={item.id}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, x: -20 }}
                                                            className="glass-dark rounded-3xl p-4 md:p-6 border border-white/5 group hover:border-gold/20 transition-all shadow-xl"
                                                        >
                                                            <div className="flex flex-col sm:flex-row gap-6">
                                                                <div className="w-24 h-24 shrink-0 rounded-2xl bg-navy-lighter overflow-hidden border border-white/5 relative">
                                                                    {item.product.thumbnailUrl && (
                                                                        <Image src={item.product.thumbnailUrl} alt={item.product.name} fill className="object-cover" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <Link href={`/catalog/${item.product.slug}`} className="text-lg font-bold text-white hover:text-gold transition-colors truncate">
                                                                            {item.product.name}
                                                                        </Link>
                                                                        <button onClick={() => removeItem(item.id)} className="text-slate/40 hover:text-red-400 transition-colors text-lg">×</button>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate/60 mb-4">
                                                                        <span className="flex items-center gap-1"><span className="text-gold">📅</span> {item.startDate} — {item.endDate} ({days} days)</span>
                                                                        {item.product.dimensions && <span className="flex items-center gap-1">📏 {item.product.dimensions}</span>}
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                                                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                                                                            <button onClick={() => updateQuantity(item.id, item.quantity, -1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gold hover:text-navy transition-all font-bold">−</button>
                                                                            <span className="px-3 text-sm font-black text-white">{item.quantity} <span className="text-[10px] opacity-40">{item.product.unit || 'Units'}</span></span>
                                                                            <button onClick={() => updateQuantity(item.id, item.quantity, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gold hover:text-navy transition-all font-bold">+</button>
                                                                        </div>
                                                                        
                                                                        <div className="text-right">
                                                                            {item.product.showPrice ? (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-xl font-black text-white">{(item.product.pricePerDay * item.quantity * days).toLocaleString()} <span className="text-xs text-slate">QAR</span></span>
                                                                                    <span className="text-[10px] text-slate/40 font-bold uppercase tracking-widest">Rate: {item.product.pricePerDay} / Day</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-[10px] px-3 py-1 rounded-full bg-gold/5 border border-gold/10 text-gold font-black uppercase tracking-widest italic">Price on Quotation</span>
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
                            </div>

                            {/* RIGHT: Summary Card */}
                            <div className="lg:col-span-4 sticky top-28">
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-dark rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[80px]" />
                                    
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gold mb-8 italic">Project Logistics</h3>

                                    <div className="space-y-4 mb-10 pb-10 border-b border-white/5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate/40">Subtotal Assets</span>
                                            <span className="text-lg font-black text-white">{subtotal.toLocaleString()} <span className="text-xs text-slate">QAR</span></span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate/40">Logistics & Mob.</span>
                                            <span className="text-[10px] font-black text-gold uppercase tracking-widest">Calculated on Review</span>
                                        </div>
                                        {hasHiddenPrices && (
                                            <p className="text-[10px] text-slate/50 italic leading-relaxed pt-2">
                                                * This quote contains unpriced items. Final totals will be computed by our logistics team within 24 hours.
                                            </p>
                                        )}
                                    </div>

                                    <form onSubmit={generateQuoteAndRequest} className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate uppercase tracking-widest ml-1 mb-2 block">Project Reference</label>
                                            <div className="space-y-3">
                                                {existingQuotes.length > 0 && (
                                                    <select
                                                        value={selectedProjectId}
                                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-gold focus:outline-none transition-all"
                                                    >
                                                        <option value="new" className="bg-navy">Create New Project Folder</option>
                                                        {existingQuotes.map(q => (
                                                            <option key={q.id} value={q.id} className="bg-navy">{q.projectName}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {selectedProjectId === "new" && (
                                                    <input required type="text" name="projectName" value={formData.projectName} onChange={handleFormChange} placeholder="Enter Project Name..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/20" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <input required type="text" name="customerName" value={formData.customerName} onChange={handleFormChange} placeholder="Client / Entity Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/20" />
                                            <input required type="email" name="customerEmail" value={formData.customerEmail} onChange={handleFormChange} placeholder="Official Contact Email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/20" />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || userRole === "admin"}
                                            className="w-full py-6 rounded-2xl bg-gold text-navy font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-gold/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                                                    Encrypting Request...
                                                </>
                                            ) : (
                                                "Establish Quote"
                                            )}
                                        </button>
                                        
                                        <p className="text-[9px] text-center font-black text-slate uppercase tracking-widest opacity-30 px-4">
                                            Submission triggers automated logistics review and PDF generation.
                                        </p>
                                    </form>

                                    {/* Success Message */}
                                    {successMessage && (
                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest text-center">
                                            {successMessage}
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
