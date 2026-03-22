"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Loader2, Save, Plus, Trash2, User, Building2, Phone, Mail, MapPin, 
    Hash, Briefcase, UserCheck, Camera, X, Globe, FileText, Landmark,
    ShieldCheck, Star, Award, ShieldAlert, CheckCircle2, CloudUpload
} from "lucide-react";
import { CloudImageUpload } from "@/components/CloudImageUpload";

interface POC {
    projectId: string;
    name: string;
    phone: string;
    email: string;
    designation: string;
}

interface VendorProfile {
    id: string;
    website: string;
    taxId: string;
    taxCardUrl: string;
    companyRegistrationUrl: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swift: string;
    scoreDelivery: number;
    scoreCondition: number;
    scoreRating: number;
}

interface ProfileData {
    id: string;
    name: string;
    email: string;
    image: string;
    phoneNumber: string;
    role: string;
    // Company (Legacy fields in user table)
    companyName: string;
    registrationNo: string;
    location: string;
    address: string;
    designation: string;
    alternatePhone: string;
    // POCs
    pocName: string;
    pocPhone: string;
    pocEmail: string;
    pocDesignation: string;
    projectContacts: POC[];
    // Extended Vendor Details
    vendorProfile?: VendorProfile;
}

const Input = ({ label, icon: Icon, type = "text", value, onChange, placeholder, readOnly = false }: any) => (
    <div>
        <label className="block text-[10px] font-black text-[var(--color-slate)] mb-1.5 uppercase tracking-widest">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-slate)] pointer-events-none" />}
            <input
                type={type}
                value={value || ""}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-all ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            />
        </div>
    </div>
);

