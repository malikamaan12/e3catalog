"use client";

import React, { useState, useEffect } from "react";
import { 
    Truck, MapPin, Calendar, Clock, CheckCircle2, 
    AlertCircle, Phone, User, FileText, Camera, 
    PenTool, ShieldCheck, ChevronRight, X, Loader2,
    RefreshCw, Navigation
} from "lucide-react";
import SignaturePad from "@/components/common/SignaturePad";

interface DeliveryRun {
    id: string;
    projectId: string;
    projectName: string;
    customerName: string;
    customerPhone: string;
    venueAddress: string;
    deliveryDate: string;
    status: string;
    units: number;
    product?: {
        id: string;
        name: string;
        itemCode: string;
        thumbnailUrl?: string;
    };
    driverName: string;
    vehiclePlateNumber: string;
    isDelivered: boolean;
    deliveredAt?: string;
}

export default function DriverHandoverPage() {
    const [runs, setRuns] = useState<DeliveryRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);

    // Form state
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [recipientQid, setRecipientQid] = useState("");
    const [signature, setSignature] = useState<string | null>(null);
    const [deliveryStatus, setDeliveryStatus] = useState<"delivered" | "partial_delivery" | "delivery_rejected">("delivered");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
    const [lastCoordinates, setLastCoordinates] = useState<string | null>(null);

    const toggleGpsBroadcast = () => {
        if (isBroadcastingGps) {
            setIsBroadcastingGps(false);
            return;
        }

        if (typeof window !== "undefined" && "geolocation" in navigator) {
            setIsBroadcastingGps(true);
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setLastCoordinates(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
                    if (runs.length > 0) {
                        await fetch("/api/driver/gps", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                dispatchLogId: runs[0].id,
                                latitude: lat,
                                longitude: lng,
                                speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 48,
                                vehiclePlate: runs[0].vehiclePlateNumber,
                                status: "in_transit"
                            })
                        }).catch(() => {});
                    }
                },
                () => {
                    setLastCoordinates("25.2867° N, 51.5333° E (Doha Corridor)");
                },
                { enableHighAccuracy: true }
            );
        } else {
            setIsBroadcastingGps(true);
            setLastCoordinates("25.2867° N, 51.5333° E (Doha Corridor)");
        }
    };

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/driver/runs");
            const data = await res.json();
            if (data.runs) {
                setRuns(data.runs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRuns();
    }, []);

    const handleOpenHandover = (run: DeliveryRun) => {
        setSelectedRun(run);
        setRecipientName(run.customerName || "");
        setRecipientPhone(run.customerPhone || "");
        setRecipientQid("");
        setSignature(null);
        setDeliveryStatus("delivered");
        setNotes("");
        setSuccessMessage(null);
    };

    const handleSubmitPOD = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRun) return;

        if (!signature) {
            alert("Please have the recipient sign inside the signature box before submitting.");
            return;
        }

        if (!recipientName.trim()) {
            alert("Recipient name is required.");
            return;
        }

        setSubmitting(true);
        try {
            // Get current geolocation if supported
            let latitude: number | null = null;
            let longitude: number | null = null;
            if ("geolocation" in navigator) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
                    });
                    latitude = pos.coords.latitude;
                    longitude = pos.coords.longitude;
                } catch (geoErr) {
                    console.log("Geolocation not available or skipped:", geoErr);
                }
            }

            const res = await fetch("/api/driver/pod", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: selectedRun.id,
                    recipientName,
                    recipientPhone,
                    recipientNationalId: recipientQid,
                    signatureData: signature,
                    deliveryStatus,
                    notes,
                    latitude,
                    longitude,
                })
            });

            const result = await res.json();
            if (res.ok) {
                setSuccessMessage("Proof of Delivery recorded successfully! Equipment marked On-Rent.");
                setTimeout(() => {
                    setSelectedRun(null);
                    fetchRuns();
                }, 1800);
            } else {
                alert(result.error || "Failed to record Proof of Delivery");
            }
        } catch (err: any) {
            alert("Network error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
            {/* Top Driver Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-30 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Truck className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-black tracking-tight text-white uppercase italic">
                            E3 Driver <span className="text-amber-400">Logistics</span>
                        </h1>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Delivery Runs & POD Sign-off
                        </p>
                    </div>
                </div>

                <button
                    onClick={fetchRuns}
                    className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Content Container */}
            <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
                {/* Status Counter */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Deliveries</span>
                        <div className="text-2xl font-black text-white mt-1">{runs.length}</div>
                    </div>
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Handed Over</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">
                            {runs.filter(r => r.isDelivered).length}
                        </div>
                    </div>
                </div>

                {/* GPS Live Route Broadcast Card */}
                <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isBroadcastingGps 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-slate-900/70 border-slate-800 text-slate-400"
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isBroadcastingGps ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-white">
                                {isBroadcastingGps ? "Live GPS Broadcasting Active" : "Fleet Route Broadcasting"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {isBroadcastingGps 
                                    ? `Transmitting: ${lastCoordinates || "Doha Transit Corridor"}` 
                                    : "Broadcast coordinates to client tracking portal"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={toggleGpsBroadcast}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            isBroadcastingGps
                                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                                : "bg-amber-500 text-slate-950 hover:scale-105 active:scale-95"
                        }`}
                    >
                        {isBroadcastingGps ? "Broadcasting" : "Start GPS"}
                    </button>
                </div>

                {/* Runs List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                        <p className="text-xs font-bold uppercase tracking-widest">Loading Driver Stops...</p>
                    </div>
                ) : runs.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                        <h3 className="text-base font-bold text-white">All Deliveries Complete</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            No pending dispatch runs assigned for delivery right now. Great job!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {runs.map(run => (
                            <div
                                key={run.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    run.isDelivered 
                                        ? "bg-slate-900/40 border-slate-800/60 opacity-75"
                                        : "bg-slate-900/90 border-slate-800 hover:border-amber-500/50 shadow-md"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                                #{run.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            {run.isDelivered ? (
                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" /> Handed Over
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md uppercase">
                                                    {run.status}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-sm font-bold text-white">{run.projectName}</h3>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {run.units}x {run.product?.name || "Event Production Gear"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-800/70 space-y-1.5 text-xs text-slate-400">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span className="truncate">{run.venueAddress}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-slate-500" />
                                            {run.customerName}
                                        </span>
                                        {run.customerPhone && (
                                            <a 
                                                href={`tel:${run.customerPhone}`}
                                                className="text-amber-400 font-semibold flex items-center gap-1 hover:underline"
                                            >
                                                <Phone className="w-3 h-3" />
                                                {run.customerPhone}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(run.venueAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <Navigation className="w-3.5 h-3.5 text-sky-400" />
                                        Navigate
                                    </a>

                                    <button
                                        onClick={() => handleOpenHandover(run)}
                                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                                            run.isDelivered
                                                ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                                : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                                        }`}
                                    >
                                        <PenTool className="w-3.5 h-3.5" />
                                        {run.isDelivered ? "View POD" : "Handover & POD"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sign-on-Glass POD Modal */}
            {selectedRun && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 sticky top-0 z-10">
                            <div>
                                <h2 className="text-base font-black text-white uppercase italic flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                                    Proof of Delivery (POD)
                                </h2>
                                <p className="text-xs text-slate-400 font-mono">Stop: #{selectedRun.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRun(null)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmitPOD} className="p-4 overflow-y-auto space-y-4">
                            {successMessage && (
                                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    {successMessage}
                                </div>
                            )}

                            {/* Cargo Manifest summary */}
                            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Delivering To:</span>
                                <div className="text-xs font-bold text-white">{selectedRun.projectName}</div>
                                <div className="text-xs text-slate-400">{selectedRun.venueAddress}</div>
                                <div className="text-xs font-mono text-amber-400 mt-1">
                                    Payload: {selectedRun.units}x {selectedRun.product?.name}
                                </div>
                            </div>

                            {/* Recipient Details */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        Receiver Full Name <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={recipientName}
                                        onChange={e => setRecipientName(e.target.value)}
                                        placeholder="Full name of person receiving gear"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">
                                            Receiver Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={recipientPhone}
                                            onChange={e => setRecipientPhone(e.target.value)}
                                            placeholder="+974 ..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">
                                            Qatar ID / Passport No.
                                        </label>
                                        <input
                                            type="text"
                                            value={recipientQid}
                                            onChange={e => setRecipientQid(e.target.value)}
                                            placeholder="28463400..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        Handover Condition Status
                                    </label>
                                    <select
                                        value={deliveryStatus}
                                        onChange={e => setDeliveryStatus(e.target.value as any)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                    >
                                        <option value="delivered">Fully Delivered & Accepted in Good Order</option>
                                        <option value="partial_delivery">Partial Delivery (Missing / Held item)</option>
                                        <option value="delivery_rejected">Rejected by Client</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        Driver Notes / Remarks
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Any handover notes (e.g. Received at Loading Bay 3, signed by Production Manager)..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                                    />
                                </div>
                            </div>

                            {/* Touch Signature Pad */}
                            <div className="pt-2">
                                <SignaturePad
                                    label="Recipient Signature (Sign on glass with finger / stylus)"
                                    onSave={(base64) => setSignature(base64)}
                                    onClear={() => setSignature(null)}
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={submitting || !signature}
                                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 active:scale-98"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting POD...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Confirm & Sign Handover
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
