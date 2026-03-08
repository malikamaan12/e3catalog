"use client"
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Check, X, CreditCard, FileText, Landmark } from 'lucide-react';

interface BillingSetting {
    id: string;
    type: 'term_condition' | 'payment_term' | 'payment_method';
    label: string;
    content: string;
    isDefault: boolean;
    isActive: boolean;
}

export default function BillingSettingsPage() {
    const [settings, setSettings] = useState<BillingSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'term_condition' | 'payment_term' | 'payment_method'>('term_condition');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<BillingSetting>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings/billing');
            const data = await res.json();
            setSettings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editForm.label || !editForm.content) return alert("Label and Content are required.");
        const isNew = !editForm.id;
        try {
            const method = isNew ? 'POST' : 'PATCH';
            const url = isNew ? '/api/admin/settings/billing' : `/api/admin/settings/billing/${editForm.id}`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                await fetchSettings();
                setIsEditing(null);
                setEditForm({});
            }
        } catch (error) {
            console.error("Failed to save setting", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this setting?")) return;
        try {
            const res = await fetch(`/api/admin/settings/billing/${id}`, { method: 'DELETE' });
            if (res.ok) await fetchSettings();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleAddNew = () => {
        setIsEditing('new');
        setEditForm({
            type: activeTab,
            label: '',
            content: '',
            isDefault: false,
            isActive: true
        });
    };

    const filteredSettings = settings.filter(s => s.type === activeTab);

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] flex items-center gap-3">
                        <Settings className="text-[var(--color-gold)]" /> Billing & Quote Settings
                    </h1>
                    <p className="text-[var(--color-slate)] mt-2">Manage standard terms, payment milestones, and payment methods for dynamic quoting.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('term_condition')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${activeTab === 'term_condition' ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20' : 'bg-white/5 text-[var(--color-slate)] hover:bg-white/10'}`}
                >
                    <FileText size={18} /> Standard Contract T&Cs
                </button>
                <button
                    onClick={() => setActiveTab('payment_term')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${activeTab === 'payment_term' ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20' : 'bg-white/5 text-[var(--color-slate)] hover:bg-white/10'}`}
                >
                    <Landmark size={18} /> Payment Milestones
                </button>
                <button
                    onClick={() => setActiveTab('payment_method')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${activeTab === 'payment_method' ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20' : 'bg-white/5 text-[var(--color-slate)] hover:bg-white/10'}`}
                >
                    <CreditCard size={18} /> Payment Methods
                </button>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-semibold text-[var(--color-warm-white)]">
                        {activeTab === 'term_condition' && "Contract Rules & Clauses"}
                        {activeTab === 'payment_term' && "Deposit & Payment Milestones"}
                        {activeTab === 'payment_method' && "Available Payment Options"}
                    </h2>
                    <button onClick={handleAddNew} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                        <Plus size={16} /> Add New Template
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-[var(--color-slate)] animate-pulse">Loading settings...</div>
                ) : (
                    <div className="space-y-4">
                        {isEditing === 'new' && (
                            <div className="bg-[var(--color-navy-dark)] border-2 border-[var(--color-gold)]/50 rounded-xl p-6 relative">
                                <h3 className="text-sm font-bold text-[var(--color-gold)] mb-4 uppercase tracking-wider">Create New Template</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-[var(--color-slate)] uppercase tracking-wider mb-2">Internal Label (e.g. QNB Bank Details)</label>
                                        <input
                                            type="text"
                                            value={editForm.label || ''}
                                            onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none"
                                            placeholder="Enter descriptive label..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--color-slate)] uppercase tracking-wider mb-2">Quote Content (Shown to Client)</label>
                                        <textarea
                                            value={editForm.content || ''}
                                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                            rows={4}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none resize-none"
                                            placeholder="Enter the exactly worded text..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="new_isDefault"
                                            checked={editForm.isDefault || false}
                                            onChange={e => setEditForm({ ...editForm, isDefault: e.target.checked })}
                                            className="w-4 h-4 rounded bg-black/40 border-white/20 text-[var(--color-gold)] focus:ring-[var(--color-gold)] cursor-pointer"
                                        />
                                        <label htmlFor="new_isDefault" className="text-sm text-[var(--color-warm-white)] cursor-pointer select-none">Auto-select this option for new quotes by default.</label>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                        <button onClick={() => { setIsEditing(null); setEditForm({}); }} className="px-4 py-2 rounded-lg text-sm text-[var(--color-slate)] hover:bg-white/5 transition-colors">Cancel</button>
                                        <button onClick={handleSave} className="bg-[var(--color-gold)] hover:bg-[#d4af37] text-[var(--color-navy)] font-bold px-5 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-[var(--color-gold)]/20 flex items-center gap-2">
                                            <Check size={16} /> Save Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {filteredSettings.length === 0 && isEditing !== 'new' && (
                            <div className="text-center py-12 text-[var(--color-slate)] bg-white/5 rounded-xl border border-white/5">
                                No templates found for this category. Click 'Add New Template' to create one.
                            </div>
                        )}

                        {filteredSettings.map(setting => isEditing === setting.id ? (
                            <div key={setting.id} className="bg-[var(--color-navy-dark)] border border-[var(--color-gold)]/30 rounded-xl p-6 relative">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-[var(--color-slate)] uppercase tracking-wider mb-2">Internal Label</label>
                                        <input
                                            type="text"
                                            value={editForm.label || ''}
                                            onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--color-slate)] uppercase tracking-wider mb-2">Quote Content</label>
                                        <textarea
                                            value={editForm.content || ''}
                                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                            rows={3}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[var(--color-warm-white)] focus:border-[var(--color-gold)] outline-none resize-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`edit_def_${setting.id}`}
                                            checked={editForm.isDefault || false}
                                            onChange={e => setEditForm({ ...editForm, isDefault: e.target.checked })}
                                            className="w-4 h-4 rounded bg-black/40 border-white/20 text-[var(--color-gold)] focus:ring-[var(--color-gold)] cursor-pointer"
                                        />
                                        <label htmlFor={`edit_def_${setting.id}`} className="text-sm text-[var(--color-warm-white)] cursor-pointer select-none">Auto-select by default</label>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                        <button onClick={() => { setIsEditing(null); setEditForm({}); }} className="px-4 py-2 flex items-center gap-2 rounded-lg text-sm text-[var(--color-slate)] hover:bg-white/5 transition-colors"><X size={16} /> Cancel</button>
                                        <button onClick={handleSave} className="bg-[var(--color-gold)] hover:bg-[#d4af37] text-[var(--color-navy)] font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                                            <Check size={16} /> Update Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div key={setting.id} className="bg-white/5 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-5 group flex flex-col md:flex-row md:items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-semibold text-[var(--color-warm-white)]">{setting.label}</h4>
                                        {setting.isDefault && (
                                            <span className="bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[var(--color-gold)]/20 font-bold">Default Option</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--color-slate)] whitespace-pre-wrap leading-relaxed">{setting.content}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-end md:self-center">
                                    <button
                                        onClick={() => { setIsEditing(setting.id); setEditForm(setting); }}
                                        className="p-2 text-[var(--color-slate)] hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                                        title="Edit Template"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(setting.id)}
                                        className="p-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
