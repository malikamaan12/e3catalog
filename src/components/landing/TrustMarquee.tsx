"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const LOGOS = [
    { name: "Khalifa Stadium", type: "Venue" },
    { name: "QNCC", type: "Venue" },
    { name: "Qatar Airways", type: "Corporate" },
    { name: "TUV Certified", type: "Safety", color: "text-red-500" },
    { name: "Ooredoo", type: "Corporate" },
    { name: "Lusail Winter Wonderland", type: "Entertainment" },
    { name: "ISO 9001", type: "Safety", color: "text-blue-500" },
    { name: "Supreme Committee", type: "Gov" },
];

export default function TrustMarquee() {
    const marqueeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!marqueeRef.current) return;

        const marqueeContent = marqueeRef.current.firstChild as HTMLElement;
        const width = marqueeContent.offsetWidth;

        // Infinite loop
        gsap.to(marqueeContent, {
            x: -width / 2,
            duration: 30,
            repeat: -1,
            ease: "none",
        });
    }, []);

    return (
        <section className="py-20 bg-navy-light/20 border-y border-white/5 relative overflow-hidden z-20">
            <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-gold text-xs font-black tracking-[0.4em] uppercase mb-2">Enterprise Trusted</h3>
                    <p className="text-white text-2xl md:text-3xl font-bold tracking-tight">Approved for high-security venues & government tenders.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-4 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-navy bg-navy-light flex items-center justify-center text-[8px] font-bold text-gold border border-gold/20">
                                E3
                            </div>
                        ))}
                    </div>
                    <span className="text-navy-300 text-xs font-bold">500+ Events Managed This Year</span>
                </div>
            </div>

            <div ref={marqueeRef} className="flex whitespace-nowrap will-change-transform">
                <div className="flex gap-12 items-center py-4">
                    {/* Double the logos for seamless looping */}
                    {[...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 px-8 py-4 glass rounded-2xl border border-white/5 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 hover:border-gold/30 hover:bg-gold/5 transition-all duration-500 cursor-default will-change-transform"
                        >
                            <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center font-black text-xs border border-white/10 shrink-0">
                                {logo.name[0]}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-lg font-black tracking-tighter text-white uppercase italic ${logo.color || ''}`}>
                                    {logo.name}
                                </span>
                                <span className="text-[9px] font-black tracking-[0.2em] text-navy-400 uppercase">
                                    {logo.type}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ambient gradients */}
            <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-navy to-transparent z-10" />
            <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-navy to-transparent z-10" />
        </section>
    );
}
