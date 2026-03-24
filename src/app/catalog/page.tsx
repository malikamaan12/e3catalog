"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import gsap from "gsap";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import {
    LayoutGrid, Layers, Building2, Frame, Link2, Lightbulb, Mic2,
    Monitor, Zap, Wind, Armchair, Palette, Flag, Navigation,
    Shield, Gamepad2, Trophy, Laptop2, Truck, ShieldCheck, HardHat
} from "lucide-react";

interface Product {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    pricePerDay: number;
    pricePerHour: number | null;
    totalUnits: number;
    currentAvailableUnits: number;
    thumbnailUrl: string | null;
    category: { name: string; slug: string } | null;
    itemCode: string | null;
    showPrice?: boolean;
    priceType?: string;
    priceRangeMax?: number | null;
    unit?: string;
    averageRating?: number | null;
    reviewCount?: number | null;
    vendor?: { companyName: string; scoreRating: number | null } | null;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    parentId: string | null;
    children?: Category[];
}

// Explicit icon map — covers all 20 categories + fallback
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    "Layers": Layers, "Building2": Building2, "Frame": Frame,
    "Link2": Link2, "Lightbulb": Lightbulb, "Mic2": Mic2,
    "Monitor": Monitor, "Zap": Zap, "Wind": Wind,
    "Armchair": Armchair, "Palette": Palette, "Flag": Flag,
    "Navigation": Navigation, "Shield": Shield, "Gamepad2": Gamepad2,
    "Trophy": Trophy, "Laptop2": Laptop2, "Truck": Truck,
    "ShieldCheck": ShieldCheck, "HardHat": HardHat,
};

// Slug → icon name fallback (used if DB icon field is null)
const SLUG_FALLBACK: Record<string, string> = {
    "staging": "Layers", "exhibitions": "Building2", "structures": "Frame",
    "rigging-truss": "Link2", "lighting": "Lightbulb", "audio": "Mic2",
    "led-displays": "Monitor", "power-electrical": "Zap", "climate-utilities": "Wind",
    "furniture": "Armchair", "decor": "Palette", "branding": "Flag",
    "wayfinding": "Navigation", "crowd-control": "Shield", "entertainment": "Gamepad2",
    "sports-equipment": "Trophy", "event-technology": "Laptop2",
    "logistics-equipment": "Truck", "safety-equipment": "ShieldCheck", "manpower": "HardHat",
};

function CategoryIcon({ icon, slug, className = "w-4 h-4" }: { icon?: string | null; slug: string; className?: string }) {
    const iconName = icon || SLUG_FALLBACK[slug] || "";
    const Icon = ICON_MAP[iconName] || LayoutGrid;
    return <Icon className={className} />;
}

export default function CatalogPage() {
    return (
        <Suspense fallback={<div className="min-h-screen pt-28 pb-16 flex justify-center items-center"><div className="w-8 h-8 rounded-full border-2 border-[var(--color-gold)] border-t-transparent animate-spin" /></div>}>
            <CatalogContent />
        </Suspense>
    );
}

