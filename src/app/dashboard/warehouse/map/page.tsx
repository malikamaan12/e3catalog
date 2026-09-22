"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
    Warehouse, 
    Layers, 
    Sparkles, 
    Eye, 
    Flame, 
    Snowflake, 
    Gauge, 
    Grid,
    MapPin,
    RefreshCw,
    Scan,
    ArrowRight
} from "lucide-react";
import WarehouseDigitalTwin, { HeatmapMode } from "@/components/warehouse/WarehouseDigitalTwin";
import RackDetailDrawer from "@/components/warehouse/RackDetailDrawer";
import PhysicalItemLocator from "@/components/warehouse/PhysicalItemLocator";
import { WarehouseLayoutConfig } from "@/lib/db/schema";
import { playScannerBeep, playClickBeep } from "@/lib/warehouse-audio";

function WarehouseMapContent() {
    const searchParams = useSearchParams();
    const locateQueryParam = searchParams.get("locate") || "";

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
    const [warehouse, setWarehouse] = useState<any | null>(null);
    const [layout, setLayout] = useState<WarehouseLayoutConfig | null>(null);
    const [metrics, setMetrics] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Modes & Views
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("occupancy");
    const [is3DView, setIs3DView] = useState(false);

    // Selected / Located items
    const [selectedRack, setSelectedRack] = useState<any | null>(null);
    const [locatedTarget, setLocatedTarget] = useState<any | null>(null);

    // 1. Fetch available warehouses
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const res = await fetch("/api/dashboard/warehouses");
                if (res.ok) {
                    const data = await res.json();
                    setWarehouses(data || []);
                    if (data?.length > 0) {
                        setSelectedWarehouseId(data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load warehouses:", err);
            }
        };
        fetchWarehouses();
    }, []);

    // 2. Fetch layout when warehouse changes
    const fetchLayoutData = async (whId: string) => {
        if (!whId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard/warehouses/${whId}/layout`);
            if (res.ok) {
                const data = await res.json();
                setWarehouse(data.warehouse);
                setLayout(data.layout);
                setMetrics(data.metrics);
            }
        } catch (err) {
            console.error("Failed to load warehouse layout:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedWarehouseId) {
            fetchLayoutData(selectedWarehouseId);
        }
    }, [selectedWarehouseId]);

    // 3. Handle ?locate=... auto-search if present
    useEffect(() => {
        if (!selectedWarehouseId || !locateQueryParam || !layout) return;

        const autoLocate = async () => {
            try {
                const res = await fetch(`/api/dashboard/warehouses/${selectedWarehouseId}/locator?q=${encodeURIComponent(locateQueryParam)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.matches && data.matches.length > 0) {
                        const target = data.matches[0];
                        setLocatedTarget(target);
                        playScannerBeep();
                        if (target.spatialLocation?.rackId && layout.elements) {
                            const matchedRack = layout.elements.find((el: any) => el.id === target.spatialLocation.rackId);
                            if (matchedRack) {
                                setSelectedRack(matchedRack);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Auto locate failed:", err);
            }
        };
        autoLocate();
    }, [selectedWarehouseId, locateQueryParam, layout]);

    const handleSelectRack = (rack: any) => {
        playClickBeep();
        setSelectedRack(rack);
    };

    const handleLocateItem = (item: any) => {
        playScannerBeep();
        setLocatedTarget(item);
        if (item.spatialLocation?.rackId && layout?.elements) {
            const matchedRack = layout.elements.find((el: any) => el.id === item.spatialLocation.rackId);
            if (matchedRack) {
                setSelectedRack(matchedRack);
            }
        }
    };

    const handleClearLocatedItem = () => {
        playClickBeep();
        setLocatedTarget(null);
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full text-slate-100">
            {/* Header with facility selector & locator search bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20 uppercase tracking-wider">
                            Interactive Digital Twin
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Floor View</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-heading)] font-black uppercase tracking-tight text-white italic">
                        Spatial Floor <span className="text-[var(--color-gold)]">Map</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Illuminate warehouse racks, locate inventory units by tag/serial, and guide putaway &amp; picking routes.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Warehouse Selector */}
                    {warehouses.length > 1 && (
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => {
                                playClickBeep();
                                setSelectedWarehouseId(e.target.value);
                            }}
                            className="bg-slate-800/90 border border-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl outline-none focus:border-amber-400 transition-colors"
                        >
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Integrated Asset Locator Search */}
                    {selectedWarehouseId && (
                        <div className="w-full sm:w-80">
                            <PhysicalItemLocator
                                warehouseId={selectedWarehouseId}
                                onLocateItem={handleLocateItem}
                                activeLocatedItem={locatedTarget}
                                onClearLocatedItem={handleClearLocatedItem}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Metrics HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Racks</span>
                    <span className="text-2xl font-black text-white mt-1 font-mono">{metrics?.totalRacks || 0}</span>
                    <span className="text-[10px] text-slate-400 mt-auto">Active physical storage units</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Floor Occupancy</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 font-mono">{metrics?.overallOccupancy || 0}%</span>
                    <span className="text-[10px] text-slate-400 mt-auto">{metrics?.totalOccupiedUnits || 0} / {metrics?.totalCapacity || 0} units stored</span>
                </div>

                <div className="p-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Empty Racks
                    </span>
                    <span className="text-2xl font-black text-cyan-300 mt-1 font-mono">{metrics?.emptyRacks || 0}</span>
                    <span className="text-[10px] text-cyan-400/80 mt-auto">Ready for directed putaway</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)] flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> Efficiency Rating
                    </span>
                    <span className="text-2xl font-black text-[var(--color-gold)] mt-1 font-mono">{metrics?.efficiencyScore || 94} / 100</span>
                    <span className="text-[10px] text-amber-400/80 mt-auto">Aisle flow &amp; access speed</span>
                </div>
            </div>

            {/* Main Interactive Digital Twin Floor Plan */}
            {loading ? (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
                    <span className="text-xs uppercase tracking-widest font-bold">Rendering Physical Floor Twin...</span>
                </div>
            ) : layout ? (
                <div className="relative">
                    <WarehouseDigitalTwin
                        layout={layout}
                        selectedRackId={selectedRack?.id || null}
                        onSelectRack={handleSelectRack}
                        locatedTarget={locatedTarget}
                        heatmapMode={heatmapMode}
                        onHeatmapModeChange={setHeatmapMode}
                        is3DView={is3DView}
                        onToggle3DView={() => {
                            playClickBeep();
                            setIs3DView(!is3DView);
                        }}
                    />

                    {/* Non-blocking Slide-over Rack Inspector Drawer */}
                    {selectedRack && (
                        <RackDetailDrawer
                            rack={selectedRack}
                            onClose={() => setSelectedRack(null)}
                            locatedTarget={locatedTarget}
                            onToggleDeadSpot={() => {}}
                        />
                    )}
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                    No layout configuration found for this warehouse facility.
                </div>
            )}
        </div>
    );
}

export default function WarehouseMapPage() {
    return (
        <Suspense fallback={
            <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--color-gold)] mb-2" />
                <span>Loading Warehouse Floor Map...</span>
            </div>
        }>
            <WarehouseMapContent />
        </Suspense>
    );
}
