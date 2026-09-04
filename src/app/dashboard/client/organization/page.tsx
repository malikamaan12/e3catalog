import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CorporateWorkspaceManager from "@/components/corporate/CorporateWorkspaceManager";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Corporate Account & Team Governance | E3 Rentals",
    description: "Manage enterprise credit, cost centers, and requisition approval workflows.",
};

export default async function ClientOrganizationPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    return (
        <div className="p-6 md:p-10 min-h-screen">
            <CorporateWorkspaceManager currentUser={user} />
        </div>
    );
}
