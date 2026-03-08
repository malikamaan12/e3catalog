"use client";

import { useState, useEffect, useCallback } from "react";
import * as LucideIcons from "lucide-react";

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

// Map of category slugs to icon names to match catalog display exactly
export const CATEGORY_ICON_MAP: Record<string, string> = {
    staging: "Tent",
    sound: "Speaker",
    lighting: "Lightbulb",
    power: "Zap",
    trussing: "Component",
    rigging: "Anchor",
    video: "MonitorPlay",
    sfx: "Sparkles",
    backline: "Guitar",
    "led-screens": "Tv",
};

// Fallback icon list for picker
const ICONS = ["Tent", "Speaker", "Lightbulb", "Zap", "Component", "Anchor", "MonitorPlay", "Sparkles", "Guitar", "Tv", "Box"];

// Dynamic icon renderer
const renderIcon = (iconName: string | null, slug: string) => {
    // 1. Try exact requested icon
    let Icon = (LucideIcons as any)[iconName || ""];

    // 2. Fall back to slug mapping if null or not found
    if (!Icon) {
        Icon = (LucideIcons as any)[CATEGORY_ICON_MAP[slug] || "Box"];
    }

    // 3. Ultimate fallback
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
    const [formIcon, setFormIcon] = useState("📦");

    const fetchCategories = useCallback(async () => {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        setCategories(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const openCreateForm = () => {
        setEditing(null);
        setFormName("");
        setFormDescription("");
        setFormIcon("📦");
        setError("");
        setShowForm(true);
    };

    const openEditForm = (cat: Category) => {
        setEditing(cat);
        setFormName(cat.name);
        setFormDescription(cat.description || "");
        setFormIcon(cat.icon || "📦");
        setError("");
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!formName.trim()) { setError("Category name is required"); return; }
        setError("");

        if (editing) {
            // Update
            const res = await fetch("/api/admin/categories", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editing.id, name: formName.trim(), description: formDescription.trim() || null, icon: formIcon }),
            });
            if (!res.ok) { const data = await res.json(); setError(data.error); return; }
        } else {
            // Create
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: formName.trim(), description: formDescription.trim() || null, icon: formIcon }),
            });
            if (!res.ok) { const data = await res.json(); setError(data.error); return; }
        }

        setShowForm(false);
        fetchCategories();
    };

    const toggleActive = async (cat: Category) => {
        await fetch("/api/admin/categories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: cat.id, active: !cat.active }),
        });
        fetchCategories();
    };

    const deleteCategory = async (cat: Category) => {
        if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
        const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Failed to delete");
            return;
        }
        fetchCategories();
    };

    // Derived filtered categories
    const filtered = categories.filter((cat) => {
        const matchesSearch =
            cat.name.toLowerCase().includes(search.toLowerCase()) ||
            cat.slug.toLowerCase().includes(search.toLowerCase()) ||
            cat.description?.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (statusFilter === "active") return cat.active;
        if (statusFilter === "disabled") return !cat.active;
        if (statusFilter === "parent") return !cat.parentId;
        if (statusFilter === "sub") return !!cat.parentId;
        return true;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Categories
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">{categories.length} total · {categories.filter(c => !c.active).length} disabled</p>
                </div>
                <button onClick={openCreateForm} className="btn-primary text-sm">
                    + New Category
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        type="text"
                        placeholder="Search categories by name, slug or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] rounded-xl text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap">
                    {(["all", "active", "disabled", "parent", "sub"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${statusFilter === f
                                ? "bg-[var(--color-gold)] text-[var(--color-navy)]"
                                : "bg-[var(--color-navy-lighter)] text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"
                                }`}
                        >
                            {f === "sub" ? "Subcategories" : f === "parent" ? "Parent Groups" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-[var(--color-slate)] self-center shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Category Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="glass rounded-xl p-6 animate-pulse">
                            <div className="h-6 bg-[var(--color-navy-lighter)] rounded w-1/2 mb-3" />
                            <div className="h-4 bg-[var(--color-navy-lighter)] rounded w-3/4" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-[var(--color-slate)] text-sm">No categories match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((cat) => (
                        <div key={cat.id} className={`glass rounded-xl p-6 transition-all ${!cat.active ? "opacity-50" : ""}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-[var(--color-gold)]">
                                        {renderIcon(cat.icon, cat.slug)}
                                    </div>
                                    <div>
                                        <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)]">
                                            {cat.name}
                                        </h3>
                                        <span className="text-xs text-[var(--color-slate)] font-mono">/{cat.slug}</span>
                                    </div>
                                </div>

                                {/* Toggle */}
                                <button
                                    onClick={() => toggleActive(cat)}
                                    className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${cat.active ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"
                                        }`}
                                    title={cat.active ? "Active — click to disable" : "Disabled — click to enable"}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${cat.active ? "left-6" : "left-1"}`} />
                                </button>
                            </div>

                            {cat.description && (
                                <p className="text-sm text-[var(--color-slate)] mb-3 line-clamp-2">{cat.description}</p>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-[var(--color-slate)]">
                                        {cat.productCount} product{cat.productCount !== 1 ? "s" : ""}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.active ? "bg-green-500/10 text-[var(--color-success)]" : "bg-red-500/10 text-[var(--color-danger)]"
                                        }`}>
                                        {cat.active ? "Active" : "Disabled"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditForm(cat)}
                                        className="text-xs text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors px-2 py-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteCategory(cat)}
                                        className="text-xs text-[var(--color-danger)] hover:text-red-400 transition-colors px-2 py-1"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-6" onClick={() => setShowForm(false)}>
                    <div className="glass rounded-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-warm-white)] mb-6">
                            {editing ? "Edit Category" : "Create Category"}
                        </h3>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[var(--color-danger)] text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Icon Picker */}
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICONS.map((iconName) => {
                                        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Box;
                                        return (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setFormIcon(iconName)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${formIcon === iconName
                                                    ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/50 scale-105"
                                                    : "bg-[var(--color-navy-lighter)] text-[var(--color-slate)] border border-transparent hover:bg-[var(--color-navy-light)] hover:text-[var(--color-warm-white)]"
                                                    }`}
                                                title={iconName}
                                            >
                                                <IconComponent className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Category Name *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Special Effects"
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Description</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Brief description of this equipment category..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm !py-2 !px-5">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} className="btn-primary text-sm !py-2 !px-5">
                                {editing ? "Save Changes" : "Create Category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
