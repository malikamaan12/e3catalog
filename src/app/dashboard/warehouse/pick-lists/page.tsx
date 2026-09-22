"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
    CheckSquare, 
    Plus, 
    Search, 
    Layers, 
    Package, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    RefreshCw, 
    ArrowRight, 
    Truck, 
    ShieldCheck, 
    X,
    Calendar,
    User,
    ChevronRight,
    MapPin,
    ArrowUpRight
} from "lucide-react";
import { playScannerBeep, playClickBeep, playCrossDockChime } from "@/lib/warehouse-audio";

interface PickList {
    id: string;
    pickNumber: string;
    bookingId: string;
    warehouseId: string | null;
    warehouse: { name: string } | null;
    stagingBay: string | null;
    status: "pending" | "picking" | "packed" | "staged" | "loaded" | "dispatched";
    assignedPicker: { name: string; email: string } | null;
    packedAt: string | null;
    stagedAt: string | null;
    notes: string | null;
    createdAt: string;
    booking: {
        id: string;
        customerName: string;
        customerEmail: string;
        startDate: string;
        endDate: string;
        status: string;
        projectName: string | null;
    } | null;
    items: Array<{
        id: string;
        product: { id: string; name: string; itemCode: string; thumbnailUrl: string | null };
        inventoryUnit: { id: string; assetTagCode: string; conditionStatus: string; shelfLocation: string | null } | null;
        requiredQty: number;
        pickedQty: number;
        isAccessory: boolean;
        accessoryName: string | null;
        isVerified: boolean;
    }>;
}

const STATUS_FILTERS = [
    { key: "all", label: "All Waves" },
    { key: "pending", label: "Ready to Pick" },
    { key: "picking", label: "In Picking" },
    { key: "packed", label: "Packed" },
    { key: "staged", label: "Staged" },
];

