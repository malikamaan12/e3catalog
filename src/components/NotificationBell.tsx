"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import Link from "next/link";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    linkUrl?: string;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications?limit=10");
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (e) {
            // silent fail
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAllAsRead = async () => {
        setLoading(true);
        try {
            await fetch("/api/notifications/mark-read", { method: "POST" });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) { }
        setLoading(false);
    };

    const markOneAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "POST" });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "booking": return "bg-blue-500/20 text-blue-400";
            case "payment": return "bg-green-500/20 text-green-400";
            case "message": return "bg-yellow-500/20 text-yellow-400";
            case "alert": return "bg-red-500/20 text-red-400";
            default: return "bg-white/10 text-white/60";
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000;
        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5 transition-all"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                        <h3 className="font-semibold text-[var(--color-warm-white)] text-sm">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={loading}
                                    className="text-xs text-[var(--color-gold)] hover:text-[var(--color-gold)]/80 flex items-center gap-1 transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="w-3 h-3" />
                                    All read
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-[var(--color-slate)] hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center text-[var(--color-slate)] text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`group flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors hover:bg-white/3 ${!n.isRead ? "bg-[var(--color-gold)]/5" : ""}`}
                                >
                                    <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${getTypeColor(n.type)}`}>
                                        {n.type || "info"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-[var(--color-warm-white)] truncate">{n.title}</p>
                                        <p className="text-xs text-[var(--color-slate)] mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-[10px] text-[var(--color-slate)]/60 mt-1">{formatTime(n.createdAt)}</p>
                                    </div>
                                    {!n.isRead && (
                                        <button
                                            onClick={() => markOneAsRead(n.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-all"
                                            title="Mark as read"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)]">
                        <Link
                            href="/admin/notifications"
                            className="text-xs text-[var(--color-gold)] hover:underline"
                            onClick={() => setIsOpen(false)}
                        >
                            View all notifications →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
