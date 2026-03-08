"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

interface TimelineDay {
    date: string;
    available: number;
    total: number;
}

export default function AvailabilityTimeline({ productId }: { productId: string }) {
    const [timeline, setTimeline] = useState<TimelineDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredDay, setHoveredDay] = useState<TimelineDay | null>(null);

    useEffect(() => {
        fetch(`/api/availability/timeline/${productId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTimeline(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [productId]);

    if (loading) {
        return <div className="animate-pulse h-24 bg-[var(--color-navy-lighter)] rounded-xl mb-6"></div>;
    }

    if (timeline.length === 0) return null;

    // Split into "Available Now" (today) and the rest of the timeline
    const today = timeline[0];

    return (
        <div className="glass rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)]">
                    AVAILABILITY FORECAST
                </h3>
            </div>

            {/* Current Status */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-lg bg-[var(--color-navy-lighter)] flex items-center justify-center border border-[var(--color-border-subtle)] shrink-0">
                    <span className="text-xl font-bold text-[var(--color-warm-white)]">{today.available}</span>
                </div>
                <div>
                    <h4 className="text-[var(--color-warm-white)] font-medium">Available Right Now</h4>
                    <p className="text-xs text-[var(--color-slate)]">Out of {today.total} total units in fleet</p>
                </div>
            </div>

            {/* 30-Day Timeline Visualizer */}
            <div className="relative group">
                <div className="flex items-end h-16 gap-[2px] w-full">
                    {timeline.map((day, i) => {
                        const heightPercent = Math.max(10, (day.available / day.total) * 100);
                        const isOut = day.available === 0;
                        const isLow = day.available > 0 && (day.available / day.total) <= 0.2;

                        return (
                            <div
                                key={day.date}
                                onMouseEnter={() => setHoveredDay(day)}
                                onMouseLeave={() => setHoveredDay(null)}
                                className="flex-1 rounded-t-sm transition-colors cursor-crosshair opacity-80 hover:opacity-100"
                                style={{
                                    height: `${heightPercent}%`,
                                    backgroundColor: isOut ? 'var(--color-danger)' : isLow ? 'var(--color-warning)' : 'var(--color-success)'
                                }}
                            />
                        );
                    })}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between text-[10px] text-[var(--color-slate)] mt-1 font-medium">
                    <span>Today</span>
                    <span>15 Days</span>
                    <span>30 Days</span>
                </div>

                {/* Hover Tooltip */}
                {hoveredDay && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--color-navy-light)] border border-[var(--color-border-subtle)] shadow-xl rounded-lg p-2 flex items-center gap-3 z-10 pointer-events-none whitespace-nowrap">
                        <div className="text-right">
                            <span className="block text-xs font-bold text-[var(--color-warm-white)]">
                                {format(parseISO(hoveredDay.date), "MMM do, yyyy")}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-[var(--color-border-subtle)]" />
                        <div>
                            <span className="text-sm font-bold text-[var(--color-gold)]">{hoveredDay.available}</span>
                            <span className="text-xs text-[var(--color-slate)] ml-1">units</span>
                        </div>
                    </div>
                )}
            </div>
            <p className="text-[10px] text-[var(--color-slate)] mt-4 text-center">
                Hover over the timeline to see exact daily unit counts factoring in logistics buffers.
            </p>
        </div>
    );
}
