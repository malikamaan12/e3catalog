"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, Trash2, User, Building2, Phone, Mail, MapPin, Hash, Briefcase, UserCheck, Camera, X } from "lucide-react";

interface POC {
    projectId: string;
    name: string;
    phone: string;
    email: string;
    designation: string;
}

interface ProfileData {
    name: string;
    email: string;
    image: string;
    phoneNumber: string;
    // Company
    companyName: string;
    registrationNo: string;
    location: string;
    address: string;
    designation: string;
    alternatePhone: string;
    // Default POC
    pocName: string;
    pocPhone: string;
    pocEmail: string;
    pocDesignation: string;
    // Per-project POC
    projectContacts: POC[];
}

const Input = ({ label, icon: Icon, type = "text", value, onChange, placeholder, readOnly = false }: any) => (
    <div>
        <label className="block text-xs font-semibold text-[var(--color-slate)] mb-1.5 uppercase tracking-wider">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-slate)] pointer-events-none" />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full ${Icon ? "pl-9" : "pl-4"} pr-4 py-2.5 rounded-xl bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            />
        </div>
    </div>
);

const Section = ({ title, icon: Icon, children }: any) => (
    <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-gold)]/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-[var(--color-gold)]" />
            </div>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] text-sm">{title}</h2>
        </div>
        {children}
    </div>
);

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [password, setPassword] = useState("");
    const [profile, setProfile] = useState<ProfileData>({
        name: "", email: "", image: "", phoneNumber: "", companyName: "", registrationNo: "",
        location: "", address: "", designation: "", alternatePhone: "",
        pocName: "", pocPhone: "", pocEmail: "", pocDesignation: "",
        projectContacts: [],
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetch("/api/auth/profile")
            .then(r => r.json())
            .then(d => {
                if (d.user) setProfile({ ...profile, ...d.user, projectContacts: d.user.projectContacts || [] });
                setLoading(false);
            })
            .catch(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = (key: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setProfile(p => ({ ...p, [key]: e.target.value }));

    const addPOC = () => setProfile(p => ({
        ...p,
        projectContacts: [...p.projectContacts, { projectId: "", name: "", phone: "", email: "", designation: "" }],
    }));

    const updatePOC = (i: number, field: keyof POC, value: string) => setProfile(p => {
        const updated = [...p.projectContacts];
        updated[i] = { ...updated[i], [field]: value };
        return { ...p, projectContacts: updated };
    });

    const removePOC = (i: number) => setProfile(p => ({
        ...p,
        projectContacts: p.projectContacts.filter((_, idx) => idx !== i),
    }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const body: any = { ...profile };
            if (password && password.length >= 6) body.password = password;
            const res = await fetch("/api/auth/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            setMsg({ text: "Profile saved successfully!", ok: true });
            setPassword("");
            router.refresh();
        } catch (err: any) {
            setMsg({ text: err.message, ok: false });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMsg(null);

        try {
            // 1. Get Presigned URL
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    folder: "profiles"
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Upload failed with status ${res.status}`);
            }
            
            const data = await res.json();

            // 2. Upload file directly to S3/R2
            const uploadRes = await fetch(data.url, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file
            });

            if (!uploadRes.ok) throw new Error("Failed to upload image to storage");

            // 3. Update local state
            setProfile(p => ({ ...p, image: data.publicUrl }));
            setMsg({ text: "Photo uploaded! Don't forget to save your profile.", ok: true });
        } catch (err: any) {
            setMsg({ text: err.message, ok: false });
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => setProfile(p => ({ ...p, image: "" }));

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-[var(--color-gold)] animate-spin" />
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">My Profile</h1>
                <p className="text-[var(--color-slate)] text-sm mt-1">Manage your personal details, company info and project contacts.</p>
            </div>

            {/* Toast */}
            {msg && (
                <div className={`mb-5 p-4 rounded-xl text-sm border flex items-center gap-2 ${msg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {msg.ok ? "✅" : "❌"} {msg.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">

                {/* ── Profile Photo ── */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 glass rounded-2xl">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--color-navy-lighter)] border-2 border-[var(--color-gold)]/20 shadow-xl flex items-center justify-center">
                            {profile.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-[var(--color-slate)]" />
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 text-[var(--color-gold)] animate-spin" />
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--color-gold)] text-black cursor-pointer shadow-lg hover:scale-110 transition-transform active:scale-95">
                            <Camera className="h-4 w-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                        </label>
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <h3 className="text-lg font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">Profile Photo</h3>
                        <p className="text-sm text-[var(--color-slate)] max-w-sm">
                            Upload a professional photo to personalize your client dashboard and quote interactions.
                        </p>
                        {profile.image && (
                            <button
                                type="button"
                                onClick={removeImage}
                                className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors mt-2"
                            >
                                <X className="h-3 w-3" /> Remove Photo
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Personal Info ── */}
                <Section title="Personal Information" icon={User}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Full Name" icon={User} value={profile.name} onChange={set("name")} placeholder="Your full name" />
                        <Input label="Email Address" icon={Mail} value={profile.email} readOnly placeholder="your@email.com" />
                        <Input label="Phone Number" icon={Phone} value={profile.phoneNumber} onChange={set("phoneNumber")} placeholder="+974 XXXX XXXX" />
                        <Input label="Alternate Phone" icon={Phone} value={profile.alternatePhone} onChange={set("alternatePhone")} placeholder="+974 XXXX XXXX" />
                        <Input label="Designation / Role" icon={Briefcase} value={profile.designation} onChange={set("designation")} placeholder="e.g. Event Manager" />
                    </div>
                </Section>

                {/* ── Company Info ── */}
                <Section title="Company Details" icon={Building2}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Company Name" icon={Building2} value={profile.companyName} onChange={set("companyName")} placeholder="ACME Events LLC" />
                        <Input label="Registration No." icon={Hash} value={profile.registrationNo} onChange={set("registrationNo")} placeholder="CR / Trade License No." />
                        <Input label="Location / City" icon={MapPin} value={profile.location} onChange={set("location")} placeholder="Doha, Qatar" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--color-slate)] mb-1.5 uppercase tracking-wider">Full Address</label>
                        <textarea
                            value={profile.address}
                            onChange={set("address") as any}
                            rows={2}
                            placeholder="Building, Street, Area, City..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold)] focus:outline-none transition-colors resize-none"
                        />
                    </div>
                </Section>

                {/* ── Default Point of Contact ── */}
                <Section title="Default Point of Contact (POC)" icon={UserCheck}>
                    <p className="text-xs text-[var(--color-slate)] -mt-1">This is the default contact shown on quotes. You can override per-project below.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="POC Name" icon={User} value={profile.pocName} onChange={set("pocName")} placeholder="Contact full name" />
                        <Input label="POC Designation" icon={Briefcase} value={profile.pocDesignation} onChange={set("pocDesignation")} placeholder="e.g. Project Manager" />
                        <Input label="POC Phone" icon={Phone} value={profile.pocPhone} onChange={set("pocPhone")} placeholder="+974 XXXX XXXX" />
                        <Input label="POC Email" icon={Mail} value={profile.pocEmail} onChange={set("pocEmail")} placeholder="poc@company.com" />
                    </div>
                </Section>

                {/* ── Per-Project POC ── */}
                <Section title="Project-Specific Contacts" icon={UserCheck}>
                    <p className="text-xs text-[var(--color-slate)] -mt-1 mb-3">
                        Add different POC details for specific projects. Enter the Project ID (shown on each quote).
                    </p>
                    <div className="space-y-4">
                        {profile.projectContacts.map((poc, i) => (
                            <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/2 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wider">Project POC #{i + 1}</span>
                                    <button type="button" onClick={() => removePOC(i)} className="text-red-400 hover:text-red-300 transition-colors p-1">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Input label="Project ID" value={poc.projectId} onChange={(e: any) => updatePOC(i, "projectId", e.target.value)} placeholder="Paste project/quote ID" />
                                    <Input label="Contact Name" icon={User} value={poc.name} onChange={(e: any) => updatePOC(i, "name", e.target.value)} placeholder="Full name" />
                                    <Input label="Designation" icon={Briefcase} value={poc.designation} onChange={(e: any) => updatePOC(i, "designation", e.target.value)} placeholder="Role / title" />
                                    <Input label="Phone" icon={Phone} value={poc.phone} onChange={(e: any) => updatePOC(i, "phone", e.target.value)} placeholder="+974 XXXX XXXX" />
                                    <Input label="Email" icon={Mail} value={poc.email} onChange={(e: any) => updatePOC(i, "email", e.target.value)} placeholder="poc@example.com" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addPOC}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--color-gold)]/30 text-sm text-[var(--color-gold)] hover:bg-[var(--color-gold)]/5 transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Add Project-Specific POC
                    </button>
                </Section>

                {/* ── Security ── */}
                <Section title="Change Password" icon={User}>
                    <Input
                        label="New Password (leave blank to keep current)"
                        type="password"
                        value={password}
                        onChange={(e: any) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                    />
                </Section>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 btn-primary text-sm !px-8 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Profile</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
