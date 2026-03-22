"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { 
    X, User, ShieldCheck, ShieldAlert, FileText, 
    Banknote, History, CheckCircle2, ExternalLink, 
    TrendingUp, Save, Loader2, AlertCircle, Info,
    Eye, MoreHorizontal, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface VendorDrillDownProps {
    isOpen: boolean;
    onClose: () => void;
    vendorId: string;
    onUpdate: () => void;
}

export function VendorDrillDown({ isOpen, onClose, vendorId, onUpdate }: VendorDrillDownProps) {
    const [vendor, setVendor] = useState<any>(null);
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states for Tab 2 (Commission)
    const [commData, setCommData] = useState({
        type: "percentage",
        value: 20
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vRes, lRes] = await Promise.all([
                fetch(`/api/admin/vendors/${vendorId}`),
                fetch(`/api/admin/vendors/${vendorId}/ledger`)
            ]);
            const vData = await vRes.json();
            const lData = await lRes.json();
            
            setVendor(vData.vendor);
            setLedger(lData.ledger || []);
            setCommData({
                type: vData.vendor?.commissionType || "percentage",
                value: vData.vendor?.commissionValue || 20
            });
        } catch (err) {
            console.error("Failed to fetch vendor drill-down data", err);
            toast.error("Audit fetch failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && vendorId) {
            fetchData();
        }
    }, [isOpen, vendorId]);

    const handleUpdateStatus = async (status: string, kyc: string) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storeStatus: status, kycStatus: kyc })
            });
            if (res.ok) {
                toast.success("Security status synchronized");
                fetchData();
                onUpdate();
            }
        } catch (err) {
            toast.error("State transition failed");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCommission = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/vendors/${vendorId}/commission`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    commissionType: commData.type, 
                    commissionValue: Number(commData.value) 
                })
            });
            if (res.ok) {
                toast.success("Financial agreement updated");
                onUpdate();
            }
        } catch (err) {
            toast.error("Rule save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleApproveSettlement = async (sId: string) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/settlements/${sId}/approve`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminNotes: "Verified by Super Admin" })
            });
            if (res.ok) {
                toast.success("Debt cleared successfully");
                fetchData();
                onUpdate();
            }
        } catch (err) {
            toast.error("Settlement failed");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal forceMount>
                <Dialog.Overlay asChild>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]" 
                    />
                </Dialog.Overlay>
                <Dialog.Content asChild>
                    <motion.div 
                        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-4xl bg-[#0A0F1C] border-l border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[111] focus:outline-none flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[24px] overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-2xl">
                                    {vendor?.logoUrl ? <img src={vendor.logoUrl} className="w-full h-full object-contain" /> : <User className="w-8 h-8 text-[var(--color-slate)]" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Dialog.Title className="text-2xl font-black text-white tracking-tight">{vendor?.companyName || "Operational Node"}</Dialog.Title>
                                        <StatusBadge status={vendor?.storeStatus} />
                                    </div>
                                    <p className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest">{vendor?.user?.email} • ID: {vendorId.split("-")[0]}</p>
                                </div>
                            </div>
                            <Dialog.Close asChild>
                                <button className="p-3 rounded-full hover:bg-white/10 transition-colors text-[var(--color-slate)]">
                                    <X className="w-6 h-6" />
                                </button>
                            </Dialog.Close>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-10 h-10 text-[var(--color-gold)] animate-spin" />
                                <p className="text-[var(--color-slate)] font-black text-[10px] uppercase tracking-widest">Opening Secure Core...</p>
                            </div>
                        ) : (
                            <Tabs.Root defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
                                <Tabs.List className="flex px-8 border-b border-white/5 bg-white/[0.01]">
                                    <TabTrigger value="profile" icon={User} label="Profile & KYC" />
                                    <TabTrigger value="commission" icon={TrendingUp} label="Commission Matrix" />
                                    <TabTrigger value="ledger" icon={History} label="Project Ledger" />
                                    <TabTrigger value="settlements" icon={Banknote} label="Settlements" />
                                </Tabs.List>

                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <Tabs.Content value="profile" className="p-8 space-y-10 animate-fade-in">
                                        {/* Decision Bar */}
                                        <div className="flex items-center justify-between p-6 rounded-[32px] bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 shadow-lg shadow-gold/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold)]/10 flex items-center justify-center">
                                                    <ShieldCheck className="w-6 h-6 text-[var(--color-gold)]" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-tighter">Onboarding Authority</h4>
                                                    <p className="text-xs text-[var(--color-slate)]">KYC Status: <span className={cn("font-bold uppercase", vendor?.kycStatus === 'approved' ? "text-emerald-400" : "text-yellow-400")}>{vendor?.kycStatus}</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                {vendor?.kycStatus !== "approved" && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus("active", "approved")}
                                                        disabled={saving}
                                                        className="px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                                    >
                                                        Approve Node
                                                    </button>
                                                )}
                                                {vendor?.storeStatus === "active" ? (
                                                    <button 
                                                        onClick={() => handleUpdateStatus("suspended", vendor?.kycStatus)}
                                                        disabled={saving}
                                                        className="px-6 py-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                                    >
                                                        Suspend Ops
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleUpdateStatus("active", vendor?.kycStatus)}
                                                        disabled={saving}
                                                        className="px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                                    >
                                                        Reactivate
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* KYC Documents */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <DocCard title="CR / Trade License" url={vendor?.companyRegistrationUrl} expiry={vendor?.companyRegistrationExpiry} />
                                            <DocCard title="Tax ID Card" url={vendor?.taxCardUrl} expiry={vendor?.taxCardExpiry} />
                                        </div>

                                        {/* Banking Information */}
                                        <div className="glass p-8 rounded-[40px] border border-white/5">
                                            <h4 className="text-sm font-black text-[var(--color-gold)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <Banknote className="w-4 h-4" /> Final Payout Node
                                            </h4>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                                                <InfoBlock label="Beneficiary" value={vendor?.accountName || vendor?.companyName} />
                                                <InfoBlock label="Bank Name" value={vendor?.bankName} />
                                                <InfoBlock label="IBAN Number" value={vendor?.iban} className="col-span-2 tracking-widest text-[var(--color-gold)]" />
                                                <InfoBlock label="SWIFT/BIC" value={vendor?.swift} />
                                            </div>
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="commission" className="p-8 space-y-10 animate-fade-in">
                                        <div className="max-w-xl space-y-8">
                                            <div>
                                                <h3 className="text-xl font-black text-white tracking-tight mb-2">Financial Agreement</h3>
                                                <p className="text-sm text-[var(--color-slate)]">Configure the platform's cut for every transaction executed by this vendor.</p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Rule Type</label>
                                                    <select 
                                                        value={commData.type}
                                                        onChange={(e) => setCommData({...commData, type: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[var(--color-gold)] outline-none cursor-pointer"
                                                    >
                                                        <option value="percentage">Dynamic Percentage Markup</option>
                                                        <option value="fixed_per_item">Flat Fee per Item</option>
                                                        <option value="per_project_fee">Flat Management Fee per Project</option>
                                                        <option value="fixed_monthly">SaaS Monthly Slot</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">
                                                        {commData.type === 'percentage' ? "Markup Value (%)" : "Flat Value (QAR)"}
                                                    </label>
                                                    <div className="relative">
                                                        <input 
                                                            type="number"
                                                            value={commData.value}
                                                            onChange={(e) => setCommData({...commData, value: Number(e.target.value)})}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-[var(--color-gold)] focus:border-[var(--color-gold)] outline-none"
                                                        />
                                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--color-slate)] font-black uppercase text-xs">
                                                            {commData.type === 'percentage' ? "%" : "QAR"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={handleSaveCommission}
                                                    disabled={saving}
                                                    className="btn-primary w-full py-5 rounded-[24px] flex items-center justify-center gap-3 disabled:opacity-50"
                                                >
                                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                    <span className="font-black uppercase tracking-widest text-sm">Synchronize Fiscal Rules</span>
                                                </button>
                                            </div>
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="ledger" className="p-0 animate-fade-in">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Quote Reference</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Transaction Value</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">E3 Cut</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Date</th>
                                                        <th className="px-8 py-5 text-right text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {ledger.map(b => (
                                                        <tr key={b.id} className="hover:bg-white/[0.01] transition-colors group">
                                                            <td className="px-8 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-white font-bold">{b.projectName}</span>
                                                                    <span className="text-[10px] text-[var(--color-gold)] font-black uppercase opacity-60">#{b.id.split("-")[0]}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-sm font-bold text-white">{(b.totalPrice || 0).toLocaleString()} <span className="text-[10px] opacity-40">QAR</span></span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-sm font-black text-emerald-400">{(b.settlement?.amountOwed || 0).toLocaleString()} <span className="text-[10px] opacity-40">QAR</span></span>
                                                            </td>
                                                            <td className="px-8 py-5 text-[10px] text-[var(--color-slate)] font-bold uppercase tracking-tighter">
                                                                {format(new Date(b.createdAt), "MMM d, yyyy")}
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <a href={`/admin/bookings/${b.id}`} className="text-white/20 hover:text-[var(--color-gold)] transition-colors">
                                                                    <ArrowUpRight className="w-5 h-5 ml-auto" />
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="settlements" className="p-0 animate-fade-in">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Reference</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Amount</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Evidence</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Status</th>
                                                        <th className="px-8 py-5 text-right text-[9px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em]">Fiscal Ops</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {ledger.filter(b => b.settlement).map(b => (
                                                        <tr key={b.settlement.id} className="hover:bg-white/[0.01] transition-colors group">
                                                            <td className="px-8 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-white font-bold">{b.projectName}</span>
                                                                    <span className="text-[9px] text-[var(--color-slate)] font-black uppercase opacity-60 italic">
                                                                        ID: {b.settlement.id.split("-")[0]}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-sm font-black text-[var(--color-gold)]">{(b.settlement.amountOwed || 0).toLocaleString()} <span className="text-[10px] opacity-40">QAR</span></span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                {b.settlement.paymentEvidenceUrl ? (
                                                                    <a 
                                                                        href={b.settlement.paymentEvidenceUrl} 
                                                                        target="_blank" 
                                                                        className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline"
                                                                    >
                                                                        View Receipt <ExternalLink className="w-3.5 h-3.5" />
                                                                    </a>
                                                                ) : <span className="text-[10px] font-black text-[var(--color-slate)] uppercase italic">No Proof</span>}
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <CollectionStatus status={b.settlement.status} />
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                {b.settlement.status === "submitted_for_review" && (
                                                                    <button 
                                                                        onClick={() => handleApproveSettlement(b.settlement.id)}
                                                                        disabled={saving}
                                                                        className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 hover:text-[var(--color-navy)] transition-all"
                                                                    >
                                                                        Clear Debt
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Tabs.Content>
                                </div>
                            </Tabs.Root>
                        )}
                    </motion.div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function TabTrigger({ value, icon: Icon, label }: any) {
    return (
        <Tabs.Trigger 
            value={value}
            className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative border-r border-white/5 data-[state=active]:text-[var(--color-gold)] data-[state=active]:bg-white/[0.02] data-[state=inactive]:text-[var(--color-slate)]"
        >
            <div className="flex items-center gap-3">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
            <Tabs.Content value={value} asChild>
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--color-gold)] opacity-100" />
            </Tabs.Content>
        </Tabs.Trigger>
    );
}

function DocCard({ title, url, expiry }: any) {
    return (
        <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/10 group">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">{title}</h4>
                {expiry && (
                    <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        Exp: {format(new Date(expiry), "MMM yyyy")}
                    </span>
                )}
            </div>
            {url ? (
                <div className="aspect-video relative rounded-2xl overflow-hidden bg-black/40 border border-white/5 group-hover:border-[var(--color-gold)]/30 transition-all">
                    <img src={url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <a href={url} target="_blank" className="btn-primary p-3 rounded-full flex items-center justify-center">
                            <Eye className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            ) : (
                <div className="aspect-video rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center gap-3 text-[var(--color-slate)]/40">
                    <ShieldAlert className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Document Missing</span>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: any) {
    const config = {
        active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]",
        suspended: "text-red-400 bg-red-400/10 border-red-400/20",
        pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    } as any;

    return (
        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", config[status] || config.pending)}>
            {status}
        </span>
    );
}

function InfoBlock({ label, value, className }: any) {
    return (
        <div className={cn("space-y-1", className)}>
            <p className="text-[10px] text-[var(--color-slate)] font-black uppercase tracking-tighter opacity-60">{label}</p>
            <p className="text-sm font-bold text-white break-all">{value || "---"}</p>
        </div>
    );
}

function CollectionStatus({ status }: any) {
    const config = {
        pending: "text-yellow-400 border-yellow-400/20",
        submitted_for_review: "text-blue-400 border-blue-400/20",
        approved_paid: "text-emerald-400 border-emerald-400/20",
        overdue: "text-red-400 border-red-400/20 animate-pulse",
    } as any;

    return (
        <span className={cn("text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full inline-block", config[status])}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}
