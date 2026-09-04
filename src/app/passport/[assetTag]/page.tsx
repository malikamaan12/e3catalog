"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ShieldCheck, 
    Calendar, 
    Wrench, 
    MapPin, 
    ArrowRightLeft, 
    FileText, 
    CheckCircle2, 
    AlertTriangle,
    Info,
    History,
    Unlock,
    X,
    LogOut,
    Warehouse,
    QrCode,
    Download
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";

interface AssetPassportData {
    id: string;
    assetTagCode: string;
    productName: string;
    productThumbnail: string;
    vendorName: string;
    conditionStatus: string;
    availabilityStatus: string;
    lastInspectionDate: string | null;
    warehouseLocation: string;
    warehouseName: string | null;
    warehouseAddress: string | null;
    shelfLocation: string | null;
    serialNumber: string;
    isAuthorized: boolean; 
    currentAssignment: {
        id: string;
        bookingId: string;
        projectName: string;
        customerName: string;
        startDate: string;
        endDate: string;
        assignmentStatus: string;
    } | null;
    history: Array<{
        id: string;
        date: string;
        historyType: 'condition' | 'assignment';
        type?: string;
        conditionBefore?: string;
        conditionAfter?: string;
        notes?: string | null;
        projectName?: string;
        customerName?: string;
        status?: string;
    }>;
}

function generateMRZ(productName: string, assetTag: string, serial: string) {
    const formatLine = (str: string, len: number) => {
        const cleaned = str.toUpperCase().replace(/[^A-Z0-9]/g, '<');
        if (cleaned.length > len) return cleaned.substring(0, len);
        return cleaned.padEnd(len, '<');
    };
    
    // MRZ standard is typically 44 chars per line for passports (Type P)
    const line1 = `P<E3<${formatLine(productName, 39)}`;
    const line2 = `${formatLine(serial, 15)}<${formatLine(assetTag, 28)}`;
    return `${line1}\n${line2}`;
}

