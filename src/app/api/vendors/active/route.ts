import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { VENDOR_STATUS } from "@/lib/constants";

export async function GET() {
    try {
        const activeVendors = await db
            .select({
                id: vendors.id,
                companyName: vendors.companyName,
                tradingName: vendors.tradingName,
                logoUrl: vendors.logoUrl,
                bannerUrl: vendors.bannerUrl,
                brandStory: vendors.brandStory,
                equipmentCategories: vendors.equipmentCategories,
                operatingRegions: vendors.operatingRegions,
                scoreRating: vendors.scoreRating,
                yearEstablished: vendors.yearEstablished,
                city: vendors.city,
                country: vendors.country,
            })
            .from(vendors)
            .where(
                and(
                    eq(vendors.storeStatus, "active"),
                    inArray(vendors.lifecycleStatus, [VENDOR_STATUS.APPROVED, VENDOR_STATUS.ACTIVE])
                )
            )
            .orderBy(vendors.companyName);

        return NextResponse.json(activeVendors);
    } catch (e: any) {
        console.error("Error fetching active vendors:", e);
        return NextResponse.json([], { status: 500 });
    }
}
