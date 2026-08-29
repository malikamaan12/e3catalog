"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale, CheckCircle2, Mail, FileText } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function VendorTermsPage() {
    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col justify-between">
            {/* Header */}
            <header className="pt-24 pb-12 px-6 border-b border-white/10 bg-[#0d152a]/80 backdrop-blur-md relative overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <Link href="/vendors" className="inline-flex items-center gap-2 text-[var(--color-gold)] font-bold text-xs tracking-widest uppercase mb-6 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Vendor Portal
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] text-xs font-bold uppercase tracking-wider mb-4">
                        <Scale className="w-3.5 h-3.5" />
                        Commercial Supplier Agreement
                    </div>
                    <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
                        Vendor <span className="text-[var(--color-gold)]">Terms of Service</span>
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm">
                        Governing Equipment Suppliers, Staging Partners & Logistics Providers in Qatar
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
                <div className="space-y-8 text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
                    
                    {/* Section 1 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">01.</span> 
                            Marketplace Participation & Eligibility
                        </h2>
                        <p>
                            By registering as an Equipment Supplier on E3 Rentals (&ldquo;the Platform&rdquo;), you certify that your entity is legally incorporated under the laws of the State of Qatar, possesses a valid Commercial Registration (CR), and maintains all necessary trade licenses and civil defence permits for commercial event equipment leasing.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">02.</span> 
                            Commercial Commission & Pricing
                        </h2>
                        <p>
                            E3 Rentals operates on a transparent, standardized commercial commission model:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-white/90">
                            <li><strong>Standard Marketplace Commission:</strong> 15% platform fee deducted from confirmed booking gross totals.</li>
                            <li><strong>Net Vendor Payout:</strong> 85% of agreed rental rate disbursed following successful event sign-off.</li>
                            <li><strong>Payout Schedule:</strong> Settlements are processed on a Net-14 basis following verified equipment return and condition inspection without unresolved damage claims.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">03.</span> 
                            Equipment Quality, Safety & Maintenance
                        </h2>
                        <p>
                            Vendors bear full legal and operational responsibility for the structural integrity, electrical safety, and maintenance readiness of all listed inventory:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-white/90">
                            <li>All rigging, trussing, and staging units must possess valid load-bearing test certificates.</li>
                            <li>Electrical fixtures, power distribution racks, and generators must comply with KAHRAMAA safety guidelines.</li>
                            <li>Damaged or malfunctioning units must be immediately marked as &ldquo;Offline / In Maintenance&rdquo; in the Vendor Dashboard to prevent overbooking.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">04.</span> 
                            Fulfillment, Dispatch & Digital Passport Scanning
                        </h2>
                        <p>
                            Vendors must adhere to agreed dispatch windows. All inventory dispatched through E3 logistics must have active QR asset tags and undergo mandatory digital check-out and check-in scans to maintain continuous chain-of-custody tracking.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono">05.</span> 
                            Dispute Resolution & Governing Law
                        </h2>
                        <p>
                            These terms shall be governed by and construed in accordance with the laws of the State of Qatar. Any disputes arising out of equipment damage, late returns, or settlement discrepancies shall be submitted to the exclusive jurisdiction of the competent Courts of Qatar.
                        </p>
                    </section>

                    {/* Actions */}
                    <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-white/60">
                            <Mail className="w-4 h-4 text-[var(--color-gold)]" />
                            <span>Vendor Inquiries: vendor-success@e3rentals.com</span>
                        </div>
                        <Link href="/vendors/register" className="btn-primary">
                            Register as Equipment Partner
                        </Link>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
