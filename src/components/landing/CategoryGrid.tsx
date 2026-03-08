"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
    {
        name: "Audio Visual",
        slug: "audio-visual",
        desc: "LED Screens, Line Arrays, and High-Definition Video Processing.",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop",
        color: "from-blue-500/20",
    },
    {
        name: "Staging",
        slug: "staging",
        desc: "Modular Staging, Roof Systems, and Heavy-Duty Box Trussing.",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
        color: "from-amber-500/20",
    },
    {
        name: "Entertainment",
        slug: "entertainment",
        desc: "Special Effects, Pyrotechnics, and Atmospheric Lighting Packages.",
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop",
        color: "from-purple-500/20",
    },
    {
        name: "Furniture",
        slug: "furniture",
        desc: "VIP Banquet Seating, Designer Lounge Sets, and Bar Systems.",
        image: "https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=800&auto=format&fit=crop",
        color: "from-emerald-500/20",
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
                className="absolute inset-0 z-10 flex flex-col justify-end p-10 space-y-4"
            >
                <div className="space-y-2">
                    <motion.h3 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                        {category.name.toUpperCase()}
                    </motion.h3>
                    <p className="text-navy-300 text-sm md:text-lg font-medium tracking-tight max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        {category.desc}
                    </p>
                </div>

                <Link
                    href={`/catalog?category=${category.slug}`}
                    className="inline-flex items-center gap-2 text-gold font-black text-xs tracking-widest uppercase group-hover:gap-4 transition-all duration-300"
                >
                    Quick Entry <ArrowRight className="w-4 h-4" />
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
                            CORE <br /> <span className="gradient-text-gold">CATEGORIES</span>
                        </h2>
                    </div>
                    <p className="text-navy-300 max-w-sm text-lg font-medium leading-tight">
                        Optimized for speed. Designed for global production standards.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {CATEGORIES.map((cat, i) => (
                        <CategoryCard key={cat.slug} category={cat} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
