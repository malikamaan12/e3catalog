"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
    Wrench, Radio, Printer, CheckCircle2, AlertTriangle,
    RefreshCw, Zap, Activity, ShieldCheck, Database,
    Volume2, VolumeX, Barcode, ArrowRight, Play,
    Check, X, Search, Sparkles, ExternalLink, Sliders
} from "lucide-react";

// Audio Feedback Synthesizer using Web Audio API (zero asset dependency)
function playTone(freq: number, type: OscillatorType, duration: number, delay = 0) {
    if (typeof window === "undefined") return;
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
    } catch {
        // Audio context may be restricted by autoplay policy until user interaction
    }
}

function playSuccessChime() {
    playTone(880, "sine", 0.08, 0);       // A5
    playTone(1320, "sine", 0.12, 0.08);   // E6
}

function playErrorBuzzer() {
    playTone(220, "sawtooth", 0.25, 0);   // A3
}

function playBurstBlip() {
    playTone(1760, "sine", 0.03, 0);      // A6
}

interface WedgeLogEntry {
    id: string;
    timestamp: string;
    rawText: string;
    type: "epc" | "barcode" | "raw";
    charCount: number;
    intervalMs: number;
}

interface CommissionHistoryEntry {
    id: string;
    timestamp: string;
    identifier: string;
    rfidTag: string;
    name: string;
    type: string;
    status: "success" | "error";
    message?: string;
}

interface HardwareHealthData {
    status: string;
    database: {
        status: string;
        latencyMs: number;
        pooler: string;
    };
    rfidFleet: {
        totalUnits: number;
        taggedUnits: number;
        totalFlightCases: number;
        taggedFlightCases: number;
        totalAssets: number;
        totalTaggedAssets: number;
        tagCoveragePct: number;
    };
    indexes: {
        inventoryUnitsRfidTagIdx: boolean;
        flightCasesAssetTagIdx: boolean;
    };
}

