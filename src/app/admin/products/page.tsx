"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
    Search, 
    Filter, 
    Plus, 
    Edit, 
    Trash2, 
    Eye, 
    Download, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Layers, 
    Sparkles, 
    ArrowUpRight,
    PackageCheck,
    Archive,
    RefreshCw
} from "lucide-react";
import { PRODUCT_STATUS, USER_ROLES } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface Product {
    id: string;
    itemCode: string | null;
    name: string;
    slug: string;
    brand: string | null;
    model: string | null;
    pricePerDay: number;
    totalUnits: number;
    allocatableUnits?: number;
    unit: string;
    thumbnailUrl: string | null;
    category: { id: string; name: string; slug: string } | null;
    vendor: { id: string; companyName: string } | null;
    media: Array<{ id: string; type: string }>;
    safetyCertificates: Array<{ id: string; certName: string }>;
    isPublished: boolean;
    status: string;
    createdAt: string;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("admin");

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [vendorFilter, setVendorFilter] = useState("ALL");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/products");
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetch("/api/auth/me")
            .then(r => r.json())
            .then(data => { if (data?.user?.role) setUserRole(data.user.role); })
            .catch(() => {});
    }, []);

    const togglePublished = async (id: string, currentPublished: boolean, currentStatus: string) => {
        const nextPublished = !currentPublished;
        const nextStatus = nextPublished ? PRODUCT_STATUS.PUBLISHED : PRODUCT_STATUS.UNPUBLISHED;

        setProducts(prev => prev.map(p => p.id === id ? { ...p, isPublished: nextPublished, status: nextStatus } : p));

        try {
            const res = await fetch(`/api/admin/products`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isPublished: nextPublished, status: nextStatus })
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success(nextPublished ? "Product published live!" : "Product hidden from catalog");
        } catch (err) {
            toast.error("Failed to update status");
            fetchProducts();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/products`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id, 
                    status: newStatus,
                    isPublished: newStatus === PRODUCT_STATUS.PUBLISHED
                })
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success(`Status updated to ${newStatus}`);
            fetchProducts();
        } catch (err) {
            toast.error("Failed to update product");
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm("Are you sure you want to remove this product? If historical bookings exist, it will be safely archived.")) return;
        try {
            const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.archived) {
                toast.success("Product has historical bookings — safely archived!");
            } else {
                toast.success("Product draft deleted");
            }
            fetchProducts();
        } catch (err) {
            toast.error("Failed to delete product");
        }
    };

    // Bulk Actions
    const handleBulkAction = async (action: "publish" | "unpublish" | "archive") => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Apply ${action} to ${selectedIds.length} selected items?`)) return;

        try {
            for (const id of selectedIds) {
                const isPub = action === "publish";
                const stat = action === "publish" ? PRODUCT_STATUS.PUBLISHED : action === "unpublish" ? PRODUCT_STATUS.UNPUBLISHED : PRODUCT_STATUS.ARCHIVED;
                await fetch("/api/admin/products", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, isPublished: isPub, status: stat })
                });
            }
            toast.success(`Bulk ${action} completed successfully`);
            setSelectedIds([]);
            fetchProducts();
        } catch (e) {
            toast.error("Bulk action failed partially");
            fetchProducts();
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        if (products.length === 0) return;
        const headers = ["ID", "Name", "SKU", "Category", "Vendor", "Daily Price (QAR)", "Total Units", "Status", "Published", "Created At"];
        const csvRows = [headers.join(",")];

        filteredProducts.forEach(p => {
            csvRows.push([
                `"${p.id}"`,
                `"${p.name.replace(/"/g, '""')}"`,
                `"${p.itemCode || ''}"`,
                `"${p.category?.name || 'Unassigned'}"`,
                `"${p.vendor?.companyName || 'E3 Fleet'}"`,
                p.pricePerDay,
                p.totalUnits,
                `"${p.status || 'draft'}"`,
                p.isPublished ? "YES" : "NO",
                `"${new Date(p.createdAt).toISOString()}"`
            ].join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `e3-catalog-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const uniqueCategories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => { if (p.category?.name) cats.add(p.category.name); });
        return Array.from(cats).sort();
    }, [products]);

    const uniqueVendors = useMemo(() => {
        const vens = new Set<string>();
        products.forEach(p => { if (p.vendor?.companyName) vens.add(p.vendor.companyName); });
        return Array.from(vens).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.itemCode && p.itemCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = categoryFilter === "ALL" || p.category?.name === categoryFilter;
            const matchesVendor = vendorFilter === "ALL" || p.vendor?.companyName === vendorFilter;
            const matchesStatus = statusFilter === "ALL" || (p.status || (p.isPublished ? PRODUCT_STATUS.PUBLISHED : PRODUCT_STATUS.DRAFT)) === statusFilter;

            return matchesSearch && matchesCategory && matchesVendor && matchesStatus;
        });
    }, [products, searchQuery, categoryFilter, vendorFilter, statusFilter]);

    return (
        <div className="min-h-screen bg-[#070B14] text-white p-6 md:p-12 pb-24">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gold">
                            E3 Centralized Catalog & Fleet Operations
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">
                        Product Fleet Management
                    </h1>
                    <p className="text-slate-400 text-xs font-medium mt-1">
                        Authoritative product lifecycle, technical specifications, and physical serialized inventory tracking.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleExportCSV}
                        className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <Link 
                        href="/admin/products/add"
                        className="px-6 py-3 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Asset Listing
                    </Link>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="max-w-7xl mx-auto mb-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search by name, SKU, brand..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:border-gold outline-none"
                        />
                    </div>

                    <div>
                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:border-gold outline-none"
                        >
                            <option value="ALL" className="bg-[#0e1424]">All Categories</option>
                            {uniqueCategories.map(c => (
                                <option key={c} value={c} className="bg-[#0e1424]">{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:border-gold outline-none"
                        >
                            <option value="ALL" className="bg-[#0e1424]">All Lifecycle Statuses</option>
                            <option value={PRODUCT_STATUS.PUBLISHED} className="bg-[#0e1424]">Published (Live)</option>
                            <option value={PRODUCT_STATUS.PENDING_REVIEW} className="bg-[#0e1424]">Pending Review</option>
                            <option value={PRODUCT_STATUS.DRAFT} className="bg-[#0e1424]">Drafts</option>
                            <option value={PRODUCT_STATUS.UNPUBLISHED} className="bg-[#0e1424]">Unpublished (Paused)</option>
                            <option value={PRODUCT_STATUS.ARCHIVED} className="bg-[#0e1424]">Archived</option>
                        </select>
                    </div>

                    <div>
                        <select 
                            value={vendorFilter}
                            onChange={(e) => setVendorFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:border-gold outline-none"
                        >
                            <option value="ALL" className="bg-[#0e1424]">All Vendors / E3 Fleet</option>
                            {uniqueVendors.map(v => (
                                <option key={v} value={v} className="bg-[#0e1424]">{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between animate-fade-in">
                        <span className="text-xs font-bold text-gold">
                            {selectedIds.length} product(s) selected
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleBulkAction("publish")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase"
                            >
                                Publish Selected
                            </button>
                            <button 
                                onClick={() => handleBulkAction("unpublish")}
                                className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-300 text-xs font-bold uppercase"
                            >
                                Unpublish Selected
                            </button>
                            <button 
                                onClick={() => handleBulkAction("archive")}
                                className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-bold uppercase"
                            >
                                Archive Selected
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Products Table */}
            <div className="max-w-7xl mx-auto glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="p-4 w-10 text-center">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(filteredProducts.map(p => p.id));
                                            else setSelectedIds([]);
                                        }}
                                        className="w-4 h-4 accent-gold rounded"
                                    />
                                </th>
                                <th className="p-4">Asset Details</th>
                                <th className="p-4">Category / Vendor</th>
                                <th className="p-4">Rental Rate</th>
                                <th className="p-4">Fleet Units</th>
                                <th className="p-4">Lifecycle Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500 animate-pulse">
                                        Loading Authoritative Inventory Records...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500">
                                        No products match the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((p) => {
                                    const isSelected = selectedIds.includes(p.id);
                                    const effectiveStatus = p.status || (p.isPublished ? PRODUCT_STATUS.PUBLISHED : PRODUCT_STATUS.DRAFT);

                                    return (
                                        <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-gold/5' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedIds(prev => [...prev, p.id]);
                                                        else setSelectedIds(prev => prev.filter(id => id !== p.id));
                                                    }}
                                                    className="w-4 h-4 accent-gold rounded"
                                                />
                                            </td>

                                            {/* Name & Thumbnail */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-navy-dark overflow-hidden relative border border-white/10 shrink-0">
                                                        {p.thumbnailUrl ? (
                                                            <Image src={p.thumbnailUrl} alt={p.name} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 font-bold">N/A</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white flex items-center gap-2">
                                                            {p.name}
                                                            {p.media?.some(m => m.type === "model3d") && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">3D</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                                            <span>{p.itemCode || "NO-SKU"}</span>
                                                            {p.brand && <span>• {p.brand}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category & Vendor */}
                                            <td className="p-4">
                                                <div className="font-bold text-slate-300">{p.category?.name || "Unassigned"}</div>
                                                <div className="text-[10px] text-gold font-bold">{p.vendor?.companyName || "E3 Platform Fleet"}</div>
                                            </td>

                                            {/* Pricing */}
                                            <td className="p-4">
                                                <div className="font-black text-white">
                                                    {p.pricePerDay ? `${p.pricePerDay.toLocaleString()} QAR` : "POR"}
                                                </div>
                                                <div className="text-[10px] text-slate-500">per {p.unit}</div>
                                            </td>

                                            {/* Physical Units */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white">{p.totalUnits} Units</span>
                                                    {p.allocatableUnits !== undefined && p.allocatableUnits < p.totalUnits && (
                                                        <span className="text-[9px] text-yellow-400 font-bold" title="Some units offline">
                                                            ({p.allocatableUnits} ready)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Lifecycle Status */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        effectiveStatus === PRODUCT_STATUS.PUBLISHED
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : effectiveStatus === PRODUCT_STATUS.PENDING_REVIEW
                                                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                            : effectiveStatus === PRODUCT_STATUS.ARCHIVED
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                    }`}>
                                                        {effectiveStatus}
                                                    </span>

                                                    {/* Quick Approve button for review */}
                                                    {effectiveStatus === PRODUCT_STATUS.PENDING_REVIEW && (
                                                        <button 
                                                            onClick={() => handleStatusChange(p.id, PRODUCT_STATUS.PUBLISHED)}
                                                            className="px-2 py-0.5 rounded bg-gold text-navy text-[10px] font-black uppercase hover:scale-105 transition-all"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link 
                                                        href={`/catalog/${p.slug}`} 
                                                        target="_blank"
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                                        title="View PDP Storefront"
                                                    >
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <Link 
                                                        href={`/admin/products/edit/${p.id}`}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gold hover:text-white transition-colors"
                                                        title="Edit Product"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <button 
                                                        onClick={() => deleteProduct(p.id)}
                                                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                        title="Archive / Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
