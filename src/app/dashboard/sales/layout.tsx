"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Trello, 
    Users,
    MessageSquareMore,
    FileText
} from "lucide-react";

const SALES_TABS = [
    { href: "/dashboard/sales/overview", label: "Hub", icon: LayoutDashboard },
    { href: "/dashboard/sales/pipeline", label: "Pipeline", icon: Trello },
    { href: "/dashboard/sales/clients", label: "Clients", icon: Users },
    { href: "/dashboard/sales/chat", label: "Messages", icon: MessageSquareMore },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-full">
            {/* Sales Navigation Tab Bar */}
            <nav className="sticky top-0 z-30 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-white/[0.06] flex overflow-x-auto no-scrollbar">
                {SALES_TABS.map((tab) => {
                    const active = pathname.startsWith(tab.href);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`
                                flex flex-col items-center gap-1 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] 
                                whitespace-nowrap shrink-0 border-b-2 transition-all
                                ${active
                                    ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                                    : "border-transparent text-slate-500 hover:text-slate-300"
                                }
                            `}
                        >
                            <Icon className={`h-4 w-4 ${active ? 'text-[var(--color-gold)]' : ''}`} />
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
