"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, CameraOff, Loader2, FlipHorizontal } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onScan: (result: string) => void;
    title?: string;
};

export default function QRScannerModal({ isOpen, onClose, onScan, title = "Scan QR Code" }: Props) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState("");
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
    const [currentCameraIdx, setCurrentCameraIdx] = useState(0);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerId = "qr-scanner-container";

    const startScanner = async (cameraIdx = 0) => {
        setError("");
        setScanning(false);

        // Clean up any existing instance
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch {}
            scannerRef.current = null;
        }

        try {
            const availableCameras = await Html5Qrcode.getCameras();
            if (!availableCameras || availableCameras.length === 0) {
                throw new Error("No cameras found on this device.");
            }
            setCameras(availableCameras);

            const idx = Math.min(cameraIdx, availableCameras.length - 1);
            setCurrentCameraIdx(idx);
            const cameraId = availableCameras[idx].id;

            const qrScanner = new Html5Qrcode(containerId, { verbose: false });
            scannerRef.current = qrScanner;

            await qrScanner.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 220, height: 220 },
                    aspectRatio: 1.0,
                },
                (decodedText: string) => {
                    // Successful scan
                    onScan(decodedText.trim().toUpperCase());
                    handleClose();
                },
                () => {} // Error callback (suppress frame errors)
            );

            setScanning(true);
        } catch (err: any) {
            setError(err.message || "Failed to start camera.");
            setScanning(false);
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

    const flipCamera = () => {
        const next = (currentCameraIdx + 1) % cameras.length;
        startScanner(next);
    };

    useEffect(() => {
        if (isOpen) {
            // Small delay to let modal render the div before scanning
            const timeout = setTimeout(() => startScanner(currentCameraIdx), 200);
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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0D1425] border border-white/10 rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-amber-500" />
                        <span className="font-black text-sm text-slate-100 uppercase tracking-widest">{title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {cameras.length > 1 && (
                            <button
                                onClick={flipCamera}
                                className="p-2 text-slate-500 hover:text-slate-200 transition-colors rounded-lg hover:bg-white/5"
                                title="Flip camera"
                            >
                                <FlipHorizontal className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Scanner Viewport */}
                <div className="relative bg-black aspect-square overflow-hidden">
                    {/* html5-qrcode mounts the video here */}
                    <div id={containerId} className="w-full h-full" />

                    {/* Scanning overlay frame */}
                    {scanning && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            {/* Corner brackets */}
                            <div className="relative w-52 h-52">
                                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-lg" />
                                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-lg" />
                                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-lg" />
                                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-lg" />
                                {/* Animated scan line */}
                                <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-[scan-line_2s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    )}

                    {/* Loading state */}
                    {!scanning && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Starting Camera...</p>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6">
                            <CameraOff className="h-12 w-12 text-red-500" />
                            <p className="text-xs text-slate-300 text-center font-medium">{error}</p>
                            <button
                                onClick={() => startScanner(currentCameraIdx)}
                                className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 text-center">
                    {scanning ? (
                        <p className="text-xs text-slate-500 italic">
                            Point camera at an asset QR code or barcode
                        </p>
                    ) : (
                        <p className="text-xs text-slate-600 italic">Awaiting camera...</p>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0%   { top: 4px; opacity: 1; }
                    50%  { top: calc(100% - 4px); opacity: 0.8; }
                    100% { top: 4px; opacity: 1; }
                }
            `}</style>
        </div>
    );
}
