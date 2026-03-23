import { getSiteSetting, SiteSettingKey } from "./settings";

/**
 * Formats a numeric value into the system's preferred currency string.
 * @param amount - The numeric value to format
 * @param currencyOverride - Optional override for the currency symbol (e.g. from siteSettings)
 */
export async function formatCurrency(amount: number | string, currencyOverride?: string): Promise<string> {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(value)) return "0.00";
    
    const currency = currencyOverride || await getSiteSetting("currency_symbol");
    
    return `${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} ${currency}`;
}

/**
 * Calculates the final price per day for a product based on vendor commission rules.
 */
export function calculateCommissionedPrice(basePrice: number, commissionType: string, commissionValue: number): number {
    switch (commissionType) {
        case "percentage":
            return basePrice * (1 + commissionValue / 100);
        case "fixed_per_item":
            return basePrice + commissionValue;
        default:
            return basePrice;
    }
}

/**
 * Calculates tax on an amount.
 * @param amount - The subtotal before tax
 * @param taxRate - Optional override (e.g. from siteSettings)
 */
export async function calculateTax(amount: number, taxRate?: number): Promise<number> {
    const rate = taxRate !== undefined ? taxRate : parseFloat(await getSiteSetting("default_tax_rate"));
    if (isNaN(rate) || rate <= 0) return 0;
    
    return amount * (rate / 100);
}
