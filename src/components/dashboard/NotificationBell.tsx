"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle, Info, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    bookingId: string | null;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                // API returns { notifications: items, unreadCount }
                setNotifications(Array.isArray(data.notifications) ? data.notifications : Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds for new notifications
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const markAsRead = async (id: string, bookingId: string | null) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
            if (bookingId) {
                router.push(`/dashboard/quote/${bookingId}`);
                setIsOpen(false);
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const markAllAsRead = async () => {
        const unread = Array.isArray(notifications) ? notifications.filter(n => !n.isRead) : [];
        for (const n of unread) {
            await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
        }
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const unreadCount = Array.isArray(notifications) ? notifications.filter((n) => !n.isRead).length : 0;

    const getIcon = (type: string) => {
        switch (type) {
            case "quote_sent": return <FileText className="h-5 w-5 text-yellow-500" />;
            case "approved": return <CheckCircle className="h-5 w-5 text-emerald-400" />;
            case "cancelled": return <AlertCircle className="h-5 w-5 text-red-400" />;
            default: return <Info className="h-5 w-5 text-blue-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-[var(--color-slate)] hover:text-white transition-colors rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
                aria-label="Notifications"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[var(--color-navy)]"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[var(--color-navy-dark)] border border-white/10 rounded-2xl shadow-2xl shadow-black origin-top-right z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-[var(--color-navy)]">
                        <h3 className="font-semibold text-[var(--color-warm-white)] flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-[var(--color-gold)]/20 text-[var(--color-gold)] text-xs px-2 py-0.5 rounded-full font-bold">
                                    {unreadCount} New
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-[var(--color-slate)] hover:text-white font-medium transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-6 text-center text-sm text-[var(--color-slate)]">Loading...</div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id, notification.bookingId)}
                                        className={`p-4 flex gap-4 cursor-pointer transition-colors ${notification.isRead ? 'hover:bg-white/5 opacity-70' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}
                                    >
                                        <div className="shrink-0 mt-1">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${notification.isRead ? 'text-[var(--color-slate)]' : 'text-white'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-[var(--color-slate)] mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-[var(--color-slate)]/70 mt-2 font-medium">
                                                {new Date(notification.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="shrink-0 flex items-center">
                                                <div className="h-2 w-2 bg-[var(--color-gold)] rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <div className="inline-flex h-12 w-12 rounded-full border border-white/10 items-center justify-center mb-3">
                                    <Bell className="h-5 w-5 text-[var(--color-slate)] opacity-50" />
                                </div>
                                <p className="text-sm font-medium text-[var(--color-slate)]">No notifications yet</p>
                                <p className="text-xs text-[var(--color-slate)]/70 mt-1">When your quote is ready, it will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
