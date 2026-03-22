"use strict";
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Settings, Image as ImageIcon, Save, CheckCircle2 } from "lucide-react";
import { CloudImageUpload } from "@/components/CloudImageUpload";

export default function VendorSettings() {
    const [headerUrl, setHeaderUrl] = useState<string>("");
    const [footerUrl, setFooterUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetch("/api/vendors/me")
            .then(res => res.json())
            .then(data => {
                if (data.vendor) {
                    setHeaderUrl(data.vendor.letterheadHeaderUrl || "");
                    setFooterUrl(data.vendor.letterheadFooterUrl || "");
                }
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);
        try {
            const res = await fetch("/api/vendors/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    letterheadHeaderUrl: headerUrl,
                    letterheadFooterUrl: footerUrl
                })
            });

            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Failed to save settings", error);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                        <Settings className="w-8 h-8 text-[var(--color-gold)]" />
                        Account Settings
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1">Manage your brand assets and notification preferences.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-gold)] hover:bg-yellow-600 text-[var(--color-navy)] rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-[var(--color-navy)] border-t-transparent animate-spin rounded-full" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saveSuccess ? "Saved!" : "Save Changes"}
                </button>
            </div>

            {/* Letterhead Configuration */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 bg-[var(--color-navy-dark)]">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold tracking-wider text-[var(--color-warm-white)] flex items-center gap-2 text-sm uppercase">
                        <ImageIcon className="w-4 h-4 text-[var(--color-gold)]" />
                        PDF Quote Letterhead Graphics
                    </h2>
                    <p className="text-xs text-[var(--color-slate)] mt-1">
                        These images will be strictly injected into the absolute top and bottom of your formal tender proposals. Use landscape images with transparent or solid white backgrounds.
                    </p>
                </div>

                <div className="p-6 md:p-8 space-y-8 bg-[var(--color-navy)]/30">

                    {/* Header Image */}
                    <div>
                        <h3 className="text-sm font-bold text-[var(--color-warm-white)] mb-1">Company Letterhead Header</h3>
                        <p className="text-xs text-[var(--color-slate)] mb-4">Recommended dimensions: 2480px width × 350px height. (Full A4 Width)</p>

                        <div className="border border-white/10 rounded-xl p-4 bg-[var(--color-navy-dark)]">
                            {headerUrl ? (
                                <div className="relative group">
                                    <div className="w-full h-24 bg-white/5 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center p-2">
                                        <img src={headerUrl} alt="Header Preview" className="max-h-full object-contain" />
                                    </div>
                                    <button
                                        onClick={() => setHeaderUrl("")}
                                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <CloudImageUpload
                                    folder="vendor-assets"
                                    onUploadComplete={(url) => setHeaderUrl(url)}
                                />
                            )}
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-8" />

                    {/* Footer Image */}
                    <div>
                        <h3 className="text-sm font-bold text-[var(--color-warm-white)] mb-1">Company Letterhead Footer</h3>
                        <p className="text-xs text-[var(--color-slate)] mb-4">Recommended dimensions: 2480px width × 250px height. Include TRN, CR, and legal entity details here.</p>

                        <div className="border border-white/10 rounded-xl p-4 bg-[var(--color-navy-dark)]">
                            {footerUrl ? (
                                <div className="relative group">
                                    <div className="w-full h-20 bg-white/5 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center p-2">
                                        <img src={footerUrl} alt="Footer Preview" className="max-h-full object-contain" />
                                    </div>
                                    <button
                                        onClick={() => setFooterUrl("")}
                                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <CloudImageUpload
                                    folder="vendor-assets"
                                    onUploadComplete={(url) => setFooterUrl(url)}
                                />
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
