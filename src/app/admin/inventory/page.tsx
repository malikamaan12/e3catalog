"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import * as Tooltip from "@radix-ui/react-tooltip";

type Override = {
    id: string;
    productId: string;
    startDate: string;
    endDate: string;
    unitsOffline: number;
    reason: string;
    createdAt: string;
    product: {
        name: string;
    };
};

type ProductOption = {
    id: string;
    name: string;
    totalUnits: number;
    unit: string;
};

type MatrixTimelineDay = {
    date: string;
    available: number;
    booked: number;
    maintenance: number;
    total: number;
};

type MatrixRow = {
    product: {
        id: string;
        name: string;
        totalUnits: number;
        unit: string;
        category: string;
    };
    timeline: MatrixTimelineDay[];
};

export default function InventoryAdminPage() {
    const [activeTab, setActiveTab] = useState<"matrix" | "overrides">("matrix");

    const [overrides, setOverrides] = useState<Override[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Search & Filter State
    const [matrixSearch, setMatrixSearch] = useState("");
    const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [tillDate, setTillDate] = useState(format(new Date(new Date().setDate(new Date().getDate() + 13)), "yyyy-MM-dd"));
    const [overrideSearch, setOverrideSearch] = useState("");
    const [overrideStatusFilter, setOverrideStatusFilter] = useState<"all" | "active" | "upcoming" | "historical">("all");

    // Form State
    const [productId, setProductId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [unitsOffline, setUnitsOffline] = useState("1");
    const [reason, setReason] = useState("");

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch("/api/admin/inventory").then((res) => res.json()),
            fetch("/api/products").then((res) => res.json()),
            fetch(`/api/admin/inventory/matrix?from=${fromDate}&to=${tillDate}`).then((res) => res.json()),
        ]).then(([overridesData, productsData, matrixRes]) => {
            setOverrides(overridesData || []);
            setProducts(productsData || []);
            setMatrixData(matrixRes || []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [fromDate, tillDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!productId || !startDate || !endDate || !unitsOffline || !reason) {
            setError("All fields are required.");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError("End date must be after start date.");
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/admin/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    startDate,
                    endDate,
                    unitsOffline: Number(unitsOffline),
                    reason,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create override");
            }

            const newOverride = await res.json();
            setOverrides([newOverride, ...overrides]);

            // Re-fetch matrix to reflect new manual hold
            const matrixRes = await fetch(`/api/admin/inventory/matrix?from=${fromDate}&to=${tillDate}`).then(r => r.json());
            setMatrixData(matrixRes);

            // Reset form
            setProductId("");
            setStartDate("");
            setEndDate("");
            setUnitsOffline("1");
            setReason("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this override? Units will become available again immediately.")) return;

        try {
            const res = await fetch(`/api/admin/inventory?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setOverrides(overrides.filter((o) => o.id !== id));
                // Re-fetch matrix to reflect removed hold
                const matrixRes = await fetch(`/api/admin/inventory/matrix?from=${fromDate}&to=${tillDate}`).then(r => r.json());
                setMatrixData(matrixRes);
            } else {
                alert("Failed to delete override");
            }
        } catch (err) {
            console.error(err);
            alert("Network error");
        }
    };

    if (loading) {
        return <div className="p-8 text-[var(--color-slate)]">Loading inventory data...</div>;
    }

    // Derived filtered data
    const filteredMatrix = matrixData.filter((row) =>
        row.product.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        row.product.category?.toLowerCase().includes(matrixSearch.toLowerCase())
    );

    const filteredOverrides = overrides.filter((o) => {
        const matchesSearch =
            o.product?.name?.toLowerCase().includes(overrideSearch.toLowerCase()) ||
            o.reason?.toLowerCase().includes(overrideSearch.toLowerCase());
        if (!matchesSearch) return false;

        if (overrideStatusFilter === "all") return true;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = new Date(o.startDate);
        const end = new Date(o.endDate);
        if (overrideStatusFilter === "active") return start <= today && end >= today;
        if (overrideStatusFilter === "upcoming") return start > today;
        if (overrideStatusFilter === "historical") return end < today;
        return true;
    });

    return (
        <Tooltip.Provider delayDuration={200}>
            <div>
                <header className="mb-6">
                    <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)]">
                        Inventory Control
                    </h1>
                    <p className="text-[var(--color-slate)] mt-2">
                        Track upcoming availability or take units offline for maintenance.
                    </p>
                </header>

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-8 gap-6">
                    <button
                        onClick={() => setActiveTab("matrix")}
                        className={`pb-4 text-sm font-semibold transition-colors relative ${activeTab === "matrix" ? "text-[var(--color-gold)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                    >
                        Master Timeline Matrix
                        {activeTab === "matrix" && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-gold)] rounded-t-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("overrides")}
                        className={`pb-4 text-sm font-semibold transition-colors relative ${activeTab === "overrides" ? "text-[var(--color-gold)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                    >
                        Manual Overrides
                        {activeTab === "overrides" && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-gold)] rounded-t-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                        )}
                    </button>
                </div>

                {/* ─── TAB: MASTER MATRIX ─── */}
                {activeTab === "matrix" && (
                    <div className="glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                        {/* Matrix Search Bar */}
                        <div className="p-4 border-b border-white/10 flex gap-3 items-center">
                            <div className="relative flex-1 max-w-sm">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)] shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <input
                                    type="text"
                                    placeholder="Search products by name or category..."
                                    value={matrixSearch}
                                    onChange={(e) => setMatrixSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-4 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-1.5 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-[var(--color-gold)]">From</span>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="bg-transparent text-sm text-[var(--color-warm-white)] focus:outline-none border-none [color-scheme:dark]"
                                    />
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-[var(--color-gold)]">Till</span>
                                    <input
                                        type="date"
                                        value={tillDate}
                                        onChange={(e) => setTillDate(e.target.value)}
                                        className="bg-transparent text-sm text-[var(--color-warm-white)] focus:outline-none border-none [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            <span className="text-xs text-[var(--color-slate)] shrink-0 ml-auto">{filteredMatrix.length} of {matrixData.length} products</span>
                        </div>
                        {filteredMatrix.length === 0 ? (
                            <div className="p-8 text-center text-[var(--color-slate)]">No products match your search.</div>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-max">
                                    <thead>
                                        <tr className="bg-[var(--color-navy-lighter)] shadow-sm">
                                            <th className="sticky left-0 z-20 bg-[var(--color-navy-lighter)] p-4 border-r border-white/5 border-b shadow-[4px_0_12px_rgba(0,0,0,0.1)] min-w-[280px]">
                                                <div className="text-xs font-semibold text-[var(--color-gold)] tracking-wider">PRODUCT</div>
                                            </th>
                                            {/* Date Headers */}
                                            {filteredMatrix[0].timeline.map((day) => (
                                                <th key={`head-${day.date}`} className="p-3 border-r border-white/5 border-b min-w-[60px] text-center whitespace-nowrap">
                                                    <div className="text-[10px] text-[var(--color-slate)] uppercase">{format(parseISO(day.date), "EEE")}</div>
                                                    <div className="text-sm font-medium text-[var(--color-warm-white)]">{format(parseISO(day.date), "dd")}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredMatrix.map((row) => (
                                            <tr key={row.product.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="sticky left-0 z-10 bg-[var(--color-inventory-bg,var(--color-navy))] group-hover:bg-[var(--color-inventory-hover,var(--color-navy-lighter))] p-4 border-r border-white/5 shadow-[4px_0_12px_rgba(0,0,0,0.1)] transition-colors">
                                                    <div className="font-medium text-sm text-[var(--color-warm-white)] truncate w-[240px]" title={row.product.name}>
                                                        {row.product.name}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--color-slate)] mt-0.5">
                                                        Total fleet: {row.product.totalUnits} {row.product.unit}
                                                    </div>
                                                </td>
                                                {/* Matrix Cells */}
                                                {row.timeline.map((day) => {
                                                    // Determine color coding
                                                    const pct = day.available / day.total;
                                                    let bgColor = "bg-[var(--color-navy-lighter)] text-[var(--color-success)]"; // Full/Good stock
                                                    if (day.available === 0) bgColor = "bg-red-500/10 text-red-400 font-bold border-red-500/20"; // Out of stock
                                                    else if (pct <= 0.25) bgColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"; // Low stock

                                                    const hasBlock = day.maintenance > 0;

                                                    return (
                                                        <td key={`${row.product.id}-${day.date}`} className="p-2 border-r border-white/5 text-center">
                                                            <Tooltip.Root>
                                                                <Tooltip.Trigger asChild>
                                                                    <div className={`w-full py-2 px-1 rounded cursor-help transition-all border hover:border-white/20 relative overflow-hidden flex flex-col items-center justify-center min-h-[44px] ${hasBlock ? 'border-red-500/30' : 'border-transparent'} ${bgColor}`}>
                                                                        {hasBlock && (
                                                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #ef4444 4px, #ef4444 8px)' }} />
                                                                        )}
                                                                        {hasBlock && (
                                                                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-bl-sm" />
                                                                        )}
                                                                        <span className="text-sm font-medium relative z-10">{day.available}</span>
                                                                        {hasBlock && (
                                                                            <span className="text-[9px] text-red-400 relative z-10 leading-none mt-0.5 font-bold tracking-wider">-offline-</span>
                                                                        )}
                                                                    </div>
                                                                </Tooltip.Trigger>
                                                                <Tooltip.Portal>
                                                                    <Tooltip.Content
                                                                        className="z-50 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shadow-xl p-3 rounded-lg text-xs animate-in fade-in zoom-in-95"
                                                                        sideOffset={5}
                                                                    >
                                                                        <div className="font-semibold text-[var(--color-warm-white)] mb-2 border-b border-white/10 pb-1 flex justify-between gap-4">
                                                                            <span>{format(parseISO(day.date), "MMM d, yyyy")}</span>
                                                                            <span className="text-[var(--color-slate)] font-normal ml-4">Total: {day.total}</span>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex justify-between gap-4"><span className="text-[var(--color-slate)]">Available</span><span className="text-[var(--color-success)] font-bold">{day.available}</span></div>
                                                                            <div className="flex justify-between gap-4"><span className="text-[var(--color-slate)]">Booked</span><span className="text-[var(--color-gold)] font-medium">{day.booked}</span></div>
                                                                            {day.maintenance > 0 && (
                                                                                <div className="flex justify-between gap-4 pt-1 border-t border-white/5"><span className="text-red-400 font-medium">Blocked/Offline</span><span className="text-red-400 font-bold">{day.maintenance}</span></div>
                                                                            )}
                                                                        </div>
                                                                        <Tooltip.Arrow className="fill-[var(--color-surface)]" />
                                                                    </Tooltip.Content>
                                                                </Tooltip.Portal>
                                                            </Tooltip.Root>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="bg-[var(--color-navy-lighter)] p-4 border-t border-white/10 flex items-center justify-end gap-6 text-xs text-[var(--color-slate)]">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[var(--color-navy)] border border-white/10 text-[var(--color-success)] flex items-center justify-center font-bold">#</span> In Stock</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold">#</span> Low Stock</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500/20 text-red-500 flex items-center justify-center font-bold">0</span> Out of Stock</div>
                        </div>
                    </div>
                )}


                {/* ─── TAB: MANUAL OVERRIDES ─── */}
                {activeTab === "overrides" && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left Col: Create Override Form */}
                        <div className="xl:col-span-1">
                            <form onSubmit={handleSubmit} className="glass rounded-xl p-6 sticky top-24">
                                <h2 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-[var(--color-gold)] mb-6">
                                    Create New Override
                                </h2>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-slate)] mb-1">Product</label>
                                        <select
                                            value={productId}
                                            onChange={(e) => setProductId(e.target.value)}
                                            className="w-full px-4 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)]"
                                        >
                                            <option value="">Select a product...</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (Max {p.totalUnits} {p.unit})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--color-slate)] mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-4 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--color-slate)] mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-4 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-slate)] mb-1">Units Offline</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={unitsOffline}
                                            onChange={(e) => setUnitsOffline(e.target.value)}
                                            className="w-full px-4 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-slate)] mb-1">Reason</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Maintenance, Damaged, Manual Hold"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full px-4 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)]"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full btn-primary mt-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Creating..." : "Take Offline"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Right Col: Active Overrides List */}
                        <div className="xl:col-span-2">
                            <div className="glass rounded-xl overflow-hidden shadow-xl">
                                <div className="p-4 border-b border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-3">
                                    {/* Search */}
                                    <div className="relative flex-1">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                        <input
                                            type="text"
                                            placeholder="Search by product name or reason..."
                                            value={overrideSearch}
                                            onChange={(e) => setOverrideSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                                        />
                                    </div>
                                    {/* Status Filter */}
                                    <div className="flex gap-1.5 shrink-0">
                                        {(["all", "active", "upcoming", "historical"] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setOverrideStatusFilter(s)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${overrideStatusFilter === s
                                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)]"
                                                    : "bg-[var(--color-navy-lighter)] text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs text-[var(--color-slate)] self-center shrink-0">{filteredOverrides.length} result{filteredOverrides.length !== 1 ? "s" : ""}</span>
                                </div>

                                {filteredOverrides.length === 0 ? (
                                    <div className="p-8 text-center text-[var(--color-slate)]">
                                        {overrides.length === 0 ? "No inventory blocks currently active." : "No overrides match your search."}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-[var(--color-navy-lighter)] text-[var(--color-slate)] uppercase text-xs font-semibold">
                                                <tr>
                                                    <th className="px-6 py-4">Product</th>
                                                    <th className="px-6 py-4">Date Range</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                                {filteredOverrides.map((override) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const start = parseISO(override.startDate);
                                                    const end = parseISO(override.endDate);

                                                    // Status logic
                                                    const isPast = end < today;
                                                    const isFuture = start > today;
                                                    const isActive = !isPast && !isFuture;

                                                    return (
                                                        <tr key={override.id} className="hover:bg-white/5 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <p className="font-medium text-[var(--color-warm-white)] truncate max-w-[200px]" title={override.product?.name}>{override.product?.name || "Unknown Product"}</p>
                                                                <p className="text-xs text-[var(--color-gold)] mt-1">{override.unitsOffline} units blocked</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="text-[var(--color-warm-white)] whitespace-nowrap">
                                                                    {format(start, "MMM do")} - {format(end, "MMM do, yyyy")}
                                                                </p>
                                                                <p className="text-xs text-[var(--color-slate)] mt-1 truncate max-w-[150px]">{override.reason}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {isActive && <span className="px-2 py-1 text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">ACTIVE INVENTORY BLOCK</span>}
                                                                {isFuture && <span className="px-2 py-1 text-[10px] font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg">UPCOMING</span>}
                                                                {isPast && <span className="px-2 py-1 text-[10px] font-medium bg-[var(--color-navy-lighter)] text-[var(--color-slate)] border border-white/10 rounded-lg">HISTORICAL</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => handleDelete(override.id)}
                                                                    className="text-xs text-[var(--color-slate)] hover:text-[var(--color-danger)] transition-colors underline"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Tooltip.Provider>
    );
}
