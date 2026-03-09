"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import * as LucideIcons from "lucide-react";
import { LayoutGrid } from "lucide-react";

interface Product {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    pricePerDay: number;
    pricePerHour: number | null;
    totalUnits: number;
    condition: string;
    thumbnailUrl: string | null;
    dimensions: string | null;
    category: { name: string; slug: string } | null;
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

// Slug → Lucide icon name (matches what's stored in DB)
const SLUG_ICON_MAP: Record<string, string> = {
    "staging": "Layers",
    "exhibitions": "Building2",
    "structures": "Frame",
    "rigging-truss": "Link2",
    "lighting": "Lightbulb",
    "audio": "Mic2",
    "led-displays": "Monitor",
    "power-electrical": "Zap",
    "climate-utilities": "Wind",
    "furniture": "Armchair",
    "decor": "Palette",
    "branding": "Flag",
    "wayfinding": "Navigation",
    "crowd-control": "Shield",
    "entertainment": "Gamepad2",
    "sports-equipment": "Trophy",
    "event-technology": "Laptop2",
    "logistics-equipment": "Truck",
    "safety-equipment": "ShieldCheck",
    "manpower": "HardHat",
};

function CategoryIcon({ icon, slug, className = "w-4 h-4" }: { icon?: string | null; slug: string; className?: string }) {
    // 1. Try DB icon name first, 2. Fall back to slug map, 3. Default to LayoutGrid
    const iconName = icon || SLUG_ICON_MAP[slug] || "LayoutGrid";
    const Icon = (LucideIcons as any)[iconName] || LayoutGrid;
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
    const [loading, setLoading] = useState(true);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/categories")
            .then((r) => r.json())
            .then((data) => {
                if (data.tree) {
                    setCategoryTree(data.tree);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);
        const url = selectedCategory
            ? `/api/products?category=${selectedCategory}`
            : "/api/products";
        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [selectedCategory]);

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCategorySelect = (slug: string) => {
        setSelectedCategory(slug);
    };

    return (
        <>
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-7xl mx-auto px-6">
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
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                        />
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
                                {categoryTree.map((group) => {
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
                            {/* Mobile category pills */}
                            <div className="flex gap-2 flex-wrap mb-6 lg:hidden">
                                <button
                                    onClick={() => handleCategorySelect("")}
                                    className={`px-3 py-1.5 rounded-lg font-[family-name:var(--font-heading)] text-xs font-semibold transition-all flex items-center gap-2 ${!selectedCategory ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "glass text-[var(--color-slate)] hover:text-[var(--color-gold)]"}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> All
                                </button>
                                {categoryTree.map((group) => (
                                    <button
                                        key={group.id}
                                        onClick={() => handleCategorySelect(group.slug)}
                                        className={`px-3 py-1.5 rounded-lg font-[family-name:var(--font-heading)] text-xs font-semibold transition-all flex items-center gap-2 ${selectedCategory === group.slug ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "glass text-[var(--color-slate)] hover:text-[var(--color-gold)]"}`}
                                    >
                                        <CategoryIcon icon={group.icon} slug={group.slug} className="w-3.5 h-3.5" /> {group.name}
                                    </button>
                                ))}
                            </div>

                            {/* Results count */}
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-[var(--color-slate)]">
                                    {loading ? "Loading..." : `${filteredProducts.length} item${filteredProducts.length !== 1 ? "s" : ""} found`}
                                </p>
                            </div>

                            {/* Product grid */}
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <div key={i} className="card animate-pulse">
                                            <div className="h-52 bg-[var(--color-navy-lighter)] rounded-t-xl" />
                                            <div className="p-5 space-y-3">
                                                <div className="h-4 bg-[var(--color-navy-lighter)] rounded w-3/4" />
                                                <div className="h-3 bg-[var(--color-navy-lighter)] rounded w-full" />
                                                <div className="h-3 bg-[var(--color-navy-lighter)] rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="text-5xl mb-4">🔍</div>
                                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--color-warm-white)] mb-2">
                                        No equipment found
                                    </h3>
                                    <p className="text-[var(--color-slate)]">Try adjusting your search or category filter.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredProducts.map((product) => (
                                        <ProductCard key={product.id} {...product} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
