"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

interface TimelineDay {
    date: string;
    available: number;
    booked: number;
    maintenance: number;
    total: number;
}

export default function AvailabilityTimeline({ productId }: { productId: string }) {
    const [timeline, setTimeline] = useState<TimelineDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;

        // Use realProductId if provided, otherwise productId
        fetch(`/api/availability/timeline/${productId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setTimeline(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [productId]);

    if (loading) {
        return (
            <div className="glass rounded-xl p-6 h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!timeline || timeline.length === 0) {
        return null; // Might happen if saving not yet complete or error
    }

    const totalUnits = timeline[0]?.total || 0;

    return (
        <section className="glass rounded-xl p-6">
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-2">
                30-DAY AVAILABILITY TIMELINE
            </h2>
            <p className="text-xs text-[var(--color-slate)] mb-6">
                Hover over any day to see the exact breakdown of units (Available, Booked, Maintenance).
            </p>

            {totalUnits === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-[var(--color-slate)] border border-dashed border-[var(--color-border-subtle)] rounded-lg">
                    Set a total units count above 0 to see the timeline.
                </div>
            ) : (
                <div className="relative h-48 w-full flex items-end justify-between gap-1 pb-6 border-b border-[var(--color-border-subtle)] mt-8">
                    {/* Y-Axis Label / Total Line */}
                    <div className="absolute top-0 left-0 w-full border-t border-dashed border-[var(--color-border-subtle)]/50 pointer-events-none" />
                    <span className="absolute -top-6 left-0 text-[10px] text-[var(--color-slate)] bg-[var(--color-navy)] px-2 py-1 rounded-md border border-[var(--color-border-subtle)]">{totalUnits} units</span>

                    {/* Bars */}
                    {timeline.map((day, i) => {
                        const maxH = 100; // 100% height
                        const availPct = (day.available / day.total) * maxH || 0;
                        const bookedPct = (day.booked / day.total) * maxH || 0;
                        const maintPct = (day.maintenance / day.total) * maxH || 0;

                        return (
                            <div key={day.date} className="relative flex-1 group h-full flex flex-col justify-end">
                                {/* Stacked Bar */}
                                <div className="w-full flex flex-col-reverse overflow-hidden rounded-sm" style={{ height: '100%' }}>
                                    <div className="w-full bg-[var(--color-success)] transition-all hover:brightness-110" style={{ height: `${availPct}%` }} />
                                    <div className="w-full bg-[var(--color-gold)] transition-all hover:brightness-110 border-t border-[var(--color-navy)]" style={{ height: `${bookedPct}%` }} />
                                    <div className="w-full bg-[var(--color-danger)] transition-all hover:brightness-110 border-t border-[var(--color-navy)]" style={{ height: `${maintPct}%` }} />
                                </div>

                                {/* Date Label (Show roughly every 5 days for mobile, every 2 days for desktop) */}
                                {(i % 3 === 0) && (
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-[var(--color-slate)] whitespace-nowrap">
                                        {format(parseISO(day.date), "MMM d")}
                                    </div>
                                )}

                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shadow-xl z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    <p className="text-xs font-semibold text-[var(--color-warm-white)] mb-2 border-b border-[var(--color-border-subtle)] pb-1">
                                        {format(parseISO(day.date), "EEEE, MMM d, yyyy")}
                                    </p>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5 text-[var(--color-slate)]"><span className="w-2 h-2 rounded-full bg-[var(--color-success)]" /> Available</span>
                                            <span className="font-semibold text-[var(--color-warm-white)]">{day.available}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5 text-[var(--color-slate)]"><span className="w-2 h-2 rounded-full bg-[var(--color-gold)]" /> Booked</span>
                                            <span className="font-semibold text-[var(--color-warm-white)]">{day.booked}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5 text-[var(--color-slate)]"><span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" /> Maintenance</span>
                                            <span className="font-semibold text-[var(--color-warm-white)]">{day.maintenance}</span>
                                        </div>
                                        <div className="pt-1 mt-1 border-t border-[var(--color-border-subtle)] flex justify-between items-center">
                                            <span className="text-[var(--color-slate)]">Total</span>
                                            <span className="font-semibold text-[var(--color-warm-white)]">{day.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
