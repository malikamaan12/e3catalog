import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "rental.db");
const db = new Database(dbPath);

console.log("Adding advanced site settings...");

const now = new Date().toISOString();
const advancedSettings = [
    // Theme & Appearance
    { id: '5', key: 'logo_url', value: '/logo.png', group: 'theme', description: 'URL for the main site logo', updated_at: now },
    { id: '6', key: 'favicon_url', value: '/favicon.ico', group: 'theme', description: 'URL for the site favicon', updated_at: now },

    // Content
    { id: '7', key: 'homepage_hero_title', value: 'Build Better Events with Premier Equipment', group: 'content', description: 'Main heading on the homepage hero section', updated_at: now },
    { id: '8', key: 'homepage_hero_subtitle', value: 'The Digital Operating System for Event Rentals. Premium staging, lighting, sound, and furniture.', group: 'content', description: 'Subheading on the homepage hero section', updated_at: now },
    { id: '9', key: 'about_us_text', value: 'E3 Rentals is the leading provider of premium event equipment...', group: 'content', description: 'Short description for the About Us section / footer', updated_at: now },

    // Links & Socials
    { id: '10', key: 'instagram_url', value: 'https://instagram.com/e3rentals', group: 'links', description: 'Instagram profile URL', updated_at: now },
    { id: '11', key: 'facebook_url', value: 'https://facebook.com/e3rentals', group: 'links', description: 'Facebook page URL', updated_at: now },
    { id: '12', key: 'linkedin_url', value: 'https://linkedin.com/company/e3rentals', group: 'links', description: 'LinkedIn company URL', updated_at: now },

    // SEO
    { id: '13', key: 'meta_title', value: 'E3 Rentals — Premium Event Equipment', group: 'seo', description: 'Global SEO Title Tag', updated_at: now },
    { id: '14', key: 'meta_description', value: 'The Digital Operating System for Event Rentals. Premium staging, lighting, sound, and furniture for world-class events.', group: 'seo', description: 'Global SEO Meta Description', updated_at: now },
    { id: '15', key: 'og_image_url', value: '/og-image.jpg', group: 'seo', description: 'Open Graph image preview URL for social sharing', updated_at: now },

    // APIs & Integrations
    { id: '16', key: 'google_analytics_id', value: 'G-XXXXXXXXXX', group: 'api', description: 'Google Analytics Measurement ID', updated_at: now },
    { id: '17', key: 'stripe_public_key', value: 'pk_test_XXXXXXXXXX', group: 'api', description: 'Stripe Publishable Key for payments', updated_at: now },
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO site_settings (id, "key", value, "group", description, updated_at)
    VALUES (@id, @key, @value, @group, @description, @updated_at)
`);

for (const setting of advancedSettings) {
    insert.run(setting);
}

console.log("Advanced settings added successfully!");
db.close();
