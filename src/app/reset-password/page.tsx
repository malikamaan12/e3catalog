"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Missing or invalid reset token from email URL.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!token && !success) {
        return (
            <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-100">Invalid Reset Link</h3>
                <p className="text-sm text-slate-400">
                    This password reset link is invalid or incomplete. Please request a new password reset link.
                </p>
                <div className="pt-4">
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition"
                    >
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {success ? (
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-100">Password Reset Successful</h3>
                    <p className="text-sm text-slate-400">
                        Your password has been updated securely and previous active sessions have been revoked.
                    </p>
                    <div className="pt-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 transition"
                        >
                            Sign In with New Password
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
                        <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            New Password (min. 8 characters)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                <Lock className="h-4 w-4" />
                            </div>
                            <input
                                id="newPassword"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                <Lock className="h-4 w-4" />
                            </div>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••••••"
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
                                <span>Updating Password...</span>
                            </>
                        ) : (
                            <span>Set New Password</span>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white mb-2">
                        E3 <span className="text-amber-500">Rentals</span>
                    </Link>
                    <h2 className="text-xl font-semibold text-slate-100">Set a new password</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Create a strong, unique password to secure your account.
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
                    <Suspense fallback={<div className="text-center py-6 text-slate-400 text-sm">Loading security verification...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
