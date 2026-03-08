import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.email || !body.password || !body.companyName) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        // Check if user exists
        const existingUsers = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
        if (existingUsers.length > 0) {
            return NextResponse.json({ error: "Email address is already in use." }, { status: 400 });
        }

        const userId = uuidv4();
        const vendorId = uuidv4();

        // 1. Create the Vendor Admin User
        await db.insert(users).values({
            id: userId,
            name: body.name,
            email: body.email.toLowerCase(),
            phoneNumber: body.phone,
            password: body.password,
            role: "vendor",
            companyName: body.companyName,
            registrationNo: body.registrationNo, // Store in users relation for now
            vendorId: vendorId, // Assign to the new tenant
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 2. Create the Vendor Tenant Record
        await db.insert(vendors).values({
            id: vendorId,
            userId: userId, // The owner ID
            companyName: body.companyName,
            website: body.website || null,
            taxId: body.taxId,
            taxCardExpiry: body.taxCardExpiry ? new Date(body.taxCardExpiry) : null,
            companyRegistrationExpiry: body.companyRegistrationExpiry ? new Date(body.companyRegistrationExpiry) : null,
            pocName: body.pocName,
            pocPhone: body.pocPhone,
            alternatePocName: body.alternatePocName || null,
            alternatePocPhone: body.alternatePocPhone || null,
            bankName: body.bankName,
            accountName: body.accountName,
            accountNumber: body.accountNumber,
            iban: body.iban || null,
            swift: body.swift || null,
            kycStatus: "pending",
            agreementStatus: "unsigned",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return NextResponse.json({ success: true, vendorId });
    } catch (err: any) {
        console.error("Failed to process vendor application:", err);
        return NextResponse.json({ error: err.message || "An unexpected error occurred." }, { status: 500 });
    }
}
