"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
    FileSignature
} from "lucide-react";
import { format } from "date-fns";
import QRScannerModal from "@/components/warehouse/QRScannerModal";
import { finalizeTransport } from "@/actions/dispatch";

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

const CONDITION_OPTIONS = ["excellent", "good", "fair", "poor", "maintenance_required"];

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
    
    // Finalize Modal State
    const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
    const [driverName, setDriverName] = useState("");
    const [vehiclePlate, setVehiclePlate] = useState("");
    const [isFinalizing, setIsFinalizing] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        if (!scannerOpen) inputRef.current?.focus();
    }, [action, bookingId, scannerOpen]);

    const [lastScanResult, setLastScanResult] = useState<{ status: "success" | "error" | "duplicate"; timestamp: number } | null>(null);

    const processTag = useCallback(async (tag: string) => {
        const cleanTag = tag.trim().toUpperCase();
        if (!cleanTag) return;

        // ─── Zone 3: Duplicate Scan Protection ───
        const isDuplicate = scanLog.some(entry => entry.assetTag === cleanTag && entry.status === "success" && (new Date().getTime() - entry.timestamp.getTime() < 60000));
        if (isDuplicate) {
            setLastScanResult({ status: "duplicate", timestamp: Date.now() });
            addEntry(cleanTag, { status: "error", message: "Duplicate scan detected within 60s." });
            return;
        }

        if (action === "dispatch" && !bookingId) {
            setLastScanResult({ status: "error", timestamp: Date.now() });
            addEntry(cleanTag, { status: "error", message: "Please select a booking first." });
            return;
        }

        const scanId = crypto.randomUUID();
        // 1. Optimistic Add
        addEntry(cleanTag, { 
            id: scanId,
            status: "pending", 
            message: "Verifying with server..." 
        });

        setAssetTag("");
        setLoading(true);

        try {
            const body: any = { assetTag: cleanTag, action };
            if (action === "dispatch") body.bookingId = bookingId;
            if (action === "return") {
                body.condition = returnCondition;
                body.notes = returnNotes || undefined;
                body.bookingId = bookingId || "auto";
            }

            const res = await fetch("/api/admin/fulfillment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (res.ok) {
                updateEntry(scanId, { status: "success", message: data.message || "Operation successful" });
                setLastScanResult({ status: "success", timestamp: Date.now() });
            } else {
                updateEntry(scanId, { status: "error", message: data.error || "Scan failed" });
                setLastScanResult({ status: "error", timestamp: Date.now() });
            }
        } catch {
            updateEntry(scanId, { status: "error", message: "Network error. Try again." });
            setLastScanResult({ status: "error", timestamp: Date.now() });
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [action, bookingId, returnCondition, returnNotes, scanLog]);

    function addEntry(tag: string, result: Partial<ScanEntry>) {
        setScanLog(prev => [{
            id: result.id || crypto.randomUUID(),
            assetTag: tag,
            action,
            status: result.status || "success",
            message: result.message || "",
            timestamp: new Date(),
        }, ...prev].slice(0, 50));
    }

    function updateEntry(id: string, updates: Partial<ScanEntry>) {
        setScanLog(prev => prev.map(entry => 
            entry.id === id ? { ...entry, ...updates } : entry
        ));
    }

    // Called when the camera scanner reads a QR code
    const handleCameraScan = (result: string) => {
        // Mode remains open for continuous warehouse bumping
        // setScannerOpen(false); 
        processTag(result);
    };

    const handleFinalize = async () => {
        if (!bookingId || !driverName.trim() || !vehiclePlate.trim()) return;
        setIsFinalizing(true);
        try {
            const res = await finalizeTransport(bookingId, { 
                driverName, 
                vehiclePlateNumber: vehiclePlate 
            });
            
            if (res.success) {
                setFinalizeModalOpen(false);
                addEntry("SYSTEM", { status: "success", message: "Dispatch Finalized. Generating Manifest..." });
                // Trigger PDF download via standard Next API route
                window.open(`/api/pdf/manifest/${bookingId}`, "_blank");
            } else {
                addEntry("SYSTEM", { status: "error", message: res.error || "Failed to finalize transport" });
            }
        } catch (e: any) {
            addEntry("SYSTEM", { status: "error", message: "Network error during finalization." });
        } finally {
            setIsFinalizing(false);
        }
    };

    const selectedBooking = bookings.find(b => b.id === bookingId);

    return (
        <div className="p-4 md:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full pb-24">
            <QRScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleCameraScan}
                title={`Scanning: ${action.toUpperCase()}`}
                lastResult={lastScanResult}
            />

            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black uppercase tracking-tight text-[var(--color-warm-white)] italic">
                    Scan to <span className="text-[var(--color-gold)]">{action === "dispatch" ? "Dispatch" : "Return"}</span>
                </h1>
                <p className="text-[var(--color-slate)] text-xs mt-1 font-medium tracking-wide uppercase opacity-60">Bump-{action === "dispatch" ? "In" : "Out"} · Multi-input scanner protocol</p>
            </header>

            {/* Action Toggle */}
            <div className="flex gap-2 p-1.5 bg-[var(--color-surface)] rounded-xl border border-white/10 w-full shadow-2xl">
                {(["dispatch", "return"] as const).map(a => (
                    <button
                        key={a}
                        onClick={() => setAction(a)}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.25em] transition-all ${
                            action === a
                                ? a === "dispatch"
                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                                    : "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                                : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5"
                        }`}
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        {a === "dispatch" ? "Dispatch" : "Return"}
                    </button>
                ))}
            </div>

            {/* Booking Selector Area */}
            {action === "dispatch" && (
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60 ml-1">
                        Deployment Target *
                    </label>
                    <div className="relative group">
                        <select
                            value={bookingId}
                            onChange={e => setBookingId(e.target.value)}
                            className="w-full appearance-none bg-[var(--color-navy)]/40 border border-white/10 text-[var(--color-warm-white)] rounded-xl px-5 py-4 pr-12 text-sm font-bold uppercase tracking-tight focus:outline-none focus:border-[var(--color-gold)]/50 focus:bg-white/[0.05] transition-all"
                        >
                            <option value="" className="bg-[var(--color-navy)]">— Select active project —</option>
                            {loadingBookings ? (
                                <option disabled className="bg-[var(--color-navy)]">Loading...</option>
                            ) : (
                                bookings.map(b => (
                                    <option key={b.id} value={b.id} className="bg-[var(--color-navy)]">
                                        {b.projectName || b.customerName} · {format(new Date(b.startDate), "MMM do")}
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-slate)] pointer-events-none group-focus-within:text-[var(--color-gold)] transition-colors" />
                    </div>

                    {selectedBooking && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 glass border border-[var(--color-gold)]/20 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.05)]">
                            <div className="flex items-center gap-3 text-xs text-[var(--color-gold)]">
                                <Package className="h-4 w-4 shrink-0" />
                                <span className="font-black uppercase tracking-widest">
                                    {selectedBooking.itemsCount || 0} items required · {selectedBooking.customerName}
                                </span>
                            </div>
                            <button
                                onClick={() => setFinalizeModalOpen(true)}
                                className="flex items-center justify-center gap-3 px-8 h-12 bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-[var(--color-navy)] rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 shrink-0"
                            >
                                <FileSignature className="h-4 w-4" /> Finalize Load
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Return Context */}
            {action === "return" && (
                <div className="flex flex-col gap-5 p-5 glass border border-sky-500/20 rounded-xl bg-sky-500/5 shadow-inner">
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] opacity-80">Audit: Resource Condition</label>
                        <div className="flex gap-2 flex-wrap">
                            {CONDITION_OPTIONS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setReturnCondition(c)}
                                    className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${
                                        returnCondition === c
                                            ? c === "maintenance_required"
                                                ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20"
                                                : "bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/20"
                                            : "bg-black/20 border-white/10 text-[var(--color-slate)] hover:text-white hover:border-white/20"
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
                        className="bg-black/30 border border-white/10 text-[var(--color-warm-white)] rounded-lg px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:border-sky-500/50 transition-all placeholder:text-[var(--color-slate)]/40"
                    />
                </div>
            )}

            {/* Input Terminal */}
            <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-60 ml-1">Asset Passport Identity</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={assetTag}
                            onChange={e => setAssetTag(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && processTag(assetTag)}
                            placeholder="E3-XXXXX"
                            className={`w-full bg-[var(--color-surface)] border-2 text-[var(--color-warm-white)] rounded-xl px-6 py-4 text-2xl font-[family-name:var(--font-heading)] font-black tracking-[0.4em] focus:outline-none transition-all placeholder:text-white/5 shadow-2xl ${
                                action === "dispatch" ? "border-[var(--color-gold)]/20 focus:border-[var(--color-gold)]" : "border-sky-500/20 focus:border-sky-500"
                            }`}
                            autoCapitalize="characters"
                            spellCheck={false}
                            disabled={loading}
                        />
                         {/* Subtle loading indicator inside the input */}
                         {loading && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Loader2 className={`h-6 w-6 animate-spin ${action === "dispatch" ? "text-[var(--color-gold)]" : "text-sky-500"}`} />
                            </div>
                         )}
                    </div>

                    <button
                        onClick={() => setScannerOpen(true)}
                        className={`px-6 rounded-xl border-2 flex items-center justify-center transition-all shadow-xl ${
                            action === "dispatch"
                                ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20"
                                : "border-sky-500/30 bg-sky-500/5 text-sky-500 hover:bg-sky-500/20"
                        }`}
                    >
                        <Camera className="h-6 w-6" />
                    </button>
                    
                    {!loading && (
                        <button
                            onClick={() => processTag(assetTag)}
                            disabled={!assetTag.trim()}
                            className={`px-8 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed ${
                                action === "dispatch"
                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-sky-500 text-white hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                        >
                            <Scan className="h-4 w-4" />
                            Submit
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--color-slate)] font-bold uppercase tracking-widest opacity-40 px-1">
                    <Clock className="h-3 w-3" />
                    Real-time ingestion active · Auto-detect hardware scanners
                </div>
            </div>

            {/* Activity Stream */}
            {scanLog.length > 0 && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.25em] opacity-60">Fulfillment Audit Stream</span>
                        <button
                            onClick={() => setScanLog([])}
                            className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-2 transition-all uppercase tracking-widest"
                        >
                            <Trash2 className="h-3 w-3" /> Flush History
                        </button>
                    </div>
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {scanLog.map(entry => (
                            <div
                                key={entry.id}
                                className={`flex items-start gap-5 p-5 rounded-xl glass border transition-all duration-300 hover:bg-white/[0.02] ${
                                    entry.status === "success"
                                        ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.05)]"
                                        : entry.status === "pending"
                                            ? "bg-[var(--color-gold)]/5 border-[var(--color-gold)]/20 shadow-[0_4px_20px_rgba(212,175,55,0.05)]"
                                            : "bg-red-500/5 border-red-500/20 shadow-[0_4px_20px_rgba(239,68,68,0.05)]"
                                }`}
                            >
                                <div className="mt-1">
                                    {entry.status === "success"
                                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        : entry.status === "pending"
                                            ? <Loader2 className="h-5 w-5 text-[var(--color-gold)] animate-spin" />
                                            : <XCircle className="h-5 w-5 text-red-500" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-[family-name:var(--font-heading)] font-black tracking-[0.2em] text-sm text-[var(--color-warm-white)]">{entry.assetTag}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${entry.action === "dispatch" ? "border-[var(--color-gold)]/30 text-[var(--color-gold)]" : "border-sky-500/30 text-sky-400"}`}>
                                            {entry.action}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-[var(--color-slate)] leading-relaxed">{entry.message}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                                        {format(entry.timestamp, "HH:mm:ss")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {scanLog.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-6 py-24 glass border border-white/5 rounded-3xl mt-4 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                    <div className="relative">
                        <Scan className="h-20 w-20 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] transition-colors duration-700" />
                        <Camera className="h-8 w-8 text-[var(--color-gold)] absolute -bottom-2 -right-2 animate-bounce" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black uppercase tracking-[0.4em] text-[var(--color-warm-white)]">Awaiting Telemetry</p>
                        <p className="text-[10px] mt-2 font-bold text-[var(--color-slate)] uppercase tracking-[0.2em]">Initiate scans to populate fulfillment log</p>
                    </div>
                </div>
            )}

            {/* Finalize Transport Modal */}
            {finalizeModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-[var(--color-navy)]/90 backdrop-blur-xl" onClick={() => !isFinalizing && setFinalizeModalOpen(false)} />
                    <div className="relative glass border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex flex-col gap-8 animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-tight italic">
                                    Finalize <span className="text-[var(--color-gold)]">Transport</span>
                                </h3>
                                <p className="text-[10px] text-[var(--color-slate)] uppercase font-black tracking-widest opacity-60">Generate Tri-Party Delivery Manifest</p>
                            </div>
                            <button onClick={() => !isFinalizing && setFinalizeModalOpen(false)} className="p-3 text-[var(--color-slate)] hover:text-white bg-white/5 rounded-full transition-all">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] ml-1">Driver Name *</label>
                                <input
                                    value={driverName}
                                    onChange={e => setDriverName(e.target.value)}
                                    placeholder="Enter full legal name"
                                    className="w-full bg-black/40 border-2 border-white/10 text-[var(--color-warm-white)] rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-[var(--color-gold)]/50 transition-all placeholder:text-[var(--color-slate)]/20"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] ml-1">Vehicle Plate Number *</label>
                                <input
                                    value={vehiclePlate}
                                    onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                                    placeholder="e.g. KWT-9342"
                                    className="w-full bg-black/40 border-2 border-white/10 text-[var(--color-warm-white)] rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-[var(--color-gold)]/50 transition-all placeholder:text-[var(--color-slate)]/20"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleFinalize}
                            disabled={!driverName.trim() || !vehiclePlate.trim() || isFinalizing}
                            className="w-full h-16 flex items-center justify-center gap-4 rounded-xl bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-[var(--color-navy)] font-black text-xs uppercase tracking-[0.25em] transition-all shadow-2xl disabled:opacity-30 disabled:grayscale active:scale-[0.98]"
                        >
                            {isFinalizing ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSignature className="h-6 w-6" />}
                            {isFinalizing ? "Generating Logistics Pack..." : "Generate Manifest PDF"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
