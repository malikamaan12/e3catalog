"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2, User, Phone, Globe, Hash, FileText, ExternalLink, CheckCircle2, ShieldAlert, Save } from "lucide-react";
import { format } from "date-fns";

export default function AdminVendorDetail() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params?.id as string;

    const [vendor, setVendor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Form states
    const [kycStatus, setKycStatus] = useState("pending");
    const [storeStatus, setStoreStatus] = useState("offline");
    const [commissionRate, setCommissionRate] = useState<string>("");
    const [paymentTerms, setPaymentTerms] = useState<string>("");

    useEffect(() => {
        if (!vendorId) return;
        fetch(`/api/admin/vendors/${vendorId}`)
            .then(res => res.json())
            .then(data => {
                if (data.vendor) {
                    setVendor(data.vendor);
                    setKycStatus(data.vendor.kycStatus || "pending");
                    setStoreStatus(data.vendor.storeStatus || "offline");
                    setCommissionRate(data.vendor.commissionRate?.toString() || "");
                    setPaymentTerms(data.vendor.paymentTerms || "");
                }
                setLoading(false);
            })
            .catch(console.error);
    }, [vendorId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (kycStatus === "approved" && commissionRate === "") {
            setError("You must set a Commission Rate to approve a Vendor.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kycStatus,
                    storeStatus,
                    commissionRate,
                    paymentTerms
                })
            });

            if (!res.ok) throw new Error("Failed to update vendor settings");

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" />
            </div>
        );
    }

    if (!vendor) return <div className="text-white text-center py-20">Vendor Not Found</div>;

    const kycColors: Record<string, string> = {
        pending: "text-yellow-500",
        approved: "text-[var(--color-success)]",
        rejected: "text-[var(--color-danger)]",
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/vendors"
                    className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-slate)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] flex items-center gap-3">
                        {vendor.companyName}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-current uppercase font-bold tracking-widest ${kycColors[kycStatus] || "text-white"}`}>
                            {kycStatus}
                        </span>
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm mt-0.5 font-mono text-[10px]">ID: {vendor.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Data Read-only */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Identity Info */}
                    <section className="glass rounded-xl p-6">
                        <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> COMPANY & POC
                        </h2>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <p className="text-xs text-[var(--color-slate)] mb-1 uppercase tracking-widest font-bold">Company Name</p>
                                <p className="text-[var(--color-warm-white)] text-sm">{vendor.companyName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-slate)] mb-1 uppercase tracking-widest font-bold">Tax / CR Number</p>
                                <p className="text-[var(--color-warm-white)] text-sm font-mono">{vendor.taxId}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-slate)] mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><User className="w-3 h-3" /> Contact Person</p>
                                <p className="text-[var(--color-warm-white)] text-sm">{vendor.pocName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-slate)] mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</p>
                                <p className="text-[var(--color-warm-white)] text-sm font-mono">+974 {vendor.pocPhone}</p>
                            </div>
                            {vendor.website && (
                                <div className="col-span-2">
                                    <p className="text-xs text-[var(--color-slate)] mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Globe className="w-3 h-3" /> Website</p>
                                    <a href={vendor.website} target="_blank" rel="noreferrer" className="text-[var(--color-gold)] text-sm hover:underline">{vendor.website}</a>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* KYC Documents S3 */}
                    <section className="glass rounded-xl p-6">
                        <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" /> REGULATORY COMPLIANCE
                        </h2>
                        <div className="space-y-4">
                            {/* Tax Card File */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-navy-dark)] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--color-warm-white)]">Tax Registration Card</p>
                                        <p className="text-xs text-[var(--color-slate)] mt-0.5">Primary Verification Document</p>
                                    </div>
                                </div>
                                {vendor.taxCardUrl ? (
                                    <a href={vendor.taxCardUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--color-gold)] hover:underline border border-[var(--color-gold)]/30 px-3 py-1.5 rounded-lg">
                                        <ExternalLink className="w-3.5 h-3.5" /> View S3 Secure Link
                                    </a>
                                ) : (
                                    <span className="text-xs text-[var(--color-danger)] font-semibold">Missing Payload</span>
                                )}
                            </div>

                            {/* CR File */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-navy-dark)] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--color-warm-white)]">Commercial Registration</p>
                                        <p className="text-xs text-[var(--color-slate)] mt-0.5">Ministry of Commerce Identity</p>
                                    </div>
                                </div>
                                {vendor.companyRegistrationUrl ? (
                                    <a href={vendor.companyRegistrationUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--color-gold)] hover:underline border border-[var(--color-gold)]/30 px-3 py-1.5 rounded-lg">
                                        <ExternalLink className="w-3.5 h-3.5" /> View S3 Secure Link
                                    </a>
                                ) : (
                                    <span className="text-xs text-[var(--color-danger)] font-semibold">Missing Payload</span>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Edit Statuses Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSave} className="glass rounded-xl p-6 sticky top-28">
                        <h2 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-5">
                            APPROVAL SETTINGS
                        </h2>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[var(--color-danger)] text-xs font-medium">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-[var(--color-success)] text-xs font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Changes saved successfully
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* KYC Switch */}
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-bold uppercase tracking-widest">KYC Status</label>
                                <select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-navy-dark)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm">
                                    <option value="pending">Pending Review</option>
                                    <option value="approved">Approved & Verified</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>

                            {/* Store Switch */}
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-bold uppercase tracking-widest">Store Pipeline</label>
                                <select value={storeStatus} onChange={(e) => setStoreStatus(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-navy-dark)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm">
                                    <option value="offline">Offline / Hidden</option>
                                    <option value="active">Active Storefront</option>
                                </select>
                                <p className="text-[10px] text-[var(--color-slate)] mt-1">If offline, their products will not appear in the global catalog.</p>
                            </div>

                            <hr className="border-white/5" />

                            {/* Rates */}
                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-bold uppercase tracking-widest">Platform Commission (%) *</label>
                                <div className="relative">
                                    <input type="number" step="0.1" min="0" max="100" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-[var(--color-navy-dark)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm" placeholder="e.g. 15" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-slate)] text-sm">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-[var(--color-slate)] mb-1.5 block font-bold uppercase tracking-widest">Custom Terms Notes</label>
                                <textarea rows={3} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-navy-dark)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors text-sm placeholder:text-[var(--color-slate)] resize-none" placeholder="e.g. Net 30 days payout after invoice clearance..." />
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="btn-primary w-full justify-center mt-6">
                            {saving ? (
                                <><div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" /> Processing...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save Vendor Config</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
