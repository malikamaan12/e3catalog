"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    Printer, Search, CheckSquare, Square, Loader2,
    RefreshCw, Filter, X, MapPin
} from "lucide-react";

type Unit = {
    id: string;
    assetTagCode: string;
    rfidTag?: string | null;
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
    const [printFormat, setPrintFormat] = useState<"thermal" | "a4">("thermal");
    const [printSize, setPrintSize] = useState<"small" | "medium" | "large">("medium");

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

        if (printFormat === "thermal") {
            // Standard Industrial 4" x 2" (100mm x 50mm) Thermal Transfer Continuous Roll
            const labelsHtml = selectedUnits.map(unit => {
                const url = `${SITE_URL}/passport/${encodeURIComponent(unit.assetTagCode)}`;
                const cacheElem = document.getElementById(`qr-svg-${unit.id}`);
                const qrSvg = cacheElem?.querySelector("svg")?.outerHTML || `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" width="110" height="110" />`;

                return `
                    <div class="thermal-label">
                        <div class="qr-col">
                            ${qrSvg}
                        </div>
                        <div class="content-col">
                            <div class="header-section">
                                <div class="tag-title">${unit.assetTagCode}</div>
                                <div class="prod-title">${unit.productName || "EQUIPMENT"}</div>
                            </div>
                            <div class="meta-section">
                                ${unit.serialNumber ? `<div class="meta-item">S/N: ${unit.serialNumber}</div>` : ""}
                                ${unit.shelfLocation ? `<div class="meta-item">📍 ${unit.shelfLocation}</div>` : ""}
                                ${unit.rfidTag ? `<div class="rfid-badge">RFID EPC: ${unit.rfidTag}</div>` : ""}
                            </div>
                            <div class="footer-brand">E3 RENTALS WAREHOUSE LOGISTICS</div>
                        </div>
                    </div>
                `;
            }).join("");

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Thermal Roll Labels (${selectedUnits.length})</title>
                    <style>
                        @page {
                            size: 100mm 50mm;
                            margin: 0;
                        }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            background: white; 
                            -webkit-print-color-adjust: exact;
                        }
                        .thermal-label {
                            width: 100mm;
                            height: 50mm;
                            page-break-after: always;
                            display: flex;
                            align-items: center;
                            padding: 4mm 6mm;
                            overflow: hidden;
                            border-bottom: 1px dashed #ccc;
                            background: white;
                        }
                        @media print {
                            .thermal-label { border-bottom: none; }
                        }
                        .qr-col {
                            width: 38mm;
                            height: 38mm;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 5mm;
                            shrink-0;
                        }
                        .qr-col svg {
                            width: 100% !important;
                            height: 100% !important;
                            display: block;
                        }
                        .content-col {
                            flex: 1;
                            min-width: 0;
                            height: 40mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        }
                        .tag-title {
                            font-size: 15pt;
                            font-weight: 900;
                            letter-spacing: 0.05em;
                            color: #000;
                            line-height: 1.1;
                            border-bottom: 2px solid #000;
                            padding-bottom: 1.5mm;
                        }
                        .prod-title {
                            font-size: 9.5pt;
                            font-weight: 700;
                            color: #111;
                            margin-top: 1.5mm;
                            line-height: 1.2;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .meta-section {
                            display: flex;
                            flex-direction: column;
                            gap: 1mm;
                            margin-top: 1mm;
                        }
                        .meta-item {
                            font-size: 7.5pt;
                            font-weight: 600;
                            color: #333;
                            font-family: monospace;
                        }
                        .rfid-badge {
                            font-size: 6.5pt;
                            font-weight: 900;
                            color: #000;
                            border: 1px solid #000;
                            padding: 1px 3px;
                            border-radius: 2px;
                            display: inline-block;
                            width: fit-content;
                            font-family: monospace;
                        }
                        .footer-brand {
                            font-size: 6pt;
                            font-weight: 900;
                            letter-spacing: 0.15em;
                            color: #777;
                            text-transform: uppercase;
                        }
                    </style>
                </head>
                <body>
                    ${labelsHtml}
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.onafterprint = () => window.close();
                            }, 400);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
            return;
        }

        // A4 3x6 Grid Config (Avery Standard)
        const sizeConfig = {
            small:  { cols: 4, qrSize: 60,  labelPad: "6px",  tagSize: "10px", productSize: "8px",  gap: "4px",  border: "1px",  height: "45mm" },
            medium: { cols: 3, qrSize: 90,  labelPad: "10px", tagSize: "14px", productSize: "10px", gap: "8px",  border: "1.5px", height: "48mm" },
            large:  { cols: 2, qrSize: 140, labelPad: "16px", tagSize: "18px", productSize: "12px", gap: "12px", border: "2px",   height: "90mm" },
        };
        const s = sizeConfig[printSize];

        const labelsHtml = selectedUnits.map(unit => {
            const url = `${SITE_URL}/passport/${encodeURIComponent(unit.assetTagCode)}`;
            const cacheElem = document.getElementById(`qr-svg-${unit.id}`);
            const qrSvg = cacheElem?.querySelector("svg")?.outerHTML || `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${s.qrSize * 2}x${s.qrSize * 2}&data=${encodeURIComponent(url)}" width="${s.qrSize}" height="${s.qrSize}" />`;

            return `
                <div class="label">
                    <div class="qr">
                        ${qrSvg}
                    </div>
                    <div class="info">
                        <div class="tag">${unit.assetTagCode}</div>
                        <div class="product">${unit.productName || "—"}</div>
                        ${unit.serialNumber ? `<div class="sub">S/N: ${unit.serialNumber}</div>` : ""}
                        ${unit.shelfLocation ? `<div class="sub">📍 ${unit.shelfLocation}</div>` : ""}
                        ${unit.rfidTag ? `<div class="sub" style="font-weight:bold;color:#000;">RFID: ${unit.rfidTag}</div>` : ""}
                        <div class="brand">E3 Rentals Logistics</div>
                    </div>
                </div>
            `;
        }).join("");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>E3 Asset Labels (${printSize.toUpperCase()})</title>
                <style>
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                        background: white; 
                        -webkit-print-color-adjust: exact;
                    }
                    .grid { 
                        display: grid; 
                        grid-template-columns: repeat(${s.cols}, 1fr); 
                        gap: ${s.gap}; 
                    }
                    .label {
                        display: flex;
                        align-items: center;
                        gap: ${s.labelPad};
                        border: ${s.border} solid #000;
                        border-radius: 4px;
                        padding: ${s.labelPad};
                        height: ${s.height};
                        page-break-inside: avoid;
                        overflow: hidden;
                        background: white;
                    }
                    .qr { display: flex; align-items: center; justify-content: center; }
                    .qr svg { width: ${s.qrSize}px !important; height: ${s.qrSize}px !important; display: block; }
                    .qr img { display: block; border: 1px solid #eee; }
                    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
                    .tag { font-size: ${s.tagSize}; font-weight: 900; letter-spacing: 0.05em; color: #000; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 4px; }
                    .product { font-size: ${s.productSize}; font-weight: bold; color: #333; line-height: 1.1; }
                    .sub { font-size: ${parseInt(s.productSize) - 2}px; color: #666; margin-top: 1px; }
                    .brand { font-size: ${parseInt(s.productSize) - 3}px; font-weight: 900; margin-top: auto; letter-spacing: 0.1em; color: #aaa; text-transform: uppercase; }
                    
                    @media print {
                        header, footer, nav { display: none !important; }
                        body { background: none; }
                        .grid { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="grid">${labelsHtml}</div>
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            window.onafterprint = () => window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    const allSelected = filtered.length > 0 && selected.size === filtered.length;

    return (
        <div className="flex flex-col gap-0 min-h-full pb-24">
            {/* Header */}
            <div className="p-6 md:p-8 flex flex-col gap-6 bg-[var(--color-navy)]/40 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black uppercase tracking-tight text-[var(--color-warm-white)] italic">
                            Asset <span className="text-[var(--color-gold)]">Labels</span>
                        </h1>
                        <p className="text-[var(--color-slate)] text-xs mt-1 font-bold tracking-widest uppercase opacity-60">
                            {selected.size > 0 ? `${selected.size} units staged for print` : "Select assets to generate physical passports"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={load} className="p-3 rounded-xl glass border border-white/10 text-[var(--color-slate)] hover:text-white transition-all">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={selected.size === 0}
                            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-2xl"
                        >
                            <Printer className="h-4 w-4" />
                            Generate Labels {selected.size > 0 ? `(${selected.size})` : ""}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-slate)] opacity-40" />
                        <input
                            type="text"
                            placeholder="Filter by tag, product name, or category..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm font-bold text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)]/20 focus:outline-none focus:border-[var(--color-gold)]/50 transition-all"
                        />
                    </div>

                    {/* Output Media Selector */}
                    <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-white/10 rounded-xl p-1.5 shadow-xl">
                        <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-widest px-3 opacity-40">Format:</span>
                        <button
                            onClick={() => setPrintFormat("thermal")}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all ${
                                printFormat === "thermal"
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                                    : "text-[var(--color-slate)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            Roll (4"×2" Thermal)
                        </button>
                        <button
                            onClick={() => setPrintFormat("a4")}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all ${
                                printFormat === "a4"
                                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                                    : "text-[var(--color-slate)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            A4 Sheet
                        </button>
                    </div>

                    {/* Print Size Selector (for A4) */}
                    {printFormat === "a4" && (
                        <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-white/10 rounded-xl p-1.5 shadow-xl">
                            <span className="text-[9px] font-black text-[var(--color-slate)] uppercase tracking-widest px-3 opacity-40">A4 Profile:</span>
                            {(["small", "medium", "large"] as const).map(size => (
                                <button
                                    key={size}
                                    onClick={() => setPrintSize(size)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all ${
                                        printSize === size
                                            ? "bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg shadow-[var(--color-gold)]/20"
                                            : "text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5"
                                    }`}
                                >
                                    {size === "small" ? "S (2×1)" : size === "medium" ? "M (3×2)" : "L (Jumbo)"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bulk Controls */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={toggleAll}
                        className="flex items-center gap-3 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-slate)] hover:text-[var(--color-gold)] transition-all"
                    >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            allSelected ? "bg-[var(--color-gold)] border-[var(--color-gold)]" : "border-white/20"
                        }`}>
                            {allSelected && <X className="h-2 w-2 text-[var(--color-navy)] font-black" />}
                        </div>
                        {allSelected ? "Release All" : `Bulk Select (${filtered.length})`}
                    </button>
                </div>
            </div>

            {/* Units List */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {loading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-gold)] opacity-40" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-slate)] animate-pulse">Syncing Inventory Index</p>
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div className="col-span-full text-center py-32 text-[var(--color-slate)] italic font-bold uppercase tracking-widest opacity-20">Initialising Asset Feed... No hits.</div>
                )}
                {!loading && filtered.map(unit => {
                    const isSelected = selected.has(unit.id);
                    return (
                        <button
                            key={unit.id}
                            onClick={() => toggleOne(unit.id)}
                            className={`flex items-center gap-5 p-5 glass rounded-xl border transition-all text-left relative overflow-hidden group ${
                                isSelected 
                                    ? "bg-[var(--color-gold)]/5 border-[var(--color-gold)]/40 shadow-[0_0_25px_rgba(212,175,55,0.05)]" 
                                    : "border-white/10 hover:border-white/30 hover:bg-white/[0.02]"
                            }`}
                        >
                            {/* Selection indicator bubble */}
                            <div className={`absolute top-0 right-0 w-8 h-8 rounded-bl-xl flex items-center justify-center transition-all ${
                                isSelected ? "bg-[var(--color-gold)] text-[var(--color-navy)]" : "bg-white/5 opacity-0 group-hover:opacity-100"
                            }`}>
                                {isSelected ? <Printer className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5 opacity-40" />}
                            </div>

                            <div className="p-2.5 bg-white rounded-lg shadow-2xl shrink-0 group-hover:scale-105 transition-transform">
                                <QRCodeSVG
                                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/passport/${unit.assetTagCode}`}
                                    size={48}
                                    level="L"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-[family-name:var(--font-heading)] font-black text-lg text-[var(--color-warm-white)] tracking-[0.1em]">{unit.assetTagCode}</p>
                                <p className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-tight truncate mb-1">{unit.productName || "Undefined Unit"}</p>
                                {unit.shelfLocation && (
                                    <div className="flex items-center gap-1.5 text-[9px] text-[var(--color-gold)] opacity-60 font-black uppercase tracking-tighter">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {unit.shelfLocation}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Float Command Bar */}
            {selected.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-6 px-8 py-5 glass border border-[var(--color-gold)]/30 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in slide-in-from-bottom-10 duration-500">
                    <div className="flex flex-col">
                        <span className="text-lg font-[family-name:var(--font-heading)] font-black text-[var(--color-gold)] tracking-tighter">{selected.size} Labels</span>
                        <span className="text-[9px] text-[var(--color-slate)] uppercase font-black tracking-[0.2em] opacity-60">{printSize} Profile active</span>
                    </div>
                    <div className="h-8 w-px bg-white/10 mx-2" />
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-3 px-8 py-3.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-[10px] uppercase tracking-[0.25em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                    >
                        <Printer className="h-4 w-4" />
                        Execute Print
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="p-3 bg-white/5 rounded-full text-[var(--color-slate)] hover:text-white transition-all shadow-inner"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Hidden SVG render cache for offline local QR printing */}
            <div id="qr-svg-cache" style={{ position: "absolute", left: "-9999px", top: "-9999px", visibility: "hidden" }}>
                {units.map(unit => (
                    <div key={unit.id} id={`qr-svg-${unit.id}`}>
                        <QRCodeSVG
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/passport/${encodeURIComponent(unit.assetTagCode)}`}
                            size={160}
                            level="M"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
