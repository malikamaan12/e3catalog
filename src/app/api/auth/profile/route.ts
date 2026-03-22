import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [row] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        phoneNumber: users.phoneNumber,
        companyName: users.companyName,
        registrationNo: users.registrationNo,
        location: users.location,
        address: users.address,
        designation: users.designation,
        alternatePhone: users.alternatePhone,
        pocName: users.pocName,
        pocPhone: users.pocPhone,
        pocEmail: users.pocEmail,
        pocDesignation: users.pocDesignation,
        projectContacts: users.projectContacts,
    }).from(users).where(eq(users.id, user.id));
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
        user: {
            name: row.name,
            email: row.email,
            image: (row as any).image || "",
            phoneNumber: row.phoneNumber || "",
            companyName: (row as any).companyName || "",
            registrationNo: (row as any).registrationNo || "",
            location: (row as any).location || "",
            address: (row as any).address || "",
            designation: (row as any).designation || "",
            alternatePhone: (row as any).alternatePhone || "",
            pocName: (row as any).pocName || "",
            pocPhone: (row as any).pocPhone || "",
            pocEmail: (row as any).pocEmail || "",
            pocDesignation: (row as any).pocDesignation || "",
            projectContacts: (row as any).projectContacts || [],
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
        } = body;

        const update: any = { updatedAt: new Date() };

        if (name?.trim()) update.name = name.trim();
        if (phoneNumber !== undefined) update.phoneNumber = phoneNumber?.trim() || null;
        if (companyName !== undefined) update.companyName = companyName?.trim() || null;
        if (registrationNo !== undefined) update.registrationNo = registrationNo?.trim() || null;
        if (location !== undefined) update.location = location?.trim() || null;
        if (address !== undefined) update.address = address?.trim() || null;
        if (designation !== undefined) update.designation = designation?.trim() || null;
        if (alternatePhone !== undefined) update.alternatePhone = alternatePhone?.trim() || null;
        if (pocName !== undefined) update.pocName = pocName?.trim() || null;
        if (pocPhone !== undefined) update.pocPhone = pocPhone?.trim() || null;
        if (pocEmail !== undefined) update.pocEmail = pocEmail?.trim() || null;
        if (pocDesignation !== undefined) update.pocDesignation = pocDesignation?.trim() || null;
        if (projectContacts !== undefined) update.projectContacts = projectContacts;
        if (image !== undefined) update.image = image?.trim() || null;
        if (password && password.length >= 6) update.password = password;

        await db.update(users).set(update).where(eq(users.id, user.id));

        return NextResponse.json({ success: true, message: "Profile updated successfully" });
    } catch (error: any) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
