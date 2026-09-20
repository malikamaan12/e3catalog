"use client";

import React, { useState, useRef } from "react";
import {
    ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Flame,
    Snowflake, Sparkles, Box, Truck, ShieldCheck, MapPin,
    ArrowRight, Info
} from "lucide-react";
import { WarehouseLayoutConfig, WarehouseLayoutElement } from "@/lib/db/schema";

export type HeatmapMode = "standard" | "occupancy" | "velocity";

interface WarehouseDigitalTwinProps {
    layout: WarehouseLayoutConfig;
    selectedRackId: string | null;
    onSelectRack: (rack: any) => void;
    locatedTarget: any | null;
    heatmapMode: HeatmapMode;
    onHeatmapModeChange: (mode: HeatmapMode) => void;
    is3DView: boolean;
    onToggle3DView: () => void;
}

export default function WarehouseDigitalTwin({
    layout,
    selectedRackId,
    onSelectRack,
    locatedTarget,
    heatmapMode,
    onHeatmapModeChange,
    is3DView,
    onToggle3DView,
}: WarehouseDigitalTwinProps) {
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    const dims = layout.dimensions || { widthMeters: 34, lengthMeters: 23, gridCols: 34, gridRows: 23, gridScaleMeters: 1 };
    const cellSize = 30; // pixels per meter cell
    const svgWidth = dims.gridCols * cellSize;
    const svgHeight = dims.gridRows * cellSize;

    const handleZoomIn = () => setZoom((z) => Math.min(2.0, z + 0.2));
    const handleZoomOut = () => setZoom((z) => Math.max(0.6, z - 0.2));
    const handleResetZoom = () => setZoom(1);

    // Get color for rack based on active heatmap mode
    const getRackFill = (rack: any) => {
        const isSelected = selectedRackId === rack.id;
        const isLocated = locatedTarget?.spatialLocation?.rackId === rack.id;

        if (isLocated) return "rgba(234, 179, 8, 0.4)"; // Gold highlight

        if (heatmapMode === "occupancy") {
            if (rack.isEmpty || rack.currentUnits === 0) return "rgba(6, 182, 212, 0.15)"; // Cyan empty
            const pct = rack.occupancyPercent || 0;
            if (pct > 80) return "rgba(244, 63, 94, 0.35)"; // High
            if (pct > 40) return "rgba(245, 158, 11, 0.3)"; // Medium
            return "rgba(16, 185, 129, 0.25)"; // Optimal
        }

        if (heatmapMode === "velocity") {
            if (rack.isDeadSpot || rack.status === "dead_spot") return "rgba(99, 102, 241, 0.35)"; // Icy indigo cold
            if (rack.label?.includes("01") || rack.label?.includes("02")) return "rgba(249, 115, 22, 0.4)"; // Fast-moving hot
            return "rgba(51, 65, 85, 0.3)";
        }

        // Standard mode
        return rack.color ? `${rack.color}25` : "rgba(59, 130, 246, 0.2)";
    };

    const getRackStroke = (rack: any) => {
        if (locatedTarget?.spatialLocation?.rackId === rack.id) return "#eab308";
        if (selectedRackId === rack.id) return "#38bdf8";

        if (heatmapMode === "occupancy") {
            if (rack.isEmpty || rack.currentUnits === 0) return "#06b6d4";
            const pct = rack.occupancyPercent || 0;
            if (pct > 80) return "#f43f5e";
            if (pct > 40) return "#f59e0b";
            return "#10b981";
        }

        if (heatmapMode === "velocity") {
            if (rack.isDeadSpot || rack.status === "dead_spot") return "#818cf8";
            if (rack.label?.includes("01") || rack.label?.includes("02")) return "#f97316";
            return "#64748b";
        }

        return rack.color || "#3b82f6";
    };

    return (
        <div className="relative w-full h-[650px] bg-slate-950 rounded-3xl border border-white/10 overflow-hidden select-none flex flex-col shadow-2xl">
            {/* Top Toolbar Controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                {/* Mode Selector */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl pointer-events-auto shadow-xl">
                    <button
                        onClick={() => onHeatmapModeChange("standard")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            heatmapMode === "standard"
                                ? "bg-[var(--color-gold)] text-black shadow-md"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Standard Layout
                    </button>
                    <button
                        onClick={() => onHeatmapModeChange("occupancy")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            heatmapMode === "occupancy"
                                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Occupancy & Empty Racks
                    </button>
                    <button
                        onClick={() => onHeatmapModeChange("velocity")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            heatmapMode === "velocity"
                                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Flame className="w-3.5 h-3.5" />
                        Velocity & Dead Spots
                    </button>
                </div>

                {/* View Controls (Zoom & 3D Tilt) */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl pointer-events-auto shadow-xl">
                    <button
                        id="toggle-3d-view-btn"
                        onClick={onToggle3DView}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            is3DView
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Box className="w-3.5 h-3.5" />
                        {is3DView ? "2D Top-Down" : "3D Isometric View"}
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    <button
                        onClick={handleZoomIn}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleResetZoom}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Reset View"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bottom Legend Bar */}
            <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
                <div className="px-4 py-2.5 rounded-2xl bg-black/85 border border-white/10 backdrop-blur-xl text-xs flex items-center gap-4 text-slate-300 shadow-xl">
                    {heatmapMode === "occupancy" ? (
                        <>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border-2 border-dashed border-cyan-400 bg-cyan-500/20 animate-pulse" />
                                <span className="text-[11px] font-mono text-cyan-300 font-bold">100% Empty Rack</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-emerald-500 bg-emerald-500/30" />
                                <span className="text-[11px] font-mono text-emerald-400">1-50% Optimal</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-amber-500 bg-amber-500/30" />
                                <span className="text-[11px] font-mono text-amber-400">51-80% Full</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-rose-500 bg-rose-500/30" />
                                <span className="text-[11px] font-mono text-rose-400">&gt;80% Capacity Lock</span>
                            </div>
                        </>
                    ) : heatmapMode === "velocity" ? (
                        <>
                            <div className="flex items-center gap-1.5">
                                <Snowflake className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[11px] font-mono text-indigo-300 font-bold">Cold Dead Spot (&gt;60d No Activity)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-[11px] font-mono text-orange-300 font-bold">High-Velocity Fast-Track Rack</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px] font-mono">Loading Docks (01–04)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-amber-400 bg-amber-400/20" />
                                <span className="text-[11px] font-mono">Main Forklift Highway</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-blue-400 bg-blue-400/20" />
                                <span className="text-[11px] font-mono">Storage Racks</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Interactive Canvas Viewport */}
            <div
                ref={containerRef}
                className="w-full h-full flex items-center justify-center p-8 overflow-auto transition-transform duration-500"
                style={{
                    perspective: is3DView ? "1200px" : "none",
                }}
            >
                <div
                    className="relative transition-all duration-500 origin-center"
                    style={{
                        transform: `${
                            is3DView
                                ? "rotateX(32deg) rotateZ(-14deg) scale(0.9)"
                                : "none"
                        } scale(${zoom})`,
                        transformStyle: is3DView ? "preserve-3d" : "flat",
                        filter: is3DView ? "drop-shadow(0 30px 40px rgba(0,0,0,0.8))" : "none",
                    }}
                >
                    <svg
                        width={svgWidth}
                        height={svgHeight}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="rounded-2xl border-2 border-white/20 bg-slate-900/90 shadow-2xl"
                    >
                        {/* Background Spatial Grid Pattern */}
                        <defs>
                            <pattern id="grid-pattern" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
                                <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                            </pattern>
                            <pattern id="forklift-stripes" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(234, 179, 8, 0.15)" strokeWidth="10" />
                            </pattern>
                            <pattern id="pillar-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="3" />
                            </pattern>
                        </defs>

                        {/* Grid fill */}
                        <rect width={svgWidth} height={svgHeight} fill="url(#grid-pattern)" />

                        {/* ─── Passages & Arterial Corridors ─── */}
                        {layout.passages?.map((p) => {
                            const px = p.x1 * cellSize;
                            const py = p.y1 * cellSize;
                            const pw = (p.x2 - p.x1) * cellSize;
                            const ph = (p.y2 - p.y1) * cellSize;
                            const isForklift = p.type === "forklift_main";

                            return (
                                <g key={p.id}>
                                    <rect
                                        x={px}
                                        y={py}
                                        width={pw}
                                        height={ph}
                                        fill={isForklift ? "url(#forklift-stripes)" : "rgba(255, 255, 255, 0.02)"}
                                        stroke={isForklift ? "rgba(234, 179, 8, 0.3)" : "rgba(255, 255, 255, 0.08)"}
                                        strokeDasharray={isForklift ? "none" : "4 4"}
                                        strokeWidth="1.5"
                                        rx="4"
                                    />
                                    {isForklift && (
                                        <text
                                            x={px + pw / 2}
                                            y={py + ph / 2 + 4}
                                            textAnchor="middle"
                                            fill="rgba(234, 179, 8, 0.5)"
                                            fontSize="10"
                                            fontFamily="monospace"
                                            fontWeight="bold"
                                            letterSpacing="2"
                                        >
                                            ◄ DUAL-WAY FORKLIFT ARTERIAL HIGHWAY (AISLE 00) ►
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* ─── Layout Elements (Docks, Staging, Obstacles, Racks) ─── */}
                        {layout.elements?.map((el) => {
                            const ex = el.x * cellSize;
                            const ey = el.y * cellSize;
                            const ew = el.width * cellSize;
                            const eh = el.height * cellSize;

                            // 1. Dock Door Bays
                            if (el.type === "dock_door") {
                                return (
                                    <g key={el.id} className="cursor-pointer">
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="rgba(16, 185, 129, 0.12)"
                                            stroke="#10b981"
                                            strokeWidth="2"
                                            rx="8"
                                        />
                                        <rect x={ex + 4} y={ey + 4} width={ew - 8} height={8} fill="rgba(16, 185, 129, 0.3)" rx="2" />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 5}
                                            textAnchor="middle"
                                            fill="#34d399"
                                            fontSize="10"
                                            fontFamily="sans-serif"
                                            fontWeight="bold"
                                        >
                                            {el.label}
                                        </text>
                                    </g>
                                );
                            }

                            // 2. Staging Bays
                            if (el.type === "staging" || el.type === "packing_station") {
                                return (
                                    <g key={el.id}>
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="rgba(245, 158, 11, 0.08)"
                                            stroke="#f59e0b"
                                            strokeDasharray="6 4"
                                            strokeWidth="1.5"
                                            rx="6"
                                        />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 4}
                                            textAnchor="middle"
                                            fill="#fbbf24"
                                            fontSize="10"
                                            fontFamily="sans-serif"
                                            fontWeight="bold"
                                        >
                                            {el.label}
                                        </text>
                                    </g>
                                );
                            }

                            // 3. Technical QC Lab / Quarantine
                            if (el.type === "quarantine") {
                                return (
                                    <g key={el.id}>
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="rgba(239, 68, 68, 0.12)"
                                            stroke="#ef4444"
                                            strokeWidth="2"
                                            rx="8"
                                        />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 4}
                                            textAnchor="middle"
                                            fill="#f87171"
                                            fontSize="10"
                                            fontFamily="sans-serif"
                                            fontWeight="bold"
                                        >
                                            {el.label}
                                        </text>
                                    </g>
                                );
                            }

                            // 4. Structural Obstacles / Pillars
                            if (el.type === "obstacle") {
                                return (
                                    <g key={el.id}>
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="url(#pillar-hatch)"
                                            stroke="#64748b"
                                            strokeWidth="2"
                                            rx="4"
                                        />
                                    </g>
                                );
                            }

                            // 5. Storage Racks (Interactive Physical Shelves)
                            if (el.type === "rack") {
                                const rackObj = el as any;
                                const isSelected = selectedRackId === el.id;
                                const isLocated = locatedTarget?.spatialLocation?.rackId === el.id;
                                const isEmpty = rackObj.isEmpty || rackObj.currentUnits === 0;
                                const isDead = rackObj.isDeadSpot || rackObj.status === "dead_spot";

                                const fill = getRackFill(el);
                                const stroke = getRackStroke(el);

                                return (
                                    <g
                                        key={el.id}
                                        onClick={() => onSelectRack(el)}
                                        className="cursor-pointer transition-all duration-300 hover:brightness-125 group"
                                    >
                                        {/* Drop shadow / glow behind rack */}
                                        {(isSelected || isLocated || (heatmapMode === "occupancy" && isEmpty)) && (
                                            <rect
                                                x={ex - 4}
                                                y={ey - 4}
                                                width={ew + 8}
                                                height={eh + 8}
                                                fill="none"
                                                stroke={isLocated ? "#eab308" : isEmpty && heatmapMode === "occupancy" ? "#06b6d4" : "#38bdf8"}
                                                strokeWidth="2"
                                                strokeOpacity="0.4"
                                                rx="10"
                                                className="animate-pulse"
                                            />
                                        )}

                                        {/* Physical Rack Box */}
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill={fill}
                                            stroke={stroke}
                                            strokeWidth={isSelected || isLocated ? 2.5 : 1.5}
                                            strokeDasharray={isEmpty && heatmapMode === "occupancy" ? "6 3" : "none"}
                                            rx="6"
                                        />

                                        {/* Shelf Tier Dividers inside the rack */}
                                        {Array.from({ length: (el.levels || 4) - 1 }).map((_, tierIdx) => {
                                            const tierX = ex + (ew / (el.levels || 4)) * (tierIdx + 1);
                                            return (
                                                <line
                                                    key={tierIdx}
                                                    x1={tierX}
                                                    y1={ey + 2}
                                                    x2={tierX}
                                                    y2={ey + eh - 2}
                                                    stroke={stroke}
                                                    strokeWidth="0.75"
                                                    strokeOpacity="0.4"
                                                />
                                            );
                                        })}

                                        {/* Rack Label */}
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 - 2}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontFamily="sans-serif"
                                            fontWeight="black"
                                        >
                                            {el.rackCode || el.label}
                                        </text>

                                        {/* Secondary Status Badge / Occupancy Metric */}
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 11}
                                            textAnchor="middle"
                                            fill={
                                                heatmapMode === "occupancy" && isEmpty
                                                    ? "#22d3ee"
                                                    : isDead && heatmapMode === "velocity"
                                                    ? "#a5b4fc"
                                                    : "#94a3b8"
                                            }
                                            fontSize="9"
                                            fontFamily="monospace"
                                            fontWeight="bold"
                                        >
                                            {heatmapMode === "occupancy"
                                                ? isEmpty
                                                    ? "★ EMPTY (0%)"
                                                    : `${rackObj.occupancyPercent || 0}% FULL`
                                                : heatmapMode === "velocity"
                                                ? isDead
                                                    ? "❄ DEAD SPOT"
                                                    : "⚡ FAST TRACK"
                                                : `${rackObj.currentUnits || 0} units · ${el.levels || 4}T`}
                                        </text>
                                    </g>
                                );
                            }

                            return null;
                        })}

                        {/* ─── Target Item Illuminated Beacon ─── */}
                        {locatedTarget?.spatialLocation && (
                            <g>
                                {/* Dotted route path from Loading Dock 02 to target rack */}
                                <path
                                    d={`M ${10 * cellSize} ${4 * cellSize} L ${10 * cellSize} ${9.5 * cellSize} L ${
                                        (locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize
                                    } ${9.5 * cellSize} L ${
                                        (locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize
                                    } ${locatedTarget.spatialLocation.y * cellSize}`}
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="2.5"
                                    strokeDasharray="6 4"
                                    strokeLinecap="round"
                                />

                                {/* Concentric pulse wave */}
                                <circle
                                    cx={(locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize}
                                    cy={(locatedTarget.spatialLocation.y + locatedTarget.spatialLocation.height / 2) * cellSize}
                                    r="36"
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="3"
                                    strokeOpacity="0.8"
                                    className="animate-ping"
                                />
                                <circle
                                    cx={(locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize}
                                    cy={(locatedTarget.spatialLocation.y + locatedTarget.spatialLocation.height / 2) * cellSize}
                                    r="10"
                                    fill="#eab308"
                                    stroke="#000000"
                                    strokeWidth="2"
                                />
                            </g>
                        )}
                    </svg>
                </div>
            </div>
        </div>
    );
}
