import { db } from "../src/lib/db";
import { inventoryUnits, products, vendors } from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { dummyProducts } from "../src/lib/db/dummyData"; // Adjust path if needed

async function reseed() {
    console.log("🌱 Starting Inventory Restoration...");

    // 1. Get all existing products and vendors
    const allProducts = await db.query.products.findMany();
    const allVendors = await db.query.vendors.findMany();
    
    if (allProducts.length === 0) {
        console.error("❌ No products found in database. Cannot restore inventory.");
        return;
    }

    // Default vendor if a product is unassigned or assigned vendor doesn't exist
    const defaultVendor = allVendors.find(v => v.id.startsWith('E3-ENT')) || allVendors[0];

    let totalCreated = 0;

    for (const product of allProducts) {
        // Check if units already exist to avoid duplicates
        const existingCount = await db.query.inventoryUnits.findMany({
            where: (units, { eq }) => eq(units.productId, product.id)
        });

        if (existingCount.length > 0) {
            console.log(`  ⏩ Skipping ${product.name} (${existingCount.length} units exist)`);
            continue;
        }

        // 2. Determine how many units to create
        // Try to match with dummyData by itemCode or name
        const dummyMatch = dummyProducts.find(p => p.itemCode === product.itemCode || p.name === product.name);
        const unitsToCreate = dummyMatch ? dummyMatch.units : 5;

        // 3. Determine vendor
        let vendorId = product.vendorId || (defaultVendor ? defaultVendor.id : null);
        
        if (!vendorId) {
            console.warn(`  ⚠️ No vendor for ${product.name}, skipping.`);
            continue;
        }

        console.log(`  📦 Creating ${unitsToCreate} units for ${product.name}...`);

        for (let i = 1; i <= unitsToCreate; i++) {
            const serialNumber = `${product.itemCode || 'UNIT'}-SN-${String(i).padStart(3, '0')}`;
            const assetTagCode = `E3-${product.itemCode || 'TEMP'}-${String(i).padStart(3, '0')}`;

            await db.insert(inventoryUnits).values({
                id: uuidv4(),
                productId: product.id,
                vendorId: vendorId,
                assetTagCode,
                serialNumber,
                conditionStatus: "excellent",
                availabilityStatus: "in_warehouse",
                warehouseLocation: dummyMatch?.warehouseLocation !== 'N/A' ? dummyMatch?.warehouseLocation : "Main Warehouse",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            totalCreated++;
        }
    }

    console.log(`\n✅ Inventory Restoration Complete! Created ${totalCreated} units.`);
}

reseed().catch(console.error);
