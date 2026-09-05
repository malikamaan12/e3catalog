"use client";

import React, { useState, useEffect } from "react";
import { 
    Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, 
    ChevronDown, ChevronUp, Layers, HardDrive, Trash2, Clock 
} from "lucide-react";
import { offlineBuffer, SyncStatus, BufferedAction } from "@/lib/offline-sync-buffer";

interface Props {
    className?: string;
    showDrawerDefault?: boolean;
}

export default function OfflineSyncBanner({ className = "", showDrawerDefault = false }: Props) {
    const [status, setStatus] = useState<SyncStatus>({
        isOnline: true,
        pendingCount: 0,
        syncingCount: 0,
        isSyncing: false,
    });
    const [queue, setQueue] = useState<BufferedAction[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(showDrawerDefault);
    const [lastResultMsg, setLastResultMsg] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = offlineBuffer.subscribe((newStatus) => {
            setStatus(newStatus);
            setQueue(offlineBuffer.getQueue());
        });

        return () => unsubscribe();
    }, []);

    const handleManualSync = async () => {
        setLastResultMsg(null);
        const res = await offlineBuffer.flushQueue();
        if (res.total > 0) {
            setLastResultMsg(`Synced ${res.synced} of ${res.total} transactions.`);
            setTimeout(() => setLastResultMsg(null), 4000);
        }
    };

    // If completely online and zero pending actions, show sleek compact indicator
    if (status.isOnline && status.pendingCount === 0 && !status.isSyncing && !isDrawerOpen) {
        return (
            <div data-testid="offline-sync-banner" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-bold text-emerald-400 select-none ${className}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>Signal Online • All Cloud Synced</span>
            </div>
        );
    }

    return (
        <div data-testid="offline-sync-banner" className={`flex flex-col rounded-2xl border transition-all shadow-xl overflow-hidden ${
            !status.isOnline 
                ? "bg-amber-950/80 border-amber-500/40 text-amber-200" 
                : status.pendingCount > 0 
                    ? "bg-blue-950/80 border-blue-500/40 text-blue-200" 
                    : "bg-neutral-900/90 border-white/10 text-white"
        } ${className}`}>
            {/* Top Status Bar */}
            <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {!status.isOnline ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <WifiOff className="w-4 h-4 animate-bounce" />
                        </div>
                    ) : status.isSyncing ? (
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Wifi className="w-4 h-4" />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider">
                                {!status.isOnline 
                                    ? "Offline Dock Mode" 
                                    : status.isSyncing 
                                        ? "Flushing Buffer..." 
                                        : "Local Buffer Active"}
                            </span>
                            {status.pendingCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-neutral-950">
                                    {status.pendingCount} Queued
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">
                            {!status.isOnline 
                                ? "Zero cellular signal. Scans, PODs, and audits are buffering safely in local storage."
                                : status.isSyncing 
                                    ? `Transmitting ${status.syncingCount || status.pendingCount} items to central database...`
                                    : `${status.pendingCount} transaction(s) pending sync to central database.`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {lastResultMsg && (
                        <span className="text-xs font-bold text-emerald-400 mr-2 animate-fade-in">
                            {lastResultMsg}
                        </span>
                    )}

                    {status.isOnline && status.pendingCount > 0 && (
                        <button
                            onClick={handleManualSync}
                            disabled={status.isSyncing}
                            className="px-3 py-1.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-[var(--color-gold)]/20"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${status.isSyncing ? "animate-spin" : ""}`} />
                            Sync Now
                        </button>
                    )}

                    <button
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                        title="Toggle Queue Details"
                    >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Buffer Details</span>
                        {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Expandable Drawer: Inspect Queue */}
            {isDrawerOpen && (
                <div className="border-t border-white/10 bg-black/40 p-4 flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-slate)] uppercase tracking-wider">
                        <span>Queued Offline Items ({queue.length})</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => offlineBuffer.cleanupSynced()}
                                className="text-amber-400 hover:underline"
                            >
                                Clear Synced
                            </button>
                            <button
                                onClick={() => offlineBuffer.clearAll()}
                                className="text-rose-400 hover:underline flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> Clear Queue
                            </button>
                        </div>
                    </div>

                    {queue.length === 0 ? (
                        <p className="text-[11px] text-[var(--color-slate)] py-2 text-center font-mono">
                            No buffered transactions in local storage. All scans are synchronized with server.
                        </p>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1">
                            {queue.map((item) => (
                                <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                            item.status === "synced" 
                                                ? "bg-emerald-400" 
                                                : item.status === "syncing" 
                                                    ? "bg-blue-400 animate-ping" 
                                                    : item.status === "failed" 
                                                        ? "bg-rose-400" 
                                                        : "bg-amber-400"
                                        }`} />
                                        <div>
                                            <p className="font-bold text-white leading-tight">{item.description}</p>
                                            <p className="text-[10px] font-mono text-[var(--color-slate)]">
                                                {item.actionType} • {new Date(item.timestamp).toLocaleTimeString()}
                                                {item.retryCount > 0 && ` • Retries: ${item.retryCount}`}
                                                {item.lastError && ` • Error: ${item.lastError}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                        item.status === "synced" 
                                            ? "bg-emerald-500/20 text-emerald-300" 
                                            : item.status === "failed" 
                                                ? "bg-rose-500/20 text-rose-300" 
                                                : "bg-amber-500/20 text-amber-300"
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
