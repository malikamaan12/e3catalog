"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Search,
    List,
    LayoutGrid,
    ArrowUpDown,
    Filter,
    Inbox,
    Send,
    RefreshCcw,
    CheckCircle2,
    Target,
    XCircle,
    TrendingDown,
    LucideIcon,
    Plus
} from "lucide-react";
import ManualBookingFlow from "@/components/admin/ManualBookingFlow";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { BOOKING_STATUS } from "@/lib/constants";

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
    product: { name: string; slug: string; thumbnailUrl: string | null };
    items: any[];
    userId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    [BOOKING_STATUS.REQUEST]: "Request",
    [BOOKING_STATUS.QUOTE_SENT]: "Quote Sent",
    [BOOKING_STATUS.CHANGES_REQUESTED]: "Revision",
    [BOOKING_STATUS.APPROVED]: "Approved",
    [BOOKING_STATUS.BOOKED]: "Booked",
    [BOOKING_STATUS.CANCELLED]: "Cancelled",
    [BOOKING_STATUS.UNDELIVERED]: "Undelivered",
};

const STATUS_ICONS: Record<string, LucideIcon> = {
    [BOOKING_STATUS.REQUEST]: Inbox,
    [BOOKING_STATUS.QUOTE_SENT]: Send,
    [BOOKING_STATUS.CHANGES_REQUESTED]: RefreshCcw,
    [BOOKING_STATUS.APPROVED]: CheckCircle2,
    [BOOKING_STATUS.BOOKED]: Target,
    [BOOKING_STATUS.CANCELLED]: XCircle,
    [BOOKING_STATUS.UNDELIVERED]: TrendingDown,
};

const STATUS_COLORS: Record<string, string> = {
    [BOOKING_STATUS.REQUEST]: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    [BOOKING_STATUS.QUOTE_SENT]: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    [BOOKING_STATUS.CHANGES_REQUESTED]: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    [BOOKING_STATUS.APPROVED]: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    [BOOKING_STATUS.BOOKED]: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    [BOOKING_STATUS.CANCELLED]: "bg-red-500/10 text-red-400 border-red-500/20 opacity-60",
    [BOOKING_STATUS.UNDELIVERED]: "bg-slate-500/10 text-slate-400 border-slate-500/20 opacity-60",
};

