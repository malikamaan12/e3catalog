"use client";

import React, { useState, useEffect } from "react";
import {
    Warehouse, Plus, Trash2, Edit3, MapPin, Star, X, Package,
    CheckCircle2, AlertTriangle
} from "lucide-react";

interface WarehouseData {
    id: string;
    vendorId: string;
    name: string;
    address: string | null;
    city: string | null;
    isDefault: boolean;
    unitCount: number;
    createdAt: string;
}

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState<"add" | "edit" | null>(null);
    const [editTarget, setEditTarget] = useState<WarehouseData | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string>("");

    const fetchWarehouses = async (vId?: string) => {
        try {
            const url = vId ? `/api/dashboard/warehouses?vendorId=${vId}` : "/api/dashboard/warehouses";
            const res = await fetch(url);
            if (res.ok) setWarehouses(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        // Check if admin
        try {
            const userRes = await fetch("/api/auth/me");
            if (userRes.ok) {
                const user = await userRes.json();
                const isSystemAdmin = ["admin", "super_admin"].includes(user.role);
                setIsAdmin(isSystemAdmin);
                
                if (isSystemAdmin) {
                    const vendorRes = await fetch("/api/admin/vendors");
                    if (vendorRes.ok) setVendors(await vendorRes.json());
                }
            }
        } catch (e) { console.error(e); }
        await fetchWarehouses();
    };

    useEffect(() => { fetchInitialData(); }, []);

    const handleVendorFilterChange = (vId: string) => {
        setSelectedVendorId(vId);
        fetchWarehouses(vId);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this warehouse?")) return;
        const res = await fetch(`/api/dashboard/warehouses/${id}`, { method: "DELETE" });
        if (res.ok) {
            setToast("Warehouse deleted.");
            fetchWarehouses();
        } else {
            const data = await res.json();
            alert(data.error || "Failed to delete.");
        }
    };

    const handleSetDefault = async (id: string) => {
        const res = await fetch(`/api/dashboard/warehouses/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDefault: true }),
        });
        if (res.ok) {
            setToast("Default warehouse updated.");
            fetchWarehouses();
        }
    };

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    return (
        <div className="min-h-screen animate-fade-up">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-black text-[var(--color-warm-white)] tracking-tight">
                            Warehouse Management
                        </h1>
                        <p className="text-[var(--color-slate)] mt-2 font-medium">
                            Manage your storage locations, zones, and shelf layouts.
                        </p>
                    </div>
                    <button 
                        onClick={() => { setEditTarget(null); setShowModal("add"); }}
                        className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-bold text-sm hover:translate-y-[-2px] transition-all shadow-lg shadow-gold/10 flex items-center gap-2 group shrink-0"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add Warehouse
                    </button>
                </header>

                {/* Toast */}
                {toast && (
                    <div className="fixed top-6 right-6 z-50 px-6 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-bold flex items-center gap-2 animate-fade-up shadow-2xl backdrop-blur-md">
                        <CheckCircle2 className="w-4 h-4" /> {toast}
                    </div>
                )}

                {/* Filters / Context */}
                {isAdmin && (
                    <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10"><Plus className="w-5 h-5 text-blue-400" /></div>
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Admin Control</p>
                                <p className="text-sm font-bold text-white">Filter by Vendor Context</p>
                            </div>
                        </div>
                        <select 
                            value={selectedVendorId} 
                            onChange={(e) => handleVendorFilterChange(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[var(--color-gold)] min-w-[200px]"
                        >
                            <option value="">All Warehouses</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                        </select>
                    </div>
                )}

                {/* Warehouse Grid */}
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-[var(--color-gold)] border-t-transparent rounded-full mx-auto animate-spin mb-4" />
                        <p className="text-[var(--color-slate)] text-sm">Loading warehouses...</p>
                    </div>
                ) : warehouses.length === 0 ? (
                    <div className="py-20 text-center glass border border-dashed border-white/10 rounded-3xl">
                        <Warehouse className="h-10 w-10 text-[var(--color-slate)]/40 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">No warehouses yet</h3>
                        <p className="text-[var(--color-slate)] text-sm mb-6 max-w-xs mx-auto">
                            {isAdmin ? "Select a vendor or create your first warehouse to get started." : "Create your first warehouse to start organizing your inventory by location and shelf."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {warehouses.map(w => (
                            <div 
                                key={w.id}
                                className={`relative p-6 rounded-3xl border transition-all group hover:border-[var(--color-gold)]/30 hover:bg-white/[0.04] ${
                                    w.isDefault ? 'bg-[var(--color-gold)]/5 border-[var(--color-gold)]/20' : 'bg-white/[0.02] border-white/5'
                                }`}
                            >
                                {/* Default Badge */}
                                {w.isDefault && (
                                    <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 text-[var(--color-gold)] text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <Star className="w-3 h-3" /> Default
                                    </div>
                                )}

                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-[var(--color-gold)]/10 transition-colors">
                                    <Warehouse className="w-6 h-6 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] transition-colors" />
                                </div>

                                <h3 className="text-lg font-black text-[var(--color-warm-white)] mb-1">{w.name}</h3>
                                {w.address && (
                                    <p className="text-xs text-[var(--color-slate)] flex items-center gap-1 mb-1">
                                        <MapPin className="w-3 h-3" /> {w.address}
                                    </p>
                                )}
                                {w.city && <p className="text-xs text-[var(--color-slate)] mb-3">{w.city}</p>}

                                <div className="flex items-center gap-2 mt-4 mb-6">
                                    <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1">
                                        <Package className="w-3 h-3" /> {w.unitCount} Units
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {!w.isDefault && (
                                        <button onClick={() => handleSetDefault(w.id)} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest hover:bg-white/10 transition-all">
                                            Set Default
                                        </button>
                                    )}
                                    <button onClick={() => { setEditTarget(w); setShowModal("edit"); }} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                                        <Edit3 className="w-3 h-3" /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(w.id)} className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/10 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <WarehouseModal 
                        mode={showModal}
                        warehouse={editTarget}
                        isAdmin={isAdmin}
                        vendors={vendors}
                        onClose={() => { setShowModal(null); setEditTarget(null); }}
                        onSuccess={() => { setShowModal(null); setEditTarget(null); setToast(showModal === "add" ? "Warehouse created." : "Warehouse updated."); fetchWarehouses(selectedVendorId); }}
                    />
                )}
            </main>
        </div>
    );
}

// ─── Add/Edit Modal ───
function WarehouseModal({ mode, warehouse, isAdmin, vendors, onClose, onSuccess }: { mode: "add" | "edit", warehouse: WarehouseData | null, isAdmin: boolean, vendors: any[], onClose: () => void, onSuccess: () => void }) {
    const [name, setName] = useState(warehouse?.name || "");
    const [address, setAddress] = useState(warehouse?.address || "");
    const [city, setCity] = useState(warehouse?.city || "");
    const [targetVendorId, setTargetVendorId] = useState(warehouse?.vendorId || "");
    const [isDefault, setIsDefault] = useState(warehouse?.isDefault || false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (!name.trim()) { setError("Name is required"); return; }
        setSaving(true);
        setError(null);
        try {
            const url = mode === "add" ? "/api/dashboard/warehouses" : `/api/dashboard/warehouses/${warehouse!.id}`;
            const res = await fetch(url, {
                method: mode === "add" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, address, city, isDefault, targetVendorId }),
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                setError(data.error || "Operation failed.");
            }
        } catch (e) {
            setError("Network error.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg bg-[var(--color-navy)] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-black text-[var(--color-warm-white)]">
                        {mode === "add" ? "New Warehouse" : "Edit Warehouse"}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-[var(--color-slate)]" />
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    {isAdmin && mode === "add" && (
                        <div>
                            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Assign to Vendor *</label>
                            <select value={targetVendorId} onChange={e => setTargetVendorId(e.target.value)}
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-sm text-[var(--color-warm-white)] outline-none focus:border-blue-500 transition-all">
                                <option value="">Select Vendor</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">Warehouse Name *</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-sm text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)] transition-all"
                            placeholder="e.g. Main Warehouse, Industrial City Store" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">Address</label>
                        <input value={address} onChange={e => setAddress(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-sm text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)] transition-all"
                            placeholder="e.g. Street 42, Industrial Area" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">City</label>
                        <input value={city} onChange={e => setCity(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-sm text-[var(--color-warm-white)] outline-none focus:border-[var(--color-gold)] transition-all"
                            placeholder="e.g. Doha, Abu Dhabi" />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                        <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                            className="w-4 h-4 rounded accent-[var(--color-gold)]" />
                        <label className="text-xs font-bold text-[var(--color-warm-white)]">Set as default warehouse</label>
                    </div>
                </div>

                <button onClick={submit} disabled={saving}
                    className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-bold text-sm hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-gold/10">
                    {saving ? "Saving..." : mode === "add" ? "Create Warehouse" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
