"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { 
    Layers, 
    Clock, 
    MailOpen, 
    CheckCircle2,
    Package
} from "lucide-react";
import gsap from "gsap";

interface Stat {
    label: string;
    value: string | number;
    icon: any;
    sub: string;
    urgent?: boolean;
}

interface ClientKPIsProps {
    stats: Stat[];
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export default function ClientKPIs({ stats }: ClientKPIsProps) {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
            {stats.map((stat, i) => (
                <KPICard key={stat.label} stat={stat} index={i} />
            ))}
        </motion.div>
    );
}

function KPICard({ stat, index }: { stat: Stat, index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const Icon = stat.icon;

    const onMouseEnter = () => {
        gsap.to(cardRef.current, { y: -5, duration: 0.3, ease: "power2.out" });
        gsap.to(glowRef.current, { opacity: 1, scale: 1.2, duration: 0.5 });
    };

    const onMouseLeave = () => {
        gsap.to(cardRef.current, { y: 0, duration: 0.3, ease: "power2.inOut" });
        gsap.to(glowRef.current, { opacity: 0, scale: 1, duration: 0.5 });
    };

    return (
        <motion.div
            variants={item}
            ref={cardRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`relative glass rounded-2xl p-5 border transition-all overflow-hidden cursor-default group h-full flex flex-col justify-between ${
                stat.urgent 
                    ? "border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/50" 
                    : "border-white/10 hover:border-[var(--color-gold)]/30"
            }`}
        >
            <div 
                ref={glowRef}
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-0 transition-opacity pointer-events-none ${
                    stat.urgent ? "bg-amber-500/20" : "bg-[var(--color-gold)]/15"
                }`}
            />

            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl border ${
                    stat.urgent 
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                        : "bg-white/5 border-white/10 text-[var(--color-slate)] group-hover:text-[var(--color-gold)]"
                } transition-colors`}>
                    <Icon className="w-5 h-5" />
                </div>
                {stat.urgent && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                )}
            </div>

            <div>
                <h3 className="text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-1">
                    {stat.value}
                </h3>
                <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider group-hover:text-[var(--color-warm-white)] transition-colors">
                    {stat.label}
                </p>
                <p className={`text-[10px] mt-2 font-medium ${
                    stat.urgent ? "text-amber-400/80" : "text-[var(--color-slate)]/60"
                }`}>
                    {stat.sub}
                </p>
            </div>

            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r transition-all duration-500 ${
                stat.urgent 
                    ? "from-amber-500 to-transparent w-full" 
                    : "from-[var(--color-gold)] to-transparent w-0 group-hover:w-full"
            }`} />
        </motion.div>
    );
}
