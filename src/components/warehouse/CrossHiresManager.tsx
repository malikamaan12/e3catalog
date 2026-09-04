"use client";

import React, { useState, useEffect } from "react";
import { 
    GitFork, 
    ArrowRightLeft, 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    Building2, 
    Plus, 
    Search, 
    ExternalLink, 
    PackageCheck,
    Truck,
    RotateCcw,
    X,
    Loader2
} from "lucide-react";
import { format } from "date-fns";

interface CrossHireOrder {
    id: string;
    orderNumber: string;
    supplierName: string;
    supplierContact?: string | null;
    unitsRequested: number;
    periodStart: string;
    periodEnd: string;
    supplierDailyRate: number;
    clientDailyRate: number;
    totalSupplierCost: number;
    totalClientRevenue: number;
    profitMargin: number;
    status: "requested" | "confirmed" | "received" | "deployed" | "returned" | "cancelled";
    product?: {
        id: string;
        name: string;
        sku?: string;
    };
    booking?: {
        id: string;
        projectName?: string;
    };
}

export function CrossHiresManager() {
    const [orders, setOrders] = useState<CrossHireOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form states
    const [productsList, setProductsList] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [supplierContact, setSupplierContact] = useState("");
    const [unitsRequested, setUnitsRequested] = useState(2);
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [supplierRate, setSupplierRate] = useState(350);
    const [clientRate, setClientRate] = useState(600);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/cross-hires");
            const data = await res.json();
            if (data.orders) setOrders(data.orders);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            if (data.products) {
                setProductsList(data.products);
                if (data.products.length > 0 && !selectedProductId) {
                    setSelectedProductId(data.products[0].id);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();

        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 5);
        setPeriodStart(today.toISOString().split("T")[0]);
        setPeriodEnd(nextWeek.toISOString().split("T")[0]);
    }, []);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("/api/admin/cross-hires", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProductId,
                    supplierName,
                    supplierContact,
                    unitsRequested,
                    periodStart,
                    periodEnd,
                    supplierDailyRate: supplierRate,
                    clientDailyRate: clientRate,
                    notes,
                })
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                fetchOrders();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleTransition = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/cross-hires/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchOrders();
        } catch (e) {
            console.error(e);
        }
    };

    const filtered = orders.filter(o => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return o.orderNumber.toLowerCase().includes(q) ||
                   o.supplierName.toLowerCase().includes(q) ||
                   (o.product?.name && o.product.name.toLowerCase().includes(q));
        }
        return true;
    });

    const stats = {
        totalOrders: orders.length,
        totalSupplierCost: orders.reduce((s, o) => s + (o.totalSupplierCost || 0), 0),
        totalClientRevenue: orders.reduce((s, o) => s + (o.totalClientRevenue || 0), 0),
        netMargin: orders.reduce((s, o) => s + (o.profitMargin || 0), 0),
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 rounded-3xl glass border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Total Cross-Hires</p>
                    <p className="text-3xl font-black text-white">{stats.totalOrders}</p>
                    <p className="text-[10px] text-[var(--color-gold)] font-bold mt-1">B2B Sourced Fleet Units</p>
                </div>
                <div className="p-6 rounded-3xl glass border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Supplier Spend</p>
                    <p className="text-3xl font-black text-rose-400">QAR {stats.totalSupplierCost.toLocaleString()}</p>
                    <p className="text-[10px] text-[var(--color-slate)] font-bold mt-1">External provider cost</p>
                </div>
                <div className="p-6 rounded-3xl glass border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Client Revenue</p>
                    <p className="text-3xl font-black text-emerald-400">QAR {stats.totalClientRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-[var(--color-slate)] font-bold mt-1">Total billable value</p>
                </div>
                <div className="p-6 rounded-3xl glass border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1">Net Arbitrage Margin</p>
                    <p className="text-3xl font-black text-[var(--color-gold)]">QAR {stats.netMargin.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-400 font-bold mt-1">Gross profit spread</p>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input 
                            type="search"
                            placeholder="Search cross-hire # or supplier..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-[var(--color-gold)] outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-white focus:border-[var(--color-gold)] outline-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="requested">Requested</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="received">Received at Dock</option>
                        <option value="deployed">Deployed</option>
                        <option value="returned">Returned to Supplier</option>
                    </select>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20"
                >
                    <Plus className="w-4 h-4" />
                    New Cross-Hire Order
                </button>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="py-24 text-center glass rounded-3xl border border-dashed border-white/10">
                    <ArrowRightLeft className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white">No Cross-Hire Orders Found</h3>
                    <p className="text-xs text-[var(--color-slate)] max-w-sm mx-auto mt-1">
                        Source external inventory from peer partners when demand exceeds warehouse fleet capacity.
                    </p>
                </div>
            ) : (
                <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">
                                    <th className="px-6 py-4 text-left">PO #</th>
                                    <th className="px-6 py-4 text-left">Peer Supplier</th>
                                    <th className="px-6 py-4 text-left">Equipment SKU</th>
                                    <th className="px-6 py-4 text-left">Dates</th>
                                    <th className="px-6 py-4 text-right">Cost (Out)</th>
                                    <th className="px-6 py-4 text-right">Revenue (In)</th>
                                    <th className="px-6 py-4 text-right">Spread Margin</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Lifecycle Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                                {filtered.map((o) => (
                                    <tr key={o.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4 font-bold text-[var(--color-gold)]">
                                            {o.orderNumber}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white">{o.supplierName}</span>
                                                <span className="text-[10px] text-[var(--color-slate)]">{o.supplierContact || "Verified Peer"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white">{o.product?.name}</span>
                                                <span className="text-[10px] text-[var(--color-slate)]">{o.unitsRequested} units</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--color-slate)]">
                                            {format(new Date(o.periodStart), "MMM d")} - {format(new Date(o.periodEnd), "MMM d")}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-rose-400">
                                            QAR {o.totalSupplierCost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                            QAR {o.totalClientRevenue.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-[var(--color-gold)]">
                                            +QAR {o.profitMargin.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={o.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {o.status === "requested" && (
                                                    <button 
                                                        onClick={() => handleTransition(o.id, "confirmed")}
                                                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 hover:bg-blue-500/20"
                                                    >
                                                        Confirm PO
                                                    </button>
                                                )}
                                                {o.status === "confirmed" && (
                                                    <button 
                                                        onClick={() => handleTransition(o.id, "received")}
                                                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 hover:bg-amber-500/20"
                                                    >
                                                        Receive at Dock
                                                    </button>
                                                )}
                                                {o.status === "received" && (
                                                    <button 
                                                        onClick={() => handleTransition(o.id, "deployed")}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20"
                                                    >
                                                        Deploy to Client
                                                    </button>
                                                )}
                                                {o.status === "deployed" && (
                                                    <button 
                                                        onClick={() => handleTransition(o.id, "returned")}
                                                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20 hover:bg-purple-500/20"
                                                    >
                                                        Return to Supplier
                                                    </button>
                                                )}
                                                {o.status === "returned" && (
                                                    <span className="text-emerald-400 font-bold text-[10px]">Settled & Returned</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Create Cross-Hire Order */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass bg-[var(--color-navy)] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
                        <button 
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--color-slate)] hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-black text-white flex items-center gap-2 mb-2 font-[family-name:var(--font-heading)]">
                            <ArrowRightLeft className="w-5 h-5 text-[var(--color-gold)]" />
                            Create B2B Sub-Rental Purchase Order
                        </h3>
                        <p className="text-xs text-[var(--color-slate)] mb-6">
                            Cross-rent gear from partner suppliers in Qatar to satisfy peak project demand without stock deficits.
                        </p>

                        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                    Equipment SKU Needed
                                </label>
                                <select 
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-[var(--color-gold)]"
                                    required
                                >
                                    {productsList.map(p => (
                                        <option key={p.id} value={p.id} className="bg-[var(--color-navy)]">
                                            {p.name} (Daily Rate: QAR {p.pricePerDay})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Supplier / Partner Name
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Qatar AV Sound Co."
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-white outline-none focus:border-[var(--color-gold)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Units Requested
                                    </label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={unitsRequested}
                                        onChange={(e) => setUnitsRequested(parseInt(e.target.value, 10) || 1)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-white outline-none focus:border-[var(--color-gold)]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Period Start
                                    </label>
                                    <input 
                                        type="date"
                                        value={periodStart}
                                        onChange={(e) => setPeriodStart(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-white outline-none focus:border-[var(--color-gold)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] mb-1.5">
                                        Period End
                                    </label>
                                    <input 
                                        type="date"
                                        value={periodEnd}
                                        onChange={(e) => setPeriodEnd(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-white outline-none focus:border-[var(--color-gold)]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1.5">
                                        Supplier Cost / Unit / Day (QAR)
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={supplierRate}
                                        onChange={(e) => setSupplierRate(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-white outline-none focus:border-rose-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1.5">
                                        Client Billable / Unit / Day (QAR)
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={clientRate}
                                        onChange={(e) => setClientRate(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-2.5 px-4 text-white outline-none focus:border-emerald-400"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-[var(--color-slate)] hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20 disabled:opacity-50"
                                >
                                    {submitting ? "Issuing PO..." : "Issue Cross-Hire PO"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: CrossHireOrder["status"] }) {
    const config = {
        requested: { label: "Requested", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
        confirmed: { label: "Confirmed", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
        received: { label: "Received at Dock", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
        deployed: { label: "Deployed on Site", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
        returned: { label: "Returned to Partner", color: "text-purple-400 bg-purple-400/10 border-purple-400/20 font-bold" },
        cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20" },
    }[status] || { label: status, color: "text-slate-400 bg-slate-400/10 border-slate-400/20" };

    return (
        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.color}`}>
            {config.label}
        </span>
    );
}

export default CrossHiresManager;
