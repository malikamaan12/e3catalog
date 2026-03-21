import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            companyName, website, taxId, pocName, pocPhone, email, password, 
            taxCardUrl, companyRegistrationUrl,
            bankName, accountName, accountNumber, iban, swift, agreedToTerms
        } = body;

        if (!email || !password || !companyName || !pocName || !pocPhone) {
            return NextResponse.json({ error: "Missing required fields (Company, Email, Password, POC details)." }, { status: 400 });
        }

        if (!agreedToTerms) {
            return NextResponse.json({ error: "You must agree to the commission rules to proceed." }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check if user already exists
        const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
        if (existingUsers.length > 0) {
            return NextResponse.json({ error: "This email address is already registered." }, { status: 409 });
        }

        // 2. Security: Hash the password using bcryptjs
        const hashedPassword = await hash(password, 10);
        
        const userId = uuid();
        const vendorId = uuid();

        // 3. The Atomic Transaction: Create User (as client) and Vendor Record
        await db.transaction(async (tx) => {
            // A. Create the User record (Role: client for initial security baseline)
            await tx.insert(users).values({
                id: userId,
                name: pocName,
                email: normalizedEmail,
                phoneNumber: pocPhone,
                password: hashedPassword,
                role: "client", // Locks out of vendor dashboard until KYC review
                companyName: companyName,
                vendorId: vendorId, // Multi-tenant isolation link
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // B. Create the Vendor Tenant Record (Status: pending)
            await tx.insert(vendors).values({
                id: vendorId,
                userId: userId,
                companyName: companyName,
                website: website || null,
                taxId: taxId || null,
                taxCardUrl: taxCardUrl || null,
                companyRegistrationUrl: companyRegistrationUrl || null,
                pocName: pocName,
                pocPhone: pocPhone,
                bankName: bankName || null,
                accountName: accountName || null,
                accountNumber: accountNumber || null,
                iban: iban || null,
                swift: swift || null,
                kycStatus: "pending",
                agreementStatus: "unsigned",
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        console.log("Vendor Onboarding Complete for:", companyName, "Vendor ID:", vendorId);
        
        return NextResponse.json({ 
            success: true, 
            vendorId,
            message: "Application received! Our team will review your KYC documents soon."
        });

    } catch (error: any) {
        console.error("Vendor application handler error:", error);
        return NextResponse.json(
            { error: error.message || "A server-side error occurred during application processing." },
            { status: 500 }
        );
    }
}
