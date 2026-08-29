"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
    ShieldAlert, 
    AlertTriangle, 
    ArrowRight,
    FileText,
    Settings
} from "lucide-react";
import Link from "next/link";

interface ComplianceAlert {
    id: string;
    type: "certificate" | "inventory";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    href: string;
    date?: Date;
}

interface ComplianceFeedProps {
    alerts: ComplianceAlert[];
}

export default function ComplianceFeed({ alerts }: ComplianceFeedProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[var(--color-warm-white)] uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Operational Pulse
                </h3>
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                    {alerts.length} Alerts
                </span>
            </div>

            <div className="space-y-3">
                {alerts.length > 0 ? (
                    alerts.map((alert, idx) => (
                        <motion.div
                            key={`${alert.type}-${alert.id}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Link
                                href={alert.href}
                                className={`block p-4 rounded-2xl border transition-all group relative overflow-hidden ${
                                    alert.priority === "high" 
                                        ? "bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40" 
                                        : "bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40"
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 p-2 rounded-xl border flex-shrink-0 ${
                                        alert.priority === "high" 
                                            ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                            : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                    }`}>
                                        {alert.type === "certificate" ? <FileText className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className={`text-xs font-bold truncate ${
                                                alert.priority === "high" ? "text-red-400" : "text-amber-400"
                                            }`}>
                                                {alert.title}
                                            </p>
                                            {alert.date && (
                                                <span suppressHydrationWarning className="text-[8px] font-bold text-[var(--color-slate)] uppercase">
                                                    {new Date(alert.date).toISOString().split("T")[0]}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[var(--color-slate)] line-clamp-2 mb-2">
                                            {alert.description}
                                        </p>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors">
                                            Resolve Access <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
                        <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-[var(--color-slate)] opacity-20" />
                        <p className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-widest">System Status: Optimal</p>
                        <p className="text-[9px] text-[var(--color-slate)]/50 mt-1">No critical compliance alerts.</p>
                    </div>
                )}
            </div>

            <button className="w-full py-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-bold text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/10 transition-all uppercase tracking-widest">
                View Full Audit Log
            </button>
        </div>
    );
}
