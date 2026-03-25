import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShieldCheck, Zap } from "lucide-react";

interface ProductCardProps {
    slug: string;
    name: string;
    shortDescription: string | null;
    pricePerDay: number;
    pricePerHour: number | null;
    dimensions?: string | null;
    totalUnits?: number;
    thumbnailUrl: string | null;
    category?: { name: string; slug: string } | null;
    currentAvailableUnits?: number;
    showPrice?: boolean;
    priceType?: string;
    unit?: string;
    itemCode?: string | null;
    averageRating?: number | null;
    reviewCount?: number | null;
}

export const ProductCard = memo(function ProductCard({
    slug,
    name,
    pricePerDay,
    thumbnailUrl,
    category,
    currentAvailableUnits,
    totalUnits = 0,
    showPrice,
    priceType,
    unit,
    itemCode,
}: ProductCardProps) {
    const available = currentAvailableUnits !== undefined ? currentAvailableUnits : totalUnits;

    let availabilityStatus = "unavailable";
    let availabilityLabel = "Out of Stock";

    if (available > 0) {
        const percentage = totalUnits > 0 ? available / totalUnits : 0;
        if (percentage > 0.2 && available > 2) {
            availabilityStatus = "available";
            availabilityLabel = `${available} in stock`;
        } else {
            availabilityStatus = "limited";
            availabilityLabel = `Only ${available} left`;
        }
    }

    return (
        <Link href={`/catalog/${slug}`} className="group relative bg-[#0d152a] rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-500 hover:border-gold/30 hover:shadow-2xl hover:shadow-gold/5 flex flex-col h-full">
            {/* Thumbnail Header */}
            <div className="relative aspect-video overflow-hidden bg-[#f5f5f7] flex items-center justify-center p-6">
                {thumbnailUrl ? (
                    <Image
                        src={thumbnailUrl}
                        alt={name}
                        fill
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, (max-width: 1920px) 20vw, 16vw"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <Zap className="w-12 h-12 text-gold" />
                    </div>
                )}
                


                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d152a] via-transparent to-transparent opacity-60" />
            </div>

            {/* Product Meta */}
            <div className="p-6 flex flex-col flex-1">
                {/* Meta Tags (Category & Availability) */}
                <div className="flex justify-between items-center mb-4">
                    {category && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80 bg-gold/5 border border-gold/10 px-2 py-1 rounded">
                            {category.name}
                        </span>
                    )}
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full dot-${availabilityStatus} animate-pulse shadow-[0_0_10px_currentColor] opacity-80`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate">
                            {availabilityStatus}
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="font-bold text-lg text-white leading-tight line-clamp-2 min-h-[3.5rem] group-hover:text-gold transition-colors">
                        {name}
                    </h3>
                    {itemCode && (
                        <p className="text-[10px] font-black text-white/30 mt-2 uppercase tracking-[0.2em]">
                            REF: {itemCode}
                        </p>
                    )}
                </div>

                <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate uppercase tracking-widest mb-1">Price / Day</span>
                            {showPrice === false ? (
                                <span className="text-sm font-bold text-slate">On Request</span>
                            ) : (
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-white tracking-tighter">{pricePerDay}</span>
                                    <span className="text-xs text-slate font-medium">QAR</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="w-12 h-12 rounded-full glass border border-gold/20 flex items-center justify-center group-hover:bg-gold group-hover:text-navy transition-all duration-300">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
});
