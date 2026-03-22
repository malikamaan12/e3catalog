"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    Package, Calendar, ChevronRight, Clock, CheckCircle2,
    FileText, AlertCircle, PlusCircle, ArrowRight, LayoutDashboard,
    User, Layers, MailOpen, ShoppingBag, Phone, Search, X, MessageCircle
} from "lucide-react";
import ClientChatWindow from "@/components/chat/ClientChatWindow";
import ClientKPIs from "@/components/dashboard/ClientKPIs";
import ClientPipeline from "@/components/dashboard/ClientPipeline";

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
    vendorName: string;
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

    const statItems = [
        { label: "Total Quotes", value: stats.total, icon: Layers, sub: "Historical fleet requests" },
        { label: "Awaiting Quote", value: stats.awaitingQuote, icon: Clock, sub: "Pending vendor pricing" },
        { label: "Review Required", value: stats.reviewQuote, icon: MailOpen, sub: "Action needed now", urgent: stats.reviewQuote > 0 },
        { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, sub: "Booked & final" },
    ];

    const quickLinks = [
        { icon: ShoppingBag, title: "Browse Catalog", desc: "Explore our full fleet of event equipment.", href: "/catalog", cta: "Open Catalog" },
        { icon: Phone, title: "Contact Support", desc: "Real-time assistance for your logistics.", href: "mailto:info@e3rentals.com", cta: "Email Support" },
        { icon: User, title: "My Profile", desc: "Update your contact info and preferences.", href: "/dashboard/profile", cta: "Edit Profile" },
    ];

    return (
        <div className="min-h-screen animate-fade-up">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

                {/* ── Header: Digital Operating System Style ── */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-black text-[var(--color-warm-white)] tracking-tight">
                            Client Operating System
                        </h1>
                        <p className="text-[var(--color-slate)] mt-2 font-medium flex items-center gap-2">
                            Welcome, <span className="text-[var(--color-gold)]">{user.name}</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--color-slate)]/30" />
                            Connection status: <span className="text-emerald-400">Optimal</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/dashboard/profile" 
                            className="px-5 py-2.5 rounded-xl glass border border-white/5 text-[var(--color-warm-white)] font-bold text-sm hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                            <User className="w-4 h-4" />
                            Account
                        </Link>
                        <Link 
                            href="/catalog" 
                            className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-bold text-sm hover:translate-y-[-2px] transition-all shadow-lg shadow-gold/10 flex items-center gap-2 group"
                        >
                            New Quote
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </header>

                {/* ── Stats Row ── */}
                <ClientKPIs stats={statItems} />

                {/* ── Pipeline Section ── */}
                <div className="mb-8 flex items-center justify-between px-2">
                    <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                        Request Pipeline
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[var(--color-slate)] font-bold">Live Status</span>
                    </h2>
                    
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-slate)]" />
                        <input
                            type="text"
                            placeholder="Filter bookings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-9 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] transition-all outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)] hover:text-[var(--color-warm-white)]">
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="py-20 text-center glass border border-dashed border-white/10 rounded-3xl">
                        <Package className="h-10 w-10 text-[var(--color-slate)]/40 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">No projects found</h3>
                        <p className="text-[var(--color-slate)] text-sm mb-6 max-w-xs mx-auto">Start by browsing the catalog to request your first equipment quote.</p>
                        <Link href="/catalog" className="btn-primary inline-flex items-center gap-2">
                             Start Browsing <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <ClientPipeline projects={projects} />
                )}

                {/* ── Action Grid ── */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
                    {quickLinks.map((action, i) => (
                        <Link 
                            key={i}
                            href={action.href}
                            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[var(--color-gold)]/30 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[var(--color-gold)]/10 transition-colors">
                                <action.icon className="w-6 h-6 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--color-warm-white)] mb-2">{action.title}</h3>
                            <p className="text-sm text-[var(--color-slate)] mb-6">{action.desc}</p>
                            <span className="text-sm font-bold text-[var(--color-gold)] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                {action.cta} <ChevronRight className="w-4 h-4" />
                            </span>
                        </Link>
                    ))}
                </section>

                <ClientChatWindow currentUser={user} projects={initialProjects} />
            </main>
        </div>
    );
}
