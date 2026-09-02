"use client";

import React, { useState, useEffect } from "react";
import { 
    ArrowLeftRight, 
    Plus, 
    Truck, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Package, 
    Search, 
    RefreshCw, 
    Printer, 
    X,
    MapPin,
    Calendar,
    Phone
} from "lucide-react";

interface Transfer {
    id: string;
    transferNumber: string;
    sourceWarehouseId: string;
    sourceWarehouse: { name: string; city: string | null };
    destWarehouseId: string;
    destWarehouse: { name: string; city: string | null };
    status: "draft" | "requested" | "in_transit" | "received" | "cancelled";
    requester: { name: string; email: string } | null;
    driverName: string | null;
    vehiclePlate: string | null;
    driverPhone: string | null;
    notes: string | null;
    dispatchedAt: string | null;
    receivedAt: string | null;
    createdAt: string;
    items: Array<{
        id: string;
        product: { id: string; name: string; itemCode: string; thumbnailUrl: string | null };
        inventoryUnit: { id: string; assetTagCode: string; conditionStatus: string } | null;
        requestedQuantity: number;
        transferredQuantity: number;
        status: string;
    }>;
}

export default function WarehouseTransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // New Transfer Form
    const [newForm, setNewForm] = useState({
        sourceWarehouseId: "",
        destWarehouseId: "",
        driverName: "",
        vehiclePlate: "",
        driverPhone: "",
        notes: "",
        selectedProductId: "",
        quantity: 1,
    });

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [trRes, whRes, prRes] = await Promise.all([
                fetch(`/api/dashboard/warehouse/transfers${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
                fetch("/api/dashboard/warehouses"),
                fetch("/api/products?limit=50")
            ]);

            if (trRes.ok) {
                const trData = await trRes.json();
                setTransfers(trData.transfers || []);
            }
            if (whRes.ok) {
                const whData = await whRes.json();
                setWarehouses(whData);
                if (whData.length >= 2 && !newForm.sourceWarehouseId) {
                    setNewForm(prev => ({
                        ...prev,
                        sourceWarehouseId: whData[0].id,
                        destWarehouseId: whData[1].id
                    }));
                }
            }
            if (prRes.ok) {
                const prData = await prRes.json();
                setProducts(prData.products || []);
                if (prData.products?.length > 0 && !newForm.selectedProductId) {
                    setNewForm(prev => ({ ...prev, selectedProductId: prData.products[0].id }));
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

    const handleCreateTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newForm.sourceWarehouseId === newForm.destWarehouseId) {
            alert("Source and Destination warehouses must be different.");
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch("/api/dashboard/warehouse/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceWarehouseId: newForm.sourceWarehouseId,
                    destWarehouseId: newForm.destWarehouseId,
                    driverName: newForm.driverName,
                    vehiclePlate: newForm.vehiclePlate,
                    driverPhone: newForm.driverPhone,
                    notes: newForm.notes,
                    items: [
                        {
                            productId: newForm.selectedProductId,
                            requestedQuantity: Number(newForm.quantity) || 1,
                        }
                    ]
                })
            });

            if (res.ok) {
                showToast("✅ Transfer order created successfully!");
                setShowNewModal(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create transfer order.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusTransition = async (transferId: string, nextStatus: "in_transit" | "received" | "cancelled") => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/dashboard/warehouse/transfers/${transferId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                showToast(`✅ Transfer status updated to ${nextStatus.toUpperCase()}`);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update transfer status.");
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
                        <ArrowLeftRight className="w-6 h-6 text-indigo-400" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">Inter-Warehouse Transfers</h1>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Coordinate equipment movements between hubs, staging depots, and venue locations.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New Transfer Order
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
                {["all", "requested", "in_transit", "received", "cancelled"].map((st) => (
                    <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                            statusFilter === st
                                ? "bg-slate-800 text-amber-400 border border-slate-700"
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        {st.replace("_", " ")}
                    </button>
                ))}
            </div>

            {/* Transfers List */}
            {loading ? (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <span>Loading transfer orders...</span>
                </div>
            ) : transfers.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/60">
                    <ArrowLeftRight className="w-10 h-10 mx-auto text-slate-600 mb-3 opacity-50" />
                    <p className="text-sm font-semibold text-slate-400">No transfer orders found.</p>
                    <p className="text-xs text-slate-600 mt-1">Click "New Transfer Order" to move stock between warehouses.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transfers.map(tr => {
                        const statusColors: any = {
                            requested: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            in_transit: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                            received: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            cancelled: "bg-slate-800 text-slate-400 border-slate-700",
                        };

                        return (
                            <div
                                key={tr.id}
                                className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-black text-white">{tr.transferNumber}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusColors[tr.status] || ''}`}>
                                                {tr.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            {new Date(tr.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Warehouse Route Card */}
                                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 mb-3 flex items-center justify-between text-xs">
                                        <div className="space-y-0.5">
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Source</div>
                                            <div className="font-bold text-white">{tr.sourceWarehouse?.name}</div>
                                        </div>
                                        <div className="px-3 flex flex-col items-center text-indigo-400">
                                            <Truck className="w-4 h-4" />
                                            <span className="text-[9px] uppercase font-bold mt-0.5">Route</span>
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Destination</div>
                                            <div className="font-bold text-white">{tr.destWarehouse?.name}</div>
                                        </div>
                                    </div>

                                    {/* Items Summary */}
                                    <div className="space-y-1.5 mb-3">
                                        {tr.items.map(itm => (
                                            <div key={itm.id} className="flex items-center justify-between text-xs text-slate-300">
                                                <span className="truncate pr-2 font-medium">📦 {itm.product?.name}</span>
                                                <span className="font-mono text-amber-400 font-bold shrink-0">{itm.requestedQuantity} Units</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Driver & Vehicle */}
                                    {(tr.driverName || tr.vehiclePlate) && (
                                        <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-2 border-t border-slate-800/60">
                                            {tr.driverName && <span>👤 {tr.driverName}</span>}
                                            {tr.vehiclePlate && <span>🚛 {tr.vehiclePlate}</span>}
                                            {tr.driverPhone && <span>📞 {tr.driverPhone}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => window.print()}
                                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                                        title="Print Transit Manifest"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        Manifest
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {tr.status === "requested" && (
                                            <button
                                                disabled={actionLoading}
                                                onClick={() => handleStatusTransition(tr.id, "in_transit")}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md"
                                            >
                                                Dispatch Truck
                                            </button>
                                        )}

                                        {tr.status === "in_transit" && (
                                            <button
                                                disabled={actionLoading}
                                                onClick={() => handleStatusTransition(tr.id, "received")}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md"
                                            >
                                                Confirm Receipt
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: New Transfer Order */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-lg font-bold text-white">Create Inter-Warehouse Transfer</h3>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTransfer} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Source Warehouse</label>
                                    <select
                                        required
                                        value={newForm.sourceWarehouseId}
                                        onChange={(e) => setNewForm({ ...newForm, sourceWarehouseId: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                    >
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Destination Warehouse</label>
                                    <select
                                        required
                                        value={newForm.destWarehouseId}
                                        onChange={(e) => setNewForm({ ...newForm, destWarehouseId: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                    >
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Equipment / Product</label>
                                    <select
                                        required
                                        value={newForm.selectedProductId}
                                        onChange={(e) => setNewForm({ ...newForm, selectedProductId: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                    >
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.itemCode})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={newForm.quantity}
                                        onChange={(e) => setNewForm({ ...newForm, quantity: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Driver Name</label>
                                    <input
                                        type="text"
                                        placeholder="Rashid Khan"
                                        value={newForm.driverName}
                                        onChange={(e) => setNewForm({ ...newForm, driverName: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Vehicle Plate</label>
                                    <input
                                        type="text"
                                        placeholder="QA-98421"
                                        value={newForm.vehiclePlate}
                                        onChange={(e) => setNewForm({ ...newForm, vehiclePlate: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Driver Phone</label>
                                    <input
                                        type="text"
                                        placeholder="+974 5512 3456"
                                        value={newForm.driverPhone}
                                        onChange={(e) => setNewForm({ ...newForm, driverPhone: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Movement Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Urgent stock replenishment for upcoming National Day activations"
                                    value={newForm.notes}
                                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                                >
                                    {actionLoading ? "Creating..." : "Submit Transfer Order"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
