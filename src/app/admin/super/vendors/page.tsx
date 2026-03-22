import VendorCommandCenter from "@/components/admin/VendorCommandCenter";
import { ShieldCheck, Zap } from "lucide-react";

export default function SuperAdminVendorsPage() {
    return (
        <div className="min-h-screen bg-[#0A0F1C] pt-28 pb-20 px-8">
            <div className="max-w-[1800px] mx-auto">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                    <div>
                        <div className="flex items-center gap-3 mb-4 animate-fade-in">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--color-gold)]/10 flex items-center justify-center border border-[var(--color-gold)]/20">
                                <ShieldCheck className="w-5 h-5 text-[var(--color-gold)]" />
                            </div>
                            <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.3em]">Super Admin Protocol • Lvl 4</span>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-tight mb-2">Vendor Command Center</h1>
                        <p className="text-lg text-[var(--color-slate)] font-medium max-w-2xl">
                            Consolidated marketplace intelligence and operational control. Approve KYC, manage fiscal agreements, and audit platform settlements.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-3xl backdrop-blur-xl">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                           <Zap className="w-3.5 h-3.5 text-yellow-500" /> Real-time Nodes Synchronized
                        </span>
                    </div>
                </header>

                <VendorCommandCenter />
            </div>
        </div>
    );
}
