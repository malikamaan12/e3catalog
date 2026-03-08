"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Lock, Mail, ArrowRight, Loader2, User } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [nameState, setNameState] = useState("");
    const [emailState, setEmailState] = useState("");
    const [phoneState, setPhoneState] = useState("");
    const [passwordState, setPasswordState] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: nameState,
                    email: emailState,
                    phoneNumber: phoneState,
                    password: passwordState
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to sign up");
            }

            // Immediately log them in
            await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailState, password: passwordState }),
            });

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy text-navy-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-gold/10 blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-navy-400/20 blur-3xl opacity-50 pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <Box className="h-10 w-10 text-gold group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-2xl font-bold tracking-tight text-white uppercase font-outfit">
                        E3 <span className="font-light text-navy-300">Rentals</span>
                    </span>
                </Link>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white font-outfit">
                    Create a Client Account
                </h2>
                <p className="mt-2 text-center text-sm text-navy-300">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-gold hover:text-gold-300 transition-colors">
                        Log in here
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-navy-800/50 backdrop-blur-xl py-8 px-4 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-2xl sm:px-10 border border-navy-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm leading-relaxed">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-navy-200" htmlFor="name">Full Name</label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <input id="name" type="text" value={nameState} onChange={(e) => setNameState(e.target.value)} className="block w-full rounded-xl border-navy-600 bg-navy-900/50 py-3 pl-10 pr-3 text-white placeholder-navy-400 focus:border-gold focus:ring-gold sm:text-sm shadow-inner transition-colors" placeholder="John Doe" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-navy-200" htmlFor="email">Email Address</label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input id="email" type="email" value={emailState} onChange={(e) => setEmailState(e.target.value)} className="block w-full rounded-xl border-navy-600 bg-navy-900/50 py-3 pl-10 pr-3 text-white placeholder-navy-400 focus:border-gold focus:ring-gold sm:text-sm shadow-inner transition-colors" placeholder="hello@company.com" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-navy-200" htmlFor="phone">Phone Number</label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-400">
                                    <Box className="h-5 w-5" />
                                </div>
                                <input id="phone" type="tel" value={phoneState} onChange={(e) => setPhoneState(e.target.value)} className="block w-full rounded-xl border-navy-600 bg-navy-900/50 py-3 pl-10 pr-3 text-white placeholder-navy-400 focus:border-gold focus:ring-gold sm:text-sm shadow-inner transition-colors" placeholder="+974 5555 5555" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-navy-200" htmlFor="password">Password</label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input id="password" type="password" value={passwordState} onChange={(e) => setPasswordState(e.target.value)} className="block w-full rounded-xl border-navy-600 bg-navy-900/50 py-3 pl-10 pr-3 text-white placeholder-navy-400 focus:border-gold focus:ring-gold sm:text-sm shadow-inner transition-colors" placeholder="Choose a secure password" required minLength={6} />
                            </div>
                        </div>

                        <div>
                            <button type="submit" disabled={isLoading} className="group relative flex w-full justify-center rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy-900 hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:shadow-[0_0_25px_rgba(201,168,76,0.4)]">
                                {isLoading ? (
                                    <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Creating Account...</span>
                                ) : (
                                    <span className="flex items-center gap-2">Create Account <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
