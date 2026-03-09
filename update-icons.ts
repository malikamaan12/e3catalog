import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

// Professional Lucide icon names for each category slug
const ICON_UPDATES: Record<string, string> = {
    "staging": "Layers",
    "exhibitions": "Building2",
    "structures": "Frame",
    "rigging-truss": "Link2",
    "lighting": "Lightbulb",
    "audio": "Mic2",
    "led-displays": "Monitor",
    "power-electrical": "Zap",
    "climate-utilities": "Wind",
    "furniture": "Armchair",
    "decor": "Palette",
    "branding": "Flag",
    "wayfinding": "Navigation",
    "crowd-control": "Shield",
    "entertainment": "Gamepad2",
    "sports-equipment": "Trophy",
    "event-technology": "Laptop2",
    "logistics-equipment": "Truck",
    "safety-equipment": "ShieldCheck",
    "manpower": "HardHat",
};

async function update() {
    const client = await pool.connect();
    try {
        console.log("🎨 Updating category icons to professional Lucide icons...\n");
        for (const [slug, icon] of Object.entries(ICON_UPDATES)) {
            const res = await client.query(
                `UPDATE categories SET icon = $1 WHERE slug = $2 RETURNING name`,
                [icon, slug]
            );
            if (res.rowCount && res.rowCount > 0) {
                console.log(`  ✓ ${res.rows[0].name} → ${icon}`);
            } else {
                console.log(`  ⚠ Not found: ${slug}`);
            }
        }
        console.log("\n✅ All category icons updated!");
    } finally {
        client.release();
        await pool.end();
    }
}

update().catch(err => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
});
