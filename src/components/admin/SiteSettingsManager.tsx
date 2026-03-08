"use client";

import React, { useState, useEffect } from "react";
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
    Megaphone
} from "lucide-react";

interface Setting {
    id: string;
    key: string;
    value: string;
    group: string;
    description: string | null;
}

export function SiteSettingsManager() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

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

    const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.group]) acc[setting.group] = [];
        acc[setting.group].push(setting);
        return acc;
    }, {} as Record<string, Setting[]>);

    const groupIcons: Record<string, any> = {
        general: Settings,
        theme: Palette,
        contact: Phone,
        api: Globe,
        links: LinkIcon,
        features: LayoutDashboard,
        marketing: Megaphone
    };

    const groupLabels: Record<string, string> = {
        general: "General Settings",
        theme: "Appearance & Theme",
        contact: "Contact & Communication",
        api: "Third-party APIs",
        links: "Important Links",
        features: "Features & Layout Toggles",
        marketing: "Marketing & Banners"
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Globe className="w-6 h-6 text-[var(--color-gold)]" />
                        Site Configuration
                    </h2>
                    <p className="text-sm text-[var(--color-slate)]">Control the website's behavior, style, and content from one place.</p>
                </div>
                <button
                    onClick={fetchSettings}
                    className="flex items-center gap-2 text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <RefreshCcw className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {Object.entries(groupedSettings).map(([group, groupItems]) => {
                        const Icon = groupIcons[group] || Settings;
                        return (
                            <div key={group} className="glass border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-[var(--color-warm-white)]">{groupLabels[group] || group}</h3>
                                </div>
                                <div className="p-6 space-y-6 flex-1">
                                    {groupItems.map((setting) => (
                                        <div key={setting.id} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">{setting.key.replace(/_/g, ' ')}</label>
                                                {setting.description && (
                                                    <span className="text-[10px] text-[var(--color-slate)] italic">{setting.description}</span>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                {setting.group === 'content' || setting.group === 'seo' || setting.key.includes('content') ? (
                                                    <textarea
                                                        className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all text-sm min-h-[80px]"
                                                        value={setting.value}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newVal } : s));
                                                        }}
                                                    />
                                                ) : setting.value === 'true' || setting.value === 'false' ? (
                                                    <select
                                                        className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all text-sm"
                                                        value={setting.value}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newVal } : s));
                                                        }}
                                                    >
                                                        <option value="true">Enabled</option>
                                                        <option value="false">Disabled</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all text-sm"
                                                        value={setting.value}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newVal } : s));
                                                        }}
                                                    />
                                                )}
                                                <button
                                                    onClick={() => handleUpdateSetting(setting.id, setting.value)}
                                                    disabled={saving === setting.id}
                                                    className={`px-4 rounded-xl font-bold transition-all flex items-center justify-center min-w-[100px]
                                                        ${saving === setting.id
                                                            ? 'bg-white/10 text-[var(--color-slate)]'
                                                            : 'bg-[var(--color-gold)] text-[var(--color-navy)] hover:bg-[var(--color-gold-lighter)] shadow-lg shadow-gold/10'}`}
                                                >
                                                    {saving === setting.id ? (
                                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Save
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Content & Links Quick Actions */}
            <div className="glass border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-[var(--color-warm-white)] mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                    Integration Preview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-slate)]">
                            <Smartphone className="w-4 h-4" /> WhatsApp Link
                        </div>
                        <p className="text-sm font-mono text-green-400 truncate">
                            wa.me/{settings.find(s => s.key === 'whatsapp_number')?.value || '...'}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-slate)]">
                            <Mail className="w-4 h-4" /> Contact Email
                        </div>
                        <p className="text-sm font-mono text-blue-400 truncate">
                            {settings.find(s => s.key === 'contact_email')?.value || '...'}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-slate)]">
                            <Palette className="w-4 h-4" /> Theme Color
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-full border border-white/10"
                                style={{ backgroundColor: settings.find(s => s.key === 'primary_color')?.value || '#000' }}
                            />
                            <p className="text-sm font-mono text-[var(--color-gold)] uppercase">
                                {settings.find(s => s.key === 'primary_color')?.value || '...'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
