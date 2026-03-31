"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search, RefreshCw, MapPin,
    ChevronRight, X, Save, Loader2, Tag, Camera
} from "lucide-react";
import { format } from "date-fns";
import QRScannerModal from "@/components/warehouse/QRScannerModal";

type Unit = {
    id: string;
    assetTagCode: string;
    serialNumber: string | null;
    productName: string | null;
    categoryName: string | null;
    conditionStatus: string;
    availabilityStatus: string;
    warehouseName: string | null;
    shelfLocation: string | null;
    warehouseLocation: string | null;
    lastInspectionDate: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    in_warehouse:    { label: "In Warehouse", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
    on_rent:         { label: "On Rent",       color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20",         dot: "bg-sky-400" },
    in_maintenance:  { label: "Maintenance",   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         dot: "bg-red-400" },
    maintenance:     { label: "Maintenance",   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         dot: "bg-red-400" },
    retired:         { label: "Retired",       color: "text-slate-500",   bg: "bg-slate-500/10 border-slate-500/20",     dot: "bg-slate-500" },
};

const CONDITION_CONFIG: Record<string, string> = {
    excellent: "text-emerald-400",
    good: "text-green-400",
    fair: "text-yellow-400",
    poor: "text-orange-400",
    maintenance_required: "text-red-400",
};

export default function FleetPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [filtered, setFiltered] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selected, setSelected] = useState<Unit | null>(null);
    const [editing, setEditing] = useState(false);
    const [editStatus, setEditStatus] = useState("");
    const [editShelf, setEditShelf] = useState("");
    const [saving, setSaving] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    const handleFleetScan = (tag: string) => {
        setScannerOpen(false);
        setSearch(tag);
        setStatusFilter("all");
    };

    const load = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/fleet")
            .then(r => r.json())
            .then((data: Unit[]) => {
                setUnits(Array.isArray(data) ? data : []);
            })
            .catch(() => setUnits([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        let result = units;
        if (statusFilter !== "all") result = result.filter(u => u.availabilityStatus === statusFilter);
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(u =>
                u.assetTagCode.toLowerCase().includes(q) ||
                (u.productName || "").toLowerCase().includes(q) ||
                (u.serialNumber || "").toLowerCase().includes(q) ||
                (u.categoryName || "").toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    }, [units, search, statusFilter]);

    function openUnit(unit: Unit) {
        setSelected(unit);
        setEditStatus(unit.availabilityStatus);
        setEditShelf(unit.shelfLocation || "");
        setEditing(false);
    }

    async function saveChanges() {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/fleet", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selected.id,
                    availabilityStatus: editStatus,
                    shelfLocation: editShelf,
                }),
            });
            if (res.ok) {
                setUnits(prev => prev.map(u => u.id === selected.id
                    ? { ...u, availabilityStatus: editStatus, shelfLocation: editShelf }
                    : u
                ));
                setSelected(prev => prev ? { ...prev, availabilityStatus: editStatus, shelfLocation: editShelf } : null);
                setEditing(false);
            }
        } catch {}
        setSaving(false);
    }

    // Count by status
    const counts = units.reduce((acc, u) => {
        acc[u.availabilityStatus] = (acc[u.availabilityStatus] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex flex-col gap-0 h-full">
            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleFleetScan}
                title="Scan to Find Asset"
            />
            {/* Header + Filters */}
            <div className="p-4 md:p-6 border-b border-white/[0.06] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-100 italic">
                            Fleet <span className="text-sky-500">Manager</span>
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">{units.length} total assets registered</p>
                    </div>
                    <button onClick={load} className="p-2 text-slate-500 hover:text-slate-200 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Status filter pills */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { key: "all", label: `All (${units.length})` },
                        { key: "in_warehouse", label: `Warehouse (${counts.in_warehouse || 0})` },
                        { key: "on_rent", label: `On Rent (${counts.on_rent || 0})` },
                        { key: "in_maintenance", label: `Maintenance (${(counts.in_maintenance || 0) + (counts.maintenance || 0)})` },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all shrink-0 ${
                                statusFilter === f.key
                                    ? "bg-sky-500 border-sky-500 text-white"
                                    : "bg-transparent border-white/10 text-slate-500 hover:text-slate-300"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Search by tag code, product, or serial no..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-sky-500/50"
                        />
                    </div>
                    <button
                        onClick={() => setScannerOpen(true)}
                        title="Scan to find asset"
                        className="px-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest shrink-0"
                    >
                        <Camera className="h-4 w-4" />
                        <span className="hidden sm:inline">Scan</span>
                    </button>
                </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-16 text-slate-600 italic text-sm">No assets found.</div>
                )}
                {!loading && filtered.map(unit => {
                    const sc = STATUS_CONFIG[unit.availabilityStatus] || STATUS_CONFIG.in_warehouse;
                    return (
                        <button
                            key={unit.id}
                            onClick={() => openUnit(unit)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors text-left"
                        >
                            <div className="bg-white/5 rounded-xl p-3 shrink-0">
                                <Tag className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-black text-sm text-slate-100 tracking-widest">{unit.assetTagCode}</span>
                                    <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                        {sc.label}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 truncate">{unit.productName || "Unknown Product"}</p>
                                {unit.shelfLocation && (
                                    <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3" />{unit.shelfLocation}
                                    </p>
                                )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />
                        </button>
                    );
                })}
            </div>

            {/* Detail Drawer */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-[#10172A] border border-white/10 rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="font-black text-lg tracking-widest text-slate-100">{selected.assetTagCode}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{selected.productName}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-300 p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                { label: "Serial No.", value: selected.serialNumber || "N/A" },
                                { label: "Category", value: selected.categoryName || "N/A" },
                                { label: "Condition", value: selected.conditionStatus, className: CONDITION_CONFIG[selected.conditionStatus] || "" },
                                { label: "Warehouse", value: selected.warehouseName || selected.warehouseLocation || "N/A" },
                                { label: "Last Inspection", value: selected.lastInspectionDate ? format(new Date(selected.lastInspectionDate), "MMM do, yyyy") : "Never" },
                            ].map(f => (
                                <div key={f.label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{f.label}</p>
                                    <p className={`font-bold mt-1 text-sm ${(f as any).className || "text-slate-100"}`}>{f.value}</p>
                                </div>
                            ))}
                        </div>

                        {editing ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Availability Status</label>
                                    <select
                                        value={editStatus}
                                        onChange={e => setEditStatus(e.target.value)}
                                        className="bg-white/5 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500/50"
                                    >
                                        {Object.keys(STATUS_CONFIG).map(s => (
                                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shelf Location</label>
                                    <input
                                        value={editShelf}
                                        onChange={e => setEditShelf(e.target.value)}
                                        placeholder="e.g. Rack A3 / Shelf 2"
                                        className="bg-white/5 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500/50"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveChanges}
                                        disabled={saving}
                                        className="flex-1 py-3 rounded-xl bg-sky-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-sky-400 transition-all"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setEditing(true)}
                                className="w-full py-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-black text-sm uppercase tracking-widest hover:bg-sky-500/20 transition-all"
                            >
                                Edit Status / Location
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
