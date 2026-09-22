"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Route, 
    Truck,
    Package, 
    ShieldAlert, 
    Tag,
    Grid,
    ArrowLeftRight,
    CheckSquare,
    ClipboardList,
    Wrench,
    Boxes,
    Map,
    Radio,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Warehouse,
    Clock,
    Wifi
} from "lucide-react";
import { isWarehouseSoundEnabled, setWarehouseSoundEnabled, playClickBeep } from "@/lib/warehouse-audio";

type TabGroup = "core" | "floor" | "logistics";

interface WarehouseTab {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    group: TabGroup;
    badge?: string;
}

const WAREHOUSE_TABS: WarehouseTab[] = [
    // Core Ops
    { href: "/dashboard/warehouse/overview", label: "Hub", icon: LayoutDashboard, group: "core" },
    { href: "/dashboard/warehouse/fulfillment", label: "Scan Station", icon: Package, group: "core", badge: "Live" },
    { href: "/dashboard/warehouse/pick-lists", label: "Pick & Stage", icon: CheckSquare, group: "core" },
    { href: "/dashboard/warehouse/dispatch", label: "Pipeline", icon: Route, group: "core" },

    // Floor & Storage
    { href: "/dashboard/warehouse/map", label: "Floor Map 3D", icon: Map, group: "floor", badge: "Twin" },
    { href: "/dashboard/warehouse/zones", label: "Zones & Bins", icon: Grid, group: "floor" },
    { href: "/dashboard/warehouse/counts", label: "Stock Audit", icon: ClipboardList, group: "floor" },
    { href: "/dashboard/warehouse/transfers", label: "Transfers", icon: ArrowLeftRight, group: "floor" },
    { href: "/dashboard/warehouse/consumables", label: "Consumables", icon: Boxes, group: "floor" },

    // Logistics & QC
    { href: "/dashboard/warehouse/transport", label: "Transport", icon: Truck, group: "logistics" },
    { href: "/dashboard/warehouse/fleet", label: "Fleet Telematics", icon: Radio, group: "logistics" },
    { href: "/dashboard/warehouse/inspections", label: "Inspect & QC", icon: ShieldAlert, group: "logistics" },
    { href: "/dashboard/warehouse/labels", label: "Labels", icon: Tag, group: "logistics" },
    { href: "/dashboard/warehouse/setup", label: "Hardware Setup", icon: Wrench, group: "logistics" },
];

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [currentTime, setCurrentTime] = useState<string>("");
    const [soundOn, setSoundOn] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [selectedGroup, setSelectedGroup] = useState<TabGroup | "all">("all");

    // Real-time clock for warehouse floor operations
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Sound state sync
    useEffect(() => {
        setSoundOn(isWarehouseSoundEnabled());
        const handleSoundChange = (e: CustomEvent) => setSoundOn(e.detail);
        window.addEventListener("warehouse-sound-changed" as any, handleSoundChange);
        return () => window.removeEventListener("warehouse-sound-changed" as any, handleSoundChange);
    }, []);

    // Fullscreen state listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleSound = () => {
        const next = !soundOn;
        setWarehouseSoundEnabled(next);
        setSoundOn(next);
        if (next) playClickBeep();
    };

    const toggleFullscreen = () => {
        playClickBeep();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    const filteredTabs = selectedGroup === "all" 
        ? WAREHOUSE_TABS 
        : WAREHOUSE_TABS.filter(t => t.group === selectedGroup);

    return (
        <div className="flex flex-col min-h-full bg-[#070913] text-slate-100">
            {/* Top Operational Status Bar */}
            <div className="bg-[#0A0E1A] border-b border-white/[0.08] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
                {/* Left: Facility & Hardware Scanner status */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                        <Warehouse className="w-3.5 h-3.5 text-[var(--color-gold)]" />
                        <span className="font-bold text-[11px] text-white tracking-wide uppercase hidden sm:inline">Main Logistics Depot</span>
                        <span className="text-[10px] font-mono text-[var(--color-gold)] font-bold">BAY D-01</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Wifi className="w-3 h-3 hidden sm:inline" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Scanner Wedge: Active</span>
                    </div>
                </div>

                {/* Right: Real-time Clock, Audio Toggle, Kiosk Toggle */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {currentTime && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[11px] font-bold text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{currentTime}</span>
                        </div>
                    )}

                    <button
                        onClick={toggleSound}
                        title={soundOn ? "Mute warehouse floor beeps" : "Enable floor sound feedback"}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                            soundOn 
                                ? "bg-amber-500/10 border-amber-500/30 text-[var(--color-gold)] hover:bg-amber-500/20" 
                                : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-white"
                        }`}
                    >
                        {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{soundOn ? "Audio On" : "Muted"}</span>
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        title="Toggle full-screen kiosk mode for pack station"
                        className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all"
                    >
                        {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isFullscreen ? "Exit Kiosk" : "Kiosk"}</span>
                    </button>
                </div>
            </div>

            {/* Quick Operational Zone Filter Buttons (for tablet/mobile ergonomics) */}
            <div className="bg-[#080C17]/95 border-b border-white/[0.06] px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden md:inline">Zone:</span>
                    {(["all", "core", "floor", "logistics"] as const).map(grp => {
                        const labels: Record<string, string> = {
                            all: "All Stations",
                            core: "Core Ops",
                            floor: "Floor & Storage",
                            logistics: "Logistics & QC"
                        };
                        const active = selectedGroup === grp;
                        return (
                            <button
                                key={grp}
                                onClick={() => {
                                    playClickBeep();
                                    setSelectedGroup(grp);
                                }}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                    active
                                        ? "bg-[var(--color-gold)] text-black shadow-sm"
                                        : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                                }`}
                            >
                                {labels[grp]}
                            </button>
                        );
                    })}
                </div>

                <div className="text-[10px] text-slate-400 font-mono hidden lg:block">
                    Touch-optimized for Zebra TC26 / Chainway / Tablets
                </div>
            </div>

            {/* Main Tabs Navigation Bar */}
            <nav className="sticky top-0 z-30 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-white/[0.08] flex overflow-x-auto no-scrollbar shadow-lg">
                {filteredTabs.map((tab) => {
                    const active = pathname.startsWith(tab.href);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            onClick={() => playClickBeep()}
                            className={`
                                relative flex flex-col items-center justify-center gap-1.5 px-4 sm:px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest 
                                whitespace-nowrap shrink-0 border-b-2 transition-all group
                                ${active
                                    ? "border-[var(--color-gold)] text-[var(--color-gold)] bg-amber-500/[0.04]"
                                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                                }
                            `}
                        >
                            <div className="relative">
                                <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${active ? 'text-[var(--color-gold)]' : 'text-slate-400'}`} />
                                {tab.badge && (
                                    <span className="absolute -top-1.5 -right-3 text-[8px] font-black px-1 rounded bg-[var(--color-gold)] text-black uppercase leading-tight scale-90">
                                        {tab.badge}
                                    </span>
                                )}
                            </div>
                            <span>{tab.label}</span>

                            {active && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Page Content */}
            <div className="flex-1 bg-[#070913]">
                {children}
            </div>
        </div>
    );
}
