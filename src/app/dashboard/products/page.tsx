"use client";

import { useState, useEffect } from "react";
import { 
    Plus, Search, Filter, Package, AlertCircle, 
    MoreVertical, Edit2, Trash2, Eye, CheckCircle2, 
    Clock, Image as ImageIcon, ChevronRight, X
} from "lucide-react";
import Link from "next/link";
import { CloudImageUpload } from "@/components/CloudImageUpload";

interface VendorProduct {
    id: string;
    name: string;
    slug: string;
    pricePerDay: number;
    unit: string;
    thumbnailUrl: string | null;
    status: "active" | "pending" | "rejected";
    createdAt: string;
    categoryName: string;
}

interface Category {
    id: string;
    name: string;
}

export default function VendorProductsPage() {
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        categoryId: "",
        pricePerDay: "",
        unit: "day",
        description: "",
        shortDescription: "",
        thumbnailUrl: "",
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [pRes, cRes] = await Promise.all([
                    fetch("/api/vendor/products"),
                    fetch("/api/categories")
                ]);
                const pData = await pRes.json();
                const cData = await cRes.json();
                setProducts(Array.isArray(pData) ? pData : []);
                setCategories(Array.isArray(cData) ? cData : []);
            } catch (err) {
                console.error("Failed to load vendor products:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleEditClick = (product: VendorProduct) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            categoryId: categories.find(c => c.name === product.categoryName)?.id || "",
            pricePerDay: product.pricePerDay.toString(),
            unit: product.unit || "day",
            description: "", // Note: We might need to fetch full description if not in list
            shortDescription: "", // Note: We might need to fetch if not in list
            thumbnailUrl: product.thumbnailUrl || "",
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingProduct(null);
        setFormData({
            name: "", categoryId: "", pricePerDay: "",
            unit: "day", description: "", shortDescription: "", thumbnailUrl: ""
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const method = editingProduct ? "PATCH" : "POST";
            const body = editingProduct ? { ...formData, id: editingProduct.id } : formData;

            const res = await fetch("/api/vendor/products", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const result = await res.json();
                if (editingProduct) {
                    setProducts(products.map(p => p.id === result.id ? { 
                        ...result, 
                        categoryName: categories.find(c => c.id === formData.categoryId)?.name || p.categoryName 
                    } : p));
                } else {
                    const cat = categories.find(c => c.id === formData.categoryId);
                    setProducts([{ ...result, categoryName: cat?.name || "Uncategorized", status: "pending" }, ...products]);
                }
                handleCloseModal();
            }
        } catch (err) {
            console.error("Submission error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.categoryName?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center text-[var(--color-slate)] animate-pulse">Initializing Marketplace Inventory...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-[var(--color-warm-white)] tracking-tight">Catalyst Inventory</h1>
                    <p className="text-[var(--color-slate)] mt-1 font-medium">Manage your marketplace fleet and listing visibility.</p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2 px-6 py-3"
                >
                    <Plus className="w-5 h-5" />
                    List New Item
                </button>
            </header>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                    <input 
                        type="text"
                        placeholder="Search your items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none transition-all"
                    />
                </div>
                <div className="flex bg-white/[0.02] border border-white/10 rounded-2xl p-1 shrink-0">
                    <button className="px-4 py-2 text-xs font-bold text-[var(--color-gold)] bg-white/5 rounded-xl">All Items</button>
                    <button className="px-4 py-2 text-xs font-bold text-[var(--color-slate)] hover:text-[var(--color-warm-white)]">Active</button>
                    <button className="px-4 py-2 text-xs font-bold text-[var(--color-slate)] hover:text-[var(--color-warm-white)]">Awaiting Approval</button>
                </div>
            </div>

            {/* Product Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 glass rounded-3xl border border-dashed border-white/10">
                    <Package className="w-12 h-12 text-[var(--color-slate)]/40 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[var(--color-warm-white)]">No products found</h3>
                    <p className="text-sm text-[var(--color-slate)] mb-6">Start by listing your first item on the E3 Marketplace.</p>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary">Add Your First Product</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(p => (
                        <div key={p.id} className="group relative glass border border-white/10 rounded-3xl overflow-hidden hover:border-[var(--color-gold)]/30 transition-all duration-500">
                            {/* Status Badge */}
                            <div className="absolute top-4 left-4 z-10">
                                {p.status === "active" ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                                        <CheckCircle2 className="w-3 h-3" /> Visible
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest">
                                        <Clock className="w-3 h-3" /> Reviewing
                                    </span>
                                )}
                            </div>

                            {/* Options Button */}
                            <button className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/20 hover:bg-black/40 text-[var(--color-warm-white)] transition-colors opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Image Wrapper */}
                            <div className="aspect-[4/3] relative overflow-hidden bg-[var(--color-navy-light)]">
                                {p.thumbnailUrl ? (
                                    <img 
                                        src={p.thumbnailUrl} 
                                        alt={p.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/5">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] to-transparent opacity-60" />
                                <div className="absolute bottom-4 left-4">
                                    <p className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest mb-1">{p.categoryName}</p>
                                    <h3 className="text-lg font-bold text-[var(--color-warm-white)] leading-tight">{p.name}</h3>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex items-end justify-between mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Pricing</p>
                                        <p className="text-xl font-black text-[var(--color-warm-white)]">
                                            {p.pricePerDay.toLocaleString()} <span className="text-xs font-normal opacity-60">QAR / {p.unit}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Listed</p>
                                        <p className="text-xs font-medium text-[var(--color-warm-white)]">{new Date(p.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEditClick(p)}
                                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--color-warm-white)] text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--color-warm-white)]">
                                    {editingProduct ? "Modify Asset" : "List New Asset"}
                                </h2>
                                <p className="text-sm text-[var(--color-slate)]">
                                    {editingProduct ? `Updating ${editingProduct.name}` : "Submit your equipment for marketplace review."}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                                <X className="w-6 h-6 text-[var(--color-slate)]" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Product Name</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="e.g. Pro Light 500"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-[var(--color-gold)] outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Category</label>
                                    <select 
                                        required
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-[var(--color-gold)] outline-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[var(--color-navy)]">Select Category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id} className="bg-[var(--color-navy)]">{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Rate (QAR)</label>
                                    <input 
                                        required
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.pricePerDay}
                                        onChange={(e) => setFormData({...formData, pricePerDay: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-[var(--color-gold)] outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Unit Type</label>
                                    <select 
                                        value={formData.unit}
                                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-[var(--color-gold)] outline-none cursor-pointer"
                                    >
                                        <option value="day" className="bg-[var(--color-navy)]">Per Day</option>
                                        <option value="job" className="bg-[var(--color-navy)]">Per Job</option>
                                        <option value="sqm" className="bg-[var(--color-navy)]">Per SQM</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Headline</label>
                                <input 
                                    type="text"
                                    placeholder="One-line summary for the catalog card"
                                    value={formData.shortDescription}
                                    onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-[var(--color-gold)] outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Full Description</label>
                                <textarea 
                                    rows={4}
                                    placeholder="Technical details, usage limits, etc."
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-[var(--color-gold)] outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-gold)]">Product Hero Image</label>
                                {formData.thumbnailUrl && (
                                    <div className="mb-4 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/20 relative group">
                                        <img src={formData.thumbnailUrl} alt="Preview" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, thumbnailUrl: ""})}
                                                className="bg-red-500 p-2 rounded-full text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {!formData.thumbnailUrl && (
                                    <CloudImageUpload 
                                        onUploadComplete={(url) => setFormData({...formData, thumbnailUrl: url})}
                                        folder="marketplace-products"
                                    />
                                )}
                                {formData.thumbnailUrl && (
                                    <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Image Loaded/Uploaded Successfully
                                    </div>
                                )}
                            </div>
                        </form>
                        
                        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                            <button 
                                onClick={handleCloseModal}
                                className="flex-1 py-4 px-6 rounded-2xl bg-white/5 text-[var(--color-warm-white)] font-bold text-sm hover:bg-white/10 transition-all"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-[2] btn-primary py-4 px-6 rounded-2xl disabled:opacity-50"
                            >
                                {isSubmitting ? "Processing..." : (editingProduct ? "Save Changes" : "Submit for Approval")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
