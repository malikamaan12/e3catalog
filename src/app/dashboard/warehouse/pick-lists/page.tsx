"use client";

import React, { useState, useEffect } from "react";
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
    ChevronRight
} from "lucide-react";

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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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
                        <h1 className="text-2xl font-bold text-white tracking-tight">Wave Picking & Staging Bays</h1>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Pick event orders, verify accompanying accessory kits, and assign to dispatch staging bays.
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 bg-[var(--color-gold)] hover:brightness-110 text-slate-950 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Generate Pick List
                </button>
            </div>

            {/* Main Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Pick Lists Queue */}
                <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                        <span>Active Pick Lists ({pickLists.length})</span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                            <span>Loading pick lists...</span>
                        </div>
                    ) : pickLists.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                            No pick lists found.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                            {pickLists.map(pl => {
                                const active = selectedList?.id === pl.id;
                                const verifiedCount = pl.items.filter(i => i.isVerified).length;
                                const totalCount = pl.items.length;
                                const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

                                return (
                                    <div
                                        key={pl.id}
                                        onClick={() => setSelectedList(pl)}
                                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                                            active
                                                ? "bg-slate-800 border-amber-400/80 ring-1 ring-amber-400/30"
                                                : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="font-mono text-xs font-black text-white">{pl.pickNumber}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                                                {pl.status}
                                            </span>
                                        </div>

                                        <div className="text-sm font-bold text-slate-200 truncate">
                                            {pl.booking?.projectName || pl.booking?.customerName || "Event Booking"}
                                        </div>

                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                            <span>📍 {pl.stagingBay || "Unassigned Bay"}</span>
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
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">{pct}%</span>
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
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Picking & Accessory Checklist ({selectedList.items.filter(i => i.isVerified).length}/{selectedList.items.length} verified)
                                </div>

                                <div className="space-y-2">
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
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                                                    itm.isVerified ? "bg-emerald-500 border-emerald-400 text-slate-950" : "border-slate-600 bg-slate-800"
                                                }`}>
                                                    {itm.isVerified && <CheckCircle2 className="w-4 h-4" />}
                                                </div>

                                                <div>
                                                    <div className="text-xs font-bold text-white">
                                                        {itm.isAccessory ? `🔌 ${itm.accessoryName}` : `📦 ${itm.product?.name}`}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono">
                                                        {itm.isAccessory ? "Mandatory Accessory Kit" : `Qty: ${itm.requiredQty} units • ${itm.inventoryUnit?.shelfLocation || "Main Storage"}`}
                                                    </div>
                                                </div>
                                            </div>

                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                itm.isVerified ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                                            }`}>
                                                {itm.isVerified ? "Verified" : "Pending"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow Stage Transitions */}
                            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.print()}
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
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
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
                                    <option value="Bay 04 - VIP Production Prep">Bay 04 - VIP Production Prep</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-[var(--color-gold)] text-slate-950 text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                                >
                                    {actionLoading ? "Generating..." : "Generate List"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
