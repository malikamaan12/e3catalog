"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
    Plus, Minus, Trash2, Zap, CheckCircle2, Loader2,
    ClipboardList, PackageCheck, AlertCircle, X
} from "lucide-react";
import {
    addStagingRow,
    updateStagingField,
    updateStagingQuantity,
    deleteStagingRow,
    migrateStagingToFleet,
} from "@/actions/staging";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StagingItem = {
    id: string;
    vendorId: string | null;
    roughName: string;
    roughCategory: string | null;
    dimensions: string | null;
    weight: string | null;
    technicalNotes: string | null;
    countedQuantity: number;
    migrationStatus: string;
    migratedProductId: string | null;
    createdAt: Date;
};

// ─── Toast system ─────────────────────────────────────────────────────────────

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-medium max-w-sm animate-[slideUp_0.3s_ease-out]
                        ${t.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300" : ""}
                        ${t.type === "error" ? "bg-red-950/90 border-red-500/30 text-red-300" : ""}
                        ${t.type === "info" ? "bg-slate-900/90 border-white/10 text-slate-300" : ""}
                    `}
                >
                    {t.type === "success" && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />}
                    {t.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />}
                    <span className="flex-1">{t.message}</span>
                    <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Confirm Migration Dialog ─────────────────────────────────────────────────

function MigrateDialog({
    item,
    onConfirm,
    onCancel,
    loading,
}: {
    item: StagingItem;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-[#0D1526] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 md:p-8 w-full max-w-md mx-4 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/10">
                        <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight">
                        Convert to Live Catalog?
                    </h2>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 mb-6 space-y-2">
                    <p className="text-slate-300 font-semibold text-sm">{item.roughName || "Unnamed Item"}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Qty: <span className="text-amber-400 font-black">{item.countedQuantity}</span></span>
                        {item.dimensions && <span>Dims: {item.dimensions}</span>}
                        {item.weight && <span>Weight: {item.weight}</span>}
                    </div>
                </div>

                <p className="text-slate-400 text-sm mb-2 leading-relaxed">
                    This will create <span className="text-amber-400 font-black">1 Product</span> and{" "}
                    <span className="text-sky-400 font-black">{item.countedQuantity} Digital Passports</span>{" "}
                    (inventory units) with auto-generated QR asset tags.
                </p>
                <p className="text-slate-600 text-xs mb-6">Product will be unpublished (shadow inventory). The vendor can set price & publish from their catalog.</p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-3 rounded-2xl bg-amber-500 text-[#0A0F1C] font-black text-sm hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {loading ? "Converting..." : "Convert Now"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Quantity Stepper ─────────────────────────────────────────────────────────

function QuantityStepper({
    itemId,
    value,
    migrated,
    onChange,
}: {
    itemId: string;
    value: number;
    migrated: boolean;
    onChange: (newVal: number) => void;
}) {
    const [localVal, setLocalVal] = useState(value);
    const [pending, startTransition] = useTransition();

    useEffect(() => { setLocalVal(value); }, [value]);

    const step = useCallback((delta: number) => {
        if (migrated) return;
        const next = Math.max(0, localVal + delta);
        setLocalVal(next); // Optimistic
        startTransition(async () => {
            const res = await updateStagingQuantity(itemId, delta);
            if ("newQuantity" in res) {
                onChange(res.newQuantity);
                setLocalVal(res.newQuantity);
            }
        });
    }, [localVal, itemId, migrated, onChange]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed) || parsed < 0) return;
        const delta = parsed - localVal;
        if (delta === 0) return;
        setLocalVal(parsed);
        startTransition(async () => {
            const res = await updateStagingQuantity(itemId, delta);
            if ("newQuantity" in res) {
                onChange(res.newQuantity);
                setLocalVal(res.newQuantity);
            }
        });
    }, [localVal, itemId, onChange]);

    return (
        <div className={`flex items-center gap-1 ${migrated ? "opacity-50 pointer-events-none" : ""}`}>
            <button
                type="button"
                onClick={() => step(-1)}
                disabled={localVal === 0 || pending}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/10 transition-all disabled:opacity-30 text-slate-300"
                aria-label="Decrease quantity"
            >
                <Minus className="h-4 w-4" />
            </button>

            <input
                type="number"
                min={0}
                value={localVal}
                onChange={handleInputChange}
                className="w-16 text-center bg-slate-900 border border-white/10 rounded-xl py-2 text-slate-100 font-black text-base focus:outline-none focus:border-amber-500/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Quantity"
            />

            <button
                type="button"
                onClick={() => step(1)}
                disabled={pending}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-500/30 hover:border-amber-500/60 transition-all disabled:opacity-50 text-amber-400"
                aria-label="Increase quantity"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── Debounce Hook ────────────────────────────────────────────────────────────

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    return useCallback(
        ((...args: Parameters<T>) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => fn(...args), delay);
        }) as T,
        [fn, delay]
    );
}

// ─── Single Row Component ─────────────────────────────────────────────────────

function StagingRow({
    item,
    onUpdate,
    onRemove,
    onConvertClick,
    rowIndex,
}: {
    item: StagingItem;
    onUpdate: (id: string, field: string, value: string | number) => void;
    onRemove: (id: string) => void;
    onConvertClick: (item: StagingItem) => void;
    rowIndex: number;
}) {
    const isMigrated = item.migrationStatus === "migrated";
    const [deleting, startDelete] = useTransition();

    // Debounced field save (700ms)
    const saveField = useCallback(
        async (field: Parameters<typeof updateStagingField>[1], value: string) => {
            await updateStagingField(item.id, field, value);
        },
        [item.id]
    );

    const debouncedSave = useDebounce(
        useCallback(
            (field: Parameters<typeof updateStagingField>[1], value: string) => {
                onUpdate(item.id, field, value);
                saveField(field, value);
            },
            [saveField, onUpdate, item.id]
        ),
        700
    );

    const handleDelete = () => {
        startDelete(async () => {
            const res = await deleteStagingRow(item.id);
            if ("success" in res) onRemove(item.id);
        });
    };

    return (
        <>
            {/* ── Desktop row (lg+) ── */}
            <tr
                className={`border-b border-white/5 group transition-colors
                    ${isMigrated ? "opacity-60" : "hover:bg-white/[0.02]"}
                `}
            >
                {/* Index */}
                <td className="hidden lg:table-cell px-4 py-3 text-slate-600 text-xs font-bold w-10 text-center">
                    {String(rowIndex + 1).padStart(2, "0")}
                </td>

                {/* Name */}
                <td className="hidden lg:table-cell px-3 py-2">
                    <input
                        defaultValue={item.roughName}
                        disabled={isMigrated}
                        placeholder="e.g. Black VIP Chair"
                        onChange={(e) => debouncedSave("roughName", e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 focus:border-amber-500/50 outline-none text-slate-100 text-sm py-1.5 placeholder:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </td>

                {/* Category hint */}
                <td className="hidden lg:table-cell px-3 py-2 w-32">
                    <input
                        defaultValue={item.roughCategory ?? ""}
                        disabled={isMigrated}
                        placeholder="e.g. Chairs"
                        onChange={(e) => debouncedSave("roughCategory", e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 focus:border-amber-500/50 outline-none text-slate-400 text-xs py-1.5 placeholder:text-slate-700 transition-colors disabled:opacity-50"
                    />
                </td>

                {/* Dimensions */}
                <td className="hidden lg:table-cell px-3 py-2 w-36">
                    <input
                        defaultValue={item.dimensions ?? ""}
                        disabled={isMigrated}
                        placeholder="e.g. 50×50×100"
                        onChange={(e) => debouncedSave("dimensions", e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 focus:border-amber-500/50 outline-none text-slate-400 text-xs py-1.5 placeholder:text-slate-700 transition-colors disabled:opacity-50"
                    />
                </td>

                {/* Notes */}
                <td className="hidden lg:table-cell px-3 py-2">
                    <input
                        defaultValue={item.technicalNotes ?? ""}
                        disabled={isMigrated}
                        placeholder="Any notes..."
                        onChange={(e) => debouncedSave("technicalNotes", e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 focus:border-amber-500/50 outline-none text-slate-400 text-xs py-1.5 placeholder:text-slate-700 transition-colors disabled:opacity-50"
                    />
                </td>

                {/* Quantity stepper */}
                <td className="hidden lg:table-cell px-3 py-2 w-44">
                    <QuantityStepper
                        itemId={item.id}
                        value={item.countedQuantity}
                        migrated={isMigrated}
                        onChange={(val) => onUpdate(item.id, "countedQuantity", val)}
                    />
                </td>

                {/* Status + Actions */}
                <td className="hidden lg:table-cell px-3 py-2 w-44">
                    <div className="flex items-center gap-2">
                        {isMigrated ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                                <PackageCheck className="h-3 w-3" /> Migrated
                            </span>
                        ) : (
                            <>
                                <button
                                    onClick={() => onConvertClick(item)}
                                    disabled={item.countedQuantity === 0}
                                    title={item.countedQuantity === 0 ? "Set quantity > 0 first" : "Convert to Live Catalog"}
                                    className="flex items-center gap-1.5 text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/60 hover:bg-amber-500/20 rounded-full px-3 py-1 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    <Zap className="h-3 w-3" /> Convert
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>

            {/* ── Mobile card (< lg) ── */}
            <tr className="lg:hidden">
                <td colSpan={7} className="px-4 py-3">
                    <div className={`bg-white/[0.03] rounded-2xl p-4 border border-white/5 flex flex-col gap-4 ${isMigrated ? "opacity-60" : ""}`}>
                        {/* Row header */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                #{String(rowIndex + 1).padStart(2, "0")}
                            </span>
                            {isMigrated ? (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                                    <PackageCheck className="h-3 w-3" /> Migrated
                                </span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onConvertClick(item)}
                                        disabled={item.countedQuantity === 0}
                                        className="flex items-center gap-1.5 text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/60 rounded-full px-3 py-1.5 transition-all disabled:opacity-30"
                                    >
                                        <Zap className="h-3 w-3" /> Convert
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Item Name</label>
                            <input
                                defaultValue={item.roughName}
                                disabled={isMigrated}
                                placeholder="e.g. Black VIP Chair"
                                onChange={(e) => debouncedSave("roughName", e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 outline-none text-slate-100 text-sm placeholder:text-slate-700 transition-colors disabled:opacity-50"
                            />
                        </div>

                        {/* Category + Dimensions row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Category</label>
                                <input
                                    defaultValue={item.roughCategory ?? ""}
                                    disabled={isMigrated}
                                    placeholder="Chairs"
                                    onChange={(e) => debouncedSave("roughCategory", e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 outline-none text-slate-300 text-sm placeholder:text-slate-700 transition-colors disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Dimensions</label>
                                <input
                                    defaultValue={item.dimensions ?? ""}
                                    disabled={isMigrated}
                                    placeholder="50×50×100"
                                    onChange={(e) => debouncedSave("dimensions", e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 outline-none text-slate-300 text-sm placeholder:text-slate-700 transition-colors disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Notes</label>
                            <input
                                defaultValue={item.technicalNotes ?? ""}
                                disabled={isMigrated}
                                placeholder="Any notes..."
                                onChange={(e) => debouncedSave("technicalNotes", e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 outline-none text-slate-400 text-sm placeholder:text-slate-700 transition-colors disabled:opacity-50"
                            />
                        </div>

                        {/* Quantity stepper */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Counted Quantity</label>
                            <QuantityStepper
                                itemId={item.id}
                                value={item.countedQuantity}
                                migrated={isMigrated}
                                onChange={(val) => onUpdate(item.id, "countedQuantity", val)}
                            />
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
}

// ─── Main StagingGrid Component ───────────────────────────────────────────────

export default function StagingGrid({ initialRows }: { initialRows: StagingItem[] }) {
    const [rows, setRows] = useState<StagingItem[]>(initialRows);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [migrateTarget, setMigrateTarget] = useState<StagingItem | null>(null);
    const [migrating, startMigration] = useTransition();
    const [addingRow, startAddRow] = useTransition();

    const toast = useCallback((message: string, type: Toast["type"] = "info") => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const handleAddRow = () => {
        startAddRow(async () => {
            const res = await addStagingRow();
            if ("id" in res) {
                const newItem: StagingItem = {
                    id: res.id,
                    vendorId: null,
                    roughName: "",
                    roughCategory: null,
                    dimensions: null,
                    weight: null,
                    technicalNotes: null,
                    countedQuantity: 0,
                    migrationStatus: "counting",
                    migratedProductId: null,
                    createdAt: new Date(),
                };
                setRows((prev) => [...prev, newItem]);
            } else {
                toast("Failed to add row. Please try again.", "error");
            }
        });
    };

    const handleFieldUpdate = useCallback((id: string, field: string, value: string | number) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    }, []);

    const handleRemove = useCallback((id: string) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
        toast("Row deleted.", "info");
    }, [toast]);

    const handleConvertClick = useCallback((item: StagingItem) => {
        setMigrateTarget(item);
    }, []);

    const handleMigrateConfirm = () => {
        if (!migrateTarget) return;
        const targetId = migrateTarget.id;
        const targetQty = migrateTarget.countedQuantity;
        setMigrateTarget(null);

        startMigration(async () => {
            toast(`Converting "${migrateTarget.roughName || "item"}"...`, "info");
            const res = await migrateStagingToFleet(targetId);
            if ("productId" in res) {
                setRows((prev) =>
                    prev.map((r) =>
                        r.id === targetId
                            ? { ...r, migrationStatus: "migrated", migratedProductId: res.productId }
                            : r
                    )
                );
                toast(
                    `✅ Done! 1 Product + ${res.unitsCreated} Digital Passports created. Head to Print Labels to generate QR stickers.`,
                    "success"
                );
            } else {
                toast(`Migration failed: ${res.error}`, "error");
            }
        });
    };

    const countingCount = rows.filter((r) => r.migrationStatus === "counting").length;
    const migratedCount = rows.filter((r) => r.migrationStatus === "migrated").length;

    return (
        <>
            {/* ── Stats bar ── */}
            <div className="flex items-center gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">{countingCount} Counting</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <PackageCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{migratedCount} Migrated</span>
                </div>
                <span className="text-xs text-slate-600 italic">Fields auto-save as you type</span>
            </div>

            {/* ── Table (desktop) / Cards (mobile) ── */}
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        {/* Desktop header */}
                        <thead className="hidden lg:table-header-group">
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center w-10">#</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left">Item Name</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-32">Category</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-36">Dimensions</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left">Notes</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-44">Qty</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-44">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-600">
                                            <ClipboardList className="h-10 w-10 opacity-30" />
                                            <p className="text-sm font-medium italic">No staging items yet.</p>
                                            <p className="text-xs">Hit the button below to start counting inventory.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {rows.map((item, idx) => (
                                <StagingRow
                                    key={item.id}
                                    item={item}
                                    rowIndex={idx}
                                    onUpdate={handleFieldUpdate}
                                    onRemove={handleRemove}
                                    onConvertClick={handleConvertClick}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Sticky Add Row button ── */}
                <div className="border-t border-white/5 p-4">
                    <button
                        type="button"
                        onClick={handleAddRow}
                        disabled={addingRow}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 text-slate-500 hover:text-amber-400 font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-50 group"
                    >
                        {addingRow ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90 group-hover:scale-110" />
                        )}
                        {addingRow ? "Adding row..." : "Add Blank Row"}
                    </button>
                </div>
            </div>

            {/* ── Migrate Confirm Dialog ── */}
            {migrateTarget && (
                <MigrateDialog
                    item={migrateTarget}
                    onConfirm={handleMigrateConfirm}
                    onCancel={() => setMigrateTarget(null)}
                    loading={migrating}
                />
            )}

            {/* ── Toasts ── */}
            <ToastContainer toasts={toasts} dismiss={dismissToast} />
        </>
    );
}
