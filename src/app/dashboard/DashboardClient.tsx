"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    Package, Calendar, ChevronRight, Clock, CheckCircle2,
    FileText, AlertCircle, PlusCircle, ArrowRight, LayoutDashboard,
    User, Layers, MailOpen, ShoppingBag, Phone, Search, X, MessageCircle
} from "lucide-react";
import ClientChatWindow from "@/components/chat/ClientChatWindow";

interface Project {
    id: string;
    projectName: string;
    status: string;
    itemCount: number;
    totalUnits: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    products: string[];
}

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface DashboardClientProps {
    user: UserData;
    projects: Project[];
    stats: {
        total: number;
        awaitingQuote: number;
        reviewQuote: number;
        confirmed: number;
        active: number;
    };
}

export default function DashboardClient({ user, projects: initialProjects, stats }: DashboardClientProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter projects based on search query
    const projects = useMemo(() => {
        if (!searchQuery.trim()) return initialProjects;
        const q = searchQuery.toLowerCase();
        return initialProjects.filter(p =>
            p.projectName.toLowerCase().includes(q) ||
            p.status.toLowerCase().replace(/_/g, " ").includes(q) ||
            p.products.some(prod => prod.toLowerCase().includes(q))
        );
    }, [initialProjects, searchQuery]);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "request": return {
                label: "Awaiting Quote", color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                dot: "bg-blue-400", pulse: false, icon: Clock,
            };
            case "quote_sent": return {
                label: "Quote Ready — Review Now", color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                dot: "bg-amber-400", pulse: true, icon: FileText,
            };
            case "changes_requested": return {
                label: "Revision Sent", color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                dot: "bg-orange-400", pulse: false, icon: AlertCircle,
            };
            case "quote_accepted": return {
                label: "Quote Accepted", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                dot: "bg-emerald-400", pulse: false, icon: CheckCircle2,
            };
            case "approved":
            case "booked": return {
                label: "Confirmed Booking", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                dot: "bg-emerald-400", pulse: false, icon: CheckCircle2,
            };
            case "cancelled": return {
                label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/20",
                dot: "bg-red-400", pulse: false, icon: AlertCircle,
            };
            default: return {
                label: status.replace(/_/g, " "), color: "bg-white/5 text-slate-400 border-white/10",
                dot: "bg-slate-400", pulse: false, icon: Package,
            };
        }
    };

    const formatDate = (d: string | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };

    const formatRelative = (d: string | null) => {
        if (!d) return "";
        const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
        if (diff === 0) return "Today";
        if (diff === 1) return "Yesterday";
        if (diff < 7) return `${diff} days ago`;
        return formatDate(d);
    };

    // Separate high-priority items (needs attention)
    const needsAttention = projects.filter(p => p.status === "quote_sent");
    const inProgress = projects.filter(p => !["quote_sent", "cancelled", "approved", "booked"].includes(p.status));
    const completed = projects.filter(p => ["approved", "booked", "cancelled"].includes(p.status));

    const statItems = [
        { label: "Total Quotes", value: stats.total, icon: Layers, sub: "All time" },
        { label: "Awaiting Quote", value: stats.awaitingQuote, icon: Clock, sub: "Pending admin review" },
        { label: "Review Required", value: stats.reviewQuote, icon: MailOpen, sub: "Quotes ready for you", urgent: stats.reviewQuote > 0 },
        { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, sub: "Booked & approved" },
    ];

    const quickLinks = [
        { icon: ShoppingBag, title: "Browse Catalog", desc: "Explore our full fleet of event equipment.", href: "/catalog", cta: "Open Catalog" },
        { icon: Phone, title: "Contact Support", desc: "Have a question? Our team is ready to help.", href: "mailto:info@e3rentals.com", cta: "Email Us" },
        { icon: User, title: "My Profile", desc: "Update your contact info and preferences.", href: "/dashboard/profile", cta: "Edit Profile" },
    ];

    return (
        <div className="min-h-screen">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <p className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <LayoutDashboard className="h-3.5 w-3.5" /> Client Portal
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">
                            Welcome back, {user.name.split(" ")[0]} 👋
                        </h1>
                        <p className="text-[var(--color-slate)] text-sm mt-1">{user.email}</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/dashboard/profile" className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">
                            <User className="h-4 w-4" /> Profile
                        </Link>
                        <Link href="/catalog" className="flex items-center gap-2 btn-primary text-sm">
                            <PlusCircle className="h-4 w-4" /> New Quote
                        </Link>
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {statItems.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className={`glass rounded-xl p-4 border ${stat.urgent ? "border-amber-500/30 bg-amber-500/5" : "border-white/5"}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.urgent ? "bg-amber-500/15" : "bg-white/5"}`}>
                                        <Icon className={`h-4 w-4 ${stat.urgent ? "text-amber-400" : "text-[var(--color-slate)]"}`} />
                                    </div>
                                    <span className={`text-2xl font-bold font-[family-name:var(--font-heading)] ${stat.urgent ? "text-amber-400" : "text-[var(--color-warm-white)]"}`}>
                                        {stat.value}
                                    </span>
                                </div>
                                <p className={`text-xs font-semibold ${stat.urgent ? "text-amber-400" : "text-[var(--color-warm-white)]"}`}>{stat.label}</p>
                                <p className="text-[10px] text-[var(--color-slate)] mt-0.5">{stat.sub}</p>
                            </div>
                        );
                    })}
                </div>

                {/* ── Action / Search Bar ── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 p-4 glass rounded-xl border border-white/5">
                    <h2 className="text-sm font-bold text-[var(--color-warm-white)] shrink-0">Your Quotes & Bookings</h2>

                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-slate)]" />
                        <input
                            type="text"
                            placeholder="Search by quote name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 rounded-lg bg-[var(--color-navy)] border border-white/10 text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] transition-all outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Needs Attention Banner ── */}
                {!searchQuery && needsAttention.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-3 w-3 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                            </span>
                            <p className="text-sm font-semibold text-amber-300">
                                {needsAttention.length === 1
                                    ? `Your quote is ready for "${needsAttention[0].projectName}" — review and accept to proceed.`
                                    : `${needsAttention.length} quotes are ready for your review.`}
                            </p>
                        </div>
                        <Link href={`/dashboard/quote/${needsAttention[0].id}`} className="ml-auto flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors shrink-0">
                            Review Now <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                )}

                {/* ── Quote Sections ── */}
                {projects.length === 0 ? (
                    <div className="py-20 text-center glass border border-dashed border-white/20 rounded-2xl">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                            {searchQuery ? <Search className="h-8 w-8 text-[var(--color-slate)]" /> : <Package className="h-8 w-8 text-[var(--color-slate)]" />}
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">
                            {searchQuery ? "No matching quotes" : "No quotes yet"}
                        </h3>
                        <p className="text-[var(--color-slate)] text-sm mb-6">
                            {searchQuery ? "Try adjusting your search query." : "Browse our catalog and build your first equipment request."}
                        </p>
                        {searchQuery ? (
                            <button onClick={() => setSearchQuery("")} className="btn-secondary text-sm inline-flex items-center gap-2">
                                Clear Search
                            </button>
                        ) : (
                            <Link href="/catalog" className="btn-primary text-sm inline-flex items-center gap-2">
                                <PlusCircle className="h-4 w-4" /> Browse Catalog
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Quotes needing attention */}
                        {needsAttention.length > 0 && (
                            <section>
                                <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                    Action Required ({needsAttention.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {needsAttention.map((p) => <QuoteCard key={p.id} project={p} getStatusConfig={getStatusConfig} formatDate={formatDate} formatRelative={formatRelative} />)}
                                </div>
                            </section>
                        )}

                        {/* In-progress */}
                        {inProgress.length > 0 && (
                            <section>
                                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate)] mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                    In Progress ({inProgress.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {inProgress.map((p) => <QuoteCard key={p.id} project={p} getStatusConfig={getStatusConfig} formatDate={formatDate} formatRelative={formatRelative} />)}
                                </div>
                            </section>
                        )}

                        {/* Completed / Cancelled */}
                        {completed.length > 0 && (
                            <section>
                                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate)] mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                    History ({completed.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {completed.map((p) => <QuoteCard key={p.id} project={p} getStatusConfig={getStatusConfig} formatDate={formatDate} formatRelative={formatRelative} />)}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* ── Quick Help ── */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {quickLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} className="glass border border-white/5 rounded-xl p-5 hover:border-[var(--color-gold)]/30 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-[var(--color-gold)]/10 transition-colors">
                                    <Icon className="h-5 w-5 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] transition-colors" />
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--color-warm-white)] mb-1">{item.title}</h3>
                                <p className="text-xs text-[var(--color-slate)] mb-3">{item.desc}</p>
                                <span className="text-xs text-[var(--color-gold)] group-hover:underline flex items-center gap-1">
                                    {item.cta} <ChevronRight className="h-3 w-3" />
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* ── Chat Window ── */}
                <ClientChatWindow currentUser={user} projects={initialProjects} />

            </main>
        </div>
    );
}

// ── Card Component ──────────────────────────────────────────────────────────
function QuoteCard({ project, getStatusConfig, formatDate, formatRelative }: {
    project: any;
    getStatusConfig: (s: string) => any;
    formatDate: (d: string | null) => string;
    formatRelative: (d: string | null) => string;
}) {
    const cfg = getStatusConfig(project.status);
    const Icon = cfg.icon;
    const isCancelled = project.status === "cancelled";

    return (
        <Link href={`/dashboard/quote/${project.id}`} className="block group">
            <div className={`glass border rounded-xl p-5 transition-all h-full flex flex-col hover:shadow-lg ${project.status === "quote_sent"
                ? "border-amber-500/30 hover:border-amber-500/50 hover:shadow-amber-500/10"
                : isCancelled
                    ? "border-white/5 opacity-60 hover:opacity-80"
                    : "border-white/10 hover:border-[var(--color-gold)]/30 hover:shadow-[var(--color-gold)]/5"
                }`}>
                {/* Top: Status + Date */}
                <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${cfg.color}`}>
                        {cfg.pulse && (
                            <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                            </span>
                        )}
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                    </span>
                    <span className="text-[10px] text-[var(--color-slate)]">{formatRelative(project.createdAt)}</span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[var(--color-warm-white)] mb-3 line-clamp-2 flex-1">
                    {project.projectName}
                </h3>

                {/* Meta */}
                <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        <span>{project.totalUnits} unit{project.totalUnits !== 1 ? "s" : ""} · {project.itemCount} product type{project.itemCount !== 1 ? "s" : ""}</span>
                    </div>
                    {project.startDate && (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDate(project.startDate)} → {formatDate(project.endDate)}</span>
                        </div>
                    )}
                    {project.products.length > 0 && (
                        <p className="text-[10px] text-[var(--color-slate)] truncate pl-5">
                            {project.products.slice(0, 3).join(", ")}{project.products.length > 3 ? ` +${project.products.length - 3} more` : ""}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className={`text-xs font-semibold ${project.status === "quote_sent" ? "text-amber-400" : "text-[var(--color-gold)]"} group-hover:underline`}>
                        {project.status === "quote_sent" ? "Review & Accept →" : "View Details →"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </Link>
    );
}
