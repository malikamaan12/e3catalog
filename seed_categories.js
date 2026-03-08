const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('data/rental.db');

// ── Step 1: Add new columns if they don't exist ──────────────────────────────
try { db.exec(`ALTER TABLE categories ADD COLUMN parent_id TEXT`); } catch { }
try { db.exec(`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch { }

// ── Step 2: Define the full category tree ────────────────────────────────────

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
    },
    {
        name: "Digital Services, Ticketing & Registration",
        slug: "ticketing-registration-digital",
        icon: "🎟️",
        description: "End-to-end event access control including RFID, accreditation hardware, and ticketing systems.",
        sort: 40,
        children: [
            { name: "Accreditation & Access Control", slug: "accreditation-access-control", icon: "🪪", description: "RFID devices, badge printers, turnstiles, and event access hardware.", sort: 1 },
            { name: "Ticketing Systems", slug: "ticketing-systems", icon: "🔖", description: "Ticketing software, hardware scanners, and entry management solutions.", sort: 2 },
        ]
    },
    {
        name: "Entertainment, Rides & Activations",
        slug: "entertainment-rides-activations",
        icon: "🎡",
        description: "Interactive games, inflatables, carnival rides, and sports activations for festivals and corporate events.",
        sort: 50,
        children: [
            { name: "Sports & Interactive Equipment", slug: "sports-interactive-equipment", icon: "⚽", description: "Sports equipment, speed radars, simulators, and interactive tech activations.", sort: 1 },
            { name: "Inflatable Games & Activations", slug: "inflatable-games-activations", icon: "🎈", description: "Bouncy castles, inflatable games, obstacle courses, and branded inflatables.", sort: 2 },
            { name: "Carnival Rides & Games", slug: "carnival-rides-games", icon: "🎠", description: "Carousels, carnival game stalls, funfair rides, and themed entertainment.", sort: 3 },
        ]
    },
    {
        name: "Crowd Control, Safety & Site Operations",
        slug: "crowd-control-safety-operations",
        icon: "🦺",
        description: "Barriers, communications, and power infrastructure to safely manage any event site.",
        sort: 60,
        children: [
            { name: "Site Communications & Tech", slug: "site-communications-tech", icon: "📡", description: "Radio scanners, two-way radios, PA intercoms, and event comms infrastructure.", sort: 1 },
            { name: "Barriers & Fencing", slug: "barriers-fencing", icon: "⛩️", description: "Crowd control barriers, security fencing, and perimeter management solutions.", sort: 2 },
            { name: "Power Distribution & Generators", slug: "power-distribution-generators", icon: "⚡", description: "Generators, distribution boards, cabling, and temporary power infrastructure.", sort: 3 },
        ]
    },
    {
        name: "Event Branding, Signage & Wayfinding",
        slug: "branding-signage-wayfinding",
        icon: "🪧",
        description: "Signboards, directional wayfinders, printed branding, and custom display solutions.",
        sort: 70,
        children: [
            { name: "Sign Boards & Directional Wayfinders", slug: "signboards-wayfinders", icon: "🗺️", description: "Event signage, directional boards, pylons, and wayfinding hardware.", sort: 1 },
            { name: "Custom Printed Branding", slug: "custom-printed-branding", icon: "🎨", description: "Banners, step-and-repeats, backdrops, pull-up stands, and branded print materials.", sort: 2 },
        ]
    },
    {
        name: "Event Furniture & Décor",
        slug: "event-furniture-decor",
        icon: "🪑",
        description: "Premium furniture, lounge sets, carpets, and décor elements for any event aesthetic.",
        sort: 80,
        children: [
            { name: "Seating, Tables & Counters", slug: "seating-tables-counters", icon: "🍽️", description: "Banquet chairs, cocktail tables, registration desks, and counter units.", sort: 1 },
            { name: "Lounge & Décor Elements", slug: "lounge-decor-elements", icon: "🛋️", description: "LED furniture, carpets, centerpieces, themed décor, and lounge sets.", sort: 2 },
        ]
    },
    {
        name: "Manpower, Talent & Labor Services",
        slug: "manpower-talent-labor",
        icon: "👷",
        description: "Skilled labor, technical crew, performance artists, and event support staff.",
        sort: 90,
        children: [
            { name: "General Labor & Operations", slug: "general-labor-operations", icon: "🦾", description: "General event labor, load-in/out crew, and operations support.", sort: 1 },
            { name: "Performance Artists & Entertainment", slug: "performance-artists-entertainment", icon: "🎭", description: "Performers, entertainers, mascots, and live entertainment talent.", sort: 2 },
            { name: "Technical Crew", slug: "technical-crew", icon: "🔩", description: "Riggers, AV technicians, lighting operators, and specialist event crew.", sort: 3 },
        ]
    },
];

// ── Step 3: Upsert categories ───────────────────────────────────────────────
const insertOrIgnore = db.prepare(`
  INSERT OR IGNORE INTO categories (id, parent_id, name, slug, icon, description, sort_order, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);
const updateExisting = db.prepare(`
  UPDATE categories SET parent_id=?, name=?, icon=?, description=?, sort_order=?, active=1 WHERE slug=?
`);

let inserted = 0, updated = 0;

for (const group of TREE) {
    // Check if parent exists
    const existingParent = db.prepare(`SELECT id FROM categories WHERE slug=?`).get(group.slug);
    let parentId = existingParent?.id ?? uuidv4();

    if (existingParent) {
        updateExisting.run(null, group.name, group.icon, group.description, group.sort, group.slug);
        updated++;
    } else {
        insertOrIgnore.run(parentId, null, group.name, group.slug, group.icon, group.description, group.sort);
        inserted++;
    }

    // Now insert children
    for (const child of group.children) {
        const existingChild = db.prepare(`SELECT id FROM categories WHERE slug=?`).get(child.slug);
        if (existingChild) {
            updateExisting.run(parentId, child.name, child.icon, child.description, child.sort, child.slug);
            updated++;
        } else {
            insertOrIgnore.run(uuidv4(), parentId, child.name, child.slug, child.icon, child.description, child.sort);
            inserted++;
        }
    }
}

console.log(`✅ Done! ${inserted} categories inserted, ${updated} updated.`);
console.log(`Total categories:`, db.prepare(`SELECT COUNT(*) as c FROM categories`).get().c);
