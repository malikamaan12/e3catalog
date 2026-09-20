"use client";

import { useState, useEffect, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import {
    Plus, Search, X, Edit2, Trash2, Layers, Package,
    CheckCircle2, AlertCircle, Sparkles, Filter, Grid,
    FolderTree, Tag, Eye, EyeOff
} from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    active: boolean;
    productCount: number;
    parentId: string | null;
}

// Map of category slugs to Lucide icon names — must match DB icon values
export const CATEGORY_ICON_MAP: Record<string, string> = {
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

// Icon picker — expanded professional set
const ICONS = [
    "Layers", "Building2", "Frame", "Link2", "Lightbulb", "Mic2", "Monitor",
    "Zap", "Wind", "Armchair", "Palette", "Flag", "Navigation", "Shield",
    "Gamepad2", "Trophy", "Laptop2", "Truck", "ShieldCheck", "HardHat",
    "Box", "Speaker", "Camera", "Cpu", "Wifi", "Package", "BarChart2", "Disc"
];

// Dynamic icon renderer
const renderIcon = (iconName: string | null, slug: string) => {
    let Icon = (LucideIcons as any)[iconName || ""];
    if (!Icon) {
        Icon = (LucideIcons as any)[CATEGORY_ICON_MAP[slug] || "Box"];
    }
    if (!Icon) Icon = LucideIcons.Box;
    return <Icon className="w-5 h-5" />;
};

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [error, setError] = useState("");

    // Search & Filter State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "parent" | "sub">("all");

    // Form state
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formIcon, setFormIcon] = useState("Layers");

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/categories");
            const data = await res.json();
            setCategories(data || []);
        } catch (e) {
            console.error("Failed to load categories:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const openCreateForm = () => {
        setEditing(null);
        setFormName("");
        setFormDescription("");
        setFormIcon("Layers");
        setError("");
        setShowForm(true);
    };

    const openEditForm = (cat: Category) => {
        setEditing(cat);
        setFormName(cat.name);
        setFormDescription(cat.description || "");
        setFormIcon(cat.icon || CATEGORY_ICON_MAP[cat.slug] || "Box");
        setError("");
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!formName.trim()) {
            setError("Category name is required");
            return;
        }
        setError("");

        try {
            if (editing) {
                // Update
                const res = await fetch("/api/admin/categories", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editing.id,
                        name: formName.trim(),
                        description: formDescription.trim() || null,
                        icon: formIcon,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || "Failed to update category");
                    return;
                }
            } else {
                // Create
                const res = await fetch("/api/admin/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formName.trim(),
                        description: formDescription.trim() || null,
                        icon: formIcon,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || "Failed to create category");
                    return;
                }
            }

            setShowForm(false);
            fetchCategories();
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        }
    };

    const toggleActive = async (cat: Category) => {
        try {
            await fetch("/api/admin/categories", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: cat.id, active: !cat.active }),
            });
            fetchCategories();
        } catch (e) {
            console.error("Failed to toggle category active status:", e);
        }
    };

    const deleteCategory = async (cat: Category) => {
        if (!confirm(`Delete category "${cat.name}"? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Failed to delete category");
                return;
            }
            fetchCategories();
        } catch (e: any) {
            alert(e.message || "Network error deleting category");
        }
    };

    // Derived filtered categories
    const filtered = categories.filter((cat) => {
        const matchesSearch =
            cat.name.toLowerCase().includes(search.toLowerCase()) ||
            cat.slug.toLowerCase().includes(search.toLowerCase()) ||
            (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()));
        if (!matchesSearch) return false;
        if (statusFilter === "active") return cat.active;
        if (statusFilter === "disabled") return !cat.active;
        if (statusFilter === "parent") return !cat.parentId;
        if (statusFilter === "sub") return !!cat.parentId;
        return true;
    });

    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    const activeCount = categories.filter((c) => c.active).length;
    const disabledCount = categories.filter((c) => !c.active).length;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Top Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                            Inventory Taxonomy
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Catalog Classification</span>
                    </div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-black text-white tracking-tight">
                        Categories
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Manage rental equipment categories, taxonomy hierarchy, and storefront display settings.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreateForm}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e0c671] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Category</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Categories</span>
                    <span className="text-2xl font-black text-white mt-1">{categories.length}</span>
                    <span className="text-[10px] text-slate-500 mt-auto font-mono">Taxonomy Nodes</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/15 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Active Public
                    </span>
                    <span className="text-2xl font-black text-emerald-300 mt-1">{activeCount}</span>
                    <span className="text-[10px] text-emerald-500/70 mt-auto font-mono">Visible on Storefront</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-500/[0.03] border border-slate-500/15 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Disabled
                    </span>
                    <span className="text-2xl font-black text-slate-300 mt-1">{disabledCount}</span>
                    <span className="text-[10px] text-slate-500 mt-auto font-mono">Hidden From Catalog</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/15 flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)] flex items-center gap-1">
                        <Package className="w-3 h-3" /> Total Products
                    </span>
                    <span className="text-2xl font-black text-[var(--color-gold)] mt-1">{totalProducts}</span>
                    <span className="text-[10px] text-amber-500/70 mt-auto font-mono">Linked Rental Assets</span>
                </div>
            </div>

            {/* Search & Filter Control Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                {/* Search Input Box */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search categories by name, slug or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 py-0.5">
                    {(["all", "active", "disabled", "parent", "sub"] as const).map((f) => {
                        const isSelected = statusFilter === f;
                        return (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    isSelected
                                        ? "bg-gradient-to-r from-[#c9a84c] to-[#e0c671] text-slate-950 font-black shadow-md shadow-amber-500/20"
                                        : "bg-black/30 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                {f === "sub"
                                    ? "Subcategories"
                                    : f === "parent"
                                    ? "Parent Groups"
                                    : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        );
                    })}
                </div>

                {/* Results Count Tag */}
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-slate-400 text-xs font-mono shrink-0 self-end lg:self-center">
                    <span className="text-white font-bold">{filtered.length}</span> results
                </div>
            </div>

            {/* Category Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl p-5 bg-white/[0.02] border border-white/5 animate-pulse space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/5" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-white/5 rounded w-3/4" />
                                    <div className="h-3 bg-white/5 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-10 bg-white/5 rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[var(--color-gold)] flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white">No categories found</h3>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filter criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((cat) => (
                        <div
                            key={cat.id}
                            className={`rounded-2xl p-5 bg-[#0b101e]/90 border border-white/10 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/5 transition-all flex flex-col justify-between group relative overflow-hidden ${
                                !cat.active ? "opacity-60 bg-black/40" : ""
                            }`}
                        >
                            {/* Hover gold shimmer bar */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div>
                                {/* Top Header: Icon + Info + Toggle */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Icon Box */}
                                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--color-gold)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            {renderIcon(cat.icon, cat.slug)}
                                        </div>

                                        <div className="min-w-0">
                                            <h3 className="font-[family-name:var(--font-heading)] font-bold text-white text-base truncate group-hover:text-amber-200 transition-colors">
                                                {cat.name}
                                            </h3>
                                            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5 font-mono text-[11px] text-slate-400 mt-0.5 inline-block truncate max-w-[170px]">
                                                /{cat.slug}
                                            </span>
                                        </div>
                                    </div>

                                    {/* High-Contrast Toggle Switch (Fixed White Pill issue) */}
                                    <button
                                        onClick={() => toggleActive(cat)}
                                        className={`w-11 h-6 rounded-full transition-all relative shrink-0 cursor-pointer p-0.5 border ${
                                            cat.active
                                                ? "bg-gradient-to-r from-[#c9a84c] to-[#e0c671] border-amber-300 shadow-md shadow-amber-500/30"
                                                : "bg-slate-900 border-white/15"
                                        }`}
                                        title={cat.active ? "Category is Active (click to disable)" : "Category is Disabled (click to enable)"}
                                        aria-label={cat.active ? "Disable category" : "Enable category"}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full transition-all transform flex items-center justify-center shadow-md ${
                                                cat.active
                                                    ? "translate-x-5 bg-slate-950 text-[var(--color-gold)]"
                                                    : "translate-x-0 bg-slate-400 text-slate-800"
                                            }`}
                                        >
                                            {cat.active ? (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                                            ) : (
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Description */}
                                <p className="text-xs text-slate-400 line-clamp-2 my-2.5 min-h-[32px] leading-relaxed">
                                    {cat.description || "No description provided for this category."}
                                </p>
                            </div>

                            {/* Card Footer: Product count + Status + Action buttons */}
                            <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-white/10 gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                                        <Package className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="font-mono font-bold text-slate-200">{cat.productCount}</span>
                                        <span className="text-[10px] text-slate-500 hidden sm:inline">items</span>
                                    </div>

                                    {cat.active ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20 shrink-0">
                                            Disabled
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons: Guaranteed Never-Overlap Container */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => openEditForm(cat)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-slate-300 hover:text-[var(--color-gold)] text-xs font-semibold flex items-center gap-1.5 transition-all"
                                        title="Edit Category Details"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={() => deleteCategory(cat)}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                        title="Delete Category"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal Dialog */}
            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className="bg-[#0c1222] border border-white/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">
                                    Taxonomy Configuration
                                </span>
                                <h3 className="font-[family-name:var(--font-heading)] text-xl font-black text-white mt-0.5">
                                    {editing ? `Edit Category: ${editing.name}` : "Create New Category"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Icon Picker */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-300">Category Icon</label>
                                    <span className="text-[10px] font-mono text-[var(--color-gold)]">
                                        Selected: {formIcon}
                                    </span>
                                </div>
                                <div className="grid grid-cols-7 gap-2 max-h-40 overflow-y-auto p-2 rounded-2xl bg-black/40 border border-white/10">
                                    {ICONS.map((iconName) => {
                                        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Box;
                                        const isSelected = formIcon === iconName;
                                        return (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setFormIcon(iconName)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                    isSelected
                                                        ? "bg-[var(--color-gold)] text-black font-bold shadow-lg scale-110"
                                                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                                title={iconName}
                                            >
                                                <IconComponent className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-300">Category Name *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Special Effects & Atmospheric"
                                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:border-[var(--color-gold)] focus:outline-none transition-colors text-xs font-medium"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-300">Description</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Describe the scope of equipment belonging to this category..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:border-[var(--color-gold)] focus:outline-none transition-colors text-xs font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e0c671] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{editing ? "Save Changes" : "Create Category"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
