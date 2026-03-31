"use server";

import { db } from "@/lib/db";
import { stagingInventory, products, inventoryUnits, categories, vendors } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateId(): string {
    return crypto.randomUUID();
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 200);
}

// Pad number to 3 digits: 1 → "001"
function padIndex(n: number): string {
    return n.toString().padStart(3, "0");
}

// ─── 1. Add Blank Staging Row ─────────────────────────────────────────────────

export async function addStagingRow(): Promise<{ id: string } | { error: string }> {
    const authCheck = await requireAdmin();
    if (authCheck.error) return { error: "Unauthorized" };

    // Capture the current user's vendorId (if they are a vendor)
    const user = await getCurrentUser();
    const vendorId = user?.vendorId ?? null;

    const newId = generateId();
    try {
        await db.insert(stagingInventory).values({
            id: newId,
            vendorId: vendorId,
            roughName: "",
            countedQuantity: 0,
            migrationStatus: "counting",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        revalidatePath("/dashboard/warehouse/onboarding");
        return { id: newId };
    } catch (err) {
        console.error("[staging] addStagingRow failed:", err);
        return { error: "Failed to add row" };
    }
}

// ─── 2. Update a Single Field (Auto-Save) ────────────────────────────────────

type UpdatableField =
    | "roughName"
    | "roughCategory"
    | "dimensions"
    | "weight"
    | "technicalNotes"
    | "roughImageUrl";

export async function updateStagingField(
    id: string,
    field: UpdatableField,
    value: string
): Promise<{ success: boolean } | { error: string }> {
    const authCheck = await requireAdmin();
    if (authCheck.error) return { error: "Unauthorized" };

    // Guard: only allow updating 'counting' rows
    const [row] = await db
        .select({ migrationStatus: stagingInventory.migrationStatus })
        .from(stagingInventory)
        .where(eq(stagingInventory.id, id))
        .limit(1);

    if (!row) return { error: "Row not found" };
    if (row.migrationStatus === "migrated") return { error: "Cannot edit a migrated row" };

    try {
        await db
            .update(stagingInventory)
            .set({ [field]: value, updatedAt: new Date() })
            .where(eq(stagingInventory.id, id));

        revalidatePath("/dashboard/warehouse/onboarding");
        return { success: true };
    } catch (err) {
        console.error("[staging] updateStagingField failed:", err);
        return { error: "Failed to update field" };
    }
}

// ─── 3. Increment / Decrement Quantity (Atomic) ───────────────────────────────

export async function updateStagingQuantity(
    id: string,
    delta: number // +1 or -1 (or any integer step)
): Promise<{ newQuantity: number } | { error: string }> {
    const authCheck = await requireAdmin();
    if (authCheck.error) return { error: "Unauthorized" };

    try {
        const [updated] = await db
            .update(stagingInventory)
            .set({
                countedQuantity: sql`GREATEST(0, ${stagingInventory.countedQuantity} + ${delta})`,
                updatedAt: new Date(),
            })
            .where(eq(stagingInventory.id, id))
            .returning({ newQuantity: stagingInventory.countedQuantity });

        if (!updated) return { error: "Row not found" };

        revalidatePath("/dashboard/warehouse/onboarding");
        return { newQuantity: updated.newQuantity };
    } catch (err) {
        console.error("[staging] updateStagingQuantity failed:", err);
        return { error: "Failed to update quantity" };
    }
}

// ─── 4. Delete Staging Row ────────────────────────────────────────────────────

export async function deleteStagingRow(id: string): Promise<{ success: boolean } | { error: string }> {
    const authCheck = await requireAdmin();
    if (authCheck.error) return { error: "Unauthorized" };

    const [row] = await db
        .select({ migrationStatus: stagingInventory.migrationStatus })
        .from(stagingInventory)
        .where(eq(stagingInventory.id, id))
        .limit(1);

    if (!row) return { error: "Row not found" };
    if (row.migrationStatus === "migrated") return { error: "Cannot delete a migrated row" };

    try {
        await db.delete(stagingInventory).where(eq(stagingInventory.id, id));
        revalidatePath("/dashboard/warehouse/onboarding");
        return { success: true };
    } catch (err) {
        console.error("[staging] deleteStagingRow failed:", err);
        return { error: "Failed to delete row" };
    }
}

// ─── 5. THE MIGRATION ENGINE ──────────────────────────────────────────────────
//
//  migrateStagingToFleet(stagingId)
//  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. Fetch staging row — validate it's in 'counting' state with qty > 0
//  2. Upsert a "Staging / Uncategorized" category (slug: staging-uncategorized)
//  3. INSERT into products (isPublished: false, pricePerDay: 0)
//  4. INSERT N rows into inventory_units (N = countedQuantity)
//     Each row gets assetTagCode = TMP-{PRODID}-001..N
//  5. UPDATE staging row → migrationStatus: 'migrated', migratedProductId set
//

export async function migrateStagingToFleet(stagingId: string): Promise<
    | { productId: string; unitsCreated: number }
    | { error: string }
> {
    const authCheck = await requireAdmin();
    if (authCheck.error) return { error: "Unauthorized" };

    // ── Fetch staging row ──
    const [stagingRow] = await db
        .select()
        .from(stagingInventory)
        .where(eq(stagingInventory.id, stagingId))
        .limit(1);

    if (!stagingRow) return { error: "Staging item not found" };
    if (stagingRow.migrationStatus === "migrated") return { error: "This item has already been migrated" };
    if (stagingRow.countedQuantity < 1) return { error: "Counted quantity must be at least 1 before converting" };

    // ── Resolve vendor ──
    // If staging row has a vendorId, use it. Otherwise fall back to the first vendor in the system.
    let resolvedVendorId = stagingRow.vendorId;
    if (!resolvedVendorId) {
        const [firstVendor] = await db
            .select({ id: vendors.id })
            .from(vendors)
            .limit(1);
        if (!firstVendor) return { error: "No vendors exist in the system. Please create a vendor first." };
        resolvedVendorId = firstVendor.id;
    }

    try {
        const result = await db.transaction(async (tx) => {
            // ── Step 1: Ensure staging category exists ──
            const STAGING_CATEGORY_ID = "cat-staging-uncategorized";
            const [existingCat] = await tx
                .select({ id: categories.id })
                .from(categories)
                .where(eq(categories.slug, "staging-uncategorized"))
                .limit(1);

            if (!existingCat) {
                await tx.insert(categories).values({
                    id: STAGING_CATEGORY_ID,
                    name: "Staging / Uncategorized",
                    slug: "staging-uncategorized",
                    active: false,
                    sortOrder: 9999,
                });
            }
            const categoryId = existingCat?.id ?? STAGING_CATEGORY_ID;

            // ── Step 2: Create the live product (shadow inventory — not published) ──
            const productId = generateId();
            const rawName = stagingRow.roughName?.trim() || "Unnamed Staging Item";
            const baseSlug = slugify(rawName);
            const uniqueSlug = `${baseSlug}-${productId.slice(0, 8)}`;

            await tx.insert(products).values({
                id: productId,
                vendorId: resolvedVendorId,
                categoryId: categoryId,
                name: rawName,
                slug: uniqueSlug,
                dimensions: stagingRow.dimensions ?? undefined,
                weight: stagingRow.weight ?? undefined,
                thumbnailUrl: stagingRow.roughImageUrl ?? undefined,
                adminNotes: stagingRow.technicalNotes
                    ? `[Migrated from staging]\n${stagingRow.technicalNotes}`
                    : "[Migrated from staging inventory]",
                isPublished: false,           // Shadow inventory until vendor reviews
                pricePerDay: 0,               // Vendor must set price after migration
                priceType: "daily",
                unit: "unit",
                minOrderQty: 1,
                showPrice: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // ── Step 3: Generate N inventory_units (Digital Passports) ──
            const qty = stagingRow.countedQuantity;
            // Build short prefix from product ID (first 6 uppercase chars)
            const tagPrefix = `TMP-${productId.slice(0, 6).toUpperCase()}`;

            const unitRows = Array.from({ length: qty }, (_, i) => ({
                id: generateId(),
                productId: productId,
                vendorId: resolvedVendorId!,
                assetTagCode: `${tagPrefix}-${padIndex(i + 1)}`,
                conditionStatus: "excellent" as const,
                availabilityStatus: "in_warehouse" as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));

            // Insert in batches of 100 to avoid query size limits
            const BATCH_SIZE = 100;
            for (let batchStart = 0; batchStart < unitRows.length; batchStart += BATCH_SIZE) {
                await tx
                    .insert(inventoryUnits)
                    .values(unitRows.slice(batchStart, batchStart + BATCH_SIZE));
            }

            // ── Step 4: Mark staging row as migrated ──
            await tx
                .update(stagingInventory)
                .set({
                    migrationStatus: "migrated",
                    migratedProductId: productId,
                    updatedAt: new Date(),
                })
                .where(eq(stagingInventory.id, stagingId));

            return { productId, unitsCreated: qty };
        });

        revalidatePath("/dashboard/warehouse/onboarding");
        revalidatePath("/admin/inventory");
        return result;
    } catch (err) {
        console.error("[staging] migrateStagingToFleet failed:", err);
        return { error: `Migration failed: ${(err as Error).message}` };
    }
}
