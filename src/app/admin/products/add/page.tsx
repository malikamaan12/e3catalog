"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Zap } from "lucide-react";

// Category slug → SKU prefix for auto-generation
const CATEGORY_SKU_PREFIX: Record<string, string> = {
    "staging": "STG", "exhibitions": "EXH", "structures": "STR",
    "rigging-truss": "RIG", "lighting": "LGT", "audio": "AUD",
    "led-displays": "LED", "power-electrical": "PWR", "climate-utilities": "CLM",
    "furniture": "FRN", "decor": "DCR", "branding": "BRN",
    "wayfinding": "WFD", "crowd-control": "CRD", "entertainment": "ENT",
    "sports-equipment": "SPT", "event-technology": "EVT",
    "logistics-equipment": "LOG", "safety-equipment": "SFT", "manpower": "MNP",
};

interface Category {
    id: string;
    name: string;
    slug: string;
    active: boolean;
}

interface UploadedFile {
    id: string;
    type: string;
    url: string;
    originalName: string;
    size: number;
}

const CONDITION_OPTIONS = [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "maintenance_required", label: "Maintenance Required" },
];

const UNIT_OPTIONS = [
    { value: "unit", label: "Unit" },
    { value: "set", label: "Set" },
    { value: "kg", label: "kg" },
    { value: "sqm", label: "sqm" },
    { value: "rm", label: "rm" },
    { value: "ltr", label: "ltr" },
];

const TYPE_ICONS: Record<string, string> = { image: "🖼️", video: "🎬", model3d: "🎲" };
const TYPE_LABELS: Record<string, string> = { image: "Image", video: "Video", model3d: "3D Model" };

