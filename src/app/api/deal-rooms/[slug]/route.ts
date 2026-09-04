import { NextRequest, NextResponse } from "next/server";
import { getDealRoomProposal, acceptDealRoomProposal } from "@/lib/deal-room";

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await props.params;
        const { searchParams } = new URL(req.url);
        const passcode = searchParams.get("passcode") || undefined;

        const data = await getDealRoomProposal(slug, passcode);
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Deal room GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to load deal room" }, { status: 404 });
    }
}

export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await props.params;
        const body = await req.json();
        const { signerName, signerTitle, signatureDataUrl, selectedAddonIds } = body;

        if (!signerName || !signerTitle) {
            return NextResponse.json({ error: "Signer name and title are required for e-signature acceptance." }, { status: 400 });
        }

        const result = await acceptDealRoomProposal({
            slug,
            signerName,
            signerTitle,
            signatureDataUrl: signatureDataUrl || "digital-sign-hash",
            selectedAddonIds,
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Deal room accept error:", err);
        return NextResponse.json({ error: err.message || "Failed to accept proposal" }, { status: 500 });
    }
}
