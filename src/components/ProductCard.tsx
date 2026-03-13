import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

interface ProductCardProps {
    slug: string;
    name: string;
    shortDescription: string | null;
    pricePerDay: number;
    pricePerHour: number | null;
    dimensions: string | null;
    totalUnits: number;
    condition: string;
    thumbnailUrl: string | null;
    category?: { name: string; slug: string } | null;
    currentAvailableUnits?: number; // Injected by API
    showPrice?: boolean;
    priceType?: string;
    priceRangeMax?: number | null;
    unit?: string;
    itemCode?: string | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    vendor?: { companyName: string; scoreRating: number | null } | null;
}

export function ProductCard({
    slug,
    name,
    shortDescription,
    pricePerDay,
    pricePerHour,
    dimensions,
    totalUnits,
    condition,
    thumbnailUrl,
    category,
    currentAvailableUnits,
    showPrice,
    priceType,
    priceRangeMax,
    unit,
    itemCode,
    averageRating,
    reviewCount,
    vendor,
}: ProductCardProps) {
    // If we don't have currentAvailableUnits (old API), fallback to totalUnits
    const available = currentAvailableUnits !== undefined ? currentAvailableUnits : totalUnits;

    // Dynamic Traffic Light Logic
    // Green: > 20% of total stock AND > 2 items
    // Yellow: <= 20% of stock OR <= 2 items, but > 0
    // Red: 0 items

    let availabilityStatus = "unavailable";
    let availabilityLabel = "Out of Stock";

    if (available > 0) {
        const percentage = totalUnits > 0 ? available / totalUnits : 0;
        const dispUnit = (unit === 'unit' || !unit) ? 'in stock' : `${unit} in stock`;
        const dispLeft = (unit === 'unit' || !unit) ? 'left' : `${unit} left`;

        if (percentage > 0.2 && available > 2) {
            availabilityStatus = "available"; // Green
            availabilityLabel = `${available} ${dispUnit}`;
        } else {
            availabilityStatus = "limited"; // Yellow
            availabilityLabel = `Only ${available} ${dispLeft}`;
        }
    }

    return (
        <Link href={`/catalog/${slug}`} className="card group block overflow-hidden">
            {/* Thumbnail */}
            <div className="relative h-52 bg-[var(--color-navy-lighter)] overflow-hidden">
                {thumbnailUrl ? (
                    <Image
                        src={thumbnailUrl}
                        alt={name}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[var(--color-slate)] opacity-30">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                )}

                {/* Category badge */}
                {category && (
                    <div className="absolute top-3 left-3">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full glass text-[var(--color-gold)]">
                            {category.name}
                        </span>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] via-transparent to-transparent opacity-60" />
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                        <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--color-warm-white)] leading-tight line-clamp-2 group-hover:text-[var(--color-gold)] transition-colors">
                            {name}
                        </h3>
                        {itemCode && (
                            <p className="text-[10px] font-mono text-[var(--color-gold)] opacity-70 mt-0.5 tracking-wider">
                                {itemCode}
                            </p>
                        )}
                        {vendor && (
                            <p className="text-[10px] text-[var(--color-slate)] mt-1 truncate">
                                By {vendor.companyName}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 mt-1 gap-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[var(--color-slate)] font-medium tracking-wide uppercase">{availabilityLabel}</span>
                            <div className={`dot-${availabilityStatus}`} />
                        </div>
                        {(reviewCount && reviewCount > 0) ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20">
                                <Star className="w-3 h-3 text-[var(--color-gold)] fill-[var(--color-gold)]" />
                                <span className="text-[10px] font-bold text-[var(--color-gold)]">{Number(averageRating).toFixed(1)}</span>
                                <span className="text-[9px] text-[var(--color-gold)]/70">({reviewCount})</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {shortDescription && (
                    <p className="text-xs text-[var(--color-slate)] mb-3 line-clamp-2 leading-relaxed">
                        &quot;{shortDescription}&quot;
                    </p>
                )}

                {dimensions && (
                    <p className="text-xs text-[var(--color-slate)] mb-3 flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                        {dimensions}
                    </p>
                )}

                {/* Price */}
                <div className="flex items-baseline justify-between pt-3 border-t border-[var(--color-border-subtle)]">
                    {showPrice === false ? (
                        <div className="text-sm font-semibold text-[var(--color-slate)]">Price on request</div>
                    ) : (
                        <>
                            <div>
                                {priceRangeMax ? (
                                    <span className="text-sm font-medium text-[var(--color-warm-white)]">Starting from </span>
                                ) : null}
                                <span className="text-lg font-bold gradient-text-gold">{pricePerDay} QAR</span>
                                {priceType === "daily" && <span className="text-xs text-[var(--color-slate)] ml-1">/{(unit === 'unit' || !unit) ? 'day' : `${unit}/day`}</span>}
                                {priceType === "job" && <span className="text-xs text-[var(--color-slate)] ml-1">/job</span>}
                            </div>
                            {(!priceRangeMax && pricePerHour) && (
                                <div className="text-right">
                                    <span className="text-sm text-[var(--color-slate)]">{pricePerHour} QAR</span>
                                    <span className="text-xs text-[var(--color-slate)] ml-0.5">/hr</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Link>
    );
}
