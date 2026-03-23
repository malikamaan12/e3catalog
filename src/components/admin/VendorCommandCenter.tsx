"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    Users, Banknote, ShieldCheck, AlertCircle, 
    Search, Filter, Download, MoreHorizontal,
    ArrowUpRight, Loader2, TrendingUp, Clock,
    ChevronDown, LayoutGrid, List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { VendorDrillDown } from "./VendorDrillDown";
import toast from "react-hot-toast";

export default function VendorCommandCenter({ settings }: { settings: any }) {
    const currency = settings?.currency_symbol || "QAR";
    const [vendors, setVendors] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/vendors");
            const data = await res.json();
            setVendors(data.vendors || []);
            setStats(data.stats || {});
        } catch (err) {
            toast.error("Telemetry fetch failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredVendors = useMemo(() => {
        return vendors.filter(v => 
            v.vendor.companyName.toLowerCase().includes(search.toLowerCase()) ||
            v.vendor.id.toLowerCase().includes(search.toLowerCase())
        );
    }, [vendors, search]);

    const kpiCards = [
        { 
            label: "Active Marketplace Nodes", 
            value: stats?.totalActive || 0, 
            icon: Users, 
            color: "text-emerald-400",
            sub: "Verified production vendors"
        },
        { 
            label: "Cumulative Platform Cut", 
            value: `${(stats?.totalCommission || 0).toLocaleString()} ${currency}`, 
            icon: TrendingUp, 
            color: "text-blue-400",
            sub: "Total approved settlements"
        },
        { 
            label: "Pending Verification", 
            value: stats?.pendingSettlements || 0, 
            icon: Clock, 
            color: "text-yellow-400",
            sub: "Settlements requiring audit",
            urgent: (stats?.pendingSettlements || 0) > 0
        },
        { 
            label: "Overdue Receivables", 
            value: `${(stats?.overdueReceivables || 0).toLocaleString()} ${currency}`, 
            icon: AlertCircle, 
            color: "text-red-400",
            sub: "At-risk platform revenue",
            urgent: (stats?.overdueReceivables || 0) > 0
        }
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* KPI Pulse */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, i) => (
                    <motion.div 
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "glass p-8 rounded-[40px] border border-white/5 relative overflow-hidden group",
                            card.urgent && "border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.02)]"
                        )}
                    >
                        <div className="relative z-10">
                            <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 transition-transform group-hover:scale-110", card.color)}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tighter mb-1">{card.value}</h3>
                            <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-4">{card.label}</p>
                            <div className="h-[1px] w-full bg-white/5 mb-4" />
                            <p className="text-[10px] text-[var(--color-slate)] opacity-60 italic">{card.sub}</p>
                        </div>
                        {/* Subtle Glow Background */}
                        <div className={cn("absolute -right-10 -bottom-10 w-40 h-40 blur-[80px] opacity-10 rounded-full", card.color.replace('text', 'bg'))} />
                    </motion.div>
                ))}
            </div>

            {/* Master Grid Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-slate)]" />
                    <input 
                        type="text"
                        placeholder="Scan for Vendor ID or Company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-16 pr-8 text-sm focus:border-[var(--color-gold)] outline-none text-white tracking-tight"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase text-[var(--color-slate)] hover:text-white transition-all">
                        <Filter className="w-4 h-4" /> Filter Ops
                    </button>
                    <button className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase text-[var(--color-slate)] hover:text-white transition-all">
                        <Download className="w-4 h-4" /> Export Ledger
                    </button>
                </div>
            </div>

            {/* Master Data Grid */}
            <div className="glass rounded-[48px] border border-white/5 overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-[var(--color-gold)] animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-slate)]">Synchronizing Neural Grid...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="px-10 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Marketplace Merchant</th>
                                    <th className="px-10 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Performance Rating</th>
                                    <th className="px-10 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Fiscal Policy</th>
                                    <th className="px-10 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Platform Debt</th>
                                    <th className="px-10 py-6 text-left text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Operational Status</th>
                                    <th className="px-10 py-6 text-right text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Core Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode="popLayout">
                                    {filteredVendors.map((v, i) => (
                                        <motion.tr 
                                            key={v.vendor.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => {
                                                setSelectedVendor(v.vendor.id);
                                                setIsDrillDownOpen(true);
                                            }}
                                            className="hover:bg-white/[0.03] transition-all cursor-pointer group"
                                        >
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                                        {v.vendor.logoUrl ? <img src={v.vendor.logoUrl} className="w-full h-full object-contain" /> : <Users className="w-6 h-6 text-white/20" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-white tracking-tight">{v.vendor.companyName}</p>
                                                        <p className="text-[10px] text-[var(--color-slate)] font-bold uppercase tracking-widest opacity-60 italic">UID: {v.vendor.id.split("-")[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[var(--color-gold)] shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                                                            style={{ width: `${v.vendor.scoreRating * 20}%` }} 
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-white">{v.vendor.scoreRating?.toFixed(1) || "5.0"}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white capitalize">{v.vendor.commissionType?.replace(/_/g, ' ')}</span>
                                                    <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest">
                                                        {v.vendor.commissionValue}{v.vendor.commissionType === 'percentage' ? "%" : ` ${currency}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={cn(
                                                    "text-sm font-black",
                                                    v.amountOwed > 0 ? "text-red-400" : "text-emerald-400"
                                                )}>
                                                    {(v.amountOwed || 0).toLocaleString()} <span className="text-[10px] opacity-40">{currency}</span>
                                                </span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <StatusBadge status={v.vendor.storeStatus} kyc={v.vendor.kycStatus} />
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <button className="p-3 rounded-full hover:bg-white/10 text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <VendorDrillDown 
                isOpen={isDrillDownOpen} 
                onClose={() => setIsDrillDownOpen(false)} 
                vendorId={selectedVendor || ""} 
                onUpdate={fetchData}
            />
        </div>
    );
}

function StatusBadge({ status, kyc }: any) {
    const config = {
        active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        suspended: "text-red-400 bg-red-400/10 border-red-400/20",
        pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    } as any;

    const displayStatus = kyc !== "approved" ? "Under KYC Review" : status;
    const finalStatus = kyc !== "approved" ? "pending" : status;

    return (
        <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg", config[finalStatus] || config.pending)}>
            {displayStatus}
        </span>
    );
}
