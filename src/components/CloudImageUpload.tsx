"use client";

import { useState, useCallback } from "react";
import { UploadCloud, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import Image from "next/image";

interface CloudImageUploadProps {
    onUploadComplete: (url: string) => void;
    folder?: string;
    existingUrl?: string;
    label?: string;
}

export function CloudImageUpload({ onUploadComplete, folder = "uploads", existingUrl, label = "Upload Image" }: CloudImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(existingUrl || null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith("image/")) {
            setError("Please upload a valid image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError("File size must be under 5MB.");
            return;
        }

        setIsUploading(true);
        setError(null);

        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            // 1. Get Presigned URL
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    folder
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Upload failed with status ${res.status}`);
            }
            
            const data = await res.json();

            // 2. Upload file directly to S3
            const uploadRes = await fetch(data.url, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type,
                },
                body: file
            });

            if (!uploadRes.ok) throw new Error("Failed to upload to storage");

            // 3. Complete
            onUploadComplete(data.publicUrl);

        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "An error occurred during upload.");
            setPreview(existingUrl || null); // Revert
        } finally {
            setIsUploading(false);
        }
    }, [folder, onUploadComplete, existingUrl]);

    const handleRemove = () => {
        setPreview(null);
        setError(null);
        onUploadComplete(""); // Clear upstream
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-[var(--color-slate)] mb-2">
                {label}
            </label>

            {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 group aspect-video bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={preview}
                        alt="Upload preview"
                        className={`object-cover w-full h-full transition-opacity ${isUploading ? 'opacity-50' : 'opacity-100'}`}
                    />

                    {isUploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {isUploading && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div className="h-full bg-[var(--color-gold)] animate-pulse w-full"></div>
                        </div>
                    )}
                </div>
            ) : (
                <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[var(--color-gold)]/50 hover:bg-white/5 transition-all group overflow-hidden bg-black/20">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-[var(--color-slate)] group-hover:text-[var(--color-warm-white)] transition-colors">
                        <UploadCloud className="w-10 h-10 mb-3 text-[var(--color-gold)]/70 group-hover:text-[var(--color-gold)] transition-colors" />
                        <p className="mb-2 text-sm font-semibold">
                            Click to upload <span className="font-normal opacity-70">or drag and drop</span>
                        </p>
                        <p className="text-xs opacity-70">SVG, PNG, JPG or GIF (MAX. 5MB)</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </label>
            )}

            {error && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                    <XCircle className="w-4 h-4" />
                    <p>{error}</p>
                </div>
            )}

            {preview && !isUploading && !error && (
                <div className="flex items-center gap-2 mt-2 text-[var(--color-success)] text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <p>Image uploaded successfully to Cloud Storage</p>
                </div>
            )}
        </div>
    );
}
