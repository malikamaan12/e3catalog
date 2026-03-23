"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
    {
        name: "Staging & Architecture",
        slug: "staging-trusses",
        desc: "Third-party certified complex structures, bleachers, and VIP podiums engineered for ultimate stability.",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
        color: "from-amber-500/20",
    },
    {
        name: "Lighting & Special Effects",
        slug: "lighting",
        desc: "High-performance rigs and KAHRAMAA-compliant electrical distribution for exhibitions and concerts.",
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop",
        color: "from-purple-500/20",
    },
    {
        name: "Premium Marquees & Tents",
        slug: "furniture-decor",
        desc: "Ministry of Municipality-approved outdoor enclosures featuring certified fire-retardant materials.",
        image: "https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=800&auto=format&fit=crop",
        color: "from-emerald-500/20",
    },
    {
        name: "Audiovisual & Broadcast",
        slug: "sound-audio",
        desc: "Crystal-clear LED screens and PA systems perfect for corporate conferences and government summits.",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop",
        color: "from-blue-500/20",
    },
];

function CategoryCard({ category, index }: { category: typeof CATEGORIES[0], index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="relative h-[450px] w-full rounded-[2.5rem] bg-navy-light/40 border border-white/10 overflow-hidden group"
        >
            {/* Background Image with Gradient Reveal */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover scale-105 group-hover:scale-100 transition-transform duration-[1200ms] opacity-40 group-hover:opacity-60"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={index < 2}
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-transparent ${category.color} translate-y-24 group-hover:translate-y-0 transition-transform duration-700`} />
            </div>

            {/* Content Overlay */}
            <div
                className="absolute inset-0 z-10 flex flex-col justify-end p-8 md:p-10 space-y-4"
            >
                <div className="space-y-2">
                    <motion.h3 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                        {category.name.toUpperCase()}
                    </motion.h3>
                    <p className="text-slate text-sm md:text-lg font-medium tracking-tight max-w-[90%] md:max-w-[80%] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        {category.desc}
                    </p>
                </div>

                <Link
                    href={`/catalog?category=${category.slug}`}
                    className="inline-flex items-center gap-2 text-gold font-black text-[10px] md:text-xs tracking-[0.2em] md:tracking-widest uppercase group-hover:gap-4 transition-all duration-300"
                >
                    Explore Fleet <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Static Glow Interaction */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gold/5 pointer-events-none" />
        </motion.div>
    );
}

export default function CategoryGrid() {
    return (
        <section className="py-24 bg-navy relative z-30">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <div className="space-y-3">
                        <span className="text-gold text-xs font-black tracking-[0.4em] uppercase">Premium Inventory</span>
                        <h2 className="text-5xl md:text-8xl font-black text-white italic tracking-tighter leading-[0.8]">
                            EXPLORE <br /> <span className="gradient-text-gold">OUR FLEET</span>
                        </h2>
                    </div>
                    <p className="text-navy-300 max-w-sm text-lg font-medium leading-tight">
                        Optimized for speed. Designed for Qatar&apos;s most demanding production standards.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {CATEGORIES.map((cat, i) => (
                        <CategoryCard key={cat.slug} category={cat} index={i} />
                    ))}
                </div>

                {/* View Full Catalog CTA */}
                <div className="text-center mt-16">
                    <Link
                        href="/catalog"
                        className="inline-flex items-center gap-3 px-12 py-5 rounded-full bg-gold text-navy font-black text-sm uppercase tracking-[0.3em] transition-all hover:scale-105 hover:shadow-[0_20px_50px_rgba(201,168,76,0.3)] active:scale-95"
                    >
                        View Full Catalog
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
