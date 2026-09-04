"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ShieldAlert, Search, Loader2, Plus, X, CheckCircle2,
    Clock, ChevronDown, Save, Camera, ArrowRightLeft, MapPin,
    Wrench, Boxes, Zap, AlertTriangle, PenTool, CheckSquare,
    DollarSign, PackageCheck, FileText
} from "lucide-react";
import { format } from "date-fns";
import QRScannerModal from "@/components/warehouse/QRScannerModal";
import { DamageClaimModal } from "@/components/warehouse/DamageClaimModal";

type InspectionLog = {
    id: string;
    unitId: string;
    assetTagCode?: string;
    inspectorName: string | null;
    inspectionType: string;
    conditionBefore: string;
    conditionAfter: string;
    notes: string | null;
    createdAt: string;
};

type UnitLookup = {
    id: string;
    assetTagCode: string;
    productName: string | null;
    conditionStatus: string;
    availabilityStatus: string;
};

type WorkOrder = {
    id: string;
    workOrderNumber: string;
    unitId: string;
    technicianName: string | null;
    status: string;
    priority: string;
    reportedIssue: string;
    diagnosticNotes: string | null;
    resolutionNotes: string | null;
    laborHours: number;
    laborRatePerHour: number;
    totalPartsCost: number;
    totalRepairCost: number;
    electricalSafetyTested: boolean;
    patCertificateNumber: string | null;
    createdAt: string;
    unit?: {
        assetTagCode: string;
        product?: { name: string };
    };
    partsUsed?: Array<{
        id: string;
        quantityUsed: number;
        totalCost: number;
        sparePart?: { name: string; partNumber: string };
    }>;
};

type SparePart = {
    id: string;
    partNumber: string;
    name: string;
    category: string;
    stockQuantity: number;
    minStockThreshold: number;
    unitCost: number;
    isLowStock?: boolean;
};

type DamageClaim = {
    id: string;
    claimNumber: string;
    bookingId: string;
    inventoryUnitId: string | null;
    incidentDescription: string;
    severity: string;
    partsCost: number;
    laborCost: number;
    totalClaimAmount: number;
    securityDepositHeld: number;
    amountDeducted: number;
    amountRefunded: number;
    status: string;
    filedBy: string | null;
    createdAt: string;
    booking?: { id: string; customerName: string; projectName: string | null };
    inventoryUnit?: { id: string; assetTagCode: string };
};

const INSPECTION_TYPES = ["routine", "damage", "return", "pre_rental"];
const CONDITIONS = ["excellent", "good", "fair", "poor", "maintenance_required"];

const CONDITION_COLOR: Record<string, string> = {
    excellent: "text-emerald-400",
    good: "text-green-400",
    fair: "text-yellow-400",
    poor: "text-orange-400",
    maintenance_required: "text-red-400",
};

