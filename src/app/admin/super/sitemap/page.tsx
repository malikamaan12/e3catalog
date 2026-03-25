"use client";

import React, { useEffect, useState } from "react";
import { MoveLeft, Map as MapIcon, Globe, MonitorSmartphone, LayoutDashboard, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SuperAdminSitemap() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => {
                if (data?.user?.role === "super_admin") {
                    setIsAuthorized(true);
                } else {
                    router.push("/admin");
                }
            })
            .catch(() => router.push("/login"));
    }, [router]);

    if (isAuthorized === null) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--color-gold)] border-t-transparent animate-spin" />
            </div>
        );
    }

    const routeCategories = [
        {
            title: "Public & Client Routes",
            icon: Globe,
            description: "Endpoints accessible to guests or logged-in clients.",
            links: [
                { path: "/", label: "Landing Home", desc: "Main public entry point" },
                { path: "/how-it-works", label: "How It Works", desc: "Platform explainer page" },
                { path: "/catalog", label: "Main Catalog", desc: "Searchable inventory listing" },
                { path: "/catalog/[slug]", label: "Product Detail", desc: "Individual item view" },
                { path: "/cart", label: "Cart / Request", desc: "Basket for requesting quotes" },
                { path: "/quote/[id]", label: "Client Quote Viewer", desc: "Interactive quote approval UX" },
                { path: "/review/[bookingId]", label: "Booking Review", desc: "Post-event client review form" },
                { path: "/passport/[assetTag]", label: "Asset Passport", desc: "Public QR scan digital passport" },
                { path: "/login", label: "Login", desc: "Centralized login portal" },
                { path: "/signup", label: "Sign Up", desc: "Client registration" },
            ]
        },
        {
            title: "Vendor Onboarding",
            icon: FileText,
            description: "Information and registration for incoming partners.",
            links: [
                { path: "/vendors", label: "Vendor Landing", desc: "Marketing page for vendor signups" },
                { path: "/vendors/register", label: "Vendor Application", desc: "Multi-step tenant registration" },
                { path: "/vendors/policy", label: "Vendor Policy", desc: "Platform operating rules" },
                { path: "/vendors/terms", label: "Terms & Conditions", desc: "Legal requirements" },
            ]
        },
        {
            title: "Vendor Dashboard (Dashboard Area)",
            icon: MonitorSmartphone,
            description: "Tenant-specific operational panels.",
            links: [
                { path: "/dashboard", label: "Vendor Home", desc: "KPIs and overview" },
                { path: "/dashboard/bookings", label: "Bookings", desc: "Vendor-specific order management" },
                { path: "/dashboard/inventory", label: "Inventory", desc: "Vendor fleet overview" },
                { path: "/dashboard/products", label: "Products", desc: "Tenant catalog management" },
                { path: "/dashboard/quote/[id]", label: "Quote Management", desc: "Quote negotiation interface" },
                { path: "/dashboard/quotes", label: "Quotations List", desc: "Pipeline overview" },
                { path: "/dashboard/settlements", label: "Financials", desc: "Ledger and payout requests" },
                { path: "/dashboard/profile", label: "Vendor Profile", desc: "Settings and company details" },
            ]
        },
        {
            title: "Global Administration",
            icon: LayoutDashboard,
            description: "Core ERP routes for operations and internal staff.",
            links: [
                { path: "/admin", label: "Admin Master", desc: "Global command center" },
                { path: "/admin/analytics", label: "Platform Analytics", desc: "Financial and system metrics" },
                { path: "/admin/bookings", label: "Global Bookings", desc: "All system orders" },
                { path: "/admin/bookings/[id]", label: "Booking Pipeline", desc: "Order execution workflow" },
                { path: "/admin/calendar", label: "Master Calendar", desc: "System-wide availability matrix" },
                { path: "/admin/categories", label: "Taxonomy Engine", desc: "Category rules and configuration" },
                { path: "/admin/certificates", label: "Certifications", desc: "Compliance document management" },
                { path: "/admin/chat", label: "Message Center", desc: "Global communication hub" },
                { path: "/admin/financials", label: "Financial Engine", desc: "Platform revenue & ledger" },
                { path: "/admin/fleet", label: "Fleet Tracker", desc: "QR codes & asset circulation" },
                { path: "/admin/fleet/inspection", label: "QR Check In/Out", desc: "Warehouse scanning UI" },
                { path: "/admin/fulfillment/[bookingId]", label: "Warehouse Packing", desc: "Logistics execution UI" },
                { path: "/admin/inventory", label: "Global Inventory", desc: "Real-time stock levels" },
                { path: "/admin/products", label: "Products Database", desc: "All listed items" },
                { path: "/admin/products/add", label: "Add Product", desc: "Listing creation wizard" },
                { path: "/admin/products/edit/[id]", label: "Edit Product", desc: "Listing modification" },
                { path: "/admin/products/global", label: "Global Catalog Sync", desc: "Master item template map" },
                { path: "/admin/settings/billing", label: "Billing Settings", desc: "T&C logic configuration" },
                { path: "/admin/settlements", label: "Payout Management", desc: "Processing vendor payments" },
                { path: "/admin/vendors", label: "Vendor Management", desc: "Tenant list" },
                { path: "/admin/vendors/[id]", label: "Vendor Details", desc: "Tenant drilled-down specifics" },
                { path: "/admin/warehouses", label: "Warehouses", desc: "Logistics location configurations" },
            ]
        },
        {
            title: "Super Admin Capabilities",
            icon: ShieldAlert,
            description: "Restricted architectural and compliance overrides.",
            links: [
                { path: "/admin/super", label: "System Config", desc: "Hard settings and core toggles" },
                { path: "/admin/super/vendors", label: "KYC Approval", desc: "Vendor intake verification" },
                { path: "/admin/super/sitemap", label: "Routing Map", desc: "You are here" },
            ]
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
                <Link 
                    href="/admin" 
                    className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center text-[var(--color-slate)] hover:text-white hover:bg-white/5 transition-colors"
                >
                    <MoveLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black font-[family-name:var(--font-heading)] tracking-tight text-[var(--color-warm-white)] flex items-center gap-3">
                        <MapIcon className="w-8 h-8 text-[var(--color-gold)]" />
                        Platform Sitemap
                    </h1>
                    <p className="text-[var(--color-slate)] mt-2 font-medium max-w-2xl text-sm leading-relaxed">
                        A comprehensive architectural map of all active front-end routes across the E3 Rentals Ecosystem. Organized by module context.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routeCategories.map((cat, i) => (
                    <div key={i} className="glass-dark border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col hover:border-[var(--color-gold)]/20 transition-colors group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] flex items-center justify-center border border-[var(--color-gold)]/20">
                                <cat.icon className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-white group-hover:text-[var(--color-gold)] transition-colors">
                                {cat.title}
                            </h2>
                        </div>
                        <p className="text-xs text-[var(--color-slate)] mb-6 ml-13 h-8">{cat.description}</p>

                        <div className="flex-1 space-y-3">
                            {cat.links.map((link, j) => (
                                <Link 
                                    href={link.path.replace(/\[.*\]/, "1")} // Fallback mock ID for dynamic routes
                                    key={j} 
                                    className="block p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-[var(--color-navy)] hover:border-[var(--color-gold)]/30 transition-all select-none"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-[var(--color-warm-white)] truncate">{link.label}</p>
                                            <p className="text-xs text-[var(--color-slate)] font-mono mt-1 opacity-70 truncate">{link.path}</p>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />
                                    </div>
                                    <p className="text-[10px] text-[var(--color-slate)] mt-2 line-clamp-1">{link.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
