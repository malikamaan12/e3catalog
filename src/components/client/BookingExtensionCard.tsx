"use client";

import React, { useState } from "react";
import { CalendarPlus, Clock, Sparkles, History, CheckCircle2 } from "lucide-react";
import { BookingExtensionModal } from "./BookingExtensionModal";
import { format } from "date-fns";

interface ExtensionRecord {
    id: string;
    requestedDays: number;
    originalEndDate: string | Date;
    newEndDate: string | Date;
    additionalAmount: number;
    reason?: string | null;
    createdAt: string | Date;
}

interface BookingExtensionCardProps {
    bookingId: string;
    productName: string;
    currentEndDate: string;
    units: number;
    extensions?: ExtensionRecord[];
}

export function BookingExtensionCard({
    bookingId,
    productName,
    currentEndDate,
    units,
    extensions = [],
}: BookingExtensionCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <section className="glass rounded-[2.5rem] p-8 border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[var(--color-gold)]">
                        <CalendarPlus className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            On-Site Rental Extension (Option D)
                        </span>
                    </div>
                    <h3 className="text-xl font-black text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">
                        Need More Production Time?
                    </h3>
                    <p className="text-xs text-[var(--color-slate)] max-w-lg leading-relaxed">
                        Request a +24h, +48h, or custom mid-event extension directly on-site. Real-time availability is checked instantly against fleet inventory.
                    </p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20 shrink-0 cursor-pointer"
                >
                    <Sparkles className="w-4 h-4" />
                    Extend Rental On-Site
                </button>
            </div>

            {/* Previous Extension Audit Trail */}
            {extensions && extensions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <h4 className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[var(--color-gold)]" />
                        Extension History ({extensions.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {extensions.map((ext) => (
                            <div 
                                key={ext.id} 
                                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[var(--color-warm-white)]">
                                            +{ext.requestedDays} Day{ext.requestedDays > 1 ? "s" : ""} Extension
                                        </p>
                                        <p className="text-[10px] text-[var(--color-slate)] opacity-60">
                                            New End: {format(new Date(ext.newEndDate), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-black text-[var(--color-gold)] text-xs">
                                    +QAR {ext.additionalAmount.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <BookingExtensionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                bookingId={bookingId}
                productName={productName}
                currentEndDate={currentEndDate}
                units={units}
            />
        </section>
    );
}
