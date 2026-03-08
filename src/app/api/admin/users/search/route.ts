import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { or, like, and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    const foundUsers = await db.query.users.findMany({
        where: and(
            eq(users.role, "client"),
            or(
                like(users.name, searchTerm),
                like(users.email, searchTerm),
                like(users.companyName, searchTerm),
                like(users.phoneNumber, searchTerm)
            )
        ),
        columns: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            phoneNumber: true,
        },
        limit: 10,
    });

    return NextResponse.json(foundUsers);
}
