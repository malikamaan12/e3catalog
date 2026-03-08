import { db } from "./index";
import { categories, products, productMedia, safetyCertificates, installationGuides, bookings } from "./schema";
import { v4 as uuid } from "uuid";

const now = new Date().toISOString();

async function seed() {
    console.log("🌱 Seeding database...");

    // ─── Categories ───
    const cats = [
        { id: uuid(), name: "Staging & Trusses", slug: "staging-trusses", image: "/images/categories/staging.jpg", description: "Professional staging platforms, truss systems, and rigging equipment for events of all sizes." },
        { id: uuid(), name: "Lighting", slug: "lighting", image: "/images/categories/lighting.jpg", description: "Concert-grade LED fixtures, moving heads, and atmospheric lighting packages." },
        { id: uuid(), name: "Sound & Audio", slug: "sound-audio", image: "/images/categories/sound.jpg", description: "Line arrays, PA systems, mixing consoles, and wireless microphone packages." },
        { id: uuid(), name: "Furniture & Décor", slug: "furniture-decor", image: "/images/categories/furniture.jpg", description: "Premium event furniture, lounge sets, bars, and decorative elements." },
    ];

    for (const cat of cats) {
        await db.insert(categories).values(cat);
    }

    // ─── Products ───
    const prods = [
        // Staging & Trusses
        {
            id: uuid(), categoryId: cats[0].id, name: "Heavy-Duty Stage Platform 4x8",
            slug: "heavy-duty-stage-platform-4x8",
            shortDescription: "Industrial-grade aluminum stage platform, 4ft × 8ft modular sections",
            description: "Our flagship modular stage platform built for heavy-duty event use. Each 4×8 section features aircraft-grade aluminum framing with anti-slip diamond plate surface. Adjustable legs from 16\" to 48\" height. TUV-certified for up to 150 PSF load capacity. Quick-lock connection system allows rapid assembly of stages of any size.",
            dimensions: "4ft × 8ft × 16-48in (adjustable)", weight: "185 lbs per section", powerRequirements: "None",
            materials: "Aircraft-grade 6061-T6 Aluminum, Diamond Plate Surface", pricePerDay: 150, pricePerHour: 35,
            condition: "excellent", installTime: 24, dismantleTime: 24, cleaningTime: 2,
            manpower: "4-6 persons for 10+ section setup", tools: "Socket wrench set, rubber mallet, safety pins",
            thumbnailUrl: "/images/products/stage-platform-thumb.jpg", featured: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            id: uuid(), categoryId: cats[0].id, name: "Tri-Truss System 12\" × 10ft",
            slug: "tri-truss-system-12x10",
            shortDescription: "Heavy-duty triangular truss sections for rigging and structure",
            description: "Professional 12-inch triangular truss system in 10ft sections. Built from 50mm main tubes with 25mm bracing. Conical connection system for fast, secure assembly. Rated for 2,000 lbs vertical load. Perfect for lighting rigs, PA hangs, and scenic elements. TUV and OSHA compliant.",
            dimensions: "12\" triangle × 10ft length", weight: "45 lbs per section", powerRequirements: "None",
            materials: "6082-T6 Aluminum Alloy", pricePerDay: 85, pricePerHour: 20,
            condition: "excellent", installTime: 48, dismantleTime: 24, cleaningTime: 1,
            manpower: "2-4 persons with certified rigger", tools: "Conical half-couplers, R-clips, spanners, chain hoists",
            thumbnailUrl: "/images/products/tri-truss-thumb.jpg", featured: true, createdAt: new Date(), updatedAt: new Date(),
        },
        // Lighting
        {
            id: uuid(), categoryId: cats[1].id, name: "LED Moving Head Wash 19×40W",
            slug: "led-moving-head-wash-19x40w",
            shortDescription: "RGBW LED moving head wash fixture with zoom",
            description: "Professional LED moving head wash fixture featuring 19× 40W RGBW LEDs. 10°-60° motorized zoom. 540°/270° Pan/Tilt. 16-bit dimming with 4 dimming curves. Built-in wireless DMX receiver. IP20 rated for indoor use. Ultra-quiet fan cooling mode for corporate events.",
            dimensions: "14.5\" × 10\" × 19.5\"", weight: "26.5 lbs", powerRequirements: "800W, 100-240V AC, PowerCON input",
            materials: "Die-cast aluminum housing, tempered glass lens", pricePerDay: 120, pricePerHour: 30,
            condition: "excellent", installTime: 2, dismantleTime: 1, cleaningTime: 1,
            manpower: "1-2 lighting technicians", tools: "C-clamp, safety cable, DMX cables, PowerCON cables",
            thumbnailUrl: "/images/products/moving-head-thumb.jpg", featured: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            id: uuid(), categoryId: cats[1].id, name: "LED Par Can 18×18W RGBAW+UV",
            slug: "led-par-can-18x18w",
            shortDescription: "6-in-1 LED par with RGBAW+UV color mixing",
            description: "Versatile 6-in-1 LED par can with 18× 18W RGBAW+UV LEDs for full-spectrum color mixing. 25° beam angle. Flicker-free operation for broadcast. Powercon in/out for daisy-chaining. Built-in programs, sound-active mode, and DMX control.",
            dimensions: "11\" × 11\" × 13\"", weight: "12 lbs", powerRequirements: "270W, 100-240V AC",
            materials: "Cast aluminum body, anti-glare lens", pricePerDay: 35, pricePerHour: 10,
            condition: "excellent", installTime: 1, dismantleTime: 1, cleaningTime: 0,
            manpower: "1 technician", tools: "C-clamp, safety cable, DMX cables",
            thumbnailUrl: "/images/products/led-par-thumb.jpg", featured: false, createdAt: new Date(), updatedAt: new Date(),
        },
        // Sound
        {
            id: uuid(), categoryId: cats[2].id, name: "Line Array System — 12\" Dual",
            slug: "line-array-system-12-dual",
            shortDescription: "Professional dual 12\" line array module for large venues",
            description: "High-output line array module featuring dual 12\" neodymium LF drivers and a 3\" HF compression driver on a rotatable waveguide. 141 dB peak SPL. Integrated rigging hardware with angular adjustment. Bi-amped or tri-amped operation. Designed for arenas, festivals, and large outdoor events.",
            dimensions: "28\" × 14\" × 21\"", weight: "88 lbs per module", powerRequirements: "Passive — requires external amplifier rack",
            materials: "Baltic birch plywood, polyurea coating, neodymium magnets", pricePerDay: 350, pricePerHour: 80,
            condition: "excellent", installTime: 48, dismantleTime: 24, cleaningTime: 2,
            manpower: "3-4 certified audio engineers", tools: "Motor chain hoists, rigging bars, shackles, multi-pin cables",
            thumbnailUrl: "/images/products/line-array-thumb.jpg", featured: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            id: uuid(), categoryId: cats[2].id, name: "Digital Mixing Console 32-Channel",
            slug: "digital-mixing-console-32ch",
            shortDescription: "32-channel digital mixer with touchscreen and stage box",
            description: "Flagship 32-channel digital mixing console with 10\" touchscreen interface. 16 motorized faders, 8 DCA groups, 16 aux mixes. Built-in effects engine with 8 stereo processors. Dante networking ready. Includes 32-channel stage box with 100m Cat6 snake.",
            dimensions: "24\" × 20\" × 8\"", weight: "42 lbs (console) + 28 lbs (stage box)", powerRequirements: "350W, 100-240V AC, IEC inlet",
            materials: "Steel chassis, aluminum faceplate", pricePerDay: 500, pricePerHour: 120,
            condition: "excellent", installTime: 4, dismantleTime: 2, cleaningTime: 1,
            manpower: "1 audio engineer", tools: "Cat6 cable (provided), IEC power cable",
            thumbnailUrl: "/images/products/mixer-thumb.jpg", featured: false, createdAt: new Date(), updatedAt: new Date(),
        },
        // Furniture
        {
            id: uuid(), categoryId: cats[3].id, name: "Premium White Lounge Set",
            slug: "premium-white-lounge-set",
            shortDescription: "5-piece modern lounge set in premium white leather",
            description: "Elegant 5-piece lounge set featuring a 3-seat sofa, 2 armchairs, and 2 glass-top accent tables. Upholstered in stain-resistant white faux leather with brushed stainless steel legs. Perfect for VIP areas, cocktail lounges, and corporate hospitality zones.",
            dimensions: "Sofa: 84\" × 32\" × 30\", Chair: 32\" × 32\" × 30\", Table: 24\" × 24\" × 18\"", weight: "Sofa: 95 lbs, Chair: 45 lbs, Table: 18 lbs",
            powerRequirements: "None", materials: "Premium PU leather, stainless steel, tempered glass",
            pricePerDay: 280, pricePerHour: null, condition: "excellent",
            installTime: 1, dismantleTime: 1, cleaningTime: 2,
            manpower: "2 persons", tools: "Furniture dolly, protective blankets",
            thumbnailUrl: "/images/products/lounge-set-thumb.jpg", featured: true, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            id: uuid(), categoryId: cats[3].id, name: "LED Cocktail Table — Color Changing",
            slug: "led-cocktail-table-color-changing",
            shortDescription: "Illuminated cocktail table with wireless RGB control",
            description: "Eye-catching LED cocktail table with 16 color options and 4 lighting modes. Wireless remote control with individual or group addressing. Rechargeable battery lasts 8-10 hours. IP54 rated for outdoor use. 42\" standing height with tempered glass top.",
            dimensions: "24\" diameter × 42\" height", weight: "22 lbs", powerRequirements: "Rechargeable — includes AC charger",
            materials: "Rotational-molded PE, tempered glass top, LED array", pricePerDay: 65, pricePerHour: 18,
            condition: "excellent", installTime: 0, dismantleTime: 0, cleaningTime: 1,
            manpower: "1 person", tools: "None — pre-charged",
            thumbnailUrl: "/images/products/led-table-thumb.jpg", featured: false, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            id: uuid(), categoryId: cats[3].id, name: "Black Chiavari Chair — Gold Accent",
            slug: "chiavari-chair-black-gold",
            shortDescription: "Classic Chiavari chair in black with gold detailing",
            description: "Timeless Chiavari chair in high-gloss black with gold accent tips. Reinforced resin construction rated for 400 lbs. Stackable design for efficient transport. Available with cushion pads in 8 colors (ivory included). Perfect for galas, weddings, and formal events.",
            dimensions: "16\" × 16\" × 36\" (seat height 18\")", weight: "8 lbs", powerRequirements: "None",
            materials: "Reinforced polycarbonate resin, gold-tipped legs", pricePerDay: 8, pricePerHour: null,
            condition: "excellent", installTime: 0, dismantleTime: 0, cleaningTime: 0,
            manpower: "1 person per 50 chairs", tools: "Chair cart/dolly",
            thumbnailUrl: "/images/products/chiavari-thumb.jpg", featured: false, createdAt: new Date(), updatedAt: new Date(),
        },
        {
            id: uuid(), categoryId: cats[2].id, name: "Wireless Microphone System — Dual",
            slug: "wireless-mic-system-dual",
            shortDescription: "Dual-channel UHF wireless handheld microphone system",
            description: "Professional dual-channel wireless microphone system operating on UHF frequencies. Two handheld dynamic microphones with backlit LCD displays. Auto-scan frequency selection avoids interference. 300ft operating range. Metal receiver with balanced XLR and unbalanced 1/4\" outputs.",
            dimensions: "Receiver: 8\" × 6\" × 2\", Mic: 10\" length", weight: "Receiver: 2 lbs, Mic: 0.7 lbs each",
            powerRequirements: "12V DC adapter (included), Mics: 2× AA batteries", materials: "Zinc alloy mic body, steel mesh grille",
            pricePerDay: 75, pricePerHour: 20, condition: "excellent",
            installTime: 0, dismantleTime: 0, cleaningTime: 1,
            manpower: "1 audio technician", tools: "XLR cables, AA batteries (spares)",
            thumbnailUrl: "/images/products/wireless-mic-thumb.jpg", featured: false, createdAt: new Date(), updatedAt: new Date(),
        },
    ];

    for (const prod of prods) {
        await db.insert(products).values(prod);
    }

    // ─── Product Media ───
    const mediaEntries = prods.flatMap((prod, idx) => [
        { id: uuid(), productId: prod.id, type: "image", url: `/images/products/${prod.slug}-1.jpg`, thumbnailUrl: prod.thumbnailUrl, alt: `${prod.name} — Front View`, sortOrder: 0 },
        { id: uuid(), productId: prod.id, type: "image", url: `/images/products/${prod.slug}-2.jpg`, thumbnailUrl: null, alt: `${prod.name} — Detail`, sortOrder: 1 },
        { id: uuid(), productId: prod.id, type: "image", url: `/images/products/${prod.slug}-3.jpg`, thumbnailUrl: null, alt: `${prod.name} — In Use`, sortOrder: 2 },
    ]);

    for (const media of mediaEntries) {
        await db.insert(productMedia).values(media);
    }

    // ─── Safety Certificates ───
    const certs = [
        { id: uuid(), productId: prods[0].id, certName: "TUV Structural Certification", certNumber: "TUV-STG-2025-44821", issuingBody: "TÜV SÜD", issueDate: new Date("2025-03-15"), expiryDate: new Date("2026-03-15") },
        { id: uuid(), productId: prods[0].id, certName: "OSHA Load Test Certificate", certNumber: "OSHA-LT-2025-9912", issuingBody: "OSHA Recognized Lab", issueDate: new Date("2025-06-01"), expiryDate: new Date("2026-06-01") },
        { id: uuid(), productId: prods[1].id, certName: "TUV Rigging Certification", certNumber: "TUV-RIG-2025-55102", issuingBody: "TÜV Rheinland", issueDate: new Date("2025-01-20"), expiryDate: new Date("2026-01-20") },
        { id: uuid(), productId: prods[4].id, certName: "CE Declaration of Conformity", certNumber: "CE-AUDIO-2024-7782", issuingBody: "European Conformity", issueDate: new Date("2024-11-10"), expiryDate: new Date("2027-11-10") },
        { id: uuid(), productId: prods[2].id, certName: "CE EMC Compliance", certNumber: "CE-EMC-2025-3321", issuingBody: "European Conformity", issueDate: new Date("2025-04-01"), expiryDate: new Date("2028-04-01") },
    ];

    for (const cert of certs) {
        await db.insert(safetyCertificates).values(cert);
    }

    // ─── Installation Guides ───
    const guides = [
        { id: uuid(), productId: prods[0].id, guideType: "install", content: "1. Lay out base frames on level ground.\n2. Attach adjustable legs to each corner — set height using pin-lock system.\n3. Connect sections using quick-lock rail clamps.\n4. Verify level using laser level across all sections.\n5. Install skirting and stair units.\n6. Load test with distributed weight before event.", requiredManpower: 5, estimatedTime: "3-5 hours for 20-section stage", toolsRequired: "Socket wrench set, rubber mallet, laser level, safety pins" },
        { id: uuid(), productId: prods[0].id, guideType: "dismantle", content: "1. Clear all equipment from stage surface.\n2. Remove skirting and stairs.\n3. Disconnect quick-lock rail clamps.\n4. Lower adjustable legs fully.\n5. Separate sections and stack on transport dollies.\n6. Inspect each section for damage before case storage.", requiredManpower: 4, estimatedTime: "2-3 hours for 20-section stage", toolsRequired: "Socket wrench set, furniture dolly" },
        { id: uuid(), productId: prods[1].id, guideType: "install", content: "1. Lay out ground support base plates.\n2. Assemble vertical truss towers to specified height.\n3. Connect horizontal spans with conical connectors.\n4. Attach chain hoists to designated rigging points.\n5. Fly the horizontal truss to trim height.\n6. Attach all safety cables and redundant rigging.\n7. Load test with calibrated weights.", requiredManpower: 4, estimatedTime: "4-8 hours depending on configuration", toolsRequired: "Conical half-couplers, R-clips, 19mm spanners, chain hoists, shackles" },
    ];

    for (const guide of guides) {
        await db.insert(installationGuides).values(guide);
    }

    // ─── Demo Bookings ───
    const demoBookings = [
        { id: uuid(), productId: prods[0].id, units: 10, startDate: new Date("2026-03-15"), endDate: new Date("2026-03-17"), status: "booked", bufferBefore: 24, bufferAfter: 24, customerName: "Grand Hyatt Events", customerEmail: "events@grandhyatt.com", customerPhone: "+971-4-555-1234", notes: "Annual corporate gala — main stage", totalPrice: 4500, discount: 0, logisticsCost: 500, taxRate: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: uuid(), productId: prods[2].id, units: 12, startDate: new Date("2026-03-20"), endDate: new Date("2026-03-20"), startTime: "08:00", endTime: "14:00", status: "approved", bufferBefore: 2, bufferAfter: 1, customerName: "Tech Summit LLC", customerEmail: "prod@techsummit.ae", customerPhone: "+971-4-555-5678", notes: "Morning keynote lighting rig", totalPrice: 1440, discount: 10, logisticsCost: 200, taxRate: 5, createdAt: new Date(), updatedAt: new Date() },
        { id: uuid(), productId: prods[2].id, units: 8, startDate: new Date("2026-03-20"), endDate: new Date("2026-03-20"), startTime: "17:00", endTime: "23:00", status: "request", bufferBefore: 2, bufferAfter: 1, customerName: "Night Beats Festival", customerEmail: "bookings@nightbeats.com", notes: "Evening concert lighting — same venue", totalPrice: 960, discount: 0, logisticsCost: 0, taxRate: 5, createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const booking of demoBookings) {
        await db.insert(bookings).values(booking);
    }

    console.log("✅ Database seeded successfully!");
    console.log(`   ${cats.length} categories`);
    console.log(`   ${prods.length} products`);
    console.log(`   ${mediaEntries.length} media items`);
    console.log(`   ${certs.length} safety certificates`);
    console.log(`   ${guides.length} installation guides`);
    console.log(`   ${demoBookings.length} demo bookings`);
}

seed().catch(console.error);