const TYPE_COLOR: Record<string, string> = {
    routine: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    damage: "bg-red-500/10 text-red-400 border-red-500/20",
    return: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pre_rental: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const PRIORITY_COLOR: Record<string, string> = {
    urgent: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function InspectionsPage() {
    const [mainTab, setMainTab] = useState<"inspections" | "work_orders" | "spare_parts" | "damage_claims">("inspections");

    // ─── Damage Claims State ───
    const [damageClaims, setDamageClaims] = useState<DamageClaim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [claimModalOpen, setClaimModalOpen] = useState(false);
    const [selectedClaimData, setSelectedClaimData] = useState<{
        bookingId?: string;
        unitId?: string;
        assetTag?: string;
        productName?: string;
    } | null>(null);

    // ─── Inspection Logs State ───
    const [logs, setLogs] = useState<InspectionLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [assetTagInput, setAssetTagInput] = useState("");
    const [lookupResult, setLookupResult] = useState<UnitLookup | null>(null);
    const [lookupError, setLookupError] = useState("");
    const [lookingUp, setLookingUp] = useState(false);
    const [inspType, setInspType] = useState("routine");
    const [condBefore, setCondBefore] = useState("good");
    const [condAfter, setCondAfter] = useState("good");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);

    // ─── Work Orders State ───
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
    const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);
    const [showNewWoModal, setShowNewWoModal] = useState(false);

    // New WO form
    const [woAssetTag, setWoAssetTag] = useState("");
    const [woUnit, setWoUnit] = useState<UnitLookup | null>(null);
    const [woIssue, setWoIssue] = useState("");
    const [woPriority, setWoPriority] = useState("medium");
    const [woTechName, setWoTechName] = useState("");
    const [creatingWo, setCreatingWo] = useState(false);

    // Update WO form
    const [updateStatus, setUpdateStatus] = useState("in_progress");
    const [diagnosticNotes, setDiagnosticNotes] = useState("");
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [laborHours, setLaborHours] = useState(0);
    const [patTested, setPatTested] = useState(false);
    const [patCertNum, setPatCertNum] = useState("");
    const [selectedPartId, setSelectedPartId] = useState("");
    const [partQuantity, setPartQuantity] = useState(1);
    const [updatingWo, setUpdatingWo] = useState(false);

    // ─── Spare Parts State ───
    const [parts, setParts] = useState<SparePart[]>([]);
    const [loadingParts, setLoadingParts] = useState(false);
    const [showAddPartModal, setShowAddPartModal] = useState(false);

    // New Part form
    const [partNumber, setPartNumber] = useState("");
    const [partName, setPartName] = useState("");
    const [partCategory, setPartCategory] = useState("cables");
    const [partStock, setPartStock] = useState(10);
    const [partMinThreshold, setPartMinThreshold] = useState(5);
    const [partCost, setPartCost] = useState(25);
    const [creatingPart, setCreatingPart] = useState(false);

    // ─── Data Loaders ───
    const loadLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const fleet = await fetch("/api/admin/fleet").then(r => r.json());
            if (!Array.isArray(fleet) || fleet.length === 0) { setLoadingLogs(false); return; }

            const first10 = fleet.slice(0, 10);
            const allLogs: InspectionLog[] = [];
            await Promise.all(first10.map(async (unit: any) => {
                try {
                    const res = await fetch(`/api/admin/fleet/inspection?unitId=${unit.id}`);
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        data.forEach((log: any) => allLogs.push({ ...log, assetTagCode: unit.assetTagCode }));
                    }
                } catch {}
            }));
            allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLogs(allLogs);
        } catch {}
        setLoadingLogs(false);
    }, []);

    const loadWorkOrders = useCallback(async () => {
        setLoadingWorkOrders(true);
        try {
            const res = await fetch("/api/admin/fleet/work-orders");
            const data = await res.json();
            if (data.workOrders) setWorkOrders(data.workOrders);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingWorkOrders(false);
        }
    }, []);

    const loadSpareParts = useCallback(async () => {
        setLoadingParts(true);
        try {
            const res = await fetch("/api/admin/fleet/spare-parts");
            const data = await res.json();
            if (data.parts) setParts(data.parts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingParts(false);
        }
    }, []);

    const loadDamageClaims = useCallback(async () => {
        setLoadingClaims(true);
        try {
            const res = await fetch("/api/warehouse/damage-claims");
            const data = await res.json();
            if (data.claims) setDamageClaims(data.claims);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingClaims(false);
        }
    }, []);

    useEffect(() => {
        if (mainTab === "inspections") { loadLogs(); loadDamageClaims(); }
        if (mainTab === "work_orders") { loadWorkOrders(); loadSpareParts(); }
        if (mainTab === "spare_parts") loadSpareParts();
        if (mainTab === "damage_claims") loadDamageClaims();
    }, [mainTab, loadLogs, loadWorkOrders, loadSpareParts, loadDamageClaims]);

    // ─── Inspection Handlers ───
    const handleInspectionScan = async (tag: string) => {
        setScannerOpen(false);
        setAssetTagInput(tag);
        setLookingUp(true);
        setLookupError("");
        setLookupResult(null);
        try {
            const res = await fetch(`/api/passport/${encodeURIComponent(tag)}`);
            const data = await res.json();
            if (res.ok) {
                setLookupResult({
                    id: data.id,
                    assetTagCode: data.assetTagCode,
                    productName: data.productName,
                    conditionStatus: data.conditionStatus,
                    availabilityStatus: data.availabilityStatus,
                });
                setCondBefore(data.conditionStatus || "good");
                setCondAfter(data.conditionStatus || "good");
            } else {
                setLookupError(data.error || "Asset not found.");
            }
        } catch {
            setLookupError("Network error.");
        }
        setLookingUp(false);
    };

    const lookupUnit = async () => {
        if (!assetTagInput.trim()) return;
        setLookingUp(true);
        setLookupError("");
        setLookupResult(null);
        try {
            const res = await fetch(`/api/passport/${encodeURIComponent(assetTagInput.trim())}`);
            const data = await res.json();
            if (res.ok) {
                setLookupResult({
                    id: data.id,
                    assetTagCode: data.assetTagCode,
                    productName: data.productName,
                    conditionStatus: data.conditionStatus,
                    availabilityStatus: data.availabilityStatus,
                });
                setCondBefore(data.conditionStatus || "good");
                setCondAfter(data.conditionStatus || "good");
            } else {
                setLookupError(data.error || "Asset not found.");
            }
        } catch {
            setLookupError("Network error.");
        }
        setLookingUp(false);
    };

    const submitInspection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupResult) return;
        setSubmitting(true);
        setSubmitMsg("");
        try {
            const res = await fetch("/api/admin/fleet/inspection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unitId: lookupResult.id,
                    inspectionType: inspType,
                    conditionBefore: condBefore,
                    conditionAfter: condAfter,
                    notes: notes || null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitMsg("Audit recorded. State machine synchronized.");
                setShowForm(false);
                setAssetTagInput("");
                setLookupResult(null);
                setNotes("");
                loadLogs();
            } else {
                setSubmitMsg(data.error || "Failed to record audit.");
            }
        } catch {
            setSubmitMsg("Network error.");
        }
        setSubmitting(false);
    };

    // ─── Work Order Handlers ───
    const lookupWoUnit = async () => {
        if (!woAssetTag.trim()) return;
        try {
            const res = await fetch(`/api/passport/${encodeURIComponent(woAssetTag.trim())}`);
            const data = await res.json();
            if (res.ok) {
                setWoUnit({
                    id: data.id,
                    assetTagCode: data.assetTagCode,
                    productName: data.productName,
                    conditionStatus: data.conditionStatus,
                    availabilityStatus: data.availabilityStatus,
                });
            } else {
                alert("Unit tag not found: " + (data.error || ""));
            }
        } catch {
            alert("Error looking up unit");
        }
    };

    const handleCreateWorkOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!woUnit) return;
        setCreatingWo(true);
        try {
            const res = await fetch("/api/admin/fleet/work-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unitId: woUnit.id,
                    reportedIssue: woIssue,
                    priority: woPriority,
                    technicianName: woTechName,
                }),
            });
            if (res.ok) {
                setShowNewWoModal(false);
                setWoAssetTag("");
                setWoUnit(null);
                setWoIssue("");
                loadWorkOrders();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create work order");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setCreatingWo(false);
        }
    };

    const handleOpenUpdateWo = (wo: WorkOrder) => {
        setSelectedWo(wo);
        setUpdateStatus(wo.status);
        setDiagnosticNotes(wo.diagnosticNotes || "");
        setResolutionNotes(wo.resolutionNotes || "");
        setLaborHours(wo.laborHours || 0);
        setPatTested(wo.electricalSafetyTested || false);
        setPatCertNum(wo.patCertificateNumber || "");
        setSelectedPartId("");
        setPartQuantity(1);
    };

    const handleUpdateWorkOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWo) return;
        setUpdatingWo(true);
        try {
            const payload: any = {
                status: updateStatus,
                diagnosticNotes,
                resolutionNotes,
                laborHours,
                electricalSafetyTested: patTested,
                patCertificateNumber: patCertNum,
            };

            if (selectedPartId && partQuantity > 0) {
                payload.newPartUsed = {
                    sparePartId: selectedPartId,
                    quantity: partQuantity,
                };
            }

            const res = await fetch(`/api/admin/fleet/work-orders/${selectedWo.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setSelectedWo(null);
                loadWorkOrders();
                loadSpareParts();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update work order");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUpdatingWo(false);
        }
    };

    // ─── Spare Part Handlers ───
    const handleCreatePart = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingPart(true);
        try {
            const res = await fetch("/api/admin/fleet/spare-parts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partNumber,
                    name: partName,
                    category: partCategory,
                    stockQuantity: partStock,
                    minStockThreshold: partMinThreshold,
                    unitCost: partCost,
                }),
            });
            if (res.ok) {
                setShowAddPartModal(false);
                setPartNumber("");
                setPartName("");
                loadSpareParts();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to add spare part");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setCreatingPart(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto px-4 py-8 text-[var(--color-warm-white)]">
            {/* Top Navigation Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black italic uppercase tracking-tight">
                        Fleet <span className="text-amber-400">QC & Maintenance</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                        Quality Inspections · Work Orders · Spare Parts · PAT Testing
                    </p>
                </div>

                {/* Main Navigation Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl self-start md:self-auto">
                    <button
                        onClick={() => setMainTab("inspections")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                            mainTab === "inspections" 
                                ? "bg-amber-500 text-slate-950 shadow-md" 
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Audits ({logs.length})
                    </button>
                    <button
                        onClick={() => setMainTab("work_orders")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                            mainTab === "work_orders" 
                                ? "bg-amber-500 text-slate-950 shadow-md" 
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Wrench className="w-4 h-4" />
                        Work Orders ({workOrders.length})
                    </button>
                    <button
                        onClick={() => setMainTab("spare_parts")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                            mainTab === "spare_parts" 
                                ? "bg-amber-500 text-slate-950 shadow-md" 
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Boxes className="w-4 h-4" />
                        Spare Parts ({parts.length})
                    </button>
                    <button
                        onClick={() => setMainTab("damage_claims")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                            mainTab === "damage_claims" 
                                ? "bg-red-500 text-white shadow-md" 
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Damage Claims ({damageClaims.length})
                    </button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                TAB 1: INSPECTION LOGS & QUALITY CHECK
            ───────────────────────────────────────────────────────────── */}
            {mainTab === "inspections" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Physical Asset Logs ({logs.length})
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setSelectedClaimData(null);
                                    setClaimModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-all shadow-md"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                File Damage Claim
                            </button>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                                    showForm
                                        ? "bg-slate-800 text-slate-300"
                                        : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                                }`}
                            >
                                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                {showForm ? "Cancel" : "New Physical Audit"}
                            </button>
                        </div>
                    </div>

                    {showForm && (
                        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-in slide-in-from-top-4 duration-300">
                            <h2 className="text-base font-black text-white uppercase italic text-amber-400">
                                Log Physical Equipment Inspection
                            </h2>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        value={assetTagInput}
                                        onChange={e => setAssetTagInput(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === "Enter" && lookupUnit()}
                                        placeholder="Scan or Enter Asset Tag (e.g. E3-ENT-001)"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                                    />
                                    <button
                                        onClick={() => setScannerOpen(true)}
                                        className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                                    >
                                        <Camera className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={lookupUnit}
                                        disabled={lookingUp || !assetTagInput.trim()}
                                        className="px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                    >
                                        Verify
                                    </button>
                                </div>

                                {lookupResult && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <div className="text-xs">
                                            <span className="font-bold">{lookupResult.assetTagCode}</span> — {lookupResult.productName}
                                            <div className="text-[11px] text-slate-400">Current Condition: {lookupResult.conditionStatus}</div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={submitInspection} className="space-y-4 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Inspection Context</label>
                                            <select
                                                value={inspType}
                                                onChange={e => setInspType(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                            >
                                                {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Condition Before</label>
                                            <select
                                                value={condBefore}
                                                onChange={e => setCondBefore(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                            >
                                                {CONDITIONS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Condition After</label>
                                            <select
                                                value={condAfter}
                                                onChange={e => setCondAfter(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                            >
                                                {CONDITIONS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Inspection Notes / Structural Observations</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="Cosmetic scratches, lens cleaned, cables coiled, clamp tested..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting || !lookupResult}
                                        className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Inspection Audit
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Logs List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingLogs ? (
                            <div className="col-span-full py-16 text-center text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                                Loading Inspections...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-slate-500 border border-slate-800 rounded-2xl">
                                No physical inspection records logged yet.
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-amber-400 text-xs">{log.assetTagCode || "–"}</span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${TYPE_COLOR[log.inspectionType] || "text-slate-400"}`}>
                                            {log.inspectionType}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={CONDITION_COLOR[log.conditionBefore]}>{log.conditionBefore}</span>
                                        <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                                        <span className={CONDITION_COLOR[log.conditionAfter]}>{log.conditionAfter}</span>
                                    </div>
                                    {log.notes && <p className="text-xs text-slate-300 italic">"{log.notes}"</p>}
                                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
                                        <span>Inspector: {log.inspectorName || "Staff"}</span>
                                        <div className="flex items-center gap-3">
                                            <span>{format(new Date(log.createdAt), "MMM d, HH:mm")}</span>
                                            {(log.inspectionType === "damage" || log.conditionAfter === "poor" || log.conditionAfter === "maintenance_required") && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedClaimData({
                                                            unitId: log.unitId,
                                                            assetTag: log.assetTagCode,
                                                        });
                                                        setClaimModalOpen(true);
                                                    }}
                                                    className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors"
                                                >
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Claim Deposit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 2: MAINTENANCE WORK ORDERS & REPAIRS
            ───────────────────────────────────────────────────────────── */}
            {mainTab === "work_orders" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Active Repair Work Orders ({workOrders.length})
                        </span>
                        <button
                            onClick={() => setShowNewWoModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
                        >
                            <Plus className="h-4 w-4" />
                            Create Work Order
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingWorkOrders ? (
                            <div className="col-span-full py-16 text-center text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                                Loading Work Orders...
                            </div>
                        ) : workOrders.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-slate-500 border border-slate-800 rounded-2xl">
                                No open maintenance tickets. All equipment in optimal working order.
                            </div>
                        ) : (
                            workOrders.map(wo => (
                                <div 
                                    key={wo.id}
                                    onClick={() => handleOpenUpdateWo(wo)}
                                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-3 shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-amber-400">{wo.workOrderNumber}</span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${PRIORITY_COLOR[wo.priority] || "text-slate-400"}`}>
                                            {wo.priority}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-white">{wo.unit?.product?.name || "Asset Unit"}</h3>
                                        <p className="text-xs font-mono text-slate-400">{wo.unit?.assetTagCode}</p>
                                    </div>

                                    <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                        {wo.reportedIssue}
                                    </p>

                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400">
                                        <span className="capitalize font-medium text-slate-200">{wo.status.replace("_", " ")}</span>
                                        <span className="font-mono text-emerald-400 font-bold">
                                            QAR {((wo.totalRepairCost || 0)).toFixed(2)}
                                        </span>
                                    </div>

                                    {wo.electricalSafetyTested && (
                                        <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-amber-400" /> PAT Electrical Safety Certified
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 3: SPARE PARTS INVENTORY
            ───────────────────────────────────────────────────────────── */}
            {mainTab === "spare_parts" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Maintenance Spare Parts Catalog ({parts.length})
                        </span>
                        <button
                            onClick={() => setShowAddPartModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
                        >
                            <Plus className="h-4 w-4" />
                            Add Spare Part
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingParts ? (
                            <div className="col-span-full py-16 text-center text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                                Loading Spare Parts...
                            </div>
                        ) : parts.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-slate-500 border border-slate-800 rounded-2xl">
                                No spare parts registered.
                            </div>
                        ) : (
                            parts.map(p => (
                                <div key={p.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-amber-400">{p.partNumber}</span>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                            {p.category}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-white">{p.name}</h3>
                                        <p className="text-xs text-slate-400 mt-1">Cost: QAR {p.unitCost.toFixed(2)} / unit</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                                        <span className="text-slate-400">In Stock:</span>
                                        <span className={`font-mono font-bold text-sm ${p.isLowStock ? "text-rose-400" : "text-emerald-400"}`}>
                                            {p.stockQuantity} units
                                        </span>
                                    </div>

                                    {p.isLowStock && (
                                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Alert (Threshold: {p.minStockThreshold})
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal: Create Work Order ── */}
            {showNewWoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h3 className="text-sm font-black text-white uppercase italic">Open Repair Work Order</h3>
                            <button onClick={() => setShowNewWoModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-300 mb-1">Asset Tag Code *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={woAssetTag}
                                        onChange={e => setWoAssetTag(e.target.value.toUpperCase())}
                                        placeholder="e.g. E3-ENT-001"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={lookupWoUnit}
                                        className="px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl"
                                    >
                                        Verify
                                    </button>
                                </div>
                                {woUnit && (
                                    <p className="text-emerald-400 mt-1 font-semibold">{woUnit.productName} ({woUnit.assetTagCode})</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-slate-300 mb-1">Reported Malfunction / Issue *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={woIssue}
                                    onChange={e => setWoIssue(e.target.value)}
                                    placeholder="e.g. Blown bulb, damaged XLR port, cracked casing..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Priority</label>
                                    <select
                                        value={woPriority}
                                        onChange={e => setWoPriority(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Technician</label>
                                    <input
                                        type="text"
                                        value={woTechName}
                                        onChange={e => setWoTechName(e.target.value)}
                                        placeholder="e.g. Qusain (Lead Tech)"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={creatingWo || !woUnit}
                                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider disabled:opacity-50"
                            >
                                {creatingWo ? "Opening Ticket..." : "Open Work Order"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Update Work Order & Consume Parts ── */}
            {selectedWo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase italic">
                                    Work Order #{selectedWo.workOrderNumber}
                                </h3>
                                <p className="text-xs text-amber-400 font-mono">{selectedWo.unit?.assetTagCode} — {selectedWo.unit?.product?.name}</p>
                            </div>
                            <button onClick={() => setSelectedWo(null)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateWorkOrder} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Status Transition</label>
                                    <select
                                        value={updateStatus}
                                        onChange={e => setUpdateStatus(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress (Diagnostics)</option>
                                        <option value="awaiting_parts">Awaiting Spare Parts</option>
                                        <option value="qc_testing">QC & Safety Testing</option>
                                        <option value="completed">Completed (Recommission Asset)</option>
                                        <option value="scrapped">Scrapped / Write-Off</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Technician Labor (Hours)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={laborHours}
                                        onChange={e => setLaborHours(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    />
                                </div>
                            </div>

                            {/* Consume Spare Part */}
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                                <label className="block font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                                    Consume Spare Part from Inventory
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <select
                                            value={selectedPartId}
                                            onChange={e => setSelectedPartId(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                                        >
                                            <option value="">-- Select Spare Part --</option>
                                            {parts.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (Stock: {p.stockQuantity} | QAR {p.unitCost})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={partQuantity}
                                            onChange={e => setPartQuantity(parseInt(e.target.value, 10) || 1)}
                                            placeholder="Qty"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Electrical Safety PAT Test */}
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="pat"
                                        checked={patTested}
                                        onChange={e => setPatTested(e.target.checked)}
                                        className="rounded bg-slate-900 border-slate-700 text-amber-500"
                                    />
                                    <label htmlFor="pat" className="font-bold text-slate-200 text-xs flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                                        Passed PAT Electrical Safety & Earth Bond Test
                                    </label>
                                </div>
                                {patTested && (
                                    <input
                                        type="text"
                                        value={patCertNum}
                                        onChange={e => setPatCertNum(e.target.value)}
                                        placeholder="PAT Sticker / Certificate Code (e.g. PAT-2026-QA)"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-slate-300 mb-1">Diagnostic / Repair Notes</label>
                                <textarea
                                    rows={2}
                                    value={diagnosticNotes}
                                    onChange={e => setDiagnosticNotes(e.target.value)}
                                    placeholder="Work performed, parts replaced..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updatingWo}
                                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider disabled:opacity-50"
                            >
                                {updatingWo ? "Saving..." : updateStatus === "completed" ? "Complete Repair & Recommission Asset" : "Update Work Order"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Add Spare Part ── */}
            {showAddPartModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h3 className="text-sm font-black text-white uppercase italic">Add Spare Part</h3>
                            <button onClick={() => setShowAddPartModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePart} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-300 mb-1">Part SKU / Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={partNumber}
                                    onChange={e => setPartNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. PRT-PWR-TRUE1"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-300 mb-1">Part Name / Description *</label>
                                <input
                                    type="text"
                                    required
                                    value={partName}
                                    onChange={e => setPartName(e.target.value)}
                                    placeholder="e.g. Neutrik PowerCON TRUE1 Male Plug"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Category</label>
                                    <select
                                        value={partCategory}
                                        onChange={e => setPartCategory(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    >
                                        <option value="electrical">Electrical</option>
                                        <option value="optical">Optical / Lamp</option>
                                        <option value="mechanical">Mechanical</option>
                                        <option value="rigging">Rigging & Clamps</option>
                                        <option value="cables">Cables & Connectors</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Unit Cost (QAR)</label>
                                    <input
                                        type="number"
                                        value={partCost}
                                        onChange={e => setPartCost(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Opening Stock</label>
                                    <input
                                        type="number"
                                        value={partStock}
                                        onChange={e => setPartStock(parseInt(e.target.value, 10) || 0)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-300 mb-1">Low Stock Alert Level</label>
                                    <input
                                        type="number"
                                        value={partMinThreshold}
                                        onChange={e => setPartMinThreshold(parseInt(e.target.value, 10) || 0)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={creatingPart}
                                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider disabled:opacity-50"
                            >
                                {creatingPart ? "Adding..." : "Add to Catalog"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 4: DAMAGE CLAIMS & SECURITY DEPOSIT DEDUCTION ENGINE
            ───────────────────────────────────────────────────────────── */}
            {mainTab === "damage_claims" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Damage Claims & Deposit Retention ({damageClaims.length})
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Automated financial offsets against client security deposit with official legal assessment vouchers.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedClaimData(null);
                                setClaimModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-red-500 hover:bg-red-400 text-white transition-all shadow-md self-start sm:self-auto"
                        >
                            <Plus className="h-4 w-4" />
                            File Damage Claim
                        </button>
                    </div>

                    {/* Summary Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Claims Filed</span>
                            <div className="text-2xl font-black text-white font-[family-name:var(--font-heading)]">
                                {damageClaims.length}
                            </div>
                            <span className="text-[10px] text-slate-500">Recorded post-bump-out</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-900 border border-red-500/20 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Deposit Deductions</span>
                            <div className="text-2xl font-black text-red-400 font-[family-name:var(--font-heading)]">
                                QAR {damageClaims.reduce((s, c) => s + (Number(c.amountDeducted) || 0), 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-red-400/70">Retained for repairs</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Refunds Remitted</span>
                            <div className="text-2xl font-black text-emerald-400 font-[family-name:var(--font-heading)]">
                                QAR {damageClaims.reduce((s, c) => s + (Number(c.amountRefunded) || 0), 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-emerald-400/70">Surplus returned to clients</span>
                        </div>
                    </div>

                    {/* Claims Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingClaims ? (
                            <div className="col-span-full py-16 text-center text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
                                Loading Damage Claims...
                            </div>
                        ) : damageClaims.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-slate-500 border border-slate-800 rounded-2xl">
                                No damage claims recorded. All equipment returned intact.
                            </div>
                        ) : (
                            damageClaims.map(claim => (
                                <div 
                                    key={claim.id} 
                                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-red-500/40 transition-all space-y-3.5 shadow-md flex flex-col justify-between"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono font-bold text-red-400">{claim.claimNumber}</span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-300">
                                                {claim.severity.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold text-white">
                                                {claim.booking?.customerName || "Customer Claim"}
                                            </h3>
                                            <p className="text-xs text-slate-400 truncate">
                                                {claim.booking?.projectName ? `Project: ${claim.booking.projectName}` : `Booking Ref: ${claim.bookingId?.slice(0, 8)}...`}
                                            </p>
                                            {claim.inventoryUnit && (
                                                <span className="inline-block mt-1 text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-amber-400">
                                                    Unit: {claim.inventoryUnit.assetTagCode}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                            {claim.incidentDescription}
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-800">
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div>
                                                <span className="text-slate-500 block">Total Claim</span>
                                                <span className="font-bold text-white">QAR {Number(claim.totalClaimAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Deposit Held</span>
                                                <span className="font-bold text-slate-300">QAR {Number(claim.securityDepositHeld || 0).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-red-400 block">Deducted</span>
                                                <span className="font-black text-red-400">- QAR {Number(claim.amountDeducted || 0).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-400 block">Refund Balance</span>
                                                <span className="font-black text-emerald-400">QAR {Number(claim.amountRefunded || 0).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {claim.createdAt ? format(new Date(claim.createdAt), "MMM d, yyyy") : ""}
                                            </span>
                                            <a
                                                href={`/api/pdf/damage-claim/${claim.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition-colors"
                                            >
                                                <FileText className="w-3 h-3" /> PDF Voucher
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <DamageClaimModal
                isOpen={claimModalOpen}
                onClose={() => setClaimModalOpen(false)}
                bookingId={selectedClaimData?.bookingId}
                unitId={selectedClaimData?.unitId}
                assetTag={selectedClaimData?.assetTag}
                productName={selectedClaimData?.productName}
                onClaimFiled={() => {
                    loadDamageClaims();
                }}
            />

            {scannerOpen && (
                <QRScannerModal
                    isOpen={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleInspectionScan}
                />
            )}
        </div>
    );
}
