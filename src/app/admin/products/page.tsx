"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";
import * as HoverCard from "@radix-ui/react-hover-card";
import AvailabilityTimeline from "@/components/admin/AvailabilityTimeline";

interface Product {
    id: string;
    itemCode: string | null;
    name: string;
    slug: string;
    pricePerDay: number;
    totalUnits: number;
    unit: string;
    condition: string;
    thumbnailUrl: string | null;
    category: { name: string; slug: string } | null;
    vendor: { id: string; companyName: string } | null;
    media: Array<{ id: string; type: string }>;
    safetyCertificates: Array<{ id: string; certName: string }>;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("admin");

    const canManageProducts = ["admin", "super_admin", "vendor"].includes(userRole);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [conditionFilter, setConditionFilter] = useState("ALL");
    const [vendorFilter, setVendorFilter] = useState("ALL");

    useEffect(() => {
        fetch("/api/admin/products")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setProducts(data);
                } else {
                    console.error("Admin API Error or Invalid Data:", data);
                    setProducts([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Fetch Error:", err);
                setLoading(false);
            });

        fetch("/api/auth/me")
            .then(r => r.json())
            .then(data => { if (data?.user?.role) setUserRole(data.user.role); })
            .catch(() => { });
    }, []);

    const deleteProduct = async (id: string) => {
        if (!confirm("Delete this product and all associated data?")) return;
        await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
        setProducts((prev) => prev.filter((p) => p.id !== id));
    };

    const uniqueCategories = useMemo(() => {
        const cats = new Set<string>();
        if (Array.isArray(products)) {
            products.forEach(p => {
                if (p.category?.name) cats.add(p.category.name);
            });
        }
        return Array.from(cats).sort();
    }, [products]);

    const uniqueVendors = useMemo(() => {
        const vens = new Set<string>();
        if (Array.isArray(products)) {
            products.forEach(p => {
                if (p.vendor?.companyName) vens.add(p.vendor.companyName);
            });
        }
        return Array.from(vens).sort();
    }, [products]);

