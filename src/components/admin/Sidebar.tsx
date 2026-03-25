"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Search,
    LogOut,
    User
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface NavItem {
    href: string;
    label: string;
    icon: any;
    roles: string[];
    hasBadge?: boolean;
}

interface SidebarProps {
    items: NavItem[];
    superAdminItems: NavItem[];
    user: any;
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    unreadCount: number;
    onSearchClick: () => void;
}

export default function Sidebar({
    items,
    superAdminItems,
    user,
    isCollapsed,
    setIsCollapsed,
    unreadCount,
    onSearchClick
}: SidebarProps) {
    const pathname = usePathname();

    const renderLink = (item: NavItem, isSuperAdmin = false) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        const showBadge = item.hasBadge && unreadCount > 0;

        const content = (
            <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                    isActive
                        ? isSuperAdmin 
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/20"
                        : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5"
                }`}
            >
                <div className="flex-shrink-0">
                    <Icon className={`w-5 h-5 transition-colors ${
                        isActive 
                            ? isSuperAdmin ? "text-purple-400" : "text-[var(--color-gold)]"
                            : "text-[var(--color-slate)] group-hover:text-[var(--color-gold)]"
                    }`} />
                </div>
                
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium truncate"
                    >
                        {item.label}
                    </motion.span>
                )}

                {showBadge && (
                    <span className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-3'} bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse`}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}

                {isCollapsed && (
                    <div className={`absolute left-0 w-1 h-6 rounded-r-full transition-all ${
                        isActive 
                            ? isSuperAdmin ? "bg-purple-500" : "bg-[var(--color-gold)]"
                            : "bg-transparent"
                    }`} />
                )}
            </Link>
        );

        if (isCollapsed) {
            return (
                <Tooltip.Provider key={item.href}>
                    <Tooltip.Root delayDuration={0}>
                        <Tooltip.Trigger asChild>
                            {content}
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content
                                side="right"
                                sideOffset={10}
                                className="bg-[var(--color-navy-light)] text-[var(--color- warm-white)] px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 shadow-xl z-50 animate-in fade-in zoom-in-95"
                            >
                                {item.label}
                                <Tooltip.Arrow className="fill-[var(--color-navy-light)]" />
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                </Tooltip.Provider>
            );
        }

        return <div key={item.href}>{content}</div>;
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 260 }}
            className="fixed top-20 left-4 bottom-4 bg-[var(--color-surface)] border border-white/10 rounded-2xl p-4 flex flex-col z-40 shadow-2xl overflow-hidden hidden lg:flex"
        >
            {/* Header / Search Area */}
            <div className="mb-6">
                <button
                    onClick={onSearchClick}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[var(--color-slate)] hover:border-[var(--color-gold)]/30 hover:text-[var(--color-gold)] transition-all group ${
                        isCollapsed ? 'justify-center' : ''
                    }`}
                >
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1">
                            <span className="text-sm font-medium">Search...</span>
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md opacity-50">⌘K</span>
                        </div>
                    )}
                </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain min-h-0 -mx-2 px-2 space-y-1">
                {items.map(item => renderLink(item))}

                {user?.role === "super_admin" && (
                    <div className="mt-6 pt-4 border-t border-white/5 space-y-1">
                        {!isCollapsed && (
                            <h3 className="px-3 mb-2 text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-[0.2em]">
                                Super Admin
                            </h3>
                        )}
                        {superAdminItems.map(item => renderLink(item, true))}
                    </div>
                )}
            </div>

            {/* Footer / Toggle */}
            <div className="mt-auto space-y-4">
                <div className={`p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 ${
                    isCollapsed ? 'justify-center' : ''
                }`}>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-gold)]/20 flex items-center justify-center text-[var(--color-gold)] font-bold text-xs border border-[var(--color-gold)]/20">
                        {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--color-warm-white)] truncate">{user?.name}</p>
                            <p className="text-[10px] text-[var(--color-slate)] capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5 transition-all ${
                        isCollapsed ? 'justify-center' : ''
                    }`}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : (
                        <>
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </motion.aside>
    );
}
