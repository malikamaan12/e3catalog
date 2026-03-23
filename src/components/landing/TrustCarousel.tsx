"use client";

import { motion } from "framer-motion";
import { Eye, CalendarCheck, FileSpreadsheet, ShieldCheck } from "lucide-react";

const ADVANTAGES = [
    {
        icon: Eye,
        title: "Immersive 3D Exploration",
        desc: "Stop guessing with static images. View our premium inventory via on-demand interactive WebGL and video demonstrations. Know exactly what you are renting before the trucks arrive.",
        color: "text-blue-400",
    },
    {
        icon: CalendarCheck,
        title: "Smart Availability Engine",
        desc: "Our dynamic calendar tracks overlaps, cleaning buffer times, and logistics. If it shows as available, it is guaranteed to be yours.",
        color: "text-emerald-400",
    },
    {
        icon: FileSpreadsheet,
        title: "Enterprise-Grade Proposals",
        desc: "Add items to your cart, specify your venue requirements, and instantly download a professional, itemized PDF quotation complete with 3D share links and transparent logistics costs.",
        color: "text-gold",
    },
    {
        icon: ShieldCheck,
        title: "Total Regulatory Compliance",
        desc: "From TUV-certified safety inspections to Civil Defence-approved fireproof fabrics, our entire fleet meets Qatar's strictest legal requirements.",
        color: "text-red-400",
    },
];

export default function TrustCarousel() {
    return (
        <section className="py-24 md:py-32 bg-navy border-y border-white/5 relative overflow-hidden z-20">
            <div className="max-w-7xl mx-auto px-6 mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-3">
                        <span className="text-gold text-xs font-black tracking-[0.4em] uppercase">The E3 Digital Advantage</span>
                        <h2 className="text-4xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-[0.8]">
                            WHY LEADING <br /> <span className="gradient-text-gold">PLANNERS CHOOSE E3</span>
                        </h2>
                    </div>
                    <p className="text-slate max-w-sm text-base md:text-lg font-medium leading-tight opacity-70">
                        We don&apos;t just rent equipment; we engineer flawless events.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ADVANTAGES.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="glass-dark p-8 md:p-10 rounded-[2rem] border border-white/5 flex flex-col gap-6 group hover:border-gold/30 transition-all duration-500"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-navy border border-white/10 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                <div className="space-y-3">
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
