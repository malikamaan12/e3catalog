"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { USER_ROLES, KYC_STATUS } from "@/lib/constants";

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
    Truck,
    QrCode,
    Users,
    CreditCard,
    CalendarDays,
    LineChart
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import Sidebar from "@/components/admin/Sidebar";
import AdminSearch from "@/components/admin/AdminSearch";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [user, setUser] = useState<any>(null);

    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.VENDOR] },
        { href: "/admin/products", label: user?.role === USER_ROLES.VENDOR || user?.role === USER_ROLES.SALES_REP ? "My Catalog" : "Products", icon: Package, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP, USER_ROLES.VENDOR] },
        { href: "/admin/inventory", label: "Inventory", icon: Warehouse, roles: ["admin", "super_admin", "warehouse_manager", "vendor"] },
        { href: "/admin/warehouses", label: "Warehouses", icon: Building, roles: ["admin", "super_admin", "warehouse_manager", "vendor"] },
        { href: "/admin/fleet", label: "Fleet & Logistics", icon: QrCode, roles: ["admin", "super_admin", "warehouse_manager", "vendor"] },
        { href: "/admin/categories", label: "Categories", icon: Tags, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP] },
        { href: "/admin/analytics", label: "Analytics & Finance", icon: LineChart, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.VENDOR] },
        { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.VENDOR] },
        { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.VENDOR] },
        { href: "/admin/chat", label: "Messages", icon: MessageSquareMore, hasBadge: true, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP, USER_ROLES.VENDOR] },
        { href: "/admin/vendor/profile", label: "Company Profile", icon: Building, roles: [USER_ROLES.VENDOR] },
        { href: "/admin/vendor/team", label: "Team Management", icon: Users, roles: [USER_ROLES.VENDOR] },
        { href: "/admin/vendor/payouts", label: "Payouts & Ledger", icon: CreditCard, roles: [USER_ROLES.VENDOR] },
        { href: "/admin/vendor/settings", label: "Account Settings", icon: Settings, roles: [USER_ROLES.VENDOR] },
        { href: "/admin/certificates", label: "Certificates", icon: ShieldCheck, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP] },
        { href: "/admin/settings/billing", label: "Billing Logic", icon: Settings, roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    ];

    const superAdminItems = [
        { href: "/admin/super", label: "Super Admin", icon: Lock, roles: [USER_ROLES.SUPER_ADMIN] },
        { href: "/admin/super/vendors", label: "Vendors", icon: ShieldCheck, roles: [USER_ROLES.SUPER_ADMIN] },
        { href: "/admin/super/sitemap", label: "Sitemap", icon: Package, roles: [USER_ROLES.SUPER_ADMIN] },
    ];

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Filter items based on user role
    const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

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

    if (user?.role === USER_ROLES.VENDOR && user?.kycStatus === KYC_STATUS.PENDING) {
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

    if (user?.role === USER_ROLES.VENDOR && user?.kycStatus === KYC_STATUS.REJECTED) {
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
        <div className="min-h-screen pt-20 relative overflow-x-hidden">
            <Sidebar 
                items={visibleNavItems}
                superAdminItems={superAdminItems}
                user={user}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                unreadCount={unreadTotal}
                onSearchClick={() => setIsSearchOpen(true)}
            />

            <AdminSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            <main 
                className={`transition-all duration-300 p-4 sm:p-6 md:p-8 min-w-0 max-w-full overflow-x-hidden ${
                    isCollapsed ? "lg:ml-[100px]" : "lg:ml-[280px]"
                }`}
            >
                {children}
            </main>
        </div>
    );
}
