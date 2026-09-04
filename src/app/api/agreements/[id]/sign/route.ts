import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rentalAgreements, bookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { logStatusTransition } from "@/lib/state-machine";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        const { id } = await params;
        const body = await req.json();

        const {
            signatureData,
            signerName,
            signerQid,
        } = body;

        if (!signatureData || !signerName) {
            return NextResponse.json({
                error: "signatureData and signerName are required to sign the agreement."
            }, { status: 400 });
        }

        const agreement = await db.query.rentalAgreements.findFirst({
            where: eq(rentalAgreements.id, id),
            with: { booking: true }
        });

        if (!agreement) {
            return NextResponse.json({ error: "Rental agreement not found." }, { status: 404 });
        }

        if (agreement.status === "signed") {
            return NextResponse.json({ error: "Agreement is already signed." }, { status: 400 });
        }

        // Capture client audit info
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "Web Client";
        const now = new Date();

        const [signed] = await db.update(rentalAgreements)
            .set({
                status: "signed",
                signedByClientName: signerName,
                signedByClientQid: signerQid || null,
                clientSignatureData: signatureData,
                signedAt: now,
                ipAddress: ip,
                userAgent: userAgent,
                updatedAt: now,
            })
            .where(eq(rentalAgreements.id, id))
            .returning();

        // Transition booking to 'confirmed' / 'staged' if currently approved
        if (agreement.booking && agreement.booking.status === "approved") {
            await db.update(bookings)
                .set({ status: "confirmed", updatedAt: now })
                .where(eq(bookings.id, agreement.bookingId));

            await logStatusTransition({
                actorId: user?.id || "client",
                targetId: agreement.bookingId,
                fromStatus: "approved",
                toStatus: "confirmed",
                role: "client",
                details: `Digital rental agreement #${agreement.agreementNumber} signed by ${signerName} (QID: ${signerQid || 'N/A'}).`,
            });
        }

        return NextResponse.json({
            success: true,
            agreement: signed,
            message: "Rental Agreement successfully executed and digitally signed."
        });

    } catch (e: any) {
        console.error("POST /api/agreements/[id]/sign error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
