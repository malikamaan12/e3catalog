"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"verifying" | "success" | "error">(token ? "verifying" : "error");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setMessage("Verification link is missing or malformed.");
            return;
        }

        async function verify() {
            try {
                const res = await fetch("/api/auth/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });
                const data = await res.json();
                if (res.ok) {
                    setStatus("success");
                    setMessage(data.message || "Your email address has been successfully verified.");
                } else {
                    setStatus("error");
                    setMessage(data.error || "Verification token has expired or is invalid.");
                }
            } catch (err: any) {
                setStatus("error");
                setMessage(err.message || "Failed to verify email address.");
            }
        }

        verify();
    }, [token]);

    return (
        <div className="text-center space-y-4">
            {status === "verifying" && (
                <>
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
                    <h3 className="text-lg font-medium text-slate-100">Verifying Email Address...</h3>
                    <p className="text-sm text-slate-400">Please wait while we confirm your account details.</p>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-100">Email Verified!</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
                    <div className="pt-4">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 transition"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-100">Verification Failed</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
                    <div className="pt-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition"
                        >
                            Return to Sign In
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white mb-2">
                        E3 <span className="text-amber-500">Rentals</span>
                    </Link>
                    <h2 className="text-xl font-semibold text-slate-100">Account Verification</h2>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
                    <Suspense fallback={<div className="text-center py-6 text-slate-400 text-sm">Loading verification status...</div>}>
                        <VerifyEmailContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
