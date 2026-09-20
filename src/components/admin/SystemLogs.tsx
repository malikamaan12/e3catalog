"use client";

import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, Key, UserCog, Settings, RefreshCcw, Search, Database } from "lucide-react";

interface LogType {
    id: string;
    action: string;
    targetId: string;
    targetType: string;
    details: string;
    createdAt: string;
    adminName: string;
    adminEmail: string;
}

export function SystemLogs() {
    const [logs, setLogs] = useState<LogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/super-admin/logs");
            if (res.ok) {
                const data = await res.json();
                // Resiliently extract array from either direct array or { logs: [...] }
                const items: LogType[] = Array.isArray(data) 
                    ? data 
                    : (Array.isArray(data?.logs) ? data.logs : []);
                setLogs(items);
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData?.error || `Failed to fetch logs (Status ${res.status})`);
                setLogs([]);
            }
        } catch (err: any) {
            console.error("Failed to fetch logs:", err);
            setError(err?.message || "An unexpected error occurred while loading logs.");
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionIcon = (action?: string) => {
        if (!action) return <Activity className="w-4 h-4 text-gray-400 shrink-0" />;
        const act = action.toLowerCase();
        if (act.includes("password") || act.includes("auth") || act.includes("login")) {
            return <Key className="w-4 h-4 text-blue-400 shrink-0" />;
        }
        if (act.includes("setting") || act.includes("feature") || act.includes("config")) {
            return <Settings className="w-4 h-4 text-purple-400 shrink-0" />;
        }
        if (act.includes("user") || act.includes("role") || act.includes("member")) {
            return <UserCog className="w-4 h-4 text-green-400 shrink-0" />;
        }
        if (act.includes("vendor") || act.includes("product") || act.includes("inventory")) {
            return <Database className="w-4 h-4 text-amber-400 shrink-0" />;
        }
        return <Activity className="w-4 h-4 text-gray-400 shrink-0" />;
    };

    const formatDetails = (detailsStr?: string) => {
        if (!detailsStr) return "N/A";
        try {
            const parsed = JSON.parse(detailsStr);
            if (typeof parsed !== "object" || parsed === null) {
                return String(parsed);
            }
            if (parsed.message) return parsed.message;
            return Object.entries(parsed)
                .filter(([k]) => k !== "updatedAt")
                .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                .join(", ");
        } catch {
            return detailsStr;
        }
    };

    const formatDate = (isoString?: string) => {
        if (!isoString) return "Just now";
        try {
            const d = new Date(isoString);
            return isNaN(d.getTime()) ? isoString : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
        } catch {
            return isoString;
        }
    };

    const safeLogs = Array.isArray(logs) ? logs : [];
    const filteredLogs = safeLogs.filter(log => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (log.action || "").toLowerCase().includes(q) ||
            (log.targetType || "").toLowerCase().includes(q) ||
            (log.targetId || "").toLowerCase().includes(q) ||
            (log.adminName || "").toLowerCase().includes(q) ||
            (log.adminEmail || "").toLowerCase().includes(q) ||
            (log.details || "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Activity className="w-6 h-6 text-[var(--color-gold)]" />
                        System Audit Logs
                    </h2>
                    <p className="text-sm text-[var(--color-slate)]">
                        Immutable ledger of platform actions, security events, and configuration updates.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input
                            type="text"
                            placeholder="Filter logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[var(--color-gold)] transition-colors"
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--color-slate)] hover:text-[var(--color-gold)] hover:bg-white/10 transition-all shrink-0"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={fetchLogs} className="underline text-xs font-bold hover:text-white">
                        Retry
                    </button>
                </div>
            )}

            <div className="glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[920px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-5 py-3.5 text-[10px] font-black text-[var(--color-gold)] uppercase tracking-wider whitespace-nowrap w-[170px]">Timestamp</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-[var(--color-gold)] uppercase tracking-wider whitespace-nowrap w-[200px]">Admin</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-[var(--color-gold)] uppercase tracking-wider whitespace-nowrap w-[220px]">Action</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-[var(--color-gold)] uppercase tracking-wider whitespace-nowrap w-[180px]">Target</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-[var(--color-gold)] uppercase tracking-wider min-w-[260px]">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && safeLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-slate)] animate-pulse">
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-slate)]">
                                        {search ? "No logs match the current search filter." : "No actions logged yet."}
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-5 py-3.5 text-xs text-[var(--color-slate)] whitespace-nowrap font-mono">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <p className="text-xs font-bold text-white leading-tight">{log.adminName || "System"}</p>
                                            <p className="text-[10px] text-[var(--color-slate)] opacity-70 mt-0.5">{log.adminEmail || "—"}</p>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <span className="text-xs font-mono font-bold text-[var(--color-gold)] uppercase tracking-tight">
                                                    {log.action}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono text-[var(--color-slate)] whitespace-nowrap">
                                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[10px] text-white">
                                                {log.targetType || "system"}: {log.targetId || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs min-w-[260px]">
                                            <div className="text-[11px] text-slate-300 bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono break-words leading-relaxed">
                                                {formatDetails(log.details)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-4">
                <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-blue-400">Log Retention & Immutability Policy</h4>
                    <p className="text-xs text-blue-400/70 mt-1">
                        System and administrative audit logs are cryptographically stamped, append-only, and retained indefinitely for regulatory and commercial compliance.
                    </p>
                </div>
            </div>
        </div>
    );
}
