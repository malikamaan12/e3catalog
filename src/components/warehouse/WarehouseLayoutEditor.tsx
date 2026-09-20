"use client";

import React, { useState } from "react";
import {
    Plus, Trash2, Save, RotateCw, Layers, MapPin,
    Grid, Box, Truck, ShieldAlert, Sparkles, AlertCircle,
    CheckCircle2, RefreshCw
} from "lucide-react";
import { WarehouseLayoutConfig, WarehouseLayoutElement } from "@/lib/db/schema";
import { generateDefaultWarehouseLayout } from "@/lib/warehouse/layout-defaults";

interface WarehouseLayoutEditorProps {
    warehouseId: string;
    warehouseName: string;
    zones: any[];
    initialConfig: WarehouseLayoutConfig;
    onSaveSuccess: (updatedConfig: WarehouseLayoutConfig) => void;
    onCancel: () => void;
}

export default function WarehouseLayoutEditor({
    warehouseId,
    warehouseName,
    zones,
    initialConfig,
    onSaveSuccess,
    onCancel,
}: WarehouseLayoutEditorProps) {
    const [config, setConfig] = useState<WarehouseLayoutConfig>(() => {
        const base = initialConfig || ({} as any);
        return {
            dimensions: {
                widthMeters: base.dimensions?.widthMeters ?? 34,
                lengthMeters: base.dimensions?.lengthMeters ?? 23,
                gridCols: base.dimensions?.gridCols ?? 34,
                gridRows: base.dimensions?.gridRows ?? 23,
                gridScaleMeters: base.dimensions?.gridScaleMeters ?? 1,
            },
            elements: Array.isArray(base.elements) ? JSON.parse(JSON.stringify(base.elements)) : [],
            passages: Array.isArray(base.passages) ? JSON.parse(JSON.stringify(base.passages)) : [],
            defaultAisleWidth: base.defaultAisleWidth ?? 3,
        };
    });
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const selectedElement = (config.elements || []).find((el) => el.id === selectedElementId) || null;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Add New Element
    const handleAddElement = (type: WarehouseLayoutElement["type"]) => {
        const newId = `${type}-${Date.now().toString().slice(-4)}`;
        let newElement: WarehouseLayoutElement;

        const currentElements = config.elements || [];
        if (type === "rack") {
            const nextRackNum = currentElements.filter((e) => e.type === "rack").length + 1;
            newElement = {
                id: newId,
                type: "rack",
                x: 3,
                y: 11,
                width: 5,
                height: 2,
                label: `Rack NEW-${nextRackNum}`,
                rackCode: `RCK-NEW-${nextRackNum}`,
                aisle: "Aisle A",
                levels: 4,
                capacityPerLevel: 25,
                color: "#3b82f6",
                status: "active",
            };
        } else if (type === "dock_door") {
            const nextDock = (config.elements || []).filter((e) => e.type === "dock_door").length + 1;
            newElement = {
                id: newId,
                type: "dock_door",
                x: 2,
                y: 1,
                width: 5,
                height: 3,
                label: `Loading Bay 0${nextDock}`,
                color: "#10b981",
                status: "active",
            };
        } else if (type === "staging") {
            newElement = {
                id: newId,
                type: "staging",
                x: 4,
                y: 6,
                width: 8,
                height: 3,
                label: "Staging Holding Pad",
                color: "#f59e0b",
                status: "active",
            };
        } else {
            newElement = {
                id: newId,
                type: "obstacle",
                x: 10,
                y: 10,
                width: 1,
                height: 1,
                label: "Support Column",
                color: "#64748b",
            };
        }

        setConfig((prev) => ({
            ...prev,
            elements: [...prev.elements, newElement],
        }));
        setSelectedElementId(newId);
        showToast(`Added new ${type.replace("_", " ")}`);
    };

    // Update selected element field
    const handleUpdateSelected = (fields: Partial<WarehouseLayoutElement>) => {
        if (!selectedElementId) return;
        setConfig((prev) => ({
            ...prev,
            elements: prev.elements.map((el) => (el.id === selectedElementId ? { ...el, ...fields } : el)),
        }));
    };

    // Delete selected element
    const handleDeleteSelected = () => {
        if (!selectedElementId) return;
        setConfig((prev) => ({
            ...prev,
            elements: prev.elements.filter((el) => el.id !== selectedElementId),
        }));
        setSelectedElementId(null);
        showToast("Element removed from layout.");
    };

    // Reset to template
    const handleApplyDefaultTemplate = () => {
        if (!confirm("Reset floor plan to the standard logistics template? Custom modifications will be replaced.")) return;
        const fresh = generateDefaultWarehouseLayout(warehouseName, zones);
        setConfig(fresh);
        setSelectedElementId(null);
        showToast("Standard template loaded.");
    };

    // Save to server
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/dashboard/warehouses/${warehouseId}/layout`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ layoutConfig: config }),
            });
            if (res.ok) {
                const data = await res.json();
                showToast("✅ Layout saved successfully!");
                onSaveSuccess(data.layout);
            } else {
                const err = await res.json();
                alert(err.error || "Failed to save layout.");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 bg-slate-950/90 rounded-3xl border border-white/10 text-white animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                            Layout Studio
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Interactive Facility Builder</span>
                    </div>
                    <h2 className="text-2xl font-black mt-1">
                        Editing Layout: <span className="text-[var(--color-gold)]">{warehouseName}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleApplyDefaultTemplate}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Load Blueprint Template
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-xl bg-[var(--color-gold)] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        Save Layout Changes
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-6 z-50 px-5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" /> {toast}
                </div>
            )}

            {/* Palette & Property Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 1. Component Palette */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[var(--color-gold)]" /> Add Layout Elements
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleAddElement("rack")}
                            className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20 text-blue-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                        >
                            <Box className="w-5 h-5" />
                            <span>Storage Rack</span>
                        </button>
                        <button
                            onClick={() => handleAddElement("dock_door")}
                            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                        >
                            <Truck className="w-5 h-5" />
                            <span>Loading Dock</span>
                        </button>
                        <button
                            onClick={() => handleAddElement("staging")}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                        >
                            <Layers className="w-5 h-5" />
                            <span>Staging Bay</span>
                        </button>
                        <button
                            onClick={() => handleAddElement("obstacle")}
                            className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 hover:border-slate-500/50 hover:bg-slate-500/20 text-slate-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                        >
                            <ShieldAlert className="w-5 h-5" />
                            <span>Pillar / Column</span>
                        </button>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                            Facility Dimensions
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-slate-500 block text-[10px]">Width (Meters)</span>
                                <input
                                    type="number"
                                    value={config.dimensions?.widthMeters ?? 34}
                                    onChange={(e) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            dimensions: { ...(prev.dimensions || {}), widthMeters: parseInt(e.target.value) || 30, gridCols: parseInt(e.target.value) || 30, lengthMeters: prev.dimensions?.lengthMeters || 23, gridRows: prev.dimensions?.gridRows || 23, gridScaleMeters: 1 },
                                        }))
                                    }
                                    className="bg-transparent text-white font-bold w-full outline-none mt-1"
                                />
                            </div>
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-slate-500 block text-[10px]">Length (Meters)</span>
                                <input
                                    type="number"
                                    value={config.dimensions?.lengthMeters ?? 23}
                                    onChange={(e) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            dimensions: { ...(prev.dimensions || {}), lengthMeters: parseInt(e.target.value) || 20, gridRows: parseInt(e.target.value) || 20, widthMeters: prev.dimensions?.widthMeters || 34, gridCols: prev.dimensions?.gridCols || 34, gridScaleMeters: 1 },
                                        }))
                                    }
                                    className="bg-transparent text-white font-bold w-full outline-none mt-1"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Elements List & Selection */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 max-h-[460px] overflow-y-auto">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Placed Elements ({(config.elements || []).length})
                    </p>
                    <div className="space-y-1.5">
                        {(config.elements || []).map((el) => (
                            <button
                                key={el.id}
                                onClick={() => setSelectedElementId(el.id)}
                                className={`w-full p-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between border ${
                                    selectedElementId === el.id
                                        ? "bg-[var(--color-gold)]/10 border-[var(--color-gold)] text-white"
                                        : "bg-black/30 border-white/5 text-slate-300 hover:bg-white/5"
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: el.color || "#3b82f6" }}
                                    />
                                    <span className="truncate">{el.label}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
                                    {el.type}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Element Property Inspector */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Property Inspector
                        </p>
                        {selectedElement && (
                            <button
                                onClick={handleDeleteSelected}
                                className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Element
                            </button>
                        )}
                    </div>

                    {selectedElement ? (
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="col-span-2 space-y-1">
                                <label className="text-slate-400 font-bold">Element Label</label>
                                <input
                                    type="text"
                                    value={selectedElement.label}
                                    onChange={(e) => handleUpdateSelected({ label: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            {selectedElement.type === "rack" && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-slate-400 font-bold">Rack Code</label>
                                        <input
                                            type="text"
                                            value={selectedElement.rackCode || ""}
                                            onChange={(e) => handleUpdateSelected({ rackCode: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-400 font-bold">Aisle Identifier</label>
                                        <input
                                            type="text"
                                            value={selectedElement.aisle || ""}
                                            onChange={(e) => handleUpdateSelected({ aisle: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[var(--color-gold)]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-400 font-bold">Vertical Shelf Tiers (Levels)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="6"
                                            value={selectedElement.levels || 4}
                                            onChange={(e) => handleUpdateSelected({ levels: parseInt(e.target.value) || 4 })}
                                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-400 font-bold">Capacity Per Tier</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={selectedElement.capacityPerLevel || 25}
                                            onChange={(e) => handleUpdateSelected({ capacityPerLevel: parseInt(e.target.value) || 25 })}
                                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Position Coordinates (Snap-to-Grid) */}
                            <div className="space-y-1">
                                <label className="text-slate-400 font-bold">Position X (Meters from Left)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={config.dimensions.widthMeters - 1}
                                    value={selectedElement.x}
                                    onChange={(e) => handleUpdateSelected({ x: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-slate-400 font-bold">Position Y (Meters from Top)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={config.dimensions.lengthMeters - 1}
                                    value={selectedElement.y}
                                    onChange={(e) => handleUpdateSelected({ y: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            {/* Dimensions */}
                            <div className="space-y-1">
                                <label className="text-slate-400 font-bold">Width (Meters)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={selectedElement.width}
                                    onChange={(e) => handleUpdateSelected({ width: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-slate-400 font-bold">Depth / Length (Meters)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={selectedElement.height}
                                    onChange={(e) => handleUpdateSelected({ height: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            {/* Dead Spot Flag */}
                            {selectedElement.type === "rack" && (
                                <div className="col-span-2 pt-2 border-t border-white/10 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Cold / Dead Spot Designation</p>
                                        <p className="text-[11px] text-slate-400">Flag for consolidation or seasonal turnover.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdateSelected({
                                                status: selectedElement.status === "dead_spot" ? "active" : "dead_spot",
                                            })
                                        }
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                            selectedElement.status === "dead_spot"
                                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                                        }`}
                                    >
                                        {selectedElement.status === "dead_spot" ? "❄ Dead Spot Active" : "Normal Active"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
                            <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Select any element from the list or canvas to modify its properties.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
