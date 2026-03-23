"use client";

import { motion } from "framer-motion";
import { FileCheck, HardHat, Database } from "lucide-react";

const COMPLIANCE_ITEMS = [
    {
        icon: FileCheck,
        title: "MOCI Approved Contracts",
        desc: "We utilize uniform, government-approved contracts to guarantee your rights, pricing, and exact delivery specifications. Under Law No. (8) of 2008 on Consumer Protection, all payment procedures and cancellations follow strict guidelines.",
        color: "text-gold",
    },
    {
        icon: HardHat,
        title: "Certified Operations",
        desc: "Every piece of heavy machinery, scaffolding, and complex structure is erected by trained professionals and accompanied by valid third-party inspection certificates as required by Qatar's Civil Defence.",
        color: "text-emerald-400",
    },
    {
        icon: Database,
        title: "Digital Audit Trails",
        desc: "Access your safety certificates, installation guides, and service delivery reports directly from your private Client Dashboard. Full traceability for government and enterprise clients.",
        color: "text-blue-400",
    },
];

export default function ComplianceGuarantee() {
    return (
        <section className="py-24 md:py-32 bg-navy relative overflow-hidden z-20">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(201,168,76,0.03),transparent_60%)] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20 space-y-4">
                    <span className="text-gold text-xs font-black tracking-[0.4em] uppercase">The Compliance Guarantee</span>
                    <h2 className="text-4xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-[0.8]">
                        SAFETY IS OUR <br /> <span className="gradient-text-gold">FOUNDATION</span>
                    </h2>
                    <p className="text-slate max-w-2xl mx-auto text-base md:text-lg font-medium leading-relaxed opacity-70 mt-6">
                        We protect your event, your guests, and your reputation. E3 Rentals strictly operates under the legal frameworks of the State of Qatar.
                    </p>
                </div>

                {/* Compliance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {COMPLIANCE_ITEMS.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: i * 0.15 }}
                                viewport={{ once: true }}
                                className="glass-dark p-10 rounded-[2rem] border border-white/5 flex flex-col gap-6 group hover:border-gold/20 transition-all duration-500 relative overflow-hidden"
                            >
                                {/* Ambient Glow */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.04),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <div className={`relative z-10 w-16 h-16 rounded-2xl bg-navy border border-white/10 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-8 h-8" />
                                </div>
                                <div className="relative z-10 space-y-3">
                                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">{item.title}</h3>
                                    <p className="text-sm md:text-base text-slate leading-relaxed font-medium opacity-80">{item.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
