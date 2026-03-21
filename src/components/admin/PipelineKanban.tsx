"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
    Inbox, 
    Send, 
    CheckCircle2, 
    Target,
    ArrowRight,
    Clock
} from "lucide-react";
import Link from "next/link";

interface BookingSnapshot {
    id: string;
    projectName: string | null;
    customerName: string | null;
    totalPrice: number | null;
    status: string;
    createdAt: Date;
}

interface PipelineKanbanProps {
    bookings: BookingSnapshot[];
}

const STAGES = [
    { key: "request", label: "New Requests", icon: Inbox, color: "text-blue-400", bg: "bg-blue-500/10" },
    { key: "quote_sent", label: "Quoted", icon: Send, color: "text-amber-400", bg: "bg-amber-500/10" },
    { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { key: "booked", label: "Confirmed", icon: Target, color: "text-purple-400", bg: "bg-purple-500/10" }
];

export default function PipelineKanban({ bookings }: PipelineKanbanProps) {
    const getStageBookings = (status: string) => {
        return bookings.filter(b => b.status === status).slice(0, 3); // Show top 3 per stage
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {STAGES.map((stage, idx) => {
                const stageBookings = getStageBookings(stage.key);
                
                return (
                    <motion.div
                        key={stage.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${stage.bg} ${stage.color}`}>
                                    <stage.icon className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-[var(--color-warm-white)] uppercase tracking-wider">
                                    {stage.label}
                                </h3>
                            </div>
                            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[var(--color-slate)] font-bold">
                                {bookings.filter(b => b.status === stage.key).length}
                            </span>
                        </div>

                        <div className="flex-1 space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 min-h-[280px]">
                            {stageBookings.length > 0 ? (
                                stageBookings.map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href={`/admin/bookings/${booking.id}`}
                                        className="block p-3 rounded-xl bg-[var(--color-surface)] border border-white/5 hover:border-[var(--color-gold)]/30 hover:shadow-lg hover:shadow-gold/5 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-bold text-[var(--color-warm-white)] line-clamp-1 group-hover:text-[var(--color-gold)] transition-colors">
                                                {booking.projectName || "Unnamed Project"}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-[var(--color-slate)] mb-3 truncate">
                                            {booking.customerName}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-slate)]">
                                                <Clock className="w-3 h-3" />
                                                {new Date(booking.createdAt).toLocaleDateString()}
                                            </div>
                                            <p className="text-[10px] font-bold gradient-text-gold">
                                                {booking.totalPrice?.toLocaleString() || "0"} QAR
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-10">
                                    <stage.icon className="w-8 h-8 mb-2" />
                                    <p className="text-[10px] font-medium uppercase tracking-widest">Clear Stage</p>
                                </div>
                            )}

                            <Link
                                href={`/admin/bookings?status=${stage.key}`}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5 transition-all mt-2"
                            >
                                View All {stage.label}
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