const PAYMENT_BADGES: Record<string, { label: string, style: string }> = {
    unpaid: { label: "Unpaid", style: "border-red-500/30 text-red-400 bg-red-500/10" },
    deposit_paid: { label: "Deposit", style: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" },
    paid: { label: "Paid", style: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" }
};

const PIPELINE_ORDER = [BOOKING_STATUS.REQUEST, BOOKING_STATUS.QUOTE_SENT, BOOKING_STATUS.CHANGES_REQUESTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED];

export default function AdminBookingsPage() {
    const [activeTab, setActiveTab] = useState<string>(PIPELINE_ORDER[0]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    // Filters and View State
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [priceRange, setPriceRange] = useState({ min: "", max: "" });
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFilters, setShowFilters] = useState(false);
    const [showManualBooking, setShowManualBooking] = useState(false);

    const fetchBookings = () => {
        setLoading(true);
        fetch("/api/admin/bookings")
            .then((r) => r.json())
            .then((data) => { setBookings(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        const res = await fetch("/api/admin/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: newStatus }),
        });
        const updated = await res.json();
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
        if (selectedBooking?.id === id) {
            setSelectedBooking({ ...selectedBooking, ...updated });
        }
    };

    const groupedBookingsCount = PIPELINE_ORDER.reduce((acc, status) => {
        acc[status] = bookings.filter((b) => b.status === status).length;
        return acc;
    }, {} as Record<string, number>);

    // Filter, Search, and Sort Logic
    const processedBookings = useMemo(() => {
        let result = bookings.filter((b) => b.status === activeTab);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (b) =>
                    b.projectName.toLowerCase().includes(q) ||
                    b.customerName.toLowerCase().includes(q) ||
                    b.customerEmail.toLowerCase().includes(q) ||
                    (b.customerPhone && b.customerPhone.includes(q))
            );
        }

        if (dateRange.start) {
            result = result.filter((b) => new Date(b.startDate) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            result = result.filter((b) => new Date(b.startDate) <= new Date(dateRange.end));
        }

        if (priceRange.min !== "") {
            result = result.filter((b) => (b.totalPrice || 0) >= Number(priceRange.min));
        }
        if (priceRange.max !== "") {
            result = result.filter((b) => (b.totalPrice || 0) <= Number(priceRange.max));
        }

        result.sort((a, b) => {
            if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === "price_asc") return (a.totalPrice || 0) - (b.totalPrice || 0);
            if (sortBy === "price_desc") return (b.totalPrice || 0) - (a.totalPrice || 0);
            return 0;
        });

        return result;
    }, [bookings, activeTab, searchQuery, dateRange, priceRange, sortBy]);

    return (
        <div className="relative">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Booking Pipeline
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">
                        {bookings.length} total bookings · Drag or click to advance status
                    </p>
                </div>
                <button
                    onClick={() => setShowManualBooking(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-black font-bold text-sm hover:bg-[var(--color-gold-light)] transition-all shadow-lg shadow-gold/10 group"
                >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    Manual Booking
                </button>
            </div>

            {loading ? (
                <div className="animate-pulse">
                    <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-8 bg-[var(--color-navy-lighter)] rounded w-24" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-32 bg-[var(--color-navy-lighter)] rounded-xl" />
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    {/* Tabs */}
                    <div className="flex overflow-x-auto custom-scrollbar border-b border-white/10 mb-6 pb-2 gap-2 md:gap-4">
                        {PIPELINE_ORDER.map((status) => {
                            const count = groupedBookingsCount[status] || 0;
                            const isActive = activeTab === status;
                            const text = STATUS_LABELS[status] || "Unknown";
                            const IconComponent = STATUS_ICONS[status] || Inbox;

                            return (
                                <button
                                    key={status}
                                    onClick={() => setActiveTab(status)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 group
                                        ${isActive
                                            ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30"
                                            : "text-[var(--color-slate)] hover:bg-white/5 hover:text-[var(--color-warm-white)]"
                                        }`}
                                >
                                    <IconComponent className={`w-4 h-4 ${isActive ? "text-[var(--color-gold)]" : "text-[var(--color-slate)] group-hover:text-[var(--color-warm-white)]"}`} />
                                    <span className="hidden sm:inline">{text}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-[var(--color-gold)]/20" : "glass"}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Control Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                            <input
                                type="text"
                                placeholder="Search by Project, Client, or Email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${showFilters ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] border-[var(--color-gold)]/30' : 'bg-[var(--color-navy-dark)] text-[var(--color-slate)] border-white/10 hover:text-[var(--color-warm-white)]'}`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>
                            <div className="flex bg-[var(--color-navy-dark)] border border-white/10 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/10 text-[var(--color-warm-white)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white/10 text-[var(--color-warm-white)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Expandable Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-xl border border-white/10 glass animate-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-slate)] mb-1.5">Date Range</label>
                                <div className="flex gap-2">
                                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none" />
                                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-slate)] mb-1.5">Price Range (QAR)</label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Min" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))} className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none" />
                                    <input type="number" placeholder="Max" value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))} className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-slate)] mb-1.5">Sort Responses By</label>
                                <div className="relative">
                                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-slate)]" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none appearance-none"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="price_asc">Price: Low to High</option>
                                        <option value="price_desc">Price: High to Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Tab Content */}
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {processedBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    onClick={() => setSelectedBooking(booking)}
                                    className={`rounded-xl p-5 border cursor-pointer transition-all hover:bg-white/5 shadow-sm ${STATUS_COLORS[activeTab] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}
                                >
                                    <div className="flex items-start justify-between mb-3 border-b border-current border-opacity-10 pb-3">
                                        <div>
                                            <p className="text-lg font-bold text-[var(--color-warm-white)] line-clamp-1">
                                                {booking.isGrouped ? booking.projectName : booking.product.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs opacity-70">
                                                    {booking.isGrouped ? `${booking.items.length} Unique Items (${booking.itemsCount} total units)` : `${booking.itemsCount} Units`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs opacity-70 mb-1">Total</div>
                                            {booking.totalPrice ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-bold gradient-text-gold">{booking.totalPrice.toLocaleString()} QAR</span>
                                                    {booking.paymentStatus && (
                                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${PAYMENT_BADGES[booking.paymentStatus]?.style}`}>
                                                            {PAYMENT_BADGES[booking.paymentStatus]?.label}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[var(--color-slate)] text-xs">Pending</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="opacity-70">Client:</span>
                                            <span className="font-medium">{booking.customerName}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="opacity-70">Dates:</span>
                                            <span>{booking.startDate} → {booking.endDate}</span>
                                        </div>
                                    </div>

                                    {/* Quick Action */}
                                    <div className="flex justify-end pt-3">
                                        <div className="flex gap-2 w-full">
                                            <Link
                                                href={`/admin/bookings/${booking.id}`}
                                                className="text-xs px-4 py-2 rounded-lg glass hover:bg-white hover:bg-opacity-10 transition-colors font-medium text-[var(--color-warm-white)] flex-1 text-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Manage →
                                            </Link>
                                            {booking.userId && (
                                                <Link
                                                    href={`/admin/chat?userId=${booking.userId}&quoteId=${booking.id}`}
                                                    className="p-2 rounded-lg glass border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/10 glass">
                            <table className="w-full text-left text-sm text-[var(--color-warm-white)] whitespace-nowrap">
                                <thead className="bg-black/20 text-[var(--color-slate)] text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">Client</th>
                                        <th className="px-6 py-4">Dates</th>
                                        <th className="px-6 py-4">Total Price</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {processedBookings.map((booking) => (
                                        <tr key={booking.id} onClick={() => setSelectedBooking(booking)} className={`hover:bg-white/5 cursor-pointer transition-colors ${(STATUS_COLORS[activeTab] || 'bg-slate-500/10 text-slate-400 border-slate-500/20').split(" ")[1]}`}>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold line-clamp-1">{booking.isGrouped ? booking.projectName : booking.product.name}</p>
                                                <span className="text-[10px] opacity-70 border border-current border-opacity-20 rounded px-1.5 py-0.5">
                                                    {booking.isGrouped ? `${booking.items.length} Unique Items` : `${booking.itemsCount} Units`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium">{booking.customerName}</p>
                                                <p className="text-xs opacity-70">{booking.customerEmail}</p>
                                            </td>
                                            <td className="px-6 py-4 truncate text-xs">
                                                <p>{booking.startDate}</p>
                                                <p className="opacity-70">to {booking.endDate}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {booking.totalPrice !== null ? (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="font-bold gradient-text-gold">{booking.totalPrice.toLocaleString()} QAR</span>
                                                        {booking.paymentStatus && (
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${PAYMENT_BADGES[booking.paymentStatus]?.style}`}>
                                                                {PAYMENT_BADGES[booking.paymentStatus]?.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs opacity-50">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/bookings/${booking.id}`}
                                                        className="inline-block text-xs px-3 py-1.5 rounded glass hover:bg-white/10 transition-colors font-medium border border-white/10 text-[var(--color-warm-white)]"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Manage →
                                                    </Link>
                                                    {booking.userId && (
                                                        <Link
                                                            href={`/admin/chat?userId=${booking.userId}&quoteId=${booking.id}`}
                                                            className="p-1.5 rounded glass border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {processedBookings.length === 0 && (
                        <div className="text-center py-20 mt-4 border border-dashed border-white/10 rounded-2xl glass">
                            {(() => {
                                const IconComponent = STATUS_ICONS[activeTab] || Inbox;
                                return <IconComponent className="w-12 h-12 mx-auto mb-4 opacity-50 text-[var(--color-slate)]" />;
                            })()}
                            <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">No Bookings Found</h3>
                            <p className="text-[var(--color-slate)] text-sm">There are no records matching your search or filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Booking Detail Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-6" onClick={() => setSelectedBooking(null)}>
                    <div className="glass rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-warm-white)]">
                                Booking Details
                            </h3>
                            <button onClick={() => setSelectedBooking(null)} className="text-[var(--color-slate)] hover:text-[var(--color-warm-white)]">
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-[var(--color-slate)]">Request Name</span>
                                <p className="font-medium text-[var(--color-warm-white)]">{selectedBooking.isGrouped ? selectedBooking.projectName : selectedBooking.product.name}</p>
                                {selectedBooking.isGrouped && (
                                    <div className="mt-2 pl-3 border-l-2 border-[var(--color-gold)]">
                                        <span className="text-xs text-[var(--color-slate)]">Items Requested:</span>
                                        <ul className="text-xs text-[var(--color-warm-white)] list-disc pl-4 mt-1">
                                            {selectedBooking.items.map((item: any) => (
                                                <li key={item.id}>{item.units}x {item.product?.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[var(--color-slate)]">Total Units</span>
                                    <p className="font-medium text-[var(--color-warm-white)]">{selectedBooking.itemsCount}</p>
                                </div>
                                <div>
                                    <span className="text-[var(--color-slate)]">Status</span>
                                    <p className="font-medium">{STATUS_LABELS[selectedBooking.status] || selectedBooking.status}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[var(--color-slate)]">Start</span>
                                    <p className="font-medium text-[var(--color-warm-white)]">{selectedBooking.startDate}</p>
                                </div>
                                <div>
                                    <span className="text-[var(--color-slate)]">End</span>
                                    <p className="font-medium text-[var(--color-warm-white)]">{selectedBooking.endDate}</p>
                                </div>
                            </div>
                            <div>
                                <span className="text-[var(--color-slate)]">Customer</span>
                                <p className="font-medium text-[var(--color-warm-white)]">{selectedBooking.customerName}</p>
                                <p className="text-xs text-[var(--color-slate)]">{selectedBooking.customerEmail}</p>
                                {selectedBooking.customerPhone && <p className="text-xs text-[var(--color-slate)]">{selectedBooking.customerPhone}</p>}
                            </div>
                            {selectedBooking.items && selectedBooking.items[0]?.notes && (
                                <div>
                                    <span className="text-[var(--color-slate)]">Notes</span>
                                    <p className="text-[var(--color-warm-white)]">{selectedBooking.items[0].notes}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
                                <div>
                                    <span className="text-[var(--color-slate)]">Total Price</span>
                                    <p className="font-bold gradient-text-gold text-lg">{selectedBooking.totalPrice?.toLocaleString() || 0} QAR</p>
                                </div>
                                <div>
                                    <span className="text-[var(--color-slate)]">Discount</span>
                                    <p className="font-medium text-[var(--color-warm-white)]">{selectedBooking.items?.[0]?.discount || 0}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showManualBooking && (
                <ManualBookingFlow
                    onClose={() => setShowManualBooking(false)}
                    onSuccess={() => {
                        fetchBookings();
                    }}
                />
            )}
        </div>
    );
}
