"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, ShieldCheck, Zap, Globe, BarChart3, Users, Building2, Store, HelpCircle, FileText, Scale } from "lucide-react";
import { Footer } from "@/components/Footer";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function VendorLandingPage() {
    const heroRef = useRef<HTMLDivElement>(null);
    const benefitsRef = useRef<HTMLDivElement>(null);
    const stepsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero Animation
            gsap.from(".hero-content > *", {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: "power4.out"
            });

            // Benefits Animation
            gsap.from(".benefit-card", {
                scrollTrigger: {
                    trigger: benefitsRef.current,
                    start: "top 80%",
                },
                y: 40,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power3.out"
            });

            // Steps Animation
            gsap.from(".step-item", {
                scrollTrigger: {
                    trigger: stepsRef.current,
                    start: "top 85%",
                },
                x: -30,
                opacity: 0,
                duration: 0.6,
                stagger: 0.2,
                ease: "power2.out"
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--color-navy)] selection:bg-[var(--color-gold)] selection:text-[var(--color-navy)]">
            {/* Hero Section */}
            <section ref={heroRef} className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(197,160,94,0.1)_0%,transparent_50%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center hero-content">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs font-bold tracking-widest uppercase mb-8 border border-[var(--color-gold)]/20 backdrop-blur-md">
                            <Scale className="w-3.5 h-3.5" />
                            Official Partner Program
                        </div>
                        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-8xl font-extrabold text-[var(--color-warm-white)] mb-8 tracking-tighter leading-[0.9]">
                            Scale Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-gold)] to-yellow-200">Rental Empire</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[var(--color-slate)] max-w-2xl mx-auto mb-12 leading-relaxed">
                            Join Qatar's premier enterprise rental marketplace. List your inventory, reach corporate clients, and manage operations through our advanced vendor operating system.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/vendors/register" className="btn-primary px-10 py-5 text-lg group w-full sm:w-auto justify-center">
                                Start Onboarding <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/vendors/terms" className="px-8 py-4 rounded-2xl border border-white/10 text-[var(--color-warm-white)] hover:bg-white/5 transition-all font-semibold backdrop-blur-md w-full sm:w-auto text-center">
                                Review Terms
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefit Grid */}
            <section ref={benefitsRef} className="py-24 border-b border-white/5 relative">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Globe,
                                title: "Enterprise Reach",
                                desc: "Gain direct access to high-budget corporate events, royal weddings, and major government projects across Qatar."
                            },
                            {
                                icon: ShieldCheck,
                                title: "Secure Payouts",
                                desc: "Automated monthly settlements via QNB. No more chasing clients—we handle all invoicing and collections."
                            },
                            {
                                icon: BarChart3,
                                title: "Vendor OS",
                                desc: "A powerful dashboard to manage stock levels, monitor reliability scores, and view real-time performance analytics."
                            }
                        ].map((b, i) => (
                            <div key={i} className="benefit-card glass p-8 rounded-3xl border border-white/10 hover:border-[var(--color-gold)]/30 transition-all group">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-gold)]/10 flex items-center justify-center mb-6 border border-[var(--color-gold)]/20 group-hover:scale-110 transition-transform">
                                    <b.icon className="w-7 h-7 text-[var(--color-gold)]" />
                                </div>
                                <h3 className="text-2xl font-bold text-[var(--color-warm-white)] mb-4">{b.title}</h3>
                                <p className="text-[var(--color-slate)] leading-relaxed text-sm">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works - Visual Pipeline */}
            <section ref={stepsRef} className="py-24 relative overflow-hidden">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2 hidden md:block" />
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--color-warm-white)] mb-4">Onboarding Pipeline</h2>
                        <p className="text-[var(--color-slate)]">Transition from application to active vendor in 4 simple steps.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
                        {[
                            { num: "01", step: "Registration", icon: Users, detail: "Fill our digital application with your company credentials and TIN." },
                            { num: "02", step: "KYC Review", icon: ShieldCheck, detail: "Our compliance team verifies your Tax Card and CR within 48 hours." },
                            { num: "03", step: "Catalog Sync", icon: Store, detail: "Upload your inventory items through our easy-to-use bulk importer." },
                            { num: "04", step: "Active Partner", icon: Zap, detail: "Go live on the marketplace and start receiving enterprise bookings." }
                        ].map((s, i) => (
                            <div key={i} className="step-item relative">
                                <div className="w-16 h-16 rounded-full bg-[var(--color-navy-dark)] border-4 border-[var(--color-gold)] flex items-center justify-center text-[var(--color-gold)] font-black text-xl mb-6 shadow-[0_0_30px_rgba(197,160,94,0.15)] mx-auto md:mx-0">
                                    <s.icon className="w-7 h-7" />
                                </div>
                                <div className="text-center md:text-left">
                                    <span className="text-[var(--color-gold)] font-mono text-sm tracking-widest font-bold mb-2 block">{s.num}</span>
                                    <h4 className="text-xl font-bold text-[var(--color-warm-white)] mb-4">{s.step}</h4>
                                    <p className="text-sm text-[var(--color-slate)] leading-relaxed">{s.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ / Know-How Section */}
            <section className="py-24 bg-white/5">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-6">
                            <HelpCircle className="w-8 h-8 text-[var(--color-gold)]" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--color-warm-white)] mb-4">Partner FAQs</h2>
                        <p className="text-[var(--color-slate)] text-sm">Everything you need to know about the E3 Operating System.</p>
                    </div>

                    <div className="space-y-6">
                        {[
                            { q: "What is the commission structure?", a: "E3 operates on a performance-based revenue share. Our standard commission is 20% on all successful rentals, which covers platform maintenance, secure credit card processing, and first-line customer support." },
                            { q: "How do payouts work?", a: "We process vendor settlements monthly. On the 5th of every month, your earnings for the previous 30 days are calculated and transferred directly to your registered bank account via QNB." },
                            { q: "Who handles delivery and logistics?", a: "Vendors are responsible for the safe delivery and pickup of their equipment. However, E3 provides a standardized logistics ticket system and POD (Proof of Delivery) digital tools within your dashboard." },
                            { q: "Is there a monthly subscription fee?", a: "No. Joining E3 as a basic partner is free. We only earn when you earn." }
                        ].map((faq, i) => (
                            <div key={i} className="glass border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors">
                                <h4 className="font-bold text-[var(--color-warm-white)] mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-[var(--color-gold)]" />
                                    {faq.q}
                                </h4>
                                <p className="text-sm text-[var(--color-slate)] leading-relaxed pl-6">{faq.a}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-[var(--color-gold)]/20 to-transparent border border-[var(--color-gold)]/30 text-center">
                        <h3 className="text-2xl font-bold text-[var(--color-warm-white)] mb-4">Ready to grow with us?</h3>
                        <p className="text-[var(--color-slate)] text-sm mb-8">Join the elite network of Qatar's event and equipment providers.</p>
                        <Link href="/vendors/register" className="btn-primary px-10">Start Your Application</Link>
                    </div>
                </div>
            </section>

            {/* Legal Links Footer Area */}
            <section className="py-12 border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                        <Link href="/vendors/terms" className="text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Vendor Terms
                        </Link>
                        <Link href="/vendors/policy" className="text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Marketplace Policy
                        </Link>
                        <Link href="/signup" className="text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Login as Partner
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
