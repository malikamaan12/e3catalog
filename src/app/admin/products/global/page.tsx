"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Globe } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";

interface Product {
    id: string;
    name: string;
    slug: string;
    pricePerDay: number;
    pricePerHour: number | null;
    totalUnits: number;
    unit: string;
    condition: string;
    thumbnailUrl: string | null;
    dimensions: string | null;
    shortDescription: string | null;
    category: { name: string; slug: string } | null;
}

export default function GlobalCatalogPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [conditionFilter, setConditionFilter] = useState("ALL");

    useEffect(() => {
        fetch("/api/products")
            .then((r) => r.json())
            .then((data) => {
                setProducts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const uniqueCategories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => {
            if (p.category?.name) cats.add(p.category.name);
        });
        return Array.from(cats).sort();
    }, [products]);

    const processedProducts = useMemo(() => {
        return products.filter(p => {
            // Search
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);

            // Category
            const matchesCategory = categoryFilter === "ALL" || p.category?.name === categoryFilter;

            // Condition
            const matchesCondition = conditionFilter === "ALL" || p.condition === conditionFilter;

            return matchesSearch && matchesCategory && matchesCondition;
        });
    }, [products, searchQuery, categoryFilter, conditionFilter]);

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[var(--color-navy-lighter)] border border-white/10 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-[var(--color-gold)]" />
                </div>
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Global Catalog
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">
                        Viewing all {products.length} active products available across the marketplace. (Read Only)
                    </p>
                </div>
            </div>

            {/* CONTROL BAR */}
            <div className="glass rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-white/10">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                    <input
                        type="text"
                        placeholder="Search products by name or slug..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--color-navy)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-[var(--color-navy)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-[var(--color-gold)]" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-transparent text-sm text-[var(--color-warm-white)] focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Categories</option>
                            {uniqueCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--color-navy)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-[var(--color-gold)]" />
                        <select
                            value={conditionFilter}
                            onChange={(e) => setConditionFilter(e.target.value)}
                            className="bg-transparent text-sm text-[var(--color-warm-white)] focus:outline-none appearance-none cursor-pointer capitalize"
                        >
                            <option value="ALL">All Conditions</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="maintenance_required">Maintenance Required</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass rounded-lg p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--color-navy-lighter)] rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-[var(--color-navy-lighter)] rounded w-1/3" />
                                    <div className="h-3 bg-[var(--color-navy-lighter)] rounded w-1/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {processedProducts.length === 0 ? (
                        <div className="col-span-full p-8 text-center text-sm text-[var(--color-slate)] border border-dashed border-white/10 m-4 rounded-xl glass">
                            No products found in the marketplace.
                        </div>
                    ) : (
                        processedProducts.map((product) => (
                            <ProductCard key={product.id} {...product} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
