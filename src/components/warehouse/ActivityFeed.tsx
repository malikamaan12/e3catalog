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
        <div className="glass rounded-[2rem] border border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Operational Stream</h2>
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Live</span>
                </div>
            </div>

            {loading && (
                <div className="flex flex-col gap-3 p-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && events.length === 0 && (
                <div className="py-12 text-center text-slate-600 text-sm italic">
                    No recent activity. Start scanning to see events here.
                </div>
            )}

            {!loading && events.length > 0 && (
                <div className="divide-y divide-white/[0.04]">
                    {events.map((event) => (
                        <div key={event.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                            <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                                event.eventType === "scan"
                                    ? event.detail === "dispatched" ? "bg-amber-500/10" : "bg-sky-500/10"
                                    : "bg-red-500/10"
                            }`}>
                                {event.eventType === "scan"
                                    ? <Scan className={`h-3.5 w-3.5 ${SCAN_COLOR[event.detail] || "text-slate-400"}`} />
                                    : <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                                }
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="font-black text-xs text-slate-200 tracking-widest">{event.assetTag || "—"}</span>
                                    <span className={`text-[10px] font-bold uppercase ${
                                        event.eventType === "scan"
                                            ? SCAN_COLOR[event.detail] || "text-slate-400"
                                            : "text-red-400"
                                    }`}>
                                        {event.eventType === "scan"
                                            ? event.detail
                                            : `${event.detail?.replace("_", " ")} check`
                                        }
                                    </span>
                                </div>

                                {event.eventType === "scan" && event.projectName && (
                                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">→ {event.projectName}</p>
                                )}
                                {event.eventType === "inspection" && event.conditionBefore && (
                                    <p className="text-[10px] mt-0.5">
                                        <span className={CONDITION_COLOR[event.conditionBefore] || "text-slate-500"}>{event.conditionBefore}</span>
                                        <span className="text-slate-700"> → </span>
                                        <span className={CONDITION_COLOR[event.conditionAfter || ""] || "text-slate-500"}>{event.conditionAfter}</span>
                                    </p>
                                )}
                            </div>

                            <span className="flex items-center gap-1 text-[9px] text-slate-700 shrink-0 whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
