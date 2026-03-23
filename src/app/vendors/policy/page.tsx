"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Truck, Star, Phone, CheckCircle, Info, Construction, AlertOctagon } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function VendorPolicyPage() {
    const { getSetting } = useSiteSettings();
    const content = getSetting('vendor_policy_content', 'Standard Marketplace Policies...');

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
                <div className="glass rounded-3xl p-8 md:p-12 border border-white/5 leading-relaxed">
                    <div className="prose prose-invert max-w-none text-[var(--color-slate)] whitespace-pre-wrap">
                        {content}
                    </div>

                    {/* Final Note */}
                    <div className="mt-16 p-8 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                        <Info className="w-6 h-6 text-blue-400 shrink-0" />
                        <div>
                            <h4 className="text-[var(--color-warm-white)] font-bold mb-2">Policy Updates</h4>
                            <p className="text-xs text-[var(--color-slate)] leading-relaxed">
                                These policies are designed to maintain the highest level of marketplace health. E3 reserves the right to update these standards via the Super Admin Console.
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <Link href="/vendors/register" className="btn-primary">Become a Partner</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
