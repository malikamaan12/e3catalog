"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    Settings,
    ShieldAlert,
    Activity,
    Database,
    Lock
} from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";
import { SiteSettingsManager } from "@/components/admin/SiteSettingsManager";
import { VendorManagement } from "@/components/admin/VendorManagement";
import { SystemLogs } from "@/components/admin/SystemLogs";
import { USER_ROLES } from "@/lib/constants";

export default function SuperAdminPage() {
    const [activeTab, setActiveTab] = useState<"users" | "settings" | "activity" | "vendors">("users");
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyRole = async () => {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();
                if (data.user?.role === USER_ROLES.SUPER_ADMIN) {
                    setIsVerified(true);
                }
            } catch (err) {
                console.error("Verification failed");
            } finally {
                setLoading(false);
            }
        };
        verifyRole();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Activity className="w-8 h-8 text-[var(--color-gold)] animate-spin" />
            </div>
        );
    }

    if (!isVerified) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-2">
                    <ShieldAlert className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--color-warm-white)]">Access Restricted</h1>
                <p className="text-[var(--color-slate)] max-w-md">
                    You do not have the required permissions to access the Super Admin console.
                    Only accounts with the <span className="text-[var(--color-gold)] font-bold">{USER_ROLES.SUPER_ADMIN}</span> role can view this page.
                </p>
                <div className="pt-4">
                    <button
                        onClick={() => window.location.href = "/admin"}
                        className="bg-white/5 border border-white/10 px-6 py-2 rounded-lg hover:bg-white/10 transition-all"
                    >
                        Return to Admin Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[var(--color-gold)] mb-1">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Super Admin Console</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-heading)] gradient-text-gold">
                        System Management
                    </h1>
                    <p className="text-[var(--color-slate)] max-w-2xl text-lg">
                        Global control center for user roles, system parameters, and website-wide configurations.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === "users" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-white"}`}
                    >
                        <Users className="w-4 h-4" />
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab("vendors")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === "vendors" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-white"}`}
                    >
                        <Database className="w-4 h-4" />
                        Vendors
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === "settings" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-white"}`}
                    >
                        <Settings className="w-4 h-4" />
                        Site Settings
                    </button>
                    <button
                        onClick={() => setActiveTab("activity")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === "activity" ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "text-[var(--color-slate)] hover:text-white"}`}
                    >
                        <Activity className="w-4 h-4" />
                        Logs
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === "users" && <UserManagement />}
                {activeTab === "vendors" && <VendorManagement />}
                {activeTab === "settings" && <SiteSettingsManager />}
                {activeTab === "activity" && <SystemLogs />}
            </div>

            {/* Warning Banner */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-4">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-red-400">Restricted Area</h4>
                    <p className="text-xs text-[var(--color-slate)] mt-1">
                        Changes made here affect the core functionality and security of the entire application.
                        Exercise caution when modifying user roles or critical system settings.
                    </p>
                </div>
            </div>
        </div>
    );
}
