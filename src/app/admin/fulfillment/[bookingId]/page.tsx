"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
    QrCode, 
    Package, 
    ArrowRightLeft, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    ArrowLeft,
    Box,
    Truck,
    RotateCcw,
    Camera,
    Info
} from "lucide-react";

interface InventoryUnit {
    id: string;
    assetTagCode: string;
    conditionStatus: string;
    availabilityStatus: string;
}

interface UnitAssignment {
    id: string;
    status: string;
    scannedOutAt: string;
    scannedInAt: string;
    inventoryUnit: InventoryUnit;
}

interface Booking {
    id: string;
    units: number;
    customerName: string;
    projectName: string;
    startDate: string;
    endDate: string;
    status: string;
    fulfillmentStatus: string;
    product: {
        id: string;
        name: string;
        thumbnailUrl: string;
    };
    unitAssignments: UnitAssignment[];
}

export default function FulfillmentPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params?.bookingId as string;
    
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [scannedTag, setScannedTag] = useState("");
    const [scanning, setScanning] = useState(false);
    const [processingAction, setProcessingAction] = useState(false);
    const [recentMessage, setRecentMessage] = useState({ text: "", type: "info" as "success" | "error" | "info" });
    const [showScanner, setShowScanner] = useState(false);
    
    const scannerRef = useRef<HTMLDivElement>(null);

    const fetchBooking = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/fulfillment?bookingId=${bookingId}`);
            if (!res.ok) throw new Error("Failed to load booking details.");
            const data = await res.json();
            setBooking(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        if (bookingId) fetchBooking();
    }, [bookingId, fetchBooking]);

    const handleAction = async (
        action: 'dispatch' | 'return' | 'auto_allocate' | 'manual_allocate' | 'stage' | 'pack' | 'release', 
        tagToProcess?: string
    ) => {
        const tag = tagToProcess || scannedTag;
        if (!tag && action !== 'auto_allocate') return;

        setProcessingAction(true);
        setError("");
        
        try {
            const res = await fetch("/api/admin/fulfillment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId,
                    assetTag: tag || undefined,
                    action
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                setRecentMessage({ text: data.error || "Action failed", type: "error" });
            } else {
                const successMsg = data.message || "Success!";
                setRecentMessage({ text: successMsg, type: "success" });
                setScannedTag("");
                await fetchBooking();
                // Hide message after 5 seconds
                setTimeout(() => setRecentMessage(prev => prev.text === successMsg ? { ...prev, text: "" } : prev), 5000);
            }
        } catch (err) {
            setRecentMessage({ text: "Network error processing scan", type: "error" });
        } finally {
            setProcessingAction(false);
        }
    };

    // QR Scanning Logic (Browser API)
    useEffect(() => {
        if (!showScanner || !scannerRef.current) return;

        let videoStream: MediaStream | null = null;
        let interval: any = null;

        const startScanning = async () => {
            try {
                // Check if BarcodeDetector is available
                if (!('BarcodeDetector' in window)) {
                    throw new Error("Barcode Detection API not supported on this browser.");
                }

                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128'] });
                
                videoStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });

                const video = document.createElement('video');
                video.srcObject = videoStream;
                video.className = "w-full h-full object-cover rounded-xl";
                video.autoplay = true;
                video.playsInline = true;
                
                if (scannerRef.current) scannerRef.current.appendChild(video);

                interval = setInterval(async () => {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes.length > 0) {
                            const code = barcodes[0].rawValue;
                            setScannedTag(code);
                            // Auto-process if it looks like an E3 tag
                            if (code.startsWith("E3-")) {
                                handleAction('dispatch', code);
                                setShowScanner(false);
                            }
                        }
                    } catch (e) {}
                }, 500);

            } catch (err: any) {
                console.error(err);
                setError(err.message || "Could not start camera.");
                setShowScanner(false);
            }
        };

        startScanning();

        return () => {
            if (videoStream) videoStream.getTracks().forEach(t => t.stop());
            if (interval) clearInterval(interval);
            if (scannerRef.current) scannerRef.current.innerHTML = "";
        };
    }, [showScanner]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-[var(--color-gold)] animate-spin mb-4" />
                <p className="text-[var(--color-slate)] font-medium">Loading fulfillment manifest...</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
                <AlertCircle className="w-16 h-16 text-[var(--color-danger)] mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">Manifest Error</h1>
                <p className="text-[var(--color-slate)] mb-8">{error || "Could not load booking data."}</p>
                <Link href="/admin/bookings" className="btn-primary inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Bookings
                </Link>
            </div>
        );
    }

    const assignedCount = booking.unitAssignments.filter(a => a.status === 'dispatched').length;
    const returnedCount = booking.unitAssignments.filter(a => a.status === 'returned').length;
    const percentDone = Math.round((assignedCount / booking.units) * 100);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin/bookings" className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Fulfillment Manifest</h1>
                        <p className="text-xs text-[var(--color-gold)] font-mono">#{booking.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border ${
                    booking.status === 'booked' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}>
                    {booking.status}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left: Booking Details & Status */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Product Card */}
                    <div className="glass rounded-2xl p-6 border-white/5 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Box className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4 text-[var(--color-gold)]" /> Equipment to Load
                            </h3>
                            <div className="flex items-center gap-4 mb-6">
                                {booking.product.thumbnailUrl ? (
                                    <img src={booking.product.thumbnailUrl} className="w-16 h-16 rounded-lg object-cover border border-white/10" alt="" />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-navy-lighter flex items-center justify-center border border-white/10">
                                        <Package className="w-8 h-8 text-white/20" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">{booking.product.name}</h2>
                                    <p className="text-sm text-[var(--color-slate)] font-medium mt-1">
                                        Quantity: <span className="text-white font-bold">{booking.units} Units</span>
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-[var(--color-slate)]">Progress</span>
                                    <span className={percentDone === 100 ? "text-emerald-500" : "text-[var(--color-gold)]"}>
                                        {assignedCount} / {booking.units} - {percentDone}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ${percentDone === 100 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-[var(--color-gold)] shadow-[0_0_15px_rgba(255,183,0,0.3)]"}`} 
                                        style={{ width: `${percentDone}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Project/Customer context */}
                    <div className="glass rounded-2xl p-6 border-white/5">
                        <h3 className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider mb-4">Project Context</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-[var(--color-slate)] uppercase">Project</p>
                                <p className="text-sm font-bold text-white">{booking.projectName || "Standard Rental"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--color-slate)] uppercase">Client</p>
                                <p className="text-sm font-bold text-white">{booking.customerName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <p className="text-[10px] text-[var(--color-slate)] uppercase">Bump-In</p>
                                    <p className="text-[11px] font-medium text-white">{new Date(booking.startDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-[var(--color-slate)] uppercase">Bump-Out</p>
                                    <p className="text-[11px] font-medium text-white">{new Date(booking.endDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right: Fulfillment Actions & List */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Scan Input / Scanner */}
                    <div className="glass rounded-2xl p-1 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-[var(--color-warm-white)] uppercase tracking-wider">Load / Unload Scanner</h3>
                                {recentMessage.text && (
                                    <div className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-2 animate-pulse ${
                                        recentMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                        {recentMessage.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                        {recentMessage.text}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="relative flex-1">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gold)]">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={scannedTag}
                                        onChange={(e) => setScannedTag(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAction('dispatch')}
                                        placeholder="Scan or Type Asset Tag..."
                                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-[var(--color-gold)] focus:outline-none transition-all font-mono"
                                    />
                                    {processingAction && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-5 h-5 text-[var(--color-gold)] animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <button 
                                    disabled={processingAction}
                                    onClick={() => handleAction('auto_allocate')}
                                    className="px-6 py-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold uppercase tracking-wider hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    ⚡ Auto-Allocate
                                </button>
                                <button 
                                    disabled={processingAction}
                                    onClick={() => handleAction('manual_allocate')}
                                    className="px-6 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(255,183,0,0.1)] disabled:opacity-50"
                                >
                                    <Truck className="w-5 h-5" /> Allocate Tag
                                </button>
                                <a 
                                    href={`/api/pdf/manifest/${bookingId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                                >
                                    📄 PDF Manifest
                                </a>
                                <button 
                                    onClick={() => setShowScanner(!showScanner)}
                                    className={`p-4 rounded-xl border flex items-center justify-center transition-all ${
                                        showScanner 
                                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <Camera className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Camera View */}
                            {showScanner && (
                                <div className="mt-4 relative aspect-video bg-navy rounded-xl overflow-hidden border border-[var(--color-gold)]/30 ring-4 ring-[var(--color-gold)]/10">
                                    <div ref={scannerRef} className="w-full h-full" />
                                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-[var(--color-gold)] border-dashed rounded-lg opacity-50" />
                                    </div>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap">
                                        Point at QR Code
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Load Out</p>
                                        <p className="text-xs text-white">Scanned units mark as <strong className="text-emerald-500">ON RENT</strong></p>
                                    </div>
                                </div>
                                <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <RotateCcw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Return In</p>
                                        <p className="text-xs text-white">Scanned units mark as <strong className="text-blue-500">AVAILABLE</strong></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assigned List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4" /> Assignment History
                            </h3>
                            <div className="text-[10px] font-bold text-[var(--color-slate)] uppercase">
                                {booking.unitAssignments.length} Assignments
                            </div>
                        </div>

                        {booking.unitAssignments.length === 0 ? (
                            <div className="glass rounded-xl p-8 text-center text-[var(--color-slate)] italic text-sm">
                                No physical units assigned yet. Start scanning to load into truck.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {booking.unitAssignments.sort((a, b) => new Date(b.scannedOutAt || 0).getTime() - new Date(a.scannedOutAt || 0).getTime()).map((item) => (
                                    <div 
                                        key={item.id} 
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            item.status === 'returned' 
                                            ? "bg-slate-500/5 border-white/5 opacity-60" 
                                            : "bg-white/[0.03] border-white/10 hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                                                item.status === 'returned' ? "bg-slate-500/20 text-slate-400" : "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                                            }`}>
                                                <QrCode className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white font-mono tracking-widest">{item.inventoryUnit.assetTagCode}</p>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                                                    Condition: <span className="text-white font-bold">{item.inventoryUnit.conditionStatus}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right mr-2">
                                                <p className="text-[10px] text-slate-500 uppercase">Status</p>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    item.status === 'dispatched' ? "text-emerald-500" :
                                                    item.status === 'packed' ? "text-amber-400" :
                                                    item.status === 'staged' ? "text-sky-400" : "text-slate-300"
                                                }`}>
                                                    {item.status}
                                                </p>
                                            </div>
                                            {item.status === 'allocated' && (
                                                <button 
                                                    onClick={() => handleAction('stage', item.inventoryUnit.assetTagCode)}
                                                    className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase hover:bg-sky-500/20 transition-all"
                                                >
                                                    Stage
                                                </button>
                                            )}
                                            {item.status === 'staged' && (
                                                <button 
                                                    onClick={() => handleAction('pack', item.inventoryUnit.assetTagCode)}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase hover:bg-amber-500/20 transition-all"
                                                >
                                                    Pack
                                                </button>
                                            )}
                                            {item.status === 'dispatched' && (
                                                <button 
                                                    onClick={() => handleAction('return', item.inventoryUnit.assetTagCode)}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold uppercase hover:bg-blue-500/20 transition-all"
                                                >
                                                    Return
                                                </button>
                                            )}
                                            {['allocated', 'staged', 'packed'].includes(item.status) && (
                                                <button 
                                                    onClick={() => handleAction('release', item.inventoryUnit.assetTagCode)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-all"
                                                    title="Release Allocation"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
            
            {/* Legend / Info */}
            <div className="mt-12 p-6 rounded-2xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/10 flex items-start gap-4">
                <Info className="w-6 h-6 text-[var(--color-gold)] shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Warehouse Workflow Guide</h4>
                    <p className="text-xs text-[var(--color-slate)] mt-1.5 leading-relaxed">
                        1. <strong>Load Out (Bump-In)</strong>: Scan equipment before it leaves the warehouse. This marks the unit as <span className="text-emerald-500">ON RENT</span> and links it to this specific booking for tracking.
                    </p>
                    <p className="text-xs text-[var(--color-slate)] mt-1.5 leading-relaxed">
                        2. <strong>Return In (Bump-Out)</strong>: Scan equipment when it returns. This unlinks it from the booking and marks the unit as <span className="text-blue-500">AVAILABLE</span> for the next rental.
                    </p>
                    <p className="text-xs text-[var(--color-slate)] mt-1.5 leading-relaxed">
                        3. <strong>Damage Check</strong>: If an item returns damaged, use the <strong>Fleet Management</strong> tab to mark it for Maintenance. It will be automatically removed from available catalog stock.
                    </p>
                </div>
            </div>
        </div>
    );
}
