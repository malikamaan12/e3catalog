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

const CATEGORIES = [
    { name: "Staging", slug: "staging", icon: "🎪", description: "The physical foundation of the performance space, including modular platforms and custom stage decking.", sort: 10 },
    { name: "Exhibitions", slug: "exhibitions", icon: "🏠", description: "Dedicated infrastructure for trade shows, encompassing custom exhibition booths and shell schemes.", sort: 20 },
    { name: "Structures", slug: "structures", icon: "🏗️", description: "Large-scale temporary architectural builds, including tents, shade covers, and custom fabrication services.", sort: 30 },
    { name: "Rigging & Truss", slug: "rigging-truss", icon: "⚙️", description: "Heavy-duty aluminum framework, motors, and overhead support systems required for hanging equipment safely.", sort: 40 },
    { name: "Lighting", slug: "lighting", icon: "💡", description: "Stage wash, moving heads, and all atmospheric illumination equipment used to light the event space.", sort: 50 },
    { name: "Audio", slug: "audio", icon: "🔊", description: "PA systems, line arrays, microphones, and all sound equipment that delivers audio across the venue.", sort: 60 },
    { name: "LED & Displays", slug: "led-displays", icon: "📺", description: "Visual presentation hardware, including high-resolution LED video screens, projection mapping, and monitoring displays.", sort: 70 },
    { name: "Power & Electrical", slug: "power-electrical", icon: "⚡", description: "The invisible energy backbone, featuring generators, heavy distribution cabling, and general electrical equipment for the site.", sort: 80 },
    { name: "Climate & Utilities", slug: "climate-utilities", icon: "🌡️", description: "Essential environmental controls, including portable AC units, heating, and general site operation utilities.", sort: 90 },
    { name: "Furniture", slug: "furniture", icon: "🪑", description: "Guest comfort and seating solutions, including VIP banquet chairs, cocktail tables, and lounge setups.", sort: 100 },
    { name: "Decor", slug: "decor", icon: "🎨", description: "Atmospheric styling enhancements, such as scenic elements, drapery, and custom carpets.", sort: 110 },
    { name: "Branding", slug: "branding", icon: "🖼️", description: "Physical sponsor displays, including custom step-and-repeat banners and printed event graphics.", sort: 120 },
    { name: "Wayfinding", slug: "wayfinding", icon: "🪧", description: "Visual navigation tools, encompassing directional sign boards and interactive digital kiosks.", sort: 130 },
    { name: "Crowd Control", slug: "crowd-control", icon: "🚧", description: "Perimeter and audience flow management, featuring heavy-duty Mojo barriers, site fencing, and stanchions.", sort: 140 },
    { name: "Entertainment", slug: "entertainment", icon: "🎠", description: "Interactive and engaging attractions, including arcade games, inflatables, mechanical rides, and character mascots.", sort: 150 },
    { name: "Sports Equipment", slug: "sports-equipment", icon: "⚽", description: "Gear for athletic activations, active zones, tournaments, and health & fitness equipment.", sort: 160 },
    { name: "Event Technology", slug: "event-technology", icon: "💻", description: "Digital hardware for the production office and registration, including pre-configured laptops, iPads, printers, and RFID access devices.", sort: 170 },
    { name: "Logistics Equipment", slug: "logistics-equipment", icon: "🚜", description: "Heavy lifting and site-movement gear, strictly limited to movement equipment like small trollies, jigs, lifts, pickups, and cranes.", sort: 180 },
    { name: "Safety Equipment", slug: "safety-equipment", icon: "🦺", description: "Compliance and emergency hardware, including fire extinguishers and safety inspection equipment essential for meeting TUV standards.", sort: 190 },
    { name: "Manpower", slug: "manpower", icon: "👷", description: "The human element required for execution, providing certified stage riggers, operators, and general logistics labor.", sort: 200 },
];

async function seed() {
    const client = await pool.connect();
    try {
        // Clear all product-related data and categories using CASCADE
        console.log("🗑️  Clearing old products and categories (CASCADE)...");
        await client.query(`
            TRUNCATE TABLE 
                product_media, product_tags, product_documents, 
                safety_certificates, inventory_overrides, inventory_units,
                products, categories
            RESTART IDENTITY CASCADE
        `);

        console.log("🌱 Seeding 20 new categories...");
        for (const cat of CATEGORIES) {
            await client.query(
                `INSERT INTO categories (id, name, slug, icon, description, sort_order, active, parent_id)
                 VALUES ($1, $2, $3, $4, $5, $6, true, null)`,
                [uuidv4(), cat.name, cat.slug, cat.icon, cat.description, cat.sort]
            );
            console.log(`  ✓ ${cat.name}`);
        }

        console.log("\n✅ Done! 20 categories seeded.");
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
});
