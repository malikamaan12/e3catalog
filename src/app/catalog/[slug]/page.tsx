"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import gsap from "gsap";
import * as Accordion from "@radix-ui/react-accordion";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import AvailabilityTimeline from "@/components/product/AvailabilityTimeline";

// Lazy-load heavy components — only mount when tab is active
// Lazy-load heavy components — only mount when tab is active
const ModelViewer = dynamic<{ url?: string; posterUrl?: string }>(() => import("@/components/product/ModelViewer"), {
    ssr: false,
    loading: () => <MediaLoadingPlaceholder label="Loading 3D Model..." />,
});
const VideoPlayer = dynamic<{ url?: string; posterUrl?: string }>(() => import("@/components/product/VideoPlayer"), {
    ssr: false,
    loading: () => <MediaLoadingPlaceholder label="Loading Video..." />,
});

function MediaLoadingPlaceholder({ label }: { label: string }) {
    return (
        <div className="w-full aspect-video bg-[var(--color-navy-lighter)] rounded-xl flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[var(--color-slate)]">{label}</p>
            </div>
        </div>
    );
}

function CopyLinkButton({ productSlug, tab }: { productSlug: string, tab: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        const fullUrl = `${window.location.origin}/catalog/${productSlug}?tab=${tab}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="absolute top-4 right-4 bg-[var(--color-navy)] bg-opacity-80 hover:bg-opacity-100 text-[var(--color-gold)] px-3 py-2 rounded-lg backdrop-blur-sm transition-all flex items-center gap-2 text-xs font-medium z-10 border border-[var(--color-border-subtle)]">
            {copied ? "✓ Copied!" : "🔗 Share Link"}
        </button>
    );
}

interface Product {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    dimensions: string | null;
    weight: string | null;
    powerRequirements: string | null;
    materials: string | null;
    showPrice: boolean;
    priceType: string;
    priceRangeMax: number | null;
    pricePerDay: number;
    pricePerHour: number | null;
    totalUnits: number;
    condition: string;
    installTime: number | null;
    dismantleTime: number | null;
    cleaningTime: number | null;
    manpower: string | null;
    tools: string | null;
    thumbnailUrl: string | null;
    category: { id: string; name: string; slug: string; } | null;
    media: Array<{ id: string; type: string; url: string; thumbnailUrl: string | null; alt: string | null; }>;
    documents: Array<{ id: string; name: string; url: string; size: number; }>;
    safetyCertificates: Array<{ id: string; certName: string; certNumber: string | null; issuingBody: string | null; issueDate: string; expiryDate: string; }>;
    installationGuides: Array<{ id: string; guideType: string; content: string; requiredManpower: number | null; estimatedTime: string | null; toolsRequired: string | null; }>;
    requiresLicense: boolean;
    requiresApproval: boolean;
    show3d?: boolean;
    showVideo?: boolean;
    unit: string;
    installGuideUrl?: string | null;
    dismantleGuideUrl?: string | null;
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = React.use(params);
    const slug = resolvedParams.slug;
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    // Read the initial tab from URL if present
    const initialTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") as "images" | "3d" | "video" : "images";
    const [activeTab, setActiveTab] = useState<"images" | "3d" | "video">(initialTab || "images");

    const [addingToCart, setAddingToCart] = useState(false);
    const [cartAdded, setCartAdded] = useState(false);

    // Cart form state
    const [quantity, setQuantity] = useState(1);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Availability state
    const [availability, setAvailability] = useState<{ available: boolean; unitsAvailable: number } | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    // Auto-check availability whenever dates or quantity change
    useEffect(() => {
        if (!product || !startDate || !endDate) {
            setAvailability(null);
            return;
        }
        const timer = setTimeout(async () => {
            setCheckingAvailability(true);
            try {
                const res = await fetch("/api/availability", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ productId: product.id, startDate, endDate, quantity }),
                });
                const data = await res.json();
                setAvailability(data);
            } catch { setAvailability(null); }
            setCheckingAvailability(false);
        }, 400); // debounce 400ms
        return () => clearTimeout(timer);
    }, [product, startDate, endDate, quantity]);

    // Guide accordion
    const [openGuide, setOpenGuide] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            fetch(`/api/products/${slug}`)
                .then((r) => r.json())
                .then((data) => {
                    setProduct(data);
                    setLoading(false);
                    // Entrance animation for content
                    setTimeout(() => {
                        gsap.fromTo(".pdp-content-anim", 
                            { y: 40, opacity: 0 }, 
                            { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, ease: "expo.out" }
                        );
                    }, 100);
                })
                .catch(() => setLoading(false));
        }
    }, [slug]);

    // Simplified optimistic Add to Cart
    const addToCart = async () => {
        if (!product || !startDate || !endDate) return;
        setAddingToCart(true);
        try {
            await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ productId: product.id, quantity, startDate, endDate }),
            });
            setCartAdded(true);
            setTimeout(() => setCartAdded(false), 3000);

            // Dispatch custom event so the Navbar header updates its count immediately
            window.dispatchEvent(new Event("cartUpdated"));
        } catch (error) {
            console.error(error);
        }
        setAddingToCart(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-7xl mx-auto px-6 animate-pulse">
                    <div className="h-8 bg-[var(--color-navy-lighter)] rounded w-1/3 mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="w-full aspect-video bg-[var(--color-navy-lighter)] rounded-xl" />
                        <div className="space-y-4">
                            <div className="h-6 bg-[var(--color-navy-lighter)] rounded w-3/4" />
                            <div className="h-4 bg-[var(--color-navy-lighter)] rounded w-full" />
                            <div className="h-4 bg-[var(--color-navy-lighter)] rounded w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen pt-28 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
                    <Link href="/catalog" className="btn-primary">Back to Catalog</Link>
                </div>
            </div>
        );
    }

    const images = Array.isArray(product.media) ? product.media.filter((m) => m.type === "image") : [];
    const model3d = Array.isArray(product.media) ? product.media.find((m) => m.type === "model3d") : null;
    const video = Array.isArray(product.media) ? product.media.find((m) => m.type === "video") : null;

    // Respect admin visibility flags
    const show3d = product.show3d !== false && !!model3d;
    const showVideo = product.showVideo !== false && !!video;

    const conditionColor = product.condition === "excellent" ? "text-[var(--color-success)]" : product.condition === "good" ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]";

    const guideTypeLabels: Record<string, string> = { install: "Installation Guide", operate: "Operation Manual", dismantle: "Dismantling Procedure" };


    return (
        <>
            <div className="min-h-screen pt-28 pb-16">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-[var(--color-slate)] mb-8">
                        <Link href="/catalog" className="hover:text-[var(--color-gold)] transition-colors">Catalog</Link>
                        <span>/</span>
                        {product.category && (
                            <>
                                <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-[var(--color-gold)] transition-colors">
                                    {product.category.name}
                                </Link>
                                <span>/</span>
                            </>
                        )}
                        <span className="text-[var(--color-warm-white)]">{product.name}</span>
                    </nav>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* LEFT: Media */}
                        <div>
                            {/* Tab Switcher — High Fidelity Floating Style */}
                            <div className="flex gap-3 mb-8 p-2 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
                                <button
                                    onClick={() => setActiveTab("images")}
                                    className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 ${activeTab === "images" ? "bg-gold text-navy shadow-[0_10px_30px_rgba(201,168,76,0.3)] scale-100" : "text-slate/60 hover:text-white hover:bg-white/5 opacity-60 hover:opacity-100"}`}
                                >
                                    <span className="text-xl">📷</span> <span className="hidden sm:inline">Gallery</span>
                                </button>
                                {show3d && (
                                    <button
                                        onClick={() => setActiveTab("3d")}
                                        className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 ${activeTab === "3d" ? "bg-gold text-navy shadow-[0_10px_30px_rgba(201,168,76,0.3)] scale-100" : "text-slate/60 hover:text-white hover:bg-white/5 opacity-60 hover:opacity-100"}`}
                                    >
                                        <span className="text-xl">🎲</span> <span className="hidden sm:inline">3D View</span>
                                    </button>
                                )}
                                {showVideo && (
                                    <button
                                        onClick={() => setActiveTab("video")}
                                        className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 ${activeTab === "video" ? "bg-gold text-navy shadow-[0_10px_30px_rgba(201,168,76,0.3)] scale-100" : "text-slate/60 hover:text-white hover:bg-white/5 opacity-60 hover:opacity-100"}`}
                                    >
                                        <span className="text-xl">🎬</span> <span className="hidden sm:inline">Video</span>
                                    </button>
                                )}
                            </div>

                            {/* Tab Content — Heavy media ONLY mounts when active */}
                            <div className="rounded-xl overflow-hidden">
                                {activeTab === "images" && (
                                    <div className="space-y-3">
                                        {/* Main Image */}
                                        <div className="w-full aspect-video bg-[var(--color-navy-lighter)] rounded-xl flex items-center justify-center relative overflow-hidden">
                                            {images.length > 0 ? (
                                                <>
                                                    <Image
                                                        src={images[0].url}
                                                        alt={product.name}
                                                        fill
                                                        priority
                                                        sizes="(max-width: 1200px) 100vw, 50vw"
                                                        className="object-cover"
                                                    />
                                                    <CopyLinkButton productSlug={product.slug} tab="images" />
                                                </>
                                            ) : (
                                                <div className="text-center text-[var(--color-slate)]">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-2 opacity-30">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                                        <polyline points="21 15 16 10 5 21" />
                                                    </svg>
                                                    <p className="text-sm">Product images coming soon</p>
                                                </div>
                                            )}
                                        </div>
                                        {images.length > 1 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {images.slice(0, 4).map((img) => (
                                                    <div key={img.id} className="relative h-20 rounded-lg bg-[var(--color-navy-lighter)] overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--color-gold)] transition-all">
                                                        <Image
                                                            src={img.url}
                                                            alt={product.name}
                                                            fill
                                                            sizes="(max-width: 1200px) 25vw, 15vw"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "3d" && model3d?.url && (
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--color-navy-lighter)]">
                                        <ModelViewer url={model3d.url} posterUrl={model3d.thumbnailUrl || product.thumbnailUrl || undefined} />
                                        <CopyLinkButton productSlug={product.slug} tab="3d" />
                                    </div>
                                )}
                                {activeTab === "video" && video?.url && (
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                                        <VideoPlayer url={video.url} posterUrl={video.thumbnailUrl || product.thumbnailUrl || undefined} />
                                        <CopyLinkButton productSlug={product.slug} tab="video" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Specs & Actions */}
                        <div>
                            <div className="mb-2">
                                {product.category && (
                                    <span className="text-xs tracking-widest text-[var(--color-gold)] font-medium uppercase">{product.category.name}</span>
                                )}
                            </div>
                            <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-warm-white)] mb-4">
                                {product.name}
                            </h1>

                            {(product.requiresLicense || product.requiresApproval) && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {product.requiresLicense && (
                                        <div className="px-3 py-1.5 rounded-lg bg-[var(--color-navy-lighter)] border border-yellow-500/30 text-yellow-500/90 text-xs font-medium flex items-center gap-2">
                                            <span>⚠️</span> Requires Operator License
                                        </div>
                                    )}
                                    {product.requiresApproval && (
                                        <div className="px-3 py-1.5 rounded-lg bg-[var(--color-navy-lighter)] border border-red-500/30 text-red-500/90 text-xs font-medium flex items-center gap-2">
                                            <span>🏛️</span> Requires Municipal Approval
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-[var(--color-slate)] leading-relaxed mb-6">
                                {product.description}
                            </p>

                            {/* Price */}
                            <div className="flex items-baseline gap-4 mb-6">
                                {product.showPrice === false ? (
                                    <div className="text-xl font-semibold text-[var(--color-slate)] border border-[var(--color-border-subtle)] px-4 py-2 rounded-lg bg-[var(--color-navy-lighter)]">
                                        Price upon request
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            {product.priceRangeMax && <span className="text-sm font-medium text-[var(--color-slate)] mr-2 block mb-1">Starting from</span>}
                                            <span className="text-3xl font-bold gradient-text-gold">{product.pricePerDay} QAR</span>
                                            {product.priceType === "daily" && <span className="text-[var(--color-slate)] ml-1">/{(product.unit === 'unit' || !product.unit) ? 'day' : `${product.unit}/day`}</span>}
                                            {product.priceType === "job" && <span className="text-[var(--color-slate)] ml-1">/job</span>}
                                        </div>
                                        {(!product.priceRangeMax && product.pricePerHour) && (
                                            <div>
                                                <span className="text-lg text-[var(--color-slate)]">{product.pricePerHour} QAR</span>
                                                <span className="text-sm text-[var(--color-slate)] ml-0.5">/hr</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* ── Technical Specifications (Radix UI) ── */}
                            <Accordion.Root type="single" collapsible className="space-y-4 mb-12">
                                <Accordion.Item value="specs" className="glass-dark rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                                    <Accordion.Header>
                                        <Accordion.Trigger className="w-full flex items-center justify-between p-8 md:p-10 text-left group">
                                            <span className="text-sm font-black text-slate group-hover:text-gold uppercase tracking-[0.3em] transition-all italic flex items-center gap-4">
                                                <span className="w-8 h-px bg-gold/30 group-hover:w-12 transition-all" />
                                                Technical Specifications
                                            </span>
                                            <span className="text-gold transition-transform duration-500 group-data-[state=open]:rotate-180">▼</span>
                                        </Accordion.Trigger>
                                    </Accordion.Header>
                                    <Accordion.Content className="px-8 md:px-10 pb-10 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 py-8 border-t border-white/5">
                                            {product.dimensions && (
                                                <div className="space-y-1">
                                                    <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Dimensions</span>
                                                    <p className="text-white font-bold text-sm md:text-base tracking-tight">{product.dimensions}</p>
                                                </div>
                                            )}
                                            {product.weight && (
                                                <div className="space-y-1">
                                                    <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Total Weight</span>
                                                    <p className="text-white font-bold text-sm md:text-base tracking-tight">{product.weight}</p>
                                                </div>
                                            )}
                                            {product.powerRequirements && (
                                                <div className="space-y-1">
                                                    <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Energy Requirements</span>
                                                    <p className="text-gold font-bold text-sm md:text-base tracking-tight">{product.powerRequirements}</p>
                                                </div>
                                            )}
                                            {product.materials && (
                                                <div className="space-y-1">
                                                    <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Build Materials</span>
                                                    <p className="text-white font-bold text-sm md:text-base tracking-tight">{product.materials}</p>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Active Condition</span>
                                                <p className={`font-bold text-sm md:text-base capitalize ${conditionColor}`}>{product.condition?.replace("_", " ")}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Fleet Availability</span>
                                                <p className="text-white font-bold text-sm md:text-base">{product.totalUnits} Units Available</p>
                                            </div>
                                        </div>
                                    </Accordion.Content>
                                </Accordion.Item>

                                {(product.installTime || product.dismantleTime || product.manpower) && (
                                    <Accordion.Item value="logistics" className="glass-dark rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                                        <Accordion.Header>
                                            <Accordion.Trigger className="w-full flex items-center justify-between p-8 md:p-10 text-left group">
                                                <span className="text-sm font-black text-slate group-hover:text-gold uppercase tracking-[0.3em] transition-all italic flex items-center gap-4">
                                                    <span className="w-8 h-px bg-gold/30 group-hover:w-12 transition-all" />
                                                    Logistics & Deployment
                                                </span>
                                                <span className="text-gold transition-transform duration-500 group-data-[state=open]:rotate-180">▼</span>
                                            </Accordion.Trigger>
                                        </Accordion.Header>
                                        <Accordion.Content className="px-8 md:px-10 pb-10 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                            <div className="grid grid-cols-2 gap-10 py-8 border-t border-white/5">
                                                {product.installTime !== null && (
                                                    <div className="space-y-1">
                                                        <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Est. Installation</span>
                                                        <p className="text-white font-bold text-sm md:text-base tracking-tight">{product.installTime} Hours</p>
                                                    </div>
                                                )}
                                                {product.dismantleTime !== null && (
                                                    <div className="space-y-1">
                                                        <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Est. Dismantle</span>
                                                        <p className="text-white font-bold text-sm md:text-base tracking-tight">{product.dismantleTime} Hours</p>
                                                    </div>
                                                )}
                                                {product.manpower && (
                                                    <div className="col-span-2 space-y-1">
                                                        <span className="text-slate/40 font-black text-[9px] uppercase tracking-[0.2em] block">Personnel Requirements</span>
                                                        <p className="text-white font-bold text-sm md:text-base">{product.manpower}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </Accordion.Content>
                                    </Accordion.Item>
                                )}

                                {Array.isArray(product.safetyCertificates) && product.safetyCertificates.length > 0 && (
                                    <Accordion.Item value="compliance" className="glass-dark rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                                        <Accordion.Header>
                                            <Accordion.Trigger className="w-full flex items-center justify-between p-8 md:p-10 text-left group">
                                                <span className="text-sm font-black text-slate group-hover:text-gold uppercase tracking-[0.3em] transition-all italic flex items-center gap-4">
                                                    <span className="w-8 h-px bg-gold/30 group-hover:w-12 transition-all" />
                                                    Compliance & Documentation
                                                </span>
                                                <span className="text-gold transition-transform duration-500 group-data-[state=open]:rotate-180">▼</span>
                                            </Accordion.Trigger>
                                        </Accordion.Header>
                                        <Accordion.Content className="px-8 md:px-10 pb-10 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                            <div className="space-y-5 py-8 border-t border-white/5">
                                                {product.safetyCertificates.map((cert) => (
                                                    <div key={cert.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-gold/20 transition-all shadow-lg">
                                                        <div>
                                                            <p className="text-sm md:text-base font-bold text-white">{cert.certName}</p>
                                                            <p className="text-[10px] font-black text-gold/40 uppercase tracking-[0.2em] mt-1">{cert.issuingBody}</p>
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">Certified Asset</span>
                                                    </div>
                                                ))}
                                                {product.documents?.map(doc => (
                                                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-dashed border-white/20 hover:border-gold/30 transition-all group shadow-lg">
                                                        <div>
                                                            <span className="text-sm md:text-base font-bold text-slate group-hover:text-white transition-colors">{doc.name}</span>
                                                            <p className="text-[9px] font-black text-slate/30 uppercase tracking-[0.2em] mt-1">Official Resource</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-xl group-hover:bg-gold transition-all">
                                                            <span className="text-[10px] font-black text-gold group-hover:text-navy uppercase tracking-[0.2em]">Open PDF</span>
                                                            <span className="text-gold group-hover:text-navy">↓</span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </Accordion.Content>
                                    </Accordion.Item>
                                )}
                            </Accordion.Root>

                            {/* Advanced Availability Timeline */}
                            <div className="mb-8">
                                <AvailabilityTimeline productId={product.id} />
                            </div>

                            {/* Add to Cart / Availability Check */}
                            <div id="quote-form" className="glass-dark rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[80px] group-hover:bg-gold/10 transition-colors" />
                                
                                <h3 className="font-bold text-xl text-white italic tracking-tighter uppercase mb-8 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs">01</span>
                                    Configure Selection
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate uppercase tracking-widest ml-1">Arrival Date</label>
                                        <input type="date" value={startDate}
                                            min={new Date().toLocaleDateString('en-CA')}
                                            onChange={(e) => {
                                                setStartDate(e.target.value);
                                                if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                                            }}
                                            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/30" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate uppercase tracking-widest ml-1">Release Date</label>
                                        <input type="date" value={endDate}
                                            min={startDate || new Date().toLocaleDateString('en-CA')}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-gold focus:outline-none transition-all placeholder:text-slate/30" />
                                    </div>
                                </div>

                                <div className="mb-8 space-y-2">
                                    <label className="text-[10px] font-black text-slate uppercase tracking-widest ml-1">Asset Quantity</label>
                                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-gold hover:text-navy transition-all text-xl font-bold">
                                            −
                                        </button>
                                        <div className="flex-1 text-center">
                                            <span className="text-xl font-black text-white tracking-tighter">{quantity}</span>
                                            <span className="text-slate text-xs ml-2 uppercase font-bold tracking-widest">{product.unit || 'Units'}</span>
                                        </div>
                                        <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-gold hover:text-navy transition-all text-xl font-bold">
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Availability Indicator */}
                                <div className="mb-8">
                                    <AnimatePresence mode="wait">
                                        {checkingAvailability ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-xs font-black text-gold uppercase tracking-[0.2em] p-4 rounded-2xl bg-gold/5 border border-gold/10">
                                                <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                                Decrypting Live Fleet Data...
                                            </motion.div>
                                        ) : availability ? (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-4 p-5 rounded-2xl border-2 ${availability.available ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-red-500/5 border-red-500/10 text-red-400"}`}>
                                                <div className={`w-3 h-3 rounded-full ${availability.available ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "bg-red-400"} animate-pulse`} />
                                                <span className="text-xs font-black uppercase tracking-widest">
                                                    {availability.available ? `STOCK CONFIRMED: ${availability.unitsAvailable} SECURED` : "FLEET EXHAUSTED FOR SELECTED WINDOW"}
                                                </span>
                                            </motion.div>
                                        ) : (
                                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                                                <div className="w-3 h-3 rounded-full bg-slate/30" />
                                                <span className="text-xs font-black text-slate/50 uppercase tracking-widest">Awaiting Logistics Data</span>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    onClick={addToCart}
                                    disabled={!startDate || !endDate || addingToCart}
                                    className={`w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all duration-500 relative overflow-hidden ${cartAdded
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gold text-navy shadow-2xl shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
                                        }`}
                                >
                                    {cartAdded ? "✓ ADDED TO QUOTE" : addingToCart ? "Establishing Link..." : "Add to Live Quote"}
                                </button>
                                
                                <p className="mt-6 text-center text-[10px] font-black text-slate uppercase tracking-[0.2em] opacity-30">
                                    Instant PDF Generation Available After Checkout
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STICKY BOTTOM BAR (Mobile Only) ── */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-6 lg:hidden">
                <motion.div 
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="glass-dark border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4"
                >
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate/50 uppercase tracking-widest">Starting / Day</span>
                        <span className="text-xl font-black text-white">{product.pricePerDay} <span className="text-xs text-slate">QAR</span></span>
                    </div>
                    <button 
                        onClick={() => document.getElementById('quote-form')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-gold text-navy px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gold/20"
                    >
                        Build Quote
                    </button>
                </motion.div>
            </div>

            <Footer />
        </>
    );
}


