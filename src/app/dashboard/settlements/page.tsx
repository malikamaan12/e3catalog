"use client";

import SettlementsDashboard from "@/components/dashboard/SettlementsDashboard";
import { Banknote, ShieldCheck } from "lucide-react";

export default function SettlementsPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                        <Banknote className="w-5 h-5 text-[var(--color-gold)]" />
                        <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] animate-pulse">Financial collections enabled</span>
                   </div>
                   <h1 className="text-4xl font-black text-[var(--color-warm-white)] tracking-tight">Commission Gateway</h1>
                   <p className="text-[var(--color-slate)] mt-1 font-medium italic opacity-80">
                    Audit and settle platform service fees directly with E3 Logistics.
                   </p>
                </div>
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verified Multi-Tenant Node</span>
                </div>
            </header>

            <SettlementsDashboard />
        </div>
    );
}
