"use client";

import Link from "next/link";
import { useSiteSettings } from "./SiteSettingsProvider";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

export function Footer() {
    const { getSetting } = useSiteSettings();

    const [year, setYear] = useState<number | string>("");

    const siteName = getSetting("site_name", "E3 Rentals");
    const contactPhone = getSetting("contact_phone", "+974 4000 0000");
    const contactEmail = getSetting("contact_email", "info@e3rentals.qa");
    const contactLocation = getSetting("contact_location", "Doha, Qatar");
    const footerTagline = getSetting("footer_tagline", "Setting the standard for premium event logistics in the Middle East.");

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    return (
        <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)]">
            {/* CTA Banner */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="glass rounded-2xl p-12 text-center relative overflow-hidden group">
                    {/* Ambient Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(201,168,76,0.15),transparent_70%)] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-surface)]/40 to-[var(--color-surface)] pointer-events-none" />
                    <div className="relative z-10">
                        <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold mb-4">
                            Ready to Build Something Extraordinary?
                        </h2>
                        <p className="text-[var(--color-slate)] text-lg mb-8 max-w-2xl mx-auto">
                            Browse our premium fleet of staging, lighting, sound, and furniture — and generate a professional, MOCI-compliant quote in minutes.
                        </p>
                        <Link href="/signup" className="btn-primary text-lg !py-3 !px-8">
                            Open Your Account
                            <ArrowRight className="w-5 h-5 ml-2 inline" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer Links */}
            <div className="max-w-7xl mx-auto px-6 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <img
                                src="/logo.png"
                                alt={`${siteName} Logo`}
                                className="h-8 md:h-10 w-auto object-contain block"
                                style={{ display: 'block' }}
                            />
                        </div>
                        <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                            {footerTagline}
                        </p>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider mb-4 text-[var(--color-gold)] uppercase">PLATFORM</h4>
                        <div className="flex flex-col gap-2">
                            <Link href="/catalog" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">View Catalog</Link>
                            <Link href="/vendors" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Partner Portal</Link>
                            <Link href="/vendors/register" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Become a Vendor</Link>
                            <Link href="/how-it-works" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">How It Works</Link>
                        </div>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider mb-4 text-[var(--color-gold)] uppercase">LEGAL</h4>
                        <div className="flex flex-col gap-2">
                            <Link href="/vendors/terms" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Vendor Terms</Link>
                            <Link href="/vendors/policy" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Marketplace Policy</Link>
                            <Link href="/privacy" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Privacy Policy</Link>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider mb-4 text-[var(--color-gold)] uppercase">CONTACT</h4>
                        <div className="flex flex-col gap-2 text-sm text-[var(--color-slate)]">
                            <span>{contactLocation}</span>
                            <span>{contactEmail}</span>
                            <span>{contactPhone}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-[var(--color-border-subtle)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[var(--color-slate)]">
                        © {year} {siteName}. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="text-xs text-[var(--color-slate)]">MOCI Event Guidelines</span>
                        <span className="text-xs text-[var(--color-slate)]">Qatar Civil Defence Standards</span>
                        <span className="text-xs text-[var(--color-slate)]">Certified Safety Inspections</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
