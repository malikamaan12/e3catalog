import { db } from "./db";
import { siteSettings } from "./db/schema";
import { eq } from "drizzle-orm";

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
    support_email: "support@e3rentals.com",
    currency_symbol: "QAR",
    default_tax_rate: "0",
    terms_conditions_url: "/terms",
    homepage_hero_title: "BUILD BETTER EVENTS",
    homepage_hero_subtitle: "Enterprise staging, specialized hardware, and zero-gravity logistics.",
    footer_legal_text: "© 2026 E3 Rentals. All Rights Reserved.",
    resend_from_email: "E3 Rentals <noreply@e3rentals.com>",
    qr_code_provider_url: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=",
    default_quote_terms: "Strictly 100% advance payment required. Any damages charged at replacement value. Valid for 7 days.",
    base_production_url: "https://e3catalog.com",
};

/**
 * Server-side helper to fetch a site setting from the DB.
 * Falls back to DEFAULT_SETTINGS if key is missing in DB.
 */
export async function getSiteSetting(key: SiteSettingKey): Promise<string> {
    try {
        const setting = await db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, key)
        });
        return setting?.value ?? DEFAULT_SETTINGS[key];
    } catch (error) {
        console.error(`Error fetching site setting [${key}]:`, error);
        return DEFAULT_SETTINGS[key];
    }
}

/**
 * Server-side helper to fetch all settings at once (optimization)
 */
export async function getAllSiteSettings(): Promise<Record<SiteSettingKey, string>> {
    try {
        const settings = await db.select().from(siteSettings);
        const settingsMap = { ...DEFAULT_SETTINGS };
        
        settings.forEach(s => {
            if (s.key in settingsMap) {
                settingsMap[s.key as SiteSettingKey] = s.value;
            }
        });
        
        return settingsMap;
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}
