"use client";

import React, { useState, useEffect } from "react";
import { 
    Truck, AlertTriangle, CheckCircle2, Plus, 
    ArrowUpRight, ArrowDownLeft, RefreshCw, Barcode, 
    ExternalLink, Layers, DollarSign, Calendar, X, Loader2
} from "lucide-react";
import { format } from "date-fns";

interface CrossHireOrder {
    id: string;
    orderNumber: string;
    supplierName: string;
    supplierContact?: string;
    unitsRequested: number;
    periodStart: string;
    periodEnd: string;
    supplierDailyRate: number;
    clientDailyRate: number;
    totalSupplierCost: number;
    totalClientRevenue: number;
    profitMargin: number;
    status: string;
    assetTagAllocations?: string[];
    product?: {
        name: string;
        itemCode?: string;
    };
    booking?: {
        id: string;
        customerName: string;
    };
}

interface ShortageDossier {
    bookingId: string;
    customerName: string;
    startDate: string;
    endDate: string;
    shortages: Array<{
        productId: string;
        productName: string;
        totalStock: number;
        unitsRequired: number;
        unitsAvailable: number;
        shortageDelta: number;
        recommendedSupplierCost: number;
        recommendedClientPrice: number;
        estimatedMargin: number;
    }>;
}

export default function CrossHireCockpit() {
    const [orders, setOrders] = useState<CrossHireOrder[]>([]);
    const [shortages, setShortages] = useState<ShortageDossier[]>([]);
    const [loading, setLoading] = useState(true);
    const [rfpModalOpen, setRfpModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<CrossHireOrder | null>(null);

    // Form states
    const [vendorSerial, setVendorSerial] = useState("");
    const [customAlias, setCustomAlias] = useState("");
    const [receiving, setReceiving] = useState(false);
    const [successBanner, setSuccessBanner] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, shortagesRes] = await Promise.all([
                fetch("/api/admin/cross-hires").then(r => r.json()).catch(() => ({ orders: [] })),
                fetch("/api/admin/cross-hires/shortages").then(r => r.json()).catch(() => ({ shortageDossiers: [] })),
            ]);

            if (Array.isArray(ordersRes.orders)) setOrders(ordersRes.orders);
            if (Array.isArray(shortagesRes.shortageDossiers)) setShortages(shortagesRes.shortageDossiers);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenReceive = (order: CrossHireOrder) => {
        setSelectedOrder(order);
        setVendorSerial("");
        setCustomAlias(`XHIRE-${order.orderNumber.replace(/[^A-Z0-9]/g, '')}-${((order.assetTagAllocations || []).length + 1).toString().padStart(2, '0')}`);
        setReceiveModalOpen(true);
    };

    const handleReceiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;

        setReceiving(true);
        try {
            const res = await fetch("/api/admin/cross-hires/receive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    crossHireOrderId: selectedOrder.id,
                    vendorSerial,
                    customAliasTag: customAlias,
                    warehouseLocation: "Bay 04 - Sub-Rental Staging",
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setReceiveModalOpen(false);
                setSuccessBanner(`Alias tag ${data.aliasTag} created! Unit is now scan-ready in warehouse.`);
                fetchData();
                setTimeout(() => setSuccessBanner(null), 5000);
            } else {
                alert(data.error || "Failed to receive unit");
            }
        } finally {
            setReceiving(false);
        }
    };

    const handleReturnSupplier = async (orderId: string) => {
        if (!confirm("Confirm returning sub-rented gear to external supplier?")) return;
        try {
            const res = await fetch("/api/admin/cross-hires/receive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ crossHireOrderId: orderId, action: "return" }),
            });
            if (res.ok) {
                setSuccessBanner("Sub-rental marked returned to vendor courier.");
                fetchData();
                setTimeout(() => setSuccessBanner(null), 5000);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    return (
        <div className="space-y-6" data-testid="cross-hire-cockpit">
            {/* Header / Stats Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2.5">
                        <Truck className="w-5 h-5 text-amber-400" />
                        Sub-Rental & <span className="text-amber-400">Cross-Hire Network</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Automated equipment shortage fulfillment, partner RFPs & virtual barcode aliasing for Qatar rental partners.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {successBanner && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {successBanner}
                </div>
            )}

            {/* Shortage Alerts Section */}
            {shortages.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        Detected Equipment Shortfalls ({shortages.length} Projects Impacted)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {shortages.map(d => (
                            <div key={d.bookingId} className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">{d.customerName}</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                                        Shortage Detected
                                    </span>
                                </div>
                                {d.shortages.map(s => (
                                    <div key={s.productId} className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                                        <div>
                                            <p className="font-bold text-slate-200">{s.productName}</p>
                                            <p className="text-[10px] text-slate-400">Required: {s.unitsRequired} · Available: {s.unitsAvailable}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-amber-400 font-black">+{s.shortageDelta} Short</span>
                                            <p className="text-[10px] text-emerald-400 font-medium">Est. Margin: QAR {s.estimatedMargin}/day</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cross Hire Orders Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Active Sub-Rental Manifests</h3>
                    <span className="text-xs text-slate-400 font-mono">{orders.length} total orders</span>
                </div>
                {orders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                        No active cross-hire orders found. All booking requirements are currently met by platform stock.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-3">Order #</th>
                                    <th className="px-6 py-3">Partner Supplier</th>
                                    <th className="px-6 py-3">Equipment</th>
                                    <th className="px-6 py-3">Units</th>
                                    <th className="px-6 py-3">Gross Margin</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {orders.map(o => (
                                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-amber-400">{o.orderNumber}</td>
                                        <td className="px-6 py-4 font-medium text-white">{o.supplierName}</td>
                                        <td className="px-6 py-4 text-slate-300">{o.product?.name || "Equipment"}</td>
                                        <td className="px-6 py-4 text-slate-300">{o.unitsRequested}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-emerald-400 font-black">+QAR {o.profitMargin}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                o.status === "received" || o.status === "deployed"
                                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                    : o.status === "returned"
                                                        ? "bg-slate-700 text-slate-300"
                                                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            }`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {o.status !== "returned" && (
                                                <button
                                                    onClick={() => handleOpenReceive(o)}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-bold text-[11px] transition-all"
                                                >
                                                    <Barcode className="w-3.5 h-3.5 inline mr-1" />
                                                    Alias Tag
                                                </button>
                                            )}
                                            {o.status === "received" && (
                                                <button
                                                    onClick={() => handleReturnSupplier(o.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-all"
                                                >
                                                    Return
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Inbound Receive Modal */}
            {receiveModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-white">Receive & Alias Sub-Rental</h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedOrder.orderNumber} · {selectedOrder.supplierName}</p>
                            </div>
                            <button onClick={() => setReceiveModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                                    Virtual Alias Barcode Tag *
                                </label>
                                <input
                                    type="text"
                                    value={customAlias}
                                    onChange={e => setCustomAlias(e.target.value)}
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">This temporary barcode allows the item to scan seamlessly during bump-in.</p>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                                    Partner Equipment Serial #
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. SN-KARA-88421"
                                    value={vendorSerial}
                                    onChange={e => setVendorSerial(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReceiveModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={receiving}
                                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5"
                                >
                                    {receiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
                                    Print & Register Alias
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
