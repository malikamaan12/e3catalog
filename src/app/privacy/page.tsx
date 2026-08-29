import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft, Mail } from "lucide-react";
import { Footer } from "@/components/Footer";

export const metadata = {
    title: "Privacy Policy | E3 Rentals",
    description: "Official Privacy Notice & Personal Data Protection Policy in compliance with Qatar Law No. 13 of 2016.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col justify-between">
            {/* Header / Nav */}
            <div className="border-b border-white/10 bg-[#0d152a]/80 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--color-slate)] hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-gold)]">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Qatar Law No. 13 of 2016 Compliant</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-16 flex-1">
                <div className="space-y-4 mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] text-xs font-bold uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5" />
                        Data Privacy & Governance Notice
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-[family-name:var(--font-heading)] text-white tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm">
                        Effective Date: August 28, 2026 • Last Reviewed: August 2026
                    </p>
                </div>

                <div className="prose prose-invert max-w-none space-y-10 text-[var(--color-slate)] text-sm md:text-base leading-relaxed">
                    
                    {/* Section 1 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono text-base">01.</span> 
                            Overview & Data Controller
                        </h2>
                        <p>
                            E3 Rentals (&ldquo;E3&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) provides commercial event equipment rentals, staging, and event logistics services across the State of Qatar. We are committed to protecting your personal data and ensuring transparent processing in accordance with <strong>Qatar Law No. 13 of 2016 on the Protection of Personal Data Privacy</strong>.
                        </p>
                        <p>
                            This Privacy Policy explains what personal data we collect, why we collect it, how it is processed, and your statutory rights regarding your personal information.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono text-base">02.</span> 
                            Categories of Personal Data We Collect
                        </h2>
                        <p>We collect only the minimum data necessary to fulfill commercial and operational event requirements:</p>
                        <ul className="list-disc pl-6 space-y-2 text-white/90">
                            <li><strong>Identity & Contact Information:</strong> Name, business email, contact phone number, company name, and job title.</li>
                            <li><strong>Event & Logistics Details:</strong> Event dates, venue location, delivery site coordinates, and on-site contact persons.</li>
                            <li><strong>Commercial & Transactional Records:</strong> Quotation details, approved bookings, digital signatures on commercial proposals, invoice amounts, and payment references.</li>
                            <li><strong>Vendor KYC Data:</strong> Commercial Registration (CR) documents, trade licenses, authorized signatory IDs, and bank settlement details.</li>
                            <li><strong>Technical Telemetry:</strong> Anonymized session IDs, device browser type, and interaction timestamps for service reliability.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono text-base">03.</span> 
                            Purposes and Legal Basis for Processing
                        </h2>
                        <p>We process personal data under the following lawful bases:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <h4 className="font-bold text-white text-sm mb-1">Contract Performance</h4>
                                <p className="text-xs text-[var(--color-slate)]">Generating rental quotes, booking confirmation, warehouse staging, transport dispatch, and digital contract sign-off.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <h4 className="font-bold text-white text-sm mb-1">Legal & Regulatory Compliance</h4>
                                <p className="text-xs text-[var(--color-slate)]">Adhering to Ministry of Commerce & Industry (MOCI) requirements and Qatar Civil Defence safety certificate verifications.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <h4 className="font-bold text-white text-sm mb-1">Legitimate Interests</h4>
                                <p className="text-xs text-[var(--color-slate)]">Preventing equipment loss, resolving technical issues, and maintaining fraud prevention and platform security.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                <h4 className="font-bold text-white text-sm mb-1">Consent</h4>
                                <p className="text-xs text-[var(--color-slate)]">Where you explicitly agree to receive event industry newsletters or product catalog updates.</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 4 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono text-base">04.</span> 
                            Data Security & Protection Measures
                        </h2>
                        <p>
                            We employ strict technical and organizational safeguards to protect your personal data against unauthorized access, loss, or destruction:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-white/90">
                            <li>All data in transit is encrypted using 256-bit TLS/HTTPS encryption with HTTP Strict Transport Security (HSTS).</li>
                            <li>Database storage is restricted through role-based access control (RBAC), preventing operational roles from viewing unauthorized customer PII.</li>
                            <li>Digital signatures and transport manifests are locked to authorized booking records.</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono text-base">05.</span> 
                            Data Retention & Your Statutory Rights
                        </h2>
                        <p>
                            We retain transactional and quotation records for the period mandated by commercial and tax laws in Qatar. Under Qatar Law No. 13 of 2016, you have the right to:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-white/90">
                            <li><strong>Access:</strong> Request confirmation and an export of the personal data we hold about you.</li>
                            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete personal information.</li>
                            <li><strong>Erasure / Deletion:</strong> Request deletion of your personal data where retention is no longer required by law.</li>
                            <li><strong>Objection:</strong> Object to processing for direct marketing purposes.</li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-[family-name:var(--font-heading)]">
                            <span className="text-[var(--color-gold)] font-mono text-base">06.</span> 
                            Contact the Data Protection Controller
                        </h2>
                        <p>
                            To exercise any of your data protection rights or if you have questions regarding this Privacy Policy, please contact our Data Protection Officer:
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <a href="mailto:privacy@e3rentals.com" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)] font-bold text-sm hover:bg-[var(--color-gold)]/20 transition-colors">
                                <Mail className="w-4 h-4" />
                                privacy@e3rentals.com
                            </a>
                            <a href="mailto:info@e3rentals.qa" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors">
                                <FileText className="w-4 h-4" />
                                info@e3rentals.qa
                            </a>
                        </div>
                    </section>

                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
