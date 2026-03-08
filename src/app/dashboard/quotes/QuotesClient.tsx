"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, LayoutGrid, List, Calendar, Package, ChevronRight, Clock, CheckCircle2, FileText, AlertCircle } from "lucide-react";

export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    request: { label: "Awaiting Quote", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
    quote_sent: { label: "Quote Ready", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: FileText },
    changes_requested: { label: "Revision Sent", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: AlertCircle },
    quote_accepted: { label: "Accepted", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    approved: { label: "Confirmed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    booked: { label: "Booked", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle },
};

const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const relative = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return fmt(d);
};

interface QuoteProject {
    id: string;
    projectName: string;
    status: string;
    createdAt: string;
    startDate: string | null;
    endDate: string | null;
    totalUnits: number;
    itemCount: number;
    products: string[];
}

export function QuotesClient({ initialProjects }: { initialProjects: QuoteProject[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const processedProjects = useMemo(() => {
        let result = [...initialProjects];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.projectName.toLowerCase().includes(q) ||
                    p.products.some(prod => prod.toLowerCase().includes(q))
            );
        }

        return result;
    }, [initialProjects, searchQuery]);

    const awaitingReview = initialProjects.filter(p => p.status === "quote_sent").length;

    return (
        <div>
            {/* Header & Stats */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">My Quotes</h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">{initialProjects.length} total quote request{initialProjects.length !== 1 ? "s" : ""}</p>
                </div>
                {awaitingReview > 0 && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                        <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                        </span>
                        {awaitingReview} awaiting your review
                    </span>
                )}
            </div>

            {/* Empty State (No Quotes at all) */}
            {initialProjects.length === 0 ? (
                <div className="text-center py-20 glass border border-dashed border-white/20 rounded-2xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-[var(--color-slate)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">No quotes yet</h3>
                    <p className="text-[var(--color-slate)] text-sm mb-6">Browse our catalog and submit your first equipment request.</p>
                    <Link href="/catalog" className="btn-primary text-sm inline-flex gap-2">Browse Catalog</Link>
                </div>
            ) : (
                <>
                    {/* Control Bar (Search & View Toggle) */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                            <input
                                type="text"
                                placeholder="Search quotes by project name or equipment..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <div className="flex bg-[var(--color-navy-dark)] border border-white/10 rounded-lg p-1 w-full sm:w-auto justify-center">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/10 text-[var(--color-warm-white)] shadow-sm" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white/10 text-[var(--color-warm-white)] shadow-sm" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Empty State */}
                    {processedProjects.length === 0 ? (
                        <div className="text-center py-16 mt-4 border border-dashed border-white/10 rounded-2xl glass">
                            <Search className="w-10 h-10 mx-auto mb-4 opacity-50 text-[var(--color-slate)]" />
                            <h3 className="text-base font-semibold text-[var(--color-warm-white)] mb-1">No matching quotes</h3>
                            <p className="text-[var(--color-slate)] text-sm">We couldn't find any quotes matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        /* Results View */
                        viewMode === "grid" ? (
                            <div className="space-y-4">
                                {processedProjects.map((p) => {
                                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG["request"];
                                    const Icon = cfg.icon;
                                    const urgent = p.status === "quote_sent";
                                    return (
                                        <Link key={p.id} href={`/dashboard/quote/${p.id}`} className="block group">
                                            <div className={`glass border rounded-xl px-5 py-4 transition-all hover:shadow-lg flex flex-col sm:flex-row sm:items-center gap-4 ${urgent ? "border-amber-500/30 hover:border-amber-500/50" : "border-white/8 hover:border-[var(--color-gold)]/30"}`}>
                                                {/* Status icon */}
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgent ? "bg-amber-500/15" : "bg-white/5"}`}>
                                                    <Icon className={`h-4 w-4 ${urgent ? "text-amber-400" : "text-[var(--color-slate)]"}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                        <h3 className="font-semibold text-sm text-[var(--color-warm-white)] truncate group-hover:text-[var(--color-gold)] transition-colors">{p.projectName}</h3>
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color} w-fit`}>
                                                            {cfg.label}
                                                        </span>
                                                        {urgent && <span className="flex h-1.5 w-1.5 shrink-0 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span></span>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                                                        <span className="text-xs text-[var(--color-slate)] flex items-center gap-1.5"><Package className="h-3 w-3" />{p.totalUnits} unit{p.totalUnits !== 1 ? "s" : ""} · {p.itemCount} type{p.itemCount !== 1 ? "s" : ""}</span>
                                                        {p.startDate && <span className="text-xs text-[var(--color-slate)] flex items-center gap-1.5"><Calendar className="h-3 w-3" />{fmt(p.startDate)} → {fmt(p.endDate!)}</span>}
                                                        <span className="text-xs text-[var(--color-slate)] flex items-center gap-1.5"><Clock className="h-3 w-3" />{relative(p.createdAt)}</span>
                                                    </div>
                                                    {p.products.length > 0 && (
                                                        <p className="text-[11px] text-[var(--color-slate)]/70 mt-1.5 truncate">
                                                            {p.products.slice(0, 4).join(" · ")}{p.products.length > 4 ? ` +${p.products.length - 4}` : ""}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* CTA */}
                                                <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
                                                    <span className={`text-xs font-semibold ${urgent ? "text-amber-400" : "text-[var(--color-gold)]"}`}>
                                                        {urgent ? "Review →" : "View →"}
                                                    </span>
                                                    <ChevronRight className={`h-4 w-4 ${urgent ? "text-amber-400" : "text-[var(--color-slate)]"} group-hover:text-[var(--color-gold)] group-hover:translate-x-0.5 transition-all`} />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-white/10 glass hidden sm:block">
                                <table className="w-full text-left text-sm text-[var(--color-warm-white)] whitespace-nowrap">
                                    <thead className="bg-black/20 text-[var(--color-slate)] text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Project</th>
                                            <th className="px-6 py-4 font-medium">Dates</th>
                                            <th className="px-6 py-4 font-medium">Items</th>
                                            <th className="px-6 py-4 font-medium">Status</th>
                                            <th className="px-6 py-4 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {processedProjects.map((p) => {
                                            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG["request"];
                                            const urgent = p.status === "quote_sent";
                                            return (
                                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-sm group-hover:text-[var(--color-gold)] transition-colors line-clamp-1">{p.projectName}</p>
                                                        <p className="text-[10px] text-[var(--color-slate)] mt-0.5">Requested {relative(p.createdAt)}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-[var(--color-slate)]">
                                                        {p.startDate ? (
                                                            <>
                                                                <p>{fmt(p.startDate)}</p>
                                                                <p className="opacity-70">to {fmt(p.endDate!)}</p>
                                                            </>
                                                        ) : "—"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs border border-current border-opacity-20 rounded px-2 py-1 text-[var(--color-slate)]">
                                                            {p.totalUnits} items ({p.itemCount} types)
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded border ${cfg.color}`}>
                                                            {urgent && <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span></span>}
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link
                                                            href={`/dashboard/quote/${p.id}`}
                                                            className={`inline-block text-xs px-3 py-1.5 rounded transition-colors font-semibold border ${urgent ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 'glass hover:bg-white/10 border-white/10 text-[var(--color-warm-white)]'}`}
                                                        >
                                                            {urgent ? "Review →" : "Details →"}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                    {/* List view empty state fallback for mobile */}
                    {viewMode === "list" && processedProjects.length > 0 && (
                        <div className="sm:hidden text-center py-10 glass border border-white/10 rounded-xl text-sm text-[var(--color-slate)] px-4">
                            List view is optimized for larger screens. Please use Grid view on mobile.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
