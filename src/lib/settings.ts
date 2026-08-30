import { db } from "./db";
import { siteSettings } from "./db/schema";

/**
 * Valid Site Settings Keys
 * Add new settings keys here to ensure type safety across the app.
 */
export type SiteSettingKey = 
    | "platform_name"
    | "support_email"
    | "currency_symbol"
    | "default_tax_rate"
    | "terms_conditions_url"
    | "homepage_hero_title"
    | "homepage_hero_subtitle"
    | "footer_legal_text"
    | "resend_from_email"
    | "qr_code_provider_url"
    | "default_quote_terms"
    | "base_production_url";

const DEFAULT_SETTINGS: Record<SiteSettingKey, string> = {
    platform_name: "E3 Rentals",
    support_email: process.env.SUPPORT_EMAIL || "",
    currency_symbol: "QAR",
    default_tax_rate: "0",
    terms_conditions_url: "/terms",
    homepage_hero_title: "BUILD BETTER EVENTS",
    homepage_hero_subtitle: "Enterprise staging, specialized hardware, and zero-gravity logistics.",
    footer_legal_text: "© 2026 E3 Rentals. All Rights Reserved.",
    resend_from_email: process.env.EMAIL_FROM || "",
    qr_code_provider_url: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=",
    default_quote_terms: "Strictly 100% advance payment required. Any damages charged at replacement value. Valid for 7 days.",
    base_production_url: "https://e3catalog.com",
};

let cachedSettings: { data: Record<SiteSettingKey, string>; expiresAt: number } | null = null;
const SETTINGS_TTL_MS = 60 * 1000; // 60s TTL in-memory cache for ultra-fast page renders

/**
 * Invalidate cached site settings (e.g. after admin updates settings).
 */
export function bustSiteSettingsCache(): void {
    cachedSettings = null;
}

/**
 * Server-side helper to fetch all settings at once with high-speed in-memory caching.
 */
export async function getAllSiteSettings(): Promise<Record<SiteSettingKey, string>> {
    const now = Date.now();
    if (cachedSettings && cachedSettings.expiresAt > now) {
        return cachedSettings.data;
    }

    try {
        const settings = await db.select().from(siteSettings);
        const settingsMap = { ...DEFAULT_SETTINGS };
        
        settings.forEach(s => {
            if (s.key in settingsMap) {
                settingsMap[s.key as SiteSettingKey] = s.value;
            }
        });
        
        cachedSettings = { data: settingsMap, expiresAt: now + SETTINGS_TTL_MS };
        return settingsMap;
    } catch {
        if (cachedSettings) return cachedSettings.data;
        return DEFAULT_SETTINGS;
    }
}

/**
 * Server-side helper to fetch a site setting from cache or DB.
 * Falls back to DEFAULT_SETTINGS if key is missing in DB.
 */
export async function getSiteSetting(key: SiteSettingKey): Promise<string> {
    try {
        const all = await getAllSiteSettings();
        return all[key] ?? DEFAULT_SETTINGS[key];
    } catch (error) {
        console.error(`Error fetching site setting [${key}]:`, error);
        return DEFAULT_SETTINGS[key];
    }
}
