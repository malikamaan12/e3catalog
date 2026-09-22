"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, Box, X, Sparkles, Grid, ArrowRight } from "lucide-react";

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
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isSelectingRef = useRef(false);

    // Debounced search
    useEffect(() => {
        if (isSelectingRef.current) {
            isSelectingRef.current = false;
            return;
        }

        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 1) {
            setResults([]);
            setIsOpen(false);
            setHighlightedIndex(-1);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/dashboard/warehouses/${warehouseId}/locator?q=${encodeURIComponent(trimmed)}`);
                if (res.ok) {
                    const data = await res.json();
                    const matches = data.matches || [];
                    setResults(matches);
                    setIsOpen(matches.length > 0);
                    setHighlightedIndex(-1);
                }
            } catch (err) {
                console.error("Locator search error:", err);
            } finally {
                setLoading(false);
            }
        }, 200);

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
        setQuery(item.label || item.assetTagCode || item.productName || "");
        onLocateItem(item);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < results.length) {
                handleSelect(results[highlightedIndex]);
            } else if (results.length > 0) {
                handleSelect(results[0]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const spatialElements = results.filter((r) => r.isSpatialElement);
    const unitItems = results.filter((r) => !r.isSpatialElement);

    return (
        <div ref={searchRef} className="relative w-72 sm:w-80 md:w-96">
            {/* Search Input Box */}
            <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search rack (AUD-01), gear name, serial, RFID..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-[var(--color-gold)] focus:ring-2 focus:ring-amber-500/20 transition-all shadow-lg"
                />
                {query ? (
                    <button
                        id="clear-locator-search-btn"
                        onClick={() => {
                            setQuery("");
                            setResults([]);
                            setIsOpen(false);
                            onClearLocatedItem();
                            inputRef.current?.focus();
                        }}
                        className="absolute right-3 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Clear search"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    loading && (
                        <div className="absolute right-3 w-4 h-4 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                    )
                )}
            </div>

            {/* Autocomplete Dropdown - High performance solid surface without GPU blur thrashing */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#090d16] border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-white/5 max-h-96 overflow-y-auto">
                    {/* Header */}
                    <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/[0.03] flex items-center justify-between">
                        <span>Locations & Assets ({results.length})</span>
                        <span className="text-[var(--color-gold)] font-mono text-[9px]">Select to Light Up Map</span>
                    </div>

                    {/* Spatial elements (Racks, Docks, Staging) */}
                    {spatialElements.length > 0 && (
                        <div>
                            <div className="px-3.5 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/20">
                                Storage Racks & Locations ({spatialElements.length})
                            </div>
                            {spatialElements.map((el) => {
                                const globalIdx = results.indexOf(el);
                                const isHighlighted = highlightedIndex === globalIdx;
                                return (
                                    <button
                                        key={el.id}
                                        onClick={() => handleSelect(el)}
                                        className={`w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-3 group ${
                                            isHighlighted ? "bg-cyan-500/15" : "hover:bg-white/[0.05]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                                                <Grid className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-mono font-bold text-white text-xs block">
                                                    {el.label || el.rackCode}
                                                </span>
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    {el.aisle ? `${el.aisle} • ` : ""}{el.zoneCode || "Zone"}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                                            Locate Rack
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Individual Inventory Units */}
                    {unitItems.length > 0 && (
                        <div>
                            {spatialElements.length > 0 && (
                                <div className="px-3.5 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-950/20">
                                    Slotted Inventory Units ({unitItems.length})
                                </div>
                            )}
                            {unitItems.map((item) => {
                                const globalIdx = results.indexOf(item);
                                const isHighlighted = highlightedIndex === globalIdx;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between gap-3 group ${
                                            isHighlighted ? "bg-amber-500/15" : "hover:bg-white/[0.05]"
                                        }`}
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
                                                <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">{item.productName}</p>
                                                {item.serialNumber && (
                                                    <span className="text-[10px] font-mono text-slate-500 block">
                                                        S/N: {item.serialNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-mono font-bold text-amber-400 block">
                                                {item.spatialLocation?.rackCode || "Rack"}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                Tier {item.spatialLocation?.level || 1}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Active Located Target Breadcrumbs Banner (Optimized solid layout) */}
            {activeLocatedItem && (
                <div className="absolute top-full left-0 right-0 mt-2.5 z-40 p-3 rounded-2xl bg-[#0d1424] border border-amber-500/40 text-xs shadow-[0_12px_32px_rgba(0,0,0,0.8)] animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                            <Sparkles className="w-3.5 h-3.5 text-[var(--color-gold)] animate-pulse shrink-0" />
                            <span className="truncate">
                                Located:{" "}
                                <strong className="font-mono text-[var(--color-gold)]">
                                    {activeLocatedItem.assetTagCode || activeLocatedItem.label || activeLocatedItem.rackCode}
                                </strong>
                            </span>
                        </div>
                        <button
                            id="dismiss-located-beacon-btn"
                            onClick={onClearLocatedItem}
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-2"
                            title="Clear location indicator"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Step-by-step navigation path */}
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-300 overflow-x-auto py-1">
                        {activeLocatedItem.breadcrumbs?.map((step: string, idx: number) => (
                            <React.Fragment key={idx}>
                                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 whitespace-nowrap font-semibold">
                                    {step}
                                </span>
                                {idx < activeLocatedItem.breadcrumbs.length - 1 && (
                                    <span className="text-slate-500">&rsaquo;</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {activeLocatedItem.walkingDirections && (
                        <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5 border-t border-white/5 pt-1.5">
                            <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">{activeLocatedItem.walkingDirections}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
