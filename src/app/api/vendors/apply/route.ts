import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("POST /api/vendors/apply received:", body.companyName);

        return NextResponse.json({ success: true, debug: "reached handler" });

        /*
        const { 
            companyName, website, taxId, pocName, pocPhone, email, password, 
            taxCardUrl, companyRegistrationUrl,
            // New fields
            bankName, accountName, accountNumber, iban, swift, agreedToTerms
        } = body;
        ...
        */
    } catch (error: any) {
        console.error("Vendor apply error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
