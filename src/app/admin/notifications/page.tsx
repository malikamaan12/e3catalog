"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Bell, CheckCheck, Check, Clock, AlertCircle, 
    ExternalLink, Filter, RefreshCw, ShieldAlert, Package, Calendar
} from "lucide-react";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type?: string;
    isRead: boolean;
    createdAt: string;
    link?: string | null;
}

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
    const [actionLoading, setActionLoading] = useState(false);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.notifications || []);
                setNotifications(list);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markAllRead = async () => {
        setActionLoading(true);
        try {
            const res = await fetch("/api/notifications/mark-read", { method: "POST" });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const markOneRead = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, isRead: true }) : n));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === "unread") return !n.isRead;
        if (filter === "read") return n.isRead;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="max-w-5xl mx-auto pb-16 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] flex items-center gap-3">
                        <Bell className="w-7 h-7 text-[var(--color-gold)]" />
                        Notification Center
                    </h1>
                    <p className="text-sm text-[var(--color-slate)] mt-1">
                        Authoritative administrative dispatch alerts, equipment claims, and compliance warnings.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[var(--color-warm-white)] flex items-center gap-2 transition-all"
                        >
                            <CheckCheck className="w-4 h-4 text-emerald-400" />
                            Mark All Read
                        </button>
                    )}
                    <button
                        onClick={loadNotifications}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-slate)] hover:text-white transition-all"
                        title="Refresh notifications"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <button
                    onClick={() => setFilter("all")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filter === "all"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md"
                            : "text-[var(--color-slate)] hover:text-white"
                    }`}
                >
                    All ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        filter === "unread"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md"
                            : "text-[var(--color-slate)] hover:text-white"
                    }`}
                >
                    Unread ({unreadCount})
                </button>
                <button
                    onClick={() => setFilter("read")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filter === "read"
                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md"
                            : "text-[var(--color-slate)] hover:text-white"
                    }`}
                >
                    Read ({notifications.length - unreadCount})
                </button>
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="p-16 flex flex-col items-center justify-center glass rounded-2xl border border-white/10">
                    <RefreshCw className="w-8 h-8 text-[var(--color-gold)] animate-spin mb-3" />
                    <p className="text-xs text-[var(--color-slate)] uppercase font-mono tracking-widest">Loading Alerts...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="p-16 text-center glass rounded-2xl border border-white/10">
                    <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No Notifications</h3>
                    <p className="text-xs text-[var(--color-slate)]">
                        {filter === "unread" ? "You are all caught up! No unread messages." : "No notifications on record."}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.map((n) => (
                        <div
                            key={n.id}
                            className={`glass rounded-2xl p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                n.isRead
                                    ? "border-white/5 bg-white/[0.01] opacity-75"
                                    : "border-[var(--color-gold)]/30 bg-gradient-to-r from-amber-500/[0.05] via-transparent to-transparent shadow-lg"
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    n.isRead ? "bg-white/5 text-[var(--color-slate)]" : "bg-gold/10 text-gold border border-gold/30"
                                }`}>
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-white">{n.title}</h4>
                                        {!n.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--color-slate)] leading-relaxed">{n.message}</p>
                                    <p className="text-[10px] text-white/40 font-mono pt-1">
                                        {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {n.link && (
                                    <Link
                                        href={n.link}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-white/10"
                                    >
                                        Inspect <ExternalLink className="w-3 h-3 text-[var(--color-gold)]" />
                                    </Link>
                                )}
                                {!n.isRead && (
                                    <button
                                        onClick={() => markOneRead(n.id)}
                                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                                        title="Mark as read"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
