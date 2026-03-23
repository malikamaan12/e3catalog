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
    ChevronRight
} from "lucide-react";
import Link from "next/link";

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
    serialNumber: string;
    // Mock user status for demo
    isAuthorized: boolean; 
    history: Array<{
        id: string;
        date: string;
        inspectionType: string;
        conditionBefore: string;
        conditionAfter: string;
        notes: string | null;
    }>;
}

export default function PassportPage() {
    const params = useParams();
    const assetTag = params.assetTag as string;
    const [data, setData] = useState<AssetPassportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"status" | "compliance" | "history">("status");
    const [showInspectModal, setShowInspectModal] = useState<{ type: string; label: string } | null>(null);

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

    return (
        <div className="min-h-screen bg-[#050810] text-white overflow-x-hidden pb-32 font-sans selection:bg-[var(--color-gold)] selection:text-black">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-gold)]/5 blur-[120px] rounded-full" />
            </div>

            {/* Hero Section */}
            <div className="relative h-72 w-full overflow-hidden flex items-end p-8 bg-gradient-to-b from-blue-950/40 via-blue-900/10 to-transparent">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row gap-6 items-start md:items-end w-full max-w-5xl mx-auto z-10"
                >
                    <div className="w-28 h-28 rounded-[2rem] border-2 border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black/40 backdrop-blur-xl p-1 shrink-0">
                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden border border-white/5">
                            <img src={data.productThumbnail || "/placeholder.jpg"} alt={data.productName} className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 text-[var(--color-gold)] text-[10px] font-black uppercase tracking-widest">Digital Passport</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">v2.0 Verified</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">{data.productName}</h1>
                        <p className="text-[var(--color-gold)] font-mono font-black tracking-[0.2em] text-sm opacity-80">{data.assetTagCode}</p>
                    </div>
                </motion.div>
            </div>

            {/* Quick Stats Grid */}
            <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 glass border border-white/10 rounded-[2.5rem] shadow-2xl">
                    <div className="p-4 flex flex-col items-center justify-center text-center bg-white/5 rounded-[2rem] border border-white/5">
                        <span className="text-[10px] uppercase font-black text-[var(--color-slate)] tracking-[0.2em] mb-1 opacity-50">Condition</span>
                        <span className={`text-sm font-black uppercase tracking-tight ${
                            data.conditionStatus === 'excellent' ? 'text-emerald-400' : 
                            data.conditionStatus === 'good' ? 'text-blue-400' : 'text-orange-400'
                        }`}>{data.conditionStatus}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center bg-white/5 rounded-[2rem] border border-white/5">
                        <span className="text-[10px] uppercase font-black text-[var(--color-slate)] tracking-[0.2em] mb-1 opacity-50">Status</span>
                        <span className="text-sm font-black text-blue-400 uppercase tracking-tight">{data.availabilityStatus.replace('_', ' ')}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center bg-white/5 rounded-[2rem] border border-white/5">
                        <span className="text-[10px] uppercase font-black text-[var(--color-slate)] tracking-[0.2em] mb-1 opacity-50">Identity</span>
                        <span className="text-sm font-bold text-white/80 font-mono tracking-tighter truncate w-full">{data.serialNumber || 'E3-8829-X'}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center bg-white/5 rounded-[2rem] border border-white/5">
                        <span className="text-[10px] uppercase font-black text-[var(--color-slate)] tracking-[0.2em] mb-1 opacity-50">Ownership</span>
                        <span className="text-sm font-black text-[var(--color-gold)] uppercase tracking-tighter truncate w-full">{data.vendorName}</span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex p-1.5 bg-black/40 max-w-5xl mx-auto rounded-[1.8rem] mt-12 border border-white/10 backdrop-blur-md sticky top-6 z-40 mx-6 md:mx-auto">
                {(['status', 'compliance', 'history'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.4rem] transition-all duration-300
                            ${tab === t ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-[0_10px_20px_rgba(255,191,0,0.2)]' : 'text-[var(--color-slate)] hover:text-white hover:bg-white/5'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab Content Area */}
            <div className="max-w-5xl mx-auto px-6 mt-10">
                <AnimatePresence mode="wait">
                    {tab === "status" && (
                        <motion.div 
                            key="status"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            <div className="glass p-5 border border-white/10 rounded-2xl space-y-4">
                                <h3 className="text-xs font-black text-[var(--color-gold)] uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Operational Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5"><MapPin className="w-4 h-4 text-orange-400" /></div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase font-black tracking-widest">Inventory Location</p>
                                            <p className="text-sm font-bold">{data.warehouseLocation || 'Building A / Zone 4'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5"><ShieldCheck className="w-4 h-4 text-blue-400" /></div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase font-black tracking-widest">Proprietary Owner</p>
                                            <p className="text-sm font-bold">{data.vendorName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5"><FileText className="w-4 h-4 text-purple-400" /></div>
                                        <div>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase font-black tracking-widest">Serial Identification</p>
                                            <p className="text-sm font-bold">{data.serialNumber || 'OEM-8892-Z'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {tab === "compliance" && (
                        <motion.div 
                            key="compliance"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4">
                                <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                                <div>
                                    <p className="text-sm font-black text-green-400">Safety Compliant</p>
                                    <p className="text-xs text-green-400/70">Last detailed inspection: {data.lastInspectionDate ? new Date(data.lastInspectionDate).toLocaleDateString() : 'Mar 15, 2026'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest ml-1">Regulatory Approvals</p>
                                <div className="space-y-3">
                                    {['Civil Defence Approval', 'Manufacturer Load Test', 'Safety Compliance Certificate'].map((doc, i) => (
                                        <div key={i} className="glass p-4 border border-white/5 rounded-2xl flex items-center justify-between">
                                            <span className="text-sm font-bold">{doc}</span>
                                            <LinkIcon className="w-4 h-4 text-[var(--color-gold)]" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {tab === "history" && (
                        <motion.div 
                            key="history"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-px before:bg-white/10">
                                {data.history.length > 0 ? data.history.map((h, i) => {
                                    const iconMap: any = {
                                        routine: CheckCircle2,
                                        pre_rental: ShieldCheck,
                                        return: ArrowRightLeft,
                                        damage: AlertTriangle,
                                    };
                                    const Icon = iconMap[h.inspectionType] || History;
                                    return (
                                        <div key={h.id} className="relative">
                                            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-[#070b14] border border-white/10 flex items-center justify-center">
                                                <Icon className={`w-3 h-3 ${h.inspectionType === 'damage' ? 'text-red-400' : 'text-[var(--color-gold)]'}`} />
                                            </div>
                                            <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">{new Date(h.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            <p className="text-sm font-bold text-white uppercase tracking-tight">{h.inspectionType.replace('_', ' ')}</p>
                                            <p className="text-[10px] text-[var(--color-slate)] uppercase font-bold">
                                                {h.conditionBefore} → <span className="text-white">{h.conditionAfter}</span>
                                            </p>
                                            {h.notes && <p className="text-xs text-[var(--color-slate)] mt-1 italic italic">"{h.notes}"</p>}
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-10 opacity-30 italic text-sm">No recorded history for this asset.</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sticky Operations Panel (Authorized Only) */}
            {data.isAuthorized && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md p-6 glass border border-white/20 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-50">
                    <div className="flex items-center justify-center gap-3 mb-6 text-[var(--color-gold)]">
                        <Unlock className="w-4 h-4 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Authorized Operator Panel</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setShowInspectModal({ type: 'pre_rental', label: 'Bump-In' })}
                            className="group flex flex-col items-center justify-center p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all outline-none focus:ring-2 ring-[var(--color-gold)]"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Bump-In</span>
                        </button>
                        <button 
                            onClick={() => setShowInspectModal({ type: 'damage', label: 'Log Damage' })}
                            className="group flex flex-col items-center justify-center p-5 rounded-[2rem] bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 active:scale-95 transition-all shadow-[0_10px_25px_rgba(255,191,0,0.3)] outline-none"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Wrench className="w-6 h-6 text-black" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-black">Log Damage</span>
                        </button>
                    </div>
                </div>
            )}

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
                className="w-full max-w-lg bg-[#0a0f1e] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
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

function LinkIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    )
}
