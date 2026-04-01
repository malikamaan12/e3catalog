"use client";

import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, CheckCircle2, RotateCcw, PenTool } from "lucide-react";

interface SignaturePadProps {
    onSave: (signatureData: string) => void;
    isLoading?: boolean;
}

export default function SignaturePad({ onSave, isLoading }: SignaturePadProps) {
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
    };

    const handleSave = () => {
        if (sigCanvas.current?.isEmpty()) return;
        const data = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
        if (data) onSave(data);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="relative group">
                {/* Visual Label */}
                <div className="absolute -top-3 left-6 px-3 py-1 bg-[var(--color-navy)] border border-white/10 rounded-full z-10">
                    <span className="text-[9px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] flex items-center gap-2">
                        <PenTool className="w-3 h-3" />
                        Digital Signature Block
                    </span>
                </div>

                {/* Pad Container */}
                <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-black p-4 shadow-inner relative">
                    <SignatureCanvas
                        ref={(ref) => { sigCanvas.current = ref; }}
                        canvasProps={{
                            className: "signature-canvas w-full h-[200px] cursor-crosshair",
                        }}
                        onBegin={() => setIsEmpty(false)}
                        penColor="#D4AF37" // E3 Gold
                    />
                    
                    {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.4em] italic underline underline-offset-8">
                                Sign within the frame
                            </p>
                        </div>
                    )}
                </div>

                {/* Clear Button (Floating) */}
                {!isEmpty && (
                    <button
                        type="button"
                        onClick={clear}
                        className="absolute right-6 bottom-6 p-3 rounded-xl bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shadow-2xl"
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] mt-1.5 shadow-[0_0_8px_var(--color-gold)]" />
                    <p className="text-[10px] font-medium text-[var(--color-slate)] leading-relaxed">
                        By signing, I agree to the <span className="text-[var(--color-warm-white)] underline">Terms of Service</span> and acknowledge that this represents a legally binding commercial agreement with E3 Rentals.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isEmpty || isLoading}
                    className="w-full h-16 rounded-[1.5rem] bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale shadow-[0_15px_40px_rgba(212,175,55,0.2)] group"
                >
                    {isLoading ? (
                        <RotateCcw className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            BUILDING COMMITMENT
                            <CheckCircle2 className="w-5 h-5 transition-transform group-hover:scale-125" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
