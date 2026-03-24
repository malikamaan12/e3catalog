"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { useInView } from "react-intersection-observer";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Box, FileText, Truck, CheckCircle2 } from "lucide-react";
import Spline from "@splinetool/react-spline";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { getSetting } = useSiteSettings();
 
    // Mouse Tracking for 3D Interaction
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    // Move dynamic transforms out of the style object to follow MotionValue best practices
    const rotateY = useTransform(springX, (value: number) => value * 10);
    const rotateX = useTransform(springY, (value: number) => value * -10);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        mouseX.set((clientX / innerWidth) - 0.5);
        mouseY.set((clientY / innerHeight) - 0.5);
    };

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

            // 3D "Dive-In" Depth Zoom on the orb system
            if (containerRef.current) {
                gsap.to(".spline-container", {
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: "top top",
                        end: "bottom top",
                        scrub: 1.5,
                    },
                    scale: 2.5,
                    z: 800,
                    y: 100,
                    opacity: 0.1,
                    ease: "power2.inOut"
                });
            }
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
            onMouseMove={handleMouseMove}
            className="relative h-[120vh] w-full bg-[#0a0f1e] flex items-center justify-center overflow-hidden z-20"
        >
            {/* ── Premium 3D Spline Background ── */}
            <div className="absolute inset-0 z-0 spline-container pointer-events-none md:pointer-events-auto">
                <Spline 
                    scene="https://prod.spline.design/6Wq1Q7YGyWf8Zhp5/scene.splinecode" 
                    className="w-full h-full object-cover scale-110 md:scale-100"
                />
            </div>

            <div className="absolute inset-0 z-[1] pointer-events-none">
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
                <div className="max-w-5xl space-y-6">
                    {/* Eyebrow */}
                    <span className="hero-title text-gold text-[10px] md:text-xs font-black tracking-[0.5em] uppercase block">
                        Qatar&apos;s Premier Event Platform
                    </span>

                    {/* Two-line headline — short and punchy */}
                    <div className="space-y-0 overflow-hidden">
                        <h1 className="hero-title text-6xl md:text-[9rem] lg:text-[11rem] font-black text-white italic tracking-tighter leading-[0.85] drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] uppercase">
                            PREMIUM
                        </h1>
                        <h1 className="hero-title text-5xl md:text-[7rem] lg:text-[8.5rem] font-black italic tracking-tighter leading-[0.85] drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] uppercase gradient-text-gold">
                            EVENT RENTALS
                        </h1>
                    </div>

                    {/* Subtitle — clean, no glass box */}
                    <p className="hero-title text-white/50 text-sm md:text-lg font-medium tracking-tight max-w-xl mx-auto leading-relaxed">
                        {getSetting('homepage_hero_subtitle', 'Explore high-end equipment in interactive 3D. Check real-time availability. Generate instant, MOCI-compliant proposals.')}
                    </p>

                    {/* CTAs */}
                    <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-5 mt-10 pointer-events-auto">
                        <Link href="/catalog" className="w-full sm:w-auto px-10 py-4 rounded-full bg-gold text-navy font-black text-xs uppercase tracking-[0.25em] transition-all hover:scale-105 hover:shadow-[0_20px_50px_rgba(201,168,76,0.3)] active:scale-95 flex items-center justify-center gap-3">
                            Start Building Your Quote
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </Link>
                        <Link href="/how-it-works" className="w-full sm:w-auto px-10 py-4 rounded-full border border-white/15 text-white/80 font-black text-xs uppercase tracking-[0.25em] transition-all hover:bg-white/5 active:scale-95 flex items-center justify-center">
                            How It Works
                        </Link>
                    </div>

                    {/* Trust Badges */}
                    <div className="hero-cta flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-6 pointer-events-none">
                        <span className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                            🛡️ Civil Defence Compliant
                        </span>
                        <span className="w-px h-3 bg-white/10 hidden sm:block" />
                        <span className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                            ⚡ KAHRAMAA Standard
                        </span>
                        <span className="w-px h-3 bg-white/10 hidden sm:block" />
                        <span className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                            📜 MOCI Approved
                        </span>
                    </div>
                </div>
            </div>

            {/* Floating Asset Decor (High-fidelity touch) */}
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full -mr-64 -mb-64 pointer-events-none animate-pulse-gold" />
            <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full -ml-32 -mt-32 pointer-events-none" />

            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                <div className="w-px h-16 bg-gradient-to-b from-gold via-gold/50 to-transparent opacity-30" />
                <span className="text-[10px] tracking-[0.4em] text-gold uppercase font-black opacity-60">Explore Below</span>
            </div>
        </section>
    );
}
