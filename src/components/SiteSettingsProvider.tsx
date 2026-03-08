"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Setting {
    id: string;
    key: string;
    value: string;
    group: string;
    description: string | null;
}

interface SiteSettingsContextType {
    settings: Record<string, string>;
    rawSettings: Setting[];
    loading: boolean;
    getSetting: (key: string, defaultValue?: string) => string;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [rawSettings, setRawSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch from the public endpoint (we'll need to create this later)
                // For now, we fallback to hardcoded defaults until the API is ready for public consumption
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data: Setting[] = await res.json();
                    setRawSettings(data);

                    const settingsMap: Record<string, string> = {};
                    data.forEach(s => {
                        settingsMap[s.key] = s.value;
                    });
                    setSettings(settingsMap);

                    // Apply dynamic theme variables to :root
                    if (settingsMap['primary_color']) {
                        document.documentElement.style.setProperty('--color-gold', settingsMap['primary_color']);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch public site settings");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const getSetting = (key: string, defaultValue = "") => {
        return settings[key] || defaultValue;
    };

    return (
        <SiteSettingsContext.Provider value={{ settings, rawSettings, loading, getSetting }}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

export function useSiteSettings() {
    const context = useContext(SiteSettingsContext);
    if (context === undefined) {
        throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
    }
    return context;
}
