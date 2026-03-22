"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import * as Tooltip from "@radix-ui/react-tooltip";
import { 
    Calendar, List, Search, Lock, Info, 
    CheckCircle2, AlertTriangle, Clock, RefreshCw,
    Plus, Trash2, ChevronRight, X
} from "lucide-react";

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
    pricePerDay: number;
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

export default function VendorInventoryPage() {
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

    // Form State (New Hold)
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [formData, setFormData] = useState({
        productId: "",
        startDate: "",
        endDate: "",
        unitsOffline: "1",
        reason: ""
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [oRes, pRes, mRes] = await Promise.all([
                fetch("/api/admin/inventory"), // Already role-aware: returns vendor's overrides
                fetch("/api/vendor/products"), // Vendor-specific products
                fetch(`/api/admin/inventory/matrix?from=${fromDate}&to=${tillDate}`) // Already role-aware: returns vendor's matrix
            ]);
            
            const oData = await oRes.json();
            const pData = await pRes.json();
            const mData = await mRes.json();

            setOverrides(Array.isArray(oData) ? oData : []);
            setProducts(Array.isArray(pData) ? pData : []);
            setMatrixData(Array.isArray(mData) ? mData : []);
        } catch (err) {
            console.error("Inventory Load Error:", err);
            setError("Failed to synchronize inventory data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fromDate, tillDate]);

    const handleCreateHold = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/admin/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to block units.");
            }

            await fetchData();
            setShowHoldModal(false);
            setFormData({ productId: "", startDate: "", endDate: "", unitsOffline: "1", reason: "" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevokeHold = async (id: string) => {
        if (!confirm("Release these units back into the marketplace?")) return;
        try {
            const res = await fetch(`/api/admin/inventory?id=${id}`, { method: "DELETE" });
            if (res.ok) await fetchData();
        } catch (err) {
            console.error("Revoke error:", err);
        }
    };

    const filteredMatrix = matrixData.filter(row => 
        row.product.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        row.product.category?.toLowerCase().includes(matrixSearch.toLowerCase())
    );

    if (loading && matrixData.length === 0) return <div className="p-12 text-center text-[var(--color-slate)] animate-pulse pt-32">Synchronizing Fleet Matrix...</div>;

    return (
        <Tooltip.Provider delayDuration={200}>
            <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 animate-fade-in text-[var(--color-warm-white)]">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Fleet Availability</h1>
                        <p className="text-[var(--color-slate)] mt-1 font-medium">Real-time booking timeline and maintenance control.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchData}
                            className="p-3 rounded-xl glass border border-white/5 hover:bg-white/5 transition-all text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={() => setShowHoldModal(true)}
                            className="btn-primary flex items-center gap-2 px-6 py-3"
                        >
                            <Lock className="w-5 h-5" />
                            Manual Hold
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-8 gap-8">
                    <button 
                        onClick={() => setActiveTab("matrix")}
                        className={`pb-4 text-sm font-bold transition-all relative ${activeTab === "matrix" ? "text-[var(--color-gold)]" : "text-[var(--color-slate)]"}`}
                    >
                        Timeline Matrix
                        {activeTab === "matrix" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-gold)] shadow-[0_0_10px_rgba(212,175,55,0.4)]" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab("overrides")}
                        className={`pb-4 text-sm font-bold transition-all relative ${activeTab === "overrides" ? "text-[var(--color-gold)]" : "text-[var(--color-slate)]"}`}
                    >
                        Active Controls ({overrides.length})
                        {activeTab === "overrides" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-gold)] shadow-[0_0_10px_rgba(212,175,55,0.4)]" />}
                    </button>
                </div>

                {activeTab === "matrix" ? (
                    <div className="glass rounded-[32px] border border-white/10 overflow-hidden">
                        {/* Matrix Filter Bar */}
                        <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row gap-4 items-center bg-white/[0.02]">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                <input 
                                    type="text"
                                    placeholder="Filter by product or category..."
                                    value={matrixSearch}
                                    onChange={(e) => setMatrixSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-[var(--color-gold)] transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 w-full lg:w-auto">
                                <Calendar className="w-4 h-4 text-[var(--color-gold)]" />
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none [color-scheme:dark]" />
                                <span className="text-[var(--color-slate)] text-xs font-bold px-2">TO</span>
                                <input type="date" value={tillDate} onChange={(e) => setTillDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none [color-scheme:dark]" />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-white/[0.03]">
                                        <th className="sticky left-0 z-20 bg-[var(--color-surface)] p-6 border-r border-white/10 border-b min-w-[300px] shadow-xl">
                                            <span className="text-xs font-black text-[var(--color-gold)] uppercase tracking-widest">Marketplace Item</span>
                                        </th>
                                        {filteredMatrix[0]?.timeline.map(day => (
                                            <th key={day.date} className="p-4 border-r border-white/5 border-b text-center min-w-[70px]">
                                                <div className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-tighter opacity-60">{format(parseISO(day.date), "EEE")}</div>
                                                <div className="text-sm font-black text-[var(--color-warm-white)]">{format(parseISO(day.date), "dd")}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredMatrix.map(row => (
                                        <tr key={row.product.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="sticky left-0 z-10 bg-[var(--color-surface)] group-hover:bg-[#1a1c2a] p-6 border-r border-white/10 shadow-xl transition-colors">
                                                <div className="font-bold text-sm truncate max-w-[240px]">{row.product.name}</div>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[9px] font-black py-0.5 px-1.5 rounded bg-white/5 border border-white/10 text-[var(--color-slate)] uppercase tracking-widest leading-none">
                                                        {row.product.category}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--color-slate)] font-medium">
                                                        Fleet: {row.product.totalUnits} {row.product.unit}s
                                                    </span>
                                                </div>
                                            </td>
                                            {row.timeline.map(day => {
                                                const occupancy = ((day.total - day.available) / day.total) * 100;
                                                const isFull = day.available === 0;
                                                const isLow = !isFull && occupancy > 75;
                                                const hasOffline = day.maintenance > 0;

                                                return (
                                                    <td key={day.date} className="p-2 border-r border-white/5 text-center">
                                                        <Tooltip.Root>
                                                            <Tooltip.Trigger asChild>
                                                                <div className={`
                                                                    flex flex-col items-center justify-center h-12 w-full rounded-xl border transition-all cursor-help relative overflow-hidden
                                                                    ${isFull ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                                                                      isLow ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
                                                                      'bg-white/[0.02] border-white/5 text-emerald-400'}
                                                                `}>
                                                                    {hasOffline && (
                                                                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #ff4d4d 4px, #ff4d4d 8px)' }} />
                                                                    )}
                                                                    <span className="text-sm font-black relative z-10">{day.available}</span>
                                                                    {hasOffline && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                                                                </div>
                                                            </Tooltip.Trigger>
                                                            <Tooltip.Portal>
                                                                <Tooltip.Content className="z-[150] glass p-4 rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95" sideOffset={8}>
                                                                    <div className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest mb-2 border-b border-white/5 pb-1">
                                                                        {format(parseISO(day.date), "MMMM do, yyyy")}
                                                                    </div>
                                                                    <div className="space-y-2 min-w-[140px]">
                                                                        <div className="flex justify-between items-center"><span className="text-xs text-[var(--color-slate)]">Market Ready</span><span className="text-xs font-bold text-emerald-400">{day.available}</span></div>
                                                                        <div className="flex justify-between items-center"><span className="text-xs text-[var(--color-slate)]">Active Rentals</span><span className="text-xs font-bold text-[var(--color-gold)]">{day.booked}</span></div>
                                                                        {day.maintenance > 0 && (
                                                                            <div className="flex justify-between items-center pt-1 border-t border-white/5"><span className="text-xs text-red-400">Manual Holds</span><span className="text-xs font-bold text-red-500">{day.maintenance}</span></div>
                                                                        )}
                                                                    </div>
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
                    </div>
                ) : (
                    /* Active Overrides Tab */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {overrides.length === 0 ? (
                                <div className="p-12 text-center glass rounded-[32px] border border-dashed border-white/10">
                                    <Clock className="w-10 h-10 text-[var(--color-slate)]/40 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold">No active holds</h3>
                                    <p className="text-sm text-[var(--color-slate)]">All your marketplace units are currently live.</p>
                                </div>
                            ) : (
                                overrides.map(o => (
                                    <div key={o.id} className="glass p-6 rounded-3xl border border-white/10 flex items-center justify-between group hover:border-[var(--color-gold)]/20 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-red-400 border border-red-500/20">
                                                <AlertTriangle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[var(--color-warm-white)]">{o.product?.name}</h4>
                                                <p className="text-xs text-[var(--color-slate)] flex items-center gap-2 mt-0.5">
                                                    <span className="text-red-400 font-black">{o.unitsOffline} units blocked</span>
                                                    <span>•</span>
                                                    <span>{format(parseISO(o.startDate), "MMM do")} - {format(parseISO(o.endDate), "MMM do, yyyy")}</span>
                                                </p>
                                                <p className="text-[10px] font-medium text-[var(--color-slate)] mt-2 italic opacity-60">" {o.reason} "</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRevokeHold(o.id)}
                                            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all border border-red-500/10"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="lg:col-span-1">
                            <div className="glass p-6 rounded-[32px] border border-white/10 sticky top-24">
                                <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-[var(--color-gold)]">
                                    <Info className="w-5 h-5" />
                                    Inventory Hygiene
                                </h3>
                                <div className="space-y-4 text-xs text-[var(--color-slate)] leading-relaxed">
                                    <p>Manual holds remove units from the marketplace immediately. Use this for damaged equipment or external bookings.</p>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                        <div className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> <span>Units are automatically blocked if they overlap with your manually created holds.</span></div>
                                        <div className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> <span>Admins can see these blocks in the Master Operations view.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hold Modal */}
                {showHoldModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-lg bg-[var(--color-surface)] border border-white/10 rounded-[32px] shadow-2xl animate-slide-up">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black">Manual Availability Hold</h2>
                                    <p className="text-xs text-[var(--color-slate)]">Taking units offline for maintenance or repair.</p>
                                </div>
                                <button onClick={() => setShowHoldModal(false)} className="p-2 rounded-full hover:bg-white/5"><X className="w-6 h-6 text-[var(--color-slate)]" /></button>
                            </div>
                            
                            <form onSubmit={handleCreateHold} className="p-8 space-y-6">
                                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl">{error}</div>}
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">Equipment Item</label>
                                    <select 
                                        required
                                        value={formData.productId}
                                        onChange={(e) => setFormData({...formData, productId: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none"
                                    >
                                        <option value="" className="bg-navy">Select Asset...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id} className="bg-navy">{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">Start Date</label>
                                        <input required type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">End Date</label>
                                        <input required type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm [color-scheme:dark]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">Unit Count</label>
                                        <input required type="number" min="1" value={formData.unitsOffline} onChange={(e) => setFormData({...formData, unitsOffline: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">Reason</label>
                                        <input required type="text" placeholder="e.g. Broken Cable" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm" />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-4 disabled:opacity-50">
                                    {isSubmitting ? "Processing..." : "Confirm Hold"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Tooltip.Provider>
    );
}
