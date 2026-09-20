"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, Box, X, Sparkles, ArrowRight, CornerDownRight } from "lucide-react";

interface PhysicalItemLocatorProps {
    warehouseId: string;
    onLocateItem: (item: any) => void;
    activeLocatedItem: any | null;
    onClearLocatedItem: () => void;
}

export default function PhysicalItemLocator({
    warehouseId,
    onLocateItem,
    activeLocatedItem,
    onClearLocatedItem,
}: PhysicalItemLocatorProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const isSelectingRef = useRef(false);

    // Debounced search
    useEffect(() => {
        if (isSelectingRef.current) {
            isSelectingRef.current = false;
            return;
        }

        if (!query.trim() || query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/dashboard/warehouses/${warehouseId}/locator?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.matches || []);
                    if ((data.matches || []).length > 0) {
                        setIsOpen(true);
                    }
                }
            } catch (err) {
                console.error("Locator search error:", err);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query, warehouseId]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (item: any) => {
        isSelectingRef.current = true;
        setIsOpen(false);
        setResults([]);
        setQuery(item.assetTagCode || item.productName);
        onLocateItem(item);
    };

    return (
        <div ref={searchRef} className="relative w-72 md:w-80">
            {/* Search Input Box */}
            <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    placeholder="Search asset tag, serial, RFID, or gear name..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-[var(--color-gold)] focus:ring-2 focus:ring-amber-500/20 transition-all shadow-lg backdrop-blur-md"
                />
                {query ? (
                    <button
                        id="clear-locator-search-btn"
                        onClick={() => {
                            setQuery("");
                            setResults([]);
                            onClearLocatedItem();
                        }}
                        className="absolute right-3 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    loading && (
                        <div className="absolute right-3 w-4 h-4 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                    )
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-slate-950/95 border border-white/15 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-white/5 max-h-80 overflow-y-auto">
                    <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/[0.02] flex items-center justify-between">
                        <span>Physical Warehouse Assets ({results.length})</span>
                        <span className="text-[var(--color-gold)] font-mono">Click to Light Up on Map</span>
                    </div>
                    {results.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            className="w-full px-4 py-3 text-left hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-3 group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[var(--color-gold)] shrink-0">
                                    <Box className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-white text-xs">{item.assetTagCode}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-white/5 text-slate-300 border border-white/10">
                                            {item.conditionStatus}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.productName}</p>
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <span className="text-xs font-mono font-bold text-cyan-400 block">
                                    {item.spatialLocation?.rackCode || "Rack"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    Tier {item.spatialLocation?.level || 1}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Active Located Item Breadcrumbs Banner */}
            {activeLocatedItem && (
                <div className="absolute top-full left-0 right-0 mt-3 z-40 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                            <Sparkles className="w-3.5 h-3.5 text-[var(--color-gold)] animate-pulse" />
                            <span>Target Located: <strong className="font-mono text-[var(--color-gold)]">{activeLocatedItem.assetTagCode}</strong></span>
                        </div>
                        <button
                            id="dismiss-located-beacon-btn"
                            onClick={onClearLocatedItem}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 overflow-x-auto py-1">
                        {activeLocatedItem.breadcrumbs?.map((step: string, idx: number) => (
                            <React.Fragment key={idx}>
                                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 whitespace-nowrap text-[10px] font-semibold">
                                    {step}
                                </span>
                                {idx < activeLocatedItem.breadcrumbs.length - 1 && (
                                    <span className="text-slate-500">&rsaquo;</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {activeLocatedItem.walkingDirections && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">{activeLocatedItem.walkingDirections}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
