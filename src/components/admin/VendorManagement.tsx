"use client";

import React, { useState, useEffect } from "react";
import { Store, CheckCircle, XCircle, TrendingUp, AlertTriangle, Key, Mail, User, Shield } from "lucide-react";

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

    const handleResetPassword = async (userId: string, email: string) => {
        const newPassword = prompt(`Enter new password for ${email}:`);
        if (!newPassword) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passwordReset: newPassword }),
            });
            if (res.ok) {
                alert("Password reset successfully.");
            } else {
                alert("Failed to reset password.");
            }
        } catch (err) {
            console.error("Failed to reset password", err);
            alert("Error resetting password.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Store className="w-6 h-6 text-[var(--color-gold)]" />
                        Vendor Account Profiles
                    </h2>
                    <p className="text-sm text-[var(--color-slate)]">Manage vendor credentials, access roles, and platform health.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-8 text-center text-[var(--color-slate)] border border-white/5 rounded-xl bg-black/20">Loading accounts...</div>
                ) : vendors.length === 0 ? (
                    <div className="p-8 text-center text-[var(--color-slate)] border border-white/5 rounded-xl bg-black/20">No vendor accounts found.</div>
                ) : vendors.map(v => {
                    const vendor = v.vendor;
                    const user = v.user;
                    
                    return (
                        <div key={vendor.id} className="glass border border-white/10 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield className="w-24 h-24" />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
                                {/* Vendor Account Info */}
                                <div className="space-y-4 max-w-sm">
                                    <div>
                                        <h3 className="text-xl font-bold text-[var(--color-warm-white)]">{vendor.companyName}</h3>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <p className="text-sm text-[var(--color-gold)] flex items-center gap-2 font-mono bg-black/20 w-fit px-2 py-0.5 rounded border border-white/5">
                                                <Mail className="w-3.5 h-3.5" /> {user?.email || 'N/A'}
                                            </p>
                                            <p className="text-xs text-[var(--color-slate)] flex items-center gap-2">
                                                <User className="w-3.5 h-3.5" /> Account Holder: {user?.name || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <button
                                            onClick={() => handleResetPassword(vendor.userId, user?.email || '')}
                                            className="px-3 py-1.5 text-xs rounded-lg font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-2"
                                        >
                                            <Key className="w-3.5 h-3.5" /> Reset Password
                                        </button>
                                        <div className="text-[10px] text-[var(--color-slate)] flex items-center px-3 py-1.5 border border-white/5 bg-white/5 rounded-lg">
                                            Status: {vendor.storeStatus.toUpperCase()}
                                        </div>
                                    </div>

                                    <p className="text-xs text-[var(--color-slate)] pt-2 border-t border-white/5">
                                        Joined {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>

                                {/* Status & Security */}
                                <div className="space-y-4 min-w-[200px]">
                                    <div>
                                        <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-2">Account Status</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateVendor(vendor.id, { kycStatus: 'approved' })}
                                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${vendor.kycStatus === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-black/30 text-[var(--color-slate)] hover:bg-white/5'}`}
                                            >
                                                <CheckCircle className="w-3 h-3" /> KYC Approved
                                            </button>
                                            <button
                                                onClick={() => updateVendor(vendor.id, { kycStatus: 'rejected' })}
                                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${vendor.kycStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-black/30 text-[var(--color-slate)] hover:bg-white/5'}`}
                                            >
                                                <XCircle className="w-3 h-3" /> KYC Rejected
                                            </button>
                                        </div>
                                        {vendor.kycStatus === 'pending' && <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Awaiting KYC Review</p>}
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-2">Active Agreement</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateVendor(vendor.id, { agreementStatus: vendor.agreementStatus === 'signed' ? 'unsigned' : 'signed' })}
                                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${vendor.agreementStatus === 'signed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-black/30 text-[var(--color-slate)] border border-white/10 hover:bg-white/5'}`}
                                            >
                                                {vendor.agreementStatus === 'signed' ? 'Verified Agreement' : 'Mark as Verified'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Platform Health & Performance */}
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Reliability Scores</p>
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                                <p className="text-[10px] text-[var(--color-slate)] mb-1">Delivery Time</p>
                                                <input
                                                    type="number" max={100} min={0} defaultValue={vendor.scoreDelivery}
                                                    onBlur={(e) => updateVendor(vendor.id, { scoreDelivery: parseInt(e.target.value) })}
                                                    className="w-full bg-transparent outline-none font-bold text-[var(--color-gold)] text-sm"
                                                />
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                                <p className="text-[10px] text-[var(--color-slate)] mb-1">Condition</p>
                                                <input
                                                    type="number" max={100} min={0} defaultValue={vendor.scoreCondition}
                                                    onBlur={(e) => updateVendor(vendor.id, { scoreCondition: parseInt(e.target.value) })}
                                                    className="w-full bg-transparent outline-none font-bold text-[var(--color-gold)] text-sm"
                                                />
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                                <p className="text-[10px] text-[var(--color-slate)] mb-1">Rating</p>
                                                <input
                                                    type="number" step="0.1" max={5} min={0} defaultValue={vendor.scoreRating}
                                                    onBlur={(e) => updateVendor(vendor.id, { scoreRating: parseFloat(e.target.value) })}
                                                    className="w-full bg-transparent outline-none font-bold text-[var(--color-gold)] text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                        <span className="text-xs text-[var(--color-slate)] uppercase tracking-tighter font-bold">Outstanding Commission</span>
                                        <span className="text-sm font-mono text-red-400 font-bold">£{v.amountOwed?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
