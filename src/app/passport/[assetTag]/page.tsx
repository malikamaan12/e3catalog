"use client";

import React, { useEffect, useState } from "react";
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
    Unlock
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
}

export default function PassportPage() {
    const params = useParams();
    const assetTag = params.assetTag as string;
    const [data, setData] = useState<AssetPassportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"status" | "compliance" | "history">("status");

    useEffect(() => {
        // Fetch asset data from public/private API
        const fetchPassport = async () => {
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
        };
        fetchPassport();
    }, [assetTag]);

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
        <div className="min-h-screen bg-[#070b14] text-white overflow-hidden pb-32">
            {/* Hero Section */}
            <div className="relative h-64 w-full bg-gradient-to-b from-blue-900/20 to-transparent flex items-end p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 items-center"
                >
                    <div className="w-20 h-20 rounded-2xl border-2 border-[var(--color-gold)] overflow-hidden shadow-2xl bg-black">
                        <img src={data.productThumbnail || "/placeholder.jpg"} alt={data.productName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">{data.productName}</h1>
                        <p className="text-[var(--color-gold)] font-mono font-bold tracking-widest text-sm">{data.assetTagCode}</p>
                    </div>
                </motion.div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-px bg-white/5 border-y border-white/5 mt-6">
                <div className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-black text-[var(--color-slate)] tracking-[0.2em] mb-1">Condition</span>
                    <span className="text-sm font-bold text-green-400 capitalize">{data.conditionStatus}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-center border-l border-white/5">
                    <span className="text-[10px] uppercase font-black text-[var(--color-slate)] tracking-[0.2em] mb-1">Status</span>
                    <span className="text-sm font-bold text-blue-400 capitalize">{data.availabilityStatus.replace('_', ' ')}</span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex p-2 bg-black/40 mx-6 rounded-2xl mt-8 border border-white/5">
                {(['status', 'compliance', 'history'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all
                            ${tab === t ? 'bg-[var(--color-gold)] text-black' : 'text-[var(--color-slate)]'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab Content Area */}
            <div className="px-6 mt-8">
                <AnimatePresence mode="wait">
                    {tab === "status" && (
                        <motion.div 
                            key="status"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
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
                                {[
                                    { date: 'Today, 08:30 AM', event: 'Scanned at Warehouse A', icon: MapPin },
                                    { date: 'Yesterday, 11:00 PM', event: 'Marked as Returned (Cleaned)', icon: CheckCircle2 },
                                    { date: 'Feb 20, 2026', event: 'Annual Safety Certification', icon: ShieldCheck }
                                ].map((step, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-[#070b14] border border-white/10 flex items-center justify-center">
                                            <step.icon className="w-3 h-3 text-[var(--color-gold)]" />
                                        </div>
                                        <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">{step.date}</p>
                                        <p className="text-sm font-bold text-white">{step.event}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sticky Operations Panel (Authorized Only) */}
            {data.isAuthorized && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl z-50">
                    <div className="flex items-center gap-3 mb-4 text-[var(--color-gold)]">
                        <Unlock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Authorized Logistics Operator</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition-all">
                            <ArrowRightLeft className="w-5 h-5 text-blue-400 mb-2" />
                            <span className="text-[10px] font-black uppercase">Bump-In</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-gold)] active:scale-95 transition-all">
                            <Wrench className="w-5 h-5 text-black mb-2" />
                            <span className="text-[10px] font-black uppercase text-black">Log Damage</span>
                        </button>
                    </div>
                </div>
            )}
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
