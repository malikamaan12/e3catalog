"use client";

import React, { useState } from "react";
import SettlementsDashboard from "@/components/dashboard/SettlementsDashboard";
import { VendorSettlementStatementsManager } from "@/components/finance/VendorSettlementStatementsManager";
import { Banknote, ShieldCheck, FileCheck, Landmark } from "lucide-react";

export default function SettlementsPage() {
    const [viewMode, setViewMode] = useState<"statements" | "receivables">("statements");

    return (
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Banknote className="w-5 h-5 text-[var(--color-gold)]" />
                        <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.2em] animate-pulse">
                            Automated Financial Settlement Engine Active
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-[var(--color-warm-white)] tracking-tight font-[family-name:var(--font-heading)]">
                        Settlements & Remittance Hub
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1 font-medium italic opacity-80">
                        Generate official self-billing statements, reconcile commissions, disburse bank wire remittances, and audit supplier balances.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">QCB Compliant Settlement Node</span>
                </div>
            </header>

            {/* Sub-Navigation Switcher */}
            <div className="flex items-center gap-3 mb-8 bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setViewMode("statements")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        viewMode === "statements"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-gold/20"
                            : "text-[var(--color-slate)] hover:text-white"
                    }`}
                >
                    <FileCheck className="w-4 h-4" />
                    Vendor Settlement Statements
                </button>
                <button
                    onClick={() => setViewMode("receivables")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        viewMode === "receivables"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-gold/20"
                            : "text-[var(--color-slate)] hover:text-white"
                    }`}
                >
                    <Landmark className="w-4 h-4" />
                    Marketplace Commission Ledger
                </button>
            </div>

            {viewMode === "statements" ? (
                <VendorSettlementStatementsManager />
            ) : (
                <SettlementsDashboard />
            )}
        </div>
    );
}
