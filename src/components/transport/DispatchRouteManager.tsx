"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Truck, 
    MapPin, 
    Navigation, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCcw, 
    Zap, 
    Layers, 
    Phone, 
    User, 
    ChevronRight,
    Weight,
    Compass
} from "lucide-react";
import { toast } from "react-hot-toast";

interface RouteStop {
    id: string;
    sequenceIndex: number;
    venueAddress: string;
    contactPerson: string | null;
    contactPhone: string | null;
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    stopType: string;
    status: string;
    booking?: {
        bookingNumber: string;
        projectName: string;
        customerName: string;
        customerPhone: string;
    };
}

interface DispatchRoute {
    id: string;
    clusterNumber: string;
    zone: string;
    driverName: string | null;
    vehiclePlate: string | null;
    vehicleCapacityKg: number;
    scheduledDate: string;
    status: string;
    totalStops: number;
    totalWeightKg: number;
    totalVolumeCbm: number;
    stops: RouteStop[];
}

export default function DispatchRouteManager() {
    const [routes, setRoutes] = useState<DispatchRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClustering, setIsClustering] = useState(false);
    const [selectedZone, setSelectedZone] = useState<string>("all");

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/transport/clusters");
            const data = await res.json();
            if (res.ok && data.routes) {
                setRoutes(data.routes);
            }
        } catch (err) {
            console.error("Failed to load routes:", err);
            toast.error("Failed to load dispatch routes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    const handleAutoCluster = async () => {
        setIsClustering(true);
        try {
            const res = await fetch("/api/admin/transport/clusters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "Auto-clustering completed!");
                fetchRoutes();
            } else {
                toast.error(data.error || "Clustering failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Error running cluster algorithm");
        } finally {
            setIsClustering(false);
        }
    };

    const handleUpdateStopStatus = async (routeId: string, stopId: string, stopStatus: string) => {
        try {
            const res = await fetch(`/api/admin/transport/clusters/${routeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stopId, stopStatus }),
            });
            if (res.ok) {
                toast.success(`Stop marked ${stopStatus}`);
                fetchRoutes();
            }
        } catch (e: any) {
            toast.error("Failed to update stop status");
        }
    };

    const handleDispatchRoute = async (routeId: string) => {
        try {
            const res = await fetch(`/api/admin/transport/clusters/${routeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "in_transit" }),
            });
            if (res.ok) {
                toast.success("Route dispatched to driver navigation!");
                fetchRoutes();
            }
        } catch (e: any) {
            toast.error("Failed to dispatch route");
        }
    };

    const filteredRoutes = selectedZone === "all" 
        ? routes 
        : routes.filter(r => r.zone === selectedZone);

    const zones = Array.from(new Set(routes.map(r => r.zone)));

    const totalStopsCount = routes.reduce((acc, r) => acc + (r.totalStops || 0), 0);
    const totalWeight = routes.reduce((acc, r) => acc + (r.totalWeightKg || 0), 0);

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Top KPI Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate">Active Delivery Routes</span>
                    <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-white mt-1">
                        {routes.length} <span className="text-xs text-gold font-mono">Routes</span>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate">Total Waypoint Stops</span>
                    <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-emerald-400 mt-1">
                        {totalStopsCount} <span className="text-xs text-slate font-mono">Stops</span>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate">Total Transport Payload</span>
                    <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-gold mt-1">
                        {totalWeight.toLocaleString()} <span className="text-xs text-slate font-mono">KG</span>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-surface/80 border border-white/10 shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate">Qatar Logistics Clusters</span>
                    <div className="text-2xl font-[family-name:var(--font-heading)] font-black text-white mt-1">
                        {zones.length} <span className="text-xs text-gold font-mono">Municipal Zones</span>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="p-6 rounded-3xl bg-navy border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl">
                <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                        <Compass className="w-4 h-4 text-gold" />
                        Automated Geographic Route Optimizer
                    </h2>
                    <p className="text-xs text-slate mt-0.5">
                        Clusters pending event orders into sequenced delivery runs by Qatar sector and vehicle load limits.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRoutes}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate hover:text-white transition-all"
                        title="Refresh Routes"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={handleAutoCluster}
                        disabled={isClustering}
                        className="px-6 py-3 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 flex items-center gap-2"
                    >
                        <Zap className="w-4 h-4 fill-navy" />
                        {isClustering ? "Sequencing Clusters..." : "Auto-Cluster Pending Orders"}
                    </button>
                </div>
            </div>

            {/* Zone Filter */}
            {zones.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedZone("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            selectedZone === "all" ? "bg-gold text-navy shadow-md" : "bg-surface text-slate hover:text-white"
                        }`}
                    >
                        All Sectors ({routes.length})
                    </button>
                    {zones.map(z => (
                        <button
                            key={z}
                            onClick={() => setSelectedZone(z)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                selectedZone === z ? "bg-gold text-navy shadow-md" : "bg-surface text-slate hover:text-white"
                            }`}
                        >
                            {z} ({routes.filter(r => r.zone === z).length})
                        </button>
                    ))}
                </div>
            )}

            {/* Routes List */}
            {filteredRoutes.length === 0 ? (
                <div className="p-12 rounded-3xl bg-surface/50 border border-white/5 text-center text-slate">
                    <Truck className="w-10 h-10 text-gold mx-auto mb-3 opacity-40" />
                    <h4 className="text-white font-bold text-sm">No Active Dispatch Clusters</h4>
                    <p className="text-xs mt-1">Click &quot;Auto-Cluster Pending Orders&quot; to group staged event bookings into optimized delivery runs.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredRoutes.map(route => {
                        const loadPct = Math.min(100, Math.round((route.totalWeightKg / (route.vehicleCapacityKg || 3500)) * 100));

                        return (
                            <div key={route.id} className="p-6 md:p-8 rounded-3xl bg-surface/60 border border-white/10 shadow-2xl space-y-6">
                                {/* Route Card Top Header */}
                                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-white/10 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <span className="px-3 py-1 rounded-lg bg-gold/10 border border-gold/20 font-mono text-[10px] text-gold font-bold">
                                                {route.clusterNumber}
                                            </span>
                                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white">
                                                {route.zone}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                route.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                                                route.status === "in_transit" ? "bg-gold/20 text-gold" : "bg-white/10 text-slate-300"
                                            }`}>
                                                {route.status?.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono flex items-center gap-3">
                                            <span>Vehicle: <strong className="text-white">{route.vehiclePlate || "QA Fleet"}</strong></span>
                                            <span>•</span>
                                            <span>Driver: <strong className="text-white">{route.driverName || "Assigned Driver"}</strong></span>
                                        </div>
                                    </div>

                                    {/* Payload load progress */}
                                    <div className="w-full lg:w-72">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-400 text-[10px] uppercase font-bold">Payload Capacity</span>
                                            <span className="font-mono text-gold font-bold text-xs">{route.totalWeightKg} / {route.vehicleCapacityKg} KG ({loadPct}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${loadPct > 85 ? "bg-red-500" : loadPct > 65 ? "bg-amber-500" : "bg-emerald-500"}`}
                                                style={{ width: `${loadPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {route.status !== "in_transit" && route.status !== "completed" && (
                                        <button
                                            onClick={() => handleDispatchRoute(route.id)}
                                            className="px-4 py-2 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-md flex items-center gap-1.5"
                                        >
                                            <Navigation className="w-3.5 h-3.5 fill-navy" /> Dispatch Driver
                                        </button>
                                    )}
                                </div>

                                {/* Sequenced Stops Timeline */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate">
                                        Sequenced Waypoints ({route.stops?.length || 0} Stops)
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(route.stops || []).map((stop) => {
                                            const isDone = stop.status === "completed";
                                            return (
                                                <div 
                                                    key={stop.id}
                                                    className={`p-4 rounded-2xl border transition-all ${
                                                        isDone 
                                                            ? "bg-emerald-500/[0.03] border-emerald-500/20 opacity-70" 
                                                            : "bg-white/[0.02] border-white/5 hover:border-gold/30"
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="w-6 h-6 rounded-full bg-gold/20 text-gold font-mono font-bold text-xs flex items-center justify-center">
                                                            {stop.sequenceIndex}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                                            isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"
                                                        }`}>
                                                            {stop.status}
                                                        </span>
                                                    </div>

                                                    <h5 className="font-bold text-white text-xs line-clamp-1 mb-1">
                                                        {stop.venueAddress}
                                                    </h5>

                                                    <div className="text-[10px] text-slate-400 space-y-0.5">
                                                        {stop.contactPerson && (
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-3 h-3 text-gold" />
                                                                <span>{stop.contactPerson}</span>
                                                            </div>
                                                        )}
                                                        {stop.contactPhone && (
                                                            <div className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3 text-gold" />
                                                                <span>{stop.contactPhone}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 text-slate-500">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Window: {stop.timeWindowStart} - {stop.timeWindowEnd}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center">
                                                        <span className="text-[9px] font-mono text-gold uppercase">
                                                            {stop.stopType}
                                                        </span>
                                                        {!isDone && (
                                                            <button
                                                                onClick={() => handleUpdateStopStatus(route.id, stop.id, "completed")}
                                                                className="text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:underline"
                                                            >
                                                                Mark Done ✓
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
