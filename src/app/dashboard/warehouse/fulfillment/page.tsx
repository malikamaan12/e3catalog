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
    TriangleAlert,
    Clock,
    Trash2
} from "lucide-react";
import { format } from "date-fns";

type ScanEntry = {
    id: string;
    assetTag: string;
    action: "dispatch" | "return";
    status: "success" | "error";
    message: string;
    productName?: string;
    timestamp: Date;
};

type Booking = {
    id: string;
    projectName: string | null;
    customerName: string;
    startDate: string;
    unitsRequired: number;
    unitsAssigned: number;
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
    const inputRef = useRef<HTMLInputElement>(null);

    // Load active bookings for dropdown
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

    // Auto-focus on input
    useEffect(() => { inputRef.current?.focus(); }, [action, bookingId]);

    const handleScan = useCallback(async () => {
        const tag = assetTag.trim().toUpperCase();
        if (!tag) return;
        if (action === "dispatch" && !bookingId) {
            addEntry(tag, { status: "error", message: "Please select a booking first." });
            return;
        }

        setLoading(true);
        setAssetTag("");
        inputRef.current?.focus();

        try {
            const body: any = { assetTag: tag, action };
            if (action === "dispatch") body.bookingId = bookingId;
            if (action === "return") {
                body.condition = returnCondition;
                body.notes = returnNotes || undefined;
                // For return, find the active booking for this tag
                body.bookingId = bookingId || "auto";
            }

            const res = await fetch("/api/admin/fulfillment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (res.ok) {
                addEntry(tag, {
                    status: "success",
                    message: data.message || "Operation successful",
                    productName: data.productName,
                });
            } else {
                addEntry(tag, { status: "error", message: data.error || "Scan failed" });
            }
        } catch {
            addEntry(tag, { status: "error", message: "Network error. Try again." });
        } finally {
            setLoading(false);
        }
    }, [assetTag, action, bookingId, returnCondition, returnNotes]);

    function addEntry(tag: string, result: Partial<ScanEntry>) {
        setScanLog(prev => [{
            id: crypto.randomUUID(),
            assetTag: tag,
            action,
            status: result.status || "success",
            message: result.message || "",
            productName: result.productName,
            timestamp: new Date(),
        }, ...prev].slice(0, 50));
    }

    const selectedBooking = bookings.find(b => b.id === bookingId);

    return (
        <div className="p-4 md:p-8 flex flex-col gap-6 max-w-4xl mx-auto">
            <header>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-100 italic">
                    Scan to <span className="text-amber-500">{action === "dispatch" ? "Dispatch" : "Return"}</span>
                </h1>
                <p className="text-slate-500 text-xs mt-1">Bump-{action === "dispatch" ? "In" : "Out"} · Hardware scanner or manual entry</p>
            </header>

            {/* Action Toggle */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {(["dispatch", "return"] as const).map(a => (
                    <button
                        key={a}
                        onClick={() => setAction(a)}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em] transition-all ${
                            action === a
                                ? a === "dispatch"
                                    ? "bg-amber-500 text-[#0A0F1C] shadow-lg shadow-amber-500/20"
                                    : "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                                : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        {a === "dispatch" ? "Dispatch (Bump-In)" : "Return (Bump-Out)"}
                    </button>
                ))}
            </div>

            {/* Booking Selector (dispatch only) */}
            {action === "dispatch" && (
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Link to Project / Booking *
                    </label>
                    <div className="relative">
                        <select
                            value={bookingId}
                            onChange={e => setBookingId(e.target.value)}
                            className="w-full appearance-none bg-white/5 border border-white/10 text-slate-100 rounded-xl px-4 py-4 pr-10 text-sm font-medium focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.07]"
                        >
                            <option value="">— Select a booking —</option>
                            {loadingBookings ? (
                                <option disabled>Loading...</option>
                            ) : (
                                bookings.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.projectName || b.customerName} · {format(new Date(b.startDate), "MMM do")}
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>

                    {selectedBooking && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                            <Package className="h-4 w-4 shrink-0" />
                            <span className="font-bold">
                                {selectedBooking.unitsAssigned}/{selectedBooking.unitsRequired} units assigned · {selectedBooking.customerName}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Return Condition (return only) */}
            {action === "return" && (
                <div className="flex flex-col gap-4 p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Post-Return Condition
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {CONDITION_OPTIONS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setReturnCondition(c)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                        returnCondition === c
                                            ? c === "maintenance_required"
                                                ? "bg-red-500 border-red-500 text-white"
                                                : "bg-sky-500 border-sky-500 text-white"
                                            : "bg-transparent border-white/10 text-slate-500 hover:text-slate-300"
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
                        placeholder="Return notes (optional)..."
                        rows={2}
                        className="bg-white/5 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-sky-500/50"
                    />
                </div>
            )}

            {/* Scan Input */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Asset Tag / QR Code
                </label>
                <div className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={assetTag}
                        onChange={e => setAssetTag(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && handleScan()}
                        placeholder={`e.g. E3-TRUSS-001`}
                        className="flex-1 bg-white/5 border-2 border-white/10 text-slate-100 rounded-2xl px-6 py-5 text-xl font-black tracking-[0.3em] focus:outline-none focus:border-amber-500/50 placeholder:text-slate-700 transition-all"
                        autoCapitalize="characters"
                        spellCheck={false}
                    />
                    <button
                        onClick={handleScan}
                        disabled={loading || !assetTag.trim()}
                        className={`px-8 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                            action === "dispatch"
                                ? "bg-amber-500 text-[#0A0F1C] hover:bg-amber-400 shadow-amber-500/20"
                                : "bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/20"
                        }`}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                        {loading ? "..." : "Scan"}
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 italic">Press Enter or tap Scan after each tag. Hardware barcode scanners work automatically.</p>
            </div>

            {/* Live Scan Log */}
            {scanLog.length > 0 && (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Scan Log ({scanLog.length})
                        </span>
                        <button
                            onClick={() => setScanLog([])}
                            className="text-[10px] text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                            <Trash2 className="h-3 w-3" /> Clear
                        </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                        {scanLog.map(entry => (
                            <div
                                key={entry.id}
                                className={`flex items-start gap-4 p-4 rounded-2xl border text-sm transition-all ${
                                    entry.status === "success"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100"
                                        : "bg-red-500/10 border-red-500/20 text-red-100"
                                }`}
                            >
                                {entry.status === "success"
                                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                    : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                }
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black tracking-widest text-xs">{entry.assetTag}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${entry.action === "dispatch" ? "bg-amber-500/20 text-amber-400" : "bg-sky-500/20 text-sky-400"}`}>
                                            {entry.action}
                                        </span>
                                    </div>
                                    <p className="text-xs mt-0.5 opacity-80">{entry.message}</p>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] opacity-50 shrink-0">
                                    <Clock className="h-3 w-3" />
                                    {format(entry.timestamp, "HH:mm:ss")}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {scanLog.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-white/5 rounded-3xl text-slate-600">
                    <Scan className="h-12 w-12 opacity-30" />
                    <p className="text-sm italic">Awaiting first scan...</p>
                </div>
            )}
        </div>
    );
}
