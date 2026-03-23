"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ChevronDown, ArrowLeft, MoreVertical, Package, 
    ExternalLink, Mail, Phone, Clock, Download, MessageCircle,
    MessagesSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import EmbeddedChat from "@/components/chat/EmbeddedChat";
import { BOOKING_STATUS } from "@/lib/constants";

const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

interface BookingItem {
    id: string;
    units: number;
    startDate: string;
    endDate: string;
    addedByAdmin?: boolean;
    adminItemNote?: string | null;
    product: {
        id: string;
        name: string;
        slug: string;
        thumbnailUrl: string | null;
        pricePerDay: number;
    };
}

interface BillingSetting {
    id: string;
    type: 'term_condition' | 'payment_term' | 'payment_method';
    label: string;
    content: string;
    isDefault: boolean;
    isActive: boolean;
}

interface Booking {
    id: string;
    isGrouped: boolean;
    projectName: string;
    itemsCount: number;
    startDate: string;
    endDate: string;
    status: string;
    paymentStatus: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    totalPrice: number | null;
    createdAt: string;
    items: BookingItem[];
    notes: string | null;
    // Financials
    discount: number | null;
    logisticsCost: number | null;
    laborCost: number | null;
    additionalChargeName: string | null;
    additionalChargeAmount: number | null;
    additionalChargeType: string | null;
    adminNotes: string | null;
    selectedTerms: string[];
    customNotes: string | null;
    fulfillmentStatus: string | null;
    warehouseNotes: string | null;
    userId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    request: "📥 Request (Soft Hold)",
    quote_sent: "📨 Quote Sent / Bargaining",
    changes_requested: "🔄 Revision",
    approved: "✅ Approved (Locked)",
    quote_accepted: "🤝 Quote Accepted",
    booking_requested: "⚡ Booking Requested",
    booked: "🎯 Booked / Completed",
    cancelled: "❌ Cancelled",
    undelivered: "📉 Undelivered",
};

const PAYMENT_LABELS: Record<string, string> = {
    unpaid: "🔴 Unpaid",
    deposit_paid: "🟡 Deposit Paid",
    paid: "🟢 Paid"
};

