"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Scan,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRightLeft,
    ChevronDown,
    Package,
    Camera,
    Clock,
    Trash2,
    FileSignature,
    Sparkles,
    X,
    Layers,
    MapPin,
    Maximize2,
    Minimize2,
    Volume2,
    VolumeX,
    ArrowUpRight,
    Wifi
} from "lucide-react";
import { format } from "date-fns";
import QRScannerModal from "@/components/warehouse/QRScannerModal";
import DigitalHandoverModal from "@/components/warehouse/DigitalHandoverModal";
import KitAuditModal from "@/components/warehouse/KitAuditModal";
import { offlineBuffer } from "@/lib/offline-sync-buffer";
import OfflineSyncBanner from "@/components/warehouse/OfflineSyncBanner";
import { 
    playScannerBeep, 
    playErrorBuzzer, 
    playCrossDockChime, 
    playClickBeep,
    isWarehouseSoundEnabled,
    setWarehouseSoundEnabled 
} from "@/lib/warehouse-audio";

type ScanEntry = {
    id: string;
    assetTag: string;
    action: "dispatch" | "return";
    status: "success" | "error" | "pending";
    message: string;
    timestamp: Date;
};

type Booking = {
    id: string;
    projectName: string | null;
    customerName: string;
    startDate: string;
    unitsAssigned?: number;
    itemsCount?: number;
};

