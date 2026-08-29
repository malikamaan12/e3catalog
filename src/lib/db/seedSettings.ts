/**
 * E3 Site Settings Seeding
 * Populates the site_settings table with initial configuration values.
 */
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

const defaultSettings = [
    // Contact Group
    { key: "whatsapp_number", value: "97433445566", group: "contact", description: "Primary WhatsApp number for the floating widget" },
    { key: "contact_email", value: "support@e3rentals.com", group: "contact", description: "Main support email address" },

    // Theme Group
    { key: "primary_color", value: "#C9A84C", group: "theme", description: "Primary brand color (Gold)" },
    { key: "secondary_color", value: "#0A0F1E", group: "theme", description: "Secondary brand color (Navy)" },
    { key: "glass_opacity", value: "0.2", group: "theme", description: "Default glassmorphism backdrop opacity" },

    // General Group
    { key: "site_name", value: "E3 Rentals", group: "general", description: "The public name of the platform" },
    { key: "maintenance_mode", value: "false", group: "general", description: "If enabled, redirects all non-admins to a maintenance page" },
    { key: "registration_enabled", value: "true", group: "general", description: "Toggle to allow new users to sign up" },

    // Business & Finance Group
    { key: "platform_fee_percentage", value: "10", group: "business", description: "Global default commission percentage" },
    { key: "minimum_rental_duration", value: "1", group: "business", description: "Minimum rental days for any item" },

    // Marketing Group
    { key: "announcement_banner", value: "New winter rental collection launched! Book now for exclusive discounts.", group: "marketing", description: "Top bar text seen by all visitors" },
    { key: "banner_active", value: "true", group: "marketing", description: "Toggle for the announcement banner visibility" },
];

async function seedSettings() {
    const client = await pool.connect();
    try {
        console.log("🚀 Seeding Site Settings...\n");

        for (const setting of defaultSettings) {
            await client.query(`
                INSERT INTO site_settings (id, key, value, "group", description, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    "group" = EXCLUDED.group,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            `, [uuidv4(), setting.key, setting.value, setting.group, setting.description]);
            
            console.log(`  ✅ ${setting.group}: ${setting.key} -> ${setting.value}`);
        }

        console.log(`\n🎉 Seeding complete! ${defaultSettings.length} settings synchronized.`);
    } finally {
        client.release();
        await pool.end();
    }
}

seedSettings().catch(err => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
});
