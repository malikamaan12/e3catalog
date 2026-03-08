import { db } from './src/lib/db/index';
import { categories } from './src/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

const TREE = [
    {
        name: "Audio Visual & Technical Production",
        slug: "audio-visual-production",
        icon: "🎬",
        description: "Professional AV equipment, LED displays, production gear, lighting, and rigging for any event scale.",
        sort: 10,
        children: [
            { name: "LED Screens & Video Displays", slug: "led-screens-video-displays", icon: "📺", description: "LED walls, TV units, video processors, and display solutions.", sort: 1 },
            { name: "Camera & Production Gear", slug: "camera-production-gear", icon: "📷", description: "Cameras, tripods, video switchers, monitors, and broadcast equipment.", sort: 2 },
            { name: "Trussing & Rigging Equipment", slug: "trussing-rigging", icon: "⚙️", description: "Structural trussing, rigging motors, and hanging systems.", sort: 3 },
            { name: "Pro Audio & PA Systems", slug: "pro-audio-pa-systems", icon: "🔊", description: "Microphones, speakers, amplifiers, line arrays, and mixing desks.", sort: 4 },
            { name: "Stage Lighting & Special Effects", slug: "stage-lighting-special-effects", icon: "💡", description: "Moving heads, lasers, LED pars, smoke machines, and special effects.", sort: 5 },
        ]
    },
    {
        name: "IT & Event Technology",
        slug: "it-event-technology",
        icon: "💻",
        description: "Corporate and conference-grade IT hardware including laptops, tablets, phones, and office peripherals.",
        sort: 20,
        children: [
            { name: "Computers & Laptops", slug: "computers-laptops", icon: "🖥️", description: "Laptops, desktop workstations, and corporate computing solutions.", sort: 1 },
            { name: "Mobile Devices & Tablets", slug: "mobile-devices-tablets", icon: "📱", description: "Tablets, iPads, smartphones, and mobile event tools.", sort: 2 },
            { name: "Office & Event Hardware", slug: "office-event-hardware", icon: "🖨️", description: "Printers, photocopiers, badge printers, and office peripherals.", sort: 3 },
        ]
    },
    {
        name: "Staging, Structures & Custom Fabrication",
        slug: "staging-structures-fabrication",
        icon: "🏗️",
        description: "Stages, platforms, exhibition kiosks, and bespoke fabrication services for any event footprint.",
        sort: 30,
        children: [
            { name: "Stages & Platforms", slug: "stages-platforms", icon: "🎪", description: "Modular stages, elevated platforms, podiums, and performance risers.", sort: 1 },
            { name: "Exhibition Booths & Kiosks", slug: "exhibition-booths-kiosks", icon: "🏠", description: "Branded exhibition stands, kiosks, shell scheme booths, and display structures.", sort: 2 },
            { name: "Custom Set & Fabrication Services", slug: "custom-set-fabrication", icon: "🔧", description: "Bespoke fabrication, custom scenic sets, and made-to-order structures. Priced via custom quote.", sort: 3 },
        ]
    }
];

async function seed() {
    console.log("🌱 Seeding categories to Supabase...");

    for (const group of TREE) {
        const parentId = uuidv4();
        await db.insert(categories).values({
            id: parentId,
            name: group.name,
            slug: group.slug,
            icon: group.icon,
            description: group.description,
            sortOrder: group.sort,
            active: true
        }).onConflictDoNothing();

        for (const child of group.children) {
            await db.insert(categories).values({
                id: uuidv4(),
                parentId: parentId,
                name: child.name,
                slug: child.slug,
                icon: child.icon,
                description: child.description,
                sortOrder: child.sort,
                active: true
            }).onConflictDoNothing();
        }
    }

    console.log("✅ Seeding complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
