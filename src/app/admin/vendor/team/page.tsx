"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Users, Plus, ShieldCheck, Mail, Phone, Lock, Hash, Loader2, Power, Save } from "lucide-react";

export default function VendorTeamPage() {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddCardOpen, setIsAddCardOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "warehouse_manager"
    });

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await fetch("/api/admin/vendor/team");
            const data = await res.json();
            if (res.ok) setTeam(data);
            else setMessage({ type: "error", text: data.error });
        } catch (e) {
            setMessage({ type: "error", text: "Failed to load team members" });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/vendor/team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setTeam([data, ...team]);
            setNewUser({ name: "", email: "", phoneNumber: "", password: "", role: "warehouse_manager" });
            setIsAddCardOpen(false);
            setMessage({ type: "success", text: "Team member added successfully!" });
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "blocked" : "active";

        try {
            const res = await fetch("/api/admin/vendor/team", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, status: newStatus })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setTeam(team.map(m => m.id === userId ? { ...m, status: newStatus } : m));
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        }
    };

    if (loading) {
        return <div className="p-8 text-[var(--color-slate)] animate-pulse">Loading team...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-[var(--color-gold)]" />
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)]">
                            Team Management
                        </h1>
                        <p className="text-[var(--color-slate)] text-sm mt-1">Add sales representatives and warehouse managers to your company.</p>
                    </div>
                </div>
                {!isAddCardOpen && (
                    <button
                        onClick={() => setIsAddCardOpen(true)}
                        className="flex items-center gap-2 bg-[var(--color-gold)] hover:bg-yellow-600 text-[var(--color-navy-dark)] font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-900/20"
                    >
                        <Plus className="w-4 h-4" /> Add Member
                    </button>
                )}
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-xl border flex justify-between items-center ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            {isAddCardOpen && (
                <div className="glass p-6 rounded-2xl border border-[var(--color-gold)]/30 mb-8 animate-fade-in shadow-[0_0_30px_rgba(201,168,76,0.1)]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-[var(--color-gold)] flex items-center gap-2">
                            <Plus className="w-5 h-5" /> New Team Member
                        </h2>
                        <button onClick={() => setIsAddCardOpen(false)} className="text-[var(--color-slate)] hover:text-white transition">Cancel</button>
                    </div>

                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Full Name *</label>
                            <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--color-gold)]" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Email Address *</label>
                            <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--color-gold)]" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Phone Number</label>
                            <input type="tel" value={newUser.phoneNumber} onChange={e => setNewUser({ ...newUser, phoneNumber: e.target.value })} className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--color-gold)]" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Initial Password *</label>
                            <input type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-[var(--color-navy)] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--color-gold)]" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-2">Account Role *</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${newUser.role === 'warehouse_manager' ? 'bg-[var(--color-navy-dark)] border-[var(--color-gold)] shadow-[0_0_15px_rgba(201,168,76,0.15)]' : 'bg-transparent border-white/10 hover:bg-white/5'}`}>
                                    <input type="radio" name="role" value="warehouse_manager" checked={newUser.role === 'warehouse_manager'} onChange={() => setNewUser({ ...newUser, role: "warehouse_manager" })} className="hidden" />
                                    <div className="w-4 h-4 rounded-full border border-[var(--color-gold)] flex items-center justify-center p-0.5">
                                        {newUser.role === 'warehouse_manager' && <div className="w-full h-full bg-[var(--color-gold)] rounded-full" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[var(--color-warm-white)] text-sm">Logistics / Warehouse</p>
                                        <p className="text-[10px] text-[var(--color-slate)] mt-0.5">Can process bookings, manage inventory buffer rules, and deliver equipment.</p>
                                    </div>
                                </label>
                                <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${newUser.role === 'sales_rep' ? 'bg-[var(--color-navy-dark)] border-[var(--color-gold)] shadow-[0_0_15px_rgba(201,168,76,0.15)]' : 'bg-transparent border-white/10 hover:bg-white/5'}`}>
                                    <input type="radio" name="role" value="sales_rep" checked={newUser.role === 'sales_rep'} onChange={() => setNewUser({ ...newUser, role: "sales_rep" })} className="hidden" />
                                    <div className="w-4 h-4 rounded-full border border-[var(--color-gold)] flex items-center justify-center p-0.5">
                                        {newUser.role === 'sales_rep' && <div className="w-full h-full bg-[var(--color-gold)] rounded-full" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[var(--color-warm-white)] text-sm">Sales Representative</p>
                                        <p className="text-[10px] text-[var(--color-slate)] mt-0.5">Can negotiate quotes, assign payment terms, and communicate with clients.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button type="submit" disabled={saving} className="bg-[var(--color-gold)] text-[var(--color-navy-dark)] font-bold px-8 py-3 rounded-xl hover:bg-yellow-600 disabled:opacity-50 transition-all flex items-center gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Account
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {team.map(member => (
                    <div key={member.id} className={`glass p-6 rounded-2xl border transition-all ${member.role === 'vendor' ? 'border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5' : 'border-white/10 hover:bg-white/5'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-[var(--color-navy)] w-12 h-12 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                                {member.role === 'vendor' ? <ShieldCheck className="w-6 h-6 text-[var(--color-gold)]" /> :
                                    member.role === 'sales_rep' ? <Hash className="w-6 h-6 text-purple-400" /> :
                                        <Users className="w-6 h-6 text-blue-400" />}
                            </div>
                            {member.role !== 'vendor' && (
                                <button
                                    onClick={() => handleStatusToggle(member.id, member.status)}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-all flex items-center gap-1 ${member.status === 'active' ? 'text-green-400 border-green-400/30 bg-green-400/10 hover:bg-green-400/20' : 'text-red-400 border-red-400/30 bg-red-400/10 hover:bg-red-400/20'}`}
                                >
                                    <Power className="w-3 h-3" />
                                    {member.status === 'active' ? 'Active' : 'Blocked'}
                                </button>
                            )}
                            {member.role === 'vendor' && (
                                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)] bg-[var(--color-gold)]/10 rounded-full border border-[var(--color-gold)]/20">Root Owner</span>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1">{member.name}</h3>
                        <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-4">
                            {member.role.replace('_', ' ')}
                        </p>
                        <div className="space-y-2 text-sm text-[var(--color-slate)]">
                            <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {member.email}</p>
                            {member.phoneNumber && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {member.phoneNumber}</p>}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/30 flex justify-between">
                            <span>Joined: {new Date(member.createdAt).toLocaleDateString()}</span>
                            {member.lastActive && <span>Active: {new Date(member.lastActive).toLocaleDateString()}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {team.length === 0 && (
                <div className="text-center p-12 glass rounded-2xl border border-white/10">
                    <p className="text-[var(--color-slate)]">No team members found.</p>
                </div>
            )}
        </div>
    );
}
