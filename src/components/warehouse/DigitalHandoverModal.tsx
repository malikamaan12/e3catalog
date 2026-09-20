"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
    FileSignature, X, Loader2, Check, RotateCcw, 
    ShieldCheck, Truck, User, Phone, CreditCard, AlertCircle
} from "lucide-react";

interface DigitalHandoverModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    bookingTitle: string;
    itemsCount: number;
    onSuccess: (result: { podId: string; manifestUrl: string; message: string }) => void;
}

export default function DigitalHandoverModal({
    isOpen,
    onClose,
    bookingId,
    bookingTitle,
    itemsCount,
    onSuccess,
}: DigitalHandoverModalProps) {
    const [driverName, setDriverName] = useState("");
    const [vehiclePlate, setVehiclePlate] = useState("");
    const [transportCompany, setTransportCompany] = useState("E3 Internal Fleet");
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [recipientNationalId, setRecipientNationalId] = useState("");
    const [notes, setNotes] = useState("");

    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Initialize canvas
    useEffect(() => {
        if (!isOpen) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Ensure canvas high DPI sharpness
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.scale(ratio, ratio);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }, [isOpen]);

    if (!isOpen) return null;

    // Drawing handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        setErrorMessage(null);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!driverName.trim()) {
            setErrorMessage("Driver legal name is required.");
            return;
        }

        if (!vehiclePlate.trim()) {
            setErrorMessage("Vehicle plate number is required.");
            return;
        }

        if (!hasSignature || !canvasRef.current) {
            setErrorMessage("Digital signature on glass is required for legal custody handover.");
            return;
        }

        const signatureData = canvasRef.current.toDataURL("image/png");

        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/warehouse/handover-signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId,
                    driverName: driverName.trim(),
                    vehiclePlateNumber: vehiclePlate.trim().toUpperCase(),
                    transportCompany: transportCompany.trim(),
                    recipientName: (recipientName || driverName).trim(),
                    recipientPhone: recipientPhone.trim(),
                    recipientNationalId: recipientNationalId.trim(),
                    signatureData,
                    notes: notes.trim(),
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onSuccess(data);
                onClose();
            } else {
                setErrorMessage(data.error || "Failed to submit handover signature.");
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Network error while saving signature.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-[#0A0F1C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                            <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                Digital Handover &amp; e-POD Signature
                            </h3>
                            <p className="text-xs text-slate-400">
                                {bookingTitle} &middot; <span className="text-amber-400 font-semibold">{itemsCount} Items</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                    {errorMessage && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Driver & Vehicle Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                                Driver Full Name *
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    placeholder="Driver's legal name"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                                Vehicle Plate Number *
                            </label>
                            <div className="relative">
                                <Truck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={vehiclePlate}
                                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                                    placeholder="e.g. KWT-9342"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                                Transport Carrier
                            </label>
                            <input
                                type="text"
                                value={transportCompany}
                                onChange={(e) => setTransportCompany(e.target.value)}
                                placeholder="Carrier company name"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                                Driver QID / ID
                            </label>
                            <div className="relative">
                                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={recipientNationalId}
                                    onChange={(e) => setRecipientNationalId(e.target.value)}
                                    placeholder="National ID / License"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                                Driver Phone
                            </label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    placeholder="+974 ..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Digital Signature Canvas ("Sign on Glass") */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Driver / Custody Signature on Glass *
                            </label>
                            {hasSignature && (
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Clear Signature
                                </button>
                            )}
                        </div>

                        <div className="relative bg-white rounded-xl border-2 border-slate-300 overflow-hidden touch-none shadow-inner">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-36 cursor-crosshair block"
                            />
                            {!hasSignature && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    Sign Here with Finger or Stylus &darr;
                                </div>
                            )}
                            <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400 select-none pointer-events-none">
                                SECURE LEGAL HANDOVER
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            By signing, the driver confirms receipt of all itemized equipment in working order for transport.
                        </p>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || !driverName.trim() || !vehiclePlate.trim() || !hasSignature}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--color-gold)] text-black hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting Handover...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Authorize &amp; Sign Dispatch
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