function formatFileSize(bytes: number) {
    if (bytes === 0) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddProductPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Media uploads
    const [mediaFiles, setMediaFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Document uploads
    const [documentFiles, setDocumentFiles] = useState<UploadedFile[]>([]);
    const [documentUploading, setDocumentUploading] = useState(false);
    const [documentUploadProgress, setDocumentUploadProgress] = useState("");
    const documentInputRef = useRef<HTMLInputElement>(null);

    // Certificates
    const [certificates, setCertificates] = useState<{
        certName: string; certNumber: string; issuingBody: string; issueDate: string; expiryDate: string;
    }[]>([]);
    const [certForm, setCertForm] = useState({ certName: "", certNumber: "", issuingBody: "", issueDate: "", expiryDate: "" });
    const [showCertForm, setShowCertForm] = useState(false);

    const addCert = () => {
        if (!certForm.certName || !certForm.issueDate || !certForm.expiryDate) return;
        setCertificates(prev => [...prev, { ...certForm }]);
        setCertForm({ certName: "", certNumber: "", issuingBody: "", issueDate: "", expiryDate: "" });
        setShowCertForm(false);
    };
    const removeCert = (idx: number) => setCertificates(prev => prev.filter((_, i) => i !== idx));

    // Form state
    const [form, setForm] = useState({
        itemCode: "",
        name: "",
        categoryId: "",
        shortDescription: "",
        description: "",
        dimensions: "",
        weight: "",
        powerRequirements: "",
        materials: "",
        showPrice: true,
        priceType: "daily",
        priceRangeMax: "",
        pricePerDay: "",
        pricePerHour: "",
        packagingFee: "0",
        handlingFee: "0",
        setupFee: "0",
        totalUnits: "1",
        minOrderQty: "1",
        condition: "excellent",
        installTime: "0",
        dismantleTime: "0",
        cleaningTime: "0",
        manpower: "",
        tools: "",
        thumbnailUrl: "",
        featured: false,
        requiresLicense: false,
        requiresApproval: false,
        show3d: true,
        unit: "unit",
        showVideo: true,
        installGuideUrl: "",
        dismantleGuideUrl: "",
        adminNotes: "",
    });

    // Rich Installation/Dismantling Guides
    const [installGuide, setInstallGuide] = useState({
        content: "",
        requiredManpower: "",
        estimatedTime: "",
        toolsRequired: ""
    });
    const [dismantleGuide, setDismantleGuide] = useState({
        content: "",
        requiredManpower: "",
        estimatedTime: "",
        toolsRequired: ""
    });

    useEffect(() => {
        fetch("/api/categories")
            .then((r) => r.json())
            .then((data) => {
                // API returns { tree, flat } — use flat list for the select dropdown
                const list = Array.isArray(data) ? data : (data.flat || []);
                setCategories(list.filter((c: Category) => c.active !== false));
            })
            .catch(console.error);
    }, []);

    const updateField = (field: string, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError("");
    };

    const autoGenerateItemCode = useCallback(() => {
        const cat = categories.find(c => c.id === form.categoryId);
        const prefix = (cat ? CATEGORY_SKU_PREFIX[cat.slug] : null) || "ITM";
        const suffix = String(Date.now()).slice(-4);
        updateField("itemCode", `${prefix}-${suffix}`);
    }, [form.categoryId, categories]);

    // ─── Media Upload ───
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`);

        try {
            const uploadedItems: UploadedFile[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileType = file.type || (file.name.endsWith(".glb") ? "model/gltf-binary" : file.name.endsWith(".gltf") ? "model/gltf+json" : "application/octet-stream");

                // 1. Get Presigned URL
                const res = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filename: file.name, contentType: fileType, folder: "products" })
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Upload failed with status ${res.status}`);
                }
                const data = await res.json();

                // 2. Upload to S3 directly
                const uploadRes = await fetch(data.url, {
                    method: "PUT",
                    headers: { "Content-Type": fileType },
                    body: file
                });

                if (!uploadRes.ok) throw new Error("Failed to upload to S3");

                let mappedType = "image";
                if (file.type.startsWith("video/")) mappedType = "video";
                if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) mappedType = "model3d";

                const item = {
                    id: data.key,
                    type: mappedType,
                    url: data.publicUrl,
                    originalName: file.name,
                    size: file.size
                };
                console.log("Uploaded Item:", item);
                uploadedItems.push(item);
            }

            setMediaFiles((prev) => [...prev, ...uploadedItems]);

            // Auto-set thumbnail to first uploaded image
            const firstImage = uploadedItems.find((f: UploadedFile) => f.type === "image");
            if (firstImage && !form.thumbnailUrl) {
                setForm((prev) => ({ ...prev, thumbnailUrl: firstImage.url }));
            }
        } catch (err) {
            console.error("Upload error:", err);
            setError("Upload failed — network or permissions error");
        }

        setUploading(false);
        setUploadProgress("");
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeMedia = (id: string) => {
        const removed = mediaFiles.find((f) => f.id === id);
        setMediaFiles((prev) => prev.filter((f) => f.id !== id));
        // Clear thumbnail if it was the removed file
        if (removed && form.thumbnailUrl === removed.url) {
            const nextImage = mediaFiles.find((f) => f.id !== id && f.type === "image");
            setForm((prev) => ({ ...prev, thumbnailUrl: nextImage?.url || "" }));
        }
    };

    const setAsThumbnail = (url: string) => {
        setForm((prev) => ({ ...prev, thumbnailUrl: url }));
    };

    // ─── Document Upload ───
    const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setDocumentUploading(true);
        setDocumentUploadProgress(`Uploading ${files.length} document${files.length > 1 ? "s" : ""}...`);

        try {
            const uploadedItems: UploadedFile[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : file.name.endsWith(".doc") || file.name.endsWith(".docx") ? "application/msword" : "application/octet-stream");

                const res = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filename: file.name, contentType: fileType, folder: "documents" })
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Upload failed with status ${res.status}`);
                }
                const data = await res.json();

                const uploadRes = await fetch(data.url, {
                    method: "PUT",
                    headers: { "Content-Type": fileType },
                    body: file
                });

                if (!uploadRes.ok) throw new Error("Failed to upload document to storage");

                uploadedItems.push({
                    id: data.key,
                    type: "document",
                    url: data.publicUrl,
                    originalName: file.name,
                    size: file.size
                });
            }

            setDocumentFiles((prev) => [...prev, ...uploadedItems]);
        } catch (err) {
            console.error(err);
            setError("Document upload failed");
        }

        setDocumentUploading(false);
        setDocumentUploadProgress("");
        if (documentInputRef.current) documentInputRef.current.value = "";
    };

    const removeDocument = (id: string) => {
        setDocumentFiles((prev) => prev.filter((f) => f.id !== id));
    };

    // ─── Submit ───
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim()) { setError("Product name is required"); return; }
        if (!form.categoryId) { setError("Please select a category"); return; }
        if (!form.pricePerDay || Number(form.pricePerDay) <= 0) { setError("Price per day must be greater than 0"); return; }
        if (!form.totalUnits || Number(form.totalUnits) < 1) { setError("At least 1 unit is required"); return; }

        setSaving(true);

        try {
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    pricePerDay: Number(form.pricePerDay),
                    pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : null,
                    packagingFee: Number(form.packagingFee),
                    handlingFee: Number(form.handlingFee),
                    setupFee: Number(form.setupFee),
                    totalUnits: Number(form.totalUnits),
                    installTime: Number(form.installTime),
                    dismantleTime: Number(form.dismantleTime),
                    cleaningTime: Number(form.cleaningTime),
                    media: mediaFiles.map((f, i) => ({
                        id: f.id,
                        type: f.type,
                        url: f.url,
                        alt: f.originalName,
                        sortOrder: i,
                    })),
                    documents: documentFiles.map(f => ({
                        id: f.id,
                        type: f.type,
                        url: f.url,
                        originalName: f.originalName,
                        size: f.size
                    })),
                    show3d: form.show3d,
                    showVideo: form.showVideo,
                    minOrderQty: Number(form.minOrderQty) || 1,
                    certificates,
                    installGuideUrl: form.installGuideUrl || null,
                    dismantleGuideUrl: form.dismantleGuideUrl || null,
                    installationGuides: [
                        {
                            guideType: "install",
                            content: installGuide.content,
                            requiredManpower: installGuide.requiredManpower ? Number(installGuide.requiredManpower) : null,
                            estimatedTime: installGuide.estimatedTime || null,
                            toolsRequired: installGuide.toolsRequired || null
                        },
                        {
                            guideType: "dismantle",
                            content: dismantleGuide.content,
                            requiredManpower: dismantleGuide.requiredManpower ? Number(dismantleGuide.requiredManpower) : null,
                            estimatedTime: dismantleGuide.estimatedTime || null,
                            toolsRequired: dismantleGuide.toolsRequired || null
                        }
                    ].filter(g => g.content.trim() !== ""),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create product");
            }

            setSuccess(true);
            setTimeout(() => router.push("/admin/products"), 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/products"
                    className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-slate)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Add New Product
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-0.5">Add equipment to your rental fleet</p>
                </div>
            </div>

            {/* Success */}
            {success && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-[var(--color-success)] flex items-center gap-3">
                    <div className="dot-available" />
                    <span className="text-sm font-medium">Product created successfully! Redirecting...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[var(--color-danger)] flex items-center gap-3">
                    <div className="dot-unavailable" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* ─── BASIC INFO ─── */}
                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5">
                        BASIC INFORMATION
                    </h2>
                    <div className="space-y-4">
                        {/* Item Code / SKU */}
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">
                                Item Code / SKU
                                <span className="ml-2 text-[var(--color-slate)] font-normal">(unique identifier, e.g. LGT-001)</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.itemCode}
                                    onChange={(e) => updateField("itemCode", e.target.value.toUpperCase())}
                                    placeholder="e.g. LGT-001"
                                    className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm font-mono tracking-wider" />
                                <button
                                    type="button"
                                    onClick={autoGenerateItemCode}
                                    title="Auto-generate from selected category"
                                    className="px-4 py-3 rounded-lg bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-all flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                                    <Zap className="w-4 h-4" /> Auto
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Product Name *</label>
                            <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)}
                                placeholder="e.g. Heavy-Duty Stage Platform 4x8"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Category *</label>
                                <div className="relative group">
                                    <select value={form.categoryId} onChange={(e) => updateField("categoryId", e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm appearance-none cursor-pointer pr-10">
                                        <option value="" className="bg-[var(--color-navy-lighter)] text-white">Select a category...</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id} className="bg-[var(--color-navy-lighter)] text-white">{cat.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                            <Link href="/admin/categories" className="text-xs text-[var(--color-gold)] hover:underline py-3 whitespace-nowrap">
                                Manage Categories →
                            </Link>
                        </div>

                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Short Description</label>
                            <input type="text" value={form.shortDescription} onChange={(e) => updateField("shortDescription", e.target.value)}
                                placeholder="One-line summary for catalog cards"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>

                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Full Description</label>
                            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)}
                                placeholder="Detailed product description for the detail page..."
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm resize-none" />
                        </div>

                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateField("featured", !form.featured)}
                                className={`w-11 h-6 rounded-full transition-all relative ${form.featured ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.featured ? "left-6" : "left-1"}`} />
                            </button>
                            <span className="text-sm text-[var(--color-slate)]">Featured product (shown on homepage)</span>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/5">
                            <label className="text-xs text-[var(--color-gold)] mb-1.5 block font-bold uppercase tracking-widest">Internal Admin Notes (Private)</label>
                            <textarea value={form.adminNotes} onChange={(e) => updateField("adminNotes", e.target.value)}
                                placeholder="Add notes only visible to staff (e.g. storage location, vendor info, special handling)..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)]/50 focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm resize-none" />
                            <p className="text-[10px] text-[var(--color-slate)] mt-1.5 italic">This field is only visible to administrators and is never shown to clients.</p>
                        </div>
                    </div>
                </section>

                {/* ─── MEDIA UPLOAD ─── */}
                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-2">
                        MEDIA FILES
                    </h2>
                    <p className="text-xs text-[var(--color-slate)] mb-5">
                        Upload product images, videos, and 3D models (GLB/GLTF). First image auto-sets as thumbnail.
                    </p>

                    {/* Upload Zone */}
                    <div
                        className="border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-8 text-center hover:border-[var(--color-gold)] transition-colors cursor-pointer relative"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,.glb,.gltf"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        {uploading ? (
                            <div>
                                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-[var(--color-gold)]">{uploadProgress}</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-center gap-3 text-3xl mb-3">
                                    <span>🖼️</span><span>🎬</span><span>🎲</span>
                                </div>
                                <p className="text-sm font-medium text-[var(--color-warm-white)]">
                                    Click to upload or drag & drop
                                </p>
                                <p className="text-xs text-[var(--color-slate)] mt-1">
                                    Images (JPG, PNG, WebP · 10MB) · Videos (MP4, WebM · 200MB) · 3D Models (GLB, GLTF · 50MB)
                                </p>
                            </>
                        )}
                    </div>

                    {/* Uploaded Files Grid */}
                    {mediaFiles.length > 0 && (
                        <div className="mt-5 space-y-3">
                            <div className="text-xs text-[var(--color-slate)] font-medium">
                                {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""} uploaded
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {mediaFiles.map((file) => (
                                    <div key={file.id} className="rounded-lg bg-[var(--color-navy-lighter)] overflow-hidden group">
                                        {/* Preview */}
                                        {file.type === "image" ? (
                                            <div className="h-32 relative bg-[var(--color-navy)] overflow-hidden">
                                                <img
                                                    src={file.url}
                                                    alt={file.originalName}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.onerror = null; // Prevent infinite loop
                                                        target.src = "https://placehold.co/400x300/1a1f2e/gold?text=Load+Error";
                                                        console.error("Layout thumbnail failed:", file.url);
                                                    }}
                                                />
                                                {form.thumbnailUrl === file.url && (
                                                    <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold shadow-lg">
                                                        THUMBNAIL
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-32 flex items-center justify-center bg-[var(--color-navy)] group-hover:bg-[var(--color-navy-lightest)] transition-colors">
                                                <span className="text-4xl filter drop-shadow-md">{TYPE_ICONS[file.type]}</span>
                                            </div>
                                        )}
                                        {/* Info */}
                                        <div className="p-3">
                                            <p className="text-xs text-[var(--color-warm-white)] font-medium truncate">{file.originalName}</p>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-navy)] text-[var(--color-slate)]">
                                                        {TYPE_LABELS[file.type]}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--color-slate)]">{formatFileSize(file.size)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {file.type === "image" && form.thumbnailUrl !== file.url && (
                                                        <button type="button" onClick={() => setAsThumbnail(file.url)}
                                                            className="text-[10px] text-[var(--color-gold)] hover:underline">
                                                            Set thumbnail
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => removeMedia(file.id)}
                                                        className="text-[10px] text-[var(--color-danger)] hover:underline ml-2">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* ─── MEDIA VISIBILITY ─── */}
                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-2">
                        MEDIA VISIBILITY
                    </h2>
                    <p className="text-xs text-[var(--color-slate)] mb-5">
                        Control which media tabs are shown to clients on the product page.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateField("show3d", !form.show3d)}
                                className={`w-11 h-6 rounded-full transition-all relative ${form.show3d ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.show3d ? "left-6" : "left-1"}`} />
                            </button>
                            <div>
                                <span className="text-sm font-medium text-[var(--color-warm-white)] block">🎲 Show 3D Model Tab</span>
                                <span className="text-xs text-[var(--color-slate)]">Display the interactive 3D viewer to clients</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateField("showVideo", !form.showVideo)}
                                className={`w-11 h-6 rounded-full transition-all relative ${form.showVideo ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.showVideo ? "left-6" : "left-1"}`} />
                            </button>
                            <div>
                                <span className="text-sm font-medium text-[var(--color-warm-white)] block">🎬 Show Video Tab</span>
                                <span className="text-xs text-[var(--color-slate)]">Display the video player tab to clients</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5">
                        TECHNICAL SPECIFICATIONS
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Dimensions</label>
                            <input type="text" value={form.dimensions} onChange={(e) => updateField("dimensions", e.target.value)}
                                placeholder='e.g. 4ft × 8ft × 16-48in'
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Weight</label>
                            <input type="text" value={form.weight} onChange={(e) => updateField("weight", e.target.value)}
                                placeholder="e.g. 185 lbs per section"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Power Requirements</label>
                            <input type="text" value={form.powerRequirements} onChange={(e) => updateField("powerRequirements", e.target.value)}
                                placeholder="e.g. 800W, 100-240V AC"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Materials</label>
                            <input type="text" value={form.materials} onChange={(e) => updateField("materials", e.target.value)}
                                placeholder="e.g. Aircraft-grade 6061-T6 Aluminum"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                    </div>
                </section>

                {/* ─── PRICING & INVENTORY ─── */}
                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5">
                        PRICING & INVENTORY
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-[var(--color-border-subtle)]">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateField("showPrice", !form.showPrice)}
                                className={`w-11 h-6 rounded-full transition-all relative ${form.showPrice ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.showPrice ? "left-6" : "left-1"}`} />
                            </button>
                            <div>
                                <span className="text-sm font-medium text-[var(--color-warm-white)] block">Show Public Pricing</span>
                                <span className="text-xs text-[var(--color-slate)]">If off, users will have to request a quote to see prices.</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Pricing Model Base Type</label>
                            <div className="relative group">
                                <select value={form.priceType} onChange={(e) => updateField("priceType", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm appearance-none cursor-pointer pr-10">
                                    <option value="daily" className="bg-[var(--color-navy-lighter)] text-white">Daily Rate (Per Unit / Per Day)</option>
                                    <option value="job" className="bg-[var(--color-navy-lighter)] text-white">Fixed Job Cost (One-time flat rate project)</option>
                                    <option value="custom" className="bg-[var(--color-navy-lighter)] text-white">Custom Rate (TBD / Request required)</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Base Price (QAR) *</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gold)] text-xs font-semibold">QAR</span>
                                <input type="number" step="0.01" min="0" value={form.pricePerDay} onChange={(e) => updateField("pricePerDay", e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-14 pr-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Max Price Range (Optional) (QAR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gold)] text-xs font-semibold">QAR</span>
                                <input type="number" step="0.01" min="0" value={form.priceRangeMax} onChange={(e) => updateField("priceRangeMax", e.target.value)}
                                    placeholder='Sets "Starting from X to Y"'
                                    className="w-full pl-14 pr-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Price Per Hour (QAR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gold)] text-xs font-semibold">QAR</span>
                                <input type="number" step="0.01" min="0" value={form.pricePerHour} onChange={(e) => updateField("pricePerHour", e.target.value)}
                                    placeholder="Optional"
                                    className="w-full pl-14 pr-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Total Units in Fleet *</label>
                                <input type="number" min="1" value={form.totalUnits} onChange={(e) => updateField("totalUnits", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Unit Type</label>
                                <div className="relative group">
                                    <select value={form.unit} onChange={(e) => updateField("unit", e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm appearance-none cursor-pointer pr-10">
                                        {UNIT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value} className="bg-[var(--color-navy-lighter)] text-white">{opt.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Minimum Order Quantity (MOQ)</label>
                            <input type="number" min="1" value={form.minOrderQty} onChange={(e) => updateField("minOrderQty", e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            <p className="text-[10px] text-[var(--color-slate)] mt-1">Minimum number of units a client must order. Shown on the product page.</p>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Condition</label>
                            <div className="relative group">
                                <select value={form.condition} onChange={(e) => updateField("condition", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm appearance-none cursor-pointer pr-10">
                                    {CONDITION_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value} className="bg-[var(--color-navy-lighter)] text-white">{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--color-border-subtle)]">
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Packaging Fee (QAR)</label>
                            <input type="number" min="0" value={form.packagingFee} onChange={(e) => updateField("packagingFee", e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Handling Fee (QAR)</label>
                            <input type="number" min="0" value={form.handlingFee} onChange={(e) => updateField("handlingFee", e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Setup Fee (QAR)</label>
                            <input type="number" min="0" value={form.setupFee} onChange={(e) => updateField("setupFee", e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                    </div>
                </section>

                {/* ─── COMPLIANCE & APPROVALS ─── */}
                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5">
                        SAFETY & COMPLIANCE
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateField("requiresLicense", !form.requiresLicense)}
                                className={`w-11 h-6 rounded-full transition-all relative ${form.requiresLicense ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.requiresLicense ? "left-6" : "left-1"}`} />
                            </button>
                            <div>
                                <span className="text-sm font-medium text-[var(--color-warm-white)] block">Requires License</span>
                                <span className="text-xs text-[var(--color-slate)]">Operator requires valid license</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateField("requiresApproval", !form.requiresApproval)}
                                className={`w-11 h-6 rounded-full transition-all relative ${form.requiresApproval ? "bg-[var(--color-gold)]" : "bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)]"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.requiresApproval ? "left-6" : "left-1"}`} />
                            </button>
                            <div>
                                <span className="text-sm font-medium text-[var(--color-warm-white)] block">Municipal Approval</span>
                                <span className="text-xs text-[var(--color-slate)]">Requires venue/government clearance</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Certificate / License Entry ── */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-xs font-bold text-[var(--color-warm-white)] uppercase tracking-widest">Certificates &amp; Licenses</h3>
                                <p className="text-[10px] text-[var(--color-slate)] mt-0.5">Add all applicable compliance certificates for this product.</p>
                            </div>
                            <button type="button" onClick={() => setShowCertForm(true)}
                                className="text-xs font-semibold text-[var(--color-gold)] border border-[var(--color-gold)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--color-gold)]/10 transition-colors">
                                + Add Certificate
                            </button>
                        </div>

                        {/* Cert list */}
                        {certificates.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {certificates.map((c, i) => (
                                    <div key={i} className="flex items-start justify-between p-4 rounded-xl bg-[var(--color-navy-lighter)] border border-[var(--color-gold)]/15">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--color-warm-white)] truncate">{c.certName}</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--color-slate)]">
                                                {c.certNumber && <span>Ref: <span className="font-mono text-[var(--color-warm-white)]">{c.certNumber}</span></span>}
                                                {c.issuingBody && <span>By: {c.issuingBody}</span>}
                                                <span>Issued: {c.issueDate}</span>
                                                <span className={`font-semibold ${new Date(c.expiryDate) < new Date() ? 'text-red-400' : 'text-emerald-400'}`}>Expires: {c.expiryDate}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeCert(i)}
                                            className="text-[10px] text-red-400/70 hover:text-red-400 ml-4 shrink-0 transition-colors">
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cert entry form */}
                        {showCertForm && (
                            <div className="p-5 rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-gold)]/5 space-y-4">
                                <p className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-widest">New Certificate</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase tracking-wider font-semibold">Certificate / License Name *</label>
                                        <input type="text" value={certForm.certName} onChange={e => setCertForm(p => ({ ...p, certName: e.target.value }))}
                                            placeholder="e.g. Qatar Civil Defence Approval"
                                            className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase tracking-wider font-semibold">Reference Number</label>
                                        <input type="text" value={certForm.certNumber} onChange={e => setCertForm(p => ({ ...p, certNumber: e.target.value }))}
                                            placeholder="e.g. QCD-2024-00123"
                                            className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase tracking-wider font-semibold">Certified / Approved By</label>
                                        <input type="text" value={certForm.issuingBody} onChange={e => setCertForm(p => ({ ...p, issuingBody: e.target.value }))}
                                            placeholder="e.g. Ministry of Interior, Qatar"
                                            className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase tracking-wider font-semibold">Issue Date *</label>
                                            <input type="date" value={certForm.issueDate} onChange={e => setCertForm(p => ({ ...p, issueDate: e.target.value }))}
                                                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase tracking-wider font-semibold">Expiry Date *</label>
                                            <input type="date" value={certForm.expiryDate} onChange={e => setCertForm(p => ({ ...p, expiryDate: e.target.value }))}
                                                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-1">
                                    <button type="button" onClick={() => setShowCertForm(false)} className="text-xs text-[var(--color-slate)] hover:text-[var(--color-warm-white)] px-4 py-2 transition-colors">Cancel</button>
                                    <button type="button" onClick={addCert}
                                        disabled={!certForm.certName || !certForm.issueDate || !certForm.expiryDate}
                                        className="text-xs btn-primary !py-2 !px-5 disabled:opacity-40">
                                        Add Certificate
                                    </button>
                                </div>
                            </div>
                        )}

                        {certificates.length === 0 && !showCertForm && (
                            <p className="text-xs text-[var(--color-slate)] italic">No certificates added yet. Click "+ Add Certificate" to enter details.</p>
                        )}
                    </div>

                    <p className="text-xs text-[var(--color-slate)] mb-3">
                        Upload compliance documents, permits, or safety manuals (PDF/DOC, max 20MB)
                    </p>

                    <div
                        className="border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-navy-lighter)] rounded-xl py-6 px-4 text-center hover:border-[var(--color-gold)] transition-colors cursor-pointer relative"
                        onClick={() => documentInputRef.current?.click()}
                    >
                        <input
                            ref={documentInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,text/plain"
                            className="hidden"
                            onChange={handleDocumentSelect}
                        />
                        {documentUploading ? (
                            <div>
                                <div className="w-6 h-6 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-[var(--color-gold)]">{documentUploadProgress}</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl mb-2">📄</div>
                                <p className="text-sm font-medium text-[var(--color-warm-white)]">
                                    Click to upload documents
                                </p>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-[var(--color-border-subtle)]">
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Installation Guide URL (Optional)</label>
                            <input type="text" value={form.installGuideUrl} onChange={(e) => updateField("installGuideUrl", e.target.value)}
                                placeholder="https://example.com/install-guide.pdf"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            <p className="text-[10px] text-[var(--color-slate)] mt-1">If provided, clients can view/download this guide from the product page.</p>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Dismantling Procedure URL (Optional)</label>
                            <input type="text" value={form.dismantleGuideUrl} onChange={(e) => updateField("dismantleGuideUrl", e.target.value)}
                                placeholder="https://example.com/dismantle.pdf"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                            <p className="text-[10px] text-[var(--color-slate)] mt-1">If provided, clients can view/download this procedure.</p>
                        </div>
                    </div>

                    {/* Rich Guides */}
                    <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)] space-y-8">
                        {/* Installation Guide Details */}
                        <div>
                            <h3 className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-widest mb-4">Rich Installation Guide</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Guide Content / Steps</label>
                                    <textarea
                                        value={installGuide.content}
                                        onChange={(e) => setInstallGuide(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="1. Step one...&#10;2. Step two..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Manpower</label>
                                        <input
                                            type="number"
                                            value={installGuide.requiredManpower}
                                            onChange={(e) => setInstallGuide(prev => ({ ...prev, requiredManpower: e.target.value }))}
                                            placeholder="e.g. 5"
                                            className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Est. Time</label>
                                        <input
                                            type="text"
                                            value={installGuide.estimatedTime}
                                            onChange={(e) => setInstallGuide(prev => ({ ...prev, estimatedTime: e.target.value }))}
                                            placeholder="e.g. 3-5 hours"
                                            className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Tools Required</label>
                                        <input
                                            type="text"
                                            value={installGuide.toolsRequired}
                                            onChange={(e) => setInstallGuide(prev => ({ ...prev, toolsRequired: e.target.value }))}
                                            placeholder="e.g. Wrench, Hammer"
                                            className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dismantling Procedure Details */}
                        <div>
                            <h3 className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-widest mb-4">Rich Dismantling Procedure</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Procedure Content / Steps</label>
                                    <textarea
                                        value={dismantleGuide.content}
                                        onChange={(e) => setDismantleGuide(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="1. Step one...&#10;2. Step two..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Manpower</label>
                                        <input
                                            type="number"
                                            value={dismantleGuide.requiredManpower}
                                            onChange={(e) => setDismantleGuide(prev => ({ ...prev, requiredManpower: e.target.value }))}
                                            placeholder="e.g. 5"
                                            className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Est. Time</label>
                                        <input
                                            type="text"
                                            value={dismantleGuide.estimatedTime}
                                            onChange={(e) => setDismantleGuide(prev => ({ ...prev, estimatedTime: e.target.value }))}
                                            placeholder="e.g. 2-3 hours"
                                            className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--color-slate)] mb-1 block uppercase font-semibold">Tools Required</label>
                                        <input
                                            type="text"
                                            value={dismantleGuide.toolsRequired}
                                            onChange={(e) => setDismantleGuide(prev => ({ ...prev, toolsRequired: e.target.value }))}
                                            placeholder="e.g. Wrench"
                                            className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] text-sm focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {documentFiles.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-[var(--color-border-subtle)] space-y-2">
                            <h3 className="text-xs font-bold text-[var(--color-warm-white)] mb-3">General Uploaded Documents:</h3>
                            {documentFiles.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy)] border border-[var(--color-border-subtle)]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">📄</span>
                                        <div>
                                            <p className="text-xs text-[var(--color-warm-white)] font-medium truncate max-w-[200px] md:max-w-md">{file.originalName}</p>
                                            <p className="text-[10px] text-[var(--color-slate)]">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeDocument(file.id)}
                                        className="text-xs text-[var(--color-danger)] hover:underline">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ─── LOGISTICS ─── */}
                <section className="glass rounded-xl p-6">
                    <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-2">
                        LOGISTICS & BUFFER TIMES
                    </h2>
                    <p className="text-xs text-[var(--color-slate)] mb-5">
                        Buffer times automatically pad bookings to prevent double-booking during install/teardown.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Install Time (hours)</label>
                            <input type="number" min="0" value={form.installTime} onChange={(e) => updateField("installTime", e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Dismantle Time (hours)</label>
                            <input type="number" min="0" value={form.dismantleTime} onChange={(e) => updateField("dismantleTime", e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Cleaning Time (hours)</label>
                            <input type="number" min="0" value={form.cleaningTime} onChange={(e) => updateField("cleaningTime", e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Required Manpower</label>
                            <input type="text" value={form.manpower} onChange={(e) => updateField("manpower", e.target.value)}
                                placeholder="e.g. 4-6 persons for 10+ section setup"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-medium">Tools Required</label>
                            <input type="text" value={form.tools} onChange={(e) => updateField("tools", e.target.value)}
                                placeholder="e.g. Socket wrench set, rubber mallet"
                                className="w-full px-4 py-3 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" />
                        </div>
                    </div>
                </section>

                {/* ─── SUBMIT ─── */}
                <div className="flex items-center justify-between pt-2 pb-8">
                    <Link href="/admin/products" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving || success}
                        className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
                        {saving ? (
                            <><div className="w-4 h-4 border-2 border-[var(--color-navy)] border-t-transparent rounded-full animate-spin" /> Creating...</>
                        ) : success ? "✓ Created!" : "Create Product"}
                    </button>
                </div>
            </form>
        </div>
    );
}
