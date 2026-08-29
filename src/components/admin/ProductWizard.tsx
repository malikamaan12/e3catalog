"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
    CheckCircle2, 
    AlertCircle, 
    ArrowLeft, 
    ArrowRight, 
    Save, 
    Upload, 
    Trash2, 
    Eye, 
    Sparkles, 
    Layers, 
    DollarSign, 
    Sliders, 
    FileText, 
    Package, 
    Globe, 
    ShieldCheck, 
    HelpCircle,
    Plus,
    X,
    Loader2
} from "lucide-react";
import { CloudImageUpload } from "@/components/CloudImageUpload";
import { USER_ROLES, PRODUCT_STATUS } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface Vendor {
    id: string;
    companyName: string;
}

interface MediaItem {
    id?: string;
    type: "image" | "video" | "model3d";
    url: string;
    thumbnailUrl?: string | null;
    alt?: string;
    sortOrder?: number;
}

interface CertificateItem {
    certName: string;
    certNumber: string;
    issuingBody: string;
    issueDate: string;
    expiryDate: string;
}

interface DocumentItem {
    id?: string;
    name: string;
    url: string;
    type: string;
    size?: number;
}

interface ProductWizardProps {
    initialData?: any;
    categories: Category[];
    vendors?: Vendor[];
    currentUserRole: string;
    isEditing?: boolean;
    onSuccessRedirect?: string;
}

const STEPS = [
    { id: 1, label: "Identity & Basic Info", icon: Layers },
    { id: 2, label: "Rental Pricing", icon: DollarSign },
    { id: 3, label: "Technical Specs", icon: Sliders },
    { id: 4, label: "Media & Documents", icon: FileText },
    { id: 5, label: "Inventory Setup", icon: Package },
    { id: 6, label: "SEO & Storefront", icon: Globe },
    { id: 7, label: "Review & Publish", icon: ShieldCheck },
];

