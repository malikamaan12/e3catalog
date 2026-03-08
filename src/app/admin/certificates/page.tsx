"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ShieldCheck, AlertTriangle, Clock, CheckCircle2,
    Plus, Trash2, ExternalLink, Package, Calendar
} from "lucide-react";

interface Certificate {
    id: string;
    certName: string;
    certNumber: string | null;
    issuingBody: string | null;
    issueDate: string;
    expiryDate: string;
    productName: string;
    productId: string;
}

export default function AdminCertificatesPage() {
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "valid" | "expiring" | "expired">("all");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/products")
            .then(r => r.json())
            .then((data: any[]) => {
                const flat: Certificate[] = [];
                for (const p of data) {
                    for (const c of (p.safetyCertificates || [])) {
                        flat.push({ ...c, productName: p.name, productId: p.id });
                    }
                }
                flat.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
                setCerts(flat);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const now = new Date();
    const soon = new Date(now.getTime() + 90 * 86400000);

    const getStatus = (expiry: string) => {
        const d = new Date(expiry);
        if (d < now) return { label: "Expired", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400", urgent: true };
        if (d < new Date(now.getTime() + 30 * 86400000)) return { label: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400", urgent: true };
        if (d < soon) return { label: "Expiring Soon", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400", urgent: false };
        return { label: "Valid", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400", urgent: false };
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const daysLabel = (expiry: string) => {
        const diff = Math.ceil((new Date(expiry).getTime() - now.getTime()) / 86400000);
        if (diff < 0) return `${Math.abs(diff)}d overdue`;
        if (diff === 0) return "Expires today";
        return `${diff}d remaining`;
    };

    const filtered = certs
        .filter(c => {
            const s = getStatus(c.expiryDate);
            if (filter === "valid") return s.label === "Valid";
            if (filter === "expiring") return s.label === "Expiring Soon" || s.label === "Critical";
            if (filter === "expired") return s.label === "Expired";
            return true;
        })
        .filter(c =>
            !search ||
            c.certName.toLowerCase().includes(search.toLowerCase()) ||
            c.productName.toLowerCase().includes(search.toLowerCase()) ||
            (c.certNumber || "").toLowerCase().includes(search.toLowerCase()) ||
            (c.issuingBody || "").toLowerCase().includes(search.toLowerCase())
        );

    const counts = {
        total: certs.length,
        valid: certs.filter(c => getStatus(c.expiryDate).label === "Valid").length,
        expiring: certs.filter(c => ["Expiring Soon", "Critical"].includes(getStatus(c.expiryDate).label)).length,
        expired: certs.filter(c => getStatus(c.expiryDate).label === "Expired").length,
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                        Certificates &amp; Compliance
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-1">Expiry tracking and compliance dashboard for all products</p>
                </div>
                <Link href="/admin/products/add" className="btn-primary text-sm flex items-center gap-2 self-start">
                    <Plus className="h-4 w-4" /> Add Product Certificate
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total", value: counts.total, icon: ShieldCheck, color: "text-[var(--color-gold)]", bg: "bg-[var(--color-gold)]/10 border-[var(--color-gold)]/20", key: "all" },
                    { label: "Valid", value: counts.valid, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", key: "valid" },
                    { label: "Expiring ≤90d", value: counts.expiring, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", key: "expiring" },
                    { label: "Expired", value: counts.expired, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", key: "expired" },
                ].map(card => {
                    const Icon = card.icon;
                    const active = filter === card.key;
                    return (
                        <button key={card.key} onClick={() => setFilter(card.key as any)}
                            className={`glass rounded-xl p-5 text-left cursor-pointer transition-all border ${active ? card.bg + " ring-1 ring-current" : "border-white/8 hover:border-white/15"}`}>
                            <div className={`mb-2 ${card.color}`}><Icon className="h-5 w-5" /></div>
                            <div className={`text-2xl font-bold font-[family-name:var(--font-heading)] ${card.color}`}>{card.value}</div>
                            <div className="text-[10px] text-[var(--color-slate)] mt-0.5 uppercase tracking-wider">{card.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Search by certificate name, product, reference no, or issuing body..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[var(--color-navy-dark)] border border-white/10 rounded-xl pl-4 pr-4 py-3 text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] outline-none transition-colors"
                />
            </div>

            {/* Certificate List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 rounded-xl glass animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 glass border border-dashed border-white/15 rounded-2xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <ShieldCheck className="h-8 w-8 text-[var(--color-slate)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-warm-white)] mb-2">No Certificates Found</h3>
                    <p className="text-[var(--color-slate)] text-sm">
                        {filter !== "all" ? "No certificates match this filter." : "Add certificates when creating or editing a product under 'Compliance & Approvals'."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(cert => {
                        const status = getStatus(cert.expiryDate);
                        const isExpanded = expandedId === cert.id;
                        const days = Math.ceil((new Date(cert.expiryDate).getTime() - now.getTime()) / 86400000);
                        return (
                            <div key={cert.id}
                                className={`glass rounded-xl border transition-all ${status.urgent ? "border-red-500/20" : "border-white/8 hover:border-white/15"}`}>
                                {/* Summary row */}
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : cert.id)}
                                >
                                    {/* Status dot + name */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot} ${status.urgent ? "animate-pulse" : ""}`} />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-[var(--color-warm-white)] truncate">{cert.certName}</p>
                                            <p className="text-xs text-[var(--color-slate)] flex items-center gap-1.5 mt-0.5">
                                                <Package className="h-3 w-3 shrink-0" />
                                                <Link href={`/admin/products/edit/${cert.productId}`} onClick={e => e.stopPropagation()}
                                                    className="hover:text-[var(--color-gold)] transition-colors truncate">
                                                    {cert.productName}
                                                </Link>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                                        {cert.certNumber && (
                                            <span className="font-mono text-[10px] text-[var(--color-slate)] bg-white/5 px-2 py-1 rounded border border-white/8">
                                                {cert.certNumber}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-slate)]">
                                            <Calendar className="h-3 w-3" />
                                            <span>Expires {fmt(cert.expiryDate)}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className={`text-[10px] font-medium ${days < 0 ? "text-red-400" : days < 90 ? "text-amber-400" : "text-[var(--color-slate)]"}`}>
                                            {daysLabel(cert.expiryDate)}
                                        </span>
                                        <span className="text-[10px] text-[var(--color-slate)]">{isExpanded ? "▲" : "▼"}</span>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="border-t border-white/8 px-5 pb-5 pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-1">Certificate Name</p>
                                            <p className="text-sm font-medium text-[var(--color-warm-white)]">{cert.certName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-1">Reference No.</p>
                                            <p className="text-sm font-mono text-[var(--color-warm-white)]">{cert.certNumber || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-1">Approved / Certified By</p>
                                            <p className="text-sm text-[var(--color-warm-white)]">{cert.issuingBody || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-1">Issue Date</p>
                                            <p className="text-sm text-[var(--color-warm-white)]">{fmt(cert.issueDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-1">Expiry Date</p>
                                            <p className={`text-sm font-semibold ${days < 0 ? "text-red-400" : days < 30 ? "text-red-400" : days < 90 ? "text-amber-400" : "text-emerald-400"}`}>
                                                {fmt(cert.expiryDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase tracking-widest font-semibold mb-1">Status</p>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${status.color}`}>{status.label}</span>
                                        </div>
                                        <div className="sm:col-span-2 flex items-end">
                                            <Link href={`/admin/products/edit/${cert.productId}`}
                                                className="inline-flex items-center gap-2 text-xs text-[var(--color-gold)] border border-[var(--color-gold)]/30 px-3 py-2 rounded-lg hover:bg-[var(--color-gold)]/10 transition-colors">
                                                <ExternalLink className="h-3 w-3" />
                                                Edit Product / Update Certificate
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
