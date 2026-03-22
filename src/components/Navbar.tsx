"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export function Navbar() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [user, setUser] = useState<any>(null);
    const [authLoaded, setAuthLoaded] = useState(false); // prevents Sign In flash
    const { getSetting } = useSiteSettings();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const [userRes, cartRes] = await Promise.all([
                fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
                fetch("/api/cart", { credentials: "include", cache: "no-store" }),
            ]);
            const userData = userRes.ok ? await userRes.json() : { user: null };
            const cartData = cartRes.ok ? await cartRes.json() : [];
            setUser(userData.user || null);
            if (Array.isArray(cartData)) setCartCount(cartData.length);
        } catch (err) {
            console.error("Navbar Refresh Error:", err);
            setUser(null);
        } finally {
            setAuthLoaded(true);
        }
    }, []);

    useEffect(() => {
        refreshUser();
        // Close mobile menu on route change
        setMobileOpen(false);

        // Listen for cart refresh events from other components (like Add to Cart button)
        window.addEventListener("cartUpdated", refreshUser);
        return () => window.removeEventListener("cartUpdated", refreshUser);
    }, [pathname, refreshUser]);

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    };

    const isAnyAdmin = ["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"].includes(user?.role);
    const isAdmin = user?.role === "admin" || user?.role === "super_admin";
    const isSuperAdmin = user?.role === "super_admin";
    const isVendor = user?.role === "vendor";
    const isClient = user && !isAnyAdmin;
    const isSalesRepAdmin = ["admin", "super_admin", "sales_rep"].includes(user?.role);
    const hasProductsAccess = ["admin", "super_admin", "sales_rep", "vendor"].includes(user?.role);
    const hasInventoryAccess = ["admin", "super_admin", "warehouse_manager", "vendor"].includes(user?.role);

    const inDashboard = pathname.startsWith("/dashboard");
    const isCatalogVisible = getSetting("feature_catalog_visible", "true") === "true";

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? "backdrop-blur-2xl bg-navy/30 border-b border-white/10 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]" : "bg-transparent py-6"}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">

                {/* ── Logo ── */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <img
                        src="/logo.png"
                        alt="E3 Rentals Logo"
                        className="h-10 md:h-12 w-auto object-contain block"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <span className="hidden font-bold text-xl gradient-text-gold">{getSetting('site_name', 'E3 RENTALS')}</span>
                </Link>

                {/* ── Desktop Nav ── */}
                <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
                    {isAnyAdmin && (
                        <>
                            <NavLink href="/admin" label="Dashboard" exact />
                            {hasProductsAccess && <NavLink href="/admin/products" label={isVendor ? "My Catalog" : "Products"} />}
                            {hasInventoryAccess && <NavLink href="/admin/inventory" label="Inventory" />}
                            {isAnyAdmin && <NavLink href="/admin/bookings" label="Bookings" />}
                            {isSalesRepAdmin && <NavLink href="/admin/categories" label="Categories" />}
                            {isCatalogVisible && <NavLink href="/catalog" label="View Catalog" />}
                        </>
                    )}
                    {isClient && (
                        <>
                            {isCatalogVisible && <NavLink href="/catalog" label="Catalog" />}
                            <NavLink href="/dashboard" label="Dashboard" exact />
                            <NavLink href="/dashboard/quotes" label="My Quotes" />
                            <NavLink href="/dashboard/bookings" label="My Bookings" />
                        </>
                    )}
                    {!user && authLoaded && (
                        <>
                            {isCatalogVisible && <NavLink href="/catalog" label="Catalog" />}
                        </>
                    )}
                </div>

                {/* ── Right Side ── */}
                <div className="flex items-center gap-3 shrink-0">

                    {/* Auth loaded + logged in */}
                    {authLoaded && user && (
                        <>
                            {isClient && <NotificationBell />}
                            {isClient && (
                                <Link href="/cart" className="relative p-2.5 rounded-xl hover:bg-white/5 transition-colors hidden md:inline-flex group">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                        <path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                    </svg>
                                    {cartCount > 0 && (
                                        <motion.span 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-navy text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-gold/40 animate-pulse-slow"
                                        >
                                            {cartCount}
                                        </motion.span>
                                    )}
                                </Link>
                            )}

                            {/* Avatar dropdown */}
                            <div className="relative group hidden md:block">
                                <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full glass border border-white/10 hover:border-[var(--color-gold)]/30 transition-all">
                                    <div className="w-7 h-7 rounded-full overflow-hidden gradient-gold flex items-center justify-center text-xs font-bold text-[var(--color-navy)] border border-white/10">
                                        {user.image ? (
                                            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            user.name?.charAt(0)?.toUpperCase() || "?"
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-[var(--color-warm-white)]">{user.name?.split(" ")[0]}</span>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40 group-hover:rotate-180 transition-transform duration-300"><polyline points="6 9 12 15 18 9" /></svg>
                                </button>
                                <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl glass border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 scale-95 group-hover:scale-100 origin-top-right shadow-2xl overflow-hidden py-1 z-[100] backdrop-blur-xl">
                                    <div className="px-4 py-2.5 border-b border-white/5 bg-white/5">
                                        <p className="text-[11px] font-medium text-[var(--color-warm-white)] truncate">{user.email}</p>
                                        <p className="text-[10px] font-extrabold text-[var(--color-gold)] mt-0.5 tracking-tighter uppercase whitespace-nowrap">
                                            {isSuperAdmin ? "✨ SUPER ADMIN" : isAdmin ? "🛡️ ADMINISTRATOR" : isVendor ? "🏪 VENDOR ACCOUNT" : "👤 CLIENT ACCOUNT"}
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        {isAnyAdmin ? (
                                            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-warm-white)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold)] transition-all">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                                                Admin Dashboard
                                            </Link>
                                        ) : (
                                            <>
                                                <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-warm-white)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold)] transition-all">My Dashboard</Link>
                                                <Link href="/dashboard/quotes" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-warm-white)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold)] transition-all">My Quotes</Link>
                                                <Link href="/dashboard/bookings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-warm-white)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold)] transition-all">My Bookings</Link>
                                                <Link href="/dashboard/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-warm-white)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-gold)] transition-all">My Profile</Link>
                                            </>
                                        )}
                                    </div>
                                    <div className="border-t border-white/10 mt-1" />
                                    <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Auth loaded + not logged in — show Sign In / Sign Up */}
                    {authLoaded && !user && (
                        <div className="hidden md:flex items-center gap-3 border-l border-[var(--color-border-subtle)] pl-3">
                            <Link href="/login" className="text-sm tracking-wide text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-colors">Sign In</Link>
                            <Link href="/signup" className="text-sm font-medium text-[var(--color-navy)] bg-[var(--color-gold)] px-4 py-1.5 rounded-lg hover:bg-[var(--color-gold-lighter)] transition-colors">Sign Up</Link>
                        </div>
                    )}

                    {/* Auth not loaded yet — invisible placeholder so layout doesn't shift */}
                    {!authLoaded && <div className="hidden md:block w-24 h-8" />}

                    {/* Cart visible for client on small screens */}
                    {isClient && (
                        <Link href="/cart" className="md:hidden relative p-2 rounded-lg hover:bg-[var(--color-navy-lighter)] transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-gold)] text-[var(--color-navy)] text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
                        </Link>
                    )}

                    {/* Mobile hamburger */}
                    <button className="md:hidden p-2" onClick={() => setMobileOpen(o => !o)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            {mobileOpen ? (
                                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                            ) : (
                                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Mobile Menu (Enhanced Drawer) ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 bg-navy/80 backdrop-blur-md z-[110] md:hidden"
                        />
                        
                        {/* Drawer Content */}
                        <motion.div 
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 250 }}
                            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#0a0f1e]/95 backdrop-blur-3xl border-l border-white/10 z-[120] md:hidden shadow-2xl flex flex-col pt-24 px-8 pb-12"
                        >
                            <motion.div 
                                initial="closed"
                                animate="open"
                                variants={{
                                    open: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
                                    closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
                                }}
                                className="flex flex-col gap-2 overflow-y-auto pr-2"
                            >
                                {isAnyAdmin && (
                                    <>
                                        <DrawerItem>
                                            <div className="text-[10px] font-black text-gold uppercase tracking-[0.3em] mb-4 opacity-50 px-2 font-[family-name:var(--font-heading)]">Admin Hub</div>
                                        </DrawerItem>
                                        <DrawerItem><MobileLink href="/admin" label="🏠 Dashboard" close={() => setMobileOpen(false)} /></DrawerItem>
                                        <DrawerItem>{hasProductsAccess && <MobileLink href="/admin/products" label={isVendor ? "📦 My Catalog" : "📦 Products"} close={() => setMobileOpen(false)} />}</DrawerItem>
                                        <DrawerItem>{hasInventoryAccess && <MobileLink href="/admin/inventory" label="🏗️ Inventory" close={() => setMobileOpen(false)} />}</DrawerItem>
                                        <DrawerItem>{isAnyAdmin && <MobileLink href="/admin/bookings" label="📅 Bookings" close={() => setMobileOpen(false)} />}</DrawerItem>
                                        <DrawerItem>{isSalesRepAdmin && <MobileLink href="/admin/categories" label="🏷️ Categories" close={() => setMobileOpen(false)} />}</DrawerItem>
                                        <DrawerItem><div className="h-px bg-white/5 my-6 mx-2" /></DrawerItem>
                                        <DrawerItem><button onClick={logout} className="text-left text-sm text-red-400 hover:text-red-300 px-2 py-2 font-bold">🚪 Sign Out</button></DrawerItem>
                                    </>
                                )}
                                {isClient && (
                                    <>
                                        <DrawerItem>
                                            <div className="flex items-center gap-3.5 px-4 py-5 mb-8 glass rounded-[2rem] border border-white/10 shadow-xl">
                                                <div className="w-12 h-12 rounded-full overflow-hidden gradient-gold flex items-center justify-center text-sm font-bold text-navy border border-white/10 shadow-lg shadow-gold/20">
                                                    {user.image ? (
                                                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.name?.charAt(0)?.toUpperCase() || "?"
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white truncate">{user.name}</p>
                                                    <p className="text-[9px] text-gold font-black tracking-widest uppercase opacity-70">Fleet Client</p>
                                                </div>
                                            </div>
                                        </DrawerItem>
                                        
                                        <DrawerItem><MobileLink href="/catalog" label="🛍️ Equipment Catalog" close={() => setMobileOpen(false)} /></DrawerItem>
                                        <DrawerItem><MobileLink href="/dashboard" label="🏠 My Dashboard" close={() => setMobileOpen(false)} /></DrawerItem>
                                        <DrawerItem><MobileLink href="/dashboard/quotes" label="📄 My Quotes" close={() => setMobileOpen(false)} /></DrawerItem>
                                        <DrawerItem><MobileLink href="/dashboard/bookings" label="📅 My Bookings" close={() => setMobileOpen(false)} /></DrawerItem>
                                        <DrawerItem><MobileLink href="/dashboard/profile" label="👤 My Profile" close={() => setMobileOpen(false)} /></DrawerItem>
                                        <DrawerItem><MobileLink href="/cart" label="🛒 My Cart" close={() => setMobileOpen(false)} /></DrawerItem>
                                        
                                        <DrawerItem><div className="h-px bg-white/5 my-6 mx-2" /></DrawerItem>
                                        <DrawerItem><button onClick={logout} className="text-left text-sm text-red-500 hover:text-red-400 px-2 py-2 font-bold">🚪 Logout</button></DrawerItem>
                                    </>
                                )}
                                {!user && authLoaded && (
                                    <>
                                        <DrawerItem><div className="text-[10px] font-black text-gold uppercase tracking-[0.3em] mb-4 opacity-50 px-2 pt-4 font-[family-name:var(--font-heading)]">Storefront</div></DrawerItem>
                                        <DrawerItem>{isCatalogVisible && <MobileLink href="/catalog" label="🛍️ Equipment Catalog" close={() => setMobileOpen(false)} />}</DrawerItem>
                                        <DrawerItem><MobileLink href="/how-it-works" label="📖 How it Works" close={() => setMobileOpen(false)} /></DrawerItem>
                                        
                                        <DrawerItem>
                                            <div className="mt-12 grid grid-cols-2 gap-3">
                                                <Link 
                                                    href="/login" 
                                                    onClick={() => setMobileOpen(false)}
                                                    className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                                                >
                                                    Sign In
                                                </Link>
                                                <Link 
                                                    href="/signup" 
                                                    onClick={() => setMobileOpen(false)}
                                                    className="w-full py-5 rounded-2xl bg-gold text-navy text-center text-xs font-black uppercase tracking-widest hover:translate-y-[-2px] transition-all shadow-xl shadow-gold/20"
                                                >
                                                    Join
                                                </Link>
                                            </div>
                                        </DrawerItem>
                                    </>
                                )}
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function NavLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
    const pathname = usePathname();
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
        <Link
            href={href}
            className={`text-sm font-medium tracking-wide transition-colors duration-200 ${active ? "text-[var(--color-gold)]" : "text-[var(--color-slate)] hover:text-[var(--color-gold)]"}`}
        >
            {label}
        </Link>
    );
}

function MobileLink({ href, label, close }: { href: string; label: string; close: () => void }) {
    const pathname = usePathname();
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
        <Link
            href={href}
            onClick={close}
            className={`text-sm px-4 py-3 rounded-2xl transition-all flex items-center gap-3 ${active ? "text-gold bg-gold/10 font-black shadow-inner shadow-gold/5" : "text-slate hover:text-white hover:bg-white/5"}`}
        >
            {label}
        </Link>
    );
}

function DrawerItem({ children }: { children: React.ReactNode }) {
    return (
        <motion.div variants={{
            open: { y: 0, opacity: 1, transition: { y: { stiffness: 1000, velocity: -100 } } },
            closed: { y: 50, opacity: 0, transition: { y: { stiffness: 1000 } } }
        }}>
            {children}
        </motion.div>
    );
}
