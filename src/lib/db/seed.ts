/**
 * E3 Enterprise Bulk Product Injection
 * Inserts 30 demo products and 5 inventory units per product (150 total units)
 * Adapted to the ACTUAL schema: pricePerDay, dimensions, condition, slug, etc.
 */
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';
import { dummyProducts } from './dummyData'; // Relative import since we are in src/lib/db/

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

function toSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function bulkAddProducts() {
    const client = await pool.connect();
    let productCount = 0;
    let unitCount = 0;

    try {
        console.log("🚀 Starting Enterprise Bulk Product Injection...\n");

        for (const item of dummyProducts) {
            // 1. Look up category by slug
            const catResult = await client.query(
                `SELECT id FROM categories WHERE slug = $1 AND active = true LIMIT 1`,
                [item.categorySlug]
            );

            if (catResult.rowCount === 0) {
                console.warn(`  ⚠ Category not found: ${item.categorySlug} — skipping ${item.name}`);
                continue;
            }
            const categoryId = catResult.rows[0].id;

            // 2. We now use ON CONFLICT DO UPDATE, so we don't skip existing itemCodes.
            const existing = await client.query(
                `SELECT id FROM products WHERE item_code = $1 LIMIT 1`,
                [item.itemCode]
            );
            const productId = existing.rowCount && existing.rowCount > 0 
                ? existing.rows[0].id 
                : uuidv4();
            const slug = toSlug(item.name);

            await client.query(`
                INSERT INTO products (
                    id, vendor_id, category_id, name, slug, item_code,
                    short_description, dimensions, weight, power_requirements, materials,
                    price_per_day, show_price, price_type, unit, min_order_qty,
                    featured, requires_license, requires_approval,
                    thumbnail_url, created_at, updated_at
                ) VALUES (
                    $1, 'E3-ENT', $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, true, 'daily', 'unit', 1,
                    false, false, false,
                    $12, NOW(), NOW()
                )
                ON CONFLICT (item_code) DO UPDATE SET
                    thumbnail_url = EXCLUDED.thumbnail_url,
                    updated_at = NOW()
                `,
                [
                    productId, categoryId, item.name, slug, item.itemCode,
                    item.shortDescription, item.dimensions, item.weight,
                    item.powerRequirements, item.materials,
                    item.pricePerDay, (item as any).thumbnailUrl
                ]
            );
            productCount++;
            console.log(`  ✅ Product: ${item.name} (${item.itemCode})`);

            // 4. Generate inventory_units ONLY if none exist
            const existingUnits = await client.query(
                `SELECT id FROM inventory_units WHERE product_id = $1 LIMIT 1`,
                [productId]
            );

            if (existingUnits.rowCount === 0) {
                const unitsToCreate = item.units;
                for (let i = 1; i <= unitsToCreate; i++) {
                    const serialNumber = `${item.itemCode}-SN-${String(i).padStart(3, '0')}`;
                    await client.query(`
                        INSERT INTO inventory_units (
                            id, product_id, serial_number, condition, status,
                            warehouse_location, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, 'available', $5, NOW(), NOW())`,
                        [
                            uuidv4(), productId, serialNumber,
                            item.condition,
                            item.warehouseLocation !== 'N/A' ? item.warehouseLocation : null,
                        ]
                    );
                    unitCount++;
                }
                console.log(`     └─ ${unitsToCreate} inventory unit${unitsToCreate > 1 ? 's' : ''} created`);
            } else {
                console.log(`     └─ Skipping inventory units (already exist)`);
            }
        }

        console.log(`\n🎉 Bulk upload complete!`);
        console.log(`   📦 ${productCount} Products inserted`);
        console.log(`   🔢 ${unitCount} Inventory Units created`);

    } finally {
        client.release();
        await pool.end();
    }
}

bulkAddProducts().catch(err => {
    console.error("\n❌ Bulk upload failed:", err.message);
    process.exit(1);
});
