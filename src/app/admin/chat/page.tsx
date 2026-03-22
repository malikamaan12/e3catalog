import { getCurrentUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import AdminChatSystem from "@/components/admin/AdminChatSystem";

export default async function AdminChatPage({ searchParams }: { searchParams: Promise<{ userId?: string; quoteId?: string }> }) {
    const user = await getCurrentUser();
    const params = await searchParams;
    
    if (!user || !["admin", "super_admin", "vendor", "sales_rep"].includes(user.role)) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">Client Communications</h1>
                <p className="text-[var(--color-slate)] text-sm">Real-time chat with clients regarding their quotes and bookings.</p>
            </div>

            <AdminChatSystem 
                adminUser={{ id: user.id }} 
                initialUserId={params.userId}
                initialQuoteId={params.quoteId}
            />
        </div>
    );
}
