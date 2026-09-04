"use client";

import React, { useState, useEffect } from "react";
import { Layers, PackageCheck, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface KitItem {
    id: string;
    quantity: number;
    isOptional: boolean;
    childProduct: {
        id: string;
        name: string;
        slug?: string;
        thumbnailUrl?: string;
        pricePerDay: number;
        brand?: string;
        model?: string;
    };
}

interface KitComponentsListProps {
    productId: string;
    initialItems?: KitItem[];
}

export function KitComponentsList({ productId, initialItems }: KitComponentsListProps) {
    const [items, setItems] = useState<KitItem[]>(initialItems || []);
    const [loading, setLoading] = useState(!initialItems);

    useEffect(() => {
        if (initialItems) return;
        fetch(`/api/admin/products/${productId}/kit-items`)
            .then(r => r.json())
            .then(data => {
                if (data.kitItems) setItems(data.kitItems);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [productId, initialItems]);

    if (loading) {
        return <div className="py-6 text-xs text-[var(--color-slate)] animate-pulse">Loading kit components...</div>;
    }

    if (items.length === 0) {
        return null; // Not a kit or no components
    }

    const totalComponentValue = items.reduce((sum, item) => sum + ((item.childProduct?.pricePerDay || 0) * item.quantity), 0);

    return (
        <section className="glass rounded-[2rem] p-8 border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-[var(--color-warm-white)] uppercase tracking-wide">
                            Included in this Production Kit
                        </h3>
                        <p className="text-[10px] text-[var(--color-gold)] uppercase tracking-widest font-black">
                            {items.length} Component Types · Verified Complete Setup
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Unified Child Stock Reservation
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <div 
                        key={item.id}
                        className="glass p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/20 transition-all flex items-center gap-4 group"
                    >
                        <div className="w-14 h-14 rounded-xl overflow-hidden glass border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                            {item.childProduct?.thumbnailUrl ? (
                                <img 
                                    src={item.childProduct.thumbnailUrl} 
                                    alt={item.childProduct.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                            ) : (
                                <PackageCheck className="w-6 h-6 text-white/20" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-black text-[10px]">
                                    {item.quantity}×
                                </span>
                                <h4 className="text-xs font-bold text-[var(--color-warm-white)] truncate group-hover:text-[var(--color-gold)] transition-colors">
                                    {item.childProduct?.name}
                                </h4>
                            </div>
                            <p className="text-[10px] text-[var(--color-slate)] mt-0.5 truncate">
                                {item.childProduct?.brand ? `${item.childProduct.brand} ` : ""}{item.childProduct?.model || ""}
                            </p>
                            <p className="text-[9px] text-[var(--color-slate)] opacity-60 mt-1">
                                Individual: QAR {item.childProduct?.pricePerDay?.toLocaleString()}/day
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[var(--color-slate)]">
                <span className="text-[10px] uppercase tracking-widest font-black">Bundle Savings Indicator</span>
                <span className="text-emerald-400 font-bold">
                    Individual Components Total: QAR {totalComponentValue.toLocaleString()}/day
                </span>
            </div>
        </section>
    );
}