export default function PassportPage() {
    const params = useParams();
    const assetTag = params.assetTag as string;
    const [data, setData] = useState<AssetPassportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"status" | "compliance" | "history">("status");
    const [showInspectModal, setShowInspectModal] = useState<{ type: string; label: string } | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showBumpOutModal, setShowBumpOutModal] = useState(false);
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [extendEndDate, setExtendEndDate] = useState("");
    const [incidentData, setIncidentData] = useState({ issueType: "power_fault", description: "", phone: "" });
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    const fetchPassport = useCallback(async () => {
        try {
            const res = await fetch(`/api/passport/${assetTag}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [assetTag]);

    const handleExtendRental = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!extendEndDate) return;
        setIsSubmittingAction(true);
        try {
            const res = await fetch(`/api/passport/${assetTag}/extend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newEndDate: extendEndDate }),
            });
            const d = await res.json();
            if (res.ok) {
                toast.success(d.message || "Rental period extended!");
                setShowExtendModal(false);
                fetchPassport();
            } else {
                toast.error(d.error || "Extension failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Error extending rental");
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleReportIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!incidentData.description) return;
        setIsSubmittingAction(true);
        try {
            const res = await fetch(`/api/passport/${assetTag}/incident`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(incidentData),
            });
            const d = await res.json();
            if (res.ok) {
                toast.success("Incident logged & Rapid Replacement Work Order Dispatched!");
                setShowIncidentModal(false);
                fetchPassport();
            } else {
                toast.error(d.error || "Failed to log incident");
            }
        } catch (err: any) {
            toast.error(err.message || "Error reporting incident");
        } finally {
            setIsSubmittingAction(false);
        }
    };

    useEffect(() => {
        fetchPassport();
    }, [fetchPassport]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full"
                />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4 opacity-50" />
                <h1 className="text-2xl font-black text-white">Asset Not Found</h1>
                <p className="text-[var(--color-slate)] mt-2">The QR code scanned does not match any registered inventory unit in the E3 system.</p>
                <Link href="/" className="mt-8 text-[var(--color-gold)] font-bold underline">Return to Marketplace</Link>
            </div>
        );
    }

    const mrzLabel = generateMRZ(data.productName, data.assetTagCode, data.serialNumber || 'UNKNOWN');

    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white font-sans selection:bg-[var(--color-gold)] selection:text-black pt-32 pb-12 px-4 md:px-8 relative z-0">
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; }
                    .nav-fixed, .operator-controls, .detailed-records, .background-texture, .passport-actions {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .min-h-screen {
                        padding: 0 !important;
                        background: white !important;
                        min-height: auto !important;
                    }
                    .passport-card {
                        position: relative !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        page-break-inside: avoid;
                        border: 2px solid #e5e7eb !important;
                        box-shadow: none !important;
                        background: #0b1221 !important; /* Keep original dark look for card even in print */
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
            {/* Background Texture for official document look */}
            <div className="fixed inset-0 pointer-events-none opacity-5 mix-blend-screen" 
                 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} 
            />
            
            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                
                {/* ─── PASSPORT ID CARD ─── */}
                <div className="bg-[#0b1221]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative passport-card">
                    {/* Watermark Logo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                        <ShieldCheck className="w-[400px] h-[400px]" />
                    </div>

                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="text-[var(--color-gold)] w-6 h-6" />
                            <div>
                                <h2 className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase text-white/90">E3 Rentals Digital Passport</h2>
                                <p className="text-[8px] tracking-widest text-white/50 uppercase">Official Asset Identification</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-[#4ade80] font-bold border border-[#4ade80]/30 bg-[#4ade80]/10 px-2 py-0.5 rounded-full">Active Record</p>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 md:p-10 flex flex-col lg:flex-row gap-8">
                        {/* Photo Area */}
                        <div className="mx-auto lg:mx-0 shrink-0 flex flex-col items-center lg:items-start self-center">
                            <div className="w-72 md:w-80 aspect-video rounded-xl border-2 border-white/10 p-1 bg-white/5 relative overflow-hidden shadow-inner">
                                {/* Passport style overlay pattern */}
                                <div className="absolute inset-0 z-10 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwbDhfOFpNOCAwTDBfOCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]" />
                                <img src={data.productThumbnail || "/placeholder.jpg"} alt={data.productName} className="w-full h-full object-cover grayscale opacity-90 contrast-125" />
                            </div>
                        </div>

                        {/* Data Attributes & QR */}
                        <div className="flex-1 flex flex-col md:flex-row gap-8 self-center">
                            {/* Properties Grid */}
                            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-6">
                                <div className="col-span-2">
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Make / Model / Description</p>
                                    <p className="font-bold text-xl text-white uppercase tracking-tight leading-none">{data.productName}</p>
                                </div>

                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Type / Category</p>
                                    <p className="font-bold text-sm text-white uppercase">Equipment</p>
                                </div>

                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Fleet Tag</p>
                                    <p className="font-mono text-sm text-[var(--color-gold)] font-bold">{data.assetTagCode}</p>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Fleet Provider</p>
                                    <p className="font-bold text-sm text-white uppercase truncate">{data.vendorName || 'E3 Logistics Network'}</p>
                                </div>

                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Verification Date</p>
                                    <p className="font-bold text-sm text-white uppercase">
                                        {data.lastInspectionDate ? new Date(data.lastInspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Verified'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Condition Status</p>
                                    <p className={`font-black text-sm uppercase tracking-tight ${
                                        data.conditionStatus === 'excellent' ? 'text-emerald-400' : 
                                        data.conditionStatus === 'good' ? 'text-blue-400' : 'text-emerald-400'
                                    }`}>{(data.conditionStatus || 'Standard').replace('_', ' ')}</p>
                                </div>

                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Status</p>
                                    <p className="font-black text-sm text-blue-400 uppercase tracking-tight">{data.availabilityStatus ? data.availabilityStatus.replace('_', ' ') : 'Active in Fleet'}</p>
                                </div>
                            </div>

                            {/* QR Segment */}
                            <div className="shrink-0 flex items-center justify-center md:items-start md:justify-end">
                                <div className="bg-white p-3 rounded-xl border-[4px] border-white/10 shadow-2xl">
                                    <QRCodeSVG 
                                        value={typeof window !== 'undefined' ? `${window.location.origin}/passport/${data.assetTagCode}` : `https://e3rentals.com/passport/${data.assetTagCode}`} 
                                        size={72}
                                        level="H"
                                        includeMargin={false}
                                        className="transition-transform hover:scale-105 duration-300 mx-auto"
                                    />
                                    <p className="mt-2 text-[10px] font-mono text-black font-black uppercase text-center tracking-[0.1em]">{data.assetTagCode}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Machine Readable Zone (MRZ) */}
                    <div className="bg-[#050810] border-t border-white/10 p-4 md:px-8 overflow-hidden select-all mrz-zone">
                        <p className="font-mono text-sm md:text-base text-white/60 tracking-[0.2em] break-all whitespace-pre-wrap leading-relaxed font-bold">
                            {mrzLabel}
                        </p>
                    </div>
                </div>

                {/* ─── PASSPORT ACTIONS ─── */}
                <div className="flex justify-center passport-actions">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/30 transition-all text-xs font-black uppercase tracking-widest text-gold"
                    >
                        <Download className="w-4 h-4" />
                        Export Digital Passport (PDF)
                    </button>
                </div>

                {/* ─── INLINE OPERATOR ACTIONS ─── */}
                {data.isAuthorized && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden operator-controls">
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-gold)]/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <Unlock className="w-5 h-5 text-[var(--color-gold)]" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-gold)]">Operator Controls</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                            <button 
                                onClick={() => setShowAssignModal(true)}
                                disabled={!!data.currentAssignment}
                                className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 active:scale-95 transition-all outline-none focus:ring-2 ring-blue-500 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                            >
                                <MapPin className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center text-white/80 group-hover:text-white">Assign to Project</span>
                            </button>

                            {data.currentAssignment ? (
                                <button 
                                    onClick={() => setShowBumpOutModal(true)}
                                    className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition-all outline-none focus:ring-2 ring-emerald-500"
                                >
                                    <LogOut className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center text-emerald-400">Process Bump-Out</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setShowInspectModal({ type: 'pre_rental', label: 'Check-In' })}
                                    className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 active:scale-95 transition-all outline-none focus:ring-2 ring-orange-500"
                                >
                                    <ArrowRightLeft className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center text-white/80 group-hover:text-white">Log Bump-In</span>
                                </button>
                            )}

                            <button 
                                onClick={() => setShowInspectModal({ type: 'routine', label: 'Inspect' })}
                                className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 active:scale-95 transition-all outline-none focus:ring-2 ring-purple-500"
                            >
                                <ShieldCheck className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center text-white/80 group-hover:text-white">Routine Inspection</span>
                            </button>

                            <button 
                                onClick={() => setShowInspectModal({ type: 'damage', label: 'Log Damage' })}
                                className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-gold)] border border-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 active:scale-95 transition-all shadow-[0_10px_20px_rgba(201,168,76,0.2)] outline-none"
                            >
                                <Wrench className="w-6 h-6 text-[#0A0F1C] mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#0A0F1C] text-center">Log Damage</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── DETAILED RECORDS (VISA PAGES) ─── */}
                <div className="bg-[#0b1221]/60 border border-white/10 rounded-3xl p-6 detailed-records">
                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-white/10 pb-4 mb-6">
                        {(['status', 'compliance', 'history'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] rounded-full transition-all duration-300 border
                                    ${tab === t ? 'bg-[var(--color-gold)] text-[#0A0F1C] border-[var(--color-gold)]' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30 hover:text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {tab === "status" && (
                            <motion.div key="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                {/* Current Assignment Document */}
                                {data.currentAssignment ? (
                                    <div className="relative border-l-4 border-blue-500 bg-blue-500/5 p-6 rounded-r-2xl">
                                        <div className="absolute top-4 right-4 text-xs font-mono text-blue-500/40">REF: {data.currentAssignment.bookingId.split('-')[0]}</div>
                                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Active Deployment
                                        </h3>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Project Name</p>
                                                <p className="font-black text-lg text-white">{data.currentAssignment.projectName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Assigned Client</p>
                                                <p className="font-bold text-sm text-white">{data.currentAssignment.customerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Deployed Date</p>
                                                <p className="font-mono text-sm text-white">{new Date(data.currentAssignment.startDate).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Expected Return</p>
                                                <p className="font-mono text-sm text-gold">{new Date(data.currentAssignment.endDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        {/* On-Site Actions */}
                                        <div className="mt-4 pt-4 border-t border-blue-500/20 flex flex-wrap gap-2.5">
                                            <button
                                                onClick={() => setShowExtendModal(true)}
                                                className="px-4 py-2 rounded-xl bg-[var(--color-gold)] text-navy font-black text-[10px] uppercase tracking-wider hover:scale-105 transition-all shadow-md flex items-center gap-1.5"
                                            >
                                                <Calendar className="w-3.5 h-3.5" /> Extend Rental Period
                                            </button>
                                            <button
                                                onClick={() => setShowIncidentModal(true)}
                                                className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-black text-[10px] uppercase tracking-wider hover:bg-red-500/30 transition-all flex items-center gap-1.5"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" /> Report Fault / Request Swap
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-white/10 border-dashed rounded-2xl p-8 text-center bg-white/5">
                                        <Warehouse className="w-8 h-8 text-white/20 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-white/60">Asset is currently unassigned.</p>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Available in inventory warehouse.</p>
                                    </div>
                                )}

                                {/* Location Logs */}
                                <div className="p-6 border border-white/10 rounded-2xl bg-black/20">
                                    <h3 className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Storage Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Registered Warehouse</p>
                                            <p className="font-bold text-sm text-white">{data.warehouseName || data.warehouseLocation || 'Not assigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Precise Shelf/Bin</p>
                                            <p className="font-mono text-sm text-white">{data.shelfLocation || '---'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {tab === "compliance" && (
                            <motion.div key="compliance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="border-2 border-emerald-500/20 bg-emerald-500/5 p-6 rounded-2xl flex items-center gap-6">
                                    {/* Simulated "Stamp" */}
                                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/40 flex items-center justify-center shrink-0 rotate-12 opacity-80 mix-blend-screen">
                                        <span className="text-[10px] font-black tracking-tighter uppercase text-emerald-400">PASSED</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Operational Safety Compliant</p>
                                        <p className="text-xs text-white/60 mt-1">Last inspected and cleared on {data.lastInspectionDate ? new Date(data.lastInspectionDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-6">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Official Certificates & Approvals</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {['Civil Defence Approval', 'Manufacturer Load Test', 'Maintenance Logbook ISO9001'].map((doc, i) => (
                                            <div key={i} className="bg-black/40 border border-white/5 px-4 py-3 rounded-xl flex items-center justify-between group cursor-pointer hover:border-[var(--color-gold)]/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-4 h-4 text-white/30 group-hover:text-[var(--color-gold)] transition-colors" />
                                                    <span className="text-xs font-bold text-white/80">{doc}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {tab === "history" && (
                            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <div className="relative border-l border-white/10 ml-4 py-4 space-y-8">
                                    {data.history.length > 0 ? data.history.map((h, i) => {
                                        const isCond = h.historyType === 'condition';
                                        
                                        // Generate an official-looking "stamp" for the history event
                                        return (
                                            <div key={h.id} className="relative pl-8 pr-4">
                                                {/* Timeline Node */}
                                                <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#0b1221] ${isCond ? (h.type === 'damage' ? 'bg-red-400' : 'bg-orange-400') : 'bg-blue-400'}`} />
                                                
                                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                                                            {new Date(h.date).toLocaleDateString()} · {new Date(h.date).toLocaleTimeString([], {timeStyle: 'short'})}
                                                        </p>
                                                        
                                                        {isCond ? (
                                                            <>
                                                                <p className="text-sm font-bold text-white uppercase tracking-tight">Inspection: {h.type?.replace('_', ' ')}</p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-white/50">{h.conditionBefore}</span>
                                                                    <ArrowRightLeft className="w-3 h-3 text-white/20" />
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-white font-bold">{h.conditionAfter}</span>
                                                                </div>
                                                                {h.notes && <p className="text-xs text-[var(--color-gold)] mt-2 italic border-l-2 border-[var(--color-gold)] pl-2">"{h.notes}"</p>}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm font-bold text-white uppercase tracking-tight">Logistics: {h.projectName}</p>
                                                                <p className="text-xs text-white/60 mt-1">Authorized for: {h.customerName}</p>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Official Stamp Look */}
                                                    <div className="shrink-0">
                                                        <div className={`border-2 px-3 py-1 rounded inline-block rotate-[-5deg] ${isCond ? (h.type === 'damage' ? 'border-red-500/30 text-red-400/80' : 'border-orange-500/30 text-orange-400/80') : 'border-blue-500/30 text-blue-400/80'}`}>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                                {isCond ? 'LOGGED' : h.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-10 opacity-30 italic text-sm">No recorded history elements for this ledger.</div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals remain structurally the same, just keeping them in the DOM */}
            {/* Inspection Modal */}
            {showInspectModal && (
                <MobileInspectModal 
                    assetId={data.id}
                    assetTag={data.assetTagCode}
                    currentCondition={data.conditionStatus}
                    type={showInspectModal.type}
                    label={showInspectModal.label}
                    onClose={() => setShowInspectModal(null)}
                    onSuccess={() => { setShowInspectModal(null); fetchPassport(); setTab('history'); }}
                />
            )}

            {/* Assignment Modal */}
            {showAssignModal && (
                <AssignmentModal 
                    assetTag={data.assetTagCode}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={() => { setShowAssignModal(false); fetchPassport(); setTab('status'); }}
                />
            )}

            {/* Bump-Out Modal */}
            {showBumpOutModal && (
                <BumpOutModal 
                    assetTag={data.assetTagCode}
                    currentCondition={data.conditionStatus}
                    projectName={data.currentAssignment?.projectName || 'Unknown'}
                    onClose={() => setShowBumpOutModal(false)}
                    onSuccess={() => { setShowBumpOutModal(false); fetchPassport(); setTab('status'); }}
                />
            )}

            {/* On-Site Rental Extension Modal */}
            {showExtendModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-lg text-white uppercase italic tracking-tight">Extend Rental Period</h3>
                            <button onClick={() => setShowExtendModal(false)} className="p-2 bg-white/5 rounded-full"><X className="w-4 h-4 text-slate" /></button>
                        </div>
                        <p className="text-xs text-slate">
                            Select a new completion date for on-site production. Daily rate will be prorated automatically.
                        </p>
                        <form onSubmit={handleExtendRental} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">New End Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={extendEndDate}
                                    onChange={e => setExtendEndDate(e.target.value)}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmittingAction}
                                className="w-full py-3.5 rounded-xl bg-[var(--color-gold)] text-navy font-black text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-lg"
                            >
                                {isSubmittingAction ? "Extending..." : "Confirm & Prorate Extension"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* On-Site Rapid Fault / Incident Modal */}
            {showIncidentModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-lg text-white uppercase italic tracking-tight">Report Fault & Request Swap</h3>
                            <button onClick={() => setShowIncidentModal(false)} className="p-2 bg-white/5 rounded-full"><X className="w-4 h-4 text-slate" /></button>
                        </div>
                        <p className="text-xs text-slate">
                            Log on-site malfunction. An urgent replacement ticket will be dispatched to the operations hub.
                        </p>
                        <form onSubmit={handleReportIncident} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">Fault Category</label>
                                <select
                                    value={incidentData.issueType}
                                    onChange={e => setIncidentData({ ...incidentData, issueType: e.target.value })}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
                                >
                                    <option value="power_fault">Power / PSU Failure</option>
                                    <option value="signal_loss">Signal / DMX Loss</option>
                                    <option value="physical_damage">Physical Casing Damage</option>
                                    <option value="missing_accessory">Missing Accessory / Cable</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={incidentData.description}
                                    onChange={e => setIncidentData({ ...incidentData, description: e.target.value })}
                                    placeholder="Describe fault details..."
                                    className="w-full bg-surface border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate mb-1">On-Site Tech Phone</label>
                                <input
                                    type="text"
                                    value={incidentData.phone}
                                    onChange={e => setIncidentData({ ...incidentData, phone: e.target.value })}
                                    placeholder="+974 ..."
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmittingAction}
                                className="w-full py-3.5 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                            >
                                {isSubmittingAction ? "Dispatching..." : "Dispatch Rapid Replacement"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Mobile-First Inspect Modal ───
function MobileInspectModal({ assetId, assetTag, currentCondition, type, label, onClose, onSuccess }: any) {
    const [conditionAfter, setConditionAfter] = useState(currentCondition);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/fleet/inspection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ unitId: assetId, inspectionType: type, conditionBefore: currentCondition, conditionAfter, notes }),
            });
            if (res.ok) onSuccess();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }}
                className="w-full max-w-lg bg-[#0a0f1e] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-xl text-white tracking-tight">{label}</h3>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>
                <p className="text-xs text-[var(--color-slate)] uppercase font-bold tracking-widest">Asset: <span className="text-[var(--color-gold)]">{assetTag}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">Updated Condition</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['excellent', 'good', 'fair', 'maintenance_required'].map(c => (
                                <button key={c} onClick={() => setConditionAfter(c)}
                                    className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${conditionAfter === c ? 'bg-[var(--color-gold)] text-black border-transparent' : 'bg-white/5 text-[var(--color-slate)] border-white/5'}`}>
                                    {c.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">Operator Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-[var(--color-gold)] resize-none" placeholder="Describe damage or check-in notes..." />
                    </div>
                </div>

                <button onClick={submit} disabled={saving}
                    className="w-full py-4 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(255,191,0,0.3)]">
                    {saving ? "Transmitting..." : `Submit ${label}`}
                </button>
            </motion.div>
        </div>
    );
}

// ─── Project Assignment Modal ───
function AssignmentModal({ assetTag, onClose, onSuccess }: { assetTag: string, onClose: () => void, onSuccess: () => void }) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await fetch(`/api/passport/${assetTag}/bookings`);
                if (res.ok) setBookings(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchBookings();
    }, [assetTag]);

    const assign = async (bookingId: string) => {
        setSelecting(bookingId);
        setError(null);
        try {
            const res = await fetch(`/api/passport/${assetTag}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId }),
            });
            const result = await res.json();
            if (res.ok) {
                onSuccess();
            } else {
                setError(result.error || "Failed to assign asset.");
            }
        } catch (e) { 
            setError("Network error occurred.");
        } finally {
            setSelecting(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }}
                className="w-full max-w-lg bg-[#0a0f1e] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 pb-12 space-y-6 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-xl text-white tracking-tight">Assign to Project</h3>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>
                
                <p className="text-xs text-[var(--color-slate)] font-bold tracking-widest uppercase mb-4">
                    Product Passport: <span className="text-[var(--color-gold)]">{assetTag}</span>
                </p>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold animate-shake">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center space-y-4">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full mx-auto" />
                            <p className="text-[10px] uppercase font-black tracking-widest text-white/20">Finding Active Orders...</p>
                        </div>
                    ) : bookings.length > 0 ? (
                        bookings.map(b => (
                            <button 
                                key={b.id}
                                onClick={() => assign(b.id)}
                                disabled={!!selecting}
                                className="w-full group relative overflow-hidden p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-[var(--color-gold)]/30 hover:bg-white/10 transition-all text-left outline-none"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">{b.customerName}</p>
                                        <h4 className="text-sm font-black text-white group-hover:text-[var(--color-gold)] transition-colors">{b.projectName}</h4>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Fulfillment</p>
                                        <p className="text-xs font-black text-white/80">{b.unitsAssigned} / {b.unitsRequired}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-slate)]">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}
                                </div>
                                {selecting === b.id && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-6 h-6 border-2 border-[var(--color-gold)] border-t-transparent rounded-full" />
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-30 italic text-sm">No bookings found for this product that require units.</div>
                    )}
                </div>

                {!loading && bookings.length > 0 && (
                    <p className="text-[10px] text-center text-[var(--color-slate)] font-black uppercase tracking-widest opacity-50">Select a project to mark this unit as Dispatched</p>
                )}
            </motion.div>
        </div>
    );
}

// ─── Bump-Out (Return) Modal ───
function BumpOutModal({ assetTag, currentCondition, projectName, onClose, onSuccess }: { assetTag: string, currentCondition: string, projectName: string, onClose: () => void, onSuccess: () => void }) {
    const [conditionAfter, setConditionAfter] = useState(currentCondition);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/passport/${assetTag}/bump-out`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conditionAfter, notes }),
            });
            const result = await res.json();
            if (res.ok) {
                onSuccess();
            } else {
                setError(result.error || "Failed to process bump-out.");
            }
        } catch (e) {
            setError("Network error occurred.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }}
                className="w-full max-w-lg bg-[#0a0f1e] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 pb-12 space-y-6 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-xl text-white tracking-tight">Bump-Out — Return</h3>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-[10px] text-emerald-400/60 uppercase font-black tracking-widest mb-1">Returning From</p>
                    <p className="text-sm font-black text-emerald-400">{projectName}</p>
                    <p className="text-[10px] text-[var(--color-slate)] uppercase font-bold mt-1">Asset: <span className="text-[var(--color-gold)]">{assetTag}</span></p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">Post-Return Condition</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['excellent', 'good', 'fair', 'maintenance_required'].map(c => (
                                <button key={c} onClick={() => setConditionAfter(c)}
                                    className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${conditionAfter === c ? 'bg-[var(--color-gold)] text-black border-transparent' : 'bg-white/5 text-[var(--color-slate)] border-white/5'}`}>
                                    {c.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-2">Return Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-[var(--color-gold)] resize-none" placeholder="Describe condition upon return..." />
                    </div>
                </div>

                <button onClick={submit} disabled={saving}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(56,189,115,0.3)]">
                    {saving ? "Processing Return..." : "Complete Bump-Out"}
                </button>
            </motion.div>
        </div>
    );
}

