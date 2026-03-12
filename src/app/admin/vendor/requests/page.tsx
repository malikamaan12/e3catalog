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
    LucideIcon
} from "lucide-react";
import Link from "next/link";

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
}

const STATUS_LABELS: Record<string, string> = {
    request: "New Request",
    quote_sent: "Quote Sent",
    changes_requested: "Revision",
    approved: "Confirmed",
    booked: "Booked",
    cancelled: "Cancelled",
};

const STATUS_ICONS: Record<string, LucideIcon> = {
    request: Inbox,
    quote_sent: Send,
    changes_requested: RefreshCcw,
    approved: CheckCircle2,
    booked: Target,
    cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
    request: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    quote_sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    changes_requested: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    booked: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20 opacity-60",
};

const PIPELINE_ORDER = ["request", "quote_sent", "changes_requested", "approved"];

export default function VendorRequestsPage() {
    const [activeTab, setActiveTab] = useState<string>(PIPELINE_ORDER[0]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = () => {
        setLoading(true);
        fetch("/api/admin/bookings")
            .then((r) => r.json())
            .then((data) => {
                setBookings(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const groupedBookingsCount = PIPELINE_ORDER.reduce((acc, status) => {
        acc[status] = bookings.filter((b) => b.status === status).length;
        return acc;
    }, {} as Record<string, number>);

    const processedBookings = useMemo(() => {
        let result = bookings.filter((b) => b.status === activeTab);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (b) =>
                    b.projectName.toLowerCase().includes(q) ||
                    b.customerName.toLowerCase().includes(q)
            );
        }

        return result;
    }, [bookings, activeTab, searchQuery]);

    return (
        <div className="p-6 md:p-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Quote Requests
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">
                        Manage your incoming equipment rental requests.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-8">
                    <div className="flex gap-4 border-b border-white/5 pb-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 bg-[var(--color-navy-lighter)] rounded-lg w-32" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-48 bg-[var(--color-navy-lighter)] rounded-2xl" />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Tabs */}
                    <div className="flex overflow-x-auto pb-2 gap-2 border-b border-white/5">
                        {PIPELINE_ORDER.map((status) => {
                            const count = groupedBookingsCount[status] || 0;
                            const isActive = activeTab === status;
                            const Icon = STATUS_ICONS[status] || Inbox;

                            return (
                                <button
                                    key={status}
                                    onClick={() => setActiveTab(status)}
                                    className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3 border ${
                                        isActive
                                            ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/30"
                                            : "text-[var(--color-slate)] border-transparent hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {STATUS_LABELS[status]}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-[var(--color-gold)]/20" : "bg-white/5"}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                            <input
                                type="text"
                                placeholder="Search project or customer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[var(--color-gold)] focus:outline-none transition-all"
                            />
                        </div>
                        <div className="flex bg-[var(--color-navy-dark)] border border-white/10 rounded-xl p-1 shrink-0">
                            {[
                                { id: "grid", icon: LayoutGrid },
                                { id: "list", icon: List },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id as any)}
                                    className={`p-2 rounded-lg transition-all ${
                                        viewMode === mode.id ? "bg-white/10 text-white shadow-lg" : "text-[var(--color-slate)] hover:text-white"
                                    }`}
                                >
                                    <mode.icon className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {processedBookings.length === 0 ? (
                        <div className="text-center py-24 rounded-3xl border border-dashed border-white/10 glass">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Inbox className="w-8 h-8 text-[var(--color-slate)] opacity-20" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">No requests here</h3>
                            <p className="text-[var(--color-slate)] text-sm">Everything is caught up in this stage.</p>
                        </div>
                    ) : (
                        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                            {processedBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className={`group relative glass rounded-2xl border transition-all hover:border-white/20 p-6 ${
                                        STATUS_COLORS[booking.status]?.split(" ")[2] || "border-white/10"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors line-clamp-1 text-lg">
                                                {booking.projectName}
                                            </h3>
                                            <p className="text-xs text-[var(--color-slate)]">
                                                ID: {(booking.id).substring(0, 8).toUpperCase()} · {new Date(booking.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[booking.status]}`}>
                                            {STATUS_LABELS[booking.status]}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--color-slate)] font-bold mb-1">Items</p>
                                                <p className="text-sm text-white font-medium">{booking.itemsCount} Units</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--color-slate)] font-bold mb-1">Revenue</p>
                                                <p className="text-sm text-[var(--color-gold)] font-bold">
                                                    {booking.totalPrice ? `${booking.totalPrice.toLocaleString()} QAR` : "TBD"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)] text-[10px] font-bold">
                                                    {booking.customerName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-medium">{booking.customerName}</p>
                                                    <p className="text-[10px] text-[var(--color-slate)]">{booking.customerEmail}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-[var(--color-slate)]">
                                                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg p-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {new Date(booking.startDate).toLocaleDateString()}
                                                </div>
                                                <span className="opacity-20">→</span>
                                                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg p-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    {new Date(booking.endDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/admin/bookings/${booking.id}`}
                                            className="block w-full text-center py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all border border-white/5 hover:border-white/10"
                                        >
                                            Review Request
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