    const processedProducts = useMemo(() => {
        if (!Array.isArray(products)) return [];
        return products.filter(p => {
            // Search
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q ||
                p.name.toLowerCase().includes(q) ||
                p.slug.toLowerCase().includes(q) ||
                (p.itemCode && p.itemCode.toLowerCase().includes(q)) ||
                (p.vendor?.companyName && p.vendor.companyName.toLowerCase().includes(q));

            // Category
            const matchesCategory = categoryFilter === "ALL" || p.category?.name === categoryFilter;

            // Condition
            const matchesCondition = conditionFilter === "ALL" || p.condition === conditionFilter;

            // Vendor
            const matchesVendor = vendorFilter === "ALL" ||
                (vendorFilter === "PLATFORM" ? !p.vendor : p.vendor?.companyName === vendorFilter);

            return matchesSearch && matchesCategory && matchesCondition && matchesVendor;
        });
    }, [products, searchQuery, categoryFilter, conditionFilter, vendorFilter]);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Products
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">{products.length} items in fleet</p>
                </div>
                {canManageProducts && (
                    <Link href="/admin/products/add" className="btn-primary text-sm">
                        + Add Product
                    </Link>
                )}
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
                            <option value="ALL" className="bg-[#0a0f1e] text-white">All Categories</option>
                            {uniqueCategories.map(c => (
                                <option key={c} value={c} className="bg-[#0a0f1e] text-white">{c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--color-navy)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-[var(--color-gold)]" />
                        <select
                            value={vendorFilter}
                            onChange={(e) => setVendorFilter(e.target.value)}
                            className="bg-transparent text-sm text-[var(--color-warm-white)] focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="ALL" className="bg-[#0a0f1e] text-white">All Vendors</option>
                            <option value="PLATFORM" className="bg-[#0a0f1e] text-white">Platform Only</option>
                            {uniqueVendors.map(v => (
                                <option key={v} value={v} className="bg-[#0a0f1e] text-white">{v}</option>
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
                            <option value="ALL" className="bg-[#0a0f1e] text-white">All Conditions</option>
                            <option value="excellent" className="bg-[#0a0f1e] text-white">Excellent</option>
                            <option value="good" className="bg-[#0a0f1e] text-white">Good</option>
                            <option value="maintenance_required" className="bg-[#0a0f1e] text-white">Maintenance Required</option>
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
                <div className="glass rounded-xl overflow-hidden">
                    {processedProducts.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[var(--color-slate)] border border-dashed border-[var(--color-border-subtle)] m-4 rounded-xl">
                            No products match your filters.
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border-subtle)]">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider">PRODUCT</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider">SKU</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider">VENDOR</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider hidden md:table-cell">CATEGORY</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider">PRICE/DAY</th>
                                    <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider hidden md:table-cell">UNITS</th>
                                    <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider hidden md:table-cell">CONDITION</th>
                                    <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider hidden lg:table-cell">MEDIA</th>
                                    <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider hidden lg:table-cell">CERTS</th>
                                    {canManageProducts && (
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--color-gold)] tracking-wider">ACTIONS</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {processedProducts.map((product) => {
                                    const productCondition = product.condition || "excellent"; // Fallback default
                                    const conditionColor = productCondition === "excellent" ? "text-[var(--color-success)]" : productCondition === "good" ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]";
                                    return (
                                        <tr key={product.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-navy-lighter)] transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-navy-lighter)] overflow-hidden shrink-0">
                                                        {product.thumbnailUrl && (
                                                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${product.thumbnailUrl})` }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-warm-white)]">{product.name}</p>
                                                        <p className="text-xs text-[var(--color-slate)]">{product.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs font-mono bg-[var(--color-navy-lighter)] px-2 py-1 rounded border border-white/5 text-[var(--color-gold)]">
                                                    {product.itemCode || "—"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {product.vendor ? (
                                                    <span className="text-xs font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded-full border border-[var(--color-gold)]/20">
                                                        {product.vendor.companyName}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-[var(--color-slate)] bg-white/5 px-2 py-0.5 rounded-full border border-white/10 uppercase">
                                                        Platform
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-[var(--color-slate)] hidden md:table-cell">{product.category?.name || "—"}</td>
                                            <td className="py-3 px-4 text-sm text-[var(--color-slate)] hidden md:table-cell text-right font-medium text-[var(--color-gold)]">{product.pricePerDay.toLocaleString()} QAR</td>
                                            <td className="py-3 px-4 text-sm text-center text-[var(--color-warm-white)] hidden md:table-cell">
                                                <HoverCard.Root openDelay={200} closeDelay={100}>
                                                    <HoverCard.Trigger asChild>
                                                        <span className="cursor-help underline dotted decoration-[var(--color-slate)] underline-offset-4 font-semibold hover:text-[var(--color-gold)] transition-colors">
                                                            {product.totalUnits} {product.unit}
                                                        </span>
                                                    </HoverCard.Trigger>
                                                    <HoverCard.Portal>
                                                        <HoverCard.Content
                                                            className="w-[32rem] z-50 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl p-0 overflow-hidden outline-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
                                                            side="left"
                                                            align="center"
                                                            sideOffset={16}
                                                        >
                                                            {/* Reuse the interactive timeline component, but strip the outer padding */}
                                                            <div className="-m-6">
                                                                <AvailabilityTimeline productId={product.id} />
                                                            </div>
                                                        </HoverCard.Content>
                                                    </HoverCard.Portal>
                                                </HoverCard.Root>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-center hidden md:table-cell">
                                                <span className={`capitalize font-medium ${conditionColor}`}>
                                                    {productCondition.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-center text-[var(--color-slate)] hidden lg:table-cell">{product.media?.length || 0}</td>
                                            <td className="py-3 px-4 text-sm text-center text-[var(--color-slate)] hidden lg:table-cell">{product.safetyCertificates?.length || 0}</td>
                                            {canManageProducts && (
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link href={`/admin/products/edit/${product.id}`} className="text-xs text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors px-2 py-1 rounded">
                                                            Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => deleteProduct(product.id)}
                                                            className="text-xs text-[var(--color-danger)] hover:text-red-400 transition-colors px-2 py-1 rounded"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
