"use client";

import React, { useState, useEffect } from "react";
import { Store, CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react";

export function VendorManagement() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVendors = async () => {
        try {
            const res = await fetch("/api/admin/vendors");
            const data = await res.json();
            if (data.vendors && Array.isArray(data.vendors)) {
                setVendors(data.vendors);
            } else if (Array.isArray(data)) {
                setVendors(data);
            }
        } catch (err) {
            console.error("Failed to fetch vendors", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const updateVendor = async (id: string, updates: any) => {
        try {
            const res = await fetch(`/api/admin/vendors/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                fetchVendors();
            }
        } catch (err) {
            console.error("Failed to update vendor", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Store className="w-6 h-6 text-[var(--color-gold)]" />
                        Marketplace Vendors
                    </h2>
                    <p className="text-sm text-[var(--color-slate)]">Review KYC, update agreements, and manage vendor health.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-8 text-center text-[var(--color-slate)] border border-white/5 rounded-xl bg-black/20">Loading vendors...</div>
                ) : vendors.length === 0 ? (
                    <div className="p-8 text-center text-[var(--color-slate)] border border-white/5 rounded-xl bg-black/20">No vendor profiles found. Users must apply as vendors first.</div>
                ) : vendors.map(v => (
                    <div key={v.id} className="glass border border-white/10 rounded-xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Store className="w-24 h-24" />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
                            {/* Vendor Basic Info */}
                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-xl font-bold text-[var(--color-warm-white)]">{v.companyName}</h3>
                                <p className="text-sm text-[var(--color-slate)]">{v.name} • {v.email}</p>
                                <p className="text-xs text-[var(--color-slate)] pt-2">Joined {new Date(v.joinedAt).toLocaleDateString()}</p>
                            </div>

                            {/* KYC & Agreement Status */}
                            <div className="space-y-4 min-w-[200px]">
                                <div>
                                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-2">KYC Status</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateVendor(v.id, { kycStatus: 'approved' })}
                                            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${v.kycStatus === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-black/30 text-[var(--color-slate)] hover:bg-white/5'}`}
                                        >
                                            <CheckCircle className="w-3 h-3" /> Approved
                                        </button>
                                        <button
                                            onClick={() => updateVendor(v.id, { kycStatus: 'rejected' })}
                                            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${v.kycStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-black/30 text-[var(--color-slate)] hover:bg-white/5'}`}
                                        >
                                            <XCircle className="w-3 h-3" /> Rejected
                                        </button>
                                    </div>
                                    {v.kycStatus === 'pending' && <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Awaiting KYC Review</p>}
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-2">Agreement</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateVendor(v.id, { agreementStatus: v.agreementStatus === 'signed' ? 'unsigned' : 'signed' })}
                                            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${v.agreementStatus === 'signed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-black/30 text-[var(--color-slate)] border border-white/10 hover:bg-white/5'}`}
                                        >
                                            {v.agreementStatus === 'signed' ? 'Signed & On File' : 'Mark as Signed'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Economy & Scores */}
                            <div className="space-y-4 flex-1">
                                <div>
                                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-1">Commission Rate Override (%)</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="Global Default"
                                            defaultValue={v.commissionRate || ''}
                                            onBlur={(e) => updateVendor(v.id, { commissionRate: e.target.value ? parseFloat(e.target.value) : null })}
                                            className="w-32 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-gold)] text-sm"
                                        />
                                        <span className="text-xs text-[var(--color-slate)]">Leave blank for global</span>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Reliability Scores</p>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                            <p className="text-[10px] text-[var(--color-slate)] mb-1">Delivery Time (0-100)</p>
                                            <input
                                                type="number" max={100} min={0} defaultValue={v.scoreDelivery}
                                                onBlur={(e) => updateVendor(v.id, { scoreDelivery: parseInt(e.target.value) })}
                                                className="w-full bg-transparent outline-none font-bold text-[var(--color-gold)] text-sm"
                                            />
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                            <p className="text-[10px] text-[var(--color-slate)] mb-1">Item Condition (0-100)</p>
                                            <input
                                                type="number" max={100} min={0} defaultValue={v.scoreCondition}
                                                onBlur={(e) => updateVendor(v.id, { scoreCondition: parseInt(e.target.value) })}
                                                className="w-full bg-transparent outline-none font-bold text-[var(--color-gold)] text-sm"
                                            />
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                            <p className="text-[10px] text-[var(--color-slate)] mb-1">Rating (0.0-5.0)</p>
                                            <input
                                                type="number" step="0.1" max={5} min={0} defaultValue={v.scoreRating}
                                                onBlur={(e) => updateVendor(v.id, { scoreRating: parseFloat(e.target.value) })}
                                                className="w-full bg-transparent outline-none font-bold text-[var(--color-gold)] text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
