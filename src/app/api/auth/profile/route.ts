import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let vendorData = null;
    if ((row as any).role === USER_ROLES.VENDOR) {
        const vendor = await db.query.vendors.findFirst({
            where: eq(users.id, row.id) // userId in vendors table
        });
        if (vendor) vendorData = vendor;
    }

    return NextResponse.json({
        user: {
            ...row,
            role: (row as any).role,
            vendorProfile: vendorData
        }
    });
}

export async function PUT(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const {
            name, phoneNumber, password,
            companyName, registrationNo, location, address, designation, alternatePhone,
            pocName, pocPhone, pocEmail, pocDesignation, projectContacts, image,
            vendorUpdate // New object for vendor-specific table updates
        } = body;

        // 1. Update User Table
        const userUpdate: any = { updatedAt: new Date() };

        if (name?.trim()) userUpdate.name = name.trim();
        if (phoneNumber !== undefined) userUpdate.phoneNumber = phoneNumber?.trim() || null;
        if (companyName !== undefined) userUpdate.companyName = companyName?.trim() || null;
        if (registrationNo !== undefined) userUpdate.registrationNo = registrationNo?.trim() || null;
        if (location !== undefined) userUpdate.location = location?.trim() || null;
        if (address !== undefined) userUpdate.address = address?.trim() || null;
        if (designation !== undefined) userUpdate.designation = designation?.trim() || null;
        if (alternatePhone !== undefined) userUpdate.alternatePhone = alternatePhone?.trim() || null;
        if (pocName !== undefined) userUpdate.pocName = pocName?.trim() || null;
        if (pocPhone !== undefined) userUpdate.pocPhone = pocPhone?.trim() || null;
        if (pocEmail !== undefined) userUpdate.pocEmail = pocEmail?.trim() || null;
        if (pocDesignation !== undefined) userUpdate.pocDesignation = pocDesignation?.trim() || null;
        if (projectContacts !== undefined) userUpdate.projectContacts = projectContacts;
        if (image !== undefined) userUpdate.image = image?.trim() || null;
        if (password && password.length >= 6) userUpdate.password = password;

        await db.update(users).set(userUpdate).where(eq(users.id, user.id));

        // 2. Update Vendor Table if applicable
        if (user.role === USER_ROLES.VENDOR && vendorUpdate) {
            const { vendors: vendorTable } = await import("@/lib/db/schema");
            
            const vUpdate: any = { updatedAt: new Date() };
            const allowedVendorFields = [
                "website", "taxId", "taxCardUrl", "companyRegistrationUrl",
                "bankName", "accountName", "accountNumber", "iban", "swift",
                "pocName", "pocPhone", "alternatePocName", "alternatePocPhone", "logoUrl"
            ];

            allowedVendorFields.forEach(field => {
                if (vendorUpdate[field] !== undefined) {
                    vUpdate[field] = vendorUpdate[field];
                }
            });

            await db.update(vendorTable).set(vUpdate).where(eq(vendorTable.userId, user.id));
        }

        return NextResponse.json({ success: true, message: "Profile updated successfully" });
    } catch (error: any) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
