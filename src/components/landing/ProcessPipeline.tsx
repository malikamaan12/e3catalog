"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useInView } from "react-intersection-observer";
import { Box, FileText, Truck, CheckCircle2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
    {
        id: "pick",
        title: "Pick Your Fleet",
        desc: "Browse our catalog and select industrial-grade assets for your next event.",
        Icon: Box,
    },
    {
        id: "quote",
        title: "Quote in Seconds",
        desc: "Get an instant, professional PDF proposal with transparent logistics and setup fees.",
        Icon: FileText,
    },
    {
        id: "deliver",
        title: "Precision Delivery",
        desc: "Our certified crew handles logistics and on-site assembly to your exact specs.",
        Icon: Truck,
    },
    {
        id: "return",
        title: "Seamless Return",
        desc: "Post-event teardown and collection. We handle the heavy lifting while you wrap up.",
        Icon: CheckCircle2,
    }
];

function StageItem({ stage, i }: { stage: typeof STAGES[0], i: number }) {
    const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: false });
    const Icon = stage.Icon;

    return (
        <div ref={ref} className={`stage-container-${i} relative flex flex-col md:flex-row items-center gap-12 mb-32 md:mb-64 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>

            {/* Content Side */}
            <div className={`flex-1 text-center md:text-left transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="inline-block px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-black tracking-widest mb-4 uppercase">
                    Stage {i + 1}
                </div>
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tighter">
                    {stage.title}
                </h2>
                <p className="text-navy-300 text-lg md:text-xl leading-relaxed max-w-md mx-auto md:mx-0">
                    {stage.desc}
                </p>
            </div>

            {/* Animation Side (Simplified Icon Reveal) */}
            <div className={`stage-node-${i} flex-1 w-full max-w-sm bg-navy-light/40 rounded-[3rem] p-12 aspect-square flex items-center justify-center border border-white/5 relative shadow-2xl overflow-hidden transition-all duration-700 delay-100 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className={`absolute inset-0 bg-gold/5 transition-opacity duration-1000 ${inView ? 'opacity-100' : 'opacity-0'}`} />
                <Icon className={`w-32 h-32 text-gold transition-all duration-1000 ${inView ? 'scale-110 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-12'}`} />
                <div className="absolute text-gold/10 font-black text-9xl z-0 select-none">
                    0{i + 1}
                </div>
            </div>
        </div>
    );
}

export default function ProcessPipeline() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        if (!pathRef.current || !sectionRef.current) return;

        const pathLength = pathRef.current.getTotalLength();

        gsap.set(pathRef.current, {
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength,
        });

        gsap.to(pathRef.current, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
                trigger: sectionRef.current,
                start: "top center",
                end: "bottom center",
                scrub: 1,
            }
        });
    }, []);

    return (
        <section ref={sectionRef} className="relative py-32 bg-navy overflow-hidden z-20">
            <div className="max-w-5xl mx-auto px-6 relative">

                {/* SVG Connecting Line */}
                <div className="absolute left-[50%] top-0 bottom-0 w-px hidden md:block">
                    <svg width="100%" height="100%" viewBox="0 0 100 1000" preserveAspectRatio="none" className="overflow-visible">
                        <path
                            ref={pathRef}
                            d="M 50 0 C 50 250 50 250 50 500 C 50 750 50 750 50 1000"
                            stroke="#c9a84c"
                            strokeWidth="2"
                            fill="none"
                            className="opacity-30"
                        />
                    </svg>
                </div>

                {STAGES.map((stage, i) => (
                    <StageItem key={stage.id} stage={stage} i={i} />
                ))}
            </div>
        </section>
    );
}
