"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
    LayoutDashboard, FileText, CalendarDays, ShoppingBag,
    ShoppingCart, Sparkles, User, Globe, LogOut, Menu, X,
    Truck, Archive, AlertTriangle
} from "lucide-react";

const CLIENT_NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/quotes", label: "My Quotes", icon: FileText, exact: false },
    { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarDays, exact: false },
    { divider: true },
    { href: "/catalog", label: "Browse Catalog", icon: ShoppingBag },
    { href: "/cart", label: "My Cart", icon: ShoppingCart },
    { href: "/catalog?newquote=1", label: "New Quote Request", icon: Sparkles },
    { divider: true },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
];

const WAREHOUSE_NAV_ITEMS = [
    { href: "/dashboard/warehouse/overview", label: "Warehouse Hub", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/warehouse/dispatch", label: "Dispatch Pipeline", icon: Truck, exact: false },
    { href: "/admin/inventory", label: "Inventory Fleet", icon: Archive, exact: false },
    { divider: true },
    { href: "/dashboard/warehouse/inspections", label: "Damage Logs", icon: AlertTriangle },
    { divider: true },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => { if (d.user) setUser(d.user); })
            .catch(() => { });
    }, []);

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    return (
        <div className="min-h-screen pt-20">
            <div className="flex">
                {/* ── Desktop Sidebar ── */}
                <aside className="w-64 fixed top-20 left-0 bottom-0 bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)] p-6 hidden lg:flex flex-col">
                    {/* User Info */}
                    <div className="mb-6 pb-5 border-b border-[var(--color-border-subtle)]">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-[var(--color-navy)]">
                                    {user?.name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--color-warm-white)] truncate">{user?.name || "Loading..."}</p>
                                <p className="text-[10px] text-[var(--color-slate)] truncate">{user?.email}</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-full px-2 py-0.5 mt-1">
                            <span className="w-1 h-1 rounded-full bg-[var(--color-gold)]"></span>
                            {user?.role?.toUpperCase() || "CLIENT"}
                        </span>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)] mb-3">
                        {user?.role === 'warehouse_manager' ? 'Logistics Portal' : 'Client Portal'}
                    </p>

                    <nav className="space-y-0.5 flex-1 overflow-y-auto custom-scrollbar overscroll-contain min-h-0 pb-4">
                        {(user?.role === 'warehouse_manager' ? WAREHOUSE_NAV_ITEMS : CLIENT_NAV_ITEMS).map((item: any, i) => {
                            if (item.divider) return <hr key={`div-${i}`} className="border-white/5 my-2" />;
                            const active = isActive(item.href!, item.exact);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href!}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${active
                                        ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold"
                                        : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-[var(--color-navy-lighter)]"
                                        }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span>{item.label}</span>
                                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"></span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] space-y-1">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-[var(--color-navy-lighter)] transition-all"
                        >
                            <Globe className="h-4 w-4 shrink-0" /> <span>Main Website</span>
                        </Link>
                        <button
                            onClick={async () => {
                                await fetch("/api/auth/logout", { method: "POST" });
                                window.location.href = "/login";
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                        >
                            <LogOut className="h-4 w-4 shrink-0" /> <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* ── Mobile Top Bar ── */}
                <div className="lg:hidden fixed left-0 right-0 top-20 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-widest">
                        {user?.role === 'warehouse_manager' ? 'Logistics Portal' : 'Client Portal'}
                    </span>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="text-[var(--color-slate)] hover:text-[var(--color-warm-white)] transition-colors p-1"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile Dropdown */}
                {mobileOpen && (
                    <div className="lg:hidden fixed left-0 right-0 top-[112px] z-30 bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] p-4 flex flex-col gap-1">
                        {(user?.role === 'warehouse_manager' ? WAREHOUSE_NAV_ITEMS : CLIENT_NAV_ITEMS).map((item: any, i) => {
                            if (item.divider) return <hr key={`div-${i}`} className="border-white/5 my-1" />;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href!}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${isActive(item.href!, item.exact)
                                        ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold"
                                        : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-[var(--color-navy-lighter)]"
                                        }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                        <hr className="border-[var(--color-border-subtle)] my-1" />
                        <button
                            onClick={async () => {
                                await fetch("/api/auth/logout", { method: "POST" });
                                window.location.href = "/login";
                            }}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all text-left"
                        >
                            <LogOut className="h-4 w-4 shrink-0" /> <span>Sign Out</span>
                        </button>
                    </div>
                )}

                {/* ── Main Content ── */}
                <main className="flex-1 lg:ml-64 p-6 md:p-10 pt-14 lg:pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
