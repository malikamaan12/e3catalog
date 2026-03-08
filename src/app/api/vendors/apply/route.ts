import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { companyName, website, taxId, pocName, pocPhone, email, password, taxCardUrl, companyRegistrationUrl } = body;

        // Basic Validation
        if (!companyName || !taxId || !pocName || !pocPhone || !email || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user already exists
        const existingUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
        if (existingUsers.length > 0) {
            return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
        }

        const userId = crypto.randomUUID();
        const vendorId = crypto.randomUUID();

        // Wrap in a transaction to ensure both User and Vendor records are created safely
        await db.transaction(async (tx) => {
            // 1. Create the base User (Role: Vendor)
            await tx.insert(users).values({
                id: userId,
                name: pocName,
                email: email.toLowerCase(),
                phoneNumber: pocPhone,
                password: password, // For an enterprise app later, we should hash this, but keeping consistent with existing login logic
                role: "vendor",
                status: "active", // The user can log in, but the vendor store operates on 'storeStatus' / 'kycStatus' limits
                vendorId: vendorId, // Link User -> Vendor Dashboard
                companyName: companyName,
            });

            // 2. Create the precise Vendor KYC Profile
            await tx.insert(vendors).values({
                id: vendorId,
                userId: userId,
                companyName: companyName,
                website: website || null,
                taxId: taxId,
                taxCardUrl: taxCardUrl,
                companyRegistrationUrl: companyRegistrationUrl,
                pocName: pocName,
                pocPhone: pocPhone,
                kycStatus: "pending",     // Must be approved by a Super Admin
                storeStatus: "offline",   // Products will not be public yet
                agreementStatus: "unsigned",
            });
        });

        // (Optional) Fire notification to Admin Slack/Email
        // e.g. await notificationService.sendAdminAlert(`New Vendor Application: ${companyName}`);

        return NextResponse.json({ success: true, vendorId });
    } catch (error: any) {
        console.error("Vendor apply error:", error);
        return NextResponse.json(
            { error: "Internal server error during application submission" },
            { status: 500 }
        );
    }
}
