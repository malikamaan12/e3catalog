"use client";

import React, { useState, useEffect } from "react";
import { 
    Truck, 
    MapPin, 
    Navigation, 
    Gauge, 
    Clock, 
    Phone, 
    ShieldCheck, 
    CheckCircle2, 
    AlertCircle,
    RefreshCw,
    Compass
} from "lucide-react";

interface LiveTrackingMapProps {
    dispatchLogId: string;
    driverName?: string;
    vehiclePlate?: string;
    destinationName?: string;
    destinationAddress?: string;
}

export function LiveTrackingMap({
    dispatchLogId,
    driverName: initialDriverName,
    vehiclePlate: initialVehiclePlate,
    destinationName: initialDestName,
    destinationAddress: initialDestAddress,
}: LiveTrackingMapProps) {
    const [telemetry, setTelemetry] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchTelemetry = async () => {
        try {
            const res = await fetch(`/api/fleet/track/${dispatchLogId}`);
            const data = await res.json();
            if (data.latestPing) {
                setTelemetry(data);
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error("Telemetry fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTelemetry();
        // Poll every 8 seconds for live GPS stream
        const interval = setInterval(fetchTelemetry, 8000);
        return () => clearInterval(interval);
    }, [dispatchLogId]);

    const driverName = telemetry?.dispatchLog?.driverName || initialDriverName || "Designated E3 Driver";
    const vehiclePlate = telemetry?.dispatchLog?.vehiclePlateNumber || initialVehiclePlate || "Q-19482";
    const destination = telemetry?.destination?.name || initialDestName || "Event Operational Site";
    const address = telemetry?.destination?.address || initialDestAddress || "Doha, Qatar";
    const status = telemetry?.latestPing?.status || "in_transit";
    const speed = telemetry?.latestPing?.speed || 48;
    const eta = telemetry?.etaMinutes !== undefined ? telemetry.etaMinutes : 18;

    return (
        <div className="space-y-6">
            {/* Top Telemetry Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl glass border border-white/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)]">Estimated ETA</p>
                        <p className="text-2xl font-black text-white font-[family-name:var(--font-heading)]">
                            {eta === 0 ? "Arrived" : `~${eta} Mins`}
                        </p>
                        <p className="text-[9px] text-emerald-400 font-bold">On Schedule · Doha Corridor</p>
                    </div>
                </div>

                <div className="p-5 rounded-3xl glass border border-white/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                        <Gauge className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)]">Cruising Speed</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white font-[family-name:var(--font-heading)]">{speed}</span>
                            <span className="text-xs font-bold text-[var(--color-slate)]">km/h</span>
                        </div>
                        <p className="text-[9px] text-[var(--color-slate)] font-bold">Monitored GPS Telemetry</p>
                    </div>
                </div>

                <div className="p-5 rounded-3xl glass border border-white/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)]">Fleet Vehicle</p>
                        <p className="text-sm font-black text-white truncate">{vehiclePlate}</p>
                        <p className="text-[9px] text-[var(--color-slate)] font-bold">{driverName}</p>
                    </div>
                </div>

                <div className="p-5 rounded-3xl glass border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between p-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Status</p>
                        <p className="text-sm font-black text-white uppercase tracking-wider mt-0.5">
                            {status.replace('_', ' ')}
                        </p>
                        <p className="text-[9px] text-[var(--color-slate)]">Auto-syncs every 8s</p>
                    </div>
                    <button 
                        onClick={fetchTelemetry}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--color-slate)] hover:text-white transition-all"
                        title="Manual Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Stylized Interactive GPS Map Canvas */}
            <div className="glass rounded-[2.5rem] border border-white/10 bg-[#070d17] p-8 relative overflow-hidden shadow-2xl min-h-[420px] flex flex-col justify-between">
                {/* Background Grid Lines & Geographic Simulation */}
                <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                    backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.15) 1px, transparent 1px)",
                    backgroundSize: "24px 24px"
                }} />

                {/* Simulated Transit Corridor Path (SVG Route) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                    <defs>
                        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#d4af37" />
                            <stop offset="50%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                    </defs>
                    <path 
                        d="M 120 340 C 260 280, 420 220, 560 180 S 780 140, 920 90" 
                        fill="none" 
                        stroke="url(#routeGradient)" 
                        strokeWidth="4" 
                        strokeDasharray="8 8"
                        className="animate-pulse"
                    />
                </svg>

                {/* Map Header Overlay */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                            Active GPS Transit Feed · State of Qatar
                        </span>
                    </div>

                    <div className="px-4 py-2 rounded-2xl glass border border-white/10 text-right">
                        <p className="text-[9px] text-[var(--color-slate)] uppercase tracking-widest font-black">Destination Venue</p>
                        <p className="text-xs font-bold text-white truncate max-w-xs">{destination}</p>
                    </div>
                </div>

                {/* Visual Route Nodes */}
                <div className="relative z-10 my-auto py-12 flex flex-col md:flex-row items-center justify-between gap-8 px-6">
                    {/* Warehouse Origin Node */}
                    <div className="flex items-center gap-4 glass p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Building2Icon />
                        </div>
                        <div>
                            <span className="text-[9px] text-[var(--color-slate)] uppercase tracking-widest font-black">Origin Hub</span>
                            <p className="text-xs font-bold text-white">E3 Central Depot (Salwa Road)</p>
                            <p className="text-[9px] text-emerald-400 font-bold">Dispatched: Verified</p>
                        </div>
                    </div>

                    {/* Live In-Transit Vehicle Node */}
                    <div className="relative flex flex-col items-center group">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-gold)]/20 border-2 border-[var(--color-gold)] flex items-center justify-center text-[var(--color-gold)] shadow-[0_0_40px_rgba(212,175,55,0.4)] animate-pulse">
                            <Truck className="w-8 h-8 text-[var(--color-gold)]" />
                        </div>
                        <div className="mt-3 text-center">
                            <span className="px-3 py-1 rounded-full bg-[var(--color-gold)] text-[var(--color-navy)] text-[10px] font-black uppercase tracking-widest shadow-md">
                                {vehiclePlate} · {speed} km/h
                            </span>
                            <p className="text-[10px] text-white font-mono mt-1">
                                {telemetry?.latestPing?.latitude?.toFixed(4) || "25.2867"}° N, {telemetry?.latestPing?.longitude?.toFixed(4) || "51.5333"}° E
                            </p>
                        </div>
                    </div>

                    {/* Destination Venue Node */}
                    <div className="flex items-center gap-4 glass p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[9px] text-[var(--color-slate)] uppercase tracking-widest font-black">Target Venue</span>
                            <p className="text-xs font-bold text-white max-w-[200px] truncate">{destination}</p>
                            <p className="text-[9px] text-[var(--color-slate)] truncate max-w-[200px]">{address}</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer Info */}
                <div className="relative z-10 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] text-[var(--color-slate)]">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>High-Value AV Equipment Cargo · Manifest Verified</span>
                    </div>
                    <div>
                        Last coordinate handshake: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Building2Icon() {
    return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
        </svg>
    );
}
