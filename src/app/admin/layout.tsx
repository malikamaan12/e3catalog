"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

import {
    LayoutDashboard,
    Package,
    Warehouse,
    Tags,
    CalendarCheck,
    ShieldCheck,
    Settings,
    MessageSquareMore,
    Lock,
    Building,
    Users,
    CreditCard,
    CalendarDays
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [user, setUser] = useState<any>(null);

    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"] },
        { href: "/admin/products", label: user?.role === "vendor" || user?.role === "sales_rep" ? "My Catalog" : "Products", icon: Package, roles: ["admin", "super_admin", "sales_rep", "vendor"] },
        { href: "/admin/products/global", label: "Global Catalog", icon: Package, roles: ["vendor", "sales_rep"] },
        { href: "/admin/inventory", label: "Inventory", icon: Warehouse, roles: ["admin", "super_admin", "warehouse_manager", "vendor"] },
        { href: "/admin/categories", label: "Categories", icon: Tags, roles: ["admin", "super_admin", "sales_rep"] },
        { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, roles: ["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"] },
        { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, roles: ["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"] },
        { href: "/admin/chat", label: "Messages", icon: MessageSquareMore, hasBadge: true, roles: ["admin", "super_admin", "sales_rep", "vendor"] },
        { href: "/admin/vendor/profile", label: "Company Profile", icon: Building, roles: ["vendor"] },
        { href: "/admin/vendor/team", label: "Team Management", icon: Users, roles: ["vendor"] },
        { href: "/admin/vendor/payouts", label: "Payouts & Ledger", icon: CreditCard, roles: ["vendor"] },
        { href: "/admin/vendor/settings", label: "Account Settings", icon: Settings, roles: ["vendor"] },
        { href: "/admin/certificates", label: "Certificates", icon: ShieldCheck, roles: ["admin", "super_admin", "sales_rep"] },
        { href: "/admin/settings/billing", label: "Billing Logic", icon: Settings, roles: ["admin", "super_admin"] },
    ];

    const superAdminItems = [
        { href: "/admin/super", label: "Super Admin", icon: Lock, roles: ["super_admin"] },
        { href: "/admin/super/vendors", label: "Vendors", icon: ShieldCheck, roles: ["super_admin"] },
    ];

    // Filter items based on user role
    const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await fetch("/api/admin/chat/conversations");
                const data = await res.json();
                if (Array.isArray(data)) {
                    const total = data.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
                    setUnreadTotal(total);
                }
            } catch (e) {
                console.error("Failed to fetch unread total", e);
            }
        };

        const fetchUser = async () => {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();
                setUser(data.user);
            } catch (e) {
                console.error("Failed to fetch user");
            }
        };

        fetchUnread();
        fetchUser();
        const interval = setInterval(fetchUnread, 15000); // Polling every 15s for sidebar badge
        return () => clearInterval(interval);
    }, []);

    if (user?.role === 'vendor' && user?.kycStatus === 'pending') {
        return (
            <div className="min-h-screen pt-20 flex flex-col items-center justify-center p-6 text-center bg-[var(--color-navy)] animate-fade-in">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-yellow-500" />
                </div>
                <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-4">Application Under Review</h1>
                <p className="text-[var(--color-slate)] max-w-md mx-auto mb-8 text-lg">
                    Your vendor application is currently being reviewed by our team. You will receive an email once your account is approved and ready to use.
                </p>
                <button onClick={() => window.location.href = "/"} className="px-6 py-2 rounded-lg font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    Return to Homepage
                </button>
            </div>
        );
    }

    if (user?.role === 'vendor' && user?.kycStatus === 'rejected') {
        return (
            <div className="min-h-screen pt-20 flex flex-col items-center justify-center p-6 text-center bg-[var(--color-navy)] animate-fade-in">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-4">Application Rejected</h1>
                <p className="text-[var(--color-slate)] max-w-md mx-auto mb-8 text-lg">
                    Unfortunately, your vendor application has been rejected at this time. Please contact support for more details.
                </p>
                <button onClick={() => window.location.href = "/"} className="px-6 py-2 rounded-lg font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    Return to Homepage
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 fixed top-20 left-0 bottom-0 bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)] p-6 hidden lg:block">
                    <div className="mb-8 flex items-start justify-between">
                        <div>
                            <h2 className="font-[family-name:var(--font-heading)] text-xs tracking-widest text-[var(--color-gold)] font-semibold mb-1">ADMIN PANEL</h2>
                            <p className="font-[family-name:var(--font-heading)] text-xs text-[var(--color-slate)] uppercase tracking-wider">Management Console</p>
                        </div>
                        <NotificationBell />
                    </div>

                    <nav className="space-y-1">
                        {visibleNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            const showBadge = item.hasBadge && unreadTotal > 0;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all group ${isActive
                                        ? "bg-[var(--color-navy-lighter)] text-[var(--color-gold)]"
                                        : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-[var(--color-navy-lighter)] hover:text-[var(--color-gold)]"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-[var(--color-gold)]" : "text-[var(--color-slate)] group-hover:text-[var(--color-gold)]"}`} />
                                        <span className="font-medium tracking-wide">{item.label}</span>
                                    </div>
                                    {showBadge && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                            {unreadTotal > 9 ? "9+" : unreadTotal}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}

                        {user?.role === "super_admin" && (
                            <>
                                <div className="pt-6 pb-2 px-4 shadow-border-b">
                                    <h3 className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-[0.2em]">Super Admin</h3>
                                </div>
                                {superAdminItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all group ${isActive
                                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                : "text-[var(--color-slate)] hover:text-purple-400 hover:bg-purple-500/5"
                                                }`}
                                        >
                                            <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-purple-400" : "text-[var(--color-slate)] group-hover:text-purple-400"}`} />
                                            <span className="font-medium tracking-wide">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </nav>

                    <div className="absolute bottom-6 left-6 right-6">
                        <Link href="/" className="flex items-center gap-2 text-xs text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors">
                            ← Back to Site
                        </Link>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 lg:ml-64 p-6 md:p-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
