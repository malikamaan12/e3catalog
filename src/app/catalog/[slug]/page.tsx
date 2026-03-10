"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import AvailabilityTimeline from "@/components/product/AvailabilityTimeline";

// Lazy-load heavy components — only mount when tab is active
// Lazy-load heavy components — only mount when tab is active
const ModelViewer = dynamic<{ url?: string }>(() => import("@/components/product/ModelViewer"), {
    ssr: false,
    loading: () => <MediaLoadingPlaceholder label="Loading 3D Model..." />,
});
const VideoPlayer = dynamic<{ url?: string }>(() => import("@/components/product/VideoPlayer"), {
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
                            {/* Tab Switcher — only show tabs admin has enabled */}
                            <div className="flex gap-1 mb-4 p-1 bg-[var(--color-surface)] rounded-xl">
                                <button
                                    onClick={() => setActiveTab("images")}
                                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "images" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                >
                                    📷 Images
                                </button>
                                {show3d && (
                                    <button
                                        onClick={() => setActiveTab("3d")}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "3d" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                    >
                                        🎲 3D Model
                                    </button>
                                )}
                                {showVideo && (
                                    <button
                                        onClick={() => setActiveTab("video")}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "video" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)]"}`}
                                    >
                                        🎬 Video
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
                                        <ModelViewer url={model3d.url} />
                                        <CopyLinkButton productSlug={product.slug} tab="3d" />
                                    </div>
                                )}
                                {activeTab === "video" && video?.url && (
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                                        <VideoPlayer url={video.url} />
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

                            {/* Deep Technical Specs */}
                            <div className="glass rounded-xl p-5 mb-6">
                                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-4">TECHNICAL SPECIFICATIONS</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {product.dimensions && (
                                        <div>
                                            <span className="text-[var(--color-slate)]">Dimensions</span>
                                            <p className="text-[var(--color-warm-white)] font-medium">{product.dimensions}</p>
                                        </div>
                                    )}
                                    {product.weight && (
                                        <div>
                                            <span className="text-[var(--color-slate)]">Weight</span>
                                            <p className="text-[var(--color-warm-white)] font-medium">{product.weight}</p>
                                        </div>
                                    )}
                                    {product.powerRequirements && (
                                        <div>
                                            <span className="text-[var(--color-slate)]">Power</span>
                                            <p className="text-[var(--color-warm-white)] font-medium">{product.powerRequirements}</p>
                                        </div>
                                    )}
                                    {product.materials && (
                                        <div>
                                            <span className="text-[var(--color-slate)]">Materials</span>
                                            <p className="text-[var(--color-warm-white)] font-medium">{product.materials}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[var(--color-slate)]">Condition</span>
                                        <p className={`font-medium capitalize ${conditionColor}`}>{product.condition?.replace("_", " ") || "Standard"}</p>
                                    </div>
                                    <div>
                                        <span className="text-[var(--color-slate)]">In Fleet</span>
                                        <p className="text-[var(--color-warm-white)] font-medium">{product.totalUnits} {product.unit}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics */}
                            {(product.installTime || product.dismantleTime || product.manpower) && (
                                <div className="glass rounded-xl p-5 mb-6">
                                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-4">LOGISTICS</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        {product.installTime !== null && product.installTime > 0 && (
                                            <div>
                                                <span className="text-[var(--color-slate)]">Install Time</span>
                                                <p className="text-[var(--color-warm-white)] font-medium">{product.installTime}h buffer</p>
                                            </div>
                                        )}
                                        {product.dismantleTime !== null && product.dismantleTime > 0 && (
                                            <div>
                                                <span className="text-[var(--color-slate)]">Dismantle Time</span>
                                                <p className="text-[var(--color-warm-white)] font-medium">{product.dismantleTime}h buffer</p>
                                            </div>
                                        )}
                                        {product.manpower && (
                                            <div className="col-span-2">
                                                <span className="text-[var(--color-slate)]">Manpower</span>
                                                <p className="text-[var(--color-warm-white)] font-medium">{product.manpower}</p>
                                            </div>
                                        )}
                                        {product.tools && (
                                            <div className="col-span-2">
                                                <span className="text-[var(--color-slate)]">Tools Required</span>
                                                <p className="text-[var(--color-warm-white)] font-medium">{product.tools}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Safety Certificates */}
                            {Array.isArray(product.safetyCertificates) && product.safetyCertificates.length > 0 && (
                                <div className="glass rounded-xl p-5 mb-6">
                                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-4">SAFETY & COMPLIANCE</h3>
                                    <div className="space-y-3">
                                        {product.safetyCertificates.map((cert) => {
                                            const isExpired = new Date(cert.expiryDate) < new Date();
                                            const isExpiringSoon = !isExpired && new Date(cert.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                                            // Find matching document by name match (optional)
                                            const matchedDoc = product.documents?.find(d =>
                                                d.name.toLowerCase().includes(cert.certName.toLowerCase().split(" ")[0])
                                            );
                                            return (
                                                <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy-lighter)]">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-[var(--color-warm-white)]">{cert.certName}</p>
                                                        <p className="text-xs text-[var(--color-slate)]">{cert.certNumber} · {cert.issuingBody}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                                        {matchedDoc && (
                                                            <a href={matchedDoc.url} target="_blank" rel="noopener noreferrer"
                                                                className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors font-medium">
                                                                View Doc ↗
                                                            </a>
                                                        )}
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isExpired ? "bg-red-500/10 text-[var(--color-danger)]" :
                                                            isExpiringSoon ? "bg-yellow-500/10 text-[var(--color-warning)]" :
                                                                "bg-green-500/10 text-[var(--color-success)]"
                                                            }`}>
                                                            {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Valid"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* All compliance docs as a direct list */}
                                    {product.documents && product.documents.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <p className="text-xs text-[var(--color-slate)] mb-3 font-semibold uppercase tracking-wider">Attached Documents</p>
                                            <div className="space-y-2">
                                                {product.documents.map(doc => (
                                                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy)] hover:border-[var(--color-gold)] border border-[var(--color-border-subtle)] transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg">📄</span>
                                                            <span className="text-sm text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors">{doc.name}</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-[var(--color-gold)] opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Documentation & Guides */}
                            {(product.installGuideUrl || product.dismantleGuideUrl || product.installationGuides.length > 0 || (product.documents && product.documents.length > 0)) && (
                                <div className="glass rounded-xl p-5 mb-6">
                                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-4">DOCUMENTATION</h3>

                                    {/* Link-based Documentation */}
                                    {(product.installGuideUrl || product.dismantleGuideUrl) && (
                                        <div className="space-y-2 mb-4">
                                            {product.installGuideUrl && (
                                                <a href={product.installGuideUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy-lighter)] hover:border-[var(--color-gold)] border border-transparent transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg">🛠️</span>
                                                        <span className="text-sm font-medium text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors">Installation Guide</span>
                                                    </div>
                                                    <span className="text-xs text-[var(--color-gold)] opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                                                </a>
                                            )}
                                            {product.dismantleGuideUrl && (
                                                <a href={product.dismantleGuideUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy-lighter)] hover:border-[var(--color-gold)] border border-transparent transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg">🔧</span>
                                                        <span className="text-sm font-medium text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors">Dismantling Procedure</span>
                                                    </div>
                                                    <span className="text-xs text-[var(--color-gold)] opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Uploaded Documents */}
                                    {product.documents && product.documents.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {product.documents.map(doc => (
                                                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy-lighter)] hover:border-[var(--color-gold)] border border-transparent transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg">📄</span>
                                                        <span className="text-sm font-medium text-[var(--color-warm-white)] group-hover:text-[var(--color-gold)] transition-colors">{doc.name}</span>
                                                    </div>
                                                    <span className="text-xs text-[var(--color-gold)] opacity-0 group-hover:opacity-100 transition-opacity">Download ↓</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Installation Guides Accordion */}
                                    {Array.isArray(product.installationGuides) && product.installationGuides.length > 0 && (
                                        <div className="space-y-4">
                                            {product.installationGuides.map((guide) => (
                                                <div key={guide.id} className="rounded-xl bg-[var(--color-navy)] border border-[var(--color-border-subtle)] overflow-hidden">
                                                    <button
                                                        onClick={() => setOpenGuide(openGuide === guide.id ? null : guide.id)}
                                                        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-[var(--color-navy-lighter)]"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">
                                                                {guide.guideType === 'install' ? '🛠️' : guide.guideType === 'dismantle' ? '🔧' : '📄'}
                                                            </span>
                                                            <span className="text-base font-semibold text-[var(--color-warm-white)]">
                                                                {guideTypeLabels[guide.guideType] || guide.guideType}
                                                            </span>
                                                        </div>
                                                        <svg
                                                            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                                            className={`text-[var(--color-gold)] transition-transform duration-300 ${openGuide === guide.id ? "rotate-180" : ""}`}
                                                        >
                                                            <polyline points="6 9 12 15 18 9" />
                                                        </svg>
                                                    </button>
                                                    {openGuide === guide.id && (
                                                        <div className="px-6 pb-6 border-t border-[var(--color-border-subtle)] bg-[var(--color-navy-lighter)]/30">
                                                            <div className="pt-5 space-y-6">
                                                                {/* Steps */}
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-widest mb-3">Procedure Steps</p>
                                                                    <div className="text-sm text-[var(--color-warm-white)] leading-relaxed whitespace-pre-line">
                                                                        {guide.content}
                                                                    </div>
                                                                </div>

                                                                {/* logistics row */}
                                                                {(guide.requiredManpower || guide.estimatedTime) && (
                                                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-[var(--color-border-subtle)]">
                                                                        {guide.requiredManpower && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm">👥</span>
                                                                                <div className="text-xs">
                                                                                    <span className="text-[var(--color-slate)] block">Manpower</span>
                                                                                    <span className="text-[var(--color-warm-white)] font-medium">{guide.requiredManpower} persons</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {guide.estimatedTime && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm">⏱️</span>
                                                                                <div className="text-xs">
                                                                                    <span className="text-[var(--color-slate)] block">Est. Time</span>
                                                                                    <span className="text-[var(--color-warm-white)] font-medium">{guide.estimatedTime}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* tools row */}
                                                                {guide.toolsRequired && (
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="text-sm mt-0.5">⚙️</span>
                                                                        <div className="text-xs">
                                                                            <span className="text-[var(--color-slate)] block mb-1 uppercase tracking-wider font-bold text-[9px]">Tools Required</span>
                                                                            <span className="text-[var(--color-warm-white)] font-medium leading-relaxed">{guide.toolsRequired}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Advanced Availability Timeline */}
                            <AvailabilityTimeline productId={product.id} />

                            {/* Add to Cart / Availability Check */}
                            <div className="glass rounded-xl p-5">
                                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider text-[var(--color-gold)] mb-4">ADD TO CART</h3>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="text-xs text-[var(--color-slate)] mb-1 block">Start Date</label>
                                        <input type="date" value={startDate}
                                            min={new Date().toLocaleDateString('en-CA')}
                                            onChange={(e) => {
                                                setStartDate(e.target.value);
                                                if (endDate && e.target.value > endDate) {
                                                    setEndDate(e.target.value);
                                                }
                                            }}
                                            className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--color-slate)] mb-1 block">End Date</label>
                                        <input type="date" value={endDate}
                                            min={startDate || new Date().toLocaleDateString('en-CA')}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] text-[var(--color-warm-white)] focus:border-[var(--color-gold)] focus:outline-none text-sm" />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs text-[var(--color-slate)] mb-1 block">Quantity</label>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-warm-white)] hover:border-[var(--color-gold)] transition-colors">
                                            −
                                        </button>
                                        <span className="text-lg font-semibold text-[var(--color-warm-white)] px-4 text-center whitespace-nowrap min-w-[3rem]">{quantity} {product.unit}</span>
                                        <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-[var(--color-navy-lighter)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-warm-white)] hover:border-[var(--color-gold)] transition-colors">
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Live Availability Check */}
                                {checkingAvailability && (
                                    <div className="flex items-center gap-2 mb-4 text-xs text-[var(--color-slate)]">
                                        <div className="w-3 h-3 border border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
                                        Checking availability...
                                    </div>
                                )}
                                {!checkingAvailability && availability && (
                                    <div className={`flex items-center gap-2 mb-4 text-xs font-semibold p-2.5 rounded-lg border ${availability.available
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                        }`}>
                                        <span>{availability.available ? "✅" : "❌"}</span>
                                        {availability.available
                                            ? `Available — ${availability.unitsAvailable} unit${availability.unitsAvailable !== 1 ? "s" : ""} free for these dates`
                                            : `Not available for the selected dates`
                                        }
                                    </div>
                                )}
                                {!checkingAvailability && !availability && startDate && endDate && (
                                    <div className="flex items-center gap-2 mb-4 text-xs text-[var(--color-slate)]">
                                        <div className="dot-available" />
                                        <span>Subject to final approval during quoting</span>
                                    </div>
                                )}
                                {(!startDate || !endDate) && (
                                    <div className="flex items-center gap-2 mb-4 text-xs text-[var(--color-slate)]">
                                        <div className="dot-available" />
                                        <span>Select dates above to check availability</span>
                                    </div>
                                )}

                                <button
                                    onClick={addToCart}
                                    disabled={!startDate || !endDate || addingToCart}
                                    className={`w-full transition-all ${cartAdded
                                        ? "bg-green-500 text-white py-3.5 rounded-xl font-bold font-[family-name:var(--font-heading)] tracking-wider"
                                        : "btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                                        }`}
                                >
                                    {cartAdded ? "✓ ADDED TO CART" : addingToCart ? "Adding..." : "Add to Cart"}
                                </button>

                                {cartAdded && (
                                    <div className="mt-4 text-center">
                                        <Link href="/cart" className="text-sm text-[var(--color-gold)] hover:underline font-medium">
                                            View Cart →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
