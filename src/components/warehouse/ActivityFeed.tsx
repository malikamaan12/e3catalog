"use client";

import { useEffect, useState } from "react";
import { Clock, Scan, ShieldAlert, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type ActivityEvent = {
    id: string;
    eventType: "inspection" | "scan";
    assetTag: string | null;
    detail: string;
    conditionBefore?: string | null;
    conditionAfter?: string | null;
    notes?: string | null;
    actor?: string | null;
    projectName?: string | null;
    customerName?: string | null;
    timestamp: string;
};

const CONDITION_COLOR: Record<string, string> = {
    excellent: "text-emerald-400",
    good: "text-green-400",
    fair: "text-yellow-400",
    poor: "text-orange-400",
    maintenance_required: "text-red-400",
};

const SCAN_COLOR: Record<string, string> = {
    dispatched: "text-amber-400",
    returned: "text-sky-400",
};

export default function WarehouseActivityFeed() {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);

    // Poll every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setLoading(true);
        fetch("/api/admin/warehouse-activity?limit=15")
            .then(r => r.json())
            .then((data: ActivityEvent[]) => setEvents(Array.isArray(data) ? data : []))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, [tick]);

    return (
        <div className="glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-8 py-5 bg-[var(--color-navy)]/40 border-b border-white/5">
                <div className="flex flex-col">
                    <h2 className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.3em]">Operational Stream</h2>
                    <span className="text-[8px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Real-time Telemetry</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] animate-pulse shadow-[0_0_8px_var(--color-gold)]" />
                    <span className="text-[9px] font-black text-[var(--color-gold)] uppercase tracking-widest">Active Connection</span>
                </div>
            </div>

            {loading && (
                <div className="flex flex-col gap-1 p-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-white/[0.02] rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && events.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <div className="p-4 rounded-full bg-white/5 border border-white/5">
                        <Scan className="h-8 w-8 text-[var(--color-slate)] opacity-20" />
                    </div>
                    <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-40">Zero Events Detected</p>
                </div>
            )}

            {!loading && events.length > 0 && (
                <div className="flex flex-col p-1.5 gap-1 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {events.map((event) => (
                        <div 
                            key={event.id} 
                            className="flex items-center gap-5 px-5 py-4 rounded-2xl hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5"
                        >
                            <div className={`p-3 rounded-xl shrink-0 transition-all group-hover:scale-110 ${
                                event.eventType === "scan"
                                    ? event.detail === "dispatched" ? "bg-[var(--color-gold)]/10" : "bg-sky-500/10"
                                    : "bg-red-500/10"
                            }`}>
                                {event.eventType === "scan"
                                    ? <Scan className={`h-4 w-4 ${SCAN_COLOR[event.detail] || "text-[var(--color-slate)]"}`} />
                                    : <ShieldAlert className="h-4 w-4 text-red-500" />
                                }
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-[family-name:var(--font-heading)] font-black text-sm text-[var(--color-warm-white)] tracking-[0.1em]">{event.assetTag || "PROTOCOL—X"}</span>
                                    <div className="h-1 w-1 rounded-full bg-white/10" />
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-colors ${
                                        event.eventType === "scan"
                                            ? SCAN_COLOR[event.detail] ? `${SCAN_COLOR[event.detail]} bg-current/10 border-current/20` : "text-[var(--color-slate)] bg-white/5 border-white/10"
                                            : "text-red-500 bg-red-500/10 border-red-500/20"
                                    }`}>
                                        {event.eventType === "scan"
                                            ? event.detail
                                            : `${event.detail?.replace("_", " ")} audit`
                                        }
                                    </span>
                                </div>

                                {event.eventType === "scan" && event.projectName && (
                                    <div className="flex items-center gap-1.5">
                                        <ChevronRight className="h-2.5 w-2.5 text-[var(--color-gold)]" />
                                        <p className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-tight truncate max-w-[140px]">{event.projectName}</p>
                                    </div>
                                )}
                                {event.eventType === "inspection" && event.conditionBefore && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[9px] font-black uppercase ${CONDITION_COLOR[event.conditionBefore] || "text-[var(--color-slate)]"}`}>{event.conditionBefore}</span>
                                        <div className="w-2 h-px bg-white/10" />
                                        <span className={`text-[9px] font-black uppercase ${CONDITION_COLOR[event.conditionAfter || ""] || "text-[var(--color-slate)]"}`}>{event.conditionAfter}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="flex items-center gap-1 text-[9px] font-black text-[var(--color-slate)] uppercase tracking-tight opacity-40">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: false })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
