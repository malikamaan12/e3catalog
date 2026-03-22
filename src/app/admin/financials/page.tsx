"use client";

import React from "react";
import { VendorSettlements } from "@/components/admin/VendorSettlements";
import { Banknote } from "lucide-react";

export default function VendorFinancialsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            <header className="pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-[var(--color-gold)] mb-1">
                    <Banknote className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Fiscal Control Center</span>
                </div>
                <h1 className="text-4xl font-black font-[family-name:var(--font-heading)] gradient-text-gold">
                    My Financials
                </h1>
                <p className="text-[var(--color-slate)] mt-2 font-medium">
                    Manage project-level platform fees and account settlements.
                </p>
            </header>

            <VendorSettlements />
        </div>
    );
}
