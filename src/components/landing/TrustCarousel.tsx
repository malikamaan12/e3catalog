"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Award, Zap, Building2, CheckCircle } from "lucide-react";

const TRUST_ITEMS = [
    {
        icon: ShieldCheck,
        title: "TUV Certified",
        desc: "Lifting & rigging standards compliance (EN 13814).",
        color: "text-red-500",
    },
    {
        icon: Award,
        title: "ISO 9001",
        desc: "Global quality management and safety protocols.",
        color: "text-blue-400",
    },
    {
        icon: Zap,
        title: "IP65 Rated",
        desc: "Weather-proof guarantee for outdoor desert environments.",
        color: "text-yellow-500",
    },
    {
        icon: Building2,
        title: "QNCC Approved",
        desc: "Preferred vendor for Qatar's premier convention center.",
        color: "text-gold",
    },
    {
        icon: CheckCircle,
        title: "PDPL Compliant",
        desc: "Secure data handling and privacy for government projects.",
        color: "text-emerald-500",
    }
];

export default function TrustCarousel() {
    return (
        <section className="py-24 bg-navy border-y border-white/5 relative overflow-hidden z-20">
            <div className="max-w-7xl mx-auto px-6 mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-3">
                        <span className="text-gold text-xs font-black tracking-[0.4em] uppercase">Enterprise Assurance</span>
                        <h2 className="text-4xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-[0.8]">
                            SAFETY & <br /> <span className="gradient-text-gold">COMPLIANCE</span>
                        </h2>
                    </div>
                    <p className="text-slate max-w-sm text-base md:text-lg font-medium leading-tight opacity-70">
                        Our equipment and operators meet the most stringent safety requirements in the MENA region.
                    </p>
                </div>
            </div>

            {/* Swipeable Carousel for Mobile, Grid for Desktop */}
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-6 overflow-x-auto pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory">
                    {TRUST_ITEMS.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="min-w-[280px] md:min-w-0 snap-center glass-dark p-8 rounded-[2rem] border border-white/5 flex flex-col gap-6 group hover:border-gold/30 transition-all duration-500"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-navy border border-white/10 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-slate leading-relaxed font-medium opacity-80">{item.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Scroll Indicator */}
            <div className="flex md:hidden justify-center items-center gap-2 mt-4 px-6">
                {TRUST_ITEMS.map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-white/20" />
                ))}
            </div>
        </section>
    );
}
