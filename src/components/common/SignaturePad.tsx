"use client";

import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
    onSave: (signatureBase64: string) => void;
    onClear?: () => void;
    width?: number;
    height?: number;
    label?: string;
}

export default function SignaturePad({
    onSave,
    onClear,
    width = 500,
    height = 200,
    label = "Receiver / Signer Signature (Sign inside box)"
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Retina / DPR scaling for ultra crisp signatures
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.parentElement?.clientWidth ? canvas.parentElement.clientWidth * dpr : width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }, [height, width]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if ("touches" in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        setIsDrawing(false);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        if (onClear) onClear();
    };

    return (
        <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                <span className="flex items-center gap-1.5 text-amber-400">
                    <PenTool className="w-3.5 h-3.5" />
                    {label}
                </span>
                {hasSignature && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear
                    </button>
                )}
            </div>

            <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-2xl bg-slate-950/80 overflow-hidden shadow-inner touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 cursor-crosshair block"
                />

                {/* Signing guide line */}
                <div className="absolute bottom-7 left-8 right-8 border-b border-slate-700/60 pointer-events-none flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <span>X __________________________________</span>
                    <span>Sign Here</span>
                </div>
            </div>
        </div>
    );
}
