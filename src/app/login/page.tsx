"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Lock, Mail, ArrowRight, Loader2, User, ShieldCheck } from "lucide-react";
import { USER_ROLES } from "@/lib/constants";

export default function LoginPage() {
    const router = useRouter();
    const [loginType, setLoginType] = useState<"client" | "admin">("client");
    const [emailState, setEmailState] = useState("");
    const [passwordState, setPasswordState] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailState, password: passwordState }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errMsg = errorData.error || "Invalid email or password. Please verify your credentials.";
                throw new Error(errMsg);
            }

            const data = await res.json();

            // Extract 'from' redirect parameter if present
            const params = new URLSearchParams(window.location.search);
            const fromParam = params.get("from");
            const safeFrom = fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//") ? fromParam : null;

            // Route cleanly based on persona
            let targetUrl = "/dashboard";
            const role = data.user?.role;
            if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN) {
                targetUrl = safeFrom && safeFrom.startsWith("/admin") ? safeFrom : "/admin";
            } else if (role === USER_ROLES.VENDOR) {
                targetUrl = safeFrom && safeFrom.startsWith("/dashboard") ? safeFrom : "/dashboard/products";
            } else if (role === USER_ROLES.WAREHOUSE_MANAGER) {
                targetUrl = safeFrom && (safeFrom.startsWith("/dashboard/warehouse") || safeFrom.startsWith("/admin/fulfillment")) ? safeFrom : "/dashboard/warehouse/overview";
            } else if (role === USER_ROLES.SALES_REP) {
                targetUrl = safeFrom && (safeFrom.startsWith("/dashboard/sales") || safeFrom.startsWith("/admin/bookings")) ? safeFrom : "/dashboard/sales/overview";
            } else {
                targetUrl = safeFrom && safeFrom.startsWith("/dashboard") ? safeFrom : "/dashboard/client/overview";
            }

            // Perform full window navigation so all session cookies and server RSCs reload fresh
            window.location.href = targetUrl;
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy text-navy-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Decorative gradient glow */}
            <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-gold/10 blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-navy-400/20 blur-3xl opacity-50 pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <Link href="/" className="flex items-center justify-center mb-8 group">
                    <img
                        src="/logo.png"
                        alt="E3 Rentals Logo"
                        className="h-12 md:h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                </Link>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white font-outfit">
                    Access your account
                </h2>
                <p className="mt-2 text-center text-sm text-navy-300">
                    Or{" "}
                    <Link href="/catalog" className="font-medium text-gold hover:text-gold-300 transition-colors">
                        browse the catalog
                    </Link>{" "}
                    to start a new quote
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-navy-800/50 backdrop-blur-xl py-8 px-4 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-2xl sm:px-8 border border-navy-700">

                    {/* Login Type Toggle */}
                    <div className="flex p-1 mb-8 bg-black/40 rounded-xl">
                        <button
                            onClick={() => { setLoginType("client"); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${loginType === "client" ? "bg-navy-700 text-white shadow" : "text-navy-400 hover:text-white"}`}
                        >
                            <User className="h-4 w-4" />
                            Client Portal
                        </button>
                        <button
                            onClick={() => { setLoginType("admin"); setError(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${loginType === "admin" ? "bg-navy-700 text-white shadow" : "text-navy-400 hover:text-white"}`}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Admin Portal
                        </button>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm leading-relaxed">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-navy-200" htmlFor="email">
                                Email Address
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={emailState}
                                    onChange={(e) => setEmailState(e.target.value)}
                                    className="block w-full rounded-xl border-navy-600 bg-navy-900/50 py-3 pl-10 pr-3 text-white placeholder-navy-400 focus:border-gold focus:ring-gold sm:text-sm shadow-inner transition-colors"
                                    placeholder={loginType === "admin" ? "admin@company.qa" : "hello@company.com"}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-navy-200" htmlFor="password">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-medium text-gold hover:text-gold-400 transition"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={passwordState}
                                    onChange={(e) => setPasswordState(e.target.value)}
                                    className="block w-full rounded-xl border-navy-600 bg-navy-900/50 py-3 pl-10 pr-3 text-white placeholder-navy-400 focus:border-gold focus:ring-gold sm:text-sm shadow-inner transition-colors"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative flex w-full justify-center rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy-900 hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:shadow-[0_0_25px_rgba(201,168,76,0.4)]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Signing in...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Sign in to {loginType === "admin" ? "Admin" : "Account"}
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>

                    {loginType === "client" && (
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-navy-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-[#121929] px-2 text-navy-400">
                                        New to E3 Rentals?{" "}
                                        <Link href="/signup" className="font-medium text-gold hover:text-gold-300 transition-colors">
                                            Sign up here
                                        </Link>
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 text-center text-sm text-navy-300">
                                An account is automatically created for you when you submit your first quote request from the catalog.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
