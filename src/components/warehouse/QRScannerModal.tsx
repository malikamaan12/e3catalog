"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, CameraOff, Loader2, FlipHorizontal, CheckCircle2, AlertCircle, Scan, Keyboard } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onScan: (result: string) => void;
    title?: string;
    lastResult?: { status: "success" | "error" | "duplicate"; message?: string; timestamp: number } | null;
};

// ─── Audio Engine ───
const playBeep = (type: "success" | "error") => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === "success") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else {
            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) {
        console.warn("Audio feedback failed:", e);
    }
};

export default function QRScannerModal({ isOpen, onClose, onScan, title = "Hardware Scan Pipeline", lastResult }: Props) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState("");
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
    const [currentCameraIdx, setCurrentCameraIdx] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [manualInput, setManualInput] = useState("");
    const [showManual, setShowManual] = useState(false);
    const [feedbackFlash, setFeedbackFlash] = useState<"success" | "error" | "duplicate" | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerId = "qr-scanner-container";
    const lastResultTimestamp = useRef(0);

    // ─── Zone 2: Feedback Trigger ───
    useEffect(() => {
        if (lastResult && lastResult.timestamp > lastResultTimestamp.current) {
            lastResultTimestamp.current = lastResult.timestamp;
            
            // Trigger Visual/Audio/Haptic
            setFeedbackFlash(lastResult.status);
            if (lastResult.status === "success") {
                playBeep("success");
                if (navigator.vibrate) navigator.vibrate(100);
            } else {
                playBeep("error");
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            }

            // Lockout period
            setIsLockedOut(true);
            setTimeout(() => {
                setFeedbackFlash(null);
                setIsLockedOut(false);
            }, 1200);
        }
    }, [lastResult]);

    const startScanner = async (cameraIdx = 0) => {
        setError("");
        setScanning(false);
        setShowManual(false);

        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch {}
            scannerRef.current = null;
        }

        try {
            const availableCameras = await Html5Qrcode.getCameras();
            if (!availableCameras || availableCameras.length === 0) {
                throw new Error("No hardware camera detected.");
            }
            setCameras(availableCameras);

            const idx = Math.min(cameraIdx, availableCameras.length - 1);
            setCurrentCameraIdx(idx);
            
            const qrScanner = new Html5Qrcode(containerId, { verbose: false });
            scannerRef.current = qrScanner;

            // ─── Zone 1: Camera Optimization ───
            await qrScanner.start(
                availableCameras[idx].id,
                {
                    fps: 20, // Faster decoding loop
                    qrbox: (viewWidth, viewHeight) => {
                        const minDim = Math.min(viewWidth, viewHeight);
                        return { width: minDim * 0.7, height: minDim * 0.7 };
                    },
                    aspectRatio: 1.0,
                    // Prefer high resolution for focusing on small asset tags
                    videoConstraints: {
                        facingMode: "environment",
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 }
                    }
                },
                (decodedText: string) => {
                    if (isLockedOut) return;
                    onScan(decodedText.trim().toUpperCase());
                },
                () => {} 
            );

            setScanning(true);
        } catch (err: any) {
            setError(err.message || "Failed to start camera.");
            setScanning(false);
            setShowManual(true); // Auto-fallback to manual if camera fails
        }
    };

    const handleClose = async () => {
        setScanning(false);
        setError("");
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch {}
            scannerRef.current = null;
        }
        onClose();
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualInput.trim() || isLockedOut) return;
        onScan(manualInput.trim().toUpperCase());
        setManualInput("");
    };

    useEffect(() => {
        if (isOpen) {
            const timeout = setTimeout(() => startScanner(currentCameraIdx), 300);
            return () => clearTimeout(timeout);
        } else {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
            setScanning(false);
            setError("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 touch-none overscroll-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleClose} />

            {/* Modal Body */}
            <div className="relative bg-[#0A0F1C] md:border md:border-white/10 md:rounded-[2rem] w-full h-full md:h-auto md:max-w-md flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* ─── Zone 2: Feedback Flashes (Top Layer) ─── */}
                <AnimatePresence>
                    {feedbackFlash && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none transition-colors duration-200
                                ${feedbackFlash === "success" ? "bg-emerald-500/40" : "bg-red-500/40"}
                            `}
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl flex flex-col items-center gap-4"
                            >
                                {feedbackFlash === "success" ? (
                                    <CheckCircle2 className="h-20 w-20 text-emerald-400" />
                                ) : (
                                    <AlertCircle className="h-20 w-20 text-red-400" />
                                )}
                                <span className="font-black text-xl uppercase tracking-[0.3em] text-white italic">
                                    {feedbackFlash.toUpperCase()}
                                </span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-6 border-b border-white/[0.05] z-10">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em]">Logistics Protocol</span>
                        <h2 className="font-black text-lg text-slate-100 uppercase tracking-tight italic">{title}</h2>
                    </div>
                    
                    <button
                        onClick={handleClose}
                        className="h-16 w-16 -mr-4 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95"
                        aria-label="Close scanner"
                    >
                        <X className="h-8 w-8" />
                    </button>
                </div>

                {/* Scanner Content */}
                <div className="relative flex-1 bg-black overflow-hidden flex flex-col">
                    
                    {/* The Video Viewport */}
                    <div id={containerId} className={`w-full h-full ${showManual ? "hidden" : "block"}`} />

                    {/* Zone 4: Targeting HUD */}
                    {scanning && !showManual && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            <div className="relative w-64 h-64 border-2 border-white/5 bg-white/5 rounded-3xl">
                                <span className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-amber-500 rounded-tl-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                                <span className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-amber-500 rounded-tr-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                                <span className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-amber-500 rounded-bl-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                                <span className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-amber-500 rounded-br-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                                
                                {/* HUD Center Crosshair */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <div className="w-10 h-0.5 bg-white" />
                                    <div className="w-0.5 h-10 bg-white" />
                                </div>

                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500/50 animate-[scanner-line_2s_infinite]" />
                            </div>
                            <p className="absolute bottom-12 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.4em] animate-pulse">Align QR Code within targets</p>
                        </div>
                    )}

                    {/* Zone 1 Fallback: Manual Terminal */}
                    {showManual && (
                        <div className="flex-1 flex flex-col items-center justify-center px-10 gap-8 bg-slate-950">
                            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
                                <Keyboard className="h-16 w-16 text-slate-500" />
                            </div>
                            <div className="text-center flex flex-col gap-2">
                                <h3 className="font-black text-slate-100 uppercase tracking-widest italic">Manual Entry Mode</h3>
                                <p className="text-xs text-slate-500 font-medium">Camera hardware is unavailable or blocked.</p>
                            </div>
                            
                            <form onSubmit={handleManualSubmit} className="w-full flex flex-col gap-4">
                                <input
                                    autoFocus
                                    type="text"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    placeholder="ENTER ASSET CODE..."
                                    className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-6 py-5 text-xl font-black text-center text-amber-500 tracking-[0.3em] outline-none focus:border-amber-500 transition-all placeholder:text-white/5"
                                />
                                <button
                                    type="submit"
                                    disabled={!manualInput.trim() || isLockedOut}
                                    className="w-full h-16 rounded-2xl bg-amber-500 text-slate-950 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
                                >
                                    <Scan className="h-6 w-6" />
                                    Submit Code
                                </button>
                                
                                {cameras.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => startScanner(0)}
                                        className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors py-4 underline underline-offset-8"
                                    >
                                        Try Restarting Camera
                                    </button>
                                )}
                            </form>
                        </div>
                    )}

                    {/* Startup States */}
                    {!scanning && !error && !showManual && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
                            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Initializing Sensor...</p>
                        </div>
                    )}
                </div>

                {/* Footer Toolbar */}
                <div className="bg-[#0A0F1C] border-t border-white/[0.05] p-4 flex items-center justify-between z-10 px-6">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Protocol Status</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${scanning ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                            {scanning ? "System Online" : "System Standby"}
                        </span>
                    </div>

                    {!showManual && cameras.length > 1 && (
                        <button
                            onClick={() => startScanner((currentCameraIdx + 1) % cameras.length)}
                            className="flex items-center gap-3 px-6 h-14 rounded-2xl glass border border-white/5 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest active:scale-90 transition-all"
                        >
                            <FlipHorizontal className="h-4 w-4" />
                            Switch Camera
                        </button>
                    )}

                    {!showManual && (
                        <button
                            onClick={() => setShowManual(true)}
                            className="flex items-center gap-3 px-6 h-14 rounded-2xl glass border border-white/5 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest active:scale-90 transition-all"
                        >
                            <Keyboard className="h-4 w-4" />
                            Manual
                        </button>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes scanner-line {
                    0% { top: 5%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 95%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}

