"use client";

import React, { useState, useEffect, useRef } from "react";
import { Save, Store, User, Building, Banknote, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

export default function VendorProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/admin/vendor/profile");
            const data = await res.json();
            if (res.ok) setProfile(data);
            else setMessage({ type: "error", text: data.error });
        } catch (e) {
            setMessage({ type: "error", text: "Failed to load profile" });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/vendor/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setProfile(data);
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-[var(--color-slate)] animate-pulse">Loading profile...</div>;
    }

    if (!profile) {
        return <div className="p-8 text-[var(--color-danger)]">Could not find vendor profile.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-3 mb-8">
                <Store className="w-8 h-8 text-[var(--color-gold)]" />
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Company Profile
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">Manage your public information and banking details.</p>
                </div>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* General Info */}
                <div className="glass p-6 md:p-8 rounded-2xl border border-white/10">
                    <h2 className="text-lg font-bold text-[var(--color-gold)] mb-6 flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        General Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload Section */}
                        <div className="md:col-span-2 flex flex-col items-center sm:flex-row sm:items-start gap-6 border-b border-white/10 pb-6 mb-2">
                            <div className="shrink-0 relative group">
                                <div className="w-32 h-32 rounded-2xl bg-[var(--color-navy-dark)] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden relative shadow-inner">
                                    {localPreview || profile.logoUrl ? (
                                        <img
                                            src={localPreview || profile.logoUrl}
                                            alt="Company Logo"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error("Image failed to load:", (e.target as HTMLImageElement).src);
                                                // Only show alert if it's the final CDN URL failing
                                                if (!localPreview) {
                                                    setMessage({ type: "error", text: "Thumbnail failed to load. Please check your NEXT_PUBLIC_CDN_URL in .env is a PUBLIC URL." });
                                                }
                                            }}
                                        />
                                    ) : (
                                        <ImageIcon className="w-10 h-10 text-[var(--color-slate)] opacity-50" />
                                    )}
                                    {uploadingLogo && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <Loader2 className="w-6 h-6 text-[var(--color-gold)] animate-spin" />
                                        </div>
                                    )}
                                </div>
                                {profile.logoUrl && !uploadingLogo && (
                                    <button
                                        type="button"
                                        onClick={() => setProfile({ ...profile, logoUrl: null })}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-sm font-bold text-[var(--color-warm-white)] mb-1">Company Logo</h3>
                                <p className="text-xs text-[var(--color-slate)] mb-4 max-w-md">
                                    This logo will represent your company on quotes, invoices, and marketplace listings. Recommended size: 400x400px (1:1 aspect ratio).
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        // Force correct MIME type for common Windows misdetections
                                        const mimeType = file.type || "image/jpeg";

                                        // Create instant local preview
                                        const previewUrl = URL.createObjectURL(file);
                                        setLocalPreview(previewUrl);

                                        setUploadingLogo(true);
                                        setMessage(null);

                                        try {
                                            // Step 1: Get presigned upload URL from our API
                                            const presignRes = await fetch("/api/upload", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    filename: file.name,
                                                    contentType: mimeType,
                                                    folder: "logos"
                                                })
                                            });

                                            if (!presignRes.ok) {
                                                const err = await presignRes.json().catch(() => ({}));
                                                throw new Error(err.error || `Presign failed (${presignRes.status})`);
                                            }

                                            const { url: presignedUrl, publicUrl } = await presignRes.json();

                                            // Step 2: Upload the file directly to R2 via presigned URL
                                            const s3Res = await fetch(presignedUrl, {
                                                method: "PUT",
                                                headers: { "Content-Type": mimeType },
                                                body: file,
                                            });

                                            if (!s3Res.ok) {
                                                throw new Error(`Storage upload failed (${s3Res.status})`);
                                            }

                                            // Step 3: Save the public CDN URL to the profile state
                                            setProfile((prev: any) => ({ ...prev, logoUrl: publicUrl }));

                                            // Clear local preview once CDN is ready
                                            setLocalPreview(null);
                                            setMessage({ type: "success", text: "Logo uploaded! Click 'Save Profile Changes' to apply." });

                                        } catch (err: any) {
                                            console.error("Logo upload error:", err);
                                            setMessage({ type: "error", text: `Failed to upload logo: ${err.message}` });
                                        } finally {
                                            setUploadingLogo(false);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-navy-lighter)] border border-white/10 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <Upload className="w-4 h-4" />
                                    {profile.logoUrl ? "Change Logo" : "Upload Logo"}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Company Name</label>
                            <input
                                type="text"
                                name="companyName"
                                value={profile.companyName || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Website URL</label>
                            <input
                                type="url"
                                name="website"
                                value={profile.website || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Points of Contact */}
                <div className="glass p-6 md:p-8 rounded-2xl border border-white/10">
                    <h2 className="text-lg font-bold text-[var(--color-gold)] mb-6 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Points of Contact
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Primary POC Name</label>
                            <input
                                type="text"
                                name="pocName"
                                value={profile.pocName || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Primary POC Phone</label>
                            <input
                                type="tel"
                                name="pocPhone"
                                value={profile.pocPhone || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Alternate POC Name</label>
                            <input
                                type="text"
                                name="alternatePocName"
                                value={profile.alternatePocName || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Alternate POC Phone</label>
                            <input
                                type="tel"
                                name="alternatePocPhone"
                                value={profile.alternatePocPhone || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Banking Information */}
                <div className="glass p-6 md:p-8 rounded-2xl border border-white/10">
                    <h2 className="text-lg font-bold text-[var(--color-gold)] mb-6 flex items-center gap-2">
                        <Banknote className="w-5 h-5" />
                        Payout Banking Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Bank Name</label>
                            <input
                                type="text"
                                name="bankName"
                                value={profile.bankName || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Account Name</label>
                            <input
                                type="text"
                                name="accountName"
                                value={profile.accountName || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Account Number / IBAN</label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={profile.accountNumber || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">SWIFT Code</label>
                            <input
                                type="text"
                                name="swift"
                                value={profile.swift || ""}
                                onChange={handleChange}
                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--color-gold)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-[var(--color-gold)] hover:bg-yellow-600 text-[var(--color-navy-dark)] font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
