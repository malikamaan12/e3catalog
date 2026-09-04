"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Radio, Compass, Navigation, BatteryCharging, Gauge, MapPin, 
    Truck, RefreshCw, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
    Eye, Play, Pause, Zap 
} from "lucide-react";

interface FleetVehicle {
    id: string;
    routeId: string;
    clusterNumber: string;
    driverName: string;
    vehiclePlate: string;
    zone: string;
    status: string;
    latitude: number;
    longitude: number;
    heading: number;
    speedKmh: number;
    batteryPct: number;
    distanceRemainingKm: number;
    etaMinutes: number;
    totalStops: number;
}

interface RadarData {
    timestamp: string;
    totalActiveVans: number;
    hubs: Record<string, { lat: number; lng: number; name: string }>;
    vehicles: FleetVehicle[];
}

export default function LiveFleetRadar() {
    const [data, setData] = useState<RadarData | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [lastPingTime, setLastPingTime] = useState<string>("");

    const fetchRadar = useCallback(async () => {
        try {
            const res = await fetch("/api/fleet/live-radar");
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastPingTime(new Date().toLocaleTimeString());
                if (!selectedVehicle && json.vehicles?.length > 0) {
                    setSelectedVehicle(json.vehicles[0]);
                } else if (selectedVehicle && json.vehicles) {
                    const updated = json.vehicles.find((v: FleetVehicle) => v.id === selectedVehicle.id);
                    if (updated) setSelectedVehicle(updated);
                }
            }
        } catch (err) {
            console.error("Failed to load radar data", err);
        } finally {
            setLoading(false);
        }
    }, [selectedVehicle]);

    useEffect(() => {
        fetchRadar();
        const interval = setInterval(fetchRadar, 6000);
        return () => clearInterval(interval);
    }, [fetchRadar]);

    // Live movement simulator: pushes simulated GPS pings to move vehicles across Qatar
    useEffect(() => {
        if (!isSimulating || !data?.vehicles) return;

        const simInterval = setInterval(async () => {
            const randomVan = data.vehicles[Math.floor(Math.random() * data.vehicles.length)];
            if (!randomVan) return;

            // Small movement delta within Qatar bounding box
            const deltaLat = (Math.random() - 0.48) * 0.006;
            const deltaLng = (Math.random() - 0.48) * 0.006;
            const newLat = Number((randomVan.latitude + deltaLat).toFixed(4));
            const newLng = Number((randomVan.longitude + deltaLng).toFixed(4));
            const newSpeed = Math.floor(35 + Math.random() * 35);
            const newBattery = Math.max(20, randomVan.batteryPct - (Math.random() > 0.8 ? 1 : 0));

            try {
                await fetch("/api/driver/gps/stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        routeId: randomVan.routeId,
                        vehiclePlate: randomVan.vehiclePlate,
                        driverId: null,
                        latitude: newLat,
                        longitude: newLng,
                        speed: newSpeed,
                        batteryPct: newBattery,
                        heading: Math.floor(Math.random() * 360),
                        status: "in_transit",
                    }),
                });
                fetchRadar();
            } catch (e) {
                console.error("Simulation error", e);
            }
        }, 3000);

        return () => clearInterval(simInterval);
    }, [isSimulating, data, fetchRadar]);

    // Map projection helper: converts Qatar lat/lng (approx 24.8 to 26.2 N, 50.8 to 51.7 E) into SVG canvas coordinates
    const projectToSvg = (lat: number, lng: number) => {
        const minLat = 24.95;
        const maxLat = 25.80;
        const minLng = 51.10;
        const maxLng = 51.75;

        const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 50;
        const y = 500 - ((lat - minLat) / (maxLat - minLat)) * 420;

        return { x: Math.max(30, Math.min(770, x)), y: Math.max(30, Math.min(470, y)) };
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center p-16 glass rounded-2xl border border-white/10">
                <RefreshCw className="w-8 h-8 text-[var(--color-gold)] animate-spin mb-4" />
                <p className="text-sm font-bold tracking-widest text-[var(--color-slate)] uppercase">Acquiring Qatar Logistics Radar Feed...</p>
            </div>
        );
    }

    const vehicles = data?.vehicles || [];

    return (
        <div className="flex flex-col gap-6 w-full animate-fade-in">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 glass p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-[var(--color-warm-white)] uppercase tracking-wider">Qatar Logistics Radar</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">
                                Live GPS Feed
                            </span>
                        </div>
                        <p className="text-xs text-[var(--color-slate)]">
                            Tracking {vehicles.length} Active Patrol Delivery Vans • Last telemetry ping at {lastPingTime || "Active"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                            isSimulating 
                                ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/20 animate-pulse"
                                : "glass border-white/10 text-[var(--color-slate)] hover:text-white hover:border-white/20"
                        }`}
                    >
                        {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isSimulating ? "Simulating Live Movement" : "Start Live Telemetry Sim"}
                    </button>

                    <button
                        onClick={fetchRadar}
                        className="p-2.5 glass rounded-xl border border-white/10 text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all active:scale-95"
                        title="Force Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Radar Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SVG Radar Map (8 cols) */}
                <div className="lg:col-span-8 glass rounded-2xl border border-white/10 p-4 relative overflow-hidden bg-neutral-950/80 min-h-[460px] flex flex-col justify-between">
                    {/* Radar Grid Overlay Lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

                    {/* Concentric Radar Rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-[300px] h-[300px] rounded-full border border-emerald-500/20 animate-ping [animation-duration:4s]" />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-[480px] h-[480px] rounded-full border border-emerald-500/10" />
                    </div>

                    {/* SVG Map of Qatar Peninsula & Waypoints */}
                    <svg viewBox="0 0 800 500" className="w-full h-full relative z-10 select-none">
                        <defs>
                            <linearGradient id="qatarLandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
                            </linearGradient>
                            <radialGradient id="radarScan" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </radialGradient>
                        </defs>

                        {/* Qatar Coastline Stylized Geometry */}
                        <path
                            d="M 380 40 
                               C 450 60, 520 120, 560 180 
                               C 590 230, 600 290, 580 360 
                               C 560 420, 510 470, 440 480 
                               C 380 490, 310 480, 270 440 
                               C 240 400, 230 330, 240 270 
                               C 250 200, 290 130, 340 70 Z"
                            fill="url(#qatarLandGradient)"
                            stroke="#334155"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            className="transition-all duration-700"
                        />

                        {/* Major Hubs / Landmarks */}
                        {data?.hubs && Object.entries(data.hubs).map(([key, hub]) => {
                            const pos = projectToSvg(hub.lat, hub.lng);
                            return (
                                <g key={key} className="transition-all">
                                    <circle cx={pos.x} cy={pos.y} r="4" fill="#64748b" opacity="0.6" />
                                    <circle cx={pos.x} cy={pos.y} r="8" fill="none" stroke="#475569" strokeWidth="1" opacity="0.4" />
                                    <text 
                                        x={pos.x + 8} 
                                        y={pos.y + 3} 
                                        fill="#94a3b8" 
                                        fontSize="9" 
                                        fontWeight="700" 
                                        fontFamily="sans-serif"
                                        className="tracking-wider uppercase opacity-80"
                                    >
                                        {hub.name.split(" ")[0]}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Active Vehicle Markers */}
                        {vehicles.map((veh) => {
                            const pos = projectToSvg(veh.latitude, veh.longitude);
                            const isSelected = selectedVehicle?.id === veh.id;

                            return (
                                <g 
                                    key={veh.id} 
                                    onClick={() => setSelectedVehicle(veh)}
                                    className="cursor-pointer transition-all duration-700 group"
                                >
                                    {/* Pulsing ring */}
                                    <circle 
                                        cx={pos.x} 
                                        cy={pos.y} 
                                        r={isSelected ? "18" : "12"} 
                                        fill={isSelected ? "#10b981" : "#eab308"} 
                                        opacity={isSelected ? "0.25" : "0.15"} 
                                        className="animate-ping" 
                                    />

                                    {/* Van pin badge */}
                                    <circle 
                                        cx={pos.x} 
                                        cy={pos.y} 
                                        r="9" 
                                        fill={isSelected ? "#10b981" : "#eab308"} 
                                        stroke="#0f172a" 
                                        strokeWidth="2.5" 
                                    />

                                    {/* Directional Heading indicator arrow */}
                                    <line
                                        x1={pos.x}
                                        y1={pos.y}
                                        x2={pos.x + Math.sin(veh.heading * (Math.PI / 180)) * 16}
                                        y2={pos.y - Math.cos(veh.heading * (Math.PI / 180)) * 16}
                                        stroke={isSelected ? "#34d399" : "#fef08a"}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />

                                    {/* Label Pill */}
                                    <rect 
                                        x={pos.x - 36} 
                                        y={pos.y - 24} 
                                        width="72" 
                                        height="14" 
                                        rx="4" 
                                        fill="#020617" 
                                        stroke={isSelected ? "#10b981" : "#475569"} 
                                        strokeWidth="1" 
                                    />
                                    <text 
                                        x={pos.x} 
                                        y={pos.y - 14} 
                                        textAnchor="middle" 
                                        fill="#f8fafc" 
                                        fontSize="8" 
                                        fontWeight="900" 
                                        letterSpacing="0.05em"
                                    >
                                        {veh.vehiclePlate}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Bottom Map Legend */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10 text-xs text-[var(--color-slate)]">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 font-bold text-white">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Selected Unit
                            </span>
                            <span className="flex items-center gap-1.5 font-bold text-white">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> In Transit
                            </span>
                            <span className="flex items-center gap-1.5 font-bold text-white">
                                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Qatar Logistics Hub
                            </span>
                        </div>
                        <div className="font-mono text-[11px] text-emerald-400/90 font-bold">
                            ZONE: DOHA METRO & GREATER QATAR
                        </div>
                    </div>
                </div>

                {/* Right Vehicle Telemetry Sidebar (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Active Selected Van Detail Card */}
                    {selectedVehicle ? (
                        <div className="glass rounded-2xl border border-[var(--color-gold)]/40 p-5 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-transparent">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-[var(--color-gold)]" />
                                        <h3 className="font-black text-base text-[var(--color-warm-white)] uppercase tracking-wider">
                                            {selectedVehicle.vehiclePlate}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-[var(--color-slate)] font-medium mt-0.5">
                                        Driver: <span className="text-white font-bold">{selectedVehicle.driverName}</span>
                                    </p>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    {selectedVehicle.status.replace("_", " ")}
                                </span>
                            </div>

                            {/* Telemetry Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2.5 text-xs">
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider flex items-center gap-1 font-bold">
                                        <Gauge className="w-3 h-3 text-blue-400" /> Velocity
                                    </span>
                                    <span className="text-lg font-black text-white font-mono">
                                        {selectedVehicle.speedKmh} <span className="text-xs font-normal text-[var(--color-slate)]">km/h</span>
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider flex items-center gap-1 font-bold">
                                        <BatteryCharging className="w-3 h-3 text-emerald-400" /> Telemetry Battery
                                    </span>
                                    <span className="text-lg font-black text-white font-mono">
                                        {selectedVehicle.batteryPct}%
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider flex items-center gap-1 font-bold">
                                        <MapPin className="w-3 h-3 text-[var(--color-gold)]" /> Remaining Dist
                                    </span>
                                    <span className="text-base font-black text-white font-mono">
                                        {selectedVehicle.distanceRemainingKm} <span className="text-xs font-normal text-[var(--color-slate)]">km</span>
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider flex items-center gap-1 font-bold">
                                        <Clock className="w-3 h-3 text-amber-400" /> Waypoint ETA
                                    </span>
                                    <span className="text-base font-black text-amber-300 font-mono">
                                        ~{selectedVehicle.etaMinutes} <span className="text-xs font-normal text-amber-400/80">mins</span>
                                    </span>
                                </div>
                            </div>

                            {/* Current Operational Zone */}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                <span className="text-[var(--color-slate)] font-medium">Logistics Zone:</span>
                                <span className="font-bold text-white text-right">{selectedVehicle.zone}</span>
                            </div>

                            {/* Geo Coordinates */}
                            <div className="font-mono text-[10px] text-[var(--color-slate)] flex items-center justify-between px-1">
                                <span>GPS: {selectedVehicle.latitude.toFixed(4)}°N, {selectedVehicle.longitude.toFixed(4)}°E</span>
                                <span>Heading: {selectedVehicle.heading}°</span>
                            </div>
                        </div>
                    ) : (
                        <div className="glass rounded-2xl border border-white/10 p-6 text-center text-sm text-[var(--color-slate)] italic">
                            Select a vehicle on the radar to inspect live telemetry.
                        </div>
                    )}

                    {/* Fleet Manifest List */}
                    <div className="glass rounded-2xl border border-white/10 p-4 flex flex-col gap-3 max-h-[280px] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-warm-white)]">
                                All Active Patrol Vans ({vehicles.length})
                            </h4>
                            <span className="text-[10px] text-[var(--color-slate)] font-bold font-mono">QATAR REGION</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {vehicles.map((v) => {
                                const isCur = selectedVehicle?.id === v.id;
                                return (
                                    <div
                                        key={v.id}
                                        onClick={() => setSelectedVehicle(v)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                                            isCur 
                                                ? "bg-white/[0.08] border-emerald-500/50 shadow-md" 
                                                : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2 h-2 rounded-full ${isCur ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                                            <div>
                                                <p className="text-xs font-bold text-white tracking-wide">{v.vehiclePlate}</p>
                                                <p className="text-[10px] text-[var(--color-slate)]">{v.driverName} • {v.zone.split(" ")[0]}</p>
                                            </div>
                                        </div>
                                        <div className="text-right font-mono text-xs">
                                            <p className="font-bold text-emerald-400">{v.speedKmh} km/h</p>
                                            <p className="text-[10px] text-[var(--color-slate)]">ETA: {v.etaMinutes}m</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
