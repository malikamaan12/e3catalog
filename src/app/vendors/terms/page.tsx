"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Scale, ShieldCheck, Mail, Building2, UserCheck, AlertOctagon } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function VendorTermsPage() {
    const { getSetting } = useSiteSettings();
    const content = getSetting('vendor_terms_content', 'Standard Vendor Terms of Service...');

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
                        E3 Partner Agreement • Updated Daily
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <div className="glass rounded-3xl p-8 md:p-12 border border-white/5 leading-relaxed">
                    <div className="prose prose-invert max-w-none text-[var(--color-slate)] whitespace-pre-wrap">
                        {content}
                    </div>
                    
                    {/* Contact CTA */}
                    <div className="pt-12 mt-12 border-t border-white/5 text-center">
                        <p className="text-[var(--color-slate)] text-sm mb-6 flex items-center justify-center gap-2">
                            <Mail className="w-4 h-4" /> Questions? Email our Partner Success team
                        </p>
                        <Link href="/vendors/register" className="btn-primary">Accept & Continue Registering</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
