"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Settings,
    Palette,
    Phone,
    Link as LinkIcon,
    Globe,
    Save,
    RefreshCcw,
    MessageCircle,
    Mail,
    Smartphone,
    LayoutDashboard,
    Megaphone,
    Store,
    Search,
    ChevronRight,
    Layout,
    ShieldCheck,
    Cpu,
    Zap
} from "lucide-react";

interface Setting {
    id: string;
    key: string;
    value: string;
    group: string;
    description: string | null;
}

type Category = "storefront" | "vendor" | "integrations" | "system" | "search";

export function SiteSettingsManager() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<Category>("storefront");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/super-admin/settings");
            const data = await res.json();
            if (Array.isArray(data)) {
                setSettings(data);
            }
        } catch (err) {
            console.error("Failed to fetch settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleUpdateSetting = async (id: string, value: string) => {
        setSaving(id);
        try {
            const res = await fetch("/api/super-admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, value }),
            });
            if (res.ok) {
                const updated = await res.json();
                setSettings(prev => prev.map(s => s.id === id ? updated : s));
            }
        } catch (err) {
            console.error("Failed to update setting");
        } finally {
            setSaving(null);
        }
    };

    // Category Mapping
    const categories = [
        { id: "storefront", label: "Client Storefront", icon: Layout, groups: ["general", "theme", "features", "marketing"] },
        { id: "vendor", label: "Vendor Portal", icon: Store, groups: ["vendor_portal"] },
        { id: "integrations", label: "Integrations & API", icon: Cpu, groups: ["api", "links", "contact"] },
        { id: "system", label: "System Config", icon: Settings, groups: ["system"] },
    ];

    const filteredSettings = useMemo(() => {
        if (searchQuery) {
            return settings.filter(s => 
                s.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
                s.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        const currentCat = categories.find(c => c.id === activeCategory);
        if (!currentCat) return [];
        return settings.filter(s => currentCat.groups.includes(s.group));
    }, [settings, activeCategory, searchQuery]);

    const groupLabels: Record<string, string> = {
        general: "General Branding",
        theme: "Visual Identity",
        contact: "Support Channels",
        api: "Cloud & APIs",
        links: "Navigation Links",
        features: "Experience Toggles",
        marketing: "Marketplace Promotions",
        vendor_portal: "Vendor Hub & Legal"
    };

    const groupIcons: Record<string, any> = {
        general: Settings,
        theme: Palette,
        contact: Phone,
        api: Globe,
        links: LinkIcon,
        features: LayoutDashboard,
        marketing: Megaphone,
        vendor_portal: Store
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] -m-6 overflow-hidden">
            {/* Sidebar CMS Navigation */}
            <aside className="w-full lg:w-72 bg-[var(--color-navy-dark)] border-r border-white/5 flex flex-col pt-6">
                <div className="px-6 mb-8">
                    <h3 className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] mb-4">Site Builder</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input 
                            type="text"
                            placeholder="Find a feature..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-[var(--color-gold)] transition-all"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value) setActiveCategory("search" as any);
                                else setActiveCategory("storefront");
                            }}
                        />
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id as Category);
                                setSearchQuery("");
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group
                                ${activeCategory === cat.id && !searchQuery
                                    ? 'bg-[var(--color-gold)]/10 text-[var(--color-gold)]' 
                                    : 'text-[var(--color-slate)] hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-3">
                                <cat.icon className="w-4 h-4" />
                                <span className="text-sm font-bold">{cat.label}</span>
                            </div>
                            <ChevronRight className={`w-3 h-3 transition-transform ${activeCategory === cat.id ? 'rotate-90' : 'opacity-0 group-hover:opacity-100'}`} />
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5">
                    <button 
                        onClick={fetchSettings}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all text-xs font-bold"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Sync Changes
                    </button>
                </div>
            </aside>

            {/* Main Configuration Canvas */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 p-8">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-[var(--color-gold)]/10">
                            <RefreshCcw className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
                        </div>
                        <p className="text-[var(--color-slate)] font-bold animate-pulse">Retrieved Configuration Data...</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto space-y-12">
                        {/* Header Area */}
                        <div>
                            <div className="flex items-center gap-3 text-[var(--color-gold)] mb-2 uppercase tracking-widest text-[10px] font-black">
                                <Zap className="w-4 h-4" />
                                {searchQuery ? "Search Results" : categories.find(c => c.id === activeCategory)?.label}
                            </div>
                            <h2 className="text-3xl font-black text-[var(--color-warm-white)] tracking-tight">
                                {searchQuery ? `"${searchQuery}"` : "Global Configuration"}
                            </h2>
                            <p className="text-[var(--color-slate)] text-sm max-w-2xl mt-2">
                                {searchQuery 
                                    ? `Showing all settings matching your search query across all platform categories.`
                                    : `Manage all content and functional toggles for the ${categories.find(c => c.id === activeCategory)?.label} module.`}
                            </p>
                        </div>

                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 gap-12">
                            {/* Group by original DB group for clarity within the category */}
                            {Array.from(new Set(filteredSettings.map(s => s.group))).map(group => {
                                const groupItems = filteredSettings.filter(s => s.group === group);
                                const Icon = groupIcons[group] || Settings;
                                return (
                                    <div key={group} className="space-y-6">
                                        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                            <Icon className="w-5 h-5 text-[var(--color-gold)]" />
                                            <h3 className="text-lg font-bold text-[var(--color-warm-white)]">{groupLabels[group] || group}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            {groupItems.map((setting) => (
                                                <div key={setting.id} className="glass border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all group/card">
                                                    <div className="flex flex-col md:flex-row gap-6">
                                                        <div className="md:w-1/3 space-y-1">
                                                            <label className="text-xs font-black text-[var(--color-gold)] uppercase tracking-widest block">
                                                                {setting.key.replace(/_/g, ' ')}
                                                            </label>
                                                            <p className="text-[10px] text-[var(--color-slate)] leading-relaxed italic">
                                                                {setting.description || "No documentation available for this key."}
                                                            </p>
                                                        </div>
                                                        <div className="md:w-2/3 flex gap-3 items-start">
                                                            <div className="flex-1">
                                                                {setting.group === 'vendor_portal' || setting.key.includes('content') || setting.key.includes('json') ? (
                                                                    <textarea
                                                                        className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[var(--color-gold)] transition-all text-sm font-medium custom-scrollbar
                                                                            ${setting.key.includes('content') ? 'min-h-[250px]' : 'min-h-[120px]'}`}
                                                                        value={setting.value}
                                                                        onChange={(e) => {
                                                                            const newVal = e.target.value;
                                                                            setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newVal } : s));
                                                                        }}
                                                                    />
                                                                ) : setting.value === 'true' || setting.value === 'false' ? (
                                                                    <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl w-fit">
                                                                        <button 
                                                                            onClick={() => setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: 'true' } : s))}
                                                                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${setting.value === 'true' ? 'bg-green-500/10 text-green-400' : 'text-[var(--color-slate)] hover:bg-white/5'}`}
                                                                        >Enabled</button>
                                                                        <button 
                                                                            onClick={() => setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: 'false' } : s))}
                                                                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${setting.value === 'false' ? 'bg-red-500/10 text-red-400' : 'text-[var(--color-slate)] hover:bg-white/5'}`}
                                                                        >Disabled</button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative group">
                                                                        <input
                                                                            type="text"
                                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[var(--color-gold)] transition-all text-sm font-medium"
                                                                            value={setting.value}
                                                                            onChange={(e) => {
                                                                                const newVal = e.target.value;
                                                                                setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newVal } : s));
                                                                            }}
                                                                        />
                                                                        {setting.key.includes('color') && (
                                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/20 shadow-lg" style={{ backgroundColor: setting.value }} />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdateSetting(setting.id, setting.value)}
                                                                disabled={saving === setting.id}
                                                                className={`p-3 rounded-xl font-bold transition-all flex items-center justify-center shrink-0
                                                                    ${saving === setting.id
                                                                        ? 'bg-white/10 text-[var(--color-slate)]'
                                                                        : 'bg-[var(--color-gold)] text-[var(--color-navy)] hover:bg-[var(--color-gold-lighter)] shadow-lg shadow-gold/10'}`}
                                                            >
                                                                {saving === setting.id ? (
                                                                    <RefreshCcw className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <Save className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredSettings.length === 0 && (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search className="w-8 h-8 text-[var(--color-slate)] opacity-20" />
                                    </div>
                                    <h4 className="text-[var(--color-warm-white)] font-bold">No settings found</h4>
                                    <p className="text-[var(--color-slate)] text-sm mt-1">Try a different search term or check another category.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
