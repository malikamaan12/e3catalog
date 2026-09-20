"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Grid, 
    Plus, 
    Search, 
    Layers, 
    MapPin, 
    ArrowRightLeft, 
    QrCode, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Box, 
    Shield, 
    SlidersHorizontal,
    X,
    Barcode
} from "lucide-react";
import DirectedPutawayModal from "@/components/warehouse/DirectedPutawayModal";

interface Zone {
    id: string;
    warehouseId: string;
    warehouseName: string;
    name: string;
    code: string;
    zoneType: string;
    color: string;
    description: string | null;
    binCount: number;
    unitCount: number;
}

interface Bin {
    id: string;
    warehouseId: string;
    warehouseName: string;
    zoneId: string;
    zoneName: string;
    zoneCode: string;
    zoneType: string;
    binCode: string;
    aisle: string | null;
    rack: string | null;
    shelf: string | null;
    bin: string | null;
    maxCapacity: number;
    isActive: boolean;
    currentUnitCount: number;
}

export default function WarehouseZonesPage() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [bins, setBins] = useState<Bin[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
    const [selectedZoneId, setSelectedZoneId] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddZoneModal, setShowAddZoneModal] = useState(false);
    const [showAddBinModal, setShowAddBinModal] = useState(false);
    const [showRelocateModal, setShowRelocateModal] = useState(false);
    const [showPutawayModal, setShowPutawayModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState<Bin | null>(null);

    // Form states
    const [newZone, setNewZone] = useState({ name: "", code: "", zoneType: "storage", color: "#3b82f6", description: "" });
    const [newBin, setNewBin] = useState({ zoneId: "", binCode: "", aisle: "Aisle 1", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 01", maxCapacity: "50" });
    const [relocateForm, setRelocateForm] = useState({ assetTagCode: "", targetBinCode: "", notes: "" });
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [whRes, zonesRes, binsRes] = await Promise.all([
                fetch("/api/dashboard/warehouses"),
                fetch(`/api/dashboard/warehouse/zones${selectedWarehouseId ? `?warehouseId=${selectedWarehouseId}` : ""}`),
                fetch(`/api/dashboard/warehouse/bins${selectedWarehouseId ? `?warehouseId=${selectedWarehouseId}` : ""}`)
            ]);

            if (whRes.ok) {
                const whData = await whRes.json();
                setWarehouses(whData);
                if (whData.length > 0 && !selectedWarehouseId) {
                    setSelectedWarehouseId(whData[0].id);
                }
            }
            if (zonesRes.ok) {
                const zData = await zonesRes.json();
                setZones(zData.zones || []);
            }
            if (binsRes.ok) {
                const bData = await binsRes.json();
                setBins(bData.bins || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedWarehouseId]);

    const handleCreateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch("/api/dashboard/warehouse/zones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newZone, warehouseId: selectedWarehouseId })
            });
            if (res.ok) {
                showToast("✅ Zone created successfully!");
                setShowAddZoneModal(false);
                setNewZone({ name: "", code: "", zoneType: "storage", color: "#3b82f6", description: "" });
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create zone.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateBin = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch("/api/dashboard/warehouse/bins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newBin, warehouseId: selectedWarehouseId })
            });
            if (res.ok) {
                showToast("✅ Bin location created successfully!");
                setShowAddBinModal(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create bin.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRelocate = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            // First lookup unit ID by asset tag code
            const passportRes = await fetch(`/api/passport/${relocateForm.assetTagCode.trim().toUpperCase()}`);
            if (!passportRes.ok) {
                alert(`Asset Tag "${relocateForm.assetTagCode}" not found.`);
                setActionLoading(false);
                return;
            }
            const passportData = await passportRes.json();
            const unitId = passportData.unit?.id;

            const res = await fetch("/api/dashboard/warehouse/bins/relocate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unitIds: [unitId],
                    targetBinCode: relocateForm.targetBinCode.trim().toUpperCase(),
                    notes: relocateForm.notes
                })
            });

            if (res.ok) {
                showToast(`✅ Unit ${relocateForm.assetTagCode.toUpperCase()} relocated to ${relocateForm.targetBinCode.toUpperCase()}`);
                setShowRelocateModal(false);
                setRelocateForm({ assetTagCode: "", targetBinCode: "", notes: "" });
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to relocate.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredBins = bins.filter(b => {
        const matchesZone = selectedZoneId === "all" || b.zoneId === selectedZoneId;
        const matchesSearch = searchQuery === "" || 
            b.binCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.aisle && b.aisle.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.rack && b.rack.toLowerCase().includes(searchQuery.toLowerCase())) ||
            b.zoneName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesZone && matchesSearch;
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-semibold border border-emerald-400/30 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle2 className="w-5 h-5" />
                    {toastMessage}
                </div>
            )}

            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <Grid className="w-6 h-6 text-amber-400" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">Warehouse Zones & Spatial Bins</h1>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Map storage aisles, staging bays, quarantine racks, and manage instant bin relocations.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Warehouse Filter */}
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="bg-slate-800/90 border border-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl outline-none focus:border-amber-400 transition-colors"
                    >
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    {selectedWarehouseId && (
                        <Link
                            href={`/admin/warehouses/${selectedWarehouseId}/layout`}
                            className="flex items-center gap-1.5 bg-[var(--color-gold)] text-black text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 hover:brightness-110 transition-all"
                        >
                            <Grid className="w-4 h-4" />
                            Floor Plan Digital Twin
                        </Link>
                    )}

                    <button
                        onClick={() => setShowPutawayModal(true)}
                        className="flex items-center gap-1.5 bg-sky-600/90 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/10 transition-all"
                    >
                        <MapPin className="w-4 h-4" />
                        Directed Putaway
                    </button>

                    <button
                        onClick={() => setShowRelocateModal(true)}
                        className="flex items-center gap-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg transition-all"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        Relocate Asset
                    </button>

                    <button
                        onClick={() => setShowAddBinModal(true)}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Bin
                    </button>

                    <button
                        onClick={() => setShowAddZoneModal(true)}
                        className="flex items-center gap-1.5 bg-[var(--color-gold)] hover:brightness-110 text-slate-950 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New Zone
                    </button>
                </div>
            </div>

            {/* Zone Cards Carousel / Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => setSelectedZoneId("all")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        selectedZoneId === "all"
                            ? "bg-slate-800 border-amber-400 ring-1 ring-amber-400/40"
                            : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40"
                    }`}
                >
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                        <span>All Zones</span>
                        <Layers className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-xl font-extrabold text-white">
                        {bins.length} <span className="text-xs font-normal text-slate-400">Total Bins</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {bins.reduce((acc, b) => acc + Number(b.currentUnitCount || 0), 0)} Units Stored
                    </div>
                </button>

                {zones.map(z => {
                    const active = selectedZoneId === z.id;
                    const zoneTypeIcons: any = {
                        storage: Box,
                        staging: Layers,
                        quarantine: Shield,
                        returns: RefreshCw,
                        loading_dock: MapPin
                    };
                    const Icon = zoneTypeIcons[z.zoneType] || Box;

                    return (
                        <button
                            key={z.id}
                            onClick={() => setSelectedZoneId(z.id)}
                            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                                active
                                    ? "bg-slate-800 border-amber-400 ring-1 ring-amber-400/40"
                                    : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40"
                            }`}
                        >
                            <div 
                                className="absolute top-0 left-0 right-0 h-1" 
                                style={{ backgroundColor: z.color || '#3b82f6' }}
                            />
                            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                                <span className="truncate pr-2">{z.code}</span>
                                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </div>
                            <div className="text-sm font-bold text-white truncate" title={z.name}>
                                {z.name}
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                                <span>{z.binCount} Bins</span>
                                <span className="font-semibold text-slate-300">{z.unitCount} Units</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Bins Grid & Filter */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by bin code, aisle, rack, or zone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs px-3.5 py-2 rounded-xl outline-none focus:border-amber-400 w-full sm:w-80"
                        />
                    </div>
                    <div className="text-xs text-slate-400 font-semibold">
                        Showing {filteredBins.length} of {bins.length} Bins
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                        <span>Loading spatial warehouse map...</span>
                    </div>
                ) : filteredBins.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">
                        No bin locations found matching your search.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredBins.map(bin => {
                            const fillPercent = Math.min(100, Math.round((bin.currentUnitCount / bin.maxCapacity) * 100));
                            const isFull = fillPercent >= 90;

                            return (
                                <div
                                    key={bin.id}
                                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded">
                                                    {bin.zoneCode}
                                                </span>
                                                <div className="text-sm font-black text-white mt-1 tracking-tight font-mono">
                                                    {bin.binCode}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowQRModal(bin)}
                                                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                                                title="View Bin QR Tag"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="text-xs text-slate-400 space-y-0.5">
                                            {bin.aisle && <div>📍 {bin.aisle} • {bin.rack}</div>}
                                            {bin.shelf && <div className="text-[11px] text-slate-500">{bin.shelf} • {bin.bin}</div>}
                                        </div>
                                    </div>

                                    {/* Capacity Bar */}
                                    <div className="mt-4 pt-3 border-t border-slate-800/60">
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="text-slate-400 font-medium">Occupancy</span>
                                            <span className={`font-bold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {bin.currentUnitCount} / {bin.maxCapacity} units ({fillPercent}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    isFull ? 'bg-rose-500' : fillPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${fillPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Relocate Asset */}
            {showRelocateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-lg font-bold text-white">Relocate Asset Unit</h3>
                            </div>
                            <button onClick={() => setShowRelocateModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRelocate} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Asset Tag Code</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. E3-EXH-001-001"
                                    value={relocateForm.assetTagCode}
                                    onChange={(e) => setRelocateForm({ ...relocateForm, assetTagCode: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-sm px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Destination Bin Code</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. BIN-AUD-A01-R01-S1 or BAY-01-DISPATCH"
                                    value={relocateForm.targetBinCode}
                                    onChange={(e) => setRelocateForm({ ...relocateForm, targetBinCode: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-sm px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Movement Notes (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Moved for Katara gala staging"
                                    value={relocateForm.notes}
                                    onChange={(e) => setRelocateForm({ ...relocateForm, notes: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-400"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowRelocateModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? "Relocating..." : "Confirm Movement"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Zone */}
            {showAddZoneModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Create Spatial Zone</h3>
                            <button onClick={() => setShowAddZoneModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateZone} className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Zone Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Power Generators & Distribution"
                                    value={newZone.name}
                                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Zone Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ZN-PWR-E"
                                        value={newZone.code}
                                        onChange={(e) => setNewZone({ ...newZone, code: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Type</label>
                                    <select
                                        value={newZone.zoneType}
                                        onChange={(e) => setNewZone({ ...newZone, zoneType: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                    >
                                        <option value="storage">Storage</option>
                                        <option value="staging">Staging Dock</option>
                                        <option value="quarantine">Quarantine & Repair</option>
                                        <option value="returns">Returns Reception</option>
                                        <option value="loading_dock">Loading Dock</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Zone Description</label>
                                <input
                                    type="text"
                                    placeholder="High-voltage power cabling and distribution boxes"
                                    value={newZone.description}
                                    onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddZoneModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-[var(--color-gold)] text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? "Creating..." : "Save Zone"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Bin */}
            {showAddBinModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Create Bin Location</h3>
                            <button onClick={() => setShowAddBinModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBin} className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Parent Zone</label>
                                <select
                                    required
                                    value={newBin.zoneId}
                                    onChange={(e) => setNewBin({ ...newBin, zoneId: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                >
                                    <option value="">Select Zone...</option>
                                    {zones.map(z => (
                                        <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Bin Code</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="BIN-PWR-A01-R01-S1"
                                    value={newBin.binCode}
                                    onChange={(e) => setNewBin({ ...newBin, binCode: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Aisle</label>
                                    <input
                                        type="text"
                                        placeholder="Aisle 1"
                                        value={newBin.aisle}
                                        onChange={(e) => setNewBin({ ...newBin, aisle: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">Rack</label>
                                    <input
                                        type="text"
                                        placeholder="Rack 1"
                                        value={newBin.rack}
                                        onChange={(e) => setNewBin({ ...newBin, rack: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBinModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? "Creating..." : "Save Bin"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: QR Code Preview for Bin */}
            {showQRModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Spatial Bin Tag</h3>
                            <button onClick={() => setShowQRModal(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl inline-block shadow-lg">
                            {/* Visual QR Code Representation */}
                            <div className="w-44 h-44 border-4 border-slate-900 flex flex-col items-center justify-center p-2 text-slate-950 font-mono text-[10px]">
                                <Barcode className="w-16 h-16 text-slate-950" />
                                <div className="font-bold text-xs mt-2">{showQRModal.binCode}</div>
                                <div className="text-[9px] text-slate-600">{showQRModal.warehouseName}</div>
                            </div>
                        </div>

                        <div className="text-xs text-slate-400">
                            Scan with E3 WMS Scanner to relocate units directly to <span className="font-bold text-white">{showQRModal.binCode}</span>.
                        </div>

                        <button
                            onClick={() => window.print()}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl border border-slate-700 transition-all"
                        >
                            Print Bin Tag
                        </button>
                    </div>
                </div>
            )}

            {/* Directed Putaway Modal */}
            <DirectedPutawayModal
                isOpen={showPutawayModal}
                onClose={() => setShowPutawayModal(false)}
                onPutawayComplete={() => {
                    fetchData();
                    showToast("Asset successfully slotted into bin!");
                }}
            />
        </div>
    );
}
