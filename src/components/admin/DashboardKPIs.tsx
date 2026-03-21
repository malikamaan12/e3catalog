"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
    PackageOpen, 
    CalendarRange, 
    TrendingUp, 
    AlertCircle, 
    ShieldAlert, 
    Warehouse 
} from "lucide-react";
import gsap from "gsap";

interface Stat {
    label: string;
    value: string;
    icon: any;
    change: string;
    color: string;
    trend?: "up" | "down" | "neutral";
    isAlert?: boolean;
}

interface DashboardKPIsProps {
    stats: Stat[];
}

export default function DashboardKPIs({ stats }: DashboardKPIsProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10"
        >
            {stats.map((stat, i) => (
                <KPICard key={stat.label} stat={stat} index={i} variants={item} />
            ))}
        </motion.div>
    );
}

function KPICard({ stat, index, variants }: { stat: Stat, index: number, variants: any }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);

    const onMouseEnter = () => {
        gsap.to(cardRef.current, {
            y: -5,
            duration: 0.3,
            ease: "power2.out"
        });
        gsap.to(glowRef.current, {
            opacity: 1,
            scale: 1.2,
            duration: 0.5
        });
    };

    const onMouseLeave = () => {
        gsap.to(cardRef.current, {
            y: 0,
            duration: 0.3,
            ease: "power2.inOut"
        });
        gsap.to(glowRef.current, {
            opacity: 0,
            scale: 1,
            duration: 0.5
        });
    };

    return (
        <motion.div
            variants={variants}
            ref={cardRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`relative glass rounded-2xl p-5 border transition-all overflow-hidden cursor-default group h-full flex flex-col justify-between ${
                stat.isAlert 
                    ? "border-red-500/30 bg-red-500/[0.03] hover:border-red-500/50" 
                    : "border-white/10 hover:border-[var(--color-gold)]/30"
            }`}
        >
            {/* Soft Glow Effect */}
            <div 
                ref={glowRef}
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-0 transition-opacity pointer-events-none ${
                    stat.isAlert ? "bg-red-500/20" : "bg-[var(--color-gold)]/15"
                }`}
            />

            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl border ${
                    stat.isAlert 
                        ? "bg-red-500/10 border-red-500/20 text-red-400" 
                        : "bg-white/5 border-white/10 text-[var(--color-slate)] group-hover:text-[var(--color-gold)]"
                } transition-colors`}>
                    <stat.icon className="w-5 h-5" />
                </div>
                {stat.trend && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        stat.trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                        {stat.trend === "up" ? "↑" : "↓"}
                    </span>
                )}
            </div>

            <div>
                <h3 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-1">
                    {stat.value}
                </h3>
                <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-wider group-hover:text-[var(--color-warm-white)] transition-colors">
                    {stat.label}
                </p>
                <p className={`text-[10px] mt-2 font-medium ${
                    stat.isAlert ? "text-red-400/80" : "text-[var(--color-slate)]/60"
                }`}>
                    {stat.change}
                </p>
            </div>

            {/* Micro-interaction line */}
            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r transition-all duration-500 ${
                stat.isAlert 
                    ? "from-red-500 to-transparent w-full" 
                    : "from-[var(--color-gold)] to-transparent w-0 group-hover:w-full"
            }`} />
        </motion.div>
    );
}
