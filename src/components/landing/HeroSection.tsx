"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Box, FileText, Truck, CheckCircle2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { getSetting } = useSiteSettings();

    useEffect(() => {
        if (!containerRef.current || !contentRef.current) return;

        // Entrance animation
        const ctx = gsap.context(() => {
            gsap.from(".hero-title", {
                y: 100,
                opacity: 0,
                duration: 1.5,
                ease: "expo.out",
                stagger: 0.2
            });
            gsap.from(".hero-cta", {
                y: 40,
                opacity: 0,
                duration: 1.2,
                delay: 0.8,
                ease: "power4.out"
            });
        }, containerRef);

        // Pull-back and fade effect on scroll
        gsap.to(contentRef.current, {
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top top",
                end: "bottom top",
                scrub: true,
            },
            scale: 0.9,
            opacity: 0,
            y: -50,
            ease: "none",
        });

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative h-screen w-full bg-[#0a0f1e] flex items-center justify-center overflow-hidden z-20"
        >
            {/* High-Performance Background System */}
            <div className="absolute inset-0 z-0">
                {/* Deep Gradient Base */}
                <div className="absolute inset-0 bg-gradient-to-br from-navy via-[#0d152a] to-navy" />

                {/* Static Ambient Glows (Lower cost) */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(201,168,76,0.05),transparent_50%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.03),transparent_50%)]" />

                {/* Cyber Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(#c9a84c 1px, transparent 1px), linear-gradient(90deg, #c9a84c 1px, transparent 1px)',
                        backgroundSize: '80px 80px'
                    }}
                />

                {/* Radial Mask for the Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0f1e_80%)]" />
            </div>

            {/* Typography Overlay */}
            <div ref={contentRef} className="relative z-10 flex flex-col items-center justify-center text-center px-6">
                <div className="max-w-5xl space-y-8">
                    <div className="space-y-4 overflow-hidden">
                        <span className="hero-title text-gold text-xs font-black tracking-[0.6em] uppercase mb-4 block">
                            BUILD YOUR NEXT
                        </span>
                        <h1 className="hero-title text-5xl md:text-[8rem] font-black text-white italic tracking-tighter leading-[0.8] drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] uppercase">
                            {getSetting('homepage_hero_title', 'BUILD BETTER EVENTS')}
                        </h1>
                    </div>
                    <div className="relative mt-8 hero-title overflow-hidden">
                        <p className="text-warm-gray/80 text-base md:text-xl font-medium tracking-tight max-w-2xl mx-auto glass-light p-6 md:p-8 rounded-[2rem] border border-white/10 backdrop-blur-md">
                            {getSetting('homepage_hero_subtitle', 'Enterprise staging, specialized hardware, and zero-gravity logistics for the world\'s most demanding events.')}
                        </p>
                    </div>

                    <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 pointer-events-auto">
                        <Link href="/catalog" className="w-full sm:w-auto btn-primary text-lg px-10 py-5 rounded-2xl group relative overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">
                                Explorer Catalog
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </span>
                        </Link>
                        <Link href="/how-it-works" className="w-full sm:w-auto btn-secondary text-lg px-10 py-5 rounded-2xl group border-white/10 hover:border-gold/30 hover:bg-gold/5">
                            How it Works
                        </Link>
                    </div>
                </div>
            </div>

            {/* Floating Asset Decor (High-fidelity touch) */}
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full -mr-64 -mb-64 pointer-events-none animate-pulse-gold" />
            <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full -ml-32 -mt-32 pointer-events-none" />

            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                <div className="w-px h-16 bg-gradient-to-b from-gold via-gold/50 to-transparent opacity-30" />
                <span className="text-[10px] tracking-[0.4em] text-gold uppercase font-black opacity-60">Initiate Scroll</span>
            </div>
        </section>
    );
}
