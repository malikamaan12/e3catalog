"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to process request");
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white mb-2">
                        E3 <span className="text-amber-500">Rentals</span>
                    </Link>
                    <h2 className="text-xl font-semibold text-slate-100">Reset your password</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Enter your registered email address and we'll send you instructions to reset your password.
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
                    {submitted ? (
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-100">Check your inbox</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                If an account is associated with <span className="text-slate-200 font-medium">{email}</span>, you will receive a secure password reset link shortly.
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Return to Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-sm text-rose-400">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-900 transition disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Sending Instructions...</span>
                                    </>
                                ) : (
                                    <span>Send Reset Link</span>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
