"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Store, ShieldCheck, Banknote, Power, BarChart3, ReceiptText } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AdminSettlementManager } from "@/components/admin/AdminSettlementManager";

interface Vendor {
    id: string;
    companyName: string;
    website: string | null;
    taxId: string;
    taxCardExpiry: string;
    companyRegistrationExpiry: string;
    pocName: string;
    pocPhone: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string | null;
    swift: string | null;
    kycStatus: string; // pending, approved, rejected
    storeStatus: string; // active, offline
    paymentTerms: string | null;
    commissionType: string | null;
    commissionValue: number | null;
    createdAt: string;
    user: {
        name: string;
        email: string;
        phoneNumber: string | null;
        status: string; // active, frozen, blocked
    };
}

export default function SuperAdminVendors() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [kycFilter, setKycFilter] = useState("all");
    const [activeTab, setActiveTab] = useState<"vendors" | "settlements">("vendors");

    // Modal state for Vendor Details
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await fetch("/api/admin/super/vendors");
            const data = await res.json();
            setVendors(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch vendors", e);
        } finally {
            setLoading(false);
        }
    };

    const updateVendor = async (vendorId: string, payload: any) => {
        try {
            const res = await fetch("/api/admin/super/vendors", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vendorId, ...payload })
            });
            if (res.ok) fetchVendors(); // Refresh
        } catch (e) {
            console.error("Failed to update vendor", e);
        }
    };

    const updateCommission = async (vendorId: string, commissionType: string, commissionValue: number) => {
        try {
            const res = await fetch(`/api/admin/vendors/${vendorId}/commission`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commissionType, commissionValue })
            });
            if (res.ok) fetchVendors(); // Refresh
        } catch (e) {
            console.error("Failed to update commission", e);
        }
    };

    const filteredVendors = vendors.filter(v => {
        if (kycFilter !== "all" && v.kycStatus !== kycFilter) return false;
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            return v.companyName.toLowerCase().includes(lower) ||
                v.user.name.toLowerCase().includes(lower) ||
                v.user.email.toLowerCase().includes(lower);
        }
        return true;
    });

    return (
        <Tooltip.Provider>
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                            <Store className="w-8 h-8 text-[var(--color-gold)]" />
                            Vendor Management
                        </h1>
                        <p className="text-[var(--color-slate)] text-sm mt-1">Review KYC applications and manage seller accounts globally.</p>
                    </div>
                    
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button 
                            onClick={() => setActiveTab("vendors")}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "vendors" ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg" : "text-[var(--color-slate)] hover:text-white"}`}
                        >
                            <Store className="w-4 h-4" /> Vendor Roster
                        </button>
                        <button 
                            onClick={() => setActiveTab("settlements")}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "settlements" ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg" : "text-[var(--color-slate)] hover:text-white"}`}
                        >
                            <BarChart3 className="w-4 h-4" /> Financial Settlements
                        </button>
                    </div>
                </div>

                {activeTab === "vendors" ? (
                    <>
                        {/* Filters */}
                        <div className="glass rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-white/10">
                            <div className="relative w-full md:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                <input
                                    type="text"
                                    placeholder="Search by company or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[var(--color-navy)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-warm-white)] focus:outline-none focus:border-[var(--color-gold)] transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-[var(--color-navy)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2">
                                <Filter className="w-4 h-4 text-[var(--color-gold)]" />
                                <select
                                    value={kycFilter}
                                    onChange={(e) => setKycFilter(e.target.value)}
                                    className="bg-transparent text-sm text-[var(--color-warm-white)] focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="all">All KYC Statuses</option>
                                    <option value="pending">Pending Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        {/* Vendor Table */}
                        <div className="glass rounded-xl overflow-hidden border border-white/10">
                            {loading ? (
                                <div className="p-8 text-center text-sm text-[var(--color-slate)] animate-pulse">Loading vendors...</div>
                            ) : filteredVendors.length === 0 ? (
                                <div className="p-8 text-center text-sm text-[var(--color-slate)]">No vendors found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/5">
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-[var(--color-gold)] tracking-wider">VENDOR INFO</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-[var(--color-gold)] tracking-wider">KYC STATUS</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-[var(--color-gold)] tracking-wider">USER STATUS</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-[var(--color-gold)] tracking-wider">STORE visibility</th>
                                                <th className="text-right py-4 px-6 text-xs font-semibold text-[var(--color-gold)] tracking-wider">ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredVendors.map(v => (
                                                <tr key={v.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-navy-lighter)] transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[var(--color-warm-white)]">{v.companyName}</span>
                                                            <span className="text-xs text-[var(--color-slate)]">{v.user.name} • {v.user.email}</span>
                                                            <span className="text-[10px] text-[var(--color-slate)] mt-1">Applied: {new Date(v.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 relative">
                                                        {v.kycStatus === 'pending' ? (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => updateVendor(v.id, { kycStatus: 'approved' })}
                                                                    className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition-colors text-xs font-bold rounded"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => updateVendor(v.id, { kycStatus: 'rejected' })}
                                                                    className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors text-xs font-bold rounded"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${v.kycStatus === 'approved'
                                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                                }`}>
                                                                {v.kycStatus === 'approved' ? '🟢 Approved' : '🔴 Rejected'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <select
                                                            value={v.user.status}
                                                            onChange={(e) => updateVendor(v.id, { userStatus: e.target.value })}
                                                            className={`text-xs font-bold px-3 py-1 rounded outline-none cursor-pointer bg-[var(--color-navy-dark)] border ${v.user.status === 'active' ? 'text-white border-white/10' :
                                                                v.user.status === 'frozen' ? 'text-blue-400 border-blue-400/30' :
                                                                    'text-red-500 border-red-500/30'
                                                                }`}
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="frozen">❄️ Frozen</option>
                                                            <option value="blocked">🚫 Blocked</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <button
                                                            onClick={() => updateVendor(v.id, { storeStatus: v.storeStatus === 'active' ? 'offline' : 'active' })}
                                                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${v.storeStatus === 'active'
                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                                }`}
                                                        >
                                                            <Power className="w-3 h-3" />
                                                            {v.storeStatus === 'active' ? 'Online' : 'Offline'}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={() => setSelectedVendor(v)}
                                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold transition"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <AdminSettlementManager />
                )}



                {/* Vendor Details Modal */}
                {selectedVendor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in pb-20">
                        <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
                                <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-white flex items-center gap-3">
                                    {selectedVendor.companyName}
                                </h3>
                                <button onClick={() => setSelectedVendor(null)} className="text-white/50 hover:text-white transition-colors">
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">

                                <div className="grid grid-cols-2 gap-6">
                                    {/* Company Docs */}
                                    <div className="space-y-4">
                                        <h4 className="text-[var(--color-gold)] font-bold text-xs uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                                            <ShieldCheck className="w-4 h-4" /> Legal & Registration
                                        </h4>
                                        <ul className="text-sm text-white/80 space-y-3">
                                            <li><span className="text-white/40 block text-xs">Tax ID / VAT</span> {selectedVendor.taxId}</li>
                                            <li><span className="text-white/40 block text-xs">Tax Card Expiry</span> {selectedVendor.taxCardExpiry || "—"}</li>
                                            <li><span className="text-white/40 block text-xs">Company Reg. Expiry</span> {selectedVendor.companyRegistrationExpiry || "—"}</li>
                                            <li><span className="text-white/40 block text-xs">Primary POC</span> {selectedVendor.pocName} ({selectedVendor.pocPhone})</li>
                                        </ul>
                                    </div>

                                    {/* Banking */}
                                    <div className="space-y-4">
                                        <h4 className="text-[var(--color-gold)] font-bold text-xs uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                                            <Banknote className="w-4 h-4" /> Payout Banking Details
                                        </h4>
                                        <ul className="text-sm text-white/80 space-y-3">
                                            <li><span className="text-white/40 block text-xs">Bank Name</span> {selectedVendor.bankName || "—"}</li>
                                            <li><span className="text-white/40 block text-xs">Account Name</span> {selectedVendor.accountName || "—"}</li>
                                            <li><span className="text-white/40 block text-xs">Account Number</span> {selectedVendor.accountNumber || "—"}</li>
                                            <li><span className="text-white/40 block text-xs">IBAN</span> {selectedVendor.iban || "—"}</li>
                                            <li><span className="text-white/40 block text-xs">SWIFT</span> {selectedVendor.swift || "—"}</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Payment Terms */}
                                <div className="space-y-4">
                                    <h4 className="text-[var(--color-gold)] font-bold text-xs uppercase tracking-widest pb-2 border-b border-white/5">
                                        Custom Payment Terms
                                    </h4>
                                    <p className="text-xs text-[var(--color-slate)] mb-2">Override the default payout schedule for this specific vendor (e.g., "Net 30", "Net 15").</p>
                                    <input
                                        type="text"
                                        placeholder="Global Default"
                                        defaultValue={selectedVendor.paymentTerms || ""}
                                        onBlur={(e) => {
                                            if (e.target.value !== selectedVendor.paymentTerms) {
                                                updateVendor(selectedVendor.id, { paymentTerms: e.target.value || null });
                                                // Optimistic UI update
                                                setSelectedVendor({ ...selectedVendor, paymentTerms: e.target.value || null });
                                            }
                                        }}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none transition"
                                    />
                                </div>

                                {/* Commission Matrix */}
                                <div className="space-y-4 pt-6 border-t border-white/10 mt-6">
                                    <h4 className="text-[var(--color-gold)] font-bold text-xs uppercase tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                                        <Banknote className="w-4 h-4" /> Custom Commission Matrix
                                    </h4>
                                    <p className="text-xs text-[var(--color-slate)] mb-4">Define unique financial terms for this vendor.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/60">Commission Type</label>
                                            <select
                                                value={selectedVendor.commissionType || "percentage"}
                                                onChange={(e) => {
                                                    const newType = e.target.value;
                                                    updateCommission(selectedVendor.id, newType, selectedVendor.commissionValue || 0);
                                                    setSelectedVendor({ ...selectedVendor, commissionType: newType });
                                                }}
                                                className="w-full bg-[var(--color-navy)] border border-white/10 rounded-lg px-4 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none transition cursor-pointer"
                                            >
                                                <option value="percentage">Percentage Markup</option>
                                                <option value="fixed_per_item">Fixed Per Item</option>
                                                <option value="per_project_fee">Per-Project Fee (Platform Service Fee)</option>
                                                <option value="fixed_monthly">Fixed Monthly Subscription</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/60">Value (%, £, or Flat Rate)</label>
                                            <input
                                                type="number"
                                                defaultValue={selectedVendor.commissionValue || 0}
                                                onBlur={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val) && val !== selectedVendor.commissionValue) {
                                                        updateCommission(selectedVendor.id, selectedVendor.commissionType || "percentage", val);
                                                        setSelectedVendor({ ...selectedVendor, commissionValue: val });
                                                    }
                                                }}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Tooltip.Provider>

    );
}

