"use client";

import { useState, useEffect } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { X, Gift } from "lucide-react";
import Link from "next/link";

export function MarketingPopup() {
    const { getSetting, loading } = useSiteSettings();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!loading) {
            const isActive = getSetting('marketing_popup_active') === 'true';

            // Check if user has already seen and dismissed it this session
            // In a real app you might use localStorage to check if dismissed forever or for X days
            const dismissed = sessionStorage.getItem('marketing_popup_dismissed') === 'true';

            if (isActive && !dismissed) {
                // Slight delay to let the page load before throwing a popup at them
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [loading, getSetting]);

    if (!isVisible) return null;

    const dismissPopup = () => {
        setIsVisible(false);
        sessionStorage.setItem('marketing_popup_dismissed', 'true');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass border border-[var(--color-gold)]/30 rounded-3xl w-full max-w-lg overflow-hidden animate-scale-in relative shadow-[0_0_50px_rgba(201,168,76,0.15)]">

                {/* Close Button */}
                <button
                    onClick={dismissPopup}
                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black flex items-center justify-center transition-all border border-white/10"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Decorative Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-gold)]/10 to-transparent pointer-events-none" />

                <div className="p-8 md:p-12 text-center flex flex-col items-center relative z-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-yellow-600 p-0.5 mb-6 shadow-xl shadow-gold/20">
                        <div className="w-full h-full bg-[var(--color-navy)] rounded-2xl flex items-center justify-center">
                            <Gift className="w-8 h-8 text-[var(--color-gold)]" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black font-[family-name:var(--font-heading)] text-white mb-4 leading-tight">
                        Exclusive Offer
                    </h2>

                    <p className="text-[var(--color-slate)] text-lg mb-8 leading-relaxed">
                        {getSetting('marketing_popup_content', 'Sign up today and get special pricing on your first enterprise staging rental.')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <Link
                            href="/catalog"
                            onClick={dismissPopup}
                            className="bg-gradient-to-r from-[var(--color-gold)] to-yellow-500 text-[var(--color-navy)] px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(201,168,76,0.4)] transition-all flex-1 sm:flex-none text-center"
                        >
                            View Catalog
                        </Link>
                        <button
                            onClick={dismissPopup}
                            className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-all flex-1 sm:flex-none"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
