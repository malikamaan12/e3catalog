"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Route, 
    Truck,
    Package, 
    ShieldAlert, 
    Tag
} from "lucide-react";

const WAREHOUSE_TABS = [
    { href: "/dashboard/warehouse/overview", label: "Hub", icon: LayoutDashboard },
    { href: "/dashboard/warehouse/dispatch", label: "Pipeline", icon: Route },
    { href: "/dashboard/warehouse/transport", label: "Transport", icon: Truck },
    { href: "/dashboard/warehouse/fulfillment", label: "Scan", icon: Package },
    { href: "/dashboard/warehouse/fleet", label: "Fleet", icon: Package },
    { href: "/dashboard/warehouse/inspections", label: "Inspect", icon: ShieldAlert },
    { href: "/dashboard/warehouse/labels", label: "Labels", icon: Tag },
];

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-full">
            {/* Sticky horizontal tab bar — optimized for touch */}
            <nav className="sticky top-0 z-30 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-white/[0.06] flex overflow-x-auto no-scrollbar">
                {WAREHOUSE_TABS.map((tab) => {
                    const active = pathname.startsWith(tab.href);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`
                                flex flex-col items-center gap-1 px-5 py-3 text-[10px] font-black uppercase tracking-widest 
                                whitespace-nowrap shrink-0 border-b-2 transition-all
                                ${active
                                    ? "border-amber-500 text-amber-500"
                                    : "border-transparent text-slate-500 hover:text-slate-300"
                                }
                            `}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Page Content */}
            <div className="flex-1 bg-[#0A0F1C]">
                {children}
            </div>
        </div>
    );
}