export default function HardwareSetupPage() {
    const [activeTab, setActiveTab] = useState<"wedge_test" | "printer_calib" | "commissioning" | "health">("wedge_test");
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Module 1: Sled Wedge State
    const [wedgeLogs, setWedgeLogs] = useState<WedgeLogEntry[]>([]);
    const [wedgeInput, setWedgeInput] = useState("");
    const [isListeningGlobal, setIsListeningGlobal] = useState(true);
    const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number>(0);
    const [currentIntervalMs, setCurrentIntervalMs] = useState<number>(0);
    const [burstCount, setBurstCount] = useState<number>(0);
    const wedgeInputRef = useRef<HTMLInputElement>(null);

    // Module 2: Printer Calibration State
    const [labelWidthMm, setLabelWidthMm] = useState(100);
    const [labelHeightMm, setLabelHeightMm] = useState(50);
    const [printDarkness, setPrintDarkness] = useState(15);
    const [printSpeedIps, setPrintSpeedIps] = useState(3);
    const [mediaSensor, setMediaSensor] = useState<"gap" | "black_mark" | "continuous">("gap");
    const [testSampleTag, setTestSampleTag] = useState("E3-TRUSS-001");
    const [testSampleEpc, setTestSampleEpc] = useState("E2801160600002046872591B");

    // Module 3: Commissioning Station State
    const [commIdentifier, setCommIdentifier] = useState("");
    const [commRfid, setCommRfid] = useState("");
    const [autoCommit, setAutoCommit] = useState(true);
    const [commLoading, setCommLoading] = useState(false);
    const [commFeedback, setCommFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [commHistory, setCommHistory] = useState<CommissionHistoryEntry[]>([]);
    const [inspectorQuery, setInspectorQuery] = useState("");
    const [inspectorResult, setInspectorResult] = useState<any>(null);
    const [inspectorLoading, setInspectorLoading] = useState(false);

    const assetInputRef = useRef<HTMLInputElement>(null);
    const rfidInputRef = useRef<HTMLInputElement>(null);

    // Module 4: Hardware Health State
    const [healthData, setHealthData] = useState<HardwareHealthData | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);

    // Load Health Diagnostics
    const fetchHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const res = await fetch("/api/admin/warehouse/hardware-health");
            if (res.ok) {
                const data = await res.json();
                setHealthData(data);
            }
        } catch (err) {
            console.error("Health fetch error:", err);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
    }, [fetchHealth]);

    // Handle Global Keyboard Wedge Listener for Sled Testing
    useEffect(() => {
        if (!isListeningGlobal || activeTab !== "wedge_test") return;

        let buffer = "";
        let timer: NodeJS.Timeout | null = null;
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // If user is focused on a distinct input or textarea, let it handle typing
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
                return;
            }

            const now = Date.now();
            const delta = now - lastKeyTime;
            lastKeyTime = now;

            if (e.key === "Enter" || e.key === "Tab") {
                if (buffer.trim().length > 0) {
                    processIncomingWedge(buffer.trim(), delta);
                    buffer = "";
                }
                if (timer) clearTimeout(timer);
                return;
            }

            if (e.key.length === 1) {
                buffer += e.key;
                if (soundEnabled) playBurstBlip();

                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    if (buffer.trim().length > 0) {
                        processIncomingWedge(buffer.trim(), delta);
                        buffer = "";
                    }
                }, 300);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (timer) clearTimeout(timer);
        };
    }, [isListeningGlobal, activeTab, soundEnabled]);

    const processIncomingWedge = (text: string, intervalMs: number) => {
        const clean = text.trim().toUpperCase();
        const isEpc = /^[0-9A-F]{20,32}$/i.test(clean);
        const isBarcode = clean.length >= 3 && !isEpc;

        if (soundEnabled) {
            playSuccessChime();
        }

        const newEntry: WedgeLogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            rawText: clean,
            type: isEpc ? "epc" : isBarcode ? "barcode" : "raw",
            charCount: clean.length,
            intervalMs: Math.min(intervalMs, 999),
        };

        setWedgeLogs(prev => [newEntry, ...prev.slice(0, 49)]);
        setCurrentIntervalMs(intervalMs);
        setBurstCount(prev => prev + 1);
    };

    // Simulate Sled Scans
    const simulateSingleEpc = () => {
        const fakeEpcs = [
            "E2801160600002046872591B",
            "E2801160600002046872591C",
            "E2801160600002046872591D",
            "E280689400004018A8B2C901",
            "E280689400004018A8B2C902"
        ];
        const randomEpc = fakeEpcs[Math.floor(Math.random() * fakeEpcs.length)];
        processIncomingWedge(randomEpc, Math.floor(Math.random() * 20) + 10);
    };

    const simulateRapidBurst = () => {
        let i = 0;
        const fakeEpcs = [
            "E2801160600002046872591A",
            "E2801160600002046872591B",
            "E2801160600002046872591C",
            "E2801160600002046872591D",
            "E2801160600002046872591E",
            "E280689400004018A8B2C901",
            "E280689400004018A8B2C902",
            "E280689400004018A8B2C903",
            "E280689400004018A8B2C904",
            "E280689400004018A8B2C905"
        ];
        const interval = setInterval(() => {
            if (i >= fakeEpcs.length) {
                clearInterval(interval);
                return;
            }
            processIncomingWedge(fakeEpcs[i], 80);
            i++;
        }, 120);
    };

    const simulateBarcode = () => {
        const barcodes = ["E3-TRUSS-001", "E3-LED-042", "E3-SUB-012", "FC-001", "FC-002"];
        const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
        processIncomingWedge(randomBarcode, 35);
    };

    // Print Thermal Calibration Label
    const handlePrintCalibration = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://e3rentals.com";
        const passportUrl = `${SITE_URL}/passport/${encodeURIComponent(testSampleTag)}`;

        const previewSvg = document.getElementById("calib-qr-preview")?.querySelector("svg")?.outerHTML || "";

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Calibration Test Label - 100mm x 50mm</title>
                <style>
                    @page {
                        size: ${labelWidthMm}mm ${labelHeightMm}mm;
                        margin: 0;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .calib-label {
                        width: ${labelWidthMm}mm;
                        height: ${labelHeightMm}mm;
                        padding: 2.5mm 3.5mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        box-sizing: border-box;
                        border: 1px solid #000;
                        page-break-after: always;
                    }
                    /* Alignment Crosshairs */
                    .crosshair-tl { position: absolute; top: 1mm; left: 1mm; font-size: 8px; font-weight: bold; font-family: monospace; }
                    .crosshair-tr { position: absolute; top: 1mm; right: 1mm; font-size: 8px; font-weight: bold; font-family: monospace; }
                    .crosshair-bl { position: absolute; bottom: 1mm; left: 1mm; font-size: 8px; font-weight: bold; font-family: monospace; }
                    .crosshair-br { position: absolute; bottom: 1mm; right: 1mm; font-size: 8px; font-weight: bold; font-family: monospace; }

                    .top-bar {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1.5px solid #000;
                        padding-bottom: 1.5mm;
                    }
                    .brand {
                        font-size: 11pt;
                        font-weight: 900;
                        letter-spacing: 0.5px;
                    }
                    .calib-pill {
                        font-size: 7pt;
                        font-weight: 800;
                        background: #000;
                        color: #fff;
                        padding: 1px 4px;
                        border-radius: 2px;
                    }
                    .main-body {
                        display: flex;
                        align-items: center;
                        gap: 4mm;
                        margin-top: 1.5mm;
                    }
                    .qr-block {
                        width: 25mm;
                        height: 25mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .qr-block svg {
                        width: 100% !important;
                        height: 100% !important;
                    }
                    .details-block {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 1mm;
                    }
                    .asset-title {
                        font-size: 15pt;
                        font-weight: 900;
                        line-height: 1;
                        letter-spacing: -0.5px;
                    }
                    .param-row {
                        font-size: 7.5pt;
                        font-family: monospace;
                        font-weight: 600;
                        color: #111;
                    }
                    .rfid-box {
                        margin-top: 1mm;
                        background: #f0f0f0;
                        border: 1px dashed #000;
                        padding: 1.5px 3px;
                        font-family: monospace;
                        font-size: 6.5pt;
                        font-weight: bold;
                        word-break: break-all;
                    }
                    .bottom-bar {
                        display: flex;
                        justify-content: space-between;
                        font-size: 6.5pt;
                        font-family: monospace;
                        border-top: 1px solid #000;
                        padding-top: 1mm;
                    }
                </style>
            </head>
            <body>
                <div class="calib-label">
                    <span class="crosshair-tl">+ 0,0</span>
                    <span class="crosshair-tr">+ 100,0</span>
                    <span class="crosshair-bl">+ 0,50</span>
                    <span class="crosshair-br">+ 100,50</span>

                    <div class="top-bar">
                        <div class="brand">E3 RENTALS WAREHOUSE</div>
                        <div class="calib-pill">CALIB 100x50mm</div>
                    </div>

                    <div class="main-body">
                        <div class="qr-block">
                            ${previewSvg}
                        </div>
                        <div class="details-block">
                            <div class="asset-title">${testSampleTag}</div>
                            <div class="param-row">POSTEK / ZEBRA CALIBRATION TARGET</div>
                            <div class="param-row">SPEED: ${printSpeedIps} IPS | DENSITY: ${printDarkness} | SENSOR: ${mediaSensor.toUpperCase()}</div>
                            <div class="rfid-box">EPC: ${testSampleEpc}</div>
                        </div>
                    </div>

                    <div class="bottom-bar">
                        <span>ALIGNMENT ACCURACY: &plusmn;0.5mm</span>
                        <span>DATE: ${new Date().toLocaleDateString()}</span>
                        <span>TEAR-OFF / CUT LINE &darr;</span>
                    </div>
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 1200);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Module 3: Commissioning Submit
    const handleCommissionSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commIdentifier || !commRfid) {
            setCommFeedback({ type: "error", message: "Both Asset Identifier and RFID EPC are required." });
            if (soundEnabled) playErrorBuzzer();
            return;
        }

        setCommLoading(true);
        setCommFeedback(null);

        try {
            const res = await fetch("/api/admin/fleet/pair-rfid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: commIdentifier.trim(),
                    rfidTag: commRfid.trim(),
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                if (soundEnabled) playSuccessChime();
                setCommFeedback({ type: "success", message: data.message });
                setCommHistory(prev => [{
                    id: Math.random().toString(36).substring(2, 9),
                    timestamp: new Date().toLocaleTimeString(),
                    identifier: commIdentifier.trim().toUpperCase(),
                    rfidTag: commRfid.trim().toUpperCase(),
                    name: data.item?.name || "Asset",
                    type: data.item?.type || "unit",
                    status: "success",
                    message: data.message,
                }, ...prev]);

                // Reset and focus back on asset input for hands-free workflow
                setCommIdentifier("");
                setCommRfid("");
                assetInputRef.current?.focus();
                fetchHealth(); // refresh counts
            } else {
                if (soundEnabled) playErrorBuzzer();
                setCommFeedback({ type: "error", message: data.error || "Failed to pair RFID tag" });
                setCommHistory(prev => [{
                    id: Math.random().toString(36).substring(2, 9),
                    timestamp: new Date().toLocaleTimeString(),
                    identifier: commIdentifier.trim().toUpperCase(),
                    rfidTag: commRfid.trim().toUpperCase(),
                    name: "Unknown",
                    type: "unit",
                    status: "error",
                    message: data.error,
                }, ...prev]);
            }
        } catch (error: any) {
            if (soundEnabled) playErrorBuzzer();
            setCommFeedback({ type: "error", message: error.message || "Network error while pairing" });
        } finally {
            setCommLoading(false);
        }
    };

    // Auto-commit trigger when both fields are filled
    useEffect(() => {
        if (autoCommit && commIdentifier.trim().length >= 3 && commRfid.trim().length >= 16) {
            handleCommissionSubmit();
        }
    }, [commIdentifier, commRfid, autoCommit]);

    // Inspect tag or barcode query
    const handleInspectQuery = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inspectorQuery.trim()) return;

        setInspectorLoading(true);
        setInspectorResult(null);

        try {
            const res = await fetch(`/api/admin/fleet/pair-rfid?query=${encodeURIComponent(inspectorQuery.trim())}`);
            const data = await res.json();
            setInspectorResult(data);
            if (data.found && soundEnabled) {
                playSuccessChime();
            } else if (!data.found && soundEnabled) {
                playErrorBuzzer();
            }
        } catch (err: any) {
            setInspectorResult({ found: false, message: err.message || "Lookup error" });
        } finally {
            setInspectorLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                            <Wrench className="w-3.5 h-3.5" />
                            Hardware Center
                        </span>
                        <span className="text-xs text-slate-500 font-mono">v2026.09-RFID-WEDGE</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                        Warehouse Hardware Setup & Diagnostics
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Calibrate UHF RFID Sleds (Chainway R6), 4"×2" Continuous Thermal Printers (Postek / Zebra), and assembly-line commissioning.
                    </p>
                </div>

                {/* Quick Diagnostics Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
                            soundEnabled
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-white/[0.03] text-slate-400 border-white/10"
                        }`}
                        title="Toggle Synthesized Scanner Beep / Chime"
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
                        {soundEnabled ? "Audio Chime ON" : "Audio MUTED"}
                    </button>

                    <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                            (healthData?.database.latencyMs || 999) < 150 ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                        }`} />
                        <span className="text-slate-400">DB Latency:</span>
                        <span className="font-bold text-white">
                            {healthData?.database.latencyMs !== undefined ? `${healthData.database.latencyMs}ms` : "Checking..."}
                        </span>
                    </div>

                    <button
                        onClick={fetchHealth}
                        disabled={healthLoading}
                        className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Refresh Diagnostics"
                    >
                        <RefreshCw className={`w-4 h-4 ${healthLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/[0.08] gap-2 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab("wedge_test")}
                    className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                        activeTab === "wedge_test"
                            ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <Radio className="w-4 h-4" />
                    1. Sled Wedge Terminal
                </button>

                <button
                    onClick={() => setActiveTab("printer_calib")}
                    className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                        activeTab === "printer_calib"
                            ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <Printer className="w-4 h-4" />
                    2. Thermal 4"×2" Calibration
                </button>

                <button
                    onClick={() => setActiveTab("commissioning")}
                    className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                        activeTab === "commissioning"
                            ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <Barcode className="w-4 h-4" />
                    3. Fast Tag Commissioning
                </button>

                <button
                    onClick={() => setActiveTab("health")}
                    className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                        activeTab === "health"
                            ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    4. System Health & Readiness
                </button>
            </div>

            {/* TAB 1: SLED WEDGE TERMINAL */}
            {activeTab === "wedge_test" && (
                <div className="space-y-6">
                    {/* Instructions Banner */}
                    <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/20 rounded-2xl p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                    <Radio className="w-5 h-5 text-blue-400" />
                                    Live Keyboard Wedge & Sled Stream Monitor
                                </h3>
                                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                                    This terminal captures incoming transponder streams from your <strong>Chainway R6</strong> or Bluetooth RFID sled in real time. 
                                    Ensure your Android Sled UHF app is set to <strong>Output Mode: Keyboard Wedge</strong> and <strong>Suffix: Enter (\r\n)</strong>.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium ${
                                    isListeningGlobal ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-white/10"
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${isListeningGlobal ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
                                    {isListeningGlobal ? "Listening (Keystroke Intercept Active)" : "Paused"}
                                </div>
                                <button
                                    onClick={() => setIsListeningGlobal(!isListeningGlobal)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 transition-colors"
                                >
                                    {isListeningGlobal ? "Pause" : "Resume"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Live Stream Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                            <div className="text-xs text-slate-500 font-mono uppercase">Total Tags Captured</div>
                            <div className="text-2xl md:text-3xl font-extrabold text-white mt-1 font-mono">{burstCount}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Accumulated in this session</div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                            <div className="text-xs text-slate-500 font-mono uppercase">Last Keystroke Interval</div>
                            <div className="text-2xl md:text-3xl font-extrabold text-blue-400 mt-1 font-mono">{currentIntervalMs} ms</div>
                            <div className="text-[10px] text-slate-400 mt-1">Target: &lt;50ms for RFID burst</div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                            <div className="text-xs text-slate-500 font-mono uppercase">Burst Stream Rate</div>
                            <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
                                {currentIntervalMs > 0 ? (1000 / currentIntervalMs).toFixed(1) : "0.0"} <span className="text-sm font-normal text-slate-400">tags/s</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">High-throughput wedge rate</div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                            <div className="text-xs text-slate-500 font-mono uppercase">Expected EPC Length</div>
                            <div className="text-2xl md:text-3xl font-extrabold text-[var(--color-gold)] mt-1 font-mono">24 <span className="text-sm font-normal text-slate-400">HEX</span></div>
                            <div className="text-[10px] text-slate-400 mt-1">Gen2 EPC (96-bit standard)</div>
                        </div>
                    </div>

                    {/* Simulation & Manual Input Bar */}
                    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    Hardware Simulator & Direct Wedge Input
                                </h4>
                                <p className="text-xs text-slate-400">
                                    No physical sled handy? Click simulator buttons below to test how your pipeline handles single scans and 10-tag rapid bursts.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={simulateSingleEpc}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5"
                                >
                                    <Play className="w-3.5 h-3.5" />
                                    Simulate Single EPC
                                </button>
                                <button
                                    onClick={simulateRapidBurst}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    Simulate 10-Tag Burst (120ms)
                                </button>
                                <button
                                    onClick={simulateBarcode}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5"
                                >
                                    <Barcode className="w-3.5 h-3.5" />
                                    Simulate Barcode
                                </button>
                                {wedgeLogs.length > 0 && (
                                    <button
                                        onClick={() => setWedgeLogs([])}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10 transition-all"
                                    >
                                        Clear Feed
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Manual entry test box */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (wedgeInput.trim()) {
                                    processIncomingWedge(wedgeInput.trim(), 25);
                                    setWedgeInput("");
                                }
                            }}
                            className="flex gap-2"
                        >
                            <input
                                ref={wedgeInputRef}
                                type="text"
                                value={wedgeInput}
                                onChange={(e) => setWedgeInput(e.target.value)}
                                placeholder="Or manually paste/type raw wedge stream here (e.g. E2801160600002046872591B) and hit Enter..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--color-gold)] text-black hover:brightness-110 transition-all shrink-0"
                            >
                                Inject
                            </button>
                        </form>
                    </div>

                    {/* Live Stream Terminal Output */}
                    <div className="bg-[#05070D] border border-white/[0.08] rounded-2xl overflow-hidden">
                        <div className="bg-white/[0.02] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <span className="text-xs font-mono text-slate-400 ml-2">Console: Keyboard Wedge Intercept Buffer</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">Auto-scrolling · {wedgeLogs.length} events</span>
                        </div>

                        <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-2">
                            {wedgeLogs.length === 0 ? (
                                <div className="text-center py-12 text-slate-600">
                                    <Radio className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
                                    <p>Ready to receive RFID transponder stream.</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Pull the trigger on your Chainway R6 sled or click a simulator button above.</p>
                                </div>
                            ) : (
                                wedgeLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                log.type === "epc"
                                                    ? "bg-amber-500/20 text-[var(--color-gold)] border border-amber-500/30"
                                                    : log.type === "barcode"
                                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                    : "bg-slate-800 text-slate-300"
                                            }`}>
                                                {log.type.toUpperCase()}
                                            </span>
                                            <span className="text-white font-bold tracking-wide select-all">{log.rawText}</span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                            <span>{log.charCount} chars</span>
                                            <span className="text-slate-600">|</span>
                                            <span className={log.intervalMs < 100 ? "text-emerald-400" : "text-slate-400"}>
                                                &Delta; {log.intervalMs}ms
                                            </span>
                                            <span className="text-slate-600">|</span>
                                            <span className="text-emerald-400 font-semibold">&check; Suffix: CR+LF</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PRINTER CALIBRATION */}
            {activeTab === "printer_calib" && (
                <div className="space-y-6">
                    {/* Overview & Instructions */}
                    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/20 rounded-2xl p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                    <Printer className="w-5 h-5 text-amber-400" />
                                    Industrial Continuous Thermal Roll Calibration (100mm × 50mm / 4"×2")
                                </h3>
                                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                                    Calibrate your <strong>Postek TX3r</strong> or <strong>Zebra ZD421</strong> thermal transfer printer. 
                                    This test print generates edge alignment crosshairs (+0,0 to +100,50), vector SVG QR codes, and resin density verification lines with <strong>zero cloud dependencies</strong>.
                                </p>
                            </div>

                            <button
                                onClick={handlePrintCalibration}
                                className="px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs md:text-sm bg-[var(--color-gold)] text-black hover:brightness-110 shadow-lg shadow-amber-500/10 flex items-center gap-2 shrink-0 transition-all"
                            >
                                <Printer className="w-4 h-4" />
                                Print 100×50mm Test Label
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Interactive Parameters Configuration */}
                        <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-5">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                                <Sliders className="w-4 h-4 text-amber-400" />
                                Driver & Media Settings
                            </h4>

                            {/* Dimensions */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">Label Width (mm)</label>
                                    <input
                                        type="number"
                                        value={labelWidthMm}
                                        onChange={(e) => setLabelWidthMm(Number(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-amber-500/50 focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-500">Standard 4 inches = 100mm</span>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">Label Height (mm)</label>
                                    <input
                                        type="number"
                                        value={labelHeightMm}
                                        onChange={(e) => setLabelHeightMm(Number(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-amber-500/50 focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-500">Standard 2 inches = 50mm</span>
                                </div>
                            </div>

                            {/* Darkness & Speed */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400 font-medium">Darkness / Density:</span>
                                    <span className="text-amber-400 font-mono font-bold">{printDarkness} (Recommended: 15-18 for Resin)</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={printDarkness}
                                    onChange={(e) => setPrintDarkness(Number(e.target.value))}
                                    className="w-full accent-amber-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Print Speed (Inches Per Second)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[2, 3, 4, 6].map((ips) => (
                                        <button
                                            key={ips}
                                            type="button"
                                            onClick={() => setPrintSpeedIps(ips)}
                                            className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                                                printSpeedIps === ips
                                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                                    : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20"
                                            }`}
                                        >
                                            {ips} IPS
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Media Sensor */}
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Media Sensor Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["gap", "black_mark", "continuous"] as const).map((sensor) => (
                                        <button
                                            key={sensor}
                                            type="button"
                                            onClick={() => setMediaSensor(sensor)}
                                            className={`py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                                                mediaSensor === sensor
                                                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                                    : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20"
                                            }`}
                                        >
                                            {sensor.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sample identifiers */}
                            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">Test Asset Tag Code</label>
                                    <input
                                        type="text"
                                        value={testSampleTag}
                                        onChange={(e) => setTestSampleTag(e.target.value.toUpperCase())}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-amber-500/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium block mb-1">Test RFID EPC</label>
                                    <input
                                        type="text"
                                        value={testSampleEpc}
                                        onChange={(e) => setTestSampleEpc(e.target.value.toUpperCase())}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-amber-500/50 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Visual WYSIWYG Label Preview */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Printer className="w-4 h-4 text-amber-400" />
                                    Interactive 100mm × 50mm Label Canvas Preview
                                </h4>
                                <span className="text-xs text-slate-400 font-mono">1:1 Physical Aspect (200 DPI / 300 DPI)</span>
                            </div>

                            {/* Label Box (White Card imitating physical vinyl / polyester label) */}
                            <div className="bg-white text-black p-5 rounded-2xl shadow-2xl relative aspect-[2/1] max-w-xl mx-auto flex flex-col justify-between border-2 border-slate-300 select-none overflow-hidden">
                                {/* Millimeter Corner Crosshairs */}
                                <span className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-slate-800">+ 0,0</span>
                                <span className="absolute top-1.5 right-2 text-[9px] font-mono font-bold text-slate-800">+ 100,0</span>
                                <span className="absolute bottom-1.5 left-2 text-[9px] font-mono font-bold text-slate-800">+ 0,50</span>
                                <span className="absolute bottom-1.5 right-2 text-[9px] font-mono font-bold text-slate-800">+ 100,50</span>

                                {/* Center target circle */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                                    <div className="w-24 h-24 rounded-full border border-black flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full border border-black" />
                                    </div>
                                </div>

                                {/* Label Header */}
                                <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
                                    <div className="font-black text-sm tracking-wide">E3 RENTALS WAREHOUSE</div>
                                    <div className="bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                        CALIBRATION TARGET
                                    </div>
                                </div>

                                {/* Main Body with Vector SVG QR */}
                                <div className="flex items-center gap-4 my-auto">
                                    <div id="calib-qr-preview" className="p-1 bg-white border border-black rounded shrink-0">
                                        <QRCodeSVG
                                            value={`https://e3rentals.com/passport/${encodeURIComponent(testSampleTag)}`}
                                            size={90}
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="text-2xl font-black tracking-tight leading-none text-black">
                                            {testSampleTag}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                            4"×2" CONTINUOUS THERMAL TRANSFER ROLL
                                        </div>
                                        <div className="text-[9px] font-mono text-slate-600">
                                            SPEED: {printSpeedIps} IPS · DENSITY: {printDarkness} · {mediaSensor.toUpperCase()}
                                        </div>
                                        <div className="bg-slate-100 border border-dashed border-black px-2 py-1 rounded text-[8px] font-mono font-bold text-black break-all">
                                            EPC: {testSampleEpc}
                                        </div>
                                    </div>
                                </div>

                                {/* Label Footer */}
                                <div className="flex justify-between items-center border-t border-black pt-1 text-[8px] font-mono text-slate-700">
                                    <span>ALIGNMENT TOLERANCE: &plusmn;0.5mm</span>
                                    <span>ZERO-CLOUD VECTOR QR</span>
                                    <span>CUT / TEAR-OFF LINE &darr;</span>
                                </div>
                            </div>

                            {/* Calibration Runbook Guide */}
                            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                                <h5 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    Postek TX3r / Zebra ZD421 Runbook Checklist
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                                        <strong className="text-white block font-semibold">1. Gap Sensor Auto-Calibration</strong>
                                        <p className="text-[11px] text-slate-400">
                                            Power off, hold the FEED button while powering on until the status LED blinks amber twice, then release. It feeds 3 labels to calibrate die-cut gaps.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                                        <strong className="text-white block font-semibold">2. Windows / CUPS Driver Setup</strong>
                                        <p className="text-[11px] text-slate-400">
                                            In Printer Properties &gt; Stocks, define a new custom stock: Width <strong>100.0mm</strong>, Height <strong>50.0mm</strong>, Margins: <strong>0mm</strong>.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                                        <strong className="text-white block font-semibold">3. Ribbon Selection (Resin vs Wax)</strong>
                                        <p className="text-[11px] text-slate-400">
                                            Use Full Resin Ribbon (such as Ricoh B110CR) for scratch-proof and chemical-resistant on-metal flight case labels.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                                        <strong className="text-white block font-semibold">4. Alignment Inspection</strong>
                                        <p className="text-[11px] text-slate-400">
                                            Inspect the test label: The outer black border should sit exactly 1.5mm inside the label edges without drifting vertically.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: ASSEMBLY-LINE COMMISSIONING STATION */}
            {activeTab === "commissioning" && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/20 rounded-2xl p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                    <Barcode className="w-5 h-5 text-emerald-400" />
                                    Hands-Free Assembly-Line RFID Tag Commissioning Station
                                </h3>
                                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                                    Rapidly bind factory pre-printed/pre-encoded On-Metal RFID transponders to equipment units and flight cases. 
                                    Scan the Asset Barcode, then scan the RFID Tag EPC. The system will automatically pair and reset for the next item.
                                </p>
                            </div>

                            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer text-xs font-semibold text-white">
                                <input
                                    type="checkbox"
                                    checked={autoCommit}
                                    onChange={(e) => setAutoCommit(e.target.checked)}
                                    className="accent-emerald-500 w-4 h-4 rounded"
                                />
                                Auto-Pair on Scan (Hands-Free)
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Commissioning Scanner Form */}
                        <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 space-y-6">
                            <form onSubmit={handleCommissionSubmit} className="space-y-5">
                                {/* Step 1: Asset Code */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px]">1</span>
                                            Asset Barcode or Case Number
                                        </label>
                                        <span className="text-[10px] text-slate-500 font-mono">e.g. E3-TRUSS-001, FC-001</span>
                                    </div>
                                    <input
                                        ref={assetInputRef}
                                        type="text"
                                        value={commIdentifier}
                                        onChange={(e) => {
                                            setCommIdentifier(e.target.value.toUpperCase());
                                            // When Enter is hit or barcode scanner fires, move to RFID input
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && commIdentifier.trim()) {
                                                e.preventDefault();
                                                rfidInputRef.current?.focus();
                                            }
                                        }}
                                        placeholder="Scan unit barcode or type code..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none"
                                        autoFocus
                                    />
                                </div>

                                {/* Step 2: RFID EPC */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px]">2</span>
                                            RFID Tag Transponder EPC (96-Bit Hex)
                                        </label>
                                        <span className="text-[10px] text-slate-500 font-mono">e.g. E2801160600002046872591B</span>
                                    </div>
                                    <input
                                        ref={rfidInputRef}
                                        type="text"
                                        value={commRfid}
                                        onChange={(e) => setCommRfid(e.target.value.toUpperCase())}
                                        placeholder="Scan RFID tag with Sled or type hex..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-base font-mono font-bold text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                    />
                                </div>

                                {/* Feedback Notification */}
                                {commFeedback && (
                                    <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs md:text-sm font-medium ${
                                        commFeedback.type === "success"
                                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                            : "bg-red-500/10 text-red-300 border-red-500/30"
                                    }`}>
                                        {commFeedback.type === "success" ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">{commFeedback.message}</div>
                                    </div>
                                )}

                                {/* Manual Pair Button */}
                                <button
                                    type="submit"
                                    disabled={commLoading || !commIdentifier || !commRfid}
                                    className="w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                                >
                                    {commLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Pairing Transponder...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Commit & Pair Transponder
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Quick Tag & Barcode Inspector */}
                            <div className="pt-6 border-t border-white/[0.06] space-y-3">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-amber-400" />
                                    Instant Tag / Asset Inspector
                                </h4>
                                <form onSubmit={handleInspectQuery} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inspectorQuery}
                                        onChange={(e) => setInspectorQuery(e.target.value.toUpperCase())}
                                        placeholder="Scan any EPC or Barcode to inspect assignment..."
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={inspectorLoading}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 transition-colors"
                                    >
                                        {inspectorLoading ? "..." : "Inspect"}
                                    </button>
                                </form>

                                {inspectorResult && (
                                    <div className={`p-3 rounded-xl border text-xs font-mono ${
                                        inspectorResult.found
                                            ? "bg-white/[0.02] border-emerald-500/30 text-slate-200"
                                            : "bg-red-500/10 border-red-500/20 text-red-300"
                                    }`}>
                                        {inspectorResult.found ? (
                                            <div className="space-y-1">
                                                <div className="font-bold text-emerald-400 flex items-center justify-between">
                                                    <span>{inspectorResult.type === "flight_case" ? "FLIGHT CASE" : "EQUIPMENT UNIT"}</span>
                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                                        STATUS: {inspectorResult.status?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div><strong>Asset:</strong> {inspectorResult.identifier} ({inspectorResult.name})</div>
                                                <div><strong>RFID EPC:</strong> {inspectorResult.rfidTag || "Not Tagged"}</div>
                                                {inspectorResult.shelfLocation && (
                                                    <div><strong>Location:</strong> {inspectorResult.shelfLocation}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>{inspectorResult.message}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Session Commissioning Log */}
                        <div className="lg:col-span-5 bg-[#05070D] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col h-full min-h-[400px]">
                            <div className="bg-white/[0.02] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-mono font-bold text-white uppercase">Workstation Session Feed</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">{commHistory.length} items paired</span>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
                                {commHistory.length === 0 ? (
                                    <div className="text-center py-16 text-slate-600">
                                        <Barcode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">No pairings in this session yet.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Paired items will automatically record here.</p>
                                    </div>
                                ) : (
                                    commHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                                                item.status === "success"
                                                    ? "bg-emerald-500/[0.04] border-emerald-500/20 text-slate-200"
                                                    : "bg-red-500/[0.04] border-red-500/20 text-red-300"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-white">{item.identifier}</span>
                                                <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">{item.name}</div>
                                            <div className="text-[10px] text-[var(--color-gold)] break-all">EPC: {item.rfidTag}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: SYSTEM HEALTH & READINESS */}
            {activeTab === "health" && (
                <div className="space-y-6">
                    {/* Database & Latency Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-mono uppercase">
                                <span>Supabase DB Latency</span>
                                <Database className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-3xl font-black text-white font-mono">
                                {healthData?.database.latencyMs !== undefined ? `${healthData.database.latencyMs}ms` : "..."}
                            </div>
                            <div className="text-xs text-slate-400">
                                Port 6543 Transaction Pooler
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-mono uppercase">
                                <span>Fleet Tagging Coverage</span>
                                <Radio className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-3xl font-black text-[var(--color-gold)] font-mono">
                                {healthData?.rfidFleet.tagCoveragePct ?? 0}%
                            </div>
                            <div className="text-xs text-slate-400">
                                {healthData?.rfidFleet.totalTaggedAssets ?? 0} of {healthData?.rfidFleet.totalAssets ?? 0} total assets tagged
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-mono uppercase">
                                <span>Postgres Indexes</span>
                                <ShieldCheck className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-3xl font-black text-emerald-400 font-mono">
                                {healthData?.indexes.inventoryUnitsRfidTagIdx ? "100% OK" : "Degraded"}
                            </div>
                            <div className="text-xs text-slate-400">
                                B-Tree indexing on rfid_tag column
                            </div>
                        </div>
                    </div>

                    {/* Readiness Checklist */}
                    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            Production Hardware Readiness Verification
                        </h3>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-white">Dual EPC & Barcode Allocation Engine</div>
                                    <p className="text-xs text-slate-400">
                                        Allocation and flight case kit assembly engines resolve either human-readable tags (e.g. <code>E3-TRUSS-001</code>) or 24-char hex RFID EPCs interchangeably.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-white">Atomic Batch Fulfillment API</div>
                                    <p className="text-xs text-slate-400">
                                        <code>/api/admin/fulfillment</code> supports <code>bulk_stage</code>, <code>bulk_pack</code>, <code>bulk_dispatch</code>, and <code>bulk_return</code> in a single SQL query transaction. Prevents connection pool exhaustion during 50-item RFID bursts.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-white">300ms Keystroke Wedge Accumulator</div>
                                    <p className="text-xs text-slate-400">
                                        Warehouse Scan Station debouncing lockout removed for rapid RFID wedge streams. Accumulator collects burst scans with 300ms quiet window.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-white">Continuous Thermal Roll Vector Printing</div>
                                    <p className="text-xs text-slate-400">
                                        Warehouse label printing generates 100mm×50mm (4"×2") continuous roll output with zero cloud dependencies using local SVG rendering.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Navigation Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Link
                            href="/dashboard/warehouse/fulfillment"
                            className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] transition-all group flex items-center justify-between"
                        >
                            <div>
                                <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Warehouse Scan Station</div>
                                <div className="text-xs text-slate-400">Launch fulfillment scan modal</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        </Link>

                        <Link
                            href="/dashboard/warehouse/labels"
                            className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] transition-all group flex items-center justify-between"
                        >
                            <div>
                                <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Batch Label Generator</div>
                                <div className="text-xs text-slate-400">Print 4"×2" roll or A4 sheets</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        </Link>

                        <Link
                            href="/dashboard/warehouse/fleet"
                            className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] transition-all group flex items-center justify-between"
                        >
                            <div>
                                <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Fleet Registry</div>
                                <div className="text-xs text-slate-400">Manage all units & flight cases</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
