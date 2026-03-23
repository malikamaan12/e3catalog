"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Truck, Star, Phone, CheckCircle, Info, Construction, AlertOctagon } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function VendorPolicyPage() {
    return (
        <div className="min-h-screen bg-[var(--color-navy)]">
            {/* Header */}
            <header className="pt-32 pb-16 px-6 border-b border-white/5 bg-[var(--color-navy-dark)] relative overflow-hidden text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-gold)]/5 to-transparent pointer-events-none" />
                <div className="max-w-4xl mx-auto relative z-10">
                    <Link href="/vendors" className="inline-flex items-center gap-2 text-[var(--color-gold)] font-bold text-xs tracking-widest uppercase mb-6 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
                    </Link>
                    <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-extrabold text-[var(--color-warm-white)] mb-4 tracking-tight">
                         Marketplace <span className="text-[var(--color-gold)]">Policies</span>
                    </h1>
                    <p className="text-[var(--color-slate)] max-w-2xl mx-auto text-sm uppercase tracking-widest font-bold">
                        Operational Standards & Quality Control
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Item Quality Policy */}
                    <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/10 flex items-center justify-center mb-4">
                            <Star className="w-6 h-6 text-[var(--color-gold)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--color-warm-white)] uppercase tracking-tight">Item Quality Standard</h2>
                        <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                            Every item listed on E3 must be "Project Ready". This means no structural damage, clean aesthetics, and 100% functional integrity. 
                        </p>
                        <div className="pt-4 space-y-2">
                            <h4 className="text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-widest">Key Rules:</h4>
                            <ul className="text-xs text-[var(--color-slate)] space-y-2">
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Professional cleaning after every rental.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Real item photos only (no stock renders).</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Annual maintenance certificates for machinery.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Delivery & Punctuality */}
                    <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                            <Truck className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--color-warm-white)] uppercase tracking-tight">Logistics & Timing</h2>
                        <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                            Enterprise clients operate on strict timelines. Punctuality is our most critical performance metric.
                        </p>
                        <div className="pt-4 space-y-2">
                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">SLA Targets:</h4>
                            <ul className="text-xs text-[var(--color-slate)] space-y-2">
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Delivery Arrival: T-minus 2 hours of event start.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Pickup Window: Within 24 hours of project end.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> 100% On-Time Delivery for 'Elite' tier status.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Communication Policy */}
                    <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                            <Phone className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--color-warm-white)] uppercase tracking-tight">Communication Policy</h2>
                        <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                            Maintain a professional dialogue through the E3 platform for audit transparency and security.
                        </p>
                        <div className="pt-4 space-y-2">
                            <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Requirements:</h4>
                            <ul className="text-xs text-[var(--color-slate)] space-y-2">
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Response under 4 hours for booking requests.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Professional attire for delivery staff.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> No direct solicitation of E3 clients.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Dispute Resolution */}
                    <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertOctagon className="w-6 h-6 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--color-warm-white)] uppercase tracking-tight">Dispute Resolution</h2>
                        <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                            Standardized mediation process for damages, delays, or service non-performance.
                        </p>
                        <div className="pt-4 space-y-2">
                            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Process:</h4>
                            <ul className="text-xs text-[var(--color-slate)] space-y-2">
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> POD photos required for damage claims.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Mediation phase: 7 business days.</li>
                                <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" /> Fair market depreciation applied to claims.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Final Note */}
                <div className="mt-16 p-8 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                    <Info className="w-6 h-6 text-blue-400 shrink-0" />
                    <div>
                        <h4 className="text-[var(--color-warm-white)] font-bold mb-2">Policy Updates</h4>
                        <p className="text-xs text-[var(--color-slate)] leading-relaxed">
                            These policies are designed to maintain the highest level of marketplace health. E3 reserves the right to update these standards with 30-day notice to all Vendor partners. Failure to adhere to these policies will impact your **Reliability Score** and may lead to account deactivation.
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link href="/vendors/register" className="btn-primary">Become a Partner</Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
