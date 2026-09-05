"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Package, 
    AlertCircle, 
    Edit2, 
    Trash2, 
    Eye, 
    CheckCircle2, 
    Clock, 
    Image as ImageIcon, 
    ArrowUpRight,
    Loader2,
    ShieldCheck,
    FileText
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ProductWizard from "@/components/admin/ProductWizard";
import { USER_ROLES, PRODUCT_STATUS } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface VendorProduct {
    id: string;
    name: string;
    slug: string;
    itemCode?: string;
    pricePerDay: number;
    unit: string;
    thumbnailUrl: string | null;
    status: string;
    isPublished: boolean;
    totalUnits: number;
    allocatableUnits?: number;
    createdAt: string;
    categoryName: string;
    categoryId: string;
    shortDescription?: string;
    description?: string;
    brand?: string;
    model?: string;
    dimensions?: string;
    weight?: string;
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

export default function VendorProductsPage() {
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showWizard, setShowWizard] = useState(false);
    const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
    const [exportingCatalog, setExportingCatalog] = useState(false);

    const handleExportCatalog = async () => {
        try {
            setExportingCatalog(true);
            const res = await fetch("/api/pdf/catalog");
            if (!res.ok) throw new Error("Failed to export catalog");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `E3-Rentals-Vendor-Equipment-Catalog.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Vendor equipment catalog downloaded successfully");
        } catch (error) {
            console.error("Export catalog error:", error);
            toast.error("Failed to export catalog PDF");
        } finally {
            setExportingCatalog(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([
                fetch("/api/vendor/products"),
                fetch("/api/categories")
            ]);
            const pData = await pRes.json();
            const cData = await cRes.json();
            setProducts(Array.isArray(pData) ? pData : []);
            setCategories(cData?.flat || cData?.tree || (Array.isArray(cData) ? cData : []));
        } catch (err) {
            console.error("Failed to load vendor products:", err);
            toast.error("Failed to load listings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleEditClick = (product: VendorProduct) => {
        setEditingProduct(product);
        setShowWizard(true);
    };

    const handleCloseWizard = () => {
        setShowWizard(false);
        setEditingProduct(null);
        loadData();
    };

    const handleTogglePause = async (p: VendorProduct) => {
        const newStatus = p.status === PRODUCT_STATUS.PUBLISHED ? PRODUCT_STATUS.UNPUBLISHED : PRODUCT_STATUS.PENDING_REVIEW;
        try {
            const res = await fetch("/api/vendor/products", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: p.id, status: newStatus })
            });
            if (!res.ok) throw new Error("Failed to update status");
            toast.success(newStatus === PRODUCT_STATUS.UNPUBLISHED ? "Listing paused" : "Submitted for review");
            loadData();
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    const filtered = products.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(search.toLowerCase()) || 
            p.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
            (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (showWizard) {
        return (
            <div className="min-h-screen bg-[#070B14]">
                <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
                    <button 
                        onClick={handleCloseWizard}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase"
                    >
                        ← Back to Inventory Fleet
                    </button>
                </div>
                <ProductWizard 
                    initialData={editingProduct || undefined}
                    categories={categories}
                    currentUserRole={USER_ROLES.VENDOR}
                    isEditing={!!editingProduct}
                    onSuccessRedirect="/dashboard/products"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070B14] text-white p-6 md:p-12 pb-24">
            {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gold">
                            Marketplace Vendor Fleet Management
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">
                        My Inventory & Equipment
                    </h1>
                    <p className="text-slate-400 text-xs font-medium mt-1">
                        List new event assets, update rental pricing, and view review status.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportCatalog}
                        disabled={exportingCatalog || products.length === 0}
                        className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-gold/15 border border-white/10 hover:border-gold/30 text-white hover:text-gold font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-40 min-h-[44px]"
                        title="Download vendor equipment catalog PDF"
                    >
                        {exportingCatalog ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-gold" />
                                <span>Exporting Catalog...</span>
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 text-gold" />
                                <span>Export Vendor Catalog (PDF)</span>
                            </>
                        )}
                    </button>

                    <button 
                        onClick={() => { setEditingProduct(null); setShowWizard(true); }}
                        className="px-6 py-3 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 flex items-center gap-2 min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" /> List New Equipment
                    </button>
                </div>
            </header>

            {/* Metrics Overview Cards */}
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fleet Listings</span>
                    <p className="text-2xl font-black text-white mt-1">{products.length}</p>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live on Storefront</span>
                    <p className="text-2xl font-black text-white mt-1">
                        {products.filter(p => p.status === PRODUCT_STATUS.PUBLISHED).length}
                    </p>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Under Review</span>
                    <p className="text-2xl font-black text-white mt-1">
                        {products.filter(p => p.status === PRODUCT_STATUS.PENDING_REVIEW).length}
                    </p>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Units</span>
                    <p className="text-2xl font-black text-gold mt-1">
                        {products.reduce((sum, p) => sum + (p.totalUnits || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search your equipment by name, category, brand..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs text-white focus:border-gold outline-none"
                    />
                </div>
                <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 shrink-0">
                    <button 
                        onClick={() => setStatusFilter("ALL")}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${statusFilter === "ALL" ? 'bg-gold text-navy' : 'text-slate-400 hover:text-white'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setStatusFilter(PRODUCT_STATUS.PUBLISHED)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${statusFilter === PRODUCT_STATUS.PUBLISHED ? 'bg-gold text-navy' : 'text-slate-400 hover:text-white'}`}
                    >
                        Live
                    </button>
                    <button 
                        onClick={() => setStatusFilter(PRODUCT_STATUS.PENDING_REVIEW)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${statusFilter === PRODUCT_STATUS.PENDING_REVIEW ? 'bg-gold text-navy' : 'text-slate-400 hover:text-white'}`}
                    >
                        Reviewing
                    </button>
                    <button 
                        onClick={() => setStatusFilter(PRODUCT_STATUS.DRAFT)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${statusFilter === PRODUCT_STATUS.DRAFT ? 'bg-gold text-navy' : 'text-slate-400 hover:text-white'}`}
                    >
                        Drafts
                    </button>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-gold" />
                        <span className="text-xs font-bold uppercase">Loading Marketplace Fleet...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 glass-dark rounded-3xl border border-dashed border-white/10">
                        <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white">No products found</h3>
                        <p className="text-xs text-slate-400 mb-6">List your first event asset to begin receiving quotation requests.</p>
                        <button 
                            onClick={() => { setEditingProduct(null); setShowWizard(true); }}
                            className="px-6 py-3 rounded-2xl bg-gold text-navy font-black text-xs uppercase"
                        >
                            List New Equipment
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(p => (
                            <div key={p.id} className="group relative glass-dark border border-white/10 rounded-3xl overflow-hidden hover:border-gold/30 transition-all duration-500 flex flex-col">
                                {/* Status Badge */}
                                <div className="absolute top-4 left-4 z-10">
                                    {p.status === PRODUCT_STATUS.PUBLISHED ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                            <CheckCircle2 className="w-3 h-3" /> Live
                                        </span>
                                    ) : p.status === PRODUCT_STATUS.PENDING_REVIEW ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                            <Clock className="w-3 h-3" /> Under Review
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                            {p.status || "Draft"}
                                        </span>
                                    )}
                                </div>

                                {/* Thumbnail */}
                                <div className="aspect-[4/3] relative overflow-hidden bg-navy-dark">
                                    {p.thumbnailUrl ? (
                                        <Image 
                                            src={p.thumbnailUrl} 
                                            alt={p.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                                            <ImageIcon className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-transparent opacity-80" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">{p.categoryName}</p>
                                        <h3 className="text-base font-bold text-white leading-tight truncate">{p.name}</h3>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Daily Rate</span>
                                            <p className="text-lg font-black text-white">
                                                {p.pricePerDay.toLocaleString()} <span className="text-xs font-normal opacity-60">QAR / {p.unit}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Units</span>
                                            <p className="text-sm font-black text-gold">{p.totalUnits} Units</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-white/5">
                                        <button 
                                            onClick={() => handleEditClick(p)}
                                            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Edit2 className="w-3.5 h-3.5 text-gold" /> Edit
                                        </button>
                                        {p.status === PRODUCT_STATUS.PUBLISHED && (
                                            <Link 
                                                href={`/catalog/${p.slug}`}
                                                target="_blank"
                                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                                                title="View on Storefront"
                                            >
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </Link>
                                        )}
                                        <button 
                                            onClick={() => handleTogglePause(p)}
                                            className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all"
                                            title={p.status === PRODUCT_STATUS.PUBLISHED ? "Pause Listing" : "Submit for Review"}
                                        >
                                            {p.status === PRODUCT_STATUS.PUBLISHED ? "Pause" : "Submit"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
