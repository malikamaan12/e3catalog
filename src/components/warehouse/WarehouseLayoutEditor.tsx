"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
    Plus, Trash2, Save, RotateCw, Layers, MapPin,
    Grid, Box, Truck, ShieldAlert, Sparkles, AlertCircle,
    CheckCircle2, RefreshCw, ZoomIn, ZoomOut, RotateCcw,
    Copy, Move, CornerDownRight, AlertTriangle, Sliders,
    Maximize2, Info, Search, Magnet, ArrowRight
} from "lucide-react";
import { WarehouseLayoutConfig, WarehouseLayoutElement, WarehousePassage } from "@/lib/db/schema";
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
    const [sidebarTab, setSidebarTab] = useState<"palette" | "elements">("palette");
    const [searchQuery, setSearchQuery] = useState("");

    // Visual Canvas State
    const [zoom, setZoom] = useState(1);
    const [snapStep, setSnapStep] = useState<number>(1.0); // 1m or 0.5m
    const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

    // Drag & Resize State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [resizingId, setResizingId] = useState<string | null>(null);
    const dragStartRef = useRef<{
        pointerStartX: number;
        pointerStartY: number;
        elStartX: number;
        elStartY: number;
        elStartW: number;
        elStartH: number;
    } | null>(null);

    const canvasSvgRef = useRef<SVGSVGElement>(null);
    const cellPx = 28; // Pixels per meter

    const widthM = config.dimensions?.widthMeters ?? 34;
    const lengthM = config.dimensions?.lengthMeters ?? 23;
    const svgW = widthM * cellPx;
    const svgH = lengthM * cellPx;

    const selectedElement = useMemo(
        () => (config.elements || []).find((el) => el.id === selectedElementId) || null,
        [config.elements, selectedElementId]
    );

    // Overlap / Collision Detection
    const overlappingElementIds = useMemo(() => {
        const overlaps = new Set<string>();
        const elems = config.elements || [];
        for (let i = 0; i < elems.length; i++) {
            for (let j = i + 1; j < elems.length; j++) {
                const a = elems[i];
                const b = elems[j];
                const isOverlapping =
                    a.x < b.x + b.width &&
                    a.x + a.width > b.x &&
                    a.y < b.y + b.height &&
                    a.y + a.height > b.y;
                if (isOverlapping) {
                    overlaps.add(a.id);
                    overlaps.add(b.id);
                }
            }
        }
        return overlaps;
    }, [config.elements]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // --- ELEMENT CREATION ---
    const handleAddElement = (type: WarehouseLayoutElement["type"], customCoords?: { x: number; y: number }) => {
        const newId = `${type}-${Date.now().toString().slice(-4)}`;
        let newElement: WarehouseLayoutElement;
        const currentElements = config.elements || [];

        // Fallback or specified coordinates
        const posX = customCoords ? customCoords.x : Math.min(4, Math.max(0, widthM - 6));
        const posY = customCoords ? customCoords.y : Math.min(4, Math.max(0, lengthM - 3));

        if (type === "rack") {
            const nextRackNum = currentElements.filter((e) => e.type === "rack").length + 1;
            newElement = {
                id: newId,
                type: "rack",
                x: posX,
                y: posY,
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
            const nextDock = currentElements.filter((e) => e.type === "dock_door").length + 1;
            newElement = {
                id: newId,
                type: "dock_door",
                x: posX,
                y: posY,
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
                x: posX,
                y: posY,
                width: 8,
                height: 3,
                label: "Staging Holding Bay",
                color: "#f59e0b",
                status: "active",
            };
        } else {
            newElement = {
                id: newId,
                type: "obstacle",
                x: posX,
                y: posY,
                width: 1,
                height: 1,
                label: "Building Column",
                color: "#64748b",
            };
        }

        setConfig((prev) => ({
            ...prev,
            elements: [...prev.elements, newElement],
        }));
        setSelectedElementId(newId);
        showToast(`Added ${newElement.label}`);
    };

    // --- ELEMENT MUTATION ---
    const handleUpdateSelected = (fields: Partial<WarehouseLayoutElement>) => {
        if (!selectedElementId) return;
        setConfig((prev) => ({
            ...prev,
            elements: prev.elements.map((el) => (el.id === selectedElementId ? { ...el, ...fields } : el)),
        }));
    };

    const handleDeleteSelected = () => {
        if (!selectedElementId) return;
        setConfig((prev) => ({
            ...prev,
            elements: prev.elements.filter((el) => el.id !== selectedElementId),
        }));
        setSelectedElementId(null);
        showToast("Element removed from layout");
    };

    const handleRotateSelected = () => {
        if (!selectedElement) return;
        const newW = selectedElement.height;
        const newH = selectedElement.width;
        // Keep within bounds
        const safeX = Math.min(selectedElement.x, widthM - newW);
        const safeY = Math.min(selectedElement.y, lengthM - newH);

        handleUpdateSelected({
            width: newW,
            height: newH,
            x: Math.max(0, safeX),
            y: Math.max(0, safeY),
            orientation: selectedElement.orientation === "horizontal" ? "vertical" : "horizontal",
        });
        showToast("Rotated 90°");
    };

    const handleDuplicateSelected = () => {
        if (!selectedElement) return;
        const newId = `${selectedElement.type}-${Date.now().toString().slice(-4)}`;
        // Shift +2m right or down
        let newX = selectedElement.x + selectedElement.width + 1;
        let newY = selectedElement.y;
        if (newX + selectedElement.width > widthM) {
            newX = selectedElement.x;
            newY = Math.min(lengthM - selectedElement.height, selectedElement.y + selectedElement.height + 1);
        }

        const clone: WarehouseLayoutElement = {
            ...JSON.parse(JSON.stringify(selectedElement)),
            id: newId,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            label: `${selectedElement.label} (Copy)`,
            rackCode: selectedElement.rackCode ? `${selectedElement.rackCode}-CP` : undefined,
        };

        setConfig((prev) => ({
            ...prev,
            elements: [...prev.elements, clone],
        }));
        setSelectedElementId(newId);
        showToast("Duplicated element");
    };

    // Quick Wall Alignment Presets
    const handleAlign = (type: "left" | "right" | "top" | "bottom" | "center_x") => {
        if (!selectedElement) return;
        if (type === "left") handleUpdateSelected({ x: 0 });
        if (type === "right") handleUpdateSelected({ x: widthM - selectedElement.width });
        if (type === "top") handleUpdateSelected({ y: 0 });
        if (type === "bottom") handleUpdateSelected({ y: lengthM - selectedElement.height });
        if (type === "center_x") handleUpdateSelected({ x: Math.round((widthM - selectedElement.width) / 2) });
    };

    // --- VISUAL CANVAS POINTER INTERACTIONS ---
    const handleElementPointerDown = (e: React.PointerEvent, el: WarehouseLayoutElement) => {
        e.stopPropagation();
        setSelectedElementId(el.id);
        setDraggingId(el.id);

        dragStartRef.current = {
            pointerStartX: e.clientX,
            pointerStartY: e.clientY,
            elStartX: el.x,
            elStartY: el.y,
            elStartW: el.width,
            elStartH: el.height,
        };

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleResizePointerDown = (e: React.PointerEvent, el: WarehouseLayoutElement) => {
        e.stopPropagation();
        setSelectedElementId(el.id);
        setResizingId(el.id);

        dragStartRef.current = {
            pointerStartX: e.clientX,
            pointerStartY: e.clientY,
            elStartX: el.x,
            elStartY: el.y,
            elStartW: el.width,
            elStartH: el.height,
        };

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleCanvasPointerMove = (e: React.PointerEvent) => {
        if (!canvasSvgRef.current) return;
        const rect = canvasSvgRef.current.getBoundingClientRect();
        const rawMetersX = (e.clientX - rect.left) / (cellPx * zoom);
        const rawMetersY = (e.clientY - rect.top) / (cellPx * zoom);

        const boundedX = Math.max(0, Math.min(widthM, Math.round(rawMetersX * 2) / 2));
        const boundedY = Math.max(0, Math.min(lengthM, Math.round(rawMetersY * 2) / 2));
        setHoverCoords({ x: boundedX, y: boundedY });

        // Handle Drag Moving
        if (draggingId && dragStartRef.current) {
            const dxPx = e.clientX - dragStartRef.current.pointerStartX;
            const dyPx = e.clientY - dragStartRef.current.pointerStartY;
            const dxM = dxPx / (cellPx * zoom);
            const dyM = dyPx / (cellPx * zoom);

            let newX = dragStartRef.current.elStartX + dxM;
            let newY = dragStartRef.current.elStartY + dyM;

            // Apply Snap
            newX = Math.round(newX / snapStep) * snapStep;
            newY = Math.round(newY / snapStep) * snapStep;

            // Bounds check
            const el = config.elements.find((item) => item.id === draggingId);
            if (el) {
                newX = Math.max(0, Math.min(widthM - el.width, newX));
                newY = Math.max(0, Math.min(lengthM - el.height, newY));

                setConfig((prev) => ({
                    ...prev,
                    elements: prev.elements.map((item) =>
                        item.id === draggingId ? { ...item, x: newX, y: newY } : item
                    ),
                }));
            }
        }

        // Handle Resizing
        if (resizingId && dragStartRef.current) {
            const dxPx = e.clientX - dragStartRef.current.pointerStartX;
            const dyPx = e.clientY - dragStartRef.current.pointerStartY;
            const dxM = dxPx / (cellPx * zoom);
            const dyM = dyPx / (cellPx * zoom);

            let newW = dragStartRef.current.elStartW + dxM;
            let newH = dragStartRef.current.elStartH + dyM;

            newW = Math.max(1, Math.round(newW / snapStep) * snapStep);
            newH = Math.max(1, Math.round(newH / snapStep) * snapStep);

            // Bounds check against warehouse edges
            const el = config.elements.find((item) => item.id === resizingId);
            if (el) {
                newW = Math.min(widthM - el.x, newW);
                newH = Math.min(lengthM - el.y, newH);

                setConfig((prev) => ({
                    ...prev,
                    elements: prev.elements.map((item) =>
                        item.id === resizingId ? { ...item, width: newW, height: newH } : item
                    ),
                }));
            }
        }
    };

    const handlePointerUp = () => {
        setDraggingId(null);
        setResizingId(null);
        dragStartRef.current = null;
    };

    // Drag-and-Drop from Left Palette onto SVG Canvas
    const handleCanvasDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/x-warehouse-element") as WarehouseLayoutElement["type"];
        if (!type || !canvasSvgRef.current) return;

        const rect = canvasSvgRef.current.getBoundingClientRect();
        const rawMetersX = (e.clientX - rect.left) / (cellPx * zoom);
        const rawMetersY = (e.clientY - rect.top) / (cellPx * zoom);

        const dropX = Math.max(0, Math.min(widthM - 5, Math.round(rawMetersX)));
        const dropY = Math.max(0, Math.min(lengthM - 2, Math.round(rawMetersY)));

        handleAddElement(type, { x: dropX, y: dropY });
    };

    // Apply Blueprint Template
    const handleApplyDefaultTemplate = () => {
        if (!confirm("Reset floor plan to standard logistics template? Custom modifications will be replaced.")) return;
        const fresh = generateDefaultWarehouseLayout(warehouseName, zones);
        setConfig(fresh);
        setSelectedElementId(null);
        showToast("Standard logistics template loaded");
    };

    // Save to Database API
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

    // Filtered elements for list
    const filteredElements = useMemo(() => {
        if (!searchQuery.trim()) return config.elements || [];
        const q = searchQuery.toLowerCase();
        return (config.elements || []).filter(
            (el) =>
                el.label.toLowerCase().includes(q) ||
                el.type.toLowerCase().includes(q) ||
                (el.rackCode && el.rackCode.toLowerCase().includes(q))
        );
    }, [config.elements, searchQuery]);

    return (
        <div className="flex flex-col gap-4 bg-slate-950/95 rounded-3xl border border-white/10 text-white shadow-2xl p-4 md:p-6 animate-in fade-in duration-200">
            {/* Top Workspace Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)]">
                        <Grid className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                                Visual Studio Editor
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                {widthM}m × {lengthM}m ({widthM * lengthM} m²)
                            </span>
                            {overlappingElementIds.size > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3" />
                                    {overlappingElementIds.size / 2} Overlap Alert
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl md:text-2xl font-black mt-0.5">
                            Editing Facility: <span className="text-[var(--color-gold)]">{warehouseName}</span>
                        </h2>
                    </div>
                </div>

                {/* Quick Interactive Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Grid Snap Selector */}
                    <button
                        onClick={() => setSnapStep((s) => (s === 1.0 ? 0.5 : 1.0))}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                            snapStep === 0.5
                                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                                : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                        }`}
                        title="Toggle Snap Resolution"
                    >
                        <Magnet className="w-3.5 h-3.5" />
                        Snap: {snapStep}m
                    </button>

                    <div className="w-[1px] h-5 bg-white/10 mx-1 hidden sm:block" />

                    {/* Selected Element Controls */}
                    <button
                        onClick={handleRotateSelected}
                        disabled={!selectedElement}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                        title="Rotate 90 Degrees"
                    >
                        <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
                    </button>

                    <button
                        onClick={handleDuplicateSelected}
                        disabled={!selectedElement}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                        title="Duplicate Element"
                    >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>

                    <button
                        onClick={handleDeleteSelected}
                        disabled={!selectedElement}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                        title="Delete Element"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>

                    <div className="w-[1px] h-5 bg-white/10 mx-1 hidden sm:block" />

                    {/* Blueprint Template & Save */}
                    <button
                        onClick={handleApplyDefaultTemplate}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Blueprint
                    </button>

                    <button
                        onClick={onCancel}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-black font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
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

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-6 right-6 z-50 px-5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toast}
                </div>
            )}

            {/* Main Visual Studio Workstation Layout: 3 Panels */}
            <div className="flex flex-col xl:flex-row gap-5 min-h-[680px]">
                {/* ──────────────── 1. LEFT PANEL: Palette & Placed Elements (280px) ──────────────── */}
                <div className="w-full xl:w-[280px] shrink-0 flex flex-col gap-4">
                    {/* Sidebar Tabs */}
                    <div className="flex rounded-2xl bg-black/40 border border-white/10 p-1">
                        <button
                            onClick={() => setSidebarTab("palette")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                sidebarTab === "palette"
                                    ? "bg-[var(--color-gold)] text-black shadow-md"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Elements
                        </button>
                        <button
                            onClick={() => setSidebarTab("elements")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                sidebarTab === "elements"
                                    ? "bg-[var(--color-gold)] text-black shadow-md"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" /> Elements ({config.elements.length})
                        </button>
                    </div>

                    {/* Tab 1: Draggable Component Palette */}
                    {sidebarTab === "palette" && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-2.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Click or Drag onto Canvas
                                </p>

                                {/* Palette Item: Storage Rack */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("application/x-warehouse-element", "rack");
                                    }}
                                    onClick={() => handleAddElement("rack")}
                                    className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20 transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 group"
                                >
                                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
                                        <Box className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-blue-300">Storage Rack</div>
                                        <div className="text-[10px] text-slate-400 font-mono">4 Tiers • 5m × 2m Pallet Shelf</div>
                                    </div>
                                    <Plus className="w-4 h-4 text-blue-400/50 group-hover:text-blue-400" />
                                </div>

                                {/* Palette Item: Loading Dock */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("application/x-warehouse-element", "dock_door");
                                    }}
                                    onClick={() => handleAddElement("dock_door")}
                                    className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 group"
                                >
                                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-emerald-300">Loading Dock</div>
                                        <div className="text-[10px] text-slate-400 font-mono">Roll-up Bay • 5m × 3m Access</div>
                                    </div>
                                    <Plus className="w-4 h-4 text-emerald-400/50 group-hover:text-emerald-400" />
                                </div>

                                {/* Palette Item: Staging Bay */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("application/x-warehouse-element", "staging");
                                    }}
                                    onClick={() => handleAddElement("staging")}
                                    className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/20 transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 group"
                                >
                                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-amber-300">Staging Bay</div>
                                        <div className="text-[10px] text-slate-400 font-mono">Floor Pad • 8m × 3m Staging</div>
                                    </div>
                                    <Plus className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400" />
                                </div>

                                {/* Palette Item: Structural Obstacle */}
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("application/x-warehouse-element", "obstacle");
                                    }}
                                    onClick={() => handleAddElement("obstacle")}
                                    className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 hover:border-slate-500/50 hover:bg-slate-500/20 transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 group"
                                >
                                    <div className="p-2 rounded-xl bg-slate-500/20 text-slate-400 group-hover:scale-105 transition-transform">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-300">Pillar / Column</div>
                                        <div className="text-[10px] text-slate-400 font-mono">Structural Pillar • 1m × 1m</div>
                                    </div>
                                    <Plus className="w-4 h-4 text-slate-400/50 group-hover:text-slate-400" />
                                </div>
                            </div>

                            {/* Facility Dimensions Adjuster */}
                            <div className="pt-3 border-t border-white/10 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Perimeter Boundary
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                                        <span className="text-slate-500 text-[9px] block">Width (Meters)</span>
                                        <input
                                            type="number"
                                            min="15"
                                            max="100"
                                            value={widthM}
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value) || 30;
                                                setConfig((prev) => ({
                                                    ...prev,
                                                    dimensions: { ...prev.dimensions, widthMeters: v, gridCols: v },
                                                }));
                                            }}
                                            className="bg-transparent text-white font-bold w-full outline-none mt-0.5"
                                        />
                                    </div>
                                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                                        <span className="text-slate-500 text-[9px] block">Depth (Meters)</span>
                                        <input
                                            type="number"
                                            min="10"
                                            max="80"
                                            value={lengthM}
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value) || 20;
                                                setConfig((prev) => ({
                                                    ...prev,
                                                    dimensions: { ...prev.dimensions, lengthMeters: v, gridRows: v },
                                                }));
                                            }}
                                            className="bg-transparent text-white font-bold w-full outline-none mt-0.5"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Searchable Placed Elements List */}
                    {sidebarTab === "elements" && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 flex-1 flex flex-col overflow-hidden">
                            {/* Search box */}
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search elements..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            {/* Elements List */}
                            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 max-h-[500px]">
                                {filteredElements.map((el) => {
                                    const isSelected = selectedElementId === el.id;
                                    const hasOverlap = overlappingElementIds.has(el.id);
                                    return (
                                        <button
                                            key={el.id}
                                            onClick={() => setSelectedElementId(el.id)}
                                            className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between border ${
                                                isSelected
                                                    ? "bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-white shadow-md shadow-amber-500/10"
                                                    : hasOverlap
                                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                                                    : "bg-black/30 border-white/5 text-slate-300 hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: el.color || "#3b82f6" }}
                                                />
                                                <span className="truncate font-medium">{el.label}</span>
                                            </div>
                                            <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">
                                                {el.x}m,{el.y}m
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ──────────────── 2. CENTER: Calibrated Visual Canvas (Flex 1) ──────────────── */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Top Canvas Bar: Rulers info & Zoom */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-2xl bg-black/40 border border-white/10 text-xs">
                        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                            <span className="flex items-center gap-1">
                                <Move className="w-3 h-3 text-[var(--color-gold)]" /> Click & Drag to move
                            </span>
                            <span className="hidden sm:inline text-slate-600">•</span>
                            <span className="hidden sm:inline">Corner handle to resize</span>
                            {hoverCoords && (
                                <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-[var(--color-gold)] font-bold">
                                        X: {hoverCoords.x}m, Y: {hoverCoords.y}m
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-slate-300 w-9 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setZoom(1)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Reset Zoom"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Interactive Canvas Viewport */}
                    <div
                        className="relative w-full h-[620px] bg-slate-950 rounded-2xl border border-white/10 overflow-auto p-8 flex select-none shadow-inner"
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handlePointerUp}
                        onDragOver={handleCanvasDragOver}
                        onDrop={handleCanvasDrop}
                    >
                        <div
                            className="relative m-auto shrink-0 origin-center transition-transform duration-100"
                            style={{
                                transform: `scale(${zoom})`,
                                width: `${svgW}px`,
                                height: `${svgH}px`,
                            }}
                        >
                            {/* Metric Rulers: Top & Left */}
                            <div
                                className="absolute -top-6 left-0 right-0 h-5 flex justify-between text-[9px] font-mono text-slate-500 pointer-events-none px-1"
                                style={{ width: `${svgW}px` }}
                            >
                                {Array.from({ length: Math.floor(widthM / 5) + 1 }).map((_, i) => (
                                    <span key={i} style={{ position: "absolute", left: `${i * 5 * cellPx}px` }}>
                                        {i * 5}m
                                    </span>
                                ))}
                                <span style={{ position: "absolute", right: 0 }}>{widthM}m</span>
                            </div>

                            <div
                                className="absolute top-0 -left-6 bottom-0 w-5 flex flex-col justify-between text-[9px] font-mono text-slate-500 pointer-events-none py-1"
                                style={{ height: `${svgH}px` }}
                            >
                                {Array.from({ length: Math.floor(lengthM / 5) + 1 }).map((_, i) => (
                                    <span key={i} style={{ position: "absolute", top: `${i * 5 * cellPx}px` }}>
                                        {i * 5}m
                                    </span>
                                ))}
                                <span style={{ position: "absolute", bottom: 0 }}>{lengthM}m</span>
                            </div>

                            {/* Main Interactive SVG */}
                            <svg
                                ref={canvasSvgRef}
                                width={svgW}
                                height={svgH}
                                viewBox={`0 0 ${svgW} ${svgH}`}
                                className="rounded-2xl border-2 border-white/20 bg-slate-900/90 shadow-2xl overflow-visible"
                                onClick={() => setSelectedElementId(null)}
                            >
                                <defs>
                                    {/* 1m fine grid */}
                                    <pattern id="grid-1m" width={cellPx} height={cellPx} patternUnits="userSpaceOnUse">
                                        <path
                                            d={`M ${cellPx} 0 L 0 0 0 ${cellPx}`}
                                            fill="none"
                                            stroke="rgba(255, 255, 255, 0.05)"
                                            strokeWidth="1"
                                        />
                                    </pattern>

                                    {/* 5m major grid */}
                                    <pattern
                                        id="grid-5m"
                                        width={cellPx * 5}
                                        height={cellPx * 5}
                                        patternUnits="userSpaceOnUse"
                                    >
                                        <path
                                            d={`M ${cellPx * 5} 0 L 0 0 0 ${cellPx * 5}`}
                                            fill="none"
                                            stroke="rgba(255, 255, 255, 0.12)"
                                            strokeWidth="1.2"
                                        />
                                    </pattern>

                                    {/* Hazard striping for passages */}
                                    <pattern
                                        id="hazard-stripes"
                                        width="20"
                                        height="20"
                                        patternTransform="rotate(45 0 0)"
                                        patternUnits="userSpaceOnUse"
                                    >
                                        <line
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="20"
                                            stroke="rgba(234, 179, 8, 0.12)"
                                            strokeWidth="10"
                                        />
                                    </pattern>

                                    {/* Column hatch */}
                                    <pattern
                                        id="pillar-hatch"
                                        width="8"
                                        height="8"
                                        patternTransform="rotate(45 0 0)"
                                        patternUnits="userSpaceOnUse"
                                    >
                                        <line
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="8"
                                            stroke="rgba(148, 163, 184, 0.4)"
                                            strokeWidth="3"
                                        />
                                    </pattern>
                                </defs>

                                {/* Background Grids */}
                                <rect width="100%" height="100%" fill="url(#grid-1m)" />
                                <rect width="100%" height="100%" fill="url(#grid-5m)" />

                                {/* Forklift Passages */}
                                {(config.passages || []).map((p) => {
                                    const pxX = p.x1 * cellPx;
                                    const pxY = p.y1 * cellPx;
                                    const pxW = (p.x2 - p.x1) * cellPx;
                                    const pxH = (p.y2 - p.y1) * cellPx;
                                    return (
                                        <g key={p.id} opacity={0.8}>
                                            <rect
                                                x={pxX}
                                                y={pxY}
                                                width={pxW}
                                                height={pxH}
                                                fill="url(#hazard-stripes)"
                                                stroke="rgba(234, 179, 8, 0.25)"
                                                strokeDasharray="4 4"
                                            />
                                            <text
                                                x={pxX + pxW / 2}
                                                y={pxY + pxH / 2 + 4}
                                                fill="rgba(234, 179, 8, 0.5)"
                                                fontSize="10"
                                                fontWeight="bold"
                                                fontFamily="monospace"
                                                textAnchor="middle"
                                            >
                                                {p.name}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Placed Elements Rendering */}
                                {config.elements.map((el) => {
                                    const isSelected = selectedElementId === el.id;
                                    const hasOverlap = overlappingElementIds.has(el.id);
                                    const elPxX = el.x * cellPx;
                                    const elPxY = el.y * cellPx;
                                    const elPxW = el.width * cellPx;
                                    const elPxH = el.height * cellPx;

                                    return (
                                        <g
                                            key={el.id}
                                            id={`layout-el-${el.id}`}
                                            transform={`translate(${elPxX}, ${elPxY})`}
                                            className="cursor-grab active:cursor-grabbing transition-opacity"
                                            style={{ pointerEvents: "all" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedElementId(el.id);
                                            }}
                                            onPointerDown={(e) => handleElementPointerDown(e, el)}
                                        >
                                            {/* Overlap Alert Glow */}
                                            {hasOverlap && (
                                                <rect
                                                    x={-4}
                                                    y={-4}
                                                    width={elPxW + 8}
                                                    height={elPxH + 8}
                                                    fill="none"
                                                    stroke="#f59e0b"
                                                    strokeWidth="2"
                                                    strokeDasharray="4 2"
                                                    rx={10}
                                                    className="animate-pulse"
                                                />
                                            )}

                                            {/* Element Body based on Type */}
                                            {el.type === "rack" && (
                                                <>
                                                    {/* Rack Base */}
                                                    <rect
                                                        x={0}
                                                        y={0}
                                                        width={elPxW}
                                                        height={elPxH}
                                                        rx={6}
                                                        fill={
                                                            el.status === "dead_spot"
                                                                ? "rgba(99, 102, 241, 0.25)"
                                                                : "rgba(59, 130, 246, 0.2)"
                                                        }
                                                        stroke={
                                                            isSelected
                                                                ? "#eab308"
                                                                : el.status === "dead_spot"
                                                                ? "#818cf8"
                                                                : el.color || "#3b82f6"
                                                        }
                                                        strokeWidth={isSelected ? 2.5 : 1.5}
                                                    />

                                                    {/* Vertical Shelf Tiers */}
                                                    {Array.from({ length: (el.levels || 4) - 1 }).map((_, idx) => {
                                                        const tierY = ((idx + 1) / (el.levels || 4)) * elPxH;
                                                        return (
                                                            <line
                                                                key={idx}
                                                                x1={0}
                                                                y1={tierY}
                                                                x2={elPxW}
                                                                y2={tierY}
                                                                stroke="rgba(255, 255, 255, 0.15)"
                                                                strokeDasharray="2 2"
                                                            />
                                                        );
                                                    })}

                                                    {/* Rack Label */}
                                                    <text
                                                        x={elPxW / 2}
                                                        y={elPxH / 2 - 2}
                                                        fill="#ffffff"
                                                        fontSize="10"
                                                        fontWeight="900"
                                                        fontFamily="monospace"
                                                        textAnchor="middle"
                                                    >
                                                        {el.rackCode || el.label}
                                                    </text>
                                                    <text
                                                        x={elPxW / 2}
                                                        y={elPxH / 2 + 10}
                                                        fill="rgba(255, 255, 255, 0.6)"
                                                        fontSize="8"
                                                        fontFamily="monospace"
                                                        textAnchor="middle"
                                                    >
                                                        {el.levels || 4} Tiers • {el.capacityPerLevel || 25}u
                                                    </text>
                                                </>
                                            )}

                                            {el.type === "dock_door" && (
                                                <>
                                                    <rect
                                                        x={0}
                                                        y={0}
                                                        width={elPxW}
                                                        height={elPxH}
                                                        rx={6}
                                                        fill="rgba(16, 185, 129, 0.2)"
                                                        stroke={isSelected ? "#eab308" : "#10b981"}
                                                        strokeWidth={isSelected ? 2.5 : 2}
                                                    />
                                                    <line
                                                        x1={0}
                                                        y1={4}
                                                        x2={elPxW}
                                                        y2={4}
                                                        stroke="#10b981"
                                                        strokeWidth="3"
                                                    />
                                                    <text
                                                        x={elPxW / 2}
                                                        y={elPxH / 2 + 3}
                                                        fill="#10b981"
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fontFamily="monospace"
                                                        textAnchor="middle"
                                                    >
                                                        {el.label}
                                                    </text>
                                                </>
                                            )}

                                            {el.type === "staging" && (
                                                <>
                                                    <rect
                                                        x={0}
                                                        y={0}
                                                        width={elPxW}
                                                        height={elPxH}
                                                        rx={6}
                                                        fill="rgba(245, 158, 11, 0.15)"
                                                        stroke={isSelected ? "#eab308" : "#f59e0b"}
                                                        strokeWidth={isSelected ? 2.5 : 1.5}
                                                        strokeDasharray="6 4"
                                                    />
                                                    <text
                                                        x={elPxW / 2}
                                                        y={elPxH / 2 + 3}
                                                        fill="#fbbf24"
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fontFamily="monospace"
                                                        textAnchor="middle"
                                                    >
                                                        {el.label}
                                                    </text>
                                                </>
                                            )}

                                            {el.type === "obstacle" && (
                                                <>
                                                    <rect
                                                        x={0}
                                                        y={0}
                                                        width={elPxW}
                                                        height={elPxH}
                                                        rx={4}
                                                        fill="url(#pillar-hatch)"
                                                        stroke={isSelected ? "#eab308" : "#94a3b8"}
                                                        strokeWidth={isSelected ? 2.5 : 1.5}
                                                    />
                                                    <text
                                                        x={elPxW / 2}
                                                        y={elPxH + 12}
                                                        fill="#94a3b8"
                                                        fontSize="8"
                                                        fontFamily="monospace"
                                                        textAnchor="middle"
                                                    >
                                                        {el.label}
                                                    </text>
                                                </>
                                            )}

                                            {/* Selection Highlight & Dimension Tag */}
                                            {isSelected && (
                                                <>
                                                    <rect
                                                        x={-2}
                                                        y={-2}
                                                        width={elPxW + 4}
                                                        height={elPxH + 4}
                                                        rx={8}
                                                        fill="none"
                                                        stroke="#eab308"
                                                        strokeWidth="2"
                                                    />
                                                    {/* Dimension pill above element */}
                                                    <rect
                                                        x={elPxW / 2 - 28}
                                                        y={-18}
                                                        width={56}
                                                        height={14}
                                                        rx={4}
                                                        fill="#000000"
                                                        stroke="#eab308"
                                                        strokeWidth="1"
                                                    />
                                                    <text
                                                        x={elPxW / 2}
                                                        y={-8}
                                                        fill="#eab308"
                                                        fontSize="8"
                                                        fontWeight="bold"
                                                        fontFamily="monospace"
                                                        textAnchor="middle"
                                                    >
                                                        {el.width}m × {el.height}m
                                                    </text>

                                                    {/* Dedicated Corner Resize Handle (Bottom-Right) */}
                                                    <g
                                                        id="resize-handle"
                                                        transform={`translate(${elPxW - 4}, ${elPxH - 4})`}
                                                        className="cursor-se-resize"
                                                        onPointerDown={(e) => handleResizePointerDown(e, el)}
                                                    >
                                                        <rect
                                                            x={-4}
                                                            y={-4}
                                                            width={12}
                                                            height={12}
                                                            rx={3}
                                                            fill="#eab308"
                                                            stroke="#000000"
                                                            strokeWidth="1.5"
                                                        />
                                                    </g>
                                                </>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>
                </div>

                {/* ──────────────── 3. RIGHT PANEL: Property Inspector (320px) ──────────────── */}
                <div className="w-full xl:w-[320px] shrink-0 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-[var(--color-gold)]" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Inspector
                                </p>
                            </div>
                            {selectedElement && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-amber-500/20">
                                    {selectedElement.type}
                                </span>
                            )}
                        </div>

                        {selectedElement ? (
                            <div className="space-y-3.5 text-xs">
                                {/* Label */}
                                <div className="space-y-1">
                                    <label className="text-slate-400 font-bold block text-[11px]">Element Label</label>
                                    <input
                                        type="text"
                                        value={selectedElement.label}
                                        onChange={(e) => handleUpdateSelected({ label: e.target.value })}
                                        className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[var(--color-gold)]"
                                    />
                                </div>

                                {/* Rack Specific Fields */}
                                {selectedElement.type === "rack" && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-slate-400 font-bold block text-[10px]">Rack Code</label>
                                                <input
                                                    type="text"
                                                    value={selectedElement.rackCode || ""}
                                                    onChange={(e) =>
                                                        handleUpdateSelected({ rackCode: e.target.value.toUpperCase() })
                                                    }
                                                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)] text-[11px]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-400 font-bold block text-[10px]">Aisle ID</label>
                                                <input
                                                    type="text"
                                                    value={selectedElement.aisle || ""}
                                                    onChange={(e) => handleUpdateSelected({ aisle: e.target.value })}
                                                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[var(--color-gold)] text-[11px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-slate-400 font-bold block text-[10px]">Shelf Tiers</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="6"
                                                    value={selectedElement.levels || 4}
                                                    onChange={(e) =>
                                                        handleUpdateSelected({ levels: parseInt(e.target.value) || 4 })
                                                    }
                                                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)] text-[11px]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-slate-400 font-bold block text-[10px]">Cap / Tier</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={selectedElement.capacityPerLevel || 25}
                                                    onChange={(e) =>
                                                        handleUpdateSelected({
                                                            capacityPerLevel: parseInt(e.target.value) || 25,
                                                        })
                                                    }
                                                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono outline-none focus:border-[var(--color-gold)] text-[11px]"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Spatial Coordinates (X, Y) */}
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold block text-[10px]">Position (Meters)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1 p-1.5 rounded-xl bg-black/40 border border-white/10">
                                            <span className="text-slate-500 font-mono text-[10px] pl-1">X:</span>
                                            <input
                                                type="number"
                                                step={snapStep}
                                                min="0"
                                                max={widthM - selectedElement.width}
                                                value={selectedElement.x}
                                                onChange={(e) =>
                                                    handleUpdateSelected({ x: parseFloat(e.target.value) || 0 })
                                                }
                                                className="bg-transparent text-white font-mono font-bold w-full outline-none text-xs"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 p-1.5 rounded-xl bg-black/40 border border-white/10">
                                            <span className="text-slate-500 font-mono text-[10px] pl-1">Y:</span>
                                            <input
                                                type="number"
                                                step={snapStep}
                                                min="0"
                                                max={lengthM - selectedElement.height}
                                                value={selectedElement.y}
                                                onChange={(e) =>
                                                    handleUpdateSelected({ y: parseFloat(e.target.value) || 0 })
                                                }
                                                className="bg-transparent text-white font-mono font-bold w-full outline-none text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Dimensions (Width, Depth) */}
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold block text-[10px]">Dimensions (Meters)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1 p-1.5 rounded-xl bg-black/40 border border-white/10">
                                            <span className="text-slate-500 font-mono text-[10px] pl-1">W:</span>
                                            <input
                                                type="number"
                                                step={snapStep}
                                                min="1"
                                                value={selectedElement.width}
                                                onChange={(e) =>
                                                    handleUpdateSelected({ width: parseFloat(e.target.value) || 1 })
                                                }
                                                className="bg-transparent text-white font-mono font-bold w-full outline-none text-xs"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 p-1.5 rounded-xl bg-black/40 border border-white/10">
                                            <span className="text-slate-500 font-mono text-[10px] pl-1">D:</span>
                                            <input
                                                type="number"
                                                step={snapStep}
                                                min="1"
                                                value={selectedElement.height}
                                                onChange={(e) =>
                                                    handleUpdateSelected({ height: parseFloat(e.target.value) || 1 })
                                                }
                                                className="bg-transparent text-white font-mono font-bold w-full outline-none text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Alignment Presets */}
                                <div className="pt-2 border-t border-white/10 space-y-1">
                                    <span className="text-slate-400 font-bold block text-[10px]">Quick Align</span>
                                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                                        <button
                                            onClick={() => handleAlign("left")}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                        >
                                            Left Wall
                                        </button>
                                        <button
                                            onClick={() => handleAlign("center_x")}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                        >
                                            Center X
                                        </button>
                                        <button
                                            onClick={() => handleAlign("right")}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                        >
                                            Right Wall
                                        </button>
                                        <button
                                            onClick={() => handleAlign("top")}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                        >
                                            Top Wall
                                        </button>
                                        <button
                                            onClick={() => handleAlign("bottom")}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                        >
                                            Bottom Wall
                                        </button>
                                        <button
                                            onClick={handleRotateSelected}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                                        >
                                            Rotate 90°
                                        </button>
                                    </div>
                                </div>

                                {/* Dead Spot Designation */}
                                {selectedElement.type === "rack" && (
                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white text-[11px]">Dead Spot Flag</p>
                                            <p className="text-[9px] text-slate-400">Flag for seasonal consolidation</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleUpdateSelected({
                                                    status: selectedElement.status === "dead_spot" ? "active" : "dead_spot",
                                                })
                                            }
                                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors ${
                                                selectedElement.status === "dead_spot"
                                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                                    : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                                            }`}
                                        >
                                            {selectedElement.status === "dead_spot" ? "❄ Cold Dead Spot" : "Normal Active"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl px-4">
                                <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-300">No Element Selected</p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Click any element on the visual floor plan to inspect and modify its dimensions.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Facility Summary Footer */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono text-slate-400 space-y-1">
                        <div className="flex justify-between">
                            <span>Total Placed:</span>
                            <span className="text-white font-bold">{config.elements.length} elements</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Storage Racks:</span>
                            <span className="text-blue-400 font-bold">
                                {config.elements.filter((e) => e.type === "rack").length} units
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Loading Docks:</span>
                            <span className="text-emerald-400 font-bold">
                                {config.elements.filter((e) => e.type === "dock_door").length} bays
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
