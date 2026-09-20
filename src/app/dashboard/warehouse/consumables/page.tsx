"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Boxes, Plus, Search, AlertTriangle, CheckCircle2, 
    RefreshCw, Filter, ArrowDown, ArrowUp, DollarSign,
    Package, Sparkles, X, Loader2, QrCode, Tag
} from "lucide-react";

interface ConsumableItem {
    id: string;
    partNumber: string;
    name: string;
    category: string;
    stockQuantity: number;
    minStockThreshold: number;
    unitCost: number;
    description: string | null;
    isLowStock?: boolean;
    warehouse?: { name: string } | null;
}

const CATEGORIES = [
    { id: "all", label: "All Supplies" },
    { id: "cables", label: "Tapes & Gaffer" },
    { id: "electrical", label: "Batteries & Power" },
    { id: "optical", label: "Fluids & Fog" },
    { id: "rigging", label: "Rigging Hardware" },
    { id: "mechanical", label: "Fasteners & Ties" },
];

export default function WarehouseConsumablesPage() {
    const [items, setItems] = useState<ConsumableItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // New item form
    const [formPartNumber, setFormPartNumber] = useState("");
    const [formName, setFormName] = useState("");
    const [formCategory, setFormCategory] = useState("cables");
    const [formStock, setFormStock] = useState("20");
    const [formThreshold, setFormThreshold] = useState("5");
    const [formUnitCost, setFormUnitCost] = useState("15");
    const [formDescription, setFormDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/fleet/spare-parts");
            if (res.ok) {
                const data = await res.json();
                setItems(data.parts || []);
            }
        } catch (e) {
            console.error("Failed to load consumables:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Quick quantity adjust (+/-)
    const handleAdjustStock = async (item: ConsumableItem, delta: number) => {
        const newQty = Math.max(0, item.stockQuantity + delta);
        setActionLoadingId(item.id);
        try {
            const res = await fetch("/api/admin/fleet/spare-parts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partNumber: item.partNumber,
                    name: item.name,
                    category: item.category,
                    stockQuantity: newQty,
                    minStockThreshold: item.minStockThreshold,
                    unitCost: item.unitCost,
                    description: item.description,
                })
            });

            if (res.ok) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, stockQuantity: newQty, isLowStock: newQty <= i.minStockThreshold } : i));
                showToast(`Updated ${item.name}: ${newQty} units in stock.`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/fleet/spare-parts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partNumber: formPartNumber.trim().toUpperCase(),
                    name: formName.trim(),
                    category: formCategory,
                    stockQuantity: parseInt(formStock, 10) || 0,
                    minStockThreshold: parseInt(formThreshold, 10) || 5,
                    unitCost: parseFloat(formUnitCost) || 0,
                    description: formDescription.trim(),
                })
            });

            if (res.ok) {
                showToast("✅ Consumable supply registered successfully!");
                setShowAddModal(false);
                setFormPartNumber("");
                setFormName("");
                setFormDescription("");
                fetchItems();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create item.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Filter items
    const filtered = items.filter(item => {
        const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
        const matchesLowStock = !showLowStockOnly || (item.stockQuantity <= item.minStockThreshold);
        const q = search.toLowerCase();
        const matchesSearch = !search || 
            item.name.toLowerCase().includes(q) || 
            item.partNumber.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q);
        return matchesCat && matchesLowStock && matchesSearch;
    });

    const lowStockCount = items.filter(i => i.stockQuantity <= i.minStockThreshold).length;
    const totalUnits = items.reduce((sum, i) => sum + i.stockQuantity, 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-100">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-black px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle2 className="w-4 h-4" />
                    {toastMessage}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-white/[0.08] backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            <Boxes className="w-3.5 h-3.5" />
                            Inventory Supplies
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Bulk Non-Serialized</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
                        Consumables &amp; Bulk Stock Hub
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Track gaffer tape, batteries, fog fluids, safety rigging, and non-serialized production consumables.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={fetchItems}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 transition-colors"
                        title="Refresh Inventory"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--color-gold)] text-black hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Supply Item
                    </button>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Tracked Consumables</div>
                    <div className="text-2xl md:text-3xl font-black text-white font-mono mt-1">{items.length}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Active production SKUs</div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Total Bulk Units On Hand</div>
                    <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono mt-1">{totalUnits}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Available across warehouse bins</div>
                </div>

                <div className={`border rounded-2xl p-4 transition-all ${
                    lowStockCount > 0 ? "bg-red-500/10 border-red-500/30" : "bg-white/[0.02] border-white/[0.08]"
                }`}>
                    <div className="text-[10px] text-slate-400 font-mono uppercase flex items-center justify-between">
                        <span>Low Stock Warnings</span>
                        {lowStockCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
                    </div>
                    <div className={`text-2xl md:text-3xl font-black font-mono mt-1 ${lowStockCount > 0 ? "text-red-400" : "text-slate-400"}`}>
                        {lowStockCount}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Below minimum restock threshold</div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Auto-Decrement Status</div>
                    <div className="text-2xl md:text-3xl font-black text-purple-400 font-mono mt-1">ACTIVE</div>
                    <div className="text-[10px] text-slate-400 mt-1">Decrements on pick list dispatch</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Category Pills */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                categoryFilter === cat.id
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                                    : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Search & Low-stock toggle */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            showLowStockOnly
                                ? "bg-red-500/20 text-red-300 border-red-500/30"
                                : "bg-white/[0.03] text-slate-400 border-white/10"
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Low Stock Only
                    </button>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search supplies..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Consumables Table */}
            <div className="bg-[#05070D] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-mono uppercase text-[10px]">
                            <tr>
                                <th className="p-4">SKU / Item Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-center">Stock Level</th>
                                <th className="p-4 text-center">Min Threshold</th>
                                <th className="p-4 text-right">Unit Cost</th>
                                <th className="p-4 text-center">Quick Adjust</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-500">
                                        <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p>No consumable items found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(item => {
                                    const isLow = item.stockQuantity <= item.minStockThreshold;
                                    const isLoading = actionLoadingId === item.id;

                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white text-sm">{item.name}</div>
                                                <div className="font-mono text-[10px] text-slate-500">{item.partNumber}</div>
                                                {item.description && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-white/[0.04] text-slate-300 border border-white/5">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl border ${
                                                    isLow
                                                        ? "bg-red-500/10 text-red-300 border-red-500/30 animate-pulse"
                                                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                                }`}>
                                                    {item.stockQuantity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-mono text-slate-400">
                                                {item.minStockThreshold}
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-300 font-bold">
                                                QAR {item.unitCost.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleAdjustStock(item, -1)}
                                                        disabled={isLoading || item.stockQuantity <= 0}
                                                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs disabled:opacity-20 transition-colors"
                                                        title="Deduct 1"
                                                    >
                                                        -1
                                                    </button>
                                                    <button
                                                        onClick={() => handleAdjustStock(item, 1)}
                                                        disabled={isLoading}
                                                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                                                        title="Add 1"
                                                    >
                                                        +1
                                                    </button>
                                                    <button
                                                        onClick={() => handleAdjustStock(item, 10)}
                                                        disabled={isLoading}
                                                        className="px-2 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-[10px] transition-colors"
                                                        title="Bulk Add +10"
                                                    >
                                                        +10
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Consumable Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-[#0A0F1C] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Boxes className="w-5 h-5 text-purple-400" />
                                Register New Consumable SKU
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1">SKU / Part Number *</label>
                                    <input
                                        type="text"
                                        value={formPartNumber}
                                        onChange={e => setFormPartNumber(e.target.value.toUpperCase())}
                                        placeholder="e.g. GAFF-BLK-50M"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-purple-500/50 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1">Supply Category</label>
                                    <select
                                        value={formCategory}
                                        onChange={e => setFormCategory(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                                    >
                                        <option value="cables">Tapes &amp; Gaffer</option>
                                        <option value="electrical">Batteries &amp; Power</option>
                                        <option value="optical">Fluids &amp; Fog</option>
                                        <option value="rigging">Rigging Hardware</option>
                                        <option value="mechanical">Fasteners &amp; Ties</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1">Item Title / Description *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. Pro-Gaff Black Cloth Tape 50mm x 50m"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1">Initial Stock</label>
                                    <input
                                        type="number"
                                        value={formStock}
                                        onChange={e => setFormStock(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-purple-500/50 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1">Min Threshold</label>
                                    <input
                                        type="number"
                                        value={formThreshold}
                                        onChange={e => setFormThreshold(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-purple-500/50 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1">Unit Cost (QAR)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formUnitCost}
                                        onChange={e => setFormUnitCost(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-purple-500/50 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1">Notes (Optional)</label>
                                <textarea
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="Supplier details, packaging specs..."
                                    rows={2}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !formPartNumber.trim() || !formName.trim()}
                                    className="px-5 py-2 rounded-xl font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-all"
                                >
                                    {submitting ? "Saving..." : "Save Consumable"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
