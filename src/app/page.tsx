"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import { 
    Zap, ShieldCheck, QrCode, ClipboardList, Box, 
    Truck, CheckCircle2, ArrowRight, Star, 
    Monitor, LayoutGrid, Layers, Building2, 
    ChevronRight, MoveRight
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/Footer";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

// Dynamic Spline (No SSR)
const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

export default function HomePage() {
    return (
        <main className="bg-[#0A0F1C] text-white overflow-x-hidden">
            <HeroSection />
            <TrustMarquee />
            <PlatformSuperpowers />
            <FastCatalog />
            <LogisticsTimeline />
            <Footer />
        </main>
    );
}

// ── 1. THE IMMERSIVE 3D HERO (GSAP PINNED) ──────────────────────────────────
function HeroSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const splineRef = useRef<HTMLDivElement>(null);
    const [splineError, setSplineError] = useState(false);

    useEffect(() => {
        if (!sectionRef.current || !contentRef.current) return;

        const ctx = gsap.context(() => {
            // Pinning total section
            ScrollTrigger.create({
                trigger: sectionRef.current,
                start: "top top",
                end: "+=150%",
                pin: true,
                scrub: 1,
            });

            // Spline object rotation/scale animation
            if (splineRef.current) {
                gsap.to(splineRef.current, {
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top top",
                        end: "+=100%",
                        scrub: 1,
                    },
                    scale: 1.5,
                    rotate: 15,
                    y: -50,
                    opacity: 0.1,
                });
            }

            // Typography fade out
            gsap.to(contentRef.current, {
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "bottom center",
                    scrub: 1,
                },
                y: -100,
                opacity: 0,
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="relative h-screen flex items-center justify-center z-10">
            {/* Background Spline */}
            <div ref={splineRef} className="absolute inset-0 z-0 pointer-events-none md:pointer-events-auto">
                <ErrorBoundary 
                    name="Hero Spline" 
                    fallback={<div className="w-full h-full bg-[#0A0F1C] radial-glow" />}
                >
                    {!splineError ? (
                        <Spline 
                            scene="https://prod.spline.design/6Wq1Q7YGyWf8Zhp5/scene.splinecode" 
                            className="w-full h-full object-cover scale-110 md:scale-105"
                            onError={() => setSplineError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-[#0A0F1C] radial-glow" />
                    )}
                </ErrorBoundary>
            </div>

            {/* Content Overlay */}
            <div ref={contentRef} className="relative z-10 text-center max-w-5xl px-6 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                >
                    <span className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-8">
                        The Next Generation of Events
                    </span>
                    <h1 className="text-5xl md:text-8xl font-black font-[family-name:var(--font-heading)] italic tracking-tighter leading-[0.9] mb-8">
                        THE DIGITAL <br />
                        <span className="gradient-text-gold">OPERATING SYSTEM</span> <br />
                        FOR PREMIUM EVENTS
                    </h1>
                    <p className="text-[var(--color-slate)] text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                        Setting the standard for enterprise-grade logistics and ultra-premium 
                        storefronts in the Middle East. Build, quote, and deploy at scale.
                    </p>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-50">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Scroll to Explore</span>
                <div className="w-px h-12 bg-gradient-to-b from-gold to-transparent animate-pulse" />
            </div>
            
            <style jsx>{`
                .radial-glow {
                    background: radial-gradient(circle at center, rgba(201,168,76,0.1), transparent 70%);
                }
            `}</style>
        </section>
    );
}

// ── 2. THE ENTERPRISE TRUST MARQUEE (FRAMER MOTION) ─────────────────────────
function TrustMarquee() {
    const brands = [
        { icon: ShieldCheck, label: "TUV Rheinland Certified" },
        { icon: Building2, label: "Qatar Civil Defence Approved" },
        { icon: Zap, label: "KAHRAMAA Compliant" },
        { icon: CheckCircle2, label: "MOCI Regulated" },
        { icon: LayoutGrid, label: "ISO 9001 Logistics" },
        { icon: Star, label: "Forbes 500 Trusted" },
    ];

    return (
        <section className="py-12 bg-white/5 border-y border-white/5 backdrop-blur-sm relative overflow-hidden z-20">
            <div className="flex whitespace-nowrap overflow-hidden">
                <motion.div 
                    animate={{ x: ["0%", "-100%"] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="flex gap-16 md:gap-32 items-center"
                >
                    {[...brands, ...brands].map((brand, i) => (
                        <div key={i} className="flex items-center gap-4 text-white/40 grayscale hover:grayscale-0 hover:text-gold transition-all cursor-default">
                            <brand.icon className="w-5 h-5 shrink-0" />
                            <span className="text-xs font-black uppercase tracking-[0.25em]">{brand.label}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

// ── 3. THE "PLATFORM SUPERPOWERS" BENTO BOX ─────────────────────────────────
function PlatformSuperpowers() {
    return (
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto z-20 relative">
            <div className="mb-16 text-center">
                <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter mb-4">PLATFORM SUPERPOWERS</h2>
                <div className="h-1 w-24 bg-gold mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px] md:auto-rows-[300px]">
                <BentoCard 
                    className="md:col-span-2 md:row-span-1"
                    title="Sweep-Line Availability Engine"
                    description="Real-time algorithmic booking system that ensures zero double-bookings across your entire fleet."
                    icon={Zap}
                />
                <BentoCard 
                    title="Instant PDF Quoting"
                    description="Generate professional, commercial proposals in under 12 seconds with tax compliance."
                    icon={ClipboardList}
                />
                <BentoCard 
                    title="Digital Asset Passports"
                    description="Every item has a unique digital identity and QR-tracked physical movement history."
                    icon={QrCode}
                />
                <BentoCard 
                    className="md:col-span-2 md:row-span-1"
                    title="Interactive 3D Catalog"
                    description="Ultra-high fidelity 3D models for every piece of equipment. Try before you buy with web-first AR."
                    icon={Monitor}
                />
            </div>
        </section>
    );
}

interface BentoCardProps {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
}

function BentoCard({ title, description, icon: Icon, className = "" }: BentoCardProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div 
            onMouseMove={handleMouseMove}
            className={`group relative glass rounded-[2.5rem] p-8 border border-white/5 overflow-hidden transition-all hover:bg-white/[0.07] ${className}`}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: useTransform(
                        [mouseX, mouseY],
                        ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(201,168,76,0.08), transparent 80%)`
                    )
                }}
            />
            
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gold border border-white/10 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-3 font-[family-name:var(--font-heading)] italic uppercase">{title}</h3>
                    <p className="text-sm text-[var(--color-slate)] leading-relaxed">{description}</p>
                </div>
            </div>
        </div>
    );
}

// ── 4. THE "FAST CATALOG" DRAGGABLE CAROUSEL ─────────────────────────────────
function FastCatalog() {
    const categories = [
        { name: "Heavy Trussing", icon: Layers, price: "450" },
        { name: "VIP Seating", icon: Armchair, price: "120" },
        { name: "LED Screens", icon: Monitor, price: "1,500" },
        { name: "Marquees", icon: Building2, price: "3,200" },
        { name: "Lighting Design", icon: Zap, price: "350" },
        { name: "Audio Systems", icon: Mic2, price: "800" },
    ];

    const constraintsRef = useRef(null);

    return (
        <section className="py-24 z-20 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 mb-12 flex items-end justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-3">Live Inventory</p>
                    <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter">FAST CATALOG</h2>
                </div>
                <button className="flex items-center gap-3 text-xs font-black uppercase tracking-widest hover:text-gold transition-colors group">
                    View Full Fleet <MoveRight className="group-hover:translate-x-2 transition-transform" />
                </button>
            </div>

            <div ref={constraintsRef} className="px-6 md:px-12">
                <motion.div 
                    drag="x"
                    dragConstraints={constraintsRef}
                    className="flex gap-6 cursor-grab active:cursor-grabbing"
                >
                    {categories.map((cat, i) => (
                        <CategoryCard key={i} category={cat} />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

interface CategoryCardProps {
    category: {
        name: string;
        icon: React.ComponentType<{ className?: string }>;
        price: string;
    };
}

function CategoryCard({ category }: CategoryCardProps) {
    return (
        <div className="w-[280px] md:w-[350px] shrink-0 glass rounded-[2.5rem] p-6 border border-white/5 group hover:border-gold/20 transition-all">
            <div className="aspect-[4/3] rounded-[2rem] bg-white/5 mb-6 overflow-hidden flex items-center justify-center relative">
                <category.icon className="w-16 h-16 text-white/10 group-hover:scale-125 group-hover:text-gold/20 transition-all duration-500" />
                <div className="absolute top-4 right-4 bg-navy/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[9px] font-bold tracking-widest uppercase">
                    From QAR {category.price}
                </div>
            </div>
            <h4 className="text-xl font-bold font-[family-name:var(--font-heading)] uppercase tracking-tighter flex items-center justify-between">
                {category.name}
                <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h4>
        </div>
    );
}

// ── 5. THE "LOGISTICS PIPELINE" TIMELINE ─────────────────────────────────────
interface TimelineStep {
    num: string;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
}

function LogisticsTimeline() {
    const timelineRef = useRef<HTMLElement>(null);
    const steps: TimelineStep[] = [
        { num: "01", title: "Build Cart", desc: "Select assets and configure quantity.", icon: Box },
        { num: "02", title: "Generate Quote", desc: "Instant MOCI-ready commercial proposal.", icon: ClipboardList },
        { num: "03", title: "Bump-In", desc: "White-glove delivery and setup on-site.", icon: Truck },
        { num: "04", title: "Bump-Out", desc: "Asset recovery and fleet reintegration.", icon: CheckCircle2 },
    ];

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".timeline-step", {
                scrollTrigger: {
                    trigger: timelineRef.current,
                    start: "top center",
                    end: "bottom center",
                    scrub: 1,
                },
                opacity: 0.2,
                stagger: 0.5,
                y: 50,
            });

            // "Draw" the line
            gsap.to(".timeline-line", {
                scrollTrigger: {
                    trigger: timelineRef.current,
                    start: "top center",
                    end: "bottom center",
                    scrub: 1,
                },
                scaleY: 1,
                transformOrigin: "top center",
            });
        }, timelineRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={timelineRef} className="py-24 px-6 max-w-4xl mx-auto z-20 relative">
            <div className="text-center mb-20">
                <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter mb-4">LOGISTICS PIPELINE</h2>
                <p className="text-[var(--color-slate)] text-sm tracking-widest uppercase">End-to-End Fleet Integration</p>
            </div>

            <div className="relative">
                {/* Background Line */}
                <div className="absolute left-[23px] top-0 bottom-0 w-[2px] bg-white/5" />
                {/* Animated Line */}
                <div className="timeline-line absolute left-[23px] top-0 bottom-0 w-[2px] bg-gold scale-y-0" />

                <div className="space-y-16">
                    {steps.map((step, i) => (
                        <div key={i} className="timeline-step flex gap-8 relative">
                            <div className="w-12 h-12 rounded-full bg-[#0A0F1C] border-2 border-white/10 flex items-center justify-center relative z-10 shrink-0 group-hover:border-gold transition-colors">
                                <step.icon className="w-5 h-5 text-gold" />
                            </div>
                            <div className="pt-2">
                                <span className="text-[10px] font-black text-white/30 tracking-[0.3em] font-mono">{step.num}</span>
                                <h3 className="text-2xl font-bold uppercase tracking-tight mt-1 mb-2 italic">
                                    {step.title}
                                </h3>
                                <p className="text-[var(--color-slate)] text-sm max-w-sm">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Fallback Icons (added to ensure build passes if missing in lucide)
function Armchair({ className }: { className?: string }) { return <Box className={className} />; }
function Mic2({ className }: { className?: string }) { return <Box className={className} />; }
