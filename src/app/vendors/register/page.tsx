"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, UploadCloud, XCircle, Building2, User, FileText, Banknote, ShieldCheck, Mail, Lock } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import gsap from "gsap";

export default function VendorRegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const { getSetting } = useSiteSettings();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const mainRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mainRef.current) return;
        gsap.fromTo(mainRef.current, 
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );
    }, []);

    useEffect(() => {
        if (!contentRef.current) return;
        gsap.fromTo(contentRef.current,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }
        );
    }, [step]);

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
        bankName: "",
        accountName: "",
        accountNumber: "",
        iban: "",
        swift: "",
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
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "kyc" })
            });
            if (!res.ok) throw new Error("Upload initialization failed");
            const data = await res.json();

            const uploadRes = await fetch(data.url, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file
            });
            if (!uploadRes.ok) throw new Error("Storage upload failed");

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-gold)]" />
                    <div className="w-20 h-20 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-[var(--color-gold)]" />
                    </div>
                    <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-warm-white)] mb-3">
                        Application Active
                    </h2>
                    <p className="text-[var(--color-slate)] mb-8 text-sm leading-relaxed">
                        Your vendor profile has been submitted for KYC review. Our compliance team will activate your dashboard once your CR and Tax Card are verified.
                    </p>
                    <Link href="/vendors" className="btn-primary w-full justify-center">
                        Return to Portal <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div ref={mainRef} className="min-h-screen bg-[var(--color-navy)] pb-20">
            {/* Minimal Header */}
            <div className="pt-24 pb-12 px-6 border-b border-white/5 bg-[var(--color-navy-dark)]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div>
                        <Link href="/vendors" className="text-[var(--color-slate)] hover:text-[var(--color-warm-white)] flex items-center gap-2 text-sm font-bold transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Portal
                        </Link>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-[var(--color-gold)] font-bold tracking-widest uppercase">Step {step} of 5</span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 mt-12">
                {/* Progress Pipeline */}
                <div className="flex justify-between relative mb-16">
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 z-0" />
                    <div className="absolute top-1/2 left-0 h-[2px] bg-[var(--color-gold)] -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${((step - 1) / 4) * 100}%` }} />

                    {[
                        { num: 1, title: "Company", icon: Building2 },
                        { num: 2, title: "Account", icon: User },
                        { num: 3, title: "KYC", icon: ShieldCheck },
                        { num: 4, title: "Bank", icon: Banknote },
                        { num: 5, title: "Final", icon: FileText }
                    ].map((s) => (
                        <div key={s.num} className="relative z-10 flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2 ${step >= s.num ? "bg-[var(--color-gold)] text-[var(--color-navy)] border-[var(--color-gold)]" : "bg-[var(--color-navy-dark)] text-[var(--color-slate)] border-white/10"}`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[9px] uppercase tracking-widest font-black mt-3 absolute -bottom-6 w-32 text-center ${step >= s.num ? "text-[var(--color-gold)]" : "text-[var(--color-slate)]/50"}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div ref={contentRef} className="glass rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-gold)]/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                    
                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 animate-in fade-in zoom-in">
                            <XCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Step 1: Business Identity */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)] mb-2">Business Identity</h3>
                                <p className="text-[var(--color-slate)] text-sm">Provide your official commercial registration details in Qatar.</p>
                            </div>
                            <div className="space-y-5 pt-4">
                                <div>
                                    <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Commercial Name *</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                        <input type="text" value={form.companyName} onChange={e => updateForm("companyName", e.target.value)}
                                            className="w-full pl-11 pr-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="e.g. Al-Duhail Equipment Rentals" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Tax / CR Number *</label>
                                        <div className="relative">
                                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                            <input type="text" value={form.taxId} onChange={e => updateForm("taxId", e.target.value)}
                                                className="w-full pl-11 pr-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="QID or Tax ID" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Website Portfolio</label>
                                        <div className="relative">
                                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                            <input type="url" value={form.website} onChange={e => updateForm("website", e.target.value)}
                                                className="w-full pl-11 pr-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="https://yourwebsite.com" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 mt-8 border-t border-white/5 flex justify-end">
                                <button onClick={nextStep} className="btn-primary px-8">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Account Holder */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)] mb-2">Account Credentials</h3>
                                <p className="text-[var(--color-slate)] text-sm">These details will be used for your Vendor Dashboard login.</p>
                            </div>
                            <div className="space-y-5 pt-4">
                                <div>
                                    <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Administrator Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                        <input type="text" value={form.pocName} onChange={e => updateForm("pocName", e.target.value)}
                                            className="w-full pl-11 pr-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="Primary Contact Person" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Login Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                        <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                                            className="w-full pl-11 pr-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="partner@company.com" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Phone *</label>
                                        <input type="tel" value={form.pocPhone} onChange={e => updateForm("pocPhone", e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="+974 XXXX XXXX" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">System Password *</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                                            <input type="password" value={form.password} onChange={e => updateForm("password", e.target.value)}
                                                className="w-full pl-11 pr-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="Min 8 characters" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 mt-8 border-t border-white/5 flex justify-between">
                                <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-all text-sm font-bold">Back</button>
                                <button onClick={nextStep} className="btn-primary px-8">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: KYC Uploads */}
                    {step === 3 && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)] mb-2">Compliance Proof</h3>
                                <p className="text-[var(--color-slate)] text-sm">Upload your valid Qatar credentials for vendor activation.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <DocumentUploadCard 
                                    title="CR Document" 
                                    desc="Valid Commercial Registration"
                                    url={form.companyRegistrationUrl}
                                    onUpload={(e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, "companyRegistrationUrl")}
                                    onRemove={() => updateForm("companyRegistrationUrl", "")}
                                    uploading={uploadingReg}
                                />
                                <DocumentUploadCard 
                                    title="Tax Card" 
                                    desc="Official TIN registration proof"
                                    url={form.taxCardUrl}
                                    onUpload={(e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, "taxCardUrl")}
                                    onRemove={() => updateForm("taxCardUrl", "")}
                                    uploading={uploadingTax}
                                />
                            </div>

                            <div className="pt-8 mt-8 border-t border-white/5 flex justify-between">
                                <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-all text-sm font-bold">Back</button>
                                <button onClick={nextStep} className="btn-primary px-8">Next Step <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Bank Details */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)] mb-2">Banking Details</h3>
                                <p className="text-[var(--color-slate)] text-sm">Standard bank details for your monthly settlement payouts.</p>
                            </div>
                            <div className="space-y-5 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">Bank Name *</label>
                                        <input type="text" value={form.bankName} onChange={e => updateForm("bankName", e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="e.g. Qatar National Bank (QNB)" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-[var(--color-slate)] font-bold uppercase tracking-widest mb-2 block">IBAN Number *</label>
                                        <input type="text" value={form.iban} onChange={e => updateForm("iban", e.target.value)}
                                            className="w-full px-5 py-4 rounded-xl bg-black/20 border border-white/10 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none transition-all" placeholder="QA XX QNBK XXXX XXXX XXXX XXXX" />
                                    </div>
                                    <div className="md:col-span-2 text-xs text-yellow-400 p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20 flex gap-3">
                                        <ShieldCheck className="w-4 h-4 shrink-0" />
                                        <span>Payouts are processed automatically on the 5th of every month for a seamless partner experience.</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 mt-8 border-t border-white/5 flex justify-between">
                                <button onClick={() => setStep(3)} className="px-6 py-4 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-all text-sm font-bold">Back</button>
                                <button onClick={nextStep} className="btn-primary px-8">Review Policy <ChevronRight className="w-5 h-5 ml-1" /></button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Final Review */}
                    {step === 5 && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--color-warm-white)] mb-2">Final Review</h3>
                                <p className="text-[var(--color-slate)] text-sm">Read the marketplace policy and confirm your application.</p>
                            </div>

                            <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-[var(--color-slate)] text-sm leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                                <h4 className="text-[var(--color-warm-white)] font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                    <FileText className="w-4 h-4 text-[var(--color-gold)]" /> Marketplace Rules
                                </h4>
                                <div className="space-y-4 whitespace-pre-wrap">
                                    {getSetting('vendor_application_rules_summary', '1. Maintain high standards...')}
                                </div>
                            </div>

                            <label className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 cursor-pointer hover:bg-[var(--color-gold)]/10 transition-all group">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={form.agreedToTerms}
                                        onChange={(e) => updateForm("agreedToTerms", e.target.checked ? "true" : "false")}
                                        className="w-5 h-5 rounded border-white/20 bg-transparent text-[var(--color-gold)] focus:ring-[var(--color-gold)]"
                                    />
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-[var(--color-warm-white)] block mb-1">I accept the Vendor Marketplace Policy</span>
                                    <span className="text-xs text-[var(--color-slate)]">I confirm that all provided details are legally accurate and representative of my business.</span>
                                </div>
                            </label>

                            <div className="pt-8 mt-8 border-t border-white/5 flex justify-between items-center">
                                <button onClick={() => setStep(4)} disabled={submitting} className="px-6 py-4 rounded-xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-all text-sm font-bold">Back</button>
                                <button onClick={submitApplication} disabled={submitting || !form.agreedToTerms} className="btn-primary px-10 disabled:opacity-50">
                                    {submitting ? (
                                        <><div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" /> Submitting...</>
                                    ) : (
                                        <>Submit Application <CheckCircle2 className="w-5 h-5 ml-2" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-24">
                <Footer />
            </div>
        </div>
    );
}