const Section = ({ title, icon: Icon, description, children, urgent = false }: any) => (
    <div className={`glass rounded-[32px] p-8 space-y-6 border ${urgent ? 'border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]' : 'border-white/10'}`}>
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${urgent ? 'bg-red-500/10' : 'bg-[var(--color-gold)]/10'} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${urgent ? 'text-red-400' : 'text-[var(--color-gold)]'}`} />
                </div>
                <div>
                    <h2 className="font-black text-[var(--color-warm-white)] text-lg tracking-tight uppercase">{title}</h2>
                    {description && <p className="text-xs text-[var(--color-slate)] font-medium">{description}</p>}
                </div>
            </div>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [password, setPassword] = useState("");
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [uploading, setUploading] = useState(false);

    const loadProfile = async () => {
        try {
            const res = await fetch("/api/auth/profile");
            const data = await res.json();
            if (data.user) setProfile(data.user);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleChange = (key: keyof ProfileData, value: any) => {
        if (!profile) return;
        setProfile({ ...profile, [key]: value });
    };

    const handleVendorChange = (key: keyof VendorProfile, value: any) => {
        if (!profile || !profile.vendorProfile) return;
        setProfile({
            ...profile,
            vendorProfile: { ...profile.vendorProfile, [key]: value }
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSaving(true);
        setMsg(null);
        try {
            const body: any = { ...profile };
            if (password && password.length >= 6) body.password = password;
            
            // Extract vendor-specific updates
            if (profile.role === "vendor" && profile.vendorProfile) {
                body.vendorUpdate = { ...profile.vendorProfile };
            }

            const res = await fetch("/api/auth/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            setMsg({ text: "Marketplace credentials updated!", ok: true });
            setPassword("");
            router.refresh();
        } catch (err: any) {
            setMsg({ text: err.message, ok: false });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !profile) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="h-10 w-10 text-[var(--color-gold)] animate-spin" />
            <p className="text-[var(--color-slate)] font-bold text-sm uppercase tracking-widest">Hydrating Secure Profile...</p>
        </div>
    );

    const isVendor = profile.role === "vendor";

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
            <header className="flex items-center justify-between mb-12">
                <div>
                   <h1 className="text-4xl font-black text-[var(--color-warm-white)] tracking-tight">
                    {isVendor ? "Partner Settings" : "My Account"}
                   </h1>
                   <p className="text-[var(--color-slate)] mt-1 font-medium italic opacity-80">
                    {isVendor ? "Managing your global marketplace presence and reliability." : "Manage your personal details and booking history."}
                   </p>
                </div>
                {isVendor && (
                     <div className="flex items-center gap-3 bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 px-4 py-2 rounded-2xl">
                        <ShieldCheck className="w-5 h-5 text-[var(--color-gold)]" />
                        <span className="text-xs font-black text-[var(--color-gold)] uppercase tracking-widest">Verified Partner</span>
                     </div>
                )}
            </header>

            {msg && (
                <div className={`mb-8 p-6 rounded-[24px] text-sm border flex items-center justify-between animate-slide-up ${msg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    <div className="flex items-center gap-3">
                        {msg.ok ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                        <span className="font-bold">{msg.text}</span>
                    </div>
                    <button onClick={() => setMsg(null)}><X className="w-5 h-5 opacity-50" /></button>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8 pb-32">
                
                {/* ── Role-Specific: Reliability Scorecard ── */}
                {isVendor && profile.vendorProfile && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                            <Star className="w-8 h-8 text-[var(--color-gold)] mb-3" />
                            <div className="text-3xl font-black text-[var(--color-warm-white)]">{profile.vendorProfile.scoreRating.toFixed(1)}</div>
                            <div className="text-[10px] font-black uppercase text-[var(--color-slate)] tracking-widest mt-1">Platform Rating</div>
                        </div>
                        <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                            <Award className="w-8 h-8 text-emerald-400 mb-3" />
                            <div className="text-3xl font-black text-[var(--color-warm-white)]">{profile.vendorProfile.scoreDelivery}%</div>
                            <div className="text-[10px] font-black uppercase text-[var(--color-slate)] tracking-widest mt-1">On-Time Delivery</div>
                        </div>
                        <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                            <ShieldCheck className="w-8 h-8 text-blue-400 mb-3" />
                            <div className="text-3xl font-black text-[var(--color-warm-white)]">{profile.vendorProfile.scoreCondition}%</div>
                            <div className="text-[10px] font-black uppercase text-[var(--color-slate)] tracking-widest mt-1">Item Integrity</div>
                        </div>
                    </div>
                )}

                {/* ── Basic Identity ── */}
                <Section title="Account Identity" icon={User} description="Manage your global display name and secure access credentials.">
                     <div className="flex flex-col sm:flex-row items-center gap-8 mb-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-white/5 border-2 border-[var(--color-gold)]/20 shadow-2xl flex items-center justify-center">
                                {profile.image ? (
                                    <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10 text-[var(--color-slate)]" />
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2">
                                <CloudImageUpload
                                    onUpload={(url) => handleChange("image", url)}
                                    // Customizing the trigger to be more minimal
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                            <h3 className="text-lg font-black tracking-tight">{profile.name || "Collaborator Identity"}</h3>
                            <p className="text-xs text-[var(--color-slate)] font-medium italic opacity-70">
                                This image will be shown on all marketplace interactions and official quotes.
                            </p>
                            {profile.image && (
                                <button type="button" onClick={() => handleChange("image", "")} className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-2 hover:underline">Remove Badge</button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input label="Display Name" icon={User} value={profile.name} onChange={(e: any) => handleChange("name", e.target.value)} />
                        <Input label="Email Address" icon={Mail} value={profile.email} readOnly />
                        <Input label="Primary Mobile" icon={Phone} value={profile.phoneNumber} onChange={(e: any) => handleChange("phoneNumber", e.target.value)} />
                        <Input label="Designation" icon={Briefcase} value={profile.designation} onChange={(e: any) => handleChange("designation", e.target.value)} placeholder="e.g. Sales Director" />
                    </div>
                </Section>

                {/* ── Partner Business Profile (Vendor Only) ── */}
                {isVendor && profile.vendorProfile && (
                    <Section title="Business Logistics" icon={Building2} description="Core company details for legal and marketplace identification.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Input label="Legal Company Name" icon={Building2} value={profile.companyName} onChange={(e: any) => handleChange("companyName", e.target.value)} />
                            <Input label="Registration / CR No" icon={Hash} value={profile.registrationNo} onChange={(e: any) => handleChange("registrationNo", e.target.value)} />
                            <Input label="Digital HQ (Website)" icon={Globe} value={profile.vendorProfile.website} onChange={(e: any) => handleVendorChange("website", e.target.value)} placeholder="https://..." />
                            <Input label="Tax ID" icon={FileText} value={profile.vendorProfile.taxId} onChange={(e: any) => handleVendorChange("taxId", e.target.value)} />
                        </div>
                        <Input label="Warehouse Location / Address" icon={MapPin} value={profile.address} onChange={(e: any) => handleChange("address", e.target.value)} />
                    </Section>
                )}

                {/* ── KYC: Legal Documentation (Vendor Only) ── */}
                {isVendor && profile.vendorProfile && (
                    <Section title="Compliance Portal" icon={ShieldCheck} urgent={!profile.vendorProfile.taxCardUrl} description="Upload legal documents to maintain your Verified Partner status.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest">Trade License</span>
                                    {profile.vendorProfile.companyRegistrationUrl ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex flex-col items-center pt-2">
                                    <CloudImageUpload onUpload={(url) => handleVendorChange("companyRegistrationUrl", url)} />
                                    <p className="text-[10px] text-[var(--color-slate)] mt-4 text-center">PDF or High-Res Image of your CR / Trade License.</p>
                                </div>
                            </div>
                            <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest">Tax Card</span>
                                    {profile.vendorProfile.taxCardUrl ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex flex-col items-center pt-2">
                                    <CloudImageUpload onUpload={(url) => handleVendorChange("taxCardUrl", url)} />
                                    <p className="text-[10px] text-[var(--color-slate)] mt-4 text-center">Valid Tax ID card for financial compliance.</p>
                                </div>
                            </div>
                        </div>
                    </Section>
                )}

                {/* ── Financial: Payout Settings (Vendor Only) ── */}
                {isVendor && profile.vendorProfile && (
                    <Section title="Payout Gateway" icon={Landmark} description="Banking details for direct settlement of marketplace earnings.">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Input label="Bank Name" icon={Landmark} value={profile.vendorProfile.bankName} onChange={(e: any) => handleVendorChange("bankName", e.target.value)} />
                            <Input label="Account Holder Name" icon={User} value={profile.vendorProfile.accountName} onChange={(e: any) => handleVendorChange("accountName", e.target.value)} />
                            <Input label="IBAN / Account Number" icon={Hash} value={profile.vendorProfile.iban} onChange={(e: any) => handleVendorChange("iban", e.target.value)} />
                            <Input label="SWIFT / BIC Code" icon={Globe} value={profile.vendorProfile.swift} onChange={(e: any) => handleVendorChange("swift", e.target.value)} />
                        </div>
                    </Section>
                )}

                {/* ── Security ── */}
                <Section title="Access Security" icon={ShieldAlert} description="Update your dashboard authentication password.">
                    <Input 
                        label="New Marketplace Password" 
                        type="password" 
                        value={password} 
                        onChange={(e: any) => setPassword(e.target.value)} 
                        placeholder="Leave blank to maintain current credentials"
                    />
                </Section>

                {/* Fixed Footer with Save Action */}
                <div className="fixed bottom-0 left-0 right-0 p-6 glass border-t border-white/10 z-[100] flex justify-center">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-primary px-12 py-4 flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span className="font-black uppercase tracking-widest text-sm">Synchronize Credentials</span>
                    </button>
                </div>

            </form>
        </div>
    );
}