export default function FulfillmentPage() {
    const [action, setAction] = useState<"dispatch" | "return">("dispatch");
    const [assetTag, setAssetTag] = useState("");
    const [bookingId, setBookingId] = useState("");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [scanLog, setScanLog] = useState<ScanEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [returnCondition, setReturnCondition] = useState("good");
    const [returnNotes, setReturnNotes] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    
    // Kiosk Fullscreen Mode & Screen Flash
    const [kioskMode, setKioskMode] = useState(false);
    const [screenFlash, setScreenFlash] = useState<"success" | "error" | "alert" | null>(null);

    // Finalize Modal State
    const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

    // Kit Audit Modal State
    const [kitAuditOpen, setKitAuditOpen] = useState(false);

    // Cross-Dock State
    const [crossDockAlert, setCrossDockAlert] = useState<{
        unitId: string;
        assetTagCode: string;
        productName: string;
        bookingId: string;
        projectName: string;
        hoursUntil: number;
        stagingBay: string;
    } | null>(null);
    const [crossDockExecuting, setCrossDockExecuting] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const kioskInputRef = useRef<HTMLInputElement>(null);

    const triggerScreenFlash = (type: "success" | "error" | "alert") => {
        setScreenFlash(type);
        setTimeout(() => setScreenFlash(null), type === "alert" ? 900 : 500);
    };

    const executeCrossDock = async () => {
        if (!crossDockAlert) return;
        setCrossDockExecuting(true);
        try {
            const res = await fetch("/api/admin/warehouse/cross-dock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unitId: crossDockAlert.unitId,
                    bookingId: crossDockAlert.bookingId,
                    stagingBay: crossDockAlert.stagingBay,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                playCrossDockChime();
                triggerScreenFlash("alert");
                addEntry(crossDockAlert.assetTagCode, {
                    id: crypto.randomUUID(),
                    status: "success",
                    message: `🚀 Cross-docked directly to ${crossDockAlert.projectName} (${crossDockAlert.stagingBay})`,
                });
                setCrossDockAlert(null);
            } else {
                playErrorBuzzer();
                triggerScreenFlash("error");
            }
        } catch (e) {
            console.error(e);
            playErrorBuzzer();
            triggerScreenFlash("error");
        } finally {
            setCrossDockExecuting(false);
        }
    };

    // Load active bookings
    useEffect(() => {
        fetch("/api/admin/bookings")
            .then(r => r.json())
            .then((data: any[]) => {
                if (Array.isArray(data)) {
                    const active = data.filter((b: any) =>
                        ["approved", "booked", "quote_accepted"].includes(b.status)
                    );
                    setBookings(active);
                    if (active.length === 1) setBookingId(active[0].id);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingBookings(false));
    }, []);

    // Auto-focus barcode input
    useEffect(() => {
        if (!scannerOpen) {
            if (kioskMode) {
                kioskInputRef.current?.focus();
            } else {
                inputRef.current?.focus();
            }
        }
    }, [action, bookingId, scannerOpen, kioskMode]);

    // Keyboard Hotkeys: F2 (Dispatch/Return toggle), F4 (Kiosk mode), Esc (Exit Kiosk)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") {
                e.preventDefault();
                playClickBeep();
                setAction(prev => prev === "dispatch" ? "return" : "dispatch");
            } else if (e.key === "F4") {
                e.preventDefault();
                playClickBeep();
                setKioskMode(prev => !prev);
            } else if (e.key === "Escape" && kioskMode) {
                e.preventDefault();
                playClickBeep();
                setKioskMode(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [kioskMode]);

    const [lastScanResult, setLastScanResult] = useState<{ status: "success" | "error" | "duplicate"; timestamp: number } | null>(null);

    const processTag = useCallback(async (tag: string) => {
        const cleanTag = tag.trim().toUpperCase();
        if (!cleanTag) return;

        // Duplicate Scan Protection
        const isDuplicate = scanLog.some(entry => entry.assetTag === cleanTag && entry.status === "success" && (new Date().getTime() - entry.timestamp.getTime() < 60000));
        if (isDuplicate) {
            playErrorBuzzer();
            triggerScreenFlash("error");
            setLastScanResult({ status: "duplicate", timestamp: Date.now() });
            addEntry(cleanTag, { status: "error", message: "Duplicate scan detected within 60s." });
            setAssetTag("");
            return;
        }

        if (action === "dispatch" && !bookingId) {
            playErrorBuzzer();
            triggerScreenFlash("error");
            setLastScanResult({ status: "error", timestamp: Date.now() });
            addEntry(cleanTag, { status: "error", message: "Please select a booking target first." });
            setAssetTag("");
            return;
        }

        const scanId = crypto.randomUUID();
        // Optimistic Add
        addEntry(cleanTag, { 
            id: scanId,
            status: "pending", 
            message: "Verifying with server..." 
        });

        setAssetTag("");
        setLoading(true);

        const body: any = { assetTag: cleanTag, action };
        if (action === "dispatch") body.bookingId = bookingId;
        if (action === "return") {
            body.condition = returnCondition;
            body.notes = returnNotes || undefined;
            body.bookingId = bookingId || "auto";
        }

        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        if (isOffline) {
            offlineBuffer.enqueueAction({
                actionType: "fulfillment_scan",
                endpoint: "/api/admin/fulfillment",
                payload: body,
                description: `Offline Scan (${action.toUpperCase()}): ${cleanTag}`,
            });
            playScannerBeep();
            triggerScreenFlash("success");
            updateEntry(scanId, { 
                status: "success", 
                message: `Buffered offline (${cleanTag}). Syncs when signal returns.` 
            });
            setLastScanResult({ status: "success", timestamp: Date.now() });
            setLoading(false);
            setTimeout(() => {
                if (kioskMode) kioskInputRef.current?.focus();
                else inputRef.current?.focus();
            }, 100);
            return;
        }

        try {
            const res = await fetch("/api/admin/fulfillment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (res.ok) {
                playScannerBeep();
                triggerScreenFlash("success");
                updateEntry(scanId, { status: "success", message: data.message || "Operation successful" });
                setLastScanResult({ status: "success", timestamp: Date.now() });

                // Check for fast-turnaround cross-dock opportunity
                if (action === "return") {
                    fetch(`/api/admin/warehouse/cross-dock?identifier=${encodeURIComponent(cleanTag)}`)
                        .then(r => r.json())
                        .then(cdData => {
                            if (cdData.isCrossDock && cdData.targetBooking) {
                                playCrossDockChime();
                                triggerScreenFlash("alert");
                                setCrossDockAlert({
                                    unitId: cdData.unitId,
                                    assetTagCode: cdData.assetTagCode,
                                    productName: cdData.productName,
                                    bookingId: cdData.targetBooking.id,
                                    projectName: cdData.targetBooking.projectName || cdData.targetBooking.customerName,
                                    hoursUntil: cdData.targetBooking.hoursUntilDeparture,
                                    stagingBay: cdData.targetBooking.stagingBay,
                                });
                            }
                        })
                        .catch(() => {});
                }
            } else {
                playErrorBuzzer();
                triggerScreenFlash("error");
                updateEntry(scanId, { status: "error", message: data.error || "Scan failed" });
                setLastScanResult({ status: "error", timestamp: Date.now() });
            }
        } catch {
            offlineBuffer.enqueueAction({
                actionType: "fulfillment_scan",
                endpoint: "/api/admin/fulfillment",
                payload: body,
                description: `Offline Scan (${action.toUpperCase()}): ${cleanTag}`,
            });
            playScannerBeep();
            triggerScreenFlash("success");
            updateEntry(scanId, { 
                status: "success", 
                message: `Network dropped. Buffered locally (${cleanTag}).` 
            });
            setLastScanResult({ status: "success", timestamp: Date.now() });
        } finally {
            setLoading(false);
            setTimeout(() => {
                if (kioskMode) kioskInputRef.current?.focus();
                else inputRef.current?.focus();
            }, 100);
        }
    }, [action, bookingId, returnCondition, returnNotes, scanLog, kioskMode]);

    function addEntry(tag: string, result: Partial<ScanEntry>) {
        setScanLog(prev => [{
            id: result.id || crypto.randomUUID(),
            assetTag: tag,
            action,
            status: result.status || "success",
            message: result.message || "",
            timestamp: new Date(),
        }, ...prev].slice(0, 60));
    }

    function updateEntry(id: string, updates: Partial<ScanEntry>) {
        setScanLog(prev => prev.map(entry => 
            entry.id === id ? { ...entry, ...updates } : entry
        ));
    }

    // High-Speed RFID Burst Ingestion Handler
    const processBatchTags = useCallback(async (incomingTags: string[]) => {
        if (!incomingTags || incomingTags.length === 0) return;
        const distinctTags = Array.from(new Set(incomingTags.map(t => t.trim().toUpperCase()).filter(Boolean)));
        if (distinctTags.length === 0) return;

        if (action === "dispatch" && !bookingId) {
            playErrorBuzzer();
            triggerScreenFlash("error");
            setLastScanResult({ status: "error", timestamp: Date.now() });
            distinctTags.forEach(tag => addEntry(tag, { status: "error", message: "Please select a booking first." }));
            return;
        }

        const batchMap = new Map<string, string>();
        distinctTags.forEach(tag => {
            const scanId = crypto.randomUUID();
            batchMap.set(tag, scanId);
            addEntry(tag, { 
                id: scanId,
                status: "pending", 
                message: `Verifying in RFID batch (${distinctTags.length} items)...` 
            });
        });

        setLoading(true);

        const body: any = { 
            tags: distinctTags, 
            action: `bulk_${action}`,
            bookingId: bookingId || "auto"
        };
        if (action === "return") {
            body.condition = returnCondition;
            body.notes = returnNotes || undefined;
        }

        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        if (isOffline) {
            offlineBuffer.enqueueAction({
                actionType: "fulfillment_scan",
                endpoint: "/api/admin/fulfillment",
                payload: body,
                description: `Offline RFID Batch (${action.toUpperCase()}): ${distinctTags.length} items`,
            });
            playScannerBeep();
            triggerScreenFlash("success");
            distinctTags.forEach(tag => {
                const scanId = batchMap.get(tag);
                if (scanId) updateEntry(scanId, { status: "success", message: `Buffered offline in batch (${tag}).` });
            });
            setLastScanResult({ status: "success", timestamp: Date.now() });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/admin/fulfillment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                playScannerBeep();
                triggerScreenFlash("success");
                distinctTags.forEach(tag => {
                    const scanId = batchMap.get(tag);
                    if (scanId) updateEntry(scanId, { status: "success", message: data.message || `Processed in ${data.action}` });
                });
                setLastScanResult({ status: "success", timestamp: Date.now() });
            } else {
                playErrorBuzzer();
                triggerScreenFlash("error");
                distinctTags.forEach(tag => {
                    const scanId = batchMap.get(tag);
                    if (scanId) updateEntry(scanId, { status: "error", message: data.error || "Batch scan failed" });
                });
                setLastScanResult({ status: "error", timestamp: Date.now() });
            }
        } catch {
            offlineBuffer.enqueueAction({
                actionType: "fulfillment_scan",
                endpoint: "/api/admin/fulfillment",
                payload: body,
                description: `Offline RFID Batch (${action.toUpperCase()}): ${distinctTags.length} items`,
            });
            playScannerBeep();
            triggerScreenFlash("success");
            distinctTags.forEach(tag => {
                const scanId = batchMap.get(tag);
                if (scanId) updateEntry(scanId, { status: "success", message: `Network dropped. Buffered locally (${tag}).` });
            });
            setLastScanResult({ status: "success", timestamp: Date.now() });
        } finally {
            setLoading(false);
            setTimeout(() => {
                if (kioskMode) kioskInputRef.current?.focus();
                else inputRef.current?.focus();
            }, 100);
        }
    }, [action, bookingId, returnCondition, returnNotes, kioskMode]);

    const handleCameraScan = (result: string) => {
        processTag(result);
    };

    const selectedBooking = bookings.find(b => b.id === bookingId);
    const successfulDispatches = scanLog.filter(s => s.action === "dispatch" && s.status === "success").length;
    const latestEntry = scanLog[0] || null;

    return (
        <div className="relative p-4 md:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full pb-24 text-slate-100">
            {/* Screen Flash Visual Feedback */}
            {screenFlash && (
                <div 
                    className={`fixed inset-0 pointer-events-none z-[100] transition-opacity duration-300 ${
                        screenFlash === "success" 
                            ? "bg-emerald-500/20" 
                            : screenFlash === "alert" 
                                ? "bg-amber-500/30" 
                                : "bg-red-500/25"
                    }`} 
                />
            )}

            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleCameraScan}
                onBatchScan={processBatchTags}
                title={`Scanning: ${action.toUpperCase()} (RFID Stream Ready)`}
                lastResult={lastScanResult}
            />

            {/* Header with Kiosk Mode Button */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20 uppercase tracking-wider">
                            Multi-Protocol Terminal
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Press F2 to toggle mode &middot; F4 for Kiosk</span>
                    </div>
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black uppercase tracking-tight text-white italic">
                        Scan to <span className="text-[var(--color-gold)]">{action === "dispatch" ? "Dispatch" : "Return"}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => {
                            playClickBeep();
                            setKioskMode(true);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[var(--color-gold)] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-amber-500/10"
                    >
                        <Maximize2 className="w-4 h-4" />
                        Rugged Kiosk Mode (F4)
                    </button>

                    <button
                        onClick={() => {
                            playClickBeep();
                            setKitAuditOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-purple-500/10"
                    >
                        <Layers className="w-4 h-4" />
                        Kit Audit
                    </button>
                </div>
            </header>

            {/* Offline Sync Banner */}
            <OfflineSyncBanner className="w-full" />

            {/* Cross-Dock Fast-Turnaround Opportunity Banner */}
            {crossDockAlert && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border-2 border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/25 text-amber-300 shrink-0 border border-amber-500/30">
                            <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-gold)]">
                                    🚀 Fast-Turnaround Cross-Dock Opportunity
                                </span>
                                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                    Departs in {crossDockAlert.hoursUntil}h
                                </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                                Returned unit <strong className="text-white font-mono">{crossDockAlert.assetTagCode}</strong> ({crossDockAlert.productName}) is needed for <strong className="text-amber-300">{crossDockAlert.projectName}</strong>. Bypass rack putaway!
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={executeCrossDock}
                            disabled={crossDockExecuting}
                            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[var(--color-gold)] text-black hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {crossDockExecuting ? "Staging..." : "Fast-Track Stage to Bay 02"}
                        </button>
                        <button
                            onClick={() => setCrossDockAlert(null)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                            title="Dismiss Cross-Dock Alert"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Action Toggle (Dispatch vs Return) */}
            <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-xl border border-white/10 w-full shadow-2xl">
                {(["dispatch", "return"] as const).map(a => (
                    <button
                        key={a}
                        onClick={() => {
                            playClickBeep();
                            setAction(a);
                        }}
                        className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-lg font-black text-xs uppercase tracking-[0.2em] transition-all ${
                            action === a
                                ? a === "dispatch"
                                    ? "bg-[var(--color-gold)] text-black shadow-lg shadow-amber-500/20"
                                    : "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        {a === "dispatch" ? "Dispatch (Bump-Out)" : "Return (Check-In)"}
                    </button>
                ))}
            </div>

            {/* Booking Selector Area (Dispatch) */}
            {action === "dispatch" && (
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Deployment Target *
                    </label>
                    <div className="relative group">
                        <select
                            value={bookingId}
                            onChange={e => {
                                playClickBeep();
                                setBookingId(e.target.value);
                            }}
                            aria-label="Select deployment target booking"
                            className="w-full appearance-none bg-slate-900/60 border border-white/10 text-white rounded-xl px-5 py-4 pr-12 text-sm font-bold uppercase tracking-tight focus:outline-none focus:border-amber-400/50 transition-all"
                        >
                            <option value="" className="bg-slate-900">— Select active project —</option>
                            {loadingBookings ? (
                                <option disabled className="bg-slate-900">Loading bookings...</option>
                            ) : (
                                bookings.map(b => (
                                    <option key={b.id} value={b.id} className="bg-slate-900">
                                        {b.projectName || b.customerName} · {format(new Date(b.startDate), "MMM do")}
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-focus-within:text-amber-400 transition-colors" />
                    </div>

                    {selectedBooking && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 bg-amber-500/[0.04] border border-amber-500/20 rounded-xl shadow-lg">
                            <div className="flex items-center gap-3 text-xs text-[var(--color-gold)]">
                                <Package className="h-4 w-4 shrink-0" />
                                <span className="font-black uppercase tracking-wider">
                                    {successfulDispatches} of {selectedBooking.itemsCount || 0} items scanned &middot; {selectedBooking.customerName}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    playClickBeep();
                                    setFinalizeModalOpen(true);
                                }}
                                className="flex items-center justify-center gap-2.5 px-6 h-11 bg-[var(--color-gold)] hover:brightness-110 text-black rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-xl active:scale-95 shrink-0"
                            >
                                <FileSignature className="h-4 w-4" /> Finalize Load &amp; Sign
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Return Context (Audit: Resource Condition) */}
            {action === "return" && (
                <div className="flex flex-col gap-4 p-5 bg-sky-500/[0.04] border border-sky-500/20 rounded-xl">
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Audit: Resource Condition</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(["excellent", "good", "needs_service", "damaged"] as const).map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                        playClickBeep();
                                        setReturnCondition(c);
                                    }}
                                    className={`py-3 px-3 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                                        returnCondition === c
                                            ? "bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20 scale-[1.02]"
                                            : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                                    }`}
                                >
                                    {c.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        value={returnNotes}
                        onChange={e => setReturnNotes(e.target.value)}
                        placeholder="Log technical defects or return notes (optional)..."
                        rows={2}
                        className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-2.5 text-xs font-medium resize-none focus:outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-500"
                    />
                </div>
            )}

            {/* Main Barcode & RFID Input Terminal */}
            <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Asset Identity Passport / Barcode
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Auto-submits on Enter or Gun Trigger</span>
                </div>
                <div className="flex gap-2.5">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={assetTag}
                            onChange={e => setAssetTag(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && processTag(assetTag)}
                            placeholder="E3-XXXXX"
                            className={`w-full bg-slate-900/90 border-2 text-white rounded-xl px-5 py-4 text-xl sm:text-2xl font-[family-name:var(--font-heading)] font-black tracking-[0.3em] focus:outline-none transition-all placeholder:text-white/10 shadow-2xl ${
                                action === "dispatch" ? "border-amber-500/30 focus:border-amber-400" : "border-sky-500/30 focus:border-sky-400"
                            }`}
                            autoCapitalize="characters"
                            spellCheck={false}
                            disabled={loading}
                        />
                        {loading && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Loader2 className={`h-6 w-6 animate-spin ${action === "dispatch" ? "text-amber-400" : "text-sky-400"}`} />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            playClickBeep();
                            setScannerOpen(true);
                        }}
                        aria-label="Open camera scanner"
                        className={`px-5 rounded-xl border-2 flex items-center justify-center transition-all shadow-xl ${
                            action === "dispatch"
                                ? "border-amber-500/30 bg-amber-500/10 text-[var(--color-gold)] hover:bg-amber-500/20"
                                : "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                        }`}
                        title="Camera QR & RFID Burst Scanner"
                    >
                        <Camera className="h-6 w-6" />
                    </button>
                    
                    {!loading && (
                        <button
                            onClick={() => processTag(assetTag)}
                            disabled={!assetTag.trim()}
                            className={`px-7 rounded-xl font-black text-xs uppercase tracking-[0.15em] flex items-center gap-2 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed ${
                                action === "dispatch"
                                    ? "bg-[var(--color-gold)] text-black hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-sky-500 text-white hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                        >
                            <Scan className="h-4 w-4" />
                            Submit
                        </button>
                    )}
                </div>
            </div>

            {/* Activity Stream with One-Tap Floor Locator */}
            {scanLog.length > 0 && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 mt-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Fulfillment Audit Trail ({scanLog.length})</span>
                        <button
                            onClick={() => {
                                playClickBeep();
                                setScanLog([]);
                            }}
                            className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all uppercase tracking-wider"
                        >
                            <Trash2 className="h-3 w-3" /> Clear History
                        </button>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                        {scanLog.map(entry => (
                            <div
                                key={entry.id}
                                className={`flex items-start justify-between gap-3 p-4 rounded-xl border transition-all ${
                                    entry.status === "success"
                                        ? "bg-emerald-500/[0.04] border-emerald-500/20"
                                        : entry.status === "pending"
                                            ? "bg-amber-500/[0.04] border-amber-500/20"
                                            : "bg-red-500/[0.04] border-red-500/20"
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-0.5">
                                        {entry.status === "success" ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        ) : entry.status === "pending" ? (
                                            <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-mono font-black tracking-wider text-sm text-white">
                                                {entry.assetTag}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                                entry.action === "dispatch" ? "border-amber-500/30 text-[var(--color-gold)]" : "border-sky-500/30 text-sky-400"
                                            }`}>
                                                {entry.action}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 truncate">{entry.message}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Direct One-Tap Link to Digital Twin Floor Map */}
                                    {entry.assetTag && entry.assetTag !== "SYSTEM" && entry.assetTag !== "KIT-AUDIT" && (
                                        <Link
                                            href={`/dashboard/warehouse/map?locate=${encodeURIComponent(entry.assetTag)}`}
                                            target="_blank"
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-bold text-[var(--color-gold)] border border-amber-500/20 transition-all"
                                            title="Illuminate rack location on 3D floor map"
                                        >
                                            <MapPin className="w-3 h-3" />
                                            <span>Locate Map</span>
                                            <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                                        </Link>
                                    )}

                                    <span className="text-[10px] font-mono text-slate-500">
                                        {format(entry.timestamp, "HH:mm:ss")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {scanLog.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-20 bg-white/[0.01] border border-white/5 rounded-3xl mt-4">
                    <Scan className="h-16 w-16 text-slate-600 animate-pulse" />
                    <div className="text-center">
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-white">Scanner Engine Ready</p>
                        <p className="text-xs text-slate-400 mt-1">Pull hardware trigger or scan barcode to fulfill</p>
                    </div>
                </div>
            )}

            {/* RUGGED KIOSK FULLSCREEN MODE OVERLAY */}
            {kioskMode && (
                <div className="fixed inset-0 z-50 bg-[#060812] flex flex-col p-4 sm:p-8 select-none overflow-hidden">
                    {/* Top Kiosk Bar */}
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[var(--color-gold)] text-xs font-mono font-bold">
                                KIOSK SCANNER
                            </span>
                            {selectedBooking && action === "dispatch" && (
                                <div className="text-xs text-slate-300 truncate max-w-sm">
                                    Target: <strong className="text-white">{selectedBooking.projectName || selectedBooking.customerName}</strong>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Big Mode Switch in Kiosk */}
                            <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
                                {(["dispatch", "return"] as const).map(a => (
                                    <button
                                        key={a}
                                        onClick={() => {
                                            playClickBeep();
                                            setAction(a);
                                        }}
                                        className={`px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                                            action === a
                                                ? a === "dispatch" ? "bg-[var(--color-gold)] text-black" : "bg-sky-500 text-white"
                                                : "text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    playClickBeep();
                                    setKioskMode(false);
                                }}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                            >
                                <Minimize2 className="w-4 h-4" /> Exit (Esc)
                            </button>
                        </div>
                    </div>

                    {/* Main Kiosk Center Section */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-3xl mx-auto w-full py-6">
                        {/* Giant Input */}
                        <div className="w-full space-y-2">
                            <div className="text-center text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                                Scan or type barcode tag &middot; Press enter
                            </div>
                            <input
                                ref={kioskInputRef}
                                type="text"
                                value={assetTag}
                                onChange={e => setAssetTag(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === "Enter" && processTag(assetTag)}
                                placeholder="E3-XXXXX"
                                className={`w-full bg-slate-900 border-4 text-center text-white rounded-3xl px-6 py-6 text-3xl sm:text-5xl font-mono font-black tracking-[0.3em] focus:outline-none transition-all shadow-2xl ${
                                    action === "dispatch" ? "border-amber-400 focus:ring-8 focus:ring-amber-500/20" : "border-sky-400 focus:ring-8 focus:ring-sky-500/20"
                                }`}
                                autoFocus
                                spellCheck={false}
                            />
                        </div>

                        {/* Last Scanned Giant Card */}
                        {latestEntry ? (
                            <div className={`w-full p-6 rounded-3xl border-2 flex items-center justify-between gap-6 transition-all ${
                                latestEntry.status === "success" 
                                    ? "bg-emerald-500/10 border-emerald-500/50" 
                                    : "bg-red-500/10 border-red-500/50"
                            }`}>
                                <div className="flex items-center gap-5">
                                    {latestEntry.status === "success" ? (
                                        <CheckCircle2 className="w-12 h-12 text-emerald-400 shrink-0" />
                                    ) : (
                                        <XCircle className="w-12 h-12 text-red-400 shrink-0" />
                                    )}
                                    <div>
                                        <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                            Last Scanned Passport:
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-mono font-black text-white">
                                            {latestEntry.assetTag}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-200 mt-1">
                                            {latestEntry.message}
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    href={`/dashboard/warehouse/map?locate=${encodeURIComponent(latestEntry.assetTag)}`}
                                    target="_blank"
                                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0"
                                >
                                    <MapPin className="w-4 h-4 text-amber-400" />
                                    Floor Map
                                </Link>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest border border-dashed border-white/10 rounded-2xl w-full">
                                Ready for first scan &middot; Aim scanner at asset code
                            </div>
                        )}

                        {/* Return Condition Fast Selector in Kiosk */}
                        {action === "return" && (
                            <div className="w-full flex items-center justify-center gap-3">
                                {(["excellent", "good", "needs_service", "damaged"] as const).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => {
                                            playClickBeep();
                                            setReturnCondition(c);
                                        }}
                                        className={`flex-1 py-4 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                                            returnCondition === c
                                                ? "bg-sky-500 border-sky-300 text-white shadow-xl scale-105"
                                                : "bg-slate-900 border-white/10 text-slate-400"
                                        }`}
                                    >
                                        {c.replace("_", " ")}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Kiosk Strip: Last 5 Scans */}
                    <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <span className="font-mono uppercase font-bold text-[10px] text-slate-500 mr-2 shrink-0">Recent:</span>
                            {scanLog.slice(0, 5).map(e => (
                                <span 
                                    key={e.id}
                                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border shrink-0 ${
                                        e.status === "success" 
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                                            : "bg-red-500/10 border-red-500/30 text-red-300"
                                    }`}
                                >
                                    {e.assetTag}
                                </span>
                            ))}
                        </div>

                        <div className="shrink-0 font-mono text-xs">
                            Session Total: <strong className="text-white">{scanLog.filter(s => s.status === "success").length}</strong> units
                        </div>
                    </div>
                </div>
            )}

            {/* Digital Handover & e-POD Signature Modal */}
            <DigitalHandoverModal
                isOpen={finalizeModalOpen}
                onClose={() => setFinalizeModalOpen(false)}
                bookingId={bookingId}
                bookingTitle={selectedBooking ? (selectedBooking.projectName || selectedBooking.customerName) : "Outbound Booking"}
                itemsCount={selectedBooking?.itemsCount || 0}
                onSuccess={(result) => {
                    playCrossDockChime();
                    addEntry("SYSTEM", { status: "success", message: result.message || "Handover authorized & signed." });
                    window.open(result.manifestUrl, "_blank");
                    setFinalizeModalOpen(false);
                }}
            />

            {/* Flight Case & Kit Integrity Audit Modal */}
            <KitAuditModal
                isOpen={kitAuditOpen}
                onClose={() => setKitAuditOpen(false)}
                bookingId={bookingId}
                defaultMode={action === "dispatch" ? "pack" : "return"}
                onSuccess={(result) => {
                    playScannerBeep();
                    addEntry("KIT-AUDIT", {
                        status: "success",
                        message: `Kit audit committed (${result.action?.toUpperCase()}): ${result.verifiedCount}/${result.totalItems} items verified.`
                    });
                }}
            />
        </div>
    );
}
