"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, FileText, CheckCircle2, AlertCircle, Building2, Store, CreditCard, Clock, ChevronRight, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminVendorsPage() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/vendors")
            .then(res => res.json())
            .then(data => {
                if (data.vendors) {
                    setVendors(data.vendors);
                }
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const kycColors: Record<string, string> = {
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        approved: "bg-green-500/10 text-[var(--color-success)] border-green-500/20",
        rejected: "bg-red-500/10 text-[var(--color-danger)] border-red-500/20",
        suspended: "bg-red-500/10 text-[var(--color-danger)] border-red-500/20"
    };

    const storeColors: Record<string, string> = {
        offline: "bg-white/5 text-[var(--color-slate)] border-white/10",
        active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)]">
                        Vendor Partners
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1">Manage third-party equipment suppliers, KYC compliance, and payouts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-[var(--color-navy-dark)] border border-white/5 text-sm">
                        <span className="text-[var(--color-slate)]">Total Vendors:</span> <span className="text-[var(--color-warm-white)] font-bold">{vendors.length}</span>
                    </div>
                </div>
            </div>

            <div className="glass rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left text-sm text-[var(--color-slate)] whitespace-nowrap">
                        <thead className="bg-[#1C2333] text-[var(--color-warm-white)] font-[family-name:var(--font-heading)] uppercase tracking-wider text-xs border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5 font-semibold">Vendor Details</th>
                                <th className="px-6 py-5 font-semibold text-center">KYC Status</th>
                                <th className="px-6 py-5 font-semibold text-center">Store Pipeline</th>
                                <th className="px-6 py-5 font-semibold text-center">Commission</th>
                                <th className="px-6 py-5 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-slate)]">
                                        <div className="flexflex-col items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full mx-auto mb-3" />
                                            Loading vendor fleet...
                                        </div>
                                    </td>
                                </tr>
                            ) : vendors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-slate)]">
                                        No vendors have applied yet.
                                    </td>
                                </tr>
                            ) : (
                                vendors.map((vendor) => (
                                    <tr key={vendor.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-[var(--color-gold)]" />
                                                </div>
                                                <div>
                                                    <div className="text-[var(--color-warm-white)] font-semibold text-sm mb-1">{vendor.companyName}</div>
                                                    <div className="text-xs text-[var(--color-slate)] flex items-center gap-2">
                                                        <Users className="w-3 h-3" /> {vendor.pocName}
                                                        <span className="opacity-30">•</span>
                                                        <span className="font-mono text-[10px]">{vendor.userId?.toLowerCase()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${kycColors[vendor.kycStatus] || kycColors.pending}`}>
                                                {vendor.kycStatus === 'pending' && <Clock className="w-3 h-3" />}
                                                {vendor.kycStatus === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                                {vendor.kycStatus === 'rejected' && <XCircle className="w-3 h-3" />}
                                                {vendor.kycStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${storeColors[vendor.storeStatus] || storeColors.offline}`}>
                                                {vendor.storeStatus === 'offline' ? <Store className="w-3 h-3 opacity-50" /> : <Store className="w-3 h-3" />}
                                                {vendor.storeStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-mono text-[var(--color-warm-white)] font-medium">
                                                {vendor.commissionRate !== null ? `${vendor.commissionRate}%` : "Not Set"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/admin/vendors/${vendor.id}`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-[var(--color-slate)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