export default function ProductWizard({
    initialData,
    categories = [],
    vendors = [],
    currentUserRole,
    isEditing = false,
    onSuccessRedirect,
}: ProductWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, startSaving] = useTransition();
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

    const isAdmin = currentUserRole === USER_ROLES.SUPER_ADMIN || currentUserRole === USER_ROLES.ADMIN;
    const storageDraftKey = `e3_product_draft_${currentUserRole}_${initialData?.id || "new"}`;

    // Form State
    const [form, setForm] = useState({
        id: initialData?.id || "",
        name: initialData?.name || "",
        slug: initialData?.slug || "",
        itemCode: initialData?.itemCode || "",
        categoryId: initialData?.categoryId || "",
        vendorId: initialData?.vendorId || "",
        brand: initialData?.brand || "",
        model: initialData?.model || "",
        shortDescription: initialData?.shortDescription || "",
        description: initialData?.description || "",
        featured: initialData?.featured || false,
        isPublished: initialData?.isPublished || false,
        status: initialData?.status || PRODUCT_STATUS.DRAFT,

        // Pricing
        pricePerDay: initialData?.pricePerDay !== undefined ? String(initialData.pricePerDay) : "",
        pricePerHour: initialData?.pricePerHour ? String(initialData.pricePerHour) : "",
        unit: initialData?.unit || "unit",
        minOrderQty: initialData?.minOrderQty || 1,
        showPrice: initialData?.showPrice !== false,
        priceType: initialData?.priceType || "daily",
        replacementValue: initialData?.replacementValue ? String(initialData.replacementValue) : "",
        setupFee: initialData?.setupFee ? String(initialData.setupFee) : "0",
        packagingFee: initialData?.packagingFee ? String(initialData.packagingFee) : "0",
        handlingFee: initialData?.handlingFee ? String(initialData.handlingFee) : "0",

        // Specs & Buffers
        dimensions: initialData?.dimensions || "",
        weight: initialData?.weight || "",
        powerRequirements: initialData?.powerRequirements || "",
        materials: initialData?.materials || "",
        manpower: initialData?.manpower || "",
        tools: initialData?.tools || "",
        installTime: initialData?.installTime || 0,
        dismantleTime: initialData?.dismantleTime || 0,
        cleaningTime: initialData?.cleaningTime || 0,
        requiresLicense: initialData?.requiresLicense || false,
        requiresApproval: initialData?.requiresApproval || false,

        // Inventory
        totalUnits: initialData?.totalUnits || (initialData?.inventoryUnits?.length || 1),
        condition: initialData?.condition || "excellent",
        warehouseLocation: initialData?.warehouseLocation || "Main Logistics Hub",

        // Media
        thumbnailUrl: initialData?.thumbnailUrl || "",
        media: (initialData?.media || []) as MediaItem[],
        documents: (initialData?.documents || []) as DocumentItem[],
        certificates: (initialData?.safetyCertificates || []) as CertificateItem[],

        // SEO
        metaTitle: initialData?.metaTitle || "",
        metaDescription: initialData?.metaDescription || "",
        keywords: initialData?.keywords || "",
        adminNotes: initialData?.adminNotes || "",
    });

    // Restore draft from localStorage if not editing existing
    useEffect(() => {
        if (!isEditing) {
            try {
                const saved = localStorage.getItem(storageDraftKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setForm(prev => ({ ...prev, ...parsed }));
                    setLastSavedTime("Restored from browser session");
                }
            } catch (e) {}
        }
    }, [isEditing, storageDraftKey]);

    // Autosave draft to localStorage
    useEffect(() => {
        if (!isEditing && form.name) {
            const handler = setTimeout(() => {
                try {
                    localStorage.setItem(storageDraftKey, JSON.stringify(form));
                    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                } catch (e) {}
            }, 1000);
            return () => clearTimeout(handler);
        }
    }, [form, isEditing, storageDraftKey]);

    // Auto-generate slug and SKU from Name if creating new
    const handleNameChange = (name: string) => {
        setForm(prev => {
            const updates: any = { name };
            if (!isEditing && !prev.slug) {
                updates.slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            }
            if (!isEditing && !prev.itemCode && name.length >= 3) {
                updates.itemCode = `E3-${name.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
            }
            if (!prev.metaTitle) {
                updates.metaTitle = `${name} Rental | E3 Rentals Qatar`;
            }
            return { ...prev, ...updates };
        });
    };

    // Media Handlers
    const handleAddMediaUrl = (url: string, type: "image" | "video" | "model3d" = "image") => {
        if (!url) return;
        setForm(prev => {
            const newMedia = [...prev.media, { url, type, sortOrder: prev.media.length }];
            return {
                ...prev,
                thumbnailUrl: prev.thumbnailUrl || (type === "image" ? url : prev.thumbnailUrl),
                media: newMedia,
            };
        });
    };

    const handleRemoveMedia = (index: number) => {
        setForm(prev => {
            const nextMedia = prev.media.filter((_, i) => i !== index);
            const nextThumb = prev.thumbnailUrl === prev.media[index]?.url
                ? (nextMedia.find(m => m.type === "image")?.url || "")
                : prev.thumbnailUrl;
            return { ...prev, media: nextMedia, thumbnailUrl: nextThumb };
        });
    };

    // Submission Handler (Draft, Review, Publish)
    const handleSave = (targetStatus?: string) => {
        if (!form.name.trim()) {
            toast.error("Product name is required");
            setCurrentStep(1);
            return;
        }
        if (!form.categoryId) {
            toast.error("Category is required");
            setCurrentStep(1);
            return;
        }

        const finalStatus = targetStatus || form.status || PRODUCT_STATUS.DRAFT;

        startSaving(async () => {
            try {
                const endpoint = isAdmin ? "/api/admin/products" : "/api/vendor/products";
                const method = isEditing ? (isAdmin ? "PUT" : "PATCH") : "POST";

                const payload = {
                    ...form,
                    status: finalStatus,
                    isPublished: finalStatus === PRODUCT_STATUS.PUBLISHED,
                };

                const res = await fetch(endpoint, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Failed to save product");
                }

                // Clear local draft
                try { localStorage.removeItem(storageDraftKey); } catch (e) {}

                toast.success(
                    finalStatus === PRODUCT_STATUS.PUBLISHED 
                        ? "Product published live to catalog!"
                        : finalStatus === PRODUCT_STATUS.PENDING_REVIEW
                        ? "Product submitted for review!"
                        : "Draft saved successfully!"
                );

                const redirectUrl = onSuccessRedirect || (isAdmin ? "/admin/products" : "/dashboard/products");
                router.push(redirectUrl);
                router.refresh();
            } catch (err: any) {
                console.error("Save error:", err);
                toast.error(err.message || "Failed to save");
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#070B14] text-white pb-24">
            {/* ── Top Sticky Header & Progress Bar ── */}
            <div className="sticky top-0 z-40 bg-[#0A0F1C]/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()} 
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gold">
                                {isEditing ? "Editing Asset" : "New Fleet Asset"}
                            </span>
                            {lastSavedTime && (
                                <span className="text-[9px] text-slate-500 font-bold">
                                    • Autosaved {lastSavedTime}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight truncate max-w-md">
                            {form.name || "Untitled Product"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => handleSave(PRODUCT_STATUS.DRAFT)}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all flex items-center gap-2"
                    >
                        <Save className="w-3.5 h-3.5 text-gold" />
                        Save Draft
                    </button>

                    {isAdmin ? (
                        <button 
                            type="button"
                            onClick={() => handleSave(PRODUCT_STATUS.PUBLISHED)}
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Publish Live
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={() => handleSave(PRODUCT_STATUS.PENDING_REVIEW)}
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Submit for Review
                        </button>
                    )}
                </div>
            </div>

            {/* ── Steps Navigation Bar ── */}
            <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {STEPS.map((s) => {
                        const Icon = s.icon;
                        const isCurrent = currentStep === s.id;
                        const isCompleted = currentStep > s.id;
                        return (
                            <button 
                                key={s.id}
                                onClick={() => setCurrentStep(s.id)}
                                className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${
                                    isCurrent 
                                        ? "bg-gold/10 border-gold/40 text-gold shadow-lg shadow-gold/5" 
                                        : isCompleted 
                                        ? "bg-white/[0.02] border-white/10 text-white hover:bg-white/5" 
                                        : "bg-white/[0.01] border-white/5 text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <Icon className="w-4 h-4" />
                                    <span className="text-[9px] font-black opacity-60">0{s.id}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider line-clamp-1">
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Main Wizard Container ── */}
            <div className="max-w-4xl mx-auto px-6 pt-6">
                <div className="glass-dark rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl relative">
                    
                    {/* STEP 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    Product Identity & Classification
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Define asset name, category classification, brand, and unique catalog slug.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                                        Asset Name <span className="text-red-400">*</span>
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="e.g. L-Acoustics K2 Line Array Module"
                                        value={form.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-gold outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Category *</label>
                                        <select 
                                            value={form.categoryId}
                                            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        >
                                            <option value="" className="bg-[#0e1424]">Select Category...</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id} className="bg-[#0e1424]">{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {isAdmin && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Assign Vendor</label>
                                            <select 
                                                value={form.vendorId}
                                                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                            >
                                                <option value="" className="bg-[#0e1424]">E3 Platform Fleet</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id} className="bg-[#0e1424]">{v.companyName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">SKU / Item Code</label>
                                        <input 
                                            type="text"
                                            value={form.itemCode}
                                            onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                                            placeholder="e.g. AUD-LAC-001"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Brand / Manufacturer</label>
                                        <input 
                                            type="text"
                                            value={form.brand}
                                            onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                            placeholder="e.g. L-Acoustics"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Model / Series</label>
                                        <input 
                                            type="text"
                                            value={form.model}
                                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                                            placeholder="e.g. K2"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Short Summary (Catalog Badge)</label>
                                    <input 
                                        type="text"
                                        value={form.shortDescription}
                                        onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                                        placeholder="One-line overview for catalog cards..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Technical Description</label>
                                    <textarea 
                                        rows={4}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Comprehensive product details, audio/visual capabilities, rigging requirements..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-6 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={form.featured}
                                            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                                            className="w-4 h-4 accent-gold rounded cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-300">Featured Showcase Asset</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Rental Pricing */}
                    {currentStep === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    Rental Pricing & Commercial Terms
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Define daily rental rates, packaging fees, setup fees, and price visibility.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                                            Daily Rate (QAR) <span className="text-red-400">*</span>
                                        </label>
                                        <input 
                                            type="number" min="0" step="any"
                                            required
                                            value={form.pricePerDay}
                                            onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Hourly Rate (Optional QAR)</label>
                                        <input 
                                            type="number" min="0" step="any"
                                            value={form.pricePerHour}
                                            onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })}
                                            placeholder="Leave blank if daily only"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Unit Type</label>
                                        <select 
                                            value={form.unit}
                                            onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        >
                                            <option value="unit" className="bg-[#0e1424]">Unit / Piece</option>
                                            <option value="set" className="bg-[#0e1424]">Set / Pair</option>
                                            <option value="sqm" className="bg-[#0e1424]">Square Meter (SQM)</option>
                                            <option value="rm" className="bg-[#0e1424]">Running Meter (RM)</option>
                                            <option value="kg" className="bg-[#0e1424]">Kilogram (KG)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Min Order Quantity</label>
                                        <input 
                                            type="number" min="1"
                                            value={form.minOrderQty}
                                            onChange={(e) => setForm({ ...form, minOrderQty: Math.max(1, Number(e.target.value)) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Replacement Value (QAR)</label>
                                        <input 
                                            type="number" min="0"
                                            value={form.replacementValue}
                                            onChange={(e) => setForm({ ...form, replacementValue: e.target.value })}
                                            placeholder="Security benchmark"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gold">Custom Handling & Setup Add-ons</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Packaging Fee / Unit</label>
                                            <input 
                                                type="number" min="0"
                                                value={form.packagingFee}
                                                onChange={(e) => setForm({ ...form, packagingFee: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Handling Fee / Unit</label>
                                            <input 
                                                type="number" min="0"
                                                value={form.handlingFee}
                                                onChange={(e) => setForm({ ...form, handlingFee: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Setup Fee / Unit</label>
                                            <input 
                                                type="number" min="0"
                                                value={form.setupFee}
                                                onChange={(e) => setForm({ ...form, setupFee: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={form.showPrice}
                                            onChange={(e) => setForm({ ...form, showPrice: e.target.checked })}
                                            className="w-4 h-4 accent-gold rounded cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-300">Display price publicly on catalog (Uncheck for Price On Request)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Technical Specs & Buffers */}
                    {currentStep === 3 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    Technical Specifications & Logistics
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Provide dimensions, power load, buffer turnarounds, and rigging prerequisites.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Dimensions (L × W × H)</label>
                                        <input 
                                            type="text"
                                            value={form.dimensions}
                                            onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                                            placeholder="e.g. 1344 × 354 × 400 mm"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Weight</label>
                                        <input 
                                            type="text"
                                            value={form.weight}
                                            onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                            placeholder="e.g. 56 kg / 123 lbs"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Power Requirements</label>
                                        <input 
                                            type="text"
                                            value={form.powerRequirements}
                                            onChange={(e) => setForm({ ...form, powerRequirements: e.target.value })}
                                            placeholder="e.g. 230V / 16A 3-Phase CEE"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Materials / Construction</label>
                                        <input 
                                            type="text"
                                            value={form.materials}
                                            onChange={(e) => setForm({ ...form, materials: e.target.value })}
                                            placeholder="e.g. Aircraft Aluminium / High-Density Birch"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gold">Operational Buffer Times (Hours)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Installation Buffer (Hours)</label>
                                            <input 
                                                type="number" min="0"
                                                value={form.installTime}
                                                onChange={(e) => setForm({ ...form, installTime: Number(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Dismantling Buffer (Hours)</label>
                                            <input 
                                                type="number" min="0"
                                                value={form.dismantleTime}
                                                onChange={(e) => setForm({ ...form, dismantleTime: Number(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Cleaning Buffer (Hours)</label>
                                            <input 
                                                type="number" min="0"
                                                value={form.cleaningTime}
                                                onChange={(e) => setForm({ ...form, cleaningTime: Number(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={form.requiresLicense}
                                            onChange={(e) => setForm({ ...form, requiresLicense: e.target.checked })}
                                            className="w-4 h-4 accent-gold rounded cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-300">Requires Civil Defence / MOCI License</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Media & Documents */}
                    {currentStep === 4 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    Media Gallery & Safety Certificates
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Upload hero photographs, 3D assets, safety certificates, and user manuals.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Media Uploader */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-gold">Gallery Media (Images, 3D, Video)</label>
                                    <CloudImageUpload 
                                        onUploadComplete={(url) => handleAddMediaUrl(url, "image")}
                                        folder="catalog-products"
                                    />
                                    
                                    {/* Manual URL Input Fallback */}
                                    <div className="flex gap-2 pt-2">
                                        <input 
                                            type="url"
                                            id="manual-media-input"
                                            placeholder="Or enter direct CDN / Image / 3D Model URL..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-gold outline-none"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const input = e.currentTarget;
                                                    if (input.value) {
                                                        const is3d = input.value.endsWith('.glb') || input.value.endsWith('.gltf');
                                                        handleAddMediaUrl(input.value, is3d ? "model3d" : "image");
                                                        input.value = "";
                                                    }
                                                }
                                            }}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById("manual-media-input") as HTMLInputElement;
                                                if (input && input.value) {
                                                    const is3d = input.value.endsWith('.glb') || input.value.endsWith('.gltf');
                                                    handleAddMediaUrl(input.value, is3d ? "model3d" : "image");
                                                    input.value = "";
                                                }
                                            }}
                                            className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
                                        >
                                            Add URL
                                        </button>
                                    </div>
                                </div>

                                {/* Media Thumbnails Grid */}
                                {form.media.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                                        {form.media.map((m, idx) => (
                                            <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-navy-dark">
                                                {m.type === "image" ? (
                                                    <Image src={m.url} alt={m.alt || "Asset"} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                                        <span className="text-2xl mb-1">{m.type === "model3d" ? "🎲" : "🎬"}</span>
                                                        <span className="text-[10px] font-black uppercase text-gold truncate max-w-full">{m.type}</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setForm({ ...form, thumbnailUrl: m.url })}
                                                        className={`p-2 rounded-xl text-xs font-bold ${form.thumbnailUrl === m.url ? 'bg-gold text-navy' : 'bg-white/20 text-white'}`}
                                                        title="Set as Hero Thumbnail"
                                                    >
                                                        ★
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveMedia(idx)}
                                                        className="p-2 rounded-xl bg-red-500/80 text-white hover:bg-red-600"
                                                        title="Delete Media"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Inventory Setup */}
                    {currentStep === 5 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    Authoritative Physical Inventory
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Configure physical units count, warehouse home location, and automated asset-tag barcodes.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                                            Total Physical Units in Fleet <span className="text-red-400">*</span>
                                        </label>
                                        <input 
                                            type="number" min="0"
                                            required
                                            value={form.totalUnits}
                                            onChange={(e) => setForm({ ...form, totalUnits: Math.max(0, Number(e.target.value)) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-gold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Initial Condition Status</label>
                                        <select 
                                            value={form.condition}
                                            onChange={(e) => setForm({ ...form, condition: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-gold outline-none"
                                        >
                                            <option value="excellent" className="bg-[#0e1424]">Excellent (Pristine)</option>
                                            <option value="good" className="bg-[#0e1424]">Good (Minor Wear)</option>
                                            <option value="maintenance_required" className="bg-[#0e1424]">Maintenance Required (Non-Rentable)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Primary Warehouse Location</label>
                                    <input 
                                        type="text"
                                        value={form.warehouseLocation}
                                        onChange={(e) => setForm({ ...form, warehouseLocation: e.target.value })}
                                        placeholder="e.g. Industrial City Hub - Bay 4"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                    />
                                </div>

                                {/* Asset Tag Pattern Preview */}
                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gold">Generated Digital Passport Asset Tags Preview</h4>
                                    <p className="text-xs text-slate-400">
                                        Saving this product will transactionally generate <strong>{form.totalUnits} physical serialized asset tags</strong> in the database:
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {Array.from({ length: Math.min(5, form.totalUnits) }).map((_, i) => (
                                            <span key={i} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-gold">
                                                E3-{(form.itemCode || "ASSET").slice(0, 6).toUpperCase()}-{String(i + 1).padStart(3, '0')}
                                            </span>
                                        ))}
                                        {form.totalUnits > 5 && (
                                            <span className="px-3 py-1 text-[10px] text-slate-500 font-bold">
                                                + {form.totalUnits - 5} more units
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: SEO & Discovery */}
                    {currentStep === 6 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    SEO & Search Discovery
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Optimize public search keywords and customize social sharing metadata.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Meta Title</label>
                                    <input 
                                        type="text"
                                        value={form.metaTitle}
                                        onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                                        placeholder="e.g. Rent L-Acoustics K2 Sound System | Doha, Qatar"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Meta Description</label>
                                    <textarea 
                                        rows={3}
                                        value={form.metaDescription}
                                        onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                                        placeholder="Appears on Google search results and OpenGraph social shares..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Search Keywords (Comma Separated)</label>
                                    <input 
                                        type="text"
                                        value={form.keywords}
                                        onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                                        placeholder="line array, speakers, sound system, concert audio, event rental"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-gold outline-none"
                                    />
                                </div>

                                {/* Google SERP Preview Card */}
                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Google SERP Snippet Preview</span>
                                    <div className="font-sans text-sm">
                                        <div className="text-[#8ab4f8] hover:underline cursor-pointer text-base font-medium truncate">
                                            {form.metaTitle || form.name || "E3 Rentals Equipment"}
                                        </div>
                                        <div className="text-[#34a853] text-xs mt-0.5">
                                            https://e3rentals.qa/catalog/{form.slug || "asset"}
                                        </div>
                                        <div className="text-[#bdc1c6] text-xs mt-1 leading-relaxed line-clamp-2">
                                            {form.metaDescription || form.shortDescription || "Rent premium event production and logistics equipment in Qatar with instant availability."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 7: Review & Publish */}
                    {currentStep === 7 && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                                    Pre-Flight Review & Quality Audit
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mt-1">
                                    Review all parameters before persisting changes to the catalog and inventory engine.
                                </p>
                            </div>

                            {/* Verification Summary Card */}
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-navy-dark overflow-hidden relative border border-white/10 shrink-0">
                                            {form.thumbnailUrl ? (
                                                <Image src={form.thumbnailUrl} alt={form.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold">No Img</div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{form.name || "Untitled Asset"}</h3>
                                            <span className="text-xs text-gold font-bold">
                                                {form.pricePerDay ? `${Number(form.pricePerDay).toLocaleString()} QAR / Day` : "Price On Request"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Allocatable Fleet</span>
                                        <span className="text-xl font-black text-white">{form.totalUnits} Units</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Category</span>
                                        <span className="text-white font-bold">{categories.find(c => c.id === form.categoryId)?.name || "Unassigned"}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase block">SKU Code</span>
                                        <span className="text-white font-bold">{form.itemCode || "Auto"}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Buffer Time</span>
                                        <span className="text-white font-bold">+{form.installTime}h / +{form.dismantleTime}h</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Media Count</span>
                                        <span className="text-white font-bold">{form.media.length} items</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => handleSave(PRODUCT_STATUS.DRAFT)}
                                    disabled={isSaving}
                                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Save As Draft
                                </button>
                                {isAdmin ? (
                                    <button 
                                        type="button"
                                        onClick={() => handleSave(PRODUCT_STATUS.PUBLISHED)}
                                        disabled={isSaving}
                                        className="flex-[2] py-4 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Confirm & Publish to Catalog
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => handleSave(PRODUCT_STATUS.PENDING_REVIEW)}
                                        disabled={isSaving}
                                        className="flex-[2] py-4 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Submit for Marketplace Approval
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Bottom Step Navigation Buttons ── */}
                    <div className="flex items-center justify-between pt-10 mt-10 border-t border-white/5">
                        {currentStep > 1 ? (
                            <button 
                                type="button"
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Previous Step
                            </button>
                        ) : <div />}

                        {currentStep < 7 && (
                            <button 
                                type="button"
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                className="px-8 py-3 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/10 flex items-center gap-2"
                            >
                                Continue <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
