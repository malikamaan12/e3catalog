import { db } from "../src/lib/db";
import { inventoryUnits, products, vendors } from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";

async function seed() {
    console.log("🌱 Seeding Fleet Data...");

    // 1. Get a product and a vendor
    const firstProduct = await db.query.products.findFirst();
    const firstVendor = await db.query.vendors.findFirst();

    if (!firstProduct || !firstVendor) {
        console.error("❌ Need products and vendors to seed fleet.");
        return;
    }

    const testUnits = [
        {
            id: uuidv4(),
            productId: firstProduct.id,
            vendorId: firstVendor.id,
            assetTagCode: "E3-TRUSS-001",
            serialNumber: "SN-99812-A",
            conditionStatus: "excellent",
            availabilityStatus: "in_warehouse",
            warehouseLocation: "Section A-1",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            productId: firstProduct.id,
            vendorId: firstVendor.id,
            assetTagCode: "E3-LIGHT-102",
            serialNumber: "LX-4450-B",
            conditionStatus: "good",
            availabilityStatus: "on_rent",
            warehouseLocation: "On Site (Project X)",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            productId: firstProduct.id,
            vendorId: firstVendor.id,
            assetTagCode: "E3-CABLE-505",
            serialNumber: "CB-0012-C",
            conditionStatus: "maintenance_required",
            availabilityStatus: "in_maintenance",
            warehouseLocation: "Repair Bay 2",
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    ];

    for (const unit of testUnits) {
        await db.insert(inventoryUnits).values(unit).onConflictDoNothing();
    }

    console.log("✅ Fleet Seeded Successfully.");
}

seed().catch(console.error);
