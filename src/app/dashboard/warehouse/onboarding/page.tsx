import { db } from "@/lib/db";
import { stagingInventory, categories } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BoxesIcon, PackagePlus } from "lucide-react";
import StagingGrid, { type StagingItem } from "@/components/warehouse/StagingGrid";
import Link from "next/link";

export const metadata = {
    title: "Bulk Onboarding | Warehouse Hub",
    description: "Count and digitize warehouse inventory during transfer operations.",
};

// Force dynamic rendering — grid data must be fresh on every load
export const dynamic = "force-dynamic";

export default async function BulkOnboardingPage() {
    // ── Auth Guard ──
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const allowedRoles = ["super_admin", "admin", "warehouse_manager"];
    if (!allowedRoles.includes(user.role)) {
        redirect("/dashboard");
    }

    // ── Fetch all staging rows (newest first) ──
    const rows = await db
        .select({
            id: stagingInventory.id,
            vendorId: stagingInventory.vendorId,
            roughName: stagingInventory.roughName,
            roughImageUrl: stagingInventory.roughImageUrl,
            roughCategory: stagingInventory.roughCategory,
            dimensions: stagingInventory.dimensions,
            weight: stagingInventory.weight,
            technicalNotes: stagingInventory.technicalNotes,
            countedQuantity: stagingInventory.countedQuantity,
            migrationStatus: stagingInventory.migrationStatus,
            migratedProductId: stagingInventory.migratedProductId,
            createdAt: stagingInventory.createdAt,
        })
        .from(stagingInventory)
        .orderBy(desc(stagingInventory.createdAt));

    // ── Fetch active categories for dropdown ──
    const allCategories = await db
        .select({
            id: categories.id,
            name: categories.name,
        })
        .from(categories)
        .orderBy(categories.name);

    const countingCount = rows.filter((r) => r.migrationStatus === "counting").length;
    const migratedCount = rows.filter((r) => r.migrationStatus === "migrated").length;
    const totalUnitsLogged = rows.reduce((sum, r) => sum + r.countedQuantity, 0);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24">
            {/* ── Page Header ── */}
            <header className="flex flex-col gap-1 pt-2">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2.5 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                <BoxesIcon className="h-5 w-5 text-[var(--color-gold)]" />
                            </div>
                            <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black tracking-tight text-[var(--color-warm-white)] italic uppercase">
                                Bulk <span className="text-[var(--color-gold)]">Onboarding</span>
                            </h1>
                        </div>
                        <p className="text-[var(--color-slate)] text-sm font-medium ml-14">
                            Warehouse Migration Tool — digitize assets into the live catalog
                        </p>
                    </div>

                    {/* Quick link to labels */}
                    {migratedCount > 0 && (
                        <Link
                            href="/dashboard/warehouse/labels"
                            className="flex items-center gap-3 px-5 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/50 text-sky-400 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-500/10"
                        >
                            <PackagePlus className="h-4 w-4" />
                            Print {migratedCount} Migrated QR Labels
                        </Link>
                    )}
                </div>

                {/* ── Summary stat strip ── */}
                <div className="flex items-center gap-8 mt-6 overflow-x-auto pb-2 scrollbar-none">
                    <div className="flex flex-col bg-white/5 border border-white/5 rounded-xl px-5 py-3 min-w-[120px]">
                        <span className="text-xs font-black text-[var(--color-slate)] uppercase tracking-[0.2em] mb-1 opacity-60">Total Items</span>
                        <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] leading-none">{rows.length}</span>
                    </div>
                    <div className="flex flex-col bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/10 rounded-xl px-5 py-3 min-w-[120px]">
                        <span className="text-xs font-black text-[var(--color-gold)] uppercase tracking-[0.2em] mb-1 opacity-60">Counting</span>
                        <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)] leading-none">{countingCount}</span>
                    </div>
                    <div className="flex flex-col bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-5 py-3 min-w-[120px]">
                        <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 opacity-60">Migrated</span>
                        <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-emerald-500 leading-none">{migratedCount}</span>
                    </div>
                    <div className="flex flex-col bg-sky-500/5 border border-sky-500/10 rounded-xl px-5 py-3 min-w-[120px]">
                        <span className="text-xs font-black text-sky-500 uppercase tracking-[0.2em] mb-1 opacity-60">Units Logged</span>
                        <span className="text-2xl font-[family-name:var(--font-heading)] font-black text-sky-500 leading-none">{totalUnitsLogged.toLocaleString()}</span>
                    </div>
                </div>
            </header>

            {/* ── How it works (collapsed tip) ── */}
            <details className="glass rounded-2xl border border-white/5 overflow-hidden group">
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none text-slate-400 text-sm font-bold hover:text-slate-200 transition-colors select-none">
                    <span className="text-amber-500 font-black text-xs uppercase tracking-widest">How it works</span>
                    <span className="ml-auto text-xs text-slate-700 group-open:hidden">Tap to expand ▸</span>
                    <span className="ml-auto text-xs text-slate-700 hidden group-open:block">Tap to collapse ▾</span>
                </summary>
                <div className="px-5 pb-5 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5">
                    {[
                        { step: "1", label: "Add Items", desc: "Hit 'Add Blank Row' for each type of item you find in the warehouse. A row per item type, not per piece." },
                        { step: "2", label: "Count & Fill", desc: "Use the [ + ] / [ - ] buttons to count pieces as you walk through. Fill in name and notes — fields save automatically." },
                        { step: "3", label: "Convert", desc: "When done, hit 'Convert'. The system creates 1 Product + N Digital Passports instantly. Then print QR labels." },
                    ].map((s) => (
                        <div key={s.step} className="flex gap-3">
                            <span className="text-3xl font-black text-slate-800 leading-none">{s.step}</span>
                            <div>
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{s.label}</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </details>

            {/* ── The Grid ── */}
            <StagingGrid initialRows={rows as StagingItem[]} categories={allCategories} />
        </div>
    );
}