function DocumentUploadCard({ title, desc, url, onUpload, onRemove, uploading }: any) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="p-6 rounded-2xl bg-black/20 border border-white/10 group transition-all hover:border-[var(--color-gold)]/30">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-[var(--color-warm-white)] font-bold mb-1">{title}</h4>
                    <p className="text-xs text-[var(--color-slate)]">{desc}</p>
                </div>
                {url && <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest border border-green-500/20">Uploaded</div>}
            </div>
            <input type="file" className="hidden" ref={inputRef} accept=".pdf,image/*" onChange={onUpload} />
            {url ? (
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <FileText className="w-6 h-6 text-[var(--color-gold)]" />
                    <span className="text-sm text-[var(--color-slate)] truncate flex-1 font-mono">{url.split('/').pop()}</span>
                    <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 font-bold">Delete</button>
                </div>
            ) : (
                <button 
                    onClick={() => inputRef.current?.click()} 
                    disabled={uploading} 
                    className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl hover:border-[var(--color-gold)]/50 transition-all flex flex-col items-center justify-center gap-3 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] bg-black/10"
                >
                    {uploading ? (
                        <div className="w-8 h-8 border-3 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full" />
                    ) : (
                        <UploadCloud className="w-10 h-10 opacity-30 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className="text-center text-xs">
                        <span className="font-bold block text-[var(--color-warm-white)] mb-1">{uploading ? "Processing Document..." : "Click to select or drop file"}</span>
                        PDF, JPG, or PNG (Max 10MB)
                    </div>
                </button>
            )}
        </div>
    );
}
