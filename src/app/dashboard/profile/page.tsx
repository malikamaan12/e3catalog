"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Loader2, Save, User, Building2, Phone, Mail, MapPin, 
    Hash, Briefcase, Camera, X, Globe, FileText, Landmark,
    ShieldCheck, Star, Award, ShieldAlert, CheckCircle2, 
    TrendingUp, LayoutDashboard, ChevronRight, Info
} from "lucide-react";
import { CloudImageUpload } from "@/components/CloudImageUpload";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

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
    kycStatus: string;
    storeStatus: string;
}

interface ProfileData {
    id: string;
    name: string;
    email: string;
    image: string;
    phoneNumber: string;
    role: string;
    companyName: string;
    registrationNo: string;
    location: string;
    address: string;
    designation: string;
    alternatePhone: string;
    pocName: string;
    pocPhone: string;
    pocEmail: string;
    pocDesignation: string;
    projectContacts: POC[];
    vendorProfile?: VendorProfile;
}

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [password, setPassword] = useState("");

    const loadProfile = async () => {
        try {
            const res = await fetch("/api/auth/profile");
            const data = await res.json();
            if (data.user) setProfile(data.user);
        } catch (err) {
            console.error("Profile Load Error:", err);
            toast.error("Telemetry fetch failed");
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

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!profile) return;
        setSaving(true);
        try {
            const body: any = { ...profile };
            if (password && password.length >= 6) body.password = password;
            if (profile.role === "vendor" && profile.vendorProfile) {
                body.vendorUpdate = { ...profile.vendorProfile };
            }

            const res = await fetch("/api/auth/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Save operation failed");
            toast.success("Operational credentials synchronized");
            setPassword("");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Failed to sync state");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !profile) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="h-10 w-10 text-[var(--color-gold)] animate-spin" />
            <p className="text-[var(--color-slate)] font-bold text-sm uppercase tracking-[0.2em] animate-pulse">Synchronizing Neural Core...</p>
        </div>
    );

    const isVendor = profile.role === "vendor";
    const v = profile.vendorProfile;

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in relative pb-32">
            {/* Glassmorphic Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                <div className="flex items-start gap-8">
                     <div className="relative group">
                        <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-white/5 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] flex items-center justify-center p-1 transition-transform group-hover:scale-110">
                            {profile.image ? (
                                <img src={profile.image} className="w-full h-full object-cover rounded-[28px]" />
                            ) : (
                                <User className="w-10 h-10 text-white/20" />
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 transform transition-all group-hover:scale-125">
                            <CloudImageUpload onUploadComplete={(url: string) => handleChange("image", url)} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <h1 className="text-4xl font-black text-white tracking-tighter">{profile.companyName || profile.name}</h1>
                            <StatusBadge status={v?.storeStatus || "pending"} kyc={v?.kycStatus || "pending"} />
                        </div>
                        <p className="text-sm text-[var(--color-slate)] font-medium max-w-xl italic opacity-80">
                           Manage your isolated marketplace node, business credentials, and reliability scorecard.
                        </p>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-[40px] backdrop-blur-3xl shadow-2xl">
                    <ShieldCheck className="w-6 h-6 text-[var(--color-gold)]" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Encryption Level 4</span>
                        <span className="text-[9px] text-[var(--color-slate)] font-bold uppercase opacity-50 tracking-tighter">Verified Operational Node</span>
                    </div>
                </div>
            </header>

            <Tabs.Root defaultValue="profile" className="space-y-12">
                <Tabs.List className="flex bg-white/5 border border-white/10 p-2 rounded-[32px] overflow-x-auto custom-scrollbar no-scrollbar transition-all backdrop-blur-xl">
                    <TabTrigger value="profile" icon={User} label="Business Profile" />
                    {isVendor && (
                        <>
                            <TabTrigger value="kyc" icon={ShieldCheck} label="KYC Compliance" />
                            <TabTrigger value="financial" icon={Landmark} label="Payout Gateway" />
                            <TabTrigger value="reliability" icon={TrendingUp} label="Reliability Scorecard" />
                        </>
                    )}
                </Tabs.List>

                <div className="mt-12 focus:outline-none min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <Tabs.Content key="profile" value="profile" asChild>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                                <FormSection title="Core Identity" icon={Building2} desc="Essential company details and contact information.">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FloatingInput label="Legal Entity Name" icon={Building2} value={profile.companyName} onChange={(val: string) => handleChange("companyName", val)} />
                                        <FloatingInput label="Registration / CR-NO" icon={Hash} value={profile.registrationNo} onChange={(val: string) => handleChange("registrationNo", val)} />
                                        <FloatingInput label="Primary Mobile" icon={Phone} value={profile.phoneNumber} onChange={(val: string) => handleChange("phoneNumber", val)} />
                                        <FloatingInput label="Corporate Email" icon={Mail} value={profile.email} readOnly />
                                        <FloatingInput label="Warehouse Address" icon={MapPin} value={profile.address} onChange={(val: string) => handleChange("address", val)} className="col-span-1 md:col-span-2" />
                                    </div>
                                </FormSection>

                                <FormSection title="Security Protocol" icon={ShieldAlert} desc="Reset your operational access credentials.">
                                    <div className="max-w-md">
                                        <FloatingInput 
                                            label="Update Neural Password" 
                                            icon={ShieldAlert} 
                                            type="password" 
                                            value={password} 
                                            onChange={(val: string) => setPassword(val)} 
                                            placeholder="Leave empty to maintain current state"
                                        />
                                    </div>
                                </FormSection>
                            </motion.div>
                        </Tabs.Content>

                        <Tabs.Content key="kyc" value="kyc" asChild>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                                <FormSection title="KYC Compliance Matrix" icon={ShieldCheck} desc="Official documentation required for marketplace liquidity.">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <ComplianceCard 
                                            title="Trade License (CR)" 
                                            url={v?.companyRegistrationUrl} 
                                            onUpload={(url: string) => handleVendorChange("companyRegistrationUrl", url)}
                                            desc="Valid CR issued by the Ministry of Commerce."
                                        />
                                        <ComplianceCard 
                                            title="Tax Registration Card" 
                                            url={v?.taxCardUrl} 
                                            onUpload={(url: string) => handleVendorChange("taxCardUrl", url)}
                                            desc="Tax ID card for financial audit."
                                        />
                                    </div>
                                </FormSection>
                            </motion.div>
                        </Tabs.Content>

                        <Tabs.Content key="financial" value="financial" asChild>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                                <FormSection title="Payout Node Configuration" icon={Landmark} desc="Verify your banking details for automated settlements.">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <FloatingInput label="Financial Institution" icon={Landmark} value={v?.bankName} onChange={(val: string) => handleVendorChange("bankName", val)} />
                                        <FloatingInput label="Beneficiary Name" icon={User} value={v?.accountName} onChange={(val: string) => handleVendorChange("accountName", val)} />
                                        <FloatingInput label="SWIFT / BIC" icon={Globe} value={v?.swift} onChange={(val: string) => handleVendorChange("swift", val)} />
                                        <FloatingInput label="IBAN / Account Number" icon={Hash} value={v?.iban} onChange={(val: string) => handleVendorChange("iban", val)} className="col-span-1 md:col-span-2 tracking-widest text-[var(--color-gold)]" />
                                    </div>
                                </FormSection>
                            </motion.div>
                        </Tabs.Content>

                        <Tabs.Content key="reliability" value="reliability" asChild>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <ScoreCard value={v?.scoreRating || 5.0} max={5.0} label="Marketplace Rating" icon={Star} color="text-[var(--color-gold)]" unit="/ 5.0" />
                                    <ScoreCard value={v?.scoreDelivery || 100} max={100} label="On-Time Deployment" icon={Award} color="text-emerald-400" unit="%" />
                                    <ScoreCard value={v?.scoreCondition || 100} max={100} label="Equipment Integrity" icon={ShieldCheck} color="text-blue-400" unit="%" />
                                </div>

                                <div className="glass p-10 rounded-[48px] border border-white/5 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-white/5">
                                            <Info className="w-6 h-6 text-[var(--color-gold)]" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white tracking-tight">Performance Analytics</h4>
                                            <p className="text-sm text-[var(--color-slate)] font-medium">Your platform visibility is dynamically computed based on these scores.</p>
                                        </div>
                                    </div>
                                    <div className="h-[1px] w-full bg-white/5" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                        <InsightRow label="Booking Fulfillment" value="100% Efficiency" sub="Based on last 30 transactions" />
                                        <InsightRow label="Client Sentiment" value="Highly Positive" sub="Top 5% of marketplace partners" />
                                    </div>
                                </div>
                            </motion.div>
                        </Tabs.Content>
                    </AnimatePresence>
                </div>
            </Tabs.Root>

            {/* Permanent Save Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 glass border-t border-white/10 z-[100] flex justify-center">
                <button 
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="btn-primary px-12 py-5 rounded-full flex items-center gap-4 shadow-[0_20px_50px_rgba(212,175,55,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 group"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                    <span className="font-black uppercase tracking-[0.2em] text-sm">Commit System State</span>
                </button>
            </div>
        </div>
    );
}

function TabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
    return (
        <Tabs.Trigger 
            value={value}
            className="flex-1 min-w-[140px] px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 data-[state=active]:bg-[var(--color-gold)] data-[state=active]:text-[var(--color-navy)] data-[state=active]:shadow-lg data-[state=active]:scale-105 data-[state=inactive]:text-[var(--color-slate)] hover:bg-white/5"
        >
            <Icon className="w-4 h-4" />
            {label}
        </Tabs.Trigger>
    );
}

function FormSection({ title, icon: Icon, desc, children }: { title: string, icon: any, desc: string, children: React.ReactNode }) {
    return (
        <div className="space-y-8 animate-fade-up">
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-[var(--color-gold)]" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                   <p className="text-sm text-[var(--color-slate)] font-medium opacity-60">{desc}</p>
                </div>
            </div>
            <div className="glass p-10 rounded-[48px] border border-white/5">
                {children}
            </div>
        </div>
    );
}

function FloatingInput({ label, icon: Icon, value, onChange, placeholder, readOnly, className, type = "text" }: { 
    label: string, icon: any, value?: string, onChange?: (val: string) => void, placeholder?: string, readOnly?: boolean, className?: string, type?: string 
}) {
    return (
        <div className={cn("space-y-2", className)}>
            <label className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] ml-2 block">{label}</label>
            <div className="relative group">
                <Icon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)] group-focus-within:text-[var(--color-gold)] transition-colors" />
                <input 
                    type={type}
                    value={value || ""}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className={cn(
                        "w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:border-[var(--color-gold)] focus:bg-white/[0.05] outline-none transition-all",
                        readOnly && "opacity-50 cursor-not-allowed"
                    )}
                />
            </div>
        </div>
    );
}

function ComplianceCard({ title, url, onUpload, desc }: { title: string, url?: string, onUpload: (url: string) => void, desc: string }) {
    return (
        <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 flex flex-col items-center text-center group hover:border-[var(--color-gold)]/20 transition-all">
            <div className="mb-6 relative">
                <div className="w-20 h-20 rounded-[24px] bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    {url ? <FileText className="w-10 h-10 text-emerald-400" /> : <ShieldAlert className="w-10 h-10 text-red-500/50" />}
                </div>
                {url && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1 shadow-lg">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                )}
            </div>
            <h4 className="text-base font-black text-white mb-2 uppercase tracking-tight">{title}</h4>
            <p className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-widest leading-relaxed mb-6 px-4">{desc}</p>
            <CloudImageUpload onUploadComplete={onUpload} />
        </div>
    );
}

function ScoreCard({ value, max, label, icon: Icon, color, unit }: { value: number, max: number, label: string, icon: any, color: string, unit: string }) {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-10 rounded-[48px] border border-white/5 flex flex-col items-center text-center relative overflow-hidden group"
        >
            <div className={cn("p-4 rounded-[28px] bg-white/5 mb-6 transition-transform group-hover:rotate-6", color)}>
                <Icon className="w-8 h-8" />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white tracking-tighter transition-all group-hover:scale-110">{value}</span>
                <span className="text-xs font-black text-[var(--color-slate)] opacity-40 uppercase tracking-widest">{unit}</span>
            </div>
            <p className="text-[10px] font-black uppercase text-[var(--color-slate)] tracking-[0.2em] mt-2 mb-6">{label}</p>
            
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(value/max)*100}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={cn("h-full shadow-[0_0_15px_rgba(212,175,55,0.3)]", color.replace('text', 'bg'))} 
                />
            </div>

            <div className={cn("absolute -right-10 -bottom-10 w-40 h-40 blur-[80px] opacity-10 rounded-full", color.replace('text', 'bg'))} />
        </motion.div>
    );
}

function InsightRow({ label, value, sub }: { label: string, value: string, sub: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="w-1.5 h-12 rounded-full bg-[var(--color-gold)]/20" />
            <div>
                <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-lg font-black text-white tracking-tight">{value}</p>
                <p className="text-[10px] text-[var(--color-slate)] opacity-60 font-bold">{sub}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status, kyc }: { status: string, kyc: string }) {
    const config = {
        active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        suspended: "text-red-400 bg-red-400/10 border-red-400/20",
        pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    } as any;

    const displayStatus = kyc !== "approved" ? "KYC Review Needed" : status;
    const finalStatus = kyc !== "approved" ? "pending" : status;

    return (
        <span className={cn("px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md shadow-xl", config[finalStatus] || config.pending)}>
            {displayStatus}
        </span>
    );
}

