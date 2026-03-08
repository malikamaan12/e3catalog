"use client";

import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, Key, UserCog, Settings, RefreshCcw } from "lucide-react";

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

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/super-admin/logs");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionIcon = (action: string) => {
        if (action.includes('password')) return <Key className="w-4 h-4 text-blue-400" />;
        if (action.includes('setting') || action.includes('feature')) return <Settings className="w-4 h-4 text-purple-400" />;
        if (action.includes('user') || action.includes('role')) return <UserCog className="w-4 h-4 text-green-400" />;
        return <Activity className="w-4 h-4 text-gray-400" />;
    };

    const formatDetails = (detailsStr: string) => {
        try {
            const parsed = JSON.parse(detailsStr);
            return Object.entries(parsed)
                .filter(([k]) => k !== 'updatedAt')
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
        } catch {
            return detailsStr;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-[var(--color-gold)]" />
                        System Audit Logs
                    </h2>
                    <p className="text-sm text-[var(--color-slate)]">Immutable ledger of all Super Admin actions.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="glass border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Time</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Admin</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Target</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-slate)]">Loading secure logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-slate)]">No actions logged yet.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-xs text-[var(--color-slate)] whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-[var(--color-warm-white)]">{log.adminName}</p>
                                            <p className="text-xs text-[var(--color-slate)]">{log.adminEmail}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <span className="text-sm font-mono text-[var(--color-warm-white)]">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-[var(--color-slate)] truncate max-w-[150px]">
                                            {log.targetType}: {log.targetId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-[var(--color-slate)] bg-black/20 p-2 rounded border border-white/5">
                                                {log.details ? formatDetails(log.details) : 'N/A'}
                                            </p>
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
                    <h4 className="text-sm font-bold text-blue-400">Log Retention Policy</h4>
                    <p className="text-xs text-blue-400/70 mt-1">
                        These logs denote critical administrative actions and are retained indefinitely. They cannot be edited or deleted by anyone.
                    </p>
                </div>
            </div>
        </div>
    );
}
