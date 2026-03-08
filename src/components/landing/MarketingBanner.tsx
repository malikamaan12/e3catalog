"use client";

import { useState, useEffect } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { X, Tag } from "lucide-react";
import Link from "next/link";

export function MarketingBanner() {
    const { getSetting, loading } = useSiteSettings();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!loading) {
            const isActive = getSetting('marketing_banner_active') === 'true';
            const dismissed = sessionStorage.getItem('marketing_banner_dismissed') === 'true';
            if (isActive && !dismissed) {
                setIsVisible(true);
            }
        }
    }, [loading, getSetting]);

    if (!isVisible) return null;

    const dismissBanner = () => {
        setIsVisible(false);
        sessionStorage.setItem('marketing_banner_dismissed', 'true');
    };

    return (
        <div className="bg-gradient-to-r from-[var(--color-navy)] via-blue-900 to-[var(--color-navy)] text-[var(--color-warm-white)] px-4 py-2 relative border-b border-[var(--color-gold)]/30 shadow-[0_4px_20px_rgba(201,168,76,0.1)] z-[100]">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs md:text-sm font-bold">
                <div className="flex-1 flex items-center justify-center gap-2">
                    <Tag className="w-4 h-4 text-[var(--color-gold)] animate-pulse" />
                    <span className="drop-shadow-md">
                        {getSetting('marketing_banner_text', 'Special promotions available now!')}
                    </span>
                    <Link href="/catalog" className="ml-2 text-[var(--color-gold)] hover:text-white underline underline-offset-2 transition-colors">
                        Shop Now
                    </Link>
                </div>
                <button
                    onClick={dismissBanner}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors absolute right-2 top-1/2 -translate-y-1/2"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
