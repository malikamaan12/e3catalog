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
            <div className="relative aspect-[4/3] overflow-hidden bg-navy">
                {thumbnailUrl ? (
                    <Image
                        src={thumbnailUrl}
                        alt={name}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 33vw"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <Zap className="w-12 h-12 text-gold" />
                    </div>
                )}
                
                {/* Status Badges Overlay */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                    {category && (
                        <span className="glass-light text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full text-white/70">
                            {category.name}
                        </span>
                    )}
                    <div className={`glass-light backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
                        <div className={`w-1.5 h-1.5 rounded-full dot-${availabilityStatus} animate-pulse`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                            {availabilityStatus}
                        </span>
                    </div>
                </div>

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d152a] via-transparent to-transparent opacity-60" />
            </div>

            {/* Product Meta */}
            <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                    <h3 className="font-bold text-lg text-white leading-tight line-clamp-2 min-h-[3.5rem] group-hover:text-gold transition-colors">
                        {name}
                    </h3>
                    {itemCode && (
                        <p className="text-[10px] font-black text-gold/40 mt-1 uppercase tracking-[0.2em]">
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
                        
                        <div className="w-10 h-10 rounded-full glass border border-gold/20 flex items-center justify-center group-hover:bg-gold group-hover:text-navy transition-all duration-300">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
