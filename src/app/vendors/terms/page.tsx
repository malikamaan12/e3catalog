"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Scale, ShieldCheck, Mail, Building2, UserCheck, AlertOctagon } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function VendorTermsPage() {
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
                        Vendor <span className="text-[var(--color-gold)]">Terms of Service</span>
                    </h1>
                    <p className="text-[var(--color-slate)] max-w-2xl mx-auto text-sm uppercase tracking-widest font-bold">
                        Effective Date: March 2026 • Version 1.2
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <div className="glass rounded-3xl p-8 md:p-12 border border-white/5 space-y-12 leading-relaxed">
                    
                    {/* Section 1 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[var(--color-gold)] mb-6">
                            <Scale className="w-6 h-6 border-b border-current" />
                            <h2 className="text-2xl font-bold text-[var(--color-warm-white)]">1. Partnership Definition</h2>
                        </div>
                        <p className="text-[var(--color-slate)]">
                            By registering as a Vendor on the E3 Marketplace, you are entering into a non-exclusive partnership agreement with E3 Fleet Management. You maintain full ownership of your equipment but grant E3 the right to represent, market, and process bookings for your inventory through our digital platform.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[var(--color-gold)] mb-6">
                            <UserCheck className="w-6 h-6 border-b border-current" />
                            <h2 className="text-2xl font-bold text-[var(--color-warm-white)]">2. Vendor Responsibilities</h2>
                        </div>
                        <ul className="space-y-4 text-[var(--color-slate)] border-l border-white/10 pl-6">
                            <li><strong className="text-[var(--color-warm-white)]">Maintenance:</strong> All equipment must be in peak operating condition. Failure to provide functional items may result in account suspension.</li>
                            <li><strong className="text-[var(--color-warm-white)]">Availability:</strong> You must update your inventory calendar daily. Cancelled bookings due to "out of stock" errors negatively impact your reliability score.</li>
                            <li><strong className="text-[var(--color-warm-white)]">Logistics:</strong> You are responsible for delivery to the client site and pickup after the rental period, unless explicitly managed by E3 logistics.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[var(--color-gold)] mb-6">
                            <ShieldCheck className="w-6 h-6 border-b border-current" />
                            <h2 className="text-2xl font-bold text-[var(--color-warm-white)]">3. Commission & Payouts</h2>
                        </div>
                        <p className="text-[var(--color-slate)] mb-4">
                            E3 provides the lead generation, payment security, and marketplace infrastructure. In exchange, a revenue share is deducted from each successful transaction:
                        </p>
                        <div className="bg-black/20 p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-[var(--color-warm-white)] mb-1 text-sm uppercase tracking-tight">Platform Fee</h4>
                                <p className="text-2xl font-black text-[var(--color-gold)]">20%</p>
                                <p className="text-[10px] text-[var(--color-slate)]">Charged on the total rental amount</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-[var(--color-warm-white)] mb-1 text-sm uppercase tracking-tight">Payout Schedule</h4>
                                <p className="text-xl font-black text-[var(--color-warm-white)] italic">Monthly (5th)</p>
                                <p className="text-[10px] text-[var(--color-slate)]">Direct bank transfer via QNB</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 4 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[var(--color-gold)] mb-6">
                            <AlertOctagon className="w-6 h-6 border-b border-current" />
                            <h2 className="text-2xl font-bold text-[var(--color-warm-white)]">4. Damage & Insurance</h2>
                        </div>
                        <p className="text-[var(--color-slate)]">
                            While E3 facilitates the booking, the rental contract is between the Vendor and the Client. Vendors are encouraged to hold independent liability insurance. In the event of damage, E3 provides a Dispute Center to help mediate and process security deposit claims.
                        </p>
                    </section>

                    {/* Contact CTA */}
                    <div className="pt-12 border-t border-white/5 text-center">
                        <p className="text-[var(--color-slate)] text-sm mb-6 flex items-center justify-center gap-2">
                            <Mail className="w-4 h-4" /> Questions? Email our Partner Success team at partners@e3fleet.qa
                        </p>
                        <Link href="/vendors/register" className="btn-primary">Accept & Continue Registering</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