export default function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [globalSettings, setGlobalSettings] = useState<BillingSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [addItemForm, setAddItemForm] = useState({ productId: "", productName: "", units: 1, startDate: "", endDate: "", note: "" });
    const [productSearch, setProductSearch] = useState("");
    const [productResults, setProductResults] = useState<{ id: string; name: string; pricePerDay: number; slug: string }[]>([]);
    const [addingItem, setAddingItem] = useState(false);
    const [userRole, setUserRole] = useState("admin");
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Editable form state
    const [pricing, setPricing] = useState({
        discount: 0,
        logisticsCost: 0,
        laborCost: 0,
        additionalChargeName: "",
        additionalChargeAmount: 0,
        additionalChargeType: "fixed",
        adminNotes: "",
        paymentStatus: "unpaid",
        selectedTerms: [] as string[],
        paymentTerms: "",
        paymentMethod: "",
        customNotes: "",
        fulfillmentStatus: "pending",
        warehouseNotes: "",
    });

    const [uiState, setUiState] = useState({
        termsExpanded: false,
        fulfillmentExpanded: true,
        chatExpanded: false,
    });

    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/bookings/${id}`).then(r => r.json()),
            fetch(`/api/admin/settings/billing`).then(r => r.json())
        ]).then(([bookingData, settingsData]) => {
            const settings = Array.isArray(settingsData) ? settingsData : [];
            setGlobalSettings(settings);

            setBooking(bookingData);
            setPricing({
                discount: bookingData.discount || 0,
                logisticsCost: bookingData.logisticsCost || 0,
                laborCost: bookingData.laborCost || 0,
                additionalChargeName: bookingData.additionalChargeName || "",
                additionalChargeAmount: bookingData.additionalChargeAmount || 0,
                additionalChargeType: bookingData.additionalChargeType || "fixed",
                adminNotes: bookingData.adminNotes || "",
                paymentStatus: bookingData.paymentStatus || "unpaid",
                // If it's a new booking, we might auto-select defaults based on settings
                selectedTerms: bookingData.selectedTerms?.length ? bookingData.selectedTerms : settings.filter(s => s.type === 'term_condition' && s.isDefault).map(s => s.content),
                paymentTerms: bookingData.paymentTerms || settings.find(s => s.type === 'payment_term' && s.isDefault)?.content || "",
                paymentMethod: bookingData.paymentMethod || settings.find(s => s.type === 'payment_method' && s.isDefault)?.content || "",
                customNotes: bookingData.customNotes || "",
                fulfillmentStatus: bookingData.fulfillmentStatus || "pending",
                warehouseNotes: bookingData.warehouseNotes || "",
            });
            setLoading(false);
        }).catch((e) => {
            console.error("Failed to load booking details", e);
            setLoading(false);
        });

        // Fetch User Role
        fetch("/api/auth/me")
            .then(r => r.json())
            .then(data => { 
                if (data?.user?.role) setUserRole(data.user.role); 
                if (data?.user) setCurrentUser({ id: data.user.id, role: data.user.role });
            })
            .catch(() => { });
    }, [id]);

    // Product search for add-item
    useEffect(() => {
        if (productSearch.length < 2) { setProductResults([]); return; }
        const t = setTimeout(() => {
            fetch(`/api/products?search=${encodeURIComponent(productSearch)}&limit=8`)
                .then(r => r.json())
                .then(data => setProductResults(Array.isArray(data) ? data : (data.products || [])))
                .catch(() => setProductResults([]));
        }, 300);
        return () => clearTimeout(t);
    }, [productSearch]);

    const handleAddSuggestedItem = async () => {
        if (!addItemForm.productId || !addItemForm.startDate || !addItemForm.endDate) {
            alert("Please select a product and fill in dates.");
            return;
        }
        setAddingItem(true);
        try {
            const res = await fetch(`/api/admin/bookings/${id}/add-item`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: addItemForm.productId,
                    units: addItemForm.units,
                    startDate: addItemForm.startDate,
                    endDate: addItemForm.endDate,
                    adminItemNote: addItemForm.note,
                }),
            });
            if (!res.ok) throw new Error("Failed to add item");
            // Reload booking
            const bookingData = await fetch(`/api/admin/bookings/${id}`).then(r => r.json());
            setBooking(bookingData);
            setAddItemForm({ productId: "", productName: "", units: 1, startDate: "", endDate: "", note: "" });
            setProductSearch("");
            setAddItemOpen(false);
        } catch (e) {
            alert("Failed to add item.");
        }
        setAddingItem(false);
    };

    if (loading) return <div className="p-8 text-[var(--color-slate)]">Loading booking data...</div>;
    if (!booking) return <div className="p-8 text-[var(--color-danger)]">Booking not found</div>;

    // Derived Financials
    const calcDays = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    };

    const days = calcDays(booking.startDate, booking.endDate);
    const canEditFinancials = ["admin", "super_admin", "vendor"].includes(userRole);
    const canEditFulfillment = ["admin", "super_admin", "vendor", "warehouse_manager"].includes(userRole);

    // Calculate base rental across all items
    const baseRental = booking.items.reduce((sum, item) => {
        const itemDays = calcDays(item.startDate, item.endDate);
        return sum + (item.product.pricePerDay * item.units * itemDays);
    }, 0);

    // Apply discount to base rental before adding flat fees
    const discountAmount = baseRental * (pricing.discount / 100);

    let extraCharge = 0;
    if (pricing.additionalChargeAmount > 0) {
        switch (pricing.additionalChargeType) {
            case "percent":
                extraCharge = (baseRental - discountAmount) * (pricing.additionalChargeAmount / 100);
                break;
            case "per_unit":
                extraCharge = pricing.additionalChargeAmount * booking.itemsCount;
                break;
            case "per_day":
                extraCharge = pricing.additionalChargeAmount * days;
                break;
            case "fixed":
            default:
                extraCharge = pricing.additionalChargeAmount;
                break;
        }
    }

    const subtotal = baseRental - discountAmount + pricing.logisticsCost + pricing.laborCost + extraCharge;
    const grandTotal = subtotal; // no tax anymore

    const handleSave = async (newStatus?: string, immediatePaymentStatus?: string) => {
        setSaving(true);
        const payload = {
            ...pricing,
            paymentStatus: immediatePaymentStatus || pricing.paymentStatus,
            fulfillmentStatus: pricing.fulfillmentStatus,
            warehouseNotes: pricing.warehouseNotes,
            totalPrice: grandTotal,
            ...(newStatus && { status: newStatus }),
        };

        await fetch(`/api/admin/bookings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (newStatus) {
            setBooking({ ...booking, status: newStatus });
        }
        setSaving(false);
    };

    const handleDeleteQuote = async () => {
        if (!confirm(`Permanently delete all records for "${booking?.projectName}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
            router.push("/admin/bookings");
        } catch {
            alert("Failed to delete. Try again.");
            setDeleting(false);
        }
    };

    const handleDownloadPdf = async () => {
        setGeneratingPdf(true);
        try {
            const res = await fetch(`/api/pdf/quote/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customNotes: pricing.customNotes,
                    termsAndConditions: pricing.selectedTerms
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || errData.error || `HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Quote-${id.slice(0, 8).toUpperCase()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e: any) {
            alert(`Failed to generate PDF: ${e.message}`);
            console.error("PDF error:", e);
        }
        setGeneratingPdf(false);
    };

    return (
        <div className="max-w-6xl w-full mx-auto max-h-[90vh] pb-12">
            <button onClick={() => router.push('/admin/bookings')} className="text-sm text-[var(--color-slate)] hover:text-white mb-6 flex items-center gap-2 group">
                <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Pipeline
            </button>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 bg-[var(--color-navy-dark)]/40 p-6 rounded-[2rem] border border-white/5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20 shadow-inner">
                        <Package className="w-7 h-7 text-gold" />
                    </div>
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                            Booking {booking.id.split("-")[0].toUpperCase()}
                        </h1>
                        <p className="text-[var(--color-slate)] text-xs mt-1">Submitted on {new Date(booking.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black px-4 py-2 rounded-xl glass text-[var(--color-gold)] border border-[var(--color-gold)]/20 uppercase tracking-widest shadow-lg shadow-gold/5">
                        {STATUS_LABELS[booking.status] || booking.status}
                    </span>

                    <div className="relative group">
                        <select
                            value={pricing.paymentStatus} disabled={!canEditFinancials || saving}
                            onChange={(e) => {
                                setPricing({ ...pricing, paymentStatus: e.target.value });
                                handleSave(undefined, e.target.value);
                            }}
                            className={`text-[10px] font-black px-4 py-2 rounded-xl border outline-none transition-all cursor-pointer appearance-none pr-10 uppercase tracking-widest shadow-lg
                                ${pricing.paymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                    pricing.paymentStatus === 'deposit_paid' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                        'bg-red-500/10 border-red-500/30 text-red-400'}`}
                        >
                            <option value="unpaid" className="bg-[var(--color-navy-dark)] text-white">🔴 Unpaid</option>
                            <option value="deposit_paid" className="bg-[var(--color-navy-dark)] text-white">🟡 Deposit Paid</option>
                            <option value="paid" className="bg-[var(--color-navy-dark)] text-white">🟢 Paid In Full</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none group-hover:scale-110 transition-transform opacity-50" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Main Content (2/3 width) */}
                <div className="lg:col-span-2 space-y-8 order-1 lg:order-1">
                    {/* Client & Project Details sub-grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass rounded-2xl p-4 shadow-sm border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-[0.03] blur-3xl rounded-full"></div>
                            
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-[var(--color-gold)] text-[10px] uppercase tracking-[0.2em]">Client Dossier</h3>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
                                    Online
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-semibold text-[var(--color-slate)] uppercase tracking-wider opacity-60">Project Reference</p>
                                    <p className="text-base font-bold text-[var(--color-warm-white)] leading-tight">{booking.projectName}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-2 border-t border-white/5 pt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-[var(--color-slate)] tracking-wide">Primary Contact</span>
                                        <span className="text-xs font-bold text-[var(--color-warm-white)]">{booking.customerName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-[var(--color-slate)] tracking-wide">Email Channel</span>
                                        <span className="text-xs text-[var(--color-warm-white)] opacity-80">{booking.customerEmail}</span>
                                    </div>
                                    {booking.customerPhone && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-[var(--color-slate)] tracking-wide">Secure Line</span>
                                            <span className="text-xs text-[var(--color-warm-white)] opacity-80">{booking.customerPhone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {booking.notes && (
                                <div className="mt-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl text-[11px] text-[var(--color-slate)] italic leading-relaxed">
                                    <span className="text-[9px] not-italic font-bold text-[var(--color-gold)] uppercase tracking-widest block mb-1 opacity-50">Brief Notes:</span>
                                    "{booking.notes}"
                                </div>
                            )}
                        </div>

                        <div className="glass rounded-2xl p-4 shadow-sm border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-[0.03] blur-3xl rounded-full"></div>
                            
                            <h3 className="font-bold text-blue-400/80 text-[10px] uppercase tracking-[0.2em] mb-3">Engagement Schedule</h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <span className="block text-[9px] font-bold text-[var(--color-slate)] uppercase tracking-widest opacity-60 mb-1">Commencement</span>
                                        <span className="text-[var(--color-warm-white)] font-bold text-sm block leading-tight">{formatDateTime(booking.startDate)}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 border-t border-white/5 pt-3">
                                    <div className="flex-1">
                                        <span className="block text-[9px] font-bold text-[var(--color-slate)] uppercase tracking-widest opacity-60 mb-1">Conclusion</span>
                                        <span className="text-[var(--color-warm-white)] font-bold text-sm block leading-tight">{formatDateTime(booking.endDate)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-2 bg-gold/5 p-2 rounded-xl border border-gold/10">
                                    <span className="text-[10px] text-[var(--color-gold)] font-black uppercase tracking-widest">Billed Duration</span>
                                    <span className="text-xs text-[var(--color-gold)] font-black bg-[var(--color-gold)]/10 px-2 py-1 rounded-lg border border-[var(--color-gold)]/20 shadow-inner">{days} Day{days !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Included (Top Left) */}
                    <div className="glass rounded-2xl p-6 md:p-8">
                        <h3 className="font-semibold text-lg text-[var(--color-warm-white)] mb-5 border-b border-white/10 pb-3 flex items-center justify-between">
                            <span>Items Requested</span>
                            <span className="text-sm font-normal text-[var(--color-slate)] bg-white/5 px-2 py-1 rounded">
                                {booking.isGrouped ? `${booking.items.length} Unique Items` : '1 Item'} • {booking.itemsCount} Total Units
                            </span>
                        </h3>
                        {booking.isGrouped ? (
                            <div className="space-y-1">
                                {booking.items.map((item) => {
                                    const itemDays = calcDays(item.startDate, item.endDate);
                                    const itemBase = item.product.pricePerDay * item.units * itemDays;
                                    const isAdminItem = item.addedByAdmin;
                                    return (
                                        <div key={item.id} className={`flex flex-col sm:flex-row sm:justify-between sm:items-start py-4 border-b border-white/5 last:border-0 -mx-4 px-4 rounded-lg transition-colors ${isAdminItem ? "bg-amber-500/5 border-l-2 border-amber-500/30" : "hover:bg-white/[0.02]"
                                            }`}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[var(--color-warm-white)] font-medium text-base">{item.units}x {item.product.name}</span>
                                                    {isAdminItem && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                            🔧 Admin Added
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[var(--color-slate)] text-sm mt-1">{itemDays} Days @ {item.product.pricePerDay} QAR/day</p>
                                                {isAdminItem && item.adminItemNote && (
                                                    <p className="text-xs text-amber-400/70 mt-1.5 italic">Note: {item.adminItemNote}</p>
                                                )}
                                            </div>
                                            <span className="text-[var(--color-warm-white)] font-medium mt-2 sm:mt-0">{itemBase.toLocaleString()} QAR</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-sm text-[var(--color-slate)] py-4">
                                <p>1 Item Request</p>
                            </div>
                        )}

                        {/* Add Suggested Item Panel */}
                        {canEditFinancials && (
                            <div className="mt-6 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setAddItemOpen(!addItemOpen)}
                                    className="text-sm font-semibold text-[var(--color-gold)] hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span className={`transition-transform ${addItemOpen ? "rotate-45" : ""}`}>+</span>
                                    {addItemOpen ? "Close" : "Add Suggested Item"}
                                </button>

                                {addItemOpen && (
                                    <div className="mt-4 p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                                        <p className="text-xs text-amber-400/80">Search for a product to suggest to the client as a required companion item.</p>

                                        {/* Product Search */}
                                        <div className="relative">
                                            <label className="block text-xs text-[var(--color-slate)] mb-1.5 font-semibold uppercase tracking-wider">Search Product</label>
                                            <input
                                                type="text"
                                                value={addItemForm.productId ? addItemForm.productName : productSearch}
                                                onChange={(e) => {
                                                    setProductSearch(e.target.value);
                                                    setAddItemForm({ ...addItemForm, productId: "", productName: "" });
                                                }}
                                                placeholder="Type product name..."
                                                className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none"
                                            />
                                            {productResults.length > 0 && !addItemForm.productId && (
                                                <div className="absolute z-10 mt-1 w-full bg-[var(--color-navy)] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                                    {productResults.map(p => (
                                                        <button key={p.id} type="button"
                                                            onClick={() => { setAddItemForm({ ...addItemForm, productId: p.id, productName: p.name }); setProductResults([]); }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-warm-white)] hover:bg-white/5 flex justify-between items-center">
                                                            <span>{p.name}</span>
                                                            <span className="text-xs text-[var(--color-slate)]">{p.pricePerDay.toLocaleString()} QAR/day</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Units + Dates */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-[var(--color-slate)] mb-1.5 font-semibold uppercase tracking-wider">Units</label>
                                                <input type="number" min="1" value={addItemForm.units}
                                                    onChange={e => setAddItemForm({ ...addItemForm, units: Number(e.target.value) })}
                                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[var(--color-slate)] mb-1.5 font-semibold uppercase tracking-wider">Start Date</label>
                                                <input type="date" value={addItemForm.startDate}
                                                    onChange={e => setAddItemForm({ ...addItemForm, startDate: e.target.value })}
                                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[var(--color-slate)] mb-1.5 font-semibold uppercase tracking-wider">End Date</label>
                                                <input type="date" value={addItemForm.endDate}
                                                    onChange={e => setAddItemForm({ ...addItemForm, endDate: e.target.value })}
                                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none" />
                                            </div>
                                        </div>

                                        {/* Justification Note */}
                                        <div>
                                            <label className="block text-xs text-[var(--color-slate)] mb-1.5 font-semibold uppercase tracking-wider">Justification / Reason (shown to client)</label>
                                            <textarea
                                                value={addItemForm.note}
                                                onChange={e => setAddItemForm({ ...addItemForm, note: e.target.value })}
                                                placeholder="e.g. Table covers are required with the table rental for weather protection and presentation standards."
                                                rows={3}
                                                className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none resize-none"
                                            />
                                        </div>

                                        <div className="flex gap-3 justify-end">
                                            <button onClick={() => setAddItemOpen(false)} className="text-xs text-[var(--color-slate)] hover:text-white px-4 py-2 transition-colors">Cancel</button>
                                            <button
                                                onClick={handleAddSuggestedItem}
                                                disabled={addingItem || !addItemForm.productId}
                                                className="text-xs btn-primary !py-2 !px-5 disabled:opacity-40"
                                            >
                                                {addingItem ? "Adding..." : "🔧 Add to Quote"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Terms & Conditions (Bottom Left) */}
                    <div className="glass rounded-2xl border border-white/5 overflow-hidden shadow-sm">
                        <button 
                            onClick={() => setUiState(prev => ({ ...prev, termsExpanded: !prev.termsExpanded }))}
                            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                        >
                            <h3 className="font-semibold text-[var(--color-warm-white)] text-sm uppercase tracking-wide flex items-center gap-2">
                                <span className={uiState.termsExpanded ? "text-gold" : "text-slate"}>📄</span> Contract Terms & Admin Notes
                            </h3>
                            <ChevronDown className={`w-5 h-5 text-[var(--color-gold)] transition-transform duration-300 ${uiState.termsExpanded ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                        {uiState.termsExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-white/10"
                            >
                                <div className="p-6">
                                    <div className="mb-6">
                                        <label className="block text-xs font-semibold text-[var(--color-slate)] mb-3 uppercase tracking-wider">
                                            Standard Terms & Conditions (Included in PDF)
                                        </label>
                                        <div className="space-y-1 bg-[var(--color-navy-dark)] border border-white/10 rounded-xl p-4 shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {globalSettings.filter(s => s.type === 'term_condition').map((setting) => (
                                                <label key={setting.id} className="flex items-start gap-3 cursor-pointer group py-1.5 flex-1 border-b border-white/5 last:border-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={pricing.selectedTerms.includes(setting.content)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setPricing(prev => ({
                                                                ...prev,
                                                                selectedTerms: checked
                                                                    ? [...prev.selectedTerms, setting.content]
                                                                    : prev.selectedTerms.filter(t => t !== setting.content)
                                                            }));
                                                        }}
                                                        className="mt-1 w-4 h-4 rounded bg-black/40 border-white/20 checked:bg-[var(--color-gold)] focus:ring-[var(--color-gold)] text-[var(--color-gold)] transition cursor-pointer"
                                                    />
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-wider mb-0.5">{setting.label}</span>
                                                        <span className="block text-xs text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors text-opacity-80 select-none whitespace-pre-wrap">{setting.content}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-slate)] mb-2 uppercase tracking-wider">
                                    Payment Milestones
                                </label>
                                <div className="relative group mb-2">
                                    <select
                                        onChange={(e) => {
                                            const selected = globalSettings.find(s => s.id === e.target.value);
                                            if (selected) setPricing({ ...pricing, paymentTerms: selected.content });
                                        }}
                                        className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none appearance-none cursor-pointer pr-10"
                                    >
                                        <option value="" className="bg-[var(--color-navy-dark)] text-white">-- Apply a Template --</option>
                                        {globalSettings.filter(s => s.type === 'payment_term').map(s => (
                                            <option key={s.id} value={s.id} className="bg-[var(--color-navy-dark)] text-white">{s.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                                </div>
                                <textarea
                                    value={pricing.paymentTerms}
                                    onChange={(e) => setPricing({ ...pricing, paymentTerms: e.target.value })}
                                    placeholder="Enter specific payment schedule for this quote..."
                                    rows={3}
                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none resize-none shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-slate)] mb-2 uppercase tracking-wider">
                                    Payment Method Details
                                </label>
                                <div className="relative group mb-2">
                                    <select
                                        onChange={(e) => {
                                            const selected = globalSettings.find(s => s.id === e.target.value);
                                            if (selected) setPricing({ ...pricing, paymentMethod: selected.content });
                                        }}
                                        className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none appearance-none cursor-pointer pr-10"
                                    >
                                        <option value="" className="bg-[var(--color-navy-dark)] text-white">-- Apply a Template --</option>
                                        {globalSettings.filter(s => s.type === 'payment_method').map(s => (
                                            <option key={s.id} value={s.id} className="bg-[var(--color-navy-dark)] text-white">{s.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                                </div>
                                <textarea
                                    value={pricing.paymentMethod}
                                    onChange={(e) => setPricing({ ...pricing, paymentMethod: e.target.value })}
                                    placeholder="Enter bank details or payment link instructions..."
                                    rows={3}
                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none resize-none shadow-inner"
                                />
                            </div>
                        </div>

                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>

                    {/* Warehouse & Fulfillment */}
                    <div className="glass rounded-2xl border border-white/5 overflow-hidden shadow-sm border-l-4 border-l-blue-500/50">
                        <button 
                            onClick={() => setUiState(prev => ({ ...prev, fulfillmentExpanded: !prev.fulfillmentExpanded }))}
                            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                        >
                            <h3 className="font-semibold text-[var(--color-warm-white)] text-sm uppercase tracking-wide flex items-center gap-2">
                                <span className="text-blue-400">📦</span> Warehouse & Fulfillment
                            </h3>
                            <ChevronDown className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${uiState.fulfillmentExpanded ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                        {uiState.fulfillmentExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-white/10"
                            >
                                <div className="p-6 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 blur-[60px] rounded-full"></div>
                                    <div className="grid grid-cols-1 gap-6 mb-2 relative z-10">
                                        <div>
                                            <label className="block text-xs font-semibold text-[var(--color-slate)] mb-2 uppercase tracking-wider">
                                                Fulfillment Status
                                            </label>
                                            <div className="relative group mb-2">
                                                <select
                                                    value={pricing.fulfillmentStatus} disabled={!canEditFulfillment}
                                                    onChange={(e) => setPricing({ ...pricing, fulfillmentStatus: e.target.value })}
                                                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-blue-500 outline-none appearance-none cursor-pointer pr-10 hover:border-blue-500/50 transition-colors disabled:opacity-50"
                                                >
                                                    <option value="pending" className="bg-[var(--color-navy-dark)] text-white">⏳ Pending Allocation</option>
                                                    <option value="processing" className="bg-[var(--color-navy-dark)] text-white">⚙️ Processing / Packing</option>
                                                    <option value="packed" className="bg-[var(--color-navy-dark)] text-white">📦 Packed & Ready for Dispatch</option>
                                                    <option value="out_for_delivery" className="bg-[var(--color-navy-dark)] text-white">🚚 Out for Delivery</option>
                                                    <option value="delivered" className="bg-[var(--color-navy-dark)] text-white">✅ Delivered / Installed</option>
                                                    <option value="returned" className="bg-[var(--color-navy-dark)] text-white">↩️ Returned to Warehouse</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none group-hover:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[var(--color-slate)] mb-2 uppercase tracking-wider">
                                                Warehouse Notes / Comments
                                            </label>
                                            <textarea
                                                value={pricing.warehouseNotes} disabled={!canEditFulfillment}
                                                onChange={(e) => setPricing({ ...pricing, warehouseNotes: e.target.value })}
                                                placeholder="Notes for the admin or team about the packing/delivery status..."
                                                rows={3}
                                                className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-warm-white)] focus:border-blue-500 hover:border-blue-500/50 transition-colors outline-none resize-none shadow-inner disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Column: Financial Sidebar (1/3 width, sticky) */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 order-2 lg:order-2">
                    <div className="glass rounded-2xl p-6 border border-[var(--color-gold)] border-opacity-30 shadow-2xl shadow-black/40">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                            <h3 className="font-semibold text-lg text-[var(--color-warm-white)] flex items-center gap-2">
                                <span className="text-[var(--color-gold)]">⚙</span> Quote Builder
                            </h3>
                            <a href={`/quote/${booking.id}`} target="_blank" className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] hover:text-white flex items-center gap-1 bg-[var(--color-gold)]/10 py-1.5 px-3 rounded-full transition-colors hover:bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/20">
                                View Form <span>↗</span>
                            </a>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm py-2">
                                <span className="text-[var(--color-slate)] font-medium">Base Rental</span>
                                <span className="font-semibold text-[var(--color-warm-white)]">{baseRental.toLocaleString()} QAR</span>
                            </div>

                            <div className="flex justify-between items-center text-sm group py-2">
                                <label className="text-[var(--color-slate)] font-medium group-focus-within:text-[var(--color-gold)] transition-colors">Discount (%)</label>
                                <input
                                    type="number"
                                    disabled={!canEditFinancials}
                                    min="0" max="100"
                                    value={pricing.discount || ""}
                                    onChange={(e) => setPricing({ ...pricing, discount: Number(e.target.value) })}
                                    className="w-20 bg-[var(--color-navy-dark)]/80 border border-white/10 rounded-lg px-2 py-1.5 text-right text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            {pricing.discount > 0 && (
                                <div className="flex justify-between items-center text-xs text-emerald-400 px-3 py-2 bg-emerald-400/10 rounded-lg border border-emerald-400/20 shadow-inner">
                                    <span className="font-medium">Discount Applied</span>
                                    <span className="font-bold">-{discountAmount.toLocaleString()} QAR</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm pt-4 border-t border-white/5 group pb-2">
                                <label className="text-[var(--color-slate)] font-medium group-focus-within:text-[var(--color-gold)] transition-colors">Logistics / Transport</label>
                                <input
                                    type="number" min="0" disabled={!canEditFinancials}
                                    value={pricing.logisticsCost || ""}
                                    onChange={(e) => setPricing({ ...pricing, logisticsCost: Number(e.target.value) })}
                                    className="w-24 bg-[var(--color-navy-dark)]/80 border border-white/10 rounded-lg px-3 py-1.5 text-right text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            <div className="flex justify-between items-center text-sm group pb-2">
                                <label className="text-[var(--color-slate)] font-medium group-focus-within:text-[var(--color-gold)] transition-colors">Labor / Installation</label>
                                <input
                                    type="number" min="0" disabled={!canEditFinancials}
                                    value={pricing.laborCost || ""}
                                    onChange={(e) => setPricing({ ...pricing, laborCost: Number(e.target.value) })}
                                    className="w-24 bg-[var(--color-navy-dark)]/80 border border-white/10 rounded-lg px-3 py-1.5 text-right text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            <div className="pt-4 border-t border-white/5 bg-white/[0.02] -mx-4 px-4 pb-4 mt-2 rounded-xl border-x border-b border-transparent">
                                <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-wider block mb-3">Additional Charge</label>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Reason (e.g. Late Setup)"
                                        value={pricing.additionalChargeName}
                                        onChange={(e) => setPricing({ ...pricing, additionalChargeName: e.target.value })}
                                        className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] outline-none transition-all placeholder:text-white/20"
                                    />
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <select
                                                value={pricing.additionalChargeType}
                                                onChange={(e) => setPricing({ ...pricing, additionalChargeType: e.target.value })}
                                                className="w-full h-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none appearance-none transition-all cursor-pointer pr-8"
                                            >
                                                <option value="fixed" className="bg-[var(--color-navy-dark)] text-white">Fixed (QAR)</option>
                                                <option value="percent" className="bg-[var(--color-navy-dark)] text-white">Percent (%)</option>
                                                <option value="per_unit" className="bg-[var(--color-navy-dark)] text-white">Per Unit</option>
                                                <option value="per_day" className="bg-[var(--color-navy-dark)] text-white">Per Day</option>
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-gold)] pointer-events-none group-hover:scale-110 transition-transform" />
                                        </div>
                                        <input
                                            type="number" min="0" step="0.1"
                                            placeholder="Amount" disabled={!canEditFinancials}
                                            value={pricing.additionalChargeAmount || ""}
                                            onChange={(e) => setPricing({ ...pricing, additionalChargeAmount: Number(e.target.value) })}
                                            className="w-24 bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-2 text-right text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] outline-none transition-all flex-shrink-0 placeholder:text-white/20 disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                                {extraCharge > 0 && (
                                    <div className="flex justify-end items-center text-xs text-[var(--color-gold)] mt-3 bg-[var(--color-gold)]/10 px-3 py-1.5 rounded-md font-medium">
                                        <span>+{extraCharge.toLocaleString()} QAR Applied</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grand Total */}
                        <div className="border-y-2 border-[var(--color-gold)]/30 py-6 my-6 bg-[var(--color-gold)]/[0.03] -mx-6 px-6 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-gold)] opacity-5 blur-[60px] rounded-full"></div>
                            <div className="flex justify-between items-center relative z-10">
                                <span className="text-[var(--color-warm-white)] font-bold text-sm uppercase tracking-widest">Grand Total</span>
                                <span className="text-3xl lg:text-4xl font-black gradient-text-gold tracking-tighter">{grandTotal.toLocaleString()} <span className="text-sm font-bold text-[var(--color-gold)] ml-1 tracking-normal uppercase">QAR</span></span>
                            </div>
                        </div>

                        {/* Save Draft Action */}
                        <div className="mb-4 flex flex-col md:flex-row gap-3">
                            <button
                                onClick={() => handleSave()}
                                disabled={saving}
                                className="text-sm px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all w-full flex-1 font-medium shadow-sm active:scale-[0.98]"
                            >
                                {saving ? "Saving Draft..." : "Save Pricing Draft"}
                            </button>
                        </div>

                        {/* Generate PDF Button */}
                        <div className="mb-8">
                            <button
                                onClick={handleDownloadPdf}
                                disabled={generatingPdf}
                                className="w-full bg-[var(--color-navy-dark)] border border-[var(--color-gold)]/50 text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-navy)] transition-colors text-sm px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                            >
                                {generatingPdf ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" /> Download Formal Proposal (PDF)
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Workflow Actions */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest border-b border-white/10 pb-3">Pipeline Workflow</h4>
                            <div className="flex flex-col gap-3 pt-2">
                                {[BOOKING_STATUS.REQUEST, BOOKING_STATUS.QUOTE_SENT, BOOKING_STATUS.CHANGES_REQUESTED].includes(booking.status as any) && (
                                    <button onClick={() => handleSave(BOOKING_STATUS.QUOTE_SENT)} disabled={saving} className="btn-primary text-sm px-5 py-3.5 w-full justify-center shadow-lg shadow-[var(--color-gold)]/20 transition-transform hover:-translate-y-0.5 font-bold tracking-wide rounded-xl">
                                        Send / Update Quote
                                    </button>
                                )}

                                {[BOOKING_STATUS.QUOTE_SENT].includes(booking.status as any) && (
                                    <button onClick={() => handleSave(BOOKING_STATUS.APPROVED)} disabled={saving} className="bg-[var(--color-navy-dark)] border-2 border-[var(--color-gold)]/50 text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-navy)] transition-colors text-sm px-4 py-3.5 rounded-xl font-bold w-full shadow-lg tracking-wide">
                                        Approve Booking (Lock Inventory)
                                    </button>
                                )}

                                {booking.status === BOOKING_STATUS.APPROVED && (
                                    <button onClick={() => handleSave(BOOKING_STATUS.BOOKED)} disabled={saving} className="bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors text-sm px-5 py-3.5 rounded-xl font-bold w-full shadow-lg shadow-emerald-500/10 tracking-wide">
                                        Mark as Fulfilled (Booked)
                                    </button>
                                )}

                                {booking.status !== BOOKING_STATUS.CANCELLED && (
                                    <button onClick={() => handleSave(BOOKING_STATUS.CANCELLED)} disabled={saving} className="bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-red-500/70 hover:text-red-400 transition-colors text-xs px-4 py-3 rounded-xl w-full mt-2 font-medium tracking-wide">
                                        Cancel This Request
                                    </button>
                                )}

                                {/* Danger Zone — Delete */}
                                <div className="mt-4 pt-4 border-t border-red-500/10">
                                    <button
                                        onClick={handleDeleteQuote}
                                        disabled={deleting || saving}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/40 transition-all disabled:opacity-40"
                                    >
                                        {deleting ? "Deleting..." : "🗑 Delete Quote Permanently"}
                                    </button>
                                    <p className="text-[10px] text-red-400/40 text-center mt-1.5">Removes all booking records. Cannot be undone.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LinkedIn-style Floating Chat Window */}
            <div className="fixed bottom-0 right-6 z-[100] flex flex-col items-end pointer-events-none">
                <AnimatePresence>
                    {uiState.chatExpanded && (
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            className="w-[380px] h-[550px] bg-[var(--color-navy-dark)] border border-white/10 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto mb-2"
                        >
                            {/* Window Header */}
                            <div className="bg-gold p-4 flex justify-between items-center shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center border border-white/10">
                                        <MessagesSquare className="w-4 h-4 text-gold" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-navy text-sm leading-none flex items-center gap-2">
                                            {booking.customerName}
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                        </h4>
                                        <p className="text-[10px] text-navy/70 font-semibold uppercase tracking-wider mt-1">Direct Channel • Active</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setUiState(prev => ({ ...prev, chatExpanded: false }))}
                                    className="p-1.5 hover:bg-navy/10 rounded-lg transition-colors text-navy/50 hover:text-navy"
                                >
                                    <span className="text-xl">×</span>
                                </button>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-hidden bg-[var(--color-navy)]">
                                {currentUser && booking.userId && (
                                    <EmbeddedChat 
                                        currentUser={currentUser}
                                        projectId={booking.id}
                                        receiverId={booking.userId}
                                        receiverName={booking.customerName}
                                        title=""
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Launcher Button */}
                {!uiState.chatExpanded && (
                    <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => setUiState(prev => ({ ...prev, chatExpanded: true }))}
                        className="bg-gold text-navy p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all mb-6 pointer-events-auto border-4 border-navy border-opacity-50 relative group"
                    >
                        <MessagesSquare className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-navy text-[8px] font-bold text-white flex items-center justify-center">1</span>
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-navy border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                            Open Chat Hub
                        </div>
                    </motion.button>
                )}
            </div>
        </div >
    );
}
