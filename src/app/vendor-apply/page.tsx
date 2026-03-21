"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, UploadCloud, XCircle, Building2, User, FileText, Banknote, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function VendorApplyPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Form State
    const [form, setForm] = useState({
        companyName: "",
        website: "",
        taxId: "",
        pocName: "",
        pocPhone: "",
        email: "",
        password: "",
        taxCardUrl: "",
        companyRegistrationUrl: "",
        // Banking Details
        bankName: "",
        accountName: "",
        accountNumber: "",
        iban: "",
        swift: "",
        // Agreement
        agreedToTerms: false,
    });

    const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

    // Upload State
    const [uploadingTax, setUploadingTax] = useState(false);
    const [uploadingReg, setUploadingReg] = useState(false);
    const taxInputRef = useRef<HTMLInputElement>(null);
    const regInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "taxCardUrl" | "companyRegistrationUrl") => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (field === "taxCardUrl") setUploadingTax(true);
        if (field === "companyRegistrationUrl") setUploadingReg(true);
        setError("");

        try {
            // Get Presigned S3 URL
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "kyc" })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Upload failed with status ${res.status}`);
            }
            const data = await res.json();

            // Direct S3 Upload
            const uploadRes = await fetch(data.url, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file
            });
            if (!uploadRes.ok) {
                const s3Error = await uploadRes.text();
                throw new Error(`Storage upload failed: ${uploadRes.status} ${s3Error}`);
            }

            updateForm(field, data.publicUrl);
        } catch (err) {
            console.error(err);
            setError("Document upload failed. Please try again.");
        } finally {
            if (field === "taxCardUrl") setUploadingTax(false);
            if (field === "companyRegistrationUrl") setUploadingReg(false);
        }
    };

    const nextStep = () => {
        setError("");
        if (step === 1) {
            if (!form.companyName || !form.taxId) return setError("Company Name and Tax ID are required");
        }
        if (step === 2) {
            if (!form.pocName || !form.pocPhone || !form.email || !form.password) return setError("All contact fields and password are required");
            if (form.password.length < 8) return setError("Password must be at least 8 characters");
        }
        if (step === 4) {
            if (!form.bankName || !form.accountNumber || !form.iban) return setError("Major banking details (Bank, Account #, IBAN) are required");
        }
        setStep(p => p + 1);
    };

    const submitApplication = async () => {
        if (!form.agreedToTerms) return setError("You must agree to the commission rules to proceed.");
        setError("");

        setSubmitting(true);
        try {
            const res = await fetch("/api/vendors/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Application submission failed");
            }

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen pt-28 pb-20 flex items-center justify-center px-4 bg-[var(--color-navy)]">
                <div className="max-w-md w-full glass rounded-3xl p-8 text-center border border-[var(--color-gold)]/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-gold)] to-yellow-200" />
                    <div className="w-20 h-20 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-[var(--color-gold)]" />
                    </div>
                    <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-3">
                        Application Received
                    </h2>
                    <p className="text-[var(--color-slate)] mb-8 text-sm leading-relaxed">
                        Thank you for applying to become a Vendor partner. Our team will review your KYC documents and contact you within 24-48 business hours.
                    </p>
                    <Link href="/" className="btn-primary w-full justify-center">
                        Return to Home <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-navy)] pb-20">
            {/* Header Area */}
            <div className="pt-32 pb-16 px-6 border-b border-white/5 bg-[var(--color-navy-dark)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-gold)]/5 to-transparent pointer-events-none" />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs font-bold tracking-widest uppercase mb-6 border border-[var(--color-gold)]/20">
                        <Building2 className="w-3.5 h-3.5" />
                        Partner Program
                    </div>
                    <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-6xl font-extrabold text-[var(--color-warm-white)] mb-6 tracking-tight">
                        Become a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-gold)] to-yellow-200">Vendor</span>
                    </h1>
                    <p className="text-lg text-[var(--color-slate)] max-w-2xl mx-auto">
                        List your equipment on our enterprise platform, reach a wider client base, and manage your inventory through our dedicated operating system.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 mt-12">
                {/* Progress Steps */}
                <div className="flex justify-between relative mb-12">
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 z-0" />
                    <div className="absolute top-1/2 left-0 h-[2px] bg-[var(--color-gold)] -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }} />

                    {[
                        { num: 1, title: "Company", icon: Building2 },
                        { num: 2, title: "Contact", icon: User },
                        { num: 3, title: "Compliance", icon: FileText },
                        { num: 4, title: "Banking", icon: Banknote },
                        { num: 5, title: "Agreement", icon: ShieldCheck }
                    ].map((s) => (
                        <div key={s.num} className="relative z-10 flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors border-4 border-[var(--color-navy)] ${step >= s.num ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "bg-[var(--color-navy-lighter)] text-[var(--color-slate)]"}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] uppercase tracking-widest font-bold mt-3 absolute -bottom-6 w-32 text-center ${step >= s.num ? "text-[var(--color-gold)]" : "text-[var(--color-slate)]"}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="glass rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl">
                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                            <XCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Step 1: Company Details */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-1">Company Information</h3>
                                <p className="text-[var(--color-slate)] text-sm mb-8">Please provide your registered business credentials.</p>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Registered Company Name *</label>
                                    <input type="text" value={form.companyName} onChange={e => updateForm("companyName", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="e.g. Apex Events LLC" />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Tax Identification Number (TIN/VAT) *</label>
                                    <input type="text" value={form.taxId} onChange={e => updateForm("taxId", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="e.g. 123456789" />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Website URL (Optional)</label>
                                    <input type="url" value={form.website} onChange={e => updateForm("website", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="https://example.com" />
                                </div>
                            </div>
                            <div className="pt-6 mt-6 border-t border-white/5 flex justify-end">
                                <button onClick={nextStep} className="btn-primary">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact & Login credentials */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-1">Primary Contact</h3>
                                <p className="text-[var(--color-slate)] text-sm mb-8">This will be your initial vendor dashboard login.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Full Name *</label>
                                    <input type="text" value={form.pocName} onChange={e => updateForm("pocName", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="e.g. Jane Doe" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Contact Phone *</label>
                                    <div className="flex gap-2">
                                        <div className="px-4 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-slate)] shrink-0">+974</div>
                                        <input type="tel" value={form.pocPhone} onChange={e => updateForm("pocPhone", e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="1234 5678" />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Email Address (Login ID) *</label>
                                    <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="jane@apexevents.com" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Secure Password *</label>
                                    <input type="password" value={form.password} onChange={e => updateForm("password", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="Minimum 8 characters" />
                                </div>
                            </div>
                            <div className="pt-6 mt-6 border-t border-white/5 flex justify-between">
                                <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-colors text-sm font-semibold">Back</button>
                                <button onClick={nextStep} className="btn-primary">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: KYC Documents */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-1">Compliance & KYC</h3>
                                <p className="text-[var(--color-slate)] text-sm mb-8">Upload scanned copies of required legal documents (PDF/JPG/PNG).</p>
                            </div>

                            <div className="space-y-6">
                                {/* Tax Card */}
                                <div className="p-6 rounded-2xl bg-[var(--color-navy-dark)] border border-white/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-[var(--color-warm-white)] font-bold mb-1">Tax Card Copy (Optional)</h4>
                                            <p className="text-xs text-[var(--color-slate)]">Valid official tax registration card</p>
                                        </div>
                                        {form.taxCardUrl && <div className="px-3 py-1 rounded-full bg-green-500/10 text-[var(--color-success)] text-[10px] font-bold uppercase tracking-wider">Uploaded</div>}
                                    </div>
                                    <input type="file" className="hidden" ref={taxInputRef} accept=".pdf,image/*" onChange={(e) => handleUpload(e, "taxCardUrl")} />
                                    {form.taxCardUrl ? (
                                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                            <FileText className="w-5 h-5 text-[var(--color-gold)]" />
                                            <span className="text-sm text-[var(--color-slate)] truncate flex-1">{form.taxCardUrl.split('/').pop()}</span>
                                            <button onClick={() => updateForm("taxCardUrl", "")} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => taxInputRef.current?.click()} disabled={uploadingTax} className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl hover:border-[var(--color-gold)]/50 transition-colors flex items-center justify-center gap-3 text-[var(--color-slate)] hover:text-[var(--color-warm-white)] group">
                                            {uploadingTax ? <div className="w-5 h-5 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" /> : <UploadCloud className="w-5 h-5 text-[var(--color-gold)]/50 group-hover:text-[var(--color-gold)]" />}
                                            <span className="text-sm font-medium">{uploadingTax ? "Uploading..." : "Click to select file (Max 10MB)"}</span>
                                        </button>
                                    )}
                                </div>

                                {/* CR */}
                                <div className="p-6 rounded-2xl bg-[var(--color-navy-dark)] border border-white/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-[var(--color-warm-white)] font-bold mb-1">Commercial Registration (CR) (Optional)</h4>
                                            <p className="text-xs text-[var(--color-slate)]">Valid CR indicating legal trading status</p>
                                        </div>
                                        {form.companyRegistrationUrl && <div className="px-3 py-1 rounded-full bg-green-500/10 text-[var(--color-success)] text-[10px] font-bold uppercase tracking-wider">Uploaded</div>}
                                    </div>
                                    <input type="file" className="hidden" ref={regInputRef} accept=".pdf,image/*" onChange={(e) => handleUpload(e, "companyRegistrationUrl")} />
                                    {form.companyRegistrationUrl ? (
                                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                            <FileText className="w-5 h-5 text-[var(--color-gold)]" />
                                            <span className="text-sm text-[var(--color-slate)] truncate flex-1">{form.companyRegistrationUrl.split('/').pop()}</span>
                                            <button onClick={() => updateForm("companyRegistrationUrl", "")} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => regInputRef.current?.click()} disabled={uploadingReg} className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl hover:border-[var(--color-gold)]/50 transition-colors flex items-center justify-center gap-3 text-[var(--color-slate)] hover:text-[var(--color-warm-white)] group">
                                            {uploadingReg ? <div className="w-5 h-5 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" /> : <UploadCloud className="w-5 h-5 text-[var(--color-gold)]/50 group-hover:text-[var(--color-gold)]" />}
                                            <span className="text-sm font-medium">{uploadingReg ? "Uploading..." : "Click to select file (Max 10MB)"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-white/5 flex justify-between">
                                <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-colors text-sm font-semibold">Back</button>
                                <button onClick={nextStep} className="btn-primary">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Banking Details */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-1">Banking & Payouts</h3>
                                <p className="text-[var(--color-slate)] text-sm mb-8">Secure details for your monthly marketplace earnings transfers.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Bank Name *</label>
                                    <input type="text" value={form.bankName} onChange={e => updateForm("bankName", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="e.g. Qatar National Bank" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Account Holder Name *</label>
                                    <input type="text" value={form.accountName} onChange={e => updateForm("accountName", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="Legal business or owner name" />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">Account Number *</label>
                                    <input type="text" value={form.accountNumber} onChange={e => updateForm("accountNumber", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="0000 1234 5678" />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">SWIFT / BIC Code</label>
                                    <input type="text" value={form.swift} onChange={e => updateForm("swift", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="QNBKQAXXXX" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-[var(--color-slate)] font-medium mb-2 block">IBAN Number *</label>
                                    <input type="text" value={form.iban} onChange={e => updateForm("iban", e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-[var(--color-navy-lighter)] border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-colors" placeholder="QA00 QNBK 0000 0000 1234 5678" />
                                </div>
                            </div>
                            <div className="pt-6 mt-6 border-t border-white/5 flex justify-between">
                                <button onClick={() => setStep(3)} className="px-6 py-3 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-colors text-sm font-semibold">Back</button>
                                <button onClick={nextStep} className="btn-primary">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Commission Rules & Agreement */}
                    {step === 5 && (
                        <CommissionStep
                            agreed={form.agreedToTerms}
                            onToggle={(val: boolean) => setForm(p => ({ ...p, agreedToTerms: val }))}
                            onBack={() => setStep(4)}
                            onSubmit={submitApplication}
                            submitting={submitting}
                        />
                    )}
                </div>
            </div>
            {/* Footer */}
            <div className="mt-20">
                <Footer />
            </div>
        </div>
    );
}

function CommissionStep({ agreed, onToggle, onBack, onSubmit, submitting }: any) {
    const { getSetting } = useSiteSettings();
    const rules = getSetting("commission_rules", "Platform collects 20% commission on all rentals. Payouts are processed monthly.");

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div>
                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-1">Commission Agreement</h3>
                <p className="text-[var(--color-slate)] text-sm mb-8">Review our marketplace revenue share policy before joining.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 text-sm text-[var(--color-slate)] leading-relaxed">
                <div className="flex items-start gap-3 mb-4">
                    <ShieldCheck className="w-5 h-5 text-[var(--color-gold)] shrink-0" />
                    <div>
                        <h4 className="text-[var(--color-warm-white)] font-bold mb-1 uppercase tracking-tight text-xs">Platform Distribution Rules</h4>
                        <div className="whitespace-pre-wrap">{rules}</div>
                    </div>
                </div>
            </div>

            <label className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors group">
                <div className="pt-0.5">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-transparent text-[var(--color-gold)] focus:ring-[var(--color-gold)]"
                    />
                </div>
                <div>
                    <span className="text-sm font-medium text-[var(--color-warm-white)] block mb-1">I agree to the Commission Rules</span>
                    <span className="text-xs text-[var(--color-slate)]">By checking this, you accept the revenue split and payout terms of E3 Marketplace.</span>
                </div>
            </label>

            <div className="pt-6 mt-6 border-t border-white/5 flex justify-between items-center">
                <button onClick={onBack} disabled={submitting} className="px-6 py-3 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-colors text-sm font-semibold">Back</button>
                <button onClick={onSubmit} disabled={submitting || !agreed} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full mr-2" /> Submitting...</>
                    ) : (
                        <>Submit Application <CheckCircle2 className="w-5 h-5 ml-2" /></>
                    )}
                </button>
            </div>
        </div>
    );
}
