import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminChatSystem from "@/components/admin/AdminChatSystem";

export default async function AdminChatPage() {
    const user = await getCurrentUser();
    if (!user || !["admin", "super_admin", "vendor", "sales_rep"].includes(user.role)) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-warm-white)] font-[family-name:var(--font-heading)]">Client Communications</h1>
                <p className="text-[var(--color-slate)] text-sm">Real-time chat with clients regarding their quotes and bookings.</p>
            </div>

            <AdminChatSystem adminUser={user} />
        </div>
    );
}
