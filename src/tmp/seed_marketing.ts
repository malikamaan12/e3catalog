import { db } from "@/lib/db";
import { siteSettings, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

async function seedMarketing() {
    try {
        console.log("Seeding marketing settings...");
        
        const marketingSettings = [
            { key: "hero_top_title", value: "The Next Generation of Events", desc: "Small text above the main hero title" },
            { key: "hero_main_title", value: "THE DIGITAL\nOPERATING SYSTEM\nFOR PREMIUM EVENTS", desc: "Main hero title (use \\n for line breaks)" },
            { key: "hero_description", value: "Setting the standard for enterprise-grade logistics and ultra-premium storefronts in the Middle East. Build, quote, and deploy at scale.", desc: "Main hero paragraph" },
            { key: "bento_section_title", value: "PLATFORM SUPERPOWERS", desc: "Title for the Bento grid section" },
            { key: "bento_card1_title", value: "Sweep-Line Availability Engine", desc: "Bento Card 1 Title" },
            { key: "bento_card1_desc", value: "Real-time algorithmic booking system that ensures zero double-bookings across your entire fleet.", desc: "Bento Card 1 Description" },
            { key: "bento_card2_title", value: "Instant PDF Quoting", desc: "Bento Card 2 Title" },
            { key: "bento_card2_desc", value: "Generate professional, commercial proposals in under 12 seconds with tax compliance.", desc: "Bento Card 2 Description" },
            { key: "bento_card3_title", value: "Digital Asset Passports", desc: "Bento Card 3 Title" },
            { key: "bento_card3_desc", value: "Every item has a unique digital identity and QR-tracked physical movement history.", desc: "Bento Card 3 Description" },
            { key: "bento_card4_title", value: "Interactive 3D Catalog", desc: "Bento Card 4 Title" },
            { key: "bento_card4_desc", value: "Ultra-high fidelity 3D models for every piece of equipment. Try before you buy with web-first AR.", desc: "Bento Card 4 Description" },
            { key: "timeline_step1_title", value: "Build Cart", desc: "Timeline Step 1 Title" },
            { key: "timeline_step1_desc", value: "Select assets and configure quantity.", desc: "Timeline Step 1 Description" },
            { key: "timeline_step2_title", value: "Generate Quote", desc: "Timeline Step 2 Title" },
            { key: "timeline_step2_desc", value: "Instant MOCI-ready commercial proposal.", desc: "Timeline Step 2 Description" },
            { key: "timeline_step3_title", value: "Bump-In", desc: "Timeline Step 3 Title" },
            { key: "timeline_step3_desc", value: "White-glove delivery and setup on-site.", desc: "Timeline Step 3 Description" },
            { key: "timeline_step4_title", value: "Bump-Out", desc: "Timeline Step 4 Title" },
            { key: "timeline_step4_desc", value: "Asset recovery and fleet reintegration.", desc: "Timeline Step 4 Description" },
        ];

        for (const s of marketingSettings) {
            // Check if exists
            const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, s.key)).limit(1);
            if (existing.length === 0) {
                await db.insert(siteSettings).values({
                    id: uuidv4(),
                    key: s.key,
                    value: s.value,
                    group: "marketing",
                    description: s.desc
                });
                console.log(`Created setting: ${s.key}`);
            } else {
                console.log(`Setting already exists: ${s.key}`);
            }
        }
        
        console.log("Checking products...");
        const allProducts = await db.select({ id: products.id, name: products.name, featured: products.featured }).from(products).limit(10);
        console.log("Top 10 products in DB:", JSON.stringify(allProducts, null, 2));

        console.log("Seed complete.");
        process.exit(0);
    } catch (err) {
        console.error("Seed failed:", err);
        process.exit(1);
    }
}

seedMarketing();
