"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Truck, Star, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function VendorPolicyPage() {
    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col justify-between">
            {/* Header */}
            <header className="pt-24 pb-12 px-6 border-b border-white/10 bg-[#0d152a]/80 backdrop-blur-md relative overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <Link href="/vendors" className="inline-flex items-center gap-2 text-[var(--color-gold)] font-bold text-xs tracking-widest uppercase mb-6 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Vendor Portal
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] text-xs font-bold uppercase tracking-wider mb-4">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Operational Standard Operating Procedures
                    </div>
                    <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
                        Marketplace <span className="text-[var(--color-gold)]">Operational Policies</span>
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm">
                        Quality Benchmarks, Dispatch Protocols & Cancellation Rules for E3 Partners
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
                <div className="space-y-8 text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
                    
                    {/* Section 1 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">01.</span> 
                            Equipment Condition & Acceptance Criteria
                        </h2>
                        <p>
                            All inventory listed on the E3 Rentals catalog must meet rigorous commercial presentation benchmarks prior to dispatch:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Excellent Tier</span>
                                <p className="text-xs text-[var(--color-slate)]">Zero cosmetic blemishes, original OEM flight cases, latest firmware installed.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Good Tier</span>
                                <p className="text-xs text-[var(--color-slate)]">Minor cosmetic scuffs on protective casing, 100% functional optical & electrical output.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block mb-1">Service Tier</span>
                                <p className="text-xs text-[var(--color-slate)]">Must be quarantined or repaired prior to any commercial deployment.</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">02.</span> 
                            Cancellation & Modification Policies
                        </h2>
                        <p>
                            To protect event production schedules and logistic dispatch commitments:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-white/90">
                            <li><strong>Client Cancellations &gt; 7 days:</strong> 100% refund less a 5% administrative handling fee.</li>
                            <li><strong>Client Cancellations 3 to 7 days:</strong> 50% rental fee forfeiture to compensate vendor inventory reservation.</li>
                            <li><strong>Client Cancellations &lt; 72 hours:</strong> 100% booking total payable as staged inventory cannot be re-allocated.</li>
                            <li><strong>Vendor-Initiated Non-Fulfillment:</strong> If a vendor fails to supply confirmed gear, an automatic substitute will be sourced at the vendor&rsquo;s expense, and vendor rank will be penalized.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">03.</span> 
                            Post-Event Returns & Damage Assessment
                        </h2>
                        <p>
                            Upon return of equipment to the staging warehouse:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-white/90">
                            <li>A certified warehouse technician conducts a digital return inspection within 24 hours.</li>
                            <li>Any damage outside standard operational wear-and-tear is documented with high-resolution photographic evidence and logged directly into the Asset Passport.</li>
                            <li>Repair or replacement costs are assessed against the client&rsquo;s security deposit or commercial purchase order guarantee.</li>
                        </ul>
                    </section>

                    {/* Quality Assurance Note */}
                    <div className="p-6 rounded-2xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 flex items-start gap-4">
                        <Info className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-white font-bold text-sm mb-1">Marketplace Governance Standards</h4>
                            <p className="text-xs text-[var(--color-slate)] leading-relaxed">
                                E3 Rentals reserves the right to audit supplier facilities and inspect warehouse inventory unannounced to guarantee compliance with Qatar Civil Defence and MOCI event safety regulations.
                            </p>
                        </div>
                    </div>

                    <div className="text-center pt-4">
                        <Link href="/vendors/register" className="btn-primary">
                            Register Your Fleet
                        </Link>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
