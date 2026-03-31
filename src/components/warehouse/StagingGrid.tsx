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
        <div className="fixed bottom-10 right-10 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-start gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border backdrop-blur-2xl text-[10px] font-black uppercase tracking-widest max-w-sm animate-in slide-in-from-right-10 duration-500
                        ${t.type === "success" ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-400" : ""}
                        ${t.type === "error" ? "bg-red-950/80 border-red-500/30 text-red-400" : ""}
                        ${t.type === "info" ? "bg-[var(--color-navy)]/90 border-[var(--color-gold)]/20 text-[var(--color-gold)]" : ""}
                    `}
                >
                    {t.type === "success" && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
                    {t.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                    {t.type === "info" && <Zap className="h-4 w-4 mt-0.5 shrink-0" />}
                    <span className="flex-1 leading-relaxed">{t.message}</span>
                    <button onClick={() => dismiss(t.id)} className="opacity-40 hover:opacity-100 transition-opacity p-1">
                        <X className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onCancel} />
            <div className="relative bg-[var(--color-navy)] border border-[var(--color-gold)]/20 rounded-3xl p-8 md:p-10 w-full max-w-lg shadow-[0_0_100px_rgba(212,175,55,0.15)] animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 rounded-2xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 shadow-inner">
                        <Zap className="h-6 w-6 text-[var(--color-gold)]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-tight italic">
                            Commit to <span className="text-[var(--color-gold)]">Fleet</span>
                        </h2>
                        <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.2em] opacity-40">Operational catalog promotion</p>
                    </div>
                </div>

                <div className="glass rounded-[2rem] p-6 mb-8 border border-white/5 bg-white/[0.02]">
                    <p className="text-[var(--color-warm-white)] font-black text-lg font-[family-name:var(--font-heading)] uppercase tracking-widest mb-4">{item.roughName || "UNDEFINED PROTOCOL"}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Target Volume</span>
                            <span className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)]">{item.countedQuantity} Units</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Form Factor</span>
                            <span className="text-[10px] font-bold text-[var(--color-warm-white)] uppercase">{item.dimensions || "—"} / {item.weight || "—"}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 mb-10">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] shadow-[0_0_8px_var(--color-gold)]" />
                        <p className="text-[10px] text-[var(--color-slate)] font-bold uppercase tracking-wide leading-relaxed">
                            Generating <span className="text-[var(--color-warm-white)]">1 Master Product Entry</span> in centralized catalog.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgb(56,189,248)]" />
                        <p className="text-[10px] text-[var(--color-slate)] font-bold uppercase tracking-wide leading-relaxed">
                            Initialising <span className="text-sky-400">{item.countedQuantity} Digital Passports</span> with unique QR telemetry.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 h-16 rounded-2xl glass border border-white/10 text-[var(--color-slate)] font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-all disabled:opacity-50"
                    >
                        Abort
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-[1.5] h-16 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                        {loading ? "PROMOTING..." : "COMMIT TO FLEET"}
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
        <div className={`flex items-center gap-1.5 ${migrated ? "opacity-50 pointer-events-none" : ""}`}>
            <button
                type="button"
                onClick={() => step(-1)}
                disabled={localVal === 0 || pending}
                className="h-10 w-10 flex items-center justify-center rounded-xl glass hover:bg-white/5 active:scale-95 border border-white/10 transition-all disabled:opacity-20 text-[var(--color-slate)] hover:text-white shadow-xl"
                aria-label="Decrease quantity"
            >
                <Minus className="h-4 w-4" />
            </button>

            <input
                type="number"
                min={0}
                value={localVal}
                onChange={handleInputChange}
                className="w-16 text-center bg-black/40 border border-white/10 rounded-xl py-2.5 text-[var(--color-warm-white)] font-bold text-sm font-[family-name:var(--font-heading)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Quantity"
            />

            <button
                type="button"
                onClick={() => step(1)}
                disabled={pending}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/20 active:scale-95 border border-[var(--color-gold)]/30 hover:border-[var(--color-gold)]/60 transition-all disabled:opacity-20 text-[var(--color-gold)] shadow-lg shadow-[var(--color-gold)]/5"
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
                className={`border-b border-white/5 group transition-all duration-300
                    ${isMigrated ? "bg-emerald-500/[0.01] opacity-60" : "hover:bg-[var(--color-gold)]/[0.02]"}
                `}
            >
                {/* Index */}
                <td className="hidden lg:table-cell px-4 py-3 text-[var(--color-slate)] text-[10px] font-black uppercase tracking-widest w-12 text-center opacity-40">
                    {String(rowIndex + 1).padStart(2, "0")}
                </td>

                {/* Name */}
                <td className="hidden lg:table-cell px-3 py-4">
                    <input
                        defaultValue={item.roughName}
                        disabled={isMigrated}
                        placeholder="PROTOCOL IDENTITY"
                        onChange={(e) => debouncedSave("roughName", e.target.value)}
                        className="w-full bg-transparent border-b border-white/5 focus:border-[var(--color-gold)]/50 outline-none text-[var(--color-warm-white)] font-bold text-sm py-2 placeholder:text-white/5 transition-all disabled:opacity-50 font-[family-name:var(--font-heading)] tracking-wider uppercase"
                    />
                </td>

                {/* Image/Photo */}
                <td className="hidden lg:table-cell px-3 py-4 w-16">
                    <button
                        onClick={() => onImageClick(item)}
                        disabled={isMigrated}
                        className="h-12 w-12 shrink-0 glass rounded-xl border border-white/10 flex items-center justify-center text-[var(--color-slate)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/40 transition-all overflow-hidden relative group shadow-lg"
                    >
                        {item.roughImageUrl ? (
                            <>
                                <Image src={item.roughImageUrl} alt="Thumb" fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImagePlus className="w-5 h-5 text-white" />
                                </div>
                            </>
                        ) : (
                            <ImagePlus className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                        )}
                    </button>
                </td>

                {/* Category hint */}
                <td className="hidden lg:table-cell px-3 py-4 w-44">
                    <select
                        defaultValue={item.roughCategory || ""}
                        disabled={isMigrated}
                        onChange={(e) => debouncedSave("roughCategory", e.target.value)}
                        className="w-full bg-transparent border-b border-white/5 focus:border-[var(--color-gold)]/50 outline-none text-[var(--color-slate)] text-[10px] font-black uppercase tracking-widest py-2 focus:text-white transition-all disabled:opacity-50"
                    >
                        <option value="" disabled className="text-slate-500">CATEGORY...</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id} className="bg-[var(--color-navy)]">{c.name.toUpperCase()}</option>
                        ))}
                    </select>
                </td>

                {/* Dimensions */}
                <td className="hidden lg:table-cell px-3 py-4 w-36">
                    <input
                        defaultValue={item.dimensions ?? ""}
                        disabled={isMigrated}
                        placeholder="SPEC—DIMS"
                        onChange={(e) => debouncedSave("dimensions", e.target.value)}
                        className="w-full bg-transparent border-b border-white/5 focus:border-[var(--color-gold)]/50 outline-none text-[var(--color-slate)] text-[10px] font-black uppercase tracking-tighter py-2 placeholder:text-white/5 transition-all disabled:opacity-50"
                    />
                </td>

                {/* Notes */}
                <td className="hidden lg:table-cell px-3 py-4">
                    <input
                        defaultValue={item.technicalNotes ?? ""}
                        disabled={isMigrated}
                        placeholder="TECHNICAL—STREAM"
                        onChange={(e) => debouncedSave("technicalNotes", e.target.value)}
                        className="w-full bg-transparent border-b border-white/5 focus:border-[var(--color-gold)]/50 outline-none text-[var(--color-slate)] text-[10px] font-medium py-2 placeholder:text-white/5 transition-all disabled:opacity-50 italic"
                    />
                </td>

                {/* Quantity stepper */}
                <td className="hidden lg:table-cell px-3 py-4 w-48">
                    <QuantityStepper
                        itemId={item.id}
                        value={item.countedQuantity}
                        migrated={isMigrated}
                        onChange={(val) => onUpdate(item.id, "countedQuantity", val)}
                    />
                </td>

                {/* Status + Actions */}
                <td className="hidden lg:table-cell px-3 py-4 w-44">
                    <div className="flex items-center gap-2">
                        {isMigrated ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/5">
                                <PackageCheck className="h-3.5 w-3.5" /> LIVESTREAM
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => onConvertClick(item)}
                                    disabled={item.countedQuantity === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-[var(--color-gold)]/10"
                                >
                                    <Zap className="h-3.5 w-3.5" /> PROMOTE
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl glass text-[var(--color-slate)] hover:text-red-500 hover:border-red-500/40 transition-all shadow-xl"
                                >
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
            <div className="flex flex-col gap-6 mb-8 mt-2">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl glass border border-white/5 bg-white/[0.02] shadow-xl">
                        <div className="p-1.5 rounded-lg bg-[var(--color-gold)]/10">
                            <ClipboardList className="h-4 w-4 text-[var(--color-gold)]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-[0.15em]">{countingCount} STAGED</span>
                            <span className="text-[8px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Initial Count</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl glass border border-white/5 bg-white/[0.02] shadow-xl">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <PackageCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">{migratedCount} FLEET</span>
                            <span className="text-[8px] font-black text-[var(--color-slate)] uppercase tracking-widest opacity-40">Active Assets</span>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
                        <button
                            type="button"
                            onClick={handleDownloadCSV}
                            className="flex items-center gap-3 px-6 h-14 rounded-2xl glass border border-white/10 hover:bg-white/5 active:scale-95 text-[var(--color-slate)] hover:text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl"
                            title="Export to CSV"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Export Audit</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleAddRow}
                            disabled={addingRow}
                            className="flex items-center gap-4 px-8 h-14 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.25em] transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(212,175,55,0.25)] hover:scale-105 active:scale-95"
                        >
                            {addingRow ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Plus className="h-5 w-5" />
                            )}
                            {addingRow ? "ADDING..." : "INITIALIZE ROW"}
                        </button>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <div className="relative max-w-xl group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-slate)] opacity-40 group-focus-within:text-[var(--color-gold)] group-focus-within:opacity-100 transition-all" />
                    <input
                        type="text"
                        placeholder="FILTER BY PROTOCOL IDENTITY OR TECHNICAL STREAM..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border-2 border-white/5 focus:border-[var(--color-gold)]/50 rounded-2xl pl-16 pr-8 py-5 outline-none text-[var(--color-warm-white)] font-black text-[10px] uppercase tracking-[0.2em] placeholder:text-white/5 transition-all shadow-2xl"
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
                                    <td colSpan={8} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-8 text-[var(--color-slate)]">
                                            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner">
                                                <ClipboardList className="h-16 w-16 opacity-30 text-[var(--color-gold)]" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-xl font-[family-name:var(--font-heading)] font-black text-[var(--color-warm-white)] uppercase tracking-[0.2em] italic">Staging Index Empty</p>
                                                <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.3em] opacity-40">Click initialize to start asset induction</p>
                                            </div>
                                            {/* Inline add button for empty state — extra prominent */}
                                            <button
                                                type="button"
                                                onClick={handleAddRow}
                                                disabled={addingRow}
                                                className="mt-4 flex items-center gap-4 px-12 h-16 rounded-2xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-[0_0_50px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95"
                                            >
                                                {addingRow ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                                                Initialize First Item
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

