import { db } from "@/lib/db";
import { stagingInventory } from "@/lib/db/schema";
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
                            <div className="p-2 rounded-xl bg-amber-500/10">
                                <BoxesIcon className="h-5 w-5 text-amber-500" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-100 italic uppercase">
                                Bulk <span className="text-amber-500">Onboarding</span>
                            </h1>
                        </div>
                        <p className="text-slate-500 text-sm font-medium ml-12">
                            Warehouse Migration Tool — count assets, then convert to live catalog
                        </p>
                    </div>

                    {/* Quick link to labels */}
                    {migratedCount > 0 && (
                        <Link
                            href="/dashboard/warehouse/labels"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/50 text-sky-400 text-sm font-bold transition-all"
                        >
                            <PackagePlus className="h-4 w-4" />
                            Print {migratedCount} Migrated QR Labels
                        </Link>
                    )}
                </div>

                {/* ── Summary stat strip ── */}
                <div className="flex items-center gap-6 mt-4 overflow-x-auto pb-1">
                    <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-100 leading-none">{rows.length}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Total Items</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-2xl font-black text-amber-400 leading-none">{countingCount}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Counting</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-2xl font-black text-emerald-400 leading-none">{migratedCount}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Migrated</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-2xl font-black text-sky-400 leading-none">{totalUnitsLogged.toLocaleString()}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Units Logged</span>
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
            <StagingGrid initialRows={rows as StagingItem[]} />
        </div>
    );
}
