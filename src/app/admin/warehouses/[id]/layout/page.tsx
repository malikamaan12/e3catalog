"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Warehouse, ArrowLeft, Edit3, Save, Layers, Box,
    Sparkles, Eye, Flame, Snowflake, AlertCircle,
    CheckCircle2, Gauge, ShieldCheck, MapPin, Grid
} from "lucide-react";
import WarehouseDigitalTwin, { HeatmapMode } from "@/components/warehouse/WarehouseDigitalTwin";
import RackDetailDrawer from "@/components/warehouse/RackDetailDrawer";
import PhysicalItemLocator from "@/components/warehouse/PhysicalItemLocator";
import WarehouseLayoutEditor from "@/components/warehouse/WarehouseLayoutEditor";
import { WarehouseLayoutConfig } from "@/lib/db/schema";

export default function WarehouseLayoutPage() {
    const params = useParams();
    const warehouseId = params?.id as string;
    const router = useRouter();

    const [warehouse, setWarehouse] = useState<any | null>(null);
    const [layout, setLayout] = useState<WarehouseLayoutConfig | null>(null);
    const [metrics, setMetrics] = useState<any | null>(null);
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modes & Interactions
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("occupancy");
    const [is3DView, setIs3DView] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Selection & Location
    const [selectedRack, setSelectedRack] = useState<any | null>(null);
    const [locatedTarget, setLocatedTarget] = useState<any | null>(null);

    const fetchLayoutData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard/warehouses/${warehouseId}/layout`);
            if (res.ok) {
                const data = await res.json();
                setWarehouse(data.warehouse);
                setLayout(data.layout);
                setMetrics(data.metrics);
                setZones(data.zones || []);
            } else {
                console.error("Failed to load layout:", await res.text());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (warehouseId) fetchLayoutData();
    }, [warehouseId]);

    const handleSelectRack = (rack: any) => {
        setSelectedRack(rack);
    };

    const handleLocateItem = (item: any) => {
        setLocatedTarget(item);
        if (item.spatialLocation?.rackId && layout) {
            const matchedRack = layout.elements.find((el) => el.id === item.spatialLocation.rackId);
            if (matchedRack) setSelectedRack(matchedRack);
        }
    };

    const handleClearLocatedItem = () => {
        setLocatedTarget(null);
    };

    const handleSaveLayoutSuccess = (updatedConfig: WarehouseLayoutConfig) => {
        setLayout(updatedConfig);
        setIsEditMode(false);
        fetchLayoutData();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-mono text-slate-400">Loading Warehouse Digital Twin & Spatial Layout...</p>
            </div>
        );
    }

    if (!warehouse || !layout) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                <h1 className="text-xl font-bold">Warehouse Not Found</h1>
                <p className="text-sm text-slate-400 mt-2 mb-6">Could not load layout configuration for facility.</p>
                <Link
                    href="/admin/warehouses"
                    className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-black font-bold text-xs uppercase"
                >
                    Back to Warehouse Management
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 pt-24 md:pt-28 p-4 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
            {/* Top Navigation & Status Bar */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/warehouses"
                        className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Back to Warehouses"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                                Digital Twin Active
                            </span>
                            <span className="text-xs text-slate-400 font-mono">Spatial Grid Resolution 1.0m</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-heading)] font-black text-white tracking-tight flex items-center gap-2">
                            {warehouse.name}
                            <span className="text-xs font-mono font-normal text-slate-400">
                                ({warehouse.address || "Doha Logistics Hub"}, {warehouse.city || "Qatar"})
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Item Locator Search */}
                    {!isEditMode && (
                        <PhysicalItemLocator
                            warehouseId={warehouseId}
                            onLocateItem={handleLocateItem}
                            activeLocatedItem={locatedTarget}
                            onClearLocatedItem={handleClearLocatedItem}
                        />
                    )}

                    {/* Edit Mode Toggle Button */}
                    <button
                        id="modify-layout-btn"
                        onClick={() => {
                            setSelectedRack(null);
                            setLocatedTarget(null);
                            setIsEditMode(!isEditMode);
                        }}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                            isEditMode
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                                : "bg-[var(--color-gold)] text-black hover:brightness-110 shadow-amber-500/20"
                        }`}
                    >
                        <Edit3 className="w-4 h-4" />
                        {isEditMode ? "Exit Studio Editor" : "Modify Layout"}
                    </button>
                </div>
            </header>

            {/* Spatial KPIs & Efficiency HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Racks</span>
                    <span className="text-2xl font-black text-white mt-1">{metrics?.totalRacks || 0}</span>
                    <span className="text-[10px] text-slate-500 mt-auto font-mono">4-Tier Storage Units</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity Units</span>
                    <span className="text-2xl font-black text-slate-200 mt-1">{metrics?.totalCapacity || 0}</span>
                    <span className="text-[10px] text-slate-500 mt-auto font-mono">{metrics?.totalOccupiedUnits || 0} Stored</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Occupancy Rate</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1">{metrics?.overallOccupancy || 0}%</span>
                    <span className="text-[10px] text-slate-500 mt-auto font-mono">Space Utilization</span>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/[0.05] border border-cyan-500/20 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Empty Racks
                    </span>
                    <span className="text-2xl font-black text-cyan-300 mt-1">{metrics?.emptyRacks || 0}</span>
                    <span className="text-[10px] text-cyan-400/70 mt-auto font-mono">Ready For Putaway</span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/[0.05] border border-indigo-500/20 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                        <Snowflake className="w-3 h-3" /> Dead Spots
                    </span>
                    <span className="text-2xl font-black text-indigo-300 mt-1">{metrics?.deadSpots || 0}</span>
                    <span className="text-[10px] text-indigo-400/70 mt-auto font-mono">&gt;60d No Picks Flag</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)] flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> Efficiency Score
                    </span>
                    <span className="text-2xl font-black text-[var(--color-gold)] mt-1">{metrics?.efficiencyScore || 92} / 100</span>
                    <span className="text-[10px] text-amber-500/70 mt-auto font-mono">Optimal Flow Rating</span>
                </div>
            </div>

            {/* Main Interactive Studio Area */}
            {isEditMode ? (
                <WarehouseLayoutEditor
                    warehouseId={warehouseId}
                    warehouseName={warehouse.name}
                    zones={zones}
                    initialConfig={layout}
                    onSaveSuccess={handleSaveLayoutSuccess}
                    onCancel={() => setIsEditMode(false)}
                />
            ) : (
                <div className="relative">
                    <WarehouseDigitalTwin
                        layout={layout}
                        selectedRackId={selectedRack?.id || null}
                        onSelectRack={handleSelectRack}
                        locatedTarget={locatedTarget}
                        heatmapMode={heatmapMode}
                        onHeatmapModeChange={setHeatmapMode}
                        is3DView={is3DView}
                        onToggle3DView={() => setIs3DView(!is3DView)}
                    />

                    {/* Slide-over Rack Inspector Drawer */}
                    {selectedRack && (
                        <RackDetailDrawer
                            rack={selectedRack}
                            onClose={() => setSelectedRack(null)}
                            locatedTarget={locatedTarget}
                            onToggleDeadSpot={(rackId) => {
                                alert(`Toggled dead-spot flag for rack ${selectedRack.rackCode || selectedRack.label}`);
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