function CatalogContent() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get("category") || "";

    const [products, setProducts] = useState<Product[]>([]);
    const [categoryTree, setCategoryTree] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Sentinel ref for IntersectionObserver (infinite scroll trigger)
    const sentinelRef = useRef<HTMLDivElement>(null);

    // ── Debounce search input (300 ms) ─────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── Load categories (cached by HTTP) ──────────────────────────────────
    useEffect(() => {
        fetch("/api/categories")
            .then((r) => r.json())
            .then((data) => { if (data.tree) setCategoryTree(data.tree); })
            .catch(console.error);
    }, []);

    // ── Core fetch function ────────────────────────────────────────────────
    const fetchProducts = useCallback(async (
        category: string,
        search: string,
        cursor: string | null,
        replace: boolean
    ) => {
        if (replace) setLoading(true); else setLoadingMore(true);

        try {
            const params = new URLSearchParams({ limit: "20" });
            if (category) params.set("category", category);
            if (search) params.set("search", search);
            if (cursor) params.set("cursor", cursor);

            const res = await fetch(`/api/products?${params.toString()}`);
            const data = await res.json();

            if (data && Array.isArray(data.products)) {
                setProducts((prev) => replace ? data.products : [...prev, ...data.products]);
                setHasMore(data.hasMore ?? false);
                setNextCursor(data.nextCursor ?? null);
                setTotalCount((prev) => replace ? data.products.length : prev + data.products.length);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            if (replace) {
                setLoading(false);
                // Staggered entrance for premium feel
                setTimeout(() => {
                    gsap.fromTo(".product-card-anim", 
                        { y: 30, opacity: 0 }, 
                        { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "power3.out" }
                    );
                }, 100);
            } else {
                setLoadingMore(false);
            }
        }
    }, []);

    // ── Re-fetch from scratch when category or search changes ─────────────
    useEffect(() => {
        setNextCursor(null);
        fetchProducts(selectedCategory, debouncedSearch, null, true);
    }, [selectedCategory, debouncedSearch, fetchProducts]);

    // ── IntersectionObserver — load next page when sentinel is visible ─────
    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchProducts(selectedCategory, debouncedSearch, nextCursor, false);
                }
            },
            { rootMargin: "200px" } // trigger 200px before the bottom
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, nextCursor, selectedCategory, debouncedSearch, fetchProducts]);

    const handleCategorySelect = (slug: string) => {
        setSelectedCategory(slug);
        setIsFilterOpen(false);
    };

    return (
        <>
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-[2000px] mx-auto px-6 md:px-12 xl:px-20">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-5xl font-bold text-[var(--color-warm-white)] mb-3">
                            Equipment Catalog
                        </h1>
                        <p className="text-[var(--color-slate)] text-lg">
                            Browse our full fleet of event equipment. Click any item for full specs, documentation, and to request a quote.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-8">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search equipment..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors"
                                aria-label="Clear search"
                            >
                                <span className="text-lg">✕</span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-8 items-start">
                        {/* ── LEFT SIDEBAR: Category Tree ── */}
                        <aside className="w-72 shrink-0 sticky top-28 hidden lg:block">
                            <div className="glass rounded-2xl p-4 border border-white/5 space-y-1">
                                <p className="font-[family-name:var(--font-heading)] text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-widest mb-3 px-2">Browse by Category</p>

                                {/* All items button */}
                                <button
                                    onClick={() => handleCategorySelect("")}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg font-[family-name:var(--font-heading)] text-sm font-semibold transition-all flex items-center gap-3 ${!selectedCategory ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5"}`}
                                >
                                    <LayoutGrid className="w-4 h-4" /> <span>All Equipment</span>
                                </button>

                                {/* Parent groups */}
                                {Array.isArray(categoryTree) && categoryTree.map((group) => {
                                    const isGroupExpanded = expandedGroup === group.id;
                                    const isGroupSelected = selectedCategory === group.slug || group.children?.some(c => c.slug === selectedCategory);
                                    return (
                                        <div key={group.id}>
                                            <button
                                                onClick={() => {
                                                    setExpandedGroup(isGroupExpanded ? null : group.id);
                                                    handleCategorySelect(group.slug);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg font-[family-name:var(--font-heading)] text-sm font-semibold transition-all flex items-center gap-3 justify-between ${isGroupSelected ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : "text-[var(--color-warm-white)] hover:bg-white/5"}`}
                                            >
                                                <span className="flex items-center gap-3 truncate">
                                                    <CategoryIcon icon={group.icon} slug={group.slug} className={`w-4 h-4 shrink-0 ${isGroupSelected ? 'text-[var(--color-gold)]' : 'text-[var(--color-slate)]'}`} />
                                                    <span className="truncate">{group.name}</span>
                                                </span>
                                                <span className={`text-xs text-[var(--color-slate)] transition-transform duration-200 shrink-0 ${isGroupExpanded || isGroupSelected ? "rotate-90 text-[var(--color-gold)]" : ""}`}>›</span>
                                            </button>

                                            {/* Children */}
                                            {(isGroupExpanded || isGroupSelected) && group.children && group.children.length > 0 && (
                                                <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                                                    {group.children.map((child) => (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => handleCategorySelect(child.slug)}
                                                            className={`w-full text-left px-3 py-2 rounded-lg font-[family-name:var(--font-heading)] text-xs font-semibold transition-all flex items-center gap-2.5 ${selectedCategory === child.slug ? "text-[var(--color-gold)] bg-[var(--color-gold)]/10" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5"}`}
                                                        >
                                                            <CategoryIcon icon={child.icon} slug={child.slug} className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === child.slug ? 'text-[var(--color-gold)]' : 'text-[var(--color-slate)]'}`} />
                                                            <span>{child.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>

                        {/* ── MAIN CONTENT ── */}
                        <div className="flex-1 min-w-0">
                            {/* Results count & Quick Filters */}
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm font-bold text-slate tracking-widest uppercase">
                                    {loading
                                        ? "Scanning..."
                                        : `${totalCount} Asset${totalCount !== 1 ? "s" : ""} Located`
                                    }
                                </p>
                                
                                {selectedCategory && (
                                    <button 
                                        onClick={() => handleCategorySelect("")}
                                        className="text-xs font-black text-gold uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity min-h-[44px] px-2"
                                    >
                                        Clear Filter <span className="text-xl">×</span>
                                    </button>
                                )}
                            </div>

                            {/* Product grid — initial skeleton */}
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 min-[2200px]:grid-cols-6 gap-6 md:gap-8">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="bg-[#0d152a] rounded-[2rem] border border-white/5 h-[400px] animate-pulse" />
                                    ))}
                                </div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-32 glass rounded-[3rem] border-dashed border-2 border-white/5">
                                    <div className="text-6xl mb-6 opacity-20">📡</div>
                                    <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white mb-2">
                                        No assets located
                                    </h3>
                                    <p className="text-slate max-w-xs mx-auto text-sm">Modify your search parameters or select a wider category range.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 min-[2200px]:grid-cols-6 gap-6 md:gap-8">
                                        {products.map((product) => (
                                            <div key={product.id} className="product-card-anim opacity-0">
                                                <ProductCard {...product} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Infinite scroll sentinel */}
                                    <div ref={sentinelRef} className="h-20" />

                                    {/* Loading more indicator */}
                                    {loadingMore && (
                                        <div className="flex justify-center items-center py-12 gap-3">
                                            <div className="w-5 h-5 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                                            <span className="text-xs font-black text-gold uppercase tracking-widest">Streaming more assets...</span>
                                        </div>
                                    )}

                                    {/* End of results */}
                                    {!hasMore && products.length > 0 && (
                                        <p className="text-center text-[10px] font-black text-slate/30 py-12 uppercase tracking-[0.4em]">
                                            — All {totalCount} assets loaded —
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile Filter Drawer ── */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-navy/80 backdrop-blur-md z-[110] lg:hidden"
                        />
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 h-[80vh] bg-[#0d152a] border-t border-white/10 z-[120] lg:hidden rounded-t-[3rem] shadow-2xl flex flex-col p-8 pb-12"
                        >
                            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 shrink-0" />
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold text-white tracking-tighter uppercase italic">Filter Assets</h3>
                                <button onClick={() => setIsFilterOpen(false)} className="text-slate font-black text-xs uppercase tracking-widest">Done</button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                <button
                                    onClick={() => handleCategorySelect("")}
                                    className={`w-full text-left p-5 rounded-2xl font-bold transition-all flex items-center gap-4 ${!selectedCategory ? "bg-gold text-navy" : "bg-white/5 text-slate border border-white/5"}`}
                                >
                                    <LayoutGrid className="w-5 h-5" /> <span className="text-sm uppercase tracking-widest">All Equipment</span>
                                </button>

                                {Array.isArray(categoryTree) && categoryTree.map((group) => {
                                    const isExpanded = expandedGroup === group.id;
                                    const isSelected = selectedCategory === group.slug || group.children?.some(c => c.slug === selectedCategory);
                                    
                                    return (
                                        <div key={group.id} className="space-y-2">
                                            <button
                                                onClick={() => {
                                                    setExpandedGroup(isExpanded ? null : group.id);
                                                    if (!group.children?.length) handleCategorySelect(group.slug);
                                                }}
                                                className={`w-full text-left p-5 rounded-2xl font-bold transition-all flex items-center justify-between ${isSelected ? "bg-white/10 text-gold border border-gold/20" : "bg-white/5 text-slate border border-white/5"}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <CategoryIcon icon={group.icon} slug={group.slug} className="w-5 h-5" />
                                                    <span className="text-sm uppercase tracking-widest">{group.name}</span>
                                                </div>
                                                {group.children && group.children.length > 0 && (
                                                    <span className={`text-xl transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                                                )}
                                            </button>
                                            
                                            {isExpanded && group.children && (
                                                <div className="grid grid-cols-1 gap-2 pl-4">
                                                    {group.children.map(child => (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => handleCategorySelect(child.slug)}
                                                            className={`text-left p-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${selectedCategory === child.slug ? "text-gold bg-gold/5 border border-gold/20" : "text-slate/60 hover:text-white"}`}
                                                        >
                                                            {child.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Sticky Filter Trigger (Mobile) ── */}
            <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center lg:hidden px-6 pointer-events-none">
                <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="pointer-events-auto bg-gold text-navy px-10 py-5 rounded-[2rem] flex items-center gap-3 font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(251,191,36,0.3)] hover:scale-105 transition-all active:scale-95 border-2 border-white/20 active:translate-y-1"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="4" y1="21" x2="4" y2="14" />
                        <line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" />
                        <line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" />
                        <line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                    Configure View
                </button>
            </div>

            <Footer />
        </>
    );
}
