"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function FinalCTA() {
    return (
        <section className="relative h-screen bg-navy flex flex-col items-center justify-center overflow-hidden z-20">

            {/* High-Performance Background System */}
            <div className="absolute inset-0 z-0">
                {/* Deep Gradient Base */}
                <div className="absolute inset-0 bg-gradient-to-tr from-navy via-[#0a1125] to-navy" />

                {/* Static Gradient Overlay (Lower cost) */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(201,168,76,0.05),transparent_70%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(201,168,76,0.02),transparent_70%)]" />

                {/* Cyber Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(#c9a84c 1px, transparent 1px), linear-gradient(90deg, #c9a84c 1px, transparent 1px)',
                        backgroundSize: '100px 100px'
                    }}
                />
            </div>

            {/* Foreground Content */}
            <div className="relative z-10 text-center px-6 max-w-4xl space-y-12">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-4"
                >
                    <span className="inline-flex items-center gap-2 text-gold text-xs font-black tracking-[0.5em] uppercase">
                        <Sparkles className="w-4 h-4" /> Ready to Scale?
                    </span>
                    <h2 className="text-6xl md:text-[10rem] font-black text-white italic tracking-tighter leading-[0.8]">
                        START <br /> <span className="gradient-text-gold">BUILDING</span>
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, type: "spring" }}
                >
                    <Link
                        href="/catalog"
                        className="group relative inline-flex h-24 items-center justify-center rounded-3xl bg-gold px-12 text-2xl font-black text-navy transition-all hover:scale-105 hover:bg-gold-400 active:scale-95 shadow-[0_0_50px_rgba(201,168,76,0.3)] hover:shadow-[0_0_80px_rgba(201,168,76,0.5)]"
                    >
                        BROWSE CATALOG <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
                    </Link>
                    <p className="text-navy-400 mt-6 text-sm font-bold tracking-widest uppercase">
                        Instant Quotes • Global Logistics • Certified Crew
                    </p>
                </motion.div>
            </div>

            {/* Ambient Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent" />
        </section>
    );
}
