"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, CloudUpload, Landmark, Info, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { CloudImageUpload } from "@/components/CloudImageUpload";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EvidenceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    settlementId: string;
    amount: number;
    onSuccess: () => void;
}

export function EvidenceUploadModal({ isOpen, onClose, settlementId, amount, onSuccess }: EvidenceUploadModalProps) {
    const [uploadUrl, setUploadUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!uploadUrl) {
            setError("Please upload a receipt before submitting.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await fetch(`/api/vendor/settlements/${settlementId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentEvidenceUrl: uploadUrl })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Submission failed");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <AnimatePresence>
                {isOpen && (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            />
                        </Dialog.Overlay>
                        <Dialog.Content asChild>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-xl bg-[var(--color-surface)] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-[101] focus:outline-none"
                            >
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[var(--color-navy-dark)]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold)]/10 flex items-center justify-center">
                                            <CloudUpload className="w-6 h-6 text-[var(--color-gold)]" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-xl font-black text-[var(--color-warm-white)] tracking-tight">Settle Commission</Dialog.Title>
                                            <Dialog.Description className="text-xs text-[var(--color-slate)] font-medium">Upload proof of transfer for {amount.toLocaleString()} QAR</Dialog.Description>
                                        </div>
                                    </div>
                                    <Dialog.Close asChild>
                                        <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-[var(--color-slate)]">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </Dialog.Close>
                                </div>

                                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    {/* Remittance Guidance Card */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <Landmark className="w-16 h-16" />
                                        </div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Info className="w-4 h-4 text-[var(--color-gold)]" />
                                            <h4 className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest">Remittance Submission</h4>
                                        </div>
                                        <p className="text-xs text-[var(--color-slate)] leading-relaxed">
                                            Please attach the bank transfer remittance receipt or wire transfer confirmation for verification against your commercial invoice.
                                        </p>
                                    </div>

                                    {/* Upload Area */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest">Transfer Receipt (PDF/Image)</label>
                                        <CloudImageUpload 
                                            onUploadComplete={(url) => setUploadUrl(url)}
                                            folder="settlements"
                                            label=""
                                        />
                                        {uploadUrl && (
                                            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Receipt Attached
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                                            {error}
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                                    <button 
                                        disabled={isSubmitting}
                                        onClick={onClose}
                                        className="flex-1 py-4 px-6 rounded-2xl bg-white/5 text-[var(--color-warm-white)] font-bold text-sm hover:bg-white/10 transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={isSubmitting}
                                        onClick={handleSubmit}
                                        className="flex-[2] btn-primary py-4 px-6 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-5 h-5" />
                                        )}
                                        <span className="font-black uppercase tracking-widest text-sm">Submit Proof</span>
                                    </button>
                                </div>
                            </motion.div>
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
}
