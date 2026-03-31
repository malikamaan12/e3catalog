"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
    Plus, Minus, Trash2, Zap, CheckCircle2, Loader2,
    ClipboardList, PackageCheck, AlertCircle, X,
    ImagePlus, Search, Download
} from "lucide-react";
import Image from "next/image";
import { CloudImageUpload } from "@/components/CloudImageUpload";
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
    roughImageUrl: string | null;
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
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setLocalVal(value); }, [value]);

    // Debounced server sync
    const syncWithServer = useCallback((id: string, newVal: number, currentVal: number) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        timerRef.current = setTimeout(() => {
            const delta = newVal - currentVal;
            if (delta === 0) return;
            
            startTransition(async () => {
                const res = await updateStagingQuantity(id, delta);
                if ("newQuantity" in res) {
                    onChange(res.newQuantity);
                    setLocalVal(res.newQuantity);
                }
            });
        }, 500); // 500ms debounce for rapid clicking
    }, [onChange]);

    const step = useCallback((delta: number) => {
        if (migrated) return;
        const next = Math.max(0, localVal + delta);
        const prev = localVal;
        setLocalVal(next); // Optimistic UI
        syncWithServer(itemId, next, prev);
    }, [localVal, itemId, migrated, syncWithServer]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed) || parsed < 0) return;
        if (parsed === localVal) return;
        
        const prev = localVal;
        setLocalVal(parsed);
        syncWithServer(itemId, parsed, prev);
    }, [localVal, itemId, syncWithServer]);

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
    onImageClick,
    categories,
    rowIndex,
}: {
    item: StagingItem;
    onUpdate: (id: string, field: string, value: string | number) => void;
    onRemove: (id: string) => void;
    onConvertClick: (item: StagingItem) => void;
    onImageClick: (item: StagingItem) => void;
    rowIndex: number;
    categories: { id: string; name: string; }[];
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

                {/* Image/Photo */}
                <td className="hidden lg:table-cell px-3 py-2 w-14">
                    <button
                        onClick={() => onImageClick(item)}
                        disabled={isMigrated}
                        className="h-10 w-10 shrink-0 bg-slate-800 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-400/50 transition-all overflow-hidden relative group"
                    >
                        {item.roughImageUrl ? (
                            <>
                                <Image src={item.roughImageUrl} alt="Thumb" fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImagePlus className="w-4 h-4 text-white" />
                                </div>
                            </>
                        ) : (
                            <ImagePlus className="w-4 h-4" />
                        )}
                    </button>
                </td>

                {/* Category hint */}
                <td className="hidden lg:table-cell px-3 py-2 w-40">
                    <select
                        defaultValue={item.roughCategory || ""}
                        disabled={isMigrated}
                        onChange={(e) => debouncedSave("roughCategory", e.target.value)}
                        className="w-full bg-slate-900 border-b border-white/10 focus:border-amber-500/50 outline-none text-slate-300 text-xs py-1.5 focus:bg-[#0A0F1C] transition-colors disabled:opacity-50"
                    >
                        <option value="" disabled className="text-slate-500">Select Category...</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
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

                        {/* Image + Category row */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => onImageClick(item)}
                                disabled={isMigrated}
                                className="h-14 w-14 shrink-0 bg-slate-900/50 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-all overflow-hidden relative"
                            >
                                {item.roughImageUrl ? (
                                    <Image src={item.roughImageUrl} alt="Thumb" fill className="object-cover" />
                                ) : (
                                    <ImagePlus className="w-5 h-5" />
                                )}
                            </button>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Category</label>
                                <select
                                    defaultValue={item.roughCategory || ""}
                                    disabled={isMigrated}
                                    onChange={(e) => debouncedSave("roughCategory", e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 outline-none text-slate-300 text-sm focus:bg-[#0A0F1C] disabled:opacity-50"
                                >
                                    <option value="" disabled>Select Category...</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Dimensions row */}
                        <div className="grid grid-cols-1 gap-3">
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

export default function StagingGrid({ initialRows, categories }: { initialRows: StagingItem[], categories: { id: string; name: string }[] }) {
    const [rows, setRows] = useState<StagingItem[]>(initialRows);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [migrateTarget, setMigrateTarget] = useState<StagingItem | null>(null);
    const [imageUploadTarget, setImageUploadTarget] = useState<StagingItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
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
                    roughImageUrl: null,
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

    const handleDownloadCSV = () => {
        const headers = ["Row Index", "Item Name", "Category", "Dimensions", "Notes", "Counted Qty", "Status"];
        const csvRows = rows.map((r, idx) => {
            const catName = categories.find((c) => c.id === r.roughCategory)?.name || "";
            return [
                idx + 1,
                `"${(r.roughName || "").replace(/"/g, '""')}"`,
                `"${catName.replace(/"/g, '""')}"`,
                `"${(r.dimensions || "").replace(/"/g, '""')}"`,
                `"${(r.technicalNotes || "").replace(/"/g, '""')}"`,
                r.countedQuantity,
                r.migrationStatus
            ].join(",");
        });
        
        const csvString = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `warehouse_staging_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const countingCount = rows.filter((r) => r.migrationStatus === "counting").length;
    const migratedCount = rows.filter((r) => r.migrationStatus === "migrated").length;

    const filteredRows = rows.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (r.roughName || "").toLowerCase().includes(q) ||
            (r.technicalNotes || "").toLowerCase().includes(q)
        );
    });

    return (
        <>
            {/* ── Top action bar: Stats + Add Row button (always visible) ── */}
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <ClipboardList className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">{countingCount} Counting</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <PackageCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{migratedCount} Migrated</span>
                    </div>
                    <span className="text-xs text-slate-600 italic hidden md:inline">Fields auto-save</span>

                    <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                        {/* Download CSV */}
                        <button
                            type="button"
                            onClick={handleDownloadCSV}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 border border-white/10 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm transition-all"
                            title="Export to CSV"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export List</span>
                        </button>
                        
                        {/* ── Primary Add Row button (top-right, always visible on desktop) ── */}
                        <button
                            type="button"
                            onClick={handleAddRow}
                            disabled={addingRow}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0A0F1C] font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                        >
                            {addingRow ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            {addingRow ? "Adding..." : "Add Blank Row"}
                        </button>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search items by name or notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/50 rounded-2xl pl-10 pr-4 py-2.5 outline-none text-slate-100 text-sm placeholder:text-slate-600 transition-colors"
                    />
                </div>
            </div>

            {/* ── Table (desktop) / Cards (mobile) ── */}
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        {/* Desktop header */}
                        <thead className="hidden lg:table-header-group">
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center w-10">#</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-14">Img</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left">Item Name</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-40">Category</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-36">Dimensions</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left">Notes</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-44">Qty</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-left w-44">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-600">
                                            <ClipboardList className="h-12 w-12 opacity-20" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-500">No staging items yet</p>
                                                <p className="text-xs mt-1 text-slate-600">Click <span className="text-amber-400 font-bold">"Add Blank Row"</span> above to start counting.</p>
                                            </div>
                                            {/* Inline add button for empty state — extra prominent */}
                                            <button
                                                type="button"
                                                onClick={handleAddRow}
                                                disabled={addingRow}
                                                className="mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0A0F1C] font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                                            >
                                                {addingRow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                Add First Item
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filteredRows.length === 0 && rows.length > 0 && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                                        No items match your search.
                                    </td>
                                </tr>
                            )}
                            {filteredRows.map((item, idx) => (
                                <StagingRow
                                    key={item.id}
                                    item={item}
                                    rowIndex={idx}
                                    categories={categories}
                                    onUpdate={handleFieldUpdate}
                                    onRemove={handleRemove}
                                    onConvertClick={handleConvertClick}
                                    onImageClick={setImageUploadTarget}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Bottom Add Row (secondary — only shown when rows exist) ── */}
                {rows.length > 0 && (
                    <div className="border-t border-white/5 p-3">
                        <button
                            type="button"
                            onClick={handleAddRow}
                            disabled={addingRow}
                            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 text-slate-500 hover:text-amber-400 font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-50 group"
                        >
                            {addingRow ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 group-hover:scale-110" />
                            )}
                            {addingRow ? "Adding row..." : "Add Another Row"}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Sticky FAB for mobile / tablet (bottom of screen) ── */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden">
                <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={addingRow}
                    className="flex items-center gap-3 px-6 py-4 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0A0F1C] font-black text-base transition-all disabled:opacity-50 shadow-2xl shadow-amber-500/40 border-4 border-amber-300/20"
                >
                    {addingRow ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Plus className="h-5 w-5" />
                    )}
                    {addingRow ? "Adding..." : "Add Blank Row"}
                </button>
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

            {/* ── Image Upload Modal ── */}
            {imageUploadTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setImageUploadTarget(null)} />
                    <div className="relative bg-[#0D1526] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-200">Upload Image</h3>
                            <button onClick={() => setImageUploadTarget(null)} className="p-2 text-slate-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <CloudImageUpload
                                folder="staging_inventory"
                                existingUrl={imageUploadTarget.roughImageUrl || undefined}
                                label="Item Photo"
                                onUploadComplete={(url) => {
                                    handleFieldUpdate(imageUploadTarget.id, "roughImageUrl", url);
                                    updateStagingField(imageUploadTarget.id, "roughImageUrl", url);
                                    // Keep modal open if you want, or auto-close here:
                                    setImageUploadTarget(null);
                                    toast("Image uploaded successfully.", "success");
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toasts ── */}
            <ToastContainer toasts={toasts} dismiss={dismissToast} />
        </>
    );
}

