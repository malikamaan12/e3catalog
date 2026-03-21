"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
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
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: false });
    const Icon = stage.Icon;

    return (
        <div ref={ref} className={`relative flex flex-col md:flex-row items-center gap-12 mb-24 md:mb-48 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
            
            {/* Mobile-First Number (Floating) */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 md:hidden text-gold/20 font-black text-8xl z-0 select-none">
                0{i + 1}
            </div>

            {/* Content Side */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`flex-1 text-center md:text-left z-10`}
            >
                <div className="inline-block px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-black tracking-[0.2em] mb-4 uppercase">
                    Execution Phase 0{i + 1}
                </div>
                <h2 className="text-3xl md:text-6xl font-bold text-white mb-6 tracking-tighter">
                    {stage.title}
                </h2>
                <p className="text-slate text-base md:text-xl leading-relaxed max-w-md mx-auto md:mx-0">
                    {stage.desc}
                </p>
            </motion.div>

            {/* Animation Side */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`flex-1 w-full max-w-xs md:max-w-sm glass-dark rounded-[2.5rem] md:rounded-[3.5rem] p-10 md:p-16 aspect-square flex items-center justify-center border border-white/5 relative shadow-2xl overflow-hidden z-10`}
            >
                {/* Ambient glow inside card */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.1),transparent_70%)] opacity-50" />
                
                <Icon className={`w-24 h-24 md:w-32 md:h-32 text-gold z-10`} />
                
                {/* Watermark Number */}
                <div className="absolute right-6 bottom-6 text-gold/5 font-black text-9xl z-0 select-none hidden md:block">
                    {i + 1}
                </div>
            </motion.div>
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
                start: "top 80%",
                end: "bottom 20%",
                scrub: 1,
            }
        });
    }, []);

    return (
        <section ref={sectionRef} className="relative py-24 md:py-48 bg-navy overflow-hidden z-20">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-gold/20 to-transparent hidden md:block" />

            <div className="max-w-6xl mx-auto px-6 relative">
                <div className="text-center mb-24 md:mb-32">
                    <span className="text-gold text-xs font-black tracking-[0.4em] uppercase mb-4 block">The Process</span>
                    <h2 className="text-4xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                        STREAMLINED <br /> <span className="gradient-text-gold">EXECUTION</span>
                    </h2>
                </div>

                {STAGES.map((stage, i) => (
                    <StageItem key={stage.id} stage={stage} i={i} />
                ))}
            </div>
        </section>
    );
}
