import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)]">
            {/* CTA Banner */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="glass rounded-2xl p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.2), transparent 70%)" }} />
                    <div className="relative z-10">
                        <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold mb-4">
                            Ready to Elevate Your Event?
                        </h2>
                        <p className="text-[var(--color-slate)] text-lg mb-8 max-w-2xl mx-auto">
                            Browse our premium fleet of staging, lighting, sound, and furniture — and generate a professional quote in minutes.
                        </p>
                        <Link href="/catalog" className="btn-primary text-lg !py-3 !px-8">
                            Explore the Fleet
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
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
                                alt="E3 Rentals Logo"
                                className="h-8 md:h-10 w-auto object-contain block"
                                style={{ display: 'block' }}
                            />
                        </div>
                        <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                            The digital operating system for event rentals. Enterprise-grade logistics, premium inventory.
                        </p>
                    </div>

                    {/* Equipment */}
                    <div>
                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider mb-4 text-[var(--color-gold)]">EQUIPMENT</h4>
                        <div className="flex flex-col gap-2">
                            <Link href="/catalog?category=staging-trusses" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Staging & Trusses</Link>
                            <Link href="/catalog?category=lighting" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Lighting</Link>
                            <Link href="/catalog?category=sound-audio" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Sound & Audio</Link>
                            <Link href="/catalog?category=furniture-decor" className="text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors">Furniture & Décor</Link>
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider mb-4 text-[var(--color-gold)]">COMPANY</h4>
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-[var(--color-slate)]">About Us</span>
                            <span className="text-sm text-[var(--color-slate)]">Safety Standards</span>
                            <span className="text-sm text-[var(--color-slate)]">Delivery Zones</span>
                            <span className="text-sm text-[var(--color-slate)]">Careers</span>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-[family-name:var(--font-heading)] font-semibold text-sm tracking-wider mb-4 text-[var(--color-gold)]">CONTACT</h4>
                        <div className="flex flex-col gap-2 text-sm text-[var(--color-slate)]">
                            <span>+971 4 555 0000</span>
                            <span>info@e3rentals.com</span>
                            <span>Dubai, UAE</span>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-[var(--color-border-subtle)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[var(--color-slate)]">
                        © 2026 E3 Rentals. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="text-xs text-[var(--color-slate)]">TUV Certified</span>
                        <span className="text-xs text-[var(--color-slate)]">ISO 9001</span>
                        <span className="text-xs text-[var(--color-slate)]">OSHA Compliant</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
