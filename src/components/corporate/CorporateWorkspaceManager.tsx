"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
    Building2, 
    CreditCard, 
    Users, 
    Layers, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Plus, 
    ShieldCheck, 
    TrendingUp, 
    Clock, 
    FileSpreadsheet, 
    UserPlus, 
    ChevronRight, 
    DollarSign,
    RefreshCw,
    SlidersHorizontal,
    ArrowUpRight
} from "lucide-react";
import { toast } from "react-hot-toast";

interface CorporateWorkspaceManagerProps {
    currentUser: any;
}

export default function CorporateWorkspaceManager({ currentUser }: CorporateWorkspaceManagerProps) {
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<any>(null);
    const [membership, setMembership] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"approvals" | "costCenters" | "members" | "settings">("approvals");

    // Modal states
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showAddCostCenter, setShowAddCostCenter] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [newOrgData, setNewOrgData] = useState({
        name: "",
        crNumber: "",
        taxId: "",
        billingAddress: "",
        creditLimit: 100000,
        approvalThresholdAmount: 5000,
        paymentTerms: "net_30",
    });

    const [newMemberData, setNewMemberData] = useState({
        email: "",
        role: "member",
        title: "Requisition Officer",
        spendLimitPerBooking: 10000,
        canApprove: false,
    });

    const [newCostCenterData, setNewCostCenterData] = useState({
        code: "",
        name: "",
        budgetAmount: 50000,
    });

    const fetchOrgData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/corporate/organization");
            const data = await res.json();
            if (data.organization) {
                setOrganization(data.organization);
                setMembership(data.membership);
            } else {
                setOrganization(null);
                setMembership(null);
            }
        } catch (err: any) {
            console.error("Failed to load corporate details:", err);
            toast.error("Failed to load corporate profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgData();
    }, []);

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/corporate/organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newOrgData),
            });
            const data = await res.json();
            if (res.ok && data.organization) {
                toast.success("Corporate Account created successfully!");
                setOrganization(data.organization);
                setShowOnboarding(false);
                fetchOrgData();
            } else {
                toast.error(data.error || "Failed to create organization");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to establish corporate workspace");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/corporate/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId: organization.id,
                    ...newMemberData,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Team member enrolled into corporate workspace!");
                setShowAddMember(false);
                setNewMemberData({
                    email: "",
                    role: "member",
                    title: "Requisition Officer",
                    spendLimitPerBooking: 10000,
                    canApprove: false,
                });
                fetchOrgData();
            } else {
                toast.error(data.error || "Failed to add member");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to invite member");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCostCenter = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/corporate/cost-centers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId: organization.id,
                    ...newCostCenterData,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Cost center allocated!");
                setShowAddCostCenter(false);
                setNewCostCenterData({
                    code: "",
                    name: "",
                    budgetAmount: 50000,
                });
                fetchOrgData();
            } else {
                toast.error(data.error || "Failed to create cost center");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to add cost center");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprovalDecision = async (requestId: string, action: "approve" | "reject") => {
        try {
            const note = prompt(`Enter optional decision remarks for this requisition (${action}):`) || "";
            const res = await fetch(`/api/corporate/approvals/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, notes: note }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(action === "approve" ? "Requisition Approved & Commercial Sign-off Authorized!" : "Requisition Rejected");
                fetchOrgData();
            } else {
                toast.error(data.error || "Failed to update requisition status");
            }
        } catch (err: any) {
            toast.error(err.message || "Error processing decision");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-slate">
                <RefreshCw className="w-8 h-8 animate-spin text-gold" />
                <span className="ml-3 font-mono text-sm tracking-wider uppercase">Loading Corporate Workspace...</span>
            </div>
        );
    }

    // Onboarding Screen if no Corporate Profile exists
    if (!organization) {
        return (
            <div className="max-w-4xl mx-auto p-8 animate-fade-up">
                <div className="p-8 md:p-12 rounded-[2.5rem] bg-surface/50 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">B2B Enterprise Portal</span>
                            <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black text-white uppercase italic tracking-tight">
                                Corporate Account Workspace
                            </h1>
                        </div>
                    </div>

                    <p className="text-slate text-sm leading-relaxed mb-8 max-w-2xl font-medium">
                        Elevate your enterprise operations with consolidated invoicing, Net-30 credit facilities, cost center budget tracking, and multi-tier approval sign-offs for team equipment requisitions.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <CreditCard className="w-5 h-5 text-gold mb-2" />
                            <h4 className="text-xs font-bold text-white mb-1">Corporate Credit Line</h4>
                            <p className="text-[11px] text-slate-400">Streamlined checkout against pre-authorized credit limits without upfront card payments.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <Layers className="w-5 h-5 text-gold mb-2" />
                            <h4 className="text-xs font-bold text-white mb-1">Cost Center Budgets</h4>
                            <p className="text-[11px] text-slate-400">Attribute event rentals to specific project codes and track departmental burn rates.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <ShieldCheck className="w-5 h-5 text-gold mb-2" />
                            <h4 className="text-xs font-bold text-white mb-1">Multi-Tier Approvals</h4>
                            <p className="text-[11px] text-slate-400">Enforce managerial sign-offs whenever orders exceed set requisition thresholds.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="px-8 py-4 rounded-2xl bg-gold text-navy font-black text-xs uppercase tracking-[0.25em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 flex items-center gap-2"
                    >
                        Establish Corporate Workspace
                        <ArrowUpRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Onboarding Modal */}
                {showOnboarding && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-navy border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">
                                Register Corporate Account
                            </h2>
                            <p className="text-xs text-slate mb-6">
                                Establish your enterprise profile to activate team delegation and credit terms.
                            </p>

                            <form onSubmit={handleCreateOrganization} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                        Company / Entity Legal Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newOrgData.name}
                                        onChange={e => setNewOrgData({ ...newOrgData, name: e.target.value })}
                                        placeholder="e.g. Al Rayyan Media Productions W.L.L."
                                        className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                            CR Number (Qatar)
                                        </label>
                                        <input
                                            type="text"
                                            value={newOrgData.crNumber}
                                            onChange={e => setNewOrgData({ ...newOrgData, crNumber: e.target.value })}
                                            placeholder="e.g. 129482/01"
                                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                            Tax ID / TIN
                                        </label>
                                        <input
                                            type="text"
                                            value={newOrgData.taxId}
                                            onChange={e => setNewOrgData({ ...newOrgData, taxId: e.target.value })}
                                            placeholder="e.g. QA-TAX-8921"
                                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                        Billing Address & Location
                                    </label>
                                    <input
                                        type="text"
                                        value={newOrgData.billingAddress}
                                        onChange={e => setNewOrgData({ ...newOrgData, billingAddress: e.target.value })}
                                        placeholder="e.g. Lusail Marina Tower, Floor 14, Doha, Qatar"
                                        className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                            Requested Credit Limit (QAR)
                                        </label>
                                        <input
                                            type="number"
                                            value={newOrgData.creditLimit}
                                            onChange={e => setNewOrgData({ ...newOrgData, creditLimit: Number(e.target.value) })}
                                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                            Approval Threshold (QAR)
                                        </label>
                                        <input
                                            type="number"
                                            value={newOrgData.approvalThresholdAmount}
                                            onChange={e => setNewOrgData({ ...newOrgData, approvalThresholdAmount: Number(e.target.value) })}
                                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowOnboarding(false)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 text-slate font-black text-xs uppercase tracking-wider hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        {isSubmitting ? "Creating..." : "Confirm & Setup"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const creditLimit = Number(organization.creditLimit) || 100000;
    const creditUsed = Number(organization.creditUsed) || 0;
    const creditAvailable = Math.max(0, creditLimit - creditUsed);
    const utilizationPct = Math.min(100, Math.round((creditUsed / creditLimit) * 100));

    const canManage = membership?.role === "org_admin" || ["admin", "super_admin"].includes(currentUser?.role);
    const canApprove = membership?.canApprove || canManage;

    const pendingRequests = organization.approvalRequests?.filter((r: any) => r.status === "pending") || [];
    const allRequests = organization.approvalRequests || [];

    return (
        <div className="space-y-8 animate-fade-up max-w-7xl mx-auto">
            {/* Header / Banner */}
            <div className="p-8 rounded-[2.5rem] bg-navy border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gold/10 border border-gold/20 text-gold flex items-center gap-1.5">
                                <Building2 className="w-3 h-3" /> Corporate Enterprise
                            </span>
                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                {organization.status?.toUpperCase() || "ACTIVE"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                                CR: {organization.crNumber || "N/A"}
                            </span>
                        </div>
                        <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black text-white uppercase italic tracking-tight">
                            {organization.name}
                        </h1>
                        <p className="text-xs text-slate mt-1 font-medium flex items-center gap-2">
                            <span>Terms: <strong className="text-white uppercase">{organization.paymentTerms?.replace("_", " ")}</strong></span>
                            <span>•</span>
                            <span>Sign-Off Threshold: <strong className="text-gold">{Number(organization.approvalThresholdAmount).toLocaleString()} QAR</strong></span>
                            <span>•</span>
                            <span>Your Role: <strong className="text-white uppercase">{membership?.role?.replace("_", " ") || "Member"}</strong></span>
                        </p>
                    </div>

                    {/* Credit Line Quick Gauge */}
                    <div className="w-full lg:w-96 p-5 rounded-2xl bg-surface/80 border border-white/10 backdrop-blur-md">
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-slate font-bold uppercase tracking-wider text-[10px]">Corporate Credit Line</span>
                            <span className="font-mono text-gold font-black">{utilizationPct}% Used</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden mb-3 border border-white/5">
                            <div 
                                className={`h-full transition-all duration-500 ${
                                    utilizationPct > 85 ? "bg-red-500" : utilizationPct > 60 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${utilizationPct}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-3 text-center gap-1 text-[11px]">
                            <div>
                                <span className="block text-[9px] text-slate uppercase">Total Limit</span>
                                <span className="font-mono font-bold text-white">{creditLimit.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] text-slate uppercase">Drawn</span>
                                <span className="font-mono font-bold text-amber-400">{creditUsed.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] text-slate uppercase">Available</span>
                                <span className="font-mono font-bold text-emerald-400">{creditAvailable.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("approvals")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === "approvals" ? "bg-gold text-navy shadow-lg" : "text-slate hover:text-white bg-white/5"
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Requisitions ({pendingRequests.length} Pending)
                    </button>
                    <button
                        onClick={() => setActiveTab("costCenters")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === "costCenters" ? "bg-gold text-navy shadow-lg" : "text-slate hover:text-white bg-white/5"
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        Cost Centers ({organization.costCenters?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab("members")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === "members" ? "bg-gold text-navy shadow-lg" : "text-slate hover:text-white bg-white/5"
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Team Members ({organization.members?.length || 0})
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchOrgData}
                        className="p-2.5 rounded-xl bg-white/5 text-slate hover:text-white transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* TAB 1: Approvals Queue */}
            {activeTab === "approvals" && (
                <div className="space-y-4 animate-fade-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                                Multi-Tier Approval Queue
                            </h2>
                            <p className="text-xs text-slate">
                                Review equipment requisition sign-offs triggered by spend limit policies.
                            </p>
                        </div>
                    </div>

                    {allRequests.length === 0 ? (
                        <div className="p-12 text-center rounded-3xl bg-surface/50 border border-white/5 text-slate">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
                            <h4 className="text-white font-bold text-sm mb-1">All Clear</h4>
                            <p className="text-xs">No pending requisition approval requests recorded for this organization.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface/50 shadow-xl">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate">
                                        <th className="p-4">Req # / Booking</th>
                                        <th className="p-4">Requested By</th>
                                        <th className="p-4">Cost Center</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Trigger Reason</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allRequests.map((req: any) => {
                                        const isPending = req.status === "pending";
                                        return (
                                            <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-4 font-mono font-bold text-white">
                                                    <div>#{req.id.slice(0, 8).toUpperCase()}</div>
                                                    <div className="text-[10px] text-slate-400 font-sans">
                                                        Booking #{req.bookingId?.slice(0, 8)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{req.requestedBy?.name || "Corporate User"}</div>
                                                    <div className="text-[10px] text-slate-400">{req.requestedBy?.email}</div>
                                                </td>
                                                <td className="p-4">
                                                    {req.costCenter ? (
                                                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-[10px] text-gold font-bold">
                                                            {req.costCenter.code}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 italic">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-mono font-bold text-gold text-sm">
                                                    {Number(req.amount).toLocaleString()} QAR
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[10px] text-amber-300 font-medium">
                                                        {req.thresholdTriggered ? "Exceeds Threshold (>5,000 QAR)" : "Policy Sign-off"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        req.status === "approved" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                                                        req.status === "rejected" ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                                                        "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {isPending && canApprove ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleApprovalDecision(req.id, "approve")}
                                                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-black text-[10px] uppercase tracking-wider transition-all"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleApprovalDecision(req.id, "reject")}
                                                                className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-black text-[10px] uppercase tracking-wider transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 text-[11px]">
                                                            {req.decidedAt ? new Date(req.decidedAt).toLocaleDateString() : "Pending"}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Cost Centers */}
            {activeTab === "costCenters" && (
                <div className="space-y-4 animate-fade-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                                Departmental Cost Centers
                            </h2>
                            <p className="text-xs text-slate">
                                Allocate rental expenses to specific project codes and track consumption against budgets.
                            </p>
                        </div>
                        {canManage && (
                            <button
                                onClick={() => setShowAddCostCenter(true)}
                                className="px-4 py-2 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" /> Add Cost Center
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(organization.costCenters || []).map((cc: any) => {
                            const budget = Number(cc.budgetAmount) || 0;
                            const spent = Number(cc.allocatedSpent) || 0;
                            const remaining = Math.max(0, budget - spent);
                            const ccPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                            return (
                                <div key={cc.id} className="p-6 rounded-3xl bg-surface/60 border border-white/10 shadow-lg space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/20 font-mono text-[10px] text-gold font-black">
                                                {cc.code}
                                            </span>
                                            <h3 className="text-base font-bold text-white mt-2">{cc.name}</h3>
                                        </div>
                                        <span className="text-[10px] text-slate font-mono uppercase">
                                            {cc.status}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-400">Budget Spent</span>
                                            <span className="font-mono text-white font-bold">{ccPct}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${ccPct > 80 ? "bg-red-500" : "bg-gold"}`}
                                                style={{ width: `${ccPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 pt-2 border-t border-white/5 text-xs">
                                        <div>
                                            <span className="text-[10px] text-slate uppercase block">Allocated</span>
                                            <span className="font-mono font-bold text-white">{budget.toLocaleString()} QAR</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate uppercase block">Remaining</span>
                                            <span className="font-mono font-bold text-emerald-400">{remaining.toLocaleString()} QAR</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 3: Team Members & Spend Limits */}
            {activeTab === "members" && (
                <div className="space-y-4 animate-fade-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                                Authorized Team Members & Limits
                            </h2>
                            <p className="text-xs text-slate">
                                Configure employee spend thresholds and designate internal proposal approvers.
                            </p>
                        </div>
                        {canManage && (
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="px-4 py-2 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-1.5"
                            >
                                <UserPlus className="w-4 h-4" /> Enroll Team Member
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface/50 shadow-xl">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate">
                                    <th className="p-4">Member Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Designation & Role</th>
                                    <th className="p-4">Spend Limit / Booking</th>
                                    <th className="p-4">Signing Authority</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(organization.members || []).map((m: any) => (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 font-bold text-white">
                                            {m.user?.name || "Corporate Associate"}
                                        </td>
                                        <td className="p-4 font-mono text-slate-300">
                                            {m.user?.email}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-white font-medium">{m.title || "Team Member"}</div>
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/5 text-gold">
                                                {m.role?.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-white">
                                            {Number(m.spendLimitPerBooking).toLocaleString()} QAR
                                        </td>
                                        <td className="p-4">
                                            {m.canApprove ? (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Approver
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-[10px]">No Authority</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-white/5 uppercase">
                                                {m.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Enroll Team Member */}
            {showAddMember && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-navy border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-1">
                            Enroll Corporate Member
                        </h2>
                        <p className="text-xs text-slate mb-6">
                            Grant team member access to book against company credit and cost centers.
                        </p>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newMemberData.email}
                                    onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })}
                                    placeholder="colleague@company.com"
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={newMemberData.role}
                                        onChange={e => setNewMemberData({ ...newMemberData, role: e.target.value })}
                                        className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                                    >
                                        <option value="member">Member</option>
                                        <option value="approver">Approver</option>
                                        <option value="finance">Finance Lead</option>
                                        <option value="org_admin">Organization Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newMemberData.title}
                                        onChange={e => setNewMemberData({ ...newMemberData, title: e.target.value })}
                                        placeholder="Project Director"
                                        className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                    Spend Limit per Booking (QAR)
                                </label>
                                <input
                                    type="number"
                                    value={newMemberData.spendLimitPerBooking}
                                    onChange={e => setNewMemberData({ ...newMemberData, spendLimitPerBooking: Number(e.target.value) })}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                                />
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                    Orders exceeding this amount automatically trigger approval review.
                                </span>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="canApproveCheck"
                                    checked={newMemberData.canApprove}
                                    onChange={e => setNewMemberData({ ...newMemberData, canApprove: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/10 bg-surface accent-gold"
                                />
                                <label htmlFor="canApproveCheck" className="text-xs text-white font-medium cursor-pointer">
                                    Designate as Authorized Proposal Approver
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMember(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-slate font-black text-xs uppercase tracking-wider hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    {isSubmitting ? "Enrolling..." : "Enroll Member"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Cost Center */}
            {showAddCostCenter && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-navy border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-1">
                            New Departmental Cost Center
                        </h2>
                        <p className="text-xs text-slate mb-6">
                            Create a ledger code to segment departmental equipment rental expenditure.
                        </p>

                        <form onSubmit={handleAddCostCenter} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                    Cost Center Code *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newCostCenterData.code}
                                    onChange={e => setNewCostCenterData({ ...newCostCenterData, code: e.target.value })}
                                    placeholder="e.g. CC-EXPO-2026"
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-gold font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                    Cost Center Description / Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newCostCenterData.name}
                                    onChange={e => setNewCostCenterData({ ...newCostCenterData, name: e.target.value })}
                                    placeholder="e.g. Doha Forum Exhibition Ops"
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate tracking-wider mb-1">
                                    Allocated Budget (QAR)
                                </label>
                                <input
                                    type="number"
                                    value={newCostCenterData.budgetAmount}
                                    onChange={e => setNewCostCenterData({ ...newCostCenterData, budgetAmount: Number(e.target.value) })}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold font-mono"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCostCenter(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-slate font-black text-xs uppercase tracking-wider hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl bg-gold text-navy font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    {isSubmitting ? "Allocating..." : "Create Cost Center"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
