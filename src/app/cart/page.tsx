"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    };
}

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
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
            // Fetch Cart
            const res = await fetch("/api/cart", { credentials: "include" });
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);

            // Fetch User
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
                } catch (e) {
                    // Ignore quote fetch errors
                }
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

    // Only sum items where price is public; hidden items contribute 0 to visible total
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
        setGenerating(true);

        try {
            // 1. Submit to Bookings backend
            const bookRes = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    projectId: selectedProjectId === "new" ? undefined : selectedProjectId
                }),
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

            setSuccessMessage("Quote request sent! Redirecting to your dashboard...");

            // Re-fetch cart to show it's empty now
            fetchCartAndUser();

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 2000);

        } catch (err) {
            console.error("Quote generation failed:", err);
            setSuccessMessage("");
        }
        setGenerating(false);
        setSubmitting(false);
    };

    return (
        <>
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-[var(--color-warm-white)]">
                                Your Cart
                            </h1>
                            <p className="text-[var(--color-slate)] mt-1">
                                {items.length} item{items.length !== 1 ? "s" : ""} in your cart
                            </p>
                        </div>
                        {items.length > 0 && (
                            <button onClick={clearCart} className="text-sm text-[var(--color-danger)] hover:underline">
                                Clear All
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="card p-6 animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 bg-[var(--color-navy-lighter)] rounded-lg" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-4 bg-[var(--color-navy-lighter)] rounded w-1/2" />
                                            <div className="h-3 bg-[var(--color-navy-lighter)] rounded w-1/3" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-5xl mb-4">🛒</div>
                            <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--color-warm-white)] mb-2">
                                Your cart is empty
                            </h3>
                            <p className="text-[var(--color-slate)] mb-8">Browse our catalog and add equipment to build your cart.</p>
                            <Link href="/catalog" className="btn-primary">Browse Catalog</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Items */}
                            <div className="lg:col-span-2 space-y-4">
                                {items.map((item) => {
                                    const days = calcDays(item.startDate, item.endDate);
                                    const lineTotal = item.product.pricePerDay * item.quantity * days;
                                    return (
                                        <div key={item.id} className="card p-5">
                                            <div className="flex gap-4">
                                                <div className="w-20 h-20 shrink-0 rounded-lg bg-[var(--color-navy-lighter)] overflow-hidden">
                                                    {item.product.thumbnailUrl ? (
                                                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.product.thumbnailUrl})` }} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--color-slate)]">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <Link href={`/catalog/${item.product.slug}`} className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] hover:text-[var(--color-gold)] transition-colors line-clamp-1">
                                                        {item.product.name}
                                                    </Link>
                                                    {item.product.dimensions && (
                                                        <p className="text-xs text-[var(--color-slate)] mt-0.5">{item.product.dimensions}</p>
                                                    )}
                                                    {editingItemId === item.id ? (
                                                        <div className="mt-3 p-4 bg-[var(--color-navy-dark)] rounded-lg border border-[var(--color-border-subtle)] space-y-3">
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs text-[var(--color-slate)] mb-1">Quantity</label>
                                                                    <input type="number" min="1" value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: Number(e.target.value) })} className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded px-3 py-2 text-sm text-[var(--color-warm-white)]" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs text-[var(--color-slate)] mb-1">Start Date</label>
                                                                    <input type="date" value={editData.startDate} onChange={e => setEditData({ ...editData, startDate: e.target.value })} className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded px-3 py-2 text-sm text-[var(--color-warm-white)]" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs text-[var(--color-slate)] mb-1">End Date</label>
                                                                    <input type="date" value={editData.endDate} onChange={e => setEditData({ ...editData, endDate: e.target.value })} className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded px-3 py-2 text-sm text-[var(--color-warm-white)]" />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 justify-end mt-2">
                                                                <button onClick={() => setEditingItemId(null)} className="text-xs text-[var(--color-slate)] hover:text-white px-3 py-1.5 transition-colors">Cancel</button>
                                                                <button onClick={() => saveEdit(item.id)} className="text-xs bg-[var(--color-gold)] text-[var(--color-navy)] font-medium rounded px-4 py-1.5 hover:bg-white transition-colors">Save Changes</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 text-sm text-[var(--color-slate)]">
                                                            <div className="flex items-center gap-1 bg-[var(--color-navy-dark)] rounded overflow-hidden border border-white/5">
                                                                <button onClick={() => updateQuantity(item.id, item.quantity, -1)} className="w-8 h-8 flex flex-col items-center justify-center hover:bg-white/5 disabled:opacity-30 text-lg leading-none" disabled={item.quantity <= 1}>−</button>
                                                                <span className="px-2 text-center text-[var(--color-warm-white)] font-medium text-sm whitespace-nowrap min-w-[2rem]">{item.quantity} {item.product.unit}</span>
                                                                <button onClick={() => updateQuantity(item.id, item.quantity, 1)} className="w-8 h-8 flex flex-col items-center justify-center hover:bg-white/5 text-lg leading-none">+</button>
                                                            </div>
                                                            {/* Rate — only shown if showPrice is true */}
                                                            {item.product.showPrice ? (
                                                                <span>× {item.product.pricePerDay.toLocaleString()} QAR/{(item.product.unit === 'unit' || !item.product.unit) ? 'day' : `${item.product.unit}/day`}</span>
                                                            ) : (
                                                                <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-slate)] italic">Price upon request</span>
                                                            )}
                                                            <span className="hidden sm:inline">·</span>
                                                            <span>{days} day{days > 1 ? "s" : ""}</span>
                                                            <span className="hidden sm:inline">·</span>
                                                            <span>{item.startDate} → {item.endDate}</span>

                                                            <button onClick={() => { setEditingItemId(item.id); setEditData({ quantity: item.quantity, startDate: item.startDate, endDate: item.endDate }); }} className="text-xs text-[var(--color-gold)] hover:text-white transition-colors ml-auto underline underline-offset-2">
                                                                Edit Details
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end justify-between">
                                                    {/* Line total — only if price is public */}
                                                    {item.product.showPrice ? (
                                                        <span className="font-bold gradient-text-gold">{(item.product.pricePerDay * item.quantity * days).toLocaleString()} QAR</span>
                                                    ) : (
                                                        <span className="text-xs text-[var(--color-slate)] italic">TBD</span>
                                                    )}
                                                    <button onClick={() => removeItem(item.id)} className="text-xs text-[var(--color-danger)] hover:underline mt-2">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary */}
                            <div className="lg:col-span-1">
                                <div className="glass rounded-xl p-6 sticky top-28">
                                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5">CART SUMMARY</h3>

                                    <div className="space-y-3 mb-6 text-sm">
                                        {!allHidden && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-slate)]">
                                                    {hasHiddenPrices ? "Subtotal (priced items)" : "Subtotal"}
                                                </span>
                                                <span className="text-[var(--color-warm-white)]">{subtotal.toLocaleString()} QAR</span>
                                            </div>
                                        )}

                                        {hasHiddenPrices && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[var(--color-slate)]">Price-on-request items</span>
                                                <span className="text-xs text-[var(--color-slate)] italic">TBD by admin</span>
                                            </div>
                                        )}

                                        <div className="border-t border-[var(--color-border-subtle)] pt-3">
                                            {allHidden ? (
                                                <div className="text-center py-2">
                                                    <p className="text-sm font-semibold text-[var(--color-warm-white)] mb-1">Pricing upon quotation</p>
                                                    <p className="text-xs text-[var(--color-slate)]">Our team will prepare a custom quote with full pricing for your request.</p>
                                                </div>
                                            ) : hasHiddenPrices ? (
                                                <div>
                                                    <div className="flex justify-between mb-2">
                                                        <span className="font-semibold text-[var(--color-warm-white)]">Partial Total</span>
                                                        <span className="text-xl font-bold gradient-text-gold">{total.toLocaleString()} QAR</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--color-slate)] italic">+ additional pricing for quoted items will be included in your official quote.</p>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-[var(--color-warm-white)]">Total</span>
                                                    <span className="text-xl font-bold gradient-text-gold">{total.toLocaleString()} QAR</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <form onSubmit={generateQuoteAndRequest} className="mt-6 space-y-4 border-t border-[var(--color-border-subtle)] pt-6">
                                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm text-[var(--color-warm-white)]">CLIENT DETAILS</h4>

                                        {existingQuotes.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="block text-xs text-[var(--color-slate)] font-medium">Add to Existing Quote Request</label>
                                                <select
                                                    value={selectedProjectId}
                                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                                    className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                                                >
                                                    <option value="new">Create New Quote Request</option>
                                                    {existingQuotes.map(q => (
                                                        <option key={q.id} value={q.id}>{q.projectName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {selectedProjectId === "new" && (
                                            <input
                                                required
                                                type="text"
                                                name="projectName"
                                                value={formData.projectName}
                                                onChange={handleFormChange}
                                                placeholder="Project Reference / Event Name"
                                                className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                                            />
                                        )}
                                        <input
                                            required
                                            type="text"
                                            name="customerName"
                                            value={formData.customerName}
                                            onChange={handleFormChange}
                                            placeholder="Full Name / Company"
                                            className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                                        />
                                        <input
                                            required
                                            type="email"
                                            name="customerEmail"
                                            value={formData.customerEmail}
                                            onChange={handleFormChange}
                                            placeholder="Email Address"
                                            className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                                        />
                                        <input
                                            type="tel"
                                            name="customerPhone"
                                            value={formData.customerPhone}
                                            onChange={handleFormChange}
                                            placeholder="Phone Number (Optional)"
                                            className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                                        />
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleFormChange}
                                            placeholder="Project Notes / Event Location..."
                                            rows={3}
                                            className="w-full bg-[var(--color-navy-light)] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors resize-none mb-4"
                                        />

                                        {/* Admin Warning */}
                                        {userRole === "admin" && (
                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                                                <p className="font-bold mb-1">⚠️ You are logged in as Admin</p>
                                                <p className="mb-2 opacity-80">Quote requests cannot be submitted from the admin account. Please sign in as a client.</p>
                                                <a href="/login" className="underline font-semibold hover:text-red-300">Switch Account →</a>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitting || userRole === "admin"}
                                            className="btn-primary w-full mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-[var(--color-navy)] border-t-transparent rounded-full animate-spin" />
                                                    Processing...
                                                </div>
                                            ) : (
                                                "Submit Quote Request"
                                            )}
                                        </button>
                                        <p className="text-xs text-[var(--color-slate)] text-center pb-2">
                                            A PDF quote will be generated for your records.
                                        </p>
                                    </form>

                                    {/* Login Prompt */}
                                    {loginPrompt && (
                                        <div className="mt-4 p-4 rounded-lg bg-[var(--color-warning)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-20 text-sm text-center">
                                            <p className="text-[var(--color-warning)] mb-2 font-medium">This email is already registered.</p>
                                            <Link href="/login" className="btn-primary py-2 text-xs w-full block">
                                                Log in to continue
                                            </Link>
                                        </div>
                                    )}

                                    {/* Success Message */}
                                    {successMessage && (
                                        <div className="mt-4 p-4 rounded-lg bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-20 text-sm text-[var(--color-success)] text-center">
                                            {successMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
