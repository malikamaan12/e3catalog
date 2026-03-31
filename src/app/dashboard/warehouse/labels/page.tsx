"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    Printer, Search, CheckSquare, Square, Loader2,
    RefreshCw, Filter, X
} from "lucide-react";

type Unit = {
    id: string;
    assetTagCode: string;
    serialNumber: string | null;
    productName: string | null;
    categoryName: string | null;
    shelfLocation: string | null;
    warehouseName: string | null;
    availabilityStatus: string;
};

export default function LabelsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [filtered, setFiltered] = useState<Unit[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [printing, setPrinting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const load = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/fleet")
            .then(r => r.json())
            .then((data: Unit[]) => setUnits(Array.isArray(data) ? data : []))
            .catch(() => setUnits([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!search) { setFiltered(units); return; }
        const q = search.toLowerCase();
        setFiltered(units.filter(u =>
            u.assetTagCode.toLowerCase().includes(q) ||
            (u.productName || "").toLowerCase().includes(q) ||
            (u.categoryName || "").toLowerCase().includes(q)
        ));
    }, [units, search]);

    function toggleOne(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(u => u.id)));
        }
    }

    function handlePrint() {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const selectedUnits = units.filter(u => selected.has(u.id));
        const SITE_URL = window.location.origin;

        // Generate SVG QR codes inline
        const labelsHtml = selectedUnits.map(unit => {
            const url = `${SITE_URL}/passport/${encodeURIComponent(unit.assetTagCode)}`;
            return `
                <div class="label">
                    <div class="qr">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}" width="100" height="100" />
                    </div>
                    <div class="info">
                        <div class="tag">${unit.assetTagCode}</div>
                        <div class="product">${unit.productName || "—"}</div>
                        ${unit.serialNumber ? `<div class="sub">S/N: ${unit.serialNumber}</div>` : ""}
                        ${unit.shelfLocation ? `<div class="sub">📍 ${unit.shelfLocation}</div>` : ""}
                        <div class="brand">E3 Rentals</div>
                    </div>
                </div>
            `;
        }).join("");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>E3 Asset Labels</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Courier New', monospace; background: white; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px; }
                    @media (min-width: 600px) { .grid { grid-template-columns: repeat(3, 1fr); } }
                    .label {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        border: 2px solid #000;
                        border-radius: 8px;
                        padding: 12px;
                        page-break-inside: avoid;
                        background: white;
                    }
                    .qr img { display: block; }
                    .info { flex: 1; min-width: 0; }
                    .tag { font-size: 14px; font-weight: 900; letter-spacing: 0.1em; word-break: break-all; }
                    .product { font-size: 10px; font-weight: bold; margin-top: 4px; color: #333; }
                    .sub { font-size: 9px; color: #666; margin-top: 2px; }
                    .brand { font-size: 9px; font-weight: 900; margin-top: 6px; letter-spacing: 0.2em; color: #888; text-transform: uppercase; }
                    @media print {
                        @page { margin: 10mm; }
                        body { print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="grid">${labelsHtml}</div>
                <script>window.onload = () => window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    const allSelected = filtered.length > 0 && selected.size === filtered.length;

    return (
        <div className="flex flex-col gap-0 min-h-full">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/[0.06] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-100 italic">
                            Asset <span className="text-slate-400">Labels</span>
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {selected.size > 0 ? `${selected.size} selected` : "Select assets to print QR labels"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={selected.size === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                        >
                            <Printer className="h-4 w-4" />
                            Print {selected.size > 0 ? `(${selected.size})` : ""}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input
                        type="text"
                        placeholder="Filter by tag, product, or category..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-slate-500/50"
                    />
                </div>

                {/* Select all row */}
                <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
                >
                    {allSelected
                        ? <CheckSquare className="h-4 w-4 text-slate-300" />
                        : <Square className="h-4 w-4" />
                    }
                    {allSelected ? "Deselect All" : `Select All (${filtered.length})`}
                </button>
            </div>

            {/* Units List */}
            <div className="divide-y divide-white/[0.04]">
                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-16 text-slate-600 italic text-sm">No assets found.</div>
                )}
                {!loading && filtered.map(unit => {
                    const isSelected = selected.has(unit.id);
                    return (
                        <button
                            key={unit.id}
                            onClick={() => toggleOne(unit.id)}
                            className={`w-full flex items-center gap-4 p-4 transition-all text-left ${
                                isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                            }`}
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                                isSelected ? "bg-slate-100 border-slate-100" : "border-white/20"
                            }`}>
                                {isSelected && <X className="h-3 w-3 text-slate-900" />}
                            </div>

                            {/* Mini Label Preview */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="bg-white rounded-lg p-1.5 shrink-0">
                                    <QRCodeSVG
                                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/passport/${unit.assetTagCode}`}
                                        size={36}
                                        level="M"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-sm text-slate-100 tracking-widest">{unit.assetTagCode}</p>
                                    <p className="text-xs text-slate-400 truncate">{unit.productName || "—"}</p>
                                    {unit.shelfLocation && (
                                        <p className="text-[10px] text-slate-600 mt-0.5">📍 {unit.shelfLocation}</p>
                                    )}
                                </div>
                            </div>

                            <span className="text-[9px] font-black uppercase text-slate-700 shrink-0">{unit.availabilityStatus.replace("_", " ")}</span>
                        </button>
                    );
                })}
            </div>

            {/* Fixed Print Bar when selection exists */}
            {selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-xl">
                    <span className="text-sm font-black text-slate-100">{selected.size} labels ready</span>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        <Printer className="h-4 w-4" />
                        Print Labels
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