export default function WarehousePickListsPage() {
    const [pickLists, setPickLists] = useState<PickList[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedList, setSelectedList] = useState<PickList | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Create Pick List Form
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [stagingBay, setStagingBay] = useState("Bay 01 - Dispatch Gate A");

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [plRes, bkRes] = await Promise.all([
                fetch(`/api/dashboard/warehouse/pick-lists${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
                fetch("/api/bookings")
            ]);

            if (plRes.ok) {
                const plData = await plRes.json();
                setPickLists(plData.pickLists || []);
                if (plData.pickLists?.length > 0 && !selectedList) {
                    setSelectedList(plData.pickLists[0]);
                } else if (selectedList) {
                    const updated = plData.pickLists?.find((p: PickList) => p.id === selectedList.id);
                    if (updated) setSelectedList(updated);
                }
            }

            if (bkRes.ok) {
                const bkData = await bkRes.json();
                const list = Array.isArray(bkData) ? bkData : (bkData.bookings || []);
                setBookings(list);
                if (list.length > 0 && !selectedBookingId) {
                    setSelectedBookingId(list[0].id);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const handleCreatePickList = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch("/api/dashboard/warehouse/pick-lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: selectedBookingId,
                    stagingBay,
                })
            });

            if (res.ok) {
                playCrossDockChime();
                showToast("✅ Pick list generated successfully!");
                setShowCreateModal(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create pick list.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleItemVerified = async (itemId: string, currentVerified: boolean) => {
        if (!selectedList) return;
        const newVerified = !currentVerified;

        if (newVerified) {
            playScannerBeep();
        } else {
            playClickBeep();
        }

        // Optimistic UI update
        setSelectedList({
            ...selectedList,
            items: selectedList.items.map(i => i.id === itemId ? { ...i, isVerified: newVerified } : i)
        });

        try {
            await fetch(`/api/dashboard/warehouse/pick-lists/${selectedList.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemUpdates: [{ id: itemId, isVerified: newVerified }]
                })
            });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateStatus = async (nextStatus: "packed" | "staged" | "loaded" | "dispatched") => {
        if (!selectedList) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/dashboard/warehouse/pick-lists/${selectedList.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus, stagingBay })
            });

            if (res.ok) {
                playScannerBeep();
                showToast(`✅ Pick List status updated to ${nextStatus.toUpperCase()}`);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update status.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-100">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-semibold border border-emerald-400/30 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle2 className="w-5 h-5" />
                    {toastMessage}
                </div>
            )}

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <CheckSquare className="w-6 h-6 text-amber-400" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">Wave Picking &amp; Staging Bays</h1>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Pick event orders, verify accessories, illuminate shelf locations on 3D floor map, and lock to dock bays.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Link
                        href="/dashboard/warehouse/map"
                        onClick={() => playClickBeep()}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
                    >
                        <MapPin className="w-4 h-4 text-amber-400" />
                        Open 3D Floor Map
                    </Link>

                    <button
                        onClick={() => {
                            playClickBeep();
                            setShowCreateModal(true);
                        }}
                        className="flex items-center gap-1.5 bg-[var(--color-gold)] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Generate Wave List
                    </button>
                </div>
            </div>

            {/* Main Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Pick Lists Queue */}
                <div className="lg:col-span-5 space-y-3">
                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                        {STATUS_FILTERS.map(f => {
                            const active = statusFilter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => {
                                        playClickBeep();
                                        setStatusFilter(f.key);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                        active
                                            ? "bg-[var(--color-gold)] text-black font-black"
                                            : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                        <span>Active Waves ({pickLists.length})</span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                            <span>Loading pick lists...</span>
                        </div>
                    ) : pickLists.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                            No pick lists matching filter.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1 custom-scrollbar">
                            {pickLists.map(pl => {
                                const active = selectedList?.id === pl.id;
                                const verifiedCount = pl.items.filter(i => i.isVerified).length;
                                const totalCount = pl.items.length;
                                const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

                                return (
                                    <div
                                        key={pl.id}
                                        onClick={() => {
                                            playClickBeep();
                                            setSelectedList(pl);
                                        }}
                                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                                            active
                                                ? "bg-slate-800 border-amber-400/80 ring-1 ring-amber-400/30"
                                                : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="font-mono text-xs font-black text-white">{pl.pickNumber}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                {pl.status}
                                            </span>
                                        </div>

                                        <div className="text-sm font-bold text-slate-200 truncate">
                                            {pl.booking?.projectName || pl.booking?.customerName || "Event Booking"}
                                        </div>

                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                            <span className="font-mono text-[11px] text-amber-300">📍 {pl.stagingBay || "Unassigned Bay"}</span>
                                            <span>📦 {totalCount} Items</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3">
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        pct === 100 ? "bg-emerald-500" : "bg-amber-400"
                                                    }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-slate-300 shrink-0">
                                                {verifiedCount}/{totalCount} ({pct}%)
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Selected Pick List Detail & Checklist */}
                <div className="lg:col-span-7">
                    {selectedList ? (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
                            {/* Detail Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-black text-white">{selectedList.pickNumber}</span>
                                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            {selectedList.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Booking: <span className="text-slate-200 font-semibold">{selectedList.booking?.projectName || selectedList.booking?.customerName}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-slate-500">Staging Bay Location</div>
                                    <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
                                        {selectedList.stagingBay || "Dock Bay 01"}
                                    </div>
                                </div>
                            </div>

                            {/* Equipment & Accessories Checklist */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Picking &amp; Accessory Checklist ({selectedList.items.filter(i => i.isVerified).length}/{selectedList.items.length} verified)
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">Tap item to verify</span>
                                </div>

                                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                    {selectedList.items.map(itm => (
                                        <div
                                            key={itm.id}
                                            onClick={() => handleToggleItemVerified(itm.id, itm.isVerified)}
                                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                                itm.isVerified
                                                    ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                                                    : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                                                    itm.isVerified ? "bg-emerald-500 border-emerald-400 text-slate-950" : "border-slate-600 bg-slate-800"
                                                }`}>
                                                    {itm.isVerified && <CheckCircle2 className="w-4 h-4" />}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">
                                                        {itm.isAccessory ? `🔌 ${itm.accessoryName}` : `📦 ${itm.product?.name}`}
                                                    </div>
                                                    
                                                    {/* Floor & Shelf Location Prominent Badges */}
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                                                            📍 {itm.inventoryUnit?.shelfLocation || "Main Staging Deck"}
                                                        </span>
                                                        {itm.inventoryUnit?.assetTagCode && (
                                                            <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                                                                Tag: {itm.inventoryUnit.assetTagCode}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-500">
                                                            Qty: {itm.requiredQty}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Direct Link to Floor Map Digital Twin */}
                                                <Link
                                                    href={`/dashboard/warehouse/map?locate=${encodeURIComponent(itm.inventoryUnit?.assetTagCode || itm.inventoryUnit?.shelfLocation || itm.product?.name || "")}`}
                                                    target="_blank"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playClickBeep();
                                                    }}
                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-bold text-amber-400 border border-amber-500/20 transition-all"
                                                    title="Illuminate rack location on 3D floor map"
                                                >
                                                    <MapPin className="w-3 h-3" />
                                                    <span>Map</span>
                                                    <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                                                </Link>

                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                                                    itm.isVerified ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                                                }`}>
                                                    {itm.isVerified ? "Verified" : "Pending"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow Stage Transitions */}
                            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            playClickBeep();
                                            window.print();
                                        }}
                                        className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800"
                                    >
                                        Print Pick Slip
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedList.status === "picking" && (
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleUpdateStatus("packed")}
                                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                                        >
                                            Mark as Packed
                                        </button>
                                    )}

                                    {selectedList.status === "packed" && (
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleUpdateStatus("staged")}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                                        >
                                            Lock to Staging Bay
                                        </button>
                                    )}

                                    {selectedList.status === "staged" && (
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleUpdateStatus("loaded")}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                                        >
                                            Ready for Truck Loading
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                            Select a pick list on the left to review items.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Generate Pick List */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-amber-400" />
                                <h3 className="text-lg font-bold text-white">Generate Event Pick List</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    playClickBeep();
                                    setShowCreateModal(false);
                                }} 
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePickList} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Event Booking</label>
                                <select
                                    required
                                    value={selectedBookingId}
                                    onChange={(e) => setSelectedBookingId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                >
                                    {bookings.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.projectName || b.customerName} (Start: {new Date(b.startDate).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Staging Bay</label>
                                <select
                                    value={stagingBay}
                                    onChange={(e) => setStagingBay(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                >
                                    <option value="Bay 01 - Dispatch Gate A">Bay 01 - Dispatch Gate A</option>
                                    <option value="Bay 02 - Express Staging B">Bay 02 - Express Staging B</option>
                                    <option value="Bay 03 - Heavy Truss Deck">Bay 03 - Heavy Truss Deck</option>
                                    <option value="Bay 04 - VIP Tech Bay">Bay 04 - VIP Tech Bay</option>
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-[var(--color-gold)] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-xl shadow-lg transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? "Generating..." : "Generate Wave"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
