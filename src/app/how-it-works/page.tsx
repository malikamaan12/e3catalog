"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import gsap from "gsap";

export default function HowItWorks() {
    useEffect(() => {
        gsap.from(".fade-in", {
            y: 30,
            opacity: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: "power3.out"
        });
    }, []);

    return (
        <div className="min-h-screen bg-navy text-white flex flex-col pt-28">
            <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="max-w-3xl space-y-12">
                    <div className="space-y-4">
                        <span className="fade-in block text-gold text-xs font-black uppercase tracking-[0.5em]">System Architecture</span>
                        <h1 className="fade-in text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                            HOW IT <span className="text-gold">WORKS</span>
                        </h1>
                    </div>
                    
                    <p className="fade-in text-warm-gray/60 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto border-l-2 border-gold/30 pl-8 text-left">
                        We don't just rent equipment. We deploy high-performance event infrastructure with zero-gravity logistics and enterprise-grade reliability. This page is currently being upgraded to match our new "Dive-In" storefront standards.
                    </p>

                    <div className="fade-in flex flex-col sm:flex-row items-center justify-center gap-6 pt-12">
                        <Link href="/catalog" className="w-full sm:w-auto px-12 py-5 rounded-full bg-gold text-navy font-black text-sm uppercase tracking-[0.3em] transition-all hover:scale-105 hover:shadow-[0_20px_50px_rgba(201,168,76,0.3)]">
                            Explore Fleet
                        </Link>
                        <Link href="/" className="w-full sm:w-auto px-12 py-5 rounded-full glass border border-white/10 text-white font-black text-sm uppercase tracking-[0.3em] transition-all hover:bg-white/10">
                            Return Home
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
