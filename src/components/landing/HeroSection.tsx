"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { getSetting } = useSiteSettings();

    useEffect(() => {
        if (!containerRef.current || !contentRef.current) return;

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
            <div ref={contentRef} className="relative z-10 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                <div className="max-w-5xl space-y-8">
                    <div className="space-y-4">
                        <span className="text-gold text-xs font-black tracking-[0.6em] uppercase mb-4 block animate-bounce">
                            BUILD YOUR NEXT
                        </span>
                        <h1 className="text-6xl md:text-[8rem] font-black text-white italic tracking-tighter leading-[0.8] drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] uppercase">
                            {getSetting('homepage_hero_title', 'BUILD BETTER EVENTS')}
                        </h1>
                    </div>
                    <div className="relative mt-12">
                        <p className="text-navy-200 text-lg md:text-2xl font-bold tracking-tight max-w-2xl mx-auto bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                            {getSetting('homepage_hero_subtitle', 'Enterprise staging, specialized hardware, and zero-gravity logistics for the world\'s most demanding events.')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                <div className="w-px h-16 bg-gradient-to-b from-gold via-gold/50 to-transparent opacity-30" />
                <span className="text-[10px] tracking-[0.4em] text-gold uppercase font-black opacity-60">Initiate Scroll</span>
            </div>
        </section>
    );
}
