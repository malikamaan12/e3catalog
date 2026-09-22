"use client";

import React, { useState, useRef } from "react";
import {
    ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Flame,
    Snowflake, Sparkles, Box, Truck, ShieldCheck, MapPin,
    ArrowRight, Info, Compass, Activity, ArrowUpRight, CheckCircle2,
    Sliders, Navigation, AlertTriangle
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
    const [hoveredElement, setHoveredElement] = useState<any | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const dims = layout.dimensions || { widthMeters: 34, lengthMeters: 23, gridCols: 34, gridRows: 23, gridScaleMeters: 1 };
    const cellSize = 30; // pixels per meter cell
    const svgWidth = dims.gridCols * cellSize;
    const svgHeight = dims.gridRows * cellSize;

    const handleZoomIn = () => setZoom((z) => Math.min(2.0, Number((z + 0.2).toFixed(2))));
    const handleZoomOut = () => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))));
    const handleResetZoom = () => setZoom(1);

    // Calculate live summary stats from layout
    const racks = layout.elements?.filter((el) => el.type === "rack") || [];
    const emptyRacksCount = racks.filter((r: any) => r.isEmpty || r.currentUnits === 0).length;
    const deadSpotsCount = racks.filter((r: any) => r.isDeadSpot || r.status === "dead_spot").length;
    const docksCount = layout.elements?.filter((el) => el.type === "dock_door").length || 0;

    // Helper to format long dock labels into crisp multi-line badges
    const formatDockLabel = (rawLabel: string) => {
        const bayMatch = rawLabel.match(/Bay\s*0?(\d+)/i);
        const bayNum = bayMatch ? `BAY 0${bayMatch[1]}` : (rawLabel.length > 12 ? rawLabel.slice(0, 10).toUpperCase() : rawLabel.toUpperCase());
        let purpose = "CARGO DOCK";
        if (/outbound/i.test(rawLabel)) purpose = "OUTBOUND";
        else if (/cross-dock/i.test(rawLabel)) purpose = "FAST CROSS-DOCK";
        else if (/inbound/i.test(rawLabel)) purpose = "INBOUND RETURN";
        else if (/inter-hub|transit/i.test(rawLabel)) purpose = "INTER-HUB TRANSIT";
        return { bayNum, purpose };
    };

    // Helper to format long staging labels into crisp multi-line badges
    const formatStagingLabel = (rawLabel: string) => {
        let title = rawLabel;
        let subtitle = "STAGING ZONE";
        if (/outbound/i.test(rawLabel)) {
            title = "OUTBOUND PAD A";
            subtitle = "FLIGHT CASE STAGING";
        } else if (/inbound/i.test(rawLabel)) {
            title = "INBOUND PAD B";
            subtitle = "CHECK-IN & SORTATION";
        } else if (/kitting|audit/i.test(rawLabel)) {
            title = "AUDIT STATION";
            subtitle = "KITTING & CASE VERIFY";
        }
        return { title, subtitle };
    };

    // Get color for rack based on active heatmap mode
    const getRackFill = (rack: any) => {
        const isSelected = selectedRackId === rack.id;
        const isLocated = locatedTarget?.spatialLocation?.rackId === rack.id;

        if (isLocated) return "rgba(234, 179, 8, 0.45)"; // Gold target highlight
        if (isSelected) return "rgba(56, 189, 248, 0.35)"; // Sky blue selected

        if (heatmapMode === "occupancy") {
            if (rack.isEmpty || rack.currentUnits === 0) return "rgba(6, 182, 212, 0.22)"; // Cyan empty
            const pct = rack.occupancyPercent || 0;
            if (pct > 80) return "rgba(244, 63, 94, 0.35)"; // High capacity
            if (pct > 40) return "rgba(245, 158, 11, 0.3)"; // Medium
            return "rgba(16, 185, 129, 0.25)"; // Optimal
        }

        if (heatmapMode === "velocity") {
            if (rack.isDeadSpot || rack.status === "dead_spot") return "rgba(99, 102, 241, 0.35)"; // Icy indigo cold
            if (rack.label?.includes("01") || rack.label?.includes("02") || rack.rackCode?.includes("01")) return "rgba(249, 115, 22, 0.4)"; // Fast-moving hot
            return "rgba(51, 65, 85, 0.35)";
        }

        // Standard mode
        return rack.color ? `${rack.color}33` : "rgba(30, 58, 138, 0.25)";
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
            if (rack.label?.includes("01") || rack.label?.includes("02") || rack.rackCode?.includes("01")) return "#f97316";
            return "#64748b";
        }

        return rack.color || "#3b82f6";
    };

    // Isometric 3D depth parameters
    const isoDepthX = is3DView ? 8 : 0;
    const isoDepthY = is3DView ? -7 : 0;

    return (
        <div className="relative w-full h-[700px] bg-[#050811] rounded-3xl border border-white/10 overflow-hidden select-none flex flex-col shadow-2xl">
            {/* ─── Top Control Deck & Mode Selectors ─── */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                {/* Heatmap Layer Selectors */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#090d16]/95 border border-white/10 pointer-events-auto shadow-2xl">
                    <button
                        onClick={() => onHeatmapModeChange("standard")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            heatmapMode === "standard"
                                ? "bg-[var(--color-gold)] text-black shadow-lg shadow-amber-500/20 font-black"
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
                                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black"
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
                                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25 font-black"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Flame className="w-3.5 h-3.5" />
                        Velocity & Dead Spots
                    </button>
                </div>

                {/* Spatial Viewport & Camera Controls */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#090d16]/95 border border-white/10 pointer-events-auto shadow-2xl">
                    {/* View mode badge */}
                    <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-slate-300 font-bold">
                        <span className={`w-2 h-2 rounded-full ${is3DView ? "bg-purple-400 animate-pulse" : "bg-emerald-400"}`} />
                        {is3DView ? "3D ISOMETRIC TWIN" : "2D BLUEPRINT VIEW"}
                    </div>

                    <button
                        id="toggle-3d-view-btn"
                        onClick={onToggle3DView}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            is3DView
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/40 ring-1 ring-purple-400/50"
                                : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
                        }`}
                        title={is3DView ? "Switch to 2D Top-Down View" : "Switch to 3D Isometric View"}
                    >
                        <Box className="w-3.5 h-3.5" />
                        {is3DView ? "2D Top-Down" : "3D Isometric View"}
                    </button>

                    <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

                    <button
                        onClick={handleZoomIn}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Zoom In (+)"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Zoom Out (-)"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    {/* Interactive Zoom Slider */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">Zoom</span>
                        <input
                            id="warehouse-zoom-slider"
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(Number(parseFloat(e.target.value).toFixed(2)))}
                            className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--color-gold)]"
                            title={`Zoom Slider: ${Math.round(zoom * 100)}%`}
                        />
                    </div>

                    <button
                        onClick={handleResetZoom}
                        className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-mono font-bold flex items-center gap-1"
                        title="Reset Camera & Zoom"
                    >
                        <RotateCcw className="w-3 h-3" />
                        {Math.round(zoom * 100)}%
                    </button>
                </div>
            </div>

            {/* ─── Interactive Floating Live HUD Overlay Card ─── */}
            {hoveredElement && (
                <div className="absolute top-20 right-4 z-30 pointer-events-none animate-in fade-in slide-in-from-right-2 duration-150">
                    <div className="w-72 p-3.5 rounded-2xl bg-[#090d16]/95 border border-white/15 shadow-2xl text-white flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-gold)] animate-ping" />
                                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-gold)]">
                                    {hoveredElement.type === "rack" ? "Storage Rack Inspector" : hoveredElement.type === "dock_door" ? "Loading Dock Bay" : "Transit Corridor"}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                {hoveredElement.rackCode || hoveredElement.label || "Element"}
                            </span>
                        </div>

                        {hoveredElement.type === "rack" && (
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-mono">Capacity / Tiers</span>
                                    <span className="font-bold text-white font-mono">
                                        {hoveredElement.currentUnits || 0} / {hoveredElement.capacityUnits || 24} Units ({hoveredElement.levels || 4}T)
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-mono">Occupancy Rate</span>
                                    <span className={`font-black font-mono ${(hoveredElement.occupancyPercent || 0) > 80 ? "text-rose-400" : (hoveredElement.occupancyPercent || 0) === 0 ? "text-cyan-400" : "text-emerald-400"}`}>
                                        {hoveredElement.occupancyPercent || 0}%
                                        {(hoveredElement.isEmpty || hoveredElement.currentUnits === 0) ? " (EMPTY)" : ""}
                                    </span>
                                </div>
                                <div className="col-span-2 mt-1">
                                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${(hoveredElement.occupancyPercent || 0) > 80 ? "bg-rose-500" : (hoveredElement.occupancyPercent || 0) === 0 ? "bg-cyan-500" : "bg-emerald-500"}`}
                                            style={{ width: `${Math.min(100, hoveredElement.occupancyPercent || 0)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {hoveredElement.type === "dock_door" && (
                            <div className="text-[11px] space-y-1">
                                <p className="text-slate-300 font-semibold">{hoveredElement.label}</p>
                                <span className="inline-block text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    ● STATUS: CLEAR & READY FOR CARRIER DOCKING
                                </span>
                            </div>
                        )}

                        <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Click rack to open inventory drawer</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-gold)]" />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Interactive Canvas Viewport (Perspective Container with Breathing Room) ─── */}
            <div
                ref={containerRef}
                className="w-full h-full flex items-center justify-center pt-24 pb-16 px-8 overflow-auto"
                style={{
                    perspective: "1400px",
                    perspectiveOrigin: "50% 50%",
                }}
            >
                <div
                    className="relative origin-center my-auto"
                    style={{
                        // Transform always uses explicit rotation angles (0deg in 2D, 36deg in 3D).
                        // Never outputs "none scale(...)" which was an invalid CSS transform that caused it to remain stuck slanted!
                        transform: is3DView
                            ? `rotateX(36deg) rotateZ(-16deg) scale(${0.92 * zoom})`
                            : `rotateX(0deg) rotateZ(0deg) scale(${zoom})`,
                        transformStyle: "preserve-3d",
                        transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1), filter 600ms ease",
                        filter: is3DView ? "drop-shadow(0 35px 50px rgba(0, 0, 0, 0.9))" : "none",
                    }}
                >
                    <svg
                        width={svgWidth}
                        height={svgHeight}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="rounded-2xl border-2 border-white/20 bg-[#090d16] shadow-2xl transition-all"
                    >
                        {/* ─── SVG Shaders, Filters & Dynamic Patterns ─── */}
                        <defs>
                            {/* CSS Keyframes for live flowing traffic lines & beacon glow */}
                            <style>
                                {`
                                    @keyframes forkliftFlow {
                                        from { stroke-dashoffset: 48; }
                                        to { stroke-dashoffset: 0; }
                                    }
                                    @keyframes beaconPulse {
                                        0%, 100% { opacity: 0.35; transform: scale(0.9); }
                                        50% { opacity: 1; transform: scale(1.2); }
                                    }
                                    .flow-arterial {
                                        animation: forkliftFlow 1.6s linear infinite;
                                    }
                                    .beacon-indicator {
                                        transform-origin: center;
                                        animation: beaconPulse 2.2s ease-in-out infinite;
                                    }
                                `}
                            </style>

                            {/* Crisp High-Tech Background Spatial Grid Pattern */}
                            <pattern id="grid-pattern" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
                                <path
                                    d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.04)"
                                    strokeWidth="1"
                                />
                                {/* Grid intersection crosshair dot */}
                                <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.12)" />
                            </pattern>

                            {/* Industrial Amber Hazard Stripes for Highway Borders */}
                            <pattern id="forklift-stripes" width="24" height="24" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <rect width="24" height="24" fill="rgba(15, 23, 42, 0.9)" />
                                <line x1="0" y1="0" x2="0" y2="24" stroke="rgba(234, 179, 8, 0.25)" strokeWidth="12" />
                            </pattern>

                            {/* Quarantine Red Hazard Stripes */}
                            <pattern id="quarantine-hatch" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <rect width="20" height="20" fill="rgba(69, 10, 10, 0.4)" />
                                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="10" />
                            </pattern>

                            {/* Heavy Pillar Steel Crosshatch */}
                            <pattern id="pillar-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="3" />
                            </pattern>

                            {/* Rollup Dock Door Corrugated Slats */}
                            <pattern id="dock-slats" width="10" height="6" patternUnits="userSpaceOnUse">
                                <rect width="10" height="2" fill="rgba(16, 185, 129, 0.4)" />
                                <rect y="2" width="10" height="4" fill="rgba(6, 78, 59, 0.3)" />
                            </pattern>

                            {/* Overhead Halogen Spotlight Radial Ambient Gradient */}
                            <radialGradient id="floor-ambient-glow" cx="50%" cy="45%" r="65%">
                                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.6" />
                                <stop offset="60%" stopColor="#0f172a" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#050811" stopOpacity="1" />
                            </radialGradient>

                            {/* High-visibility drop shadow for rack floating badges */}
                            <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.85" />
                            </filter>
                        </defs>

                        {/* Ambient Floor Base Lighting & Spatial Grid */}
                        <rect width={svgWidth} height={svgHeight} fill="url(#floor-ambient-glow)" />
                        <rect width={svgWidth} height={svgHeight} fill="url(#grid-pattern)" />

                        {/* ─── Architectural Perimeter Walls & Meter Dimension Rulers ─── */}
                        {/* Top Meter Markings (0m, 5m, 10m, 15m, 20m, 25m, 30m) */}
                        {Array.from({ length: Math.floor(dims.gridCols / 5) + 1 }).map((_, i) => {
                            const meterX = i * 5 * cellSize;
                            return (
                                <g key={`top-tick-${i}`}>
                                    <line x1={meterX} y1={0} x2={meterX} y2={6} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
                                    <text
                                        x={meterX + 3}
                                        y={14}
                                        fill="rgba(148, 163, 184, 0.5)"
                                        fontSize="9"
                                        fontFamily="monospace"
                                    >
                                        {i * 5}m
                                    </text>
                                </g>
                            );
                        })}

                        {/* Left Edge Meter Markings */}
                        {Array.from({ length: Math.floor(dims.gridRows / 5) + 1 }).map((_, i) => {
                            const meterY = i * 5 * cellSize;
                            return (
                                <g key={`left-tick-${i}`}>
                                    <line x1={0} y1={meterY} x2={6} y2={meterY} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
                                    <text
                                        x={8}
                                        y={meterY + 11}
                                        fill="rgba(148, 163, 184, 0.5)"
                                        fontSize="9"
                                        fontFamily="monospace"
                                    >
                                        {i * 5}m
                                    </text>
                                </g>
                            );
                        })}

                        {/* ─── Passages & Arterial Corridors ─── */}
                        {layout.passages?.map((p) => {
                            const px = p.x1 * cellSize;
                            const py = p.y1 * cellSize;
                            const pw = (p.x2 - p.x1) * cellSize;
                            const ph = (p.y2 - p.y1) * cellSize;
                            const isForklift = p.type === "forklift_main";

                            return (
                                <g
                                    key={p.id}
                                    onMouseEnter={() => setHoveredElement(p)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                >
                                    {/* Main Passage Floor Plate */}
                                    <rect
                                        x={px}
                                        y={py}
                                        width={pw}
                                        height={ph}
                                        fill={isForklift ? "rgba(245, 158, 11, 0.04)" : "rgba(255, 255, 255, 0.02)"}
                                        stroke={isForklift ? "rgba(234, 179, 8, 0.35)" : "rgba(255, 255, 255, 0.08)"}
                                        strokeDasharray={isForklift ? "none" : "6 4"}
                                        strokeWidth="1.5"
                                        rx="6"
                                    />

                                    {/* Forklift Highway Hazard Stripes & Flow Line */}
                                    {isForklift && (
                                        <>
                                            {/* Top Hazard Chevron Border */}
                                            <rect x={px} y={py} width={pw} height={5} fill="url(#forklift-stripes)" rx="2" />
                                            {/* Bottom Hazard Chevron Border */}
                                            <rect x={px} y={py + ph - 5} width={pw} height={5} fill="url(#forklift-stripes)" rx="2" />

                                            {/* Dynamic Animated Flow Line down center of highway */}
                                            <line
                                                x1={px + 10}
                                                y1={py + ph / 2}
                                                x2={px + pw - 10}
                                                y2={py + ph / 2}
                                                stroke="#eab308"
                                                strokeWidth="2.5"
                                                strokeDasharray="16 12"
                                                strokeOpacity="0.65"
                                                className="flow-arterial"
                                            />

                                            {/* Highway Badge Signboard Pill with High Contrast */}
                                            <rect
                                                x={px + pw / 2 - 180}
                                                y={py + ph / 2 - 11}
                                                width="360"
                                                height="22"
                                                rx="6"
                                                fill="rgba(10, 15, 28, 0.95)"
                                                stroke="rgba(234, 179, 8, 0.7)"
                                                strokeWidth="1.2"
                                                filter="url(#badge-shadow)"
                                            />
                                            <text
                                                x={px + pw / 2}
                                                y={py + ph / 2 + 4}
                                                textAnchor="middle"
                                                fill="#fbbf24"
                                                fontSize="10"
                                                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                                fontWeight="bold"
                                                letterSpacing="1.5"
                                            >
                                                ◄ DUAL-WAY FORKLIFT ARTERIAL HIGHWAY (AISLE 00) ►
                                            </text>
                                        </>
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

                            // 1. Loading Dock Door Bays
                            if (el.type === "dock_door") {
                                const { bayNum, purpose } = formatDockLabel(el.label || "BAY 01");
                                const dockBadgeW = Math.min(ew - 16, 120);

                                return (
                                    <g
                                        key={el.id}
                                        className="cursor-pointer group"
                                        onMouseEnter={() => setHoveredElement(el)}
                                        onMouseLeave={() => setHoveredElement(null)}
                                    >
                                        {/* Dock Outer Apron Area */}
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="rgba(6, 78, 59, 0.2)"
                                            stroke="#10b981"
                                            strokeWidth="2"
                                            rx="8"
                                        />

                                        {/* Rollup Door Corrugated Slats Graphic */}
                                        <rect
                                            x={ex + 4}
                                            y={ey + 4}
                                            width={ew - 8}
                                            height={eh - 8}
                                            fill="url(#dock-slats)"
                                            rx="4"
                                            stroke="rgba(16, 185, 129, 0.4)"
                                            strokeWidth="1"
                                        />

                                        {/* Active Green Dock Status Beacon */}
                                        <circle
                                            cx={ex + 14}
                                            cy={ey + eh / 2}
                                            r="7"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="1.5"
                                            className="beacon-indicator"
                                        />
                                        <circle
                                            cx={ex + 14}
                                            cy={ey + eh / 2}
                                            r="3.5"
                                            fill="#34d399"
                                        />

                                        {/* Dock Door High-Contrast Pill Badge with 2-Line Layout (NO CLIPPING!) */}
                                        <rect
                                            x={ex + ew / 2 - dockBadgeW / 2 + 6}
                                            y={ey + eh / 2 - 14}
                                            width={dockBadgeW}
                                            height="28"
                                            rx="5"
                                            fill="rgba(4, 28, 20, 0.96)"
                                            stroke="#10b981"
                                            strokeWidth="1.2"
                                            filter="url(#badge-shadow)"
                                        />
                                        {/* Line 1: Bay Number */}
                                        <text
                                            x={ex + ew / 2 + 6}
                                            y={ey + eh / 2 - 2}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontFamily="ui-monospace, monospace"
                                            fontWeight="900"
                                            letterSpacing="1"
                                        >
                                            {bayNum}
                                        </text>
                                        {/* Line 2: Purpose */}
                                        <text
                                            x={ex + ew / 2 + 6}
                                            y={ey + eh / 2 + 9}
                                            textAnchor="middle"
                                            fill="#34d399"
                                            fontSize="7.5"
                                            fontFamily="sans-serif"
                                            fontWeight="bold"
                                            letterSpacing="0.5"
                                        >
                                            {purpose}
                                        </text>
                                    </g>
                                );
                            }

                            // 2. Staging Bays & Packing Stations
                            if (el.type === "staging" || el.type === "packing_station") {
                                const { title, subtitle } = formatStagingLabel(el.label || "STAGING AREA");
                                const stagingBadgeW = Math.min(ew - 20, 160);

                                return (
                                    <g
                                        key={el.id}
                                        onMouseEnter={() => setHoveredElement(el)}
                                        onMouseLeave={() => setHoveredElement(null)}
                                    >
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="rgba(245, 158, 11, 0.08)"
                                            stroke="#f59e0b"
                                            strokeDasharray="6 4"
                                            strokeWidth="1.5"
                                            rx="8"
                                        />
                                        {/* Corner bracket guides */}
                                        <path
                                            d={`M ${ex + 8} ${ey + 16} L ${ex + 8} ${ey + 8} L ${ex + 16} ${ey + 8}`}
                                            fill="none"
                                            stroke="#f59e0b"
                                            strokeWidth="2"
                                        />
                                        <path
                                            d={`M ${ex + ew - 8} ${ey + eh - 16} L ${ex + ew - 8} ${ey + eh - 8} L ${ex + ew - 16} ${ey + eh - 8}`}
                                            fill="none"
                                            stroke="#f59e0b"
                                            strokeWidth="2"
                                        />

                                        {/* High-contrast staging badge (2-Line layout, zero clipping) */}
                                        <rect
                                            x={ex + ew / 2 - stagingBadgeW / 2}
                                            y={ey + eh / 2 - 14}
                                            width={stagingBadgeW}
                                            height="28"
                                            rx="6"
                                            fill="rgba(24, 18, 6, 0.95)"
                                            stroke="#f59e0b"
                                            strokeWidth="1.2"
                                            filter="url(#badge-shadow)"
                                        />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 - 2}
                                            textAnchor="middle"
                                            fill="#fef3c7"
                                            fontSize="9.5"
                                            fontFamily="ui-monospace, monospace"
                                            fontWeight="900"
                                            letterSpacing="0.5"
                                        >
                                            {title}
                                        </text>
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 9}
                                            textAnchor="middle"
                                            fill="#fbbf24"
                                            fontSize="7.5"
                                            fontFamily="sans-serif"
                                            fontWeight="bold"
                                            letterSpacing="0.5"
                                        >
                                            {subtitle}
                                        </text>
                                    </g>
                                );
                            }

                            // 3. Technical QC Lab / Quarantine Zone
                            if (el.type === "quarantine") {
                                const qcBadgeW = Math.min(ew - 20, 180);
                                return (
                                    <g
                                        key={el.id}
                                        onMouseEnter={() => setHoveredElement(el)}
                                        onMouseLeave={() => setHoveredElement(null)}
                                    >
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="url(#quarantine-hatch)"
                                            stroke="#ef4444"
                                            strokeWidth="2"
                                            rx="8"
                                        />
                                        {/* High-contrast danger badge (2-Line layout) */}
                                        <rect
                                            x={ex + ew / 2 - qcBadgeW / 2}
                                            y={ey + eh / 2 - 14}
                                            width={qcBadgeW}
                                            height="28"
                                            rx="6"
                                            fill="rgba(30, 6, 6, 0.96)"
                                            stroke="#ef4444"
                                            strokeWidth="1.5"
                                            filter="url(#badge-shadow)"
                                        />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 - 2}
                                            textAnchor="middle"
                                            fill="#fecaca"
                                            fontSize="9"
                                            fontFamily="ui-monospace, monospace"
                                            fontWeight="900"
                                            letterSpacing="0.5"
                                        >
                                            ⚠️ TECH QC & DECONTAM
                                        </text>
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 9}
                                            textAnchor="middle"
                                            fill="#f87171"
                                            fontSize="7.5"
                                            fontFamily="sans-serif"
                                            fontWeight="bold"
                                            letterSpacing="0.5"
                                        >
                                            ISOLATION & REPAIR LAB
                                        </text>
                                    </g>
                                );
                            }

                            // 4. Structural Obstacles / Support Pillars
                            if (el.type === "obstacle") {
                                return (
                                    <g key={el.id}>
                                        <rect
                                            x={ex}
                                            y={ey}
                                            width={ew}
                                            height={eh}
                                            fill="url(#pillar-hatch)"
                                            stroke="#94a3b8"
                                            strokeWidth="2"
                                            rx="4"
                                        />
                                        {/* Amber caution base plate */}
                                        <rect
                                            x={ex + 2}
                                            y={ey + eh - 4}
                                            width={ew - 4}
                                            height="3"
                                            fill="#f59e0b"
                                            rx="1"
                                        />
                                    </g>
                                );
                            }

                            // 5. Storage Racks (Interactive Physical Shelves with 3D Depth & High Contrast)
                            if (el.type === "rack") {
                                const rackObj = el as any;
                                const isSelected = selectedRackId === el.id;
                                const isLocated = locatedTarget?.spatialLocation?.rackId === el.id;
                                const isEmpty = rackObj.isEmpty || rackObj.currentUnits === 0;
                                const isDead = rackObj.isDeadSpot || rackObj.status === "dead_spot";

                                const fill = getRackFill(el);
                                const stroke = getRackStroke(el);
                                const rackCode = el.rackCode || el.label || "RACK";

                                // Metrics for badges
                                const pct = rackObj.occupancyPercent || 0;
                                let statusText = "";
                                let statusTextColor = "#e2e8f0";
                                let statusBorderColor = "rgba(255, 255, 255, 0.25)";
                                let progressFill = "#38bdf8";

                                if (heatmapMode === "occupancy") {
                                    if (isEmpty) {
                                        statusText = "★ EMPTY (0%)";
                                        statusTextColor = "#22d3ee";
                                        statusBorderColor = "#06b6d4";
                                        progressFill = "#06b6d4";
                                    } else if (pct > 80) {
                                        statusText = `🔴 ${pct}% FULL`;
                                        statusTextColor = "#f43f5e";
                                        statusBorderColor = "#f43f5e";
                                        progressFill = "#f43f5e";
                                    } else if (pct > 40) {
                                        statusText = `🟡 ${pct}% FULL`;
                                        statusTextColor = "#fbbf24";
                                        statusBorderColor = "#f59e0b";
                                        progressFill = "#f59e0b";
                                    } else {
                                        statusText = `🟢 ${pct}% OPTIMAL`;
                                        statusTextColor = "#34d399";
                                        statusBorderColor = "#10b981";
                                        progressFill = "#10b981";
                                    }
                                } else if (heatmapMode === "velocity") {
                                    if (isDead) {
                                        statusText = "❄ DEAD SPOT";
                                        statusTextColor = "#a5b4fc";
                                        statusBorderColor = "#818cf8";
                                        progressFill = "#818cf8";
                                    } else if (rackCode.includes("01") || rackCode.includes("02") || el.label?.includes("01")) {
                                        statusText = "⚡ FAST TRACK";
                                        statusTextColor = "#fb923c";
                                        statusBorderColor = "#f97316";
                                        progressFill = "#f97316";
                                    } else {
                                        statusText = "● NORMAL";
                                        statusTextColor = "#94a3b8";
                                        statusBorderColor = "#64748b";
                                        progressFill = "#64748b";
                                    }
                                } else {
                                    statusText = `${rackObj.currentUnits || 0} U · ${el.levels || 4}T`;
                                    statusTextColor = "#e2e8f0";
                                    statusBorderColor = stroke;
                                    progressFill = stroke;
                                }

                                const codeBadgeW = Math.max(58, rackCode.length * 8.5 + 14);
                                const statusBadgeW = Math.max(68, statusText.length * 6.5 + 12);

                                return (
                                    <g
                                        key={el.id}
                                        onClick={() => onSelectRack(el)}
                                        onMouseEnter={() => setHoveredElement(el)}
                                        onMouseLeave={() => setHoveredElement(null)}
                                        className="cursor-pointer transition-all duration-200 group"
                                    >
                                        {/* Volumetric 3D Shelving Extrusion (Active in 3D Isometric View) */}
                                        {is3DView && (
                                            <>
                                                {/* Isometric Top Shelf Cap */}
                                                <polygon
                                                    points={`${ex},${ey} ${ex + isoDepthX},${ey + isoDepthY} ${ex + ew + isoDepthX},${ey + isoDepthY} ${ex + ew},${ey}`}
                                                    fill="rgba(255, 255, 255, 0.16)"
                                                    stroke={stroke}
                                                    strokeWidth="1"
                                                />
                                                {/* Isometric Right Side Depth Shading */}
                                                <polygon
                                                    points={`${ex + ew},${ey} ${ex + ew + isoDepthX},${ey + isoDepthY} ${ex + ew + isoDepthX},${ey + eh + isoDepthY} ${ex + ew},${ey + eh}`}
                                                    fill="rgba(0, 0, 0, 0.5)"
                                                    stroke={stroke}
                                                    strokeWidth="1"
                                                />
                                            </>
                                        )}

                                        {/* Drop shadow / Selection glow behind rack */}
                                        {(isSelected || isLocated || (heatmapMode === "occupancy" && isEmpty)) && (
                                            <rect
                                                x={ex - 4}
                                                y={ey - 4}
                                                width={ew + 8}
                                                height={eh + 8}
                                                fill="none"
                                                stroke={isLocated ? "#eab308" : isEmpty && heatmapMode === "occupancy" ? "#06b6d4" : "#38bdf8"}
                                                strokeWidth="2.5"
                                                strokeOpacity="0.6"
                                                rx="10"
                                                className="animate-pulse"
                                            />
                                        )}

                                        {/* Main Physical Rack Box */}
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
                                            filter="url(#badge-shadow)"
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
                                                    strokeOpacity="0.35"
                                                />
                                            );
                                        })}

                                        {/* Corner Upright Steel Reinforcement Brackets */}
                                        <rect x={ex} y={ey} width="4" height="4" fill="#94a3b8" rx="0.5" />
                                        <rect x={ex + ew - 4} y={ey} width="4" height="4" fill="#94a3b8" rx="0.5" />
                                        <rect x={ex} y={ey + eh - 4} width="4" height="4" fill="#94a3b8" rx="0.5" />
                                        <rect x={ex + ew - 4} y={ey + eh - 4} width="4" height="4" fill="#94a3b8" rx="0.5" />

                                        {/* ─── CRYSTAL-CLEAR TEXT VISIBILITY OVERHAUL ─── */}
                                        {/* 1. Solid High-Contrast Badge Pill Behind Rack Code */}
                                        <rect
                                            x={ex + ew / 2 - codeBadgeW / 2}
                                            y={ey + eh / 2 - 16}
                                            width={codeBadgeW}
                                            height="16"
                                            rx="4"
                                            fill="rgba(6, 10, 20, 0.95)"
                                            stroke={stroke}
                                            strokeWidth="1.2"
                                            filter="url(#badge-shadow)"
                                        />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 - 4}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                            fontWeight="900"
                                            letterSpacing="0.5"
                                        >
                                            {rackCode}
                                        </text>

                                        {/* 2. Solid High-Contrast Badge Pill Behind Secondary Metric */}
                                        <rect
                                            x={ex + ew / 2 - statusBadgeW / 2}
                                            y={ey + eh / 2 + 2}
                                            width={statusBadgeW}
                                            height="14"
                                            rx="3.5"
                                            fill="rgba(4, 7, 15, 0.94)"
                                            stroke={statusBorderColor}
                                            strokeWidth="0.8"
                                            filter="url(#badge-shadow)"
                                        />
                                        <text
                                            x={ex + ew / 2}
                                            y={ey + eh / 2 + 12}
                                            textAnchor="middle"
                                            fill={statusTextColor}
                                            fontSize="8.5"
                                            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                            fontWeight="bold"
                                        >
                                            {statusText}
                                        </text>

                                        {/* 3. Sleek Inner Capacity Mini-Bar (at bottom edge of rack) */}
                                        <rect
                                            x={ex + 6}
                                            y={ey + eh - 5}
                                            width={ew - 12}
                                            height="2.5"
                                            rx="1.25"
                                            fill="rgba(0, 0, 0, 0.6)"
                                        />
                                        <rect
                                            x={ex + 6}
                                            y={ey + eh - 5}
                                            width={Math.max(0, Math.min(ew - 12, (ew - 12) * (pct / 100)))}
                                            height="2.5"
                                            rx="1.25"
                                            fill={progressFill}
                                        />
                                    </g>
                                );
                            }

                            return null;
                        })}

                        {/* ─── Target Item Illuminated Beacon ─── */}
                        {locatedTarget?.spatialLocation && (
                            <g className="pointer-events-none">
                                {/* Dotted animated transit path from Dock 02 to target rack */}
                                <path
                                    d={`M ${10 * cellSize} ${4 * cellSize} L ${10 * cellSize} ${9.5 * cellSize} L ${
                                        (locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize
                                    } ${9.5 * cellSize} L ${
                                        (locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize
                                    } ${locatedTarget.spatialLocation.y * cellSize}`}
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="3"
                                    strokeDasharray="8 6"
                                    strokeLinecap="round"
                                    className="flow-arterial"
                                />

                                {/* High-visibility pulsing concentric rings centered on target */}
                                <circle
                                    cx={(locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize}
                                    cy={(locatedTarget.spatialLocation.y + locatedTarget.spatialLocation.height / 2) * cellSize}
                                    r="28"
                                    fill="rgba(234, 179, 8, 0.15)"
                                    stroke="#eab308"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                    className="flow-arterial"
                                />
                                <circle
                                    cx={(locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize}
                                    cy={(locatedTarget.spatialLocation.y + locatedTarget.spatialLocation.height / 2) * cellSize}
                                    r="11"
                                    fill="#eab308"
                                    stroke="#000000"
                                    strokeWidth="2.5"
                                />
                                <circle
                                    cx={(locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize}
                                    cy={(locatedTarget.spatialLocation.y + locatedTarget.spatialLocation.height / 2) * cellSize}
                                    r="3.5"
                                    fill="#ffffff"
                                />
                                {/* Target Callout Pin */}
                                <g transform={`translate(${
                                    (locatedTarget.spatialLocation.x + locatedTarget.spatialLocation.width / 2) * cellSize
                                }, ${
                                    locatedTarget.spatialLocation.y * cellSize - 14
                                })`}>
                                    <rect
                                        x="-44"
                                        y="-16"
                                        width="88"
                                        height="16"
                                        rx="4"
                                        fill="#0b101d"
                                        stroke="#eab308"
                                        strokeWidth="1.2"
                                        filter="url(#badge-shadow)"
                                    />
                                    <text
                                        x="0"
                                        y="-4"
                                        textAnchor="middle"
                                        fill="#fbbf24"
                                        fontSize="8.5"
                                        fontFamily="monospace"
                                        fontWeight="900"
                                    >
                                        TARGET PIN
                                    </text>
                                </g>
                            </g>
                        )}

                        {/* ─── Bottom-Right Compass Rose & Scale Widget ─── */}
                        <g transform={`translate(${svgWidth - 90}, ${svgHeight - 75})`}>
                            {/* Compass backdrop */}
                            <circle cx="35" cy="35" r="30" fill="rgba(8, 14, 26, 0.85)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
                            {/* Crosshairs */}
                            <line x1="35" y1="12" x2="35" y2="58" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.75" />
                            <line x1="12" y1="35" x2="58" y2="35" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.75" />
                            {/* North Arrow */}
                            <polygon points="35,16 39,32 35,28 31,32" fill="var(--color-gold)" />
                            <text x="35" y="12" textAnchor="middle" fill="var(--color-gold)" fontSize="8.5" fontFamily="monospace" fontWeight="bold">N</text>
                            <text x="35" y="62" textAnchor="middle" fill="rgba(148, 163, 184, 0.8)" fontSize="7" fontFamily="monospace">1 GRID = 1.0m</text>
                        </g>
                    </svg>
                </div>
            </div>

            {/* ─── Bottom Legend Bar ─── */}
            <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
                <div className="px-4 py-2.5 rounded-2xl bg-[#090d16]/95 border border-white/10 text-xs flex flex-wrap items-center gap-4 text-slate-300 shadow-2xl">
                    {heatmapMode === "occupancy" ? (
                        <>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border-2 border-dashed border-cyan-400 bg-cyan-500/20 animate-pulse" />
                                <span className="text-[11px] font-mono text-cyan-300 font-bold">100% Empty Rack ({emptyRacksCount})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-emerald-500 bg-emerald-500/30" />
                                <span className="text-[11px] font-mono text-emerald-400">1-40% Optimal</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-amber-500 bg-amber-500/30" />
                                <span className="text-[11px] font-mono text-amber-400">41-80% Full</span>
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
                                <span className="text-[11px] font-mono text-indigo-300 font-bold">Cold Dead Spot ({deadSpotsCount})</span>
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
                                <span className="text-[11px] font-mono">Active Docks ({docksCount} Bays)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-amber-400 bg-amber-400/20" />
                                <span className="text-[11px] font-mono">Main Forklift Highway</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-blue-400 bg-blue-400/20" />
                                <span className="text-[11px] font-mono">Storage Shelving Units ({racks.length})</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
