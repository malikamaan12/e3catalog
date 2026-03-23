"use client";

import React, { useState, useEffect } from "react";
import { 
    QrCode, 
    Plus, 
    Filter, 
    Search, 
    Download, 
    Printer, 
    MoreHorizontal,
    Wrench,
    CheckCircle2,
    AlertCircle,
    Package,
    ArrowRightLeft,
    FileText
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { AssetTagPDF } from "@/components/admin/AssetTagPDF";
import { AssetTagSticker } from "@/components/admin/AssetTagSticker";

interface InventoryUnit {
    id: string;
    productId: string;
    productName: string;
    vendorId: string;
    vendorName: string;
    assetTagCode: string;
    serialNumber: string;
    conditionStatus: 'excellent' | 'good' | 'fair' | 'maintenance_required' | 'retired';
    availabilityStatus: 'in_warehouse' | 'on_rent' | 'in_maintenance';
    lastInspectionDate: string | null;
    warehouseLocation: string;
}

export default function FleetPage() {
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Status color mapping
    const conditionColors = {
        excellent: "text-green-400 bg-green-500/10",
        good: "text-blue-400 bg-blue-500/10",
        fair: "text-yellow-400 bg-yellow-500/10",
        maintenance_required: "text-red-400 bg-red-500/10",
        retired: "text-gray-400 bg-gray-500/10"
    };

    const availabilityColors = {
        in_warehouse: "text-green-400 bg-green-500/10",
        on_rent: "text-purple-400 bg-purple-500/10",
        in_maintenance: "text-orange-400 bg-orange-500/10"
    };

    const fetchFleet = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/fleet");
            if (res.ok) {
                setUnits(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFleet();
    }, []);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredUnits = units.filter(u => 
        u.assetTagCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[var(--color-warm-white)] flex items-center gap-3">
                        <Package className="w-7 h-7 text-[var(--color-gold)]" />
                        Asset Fleet Manager
                    </h1>
                    <p className="text-[var(--color-slate)] text-sm">Trace individual physical units, compliance docs, and logistics status.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {selectedIds.length > 0 && (
                        <PDFDownloadLink
                            document={<AssetTagPDF items={units.filter(u => selectedIds.includes(u.id))} />}
                            fileName={`E3-BatchTags-${new Date().getTime()}.pdf`}
                            className="flex items-center gap-2 bg-[var(--color-gold)] text-[var(--color-navy)] px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            {({ loading }) => (
                                <>
                                    <Printer className="w-4 h-4" />
                                    {loading ? "Preparing PDF..." : `Print Selected (${selectedIds.length})`}
                                </>
                            )}
                        </PDFDownloadLink>
                    )}
                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-[var(--color-warm-white)] px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
                        <Plus className="w-4 h-4" />
                        Add New Asset
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                    <input 
                        type="text" 
                        placeholder="Search by Asset Tag, Product, or Vendor..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-[var(--color-slate)]">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={fetchFleet}
                        className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-[var(--color-slate)]"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="glass border border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    className="accent-[var(--color-gold)]" 
                                    checked={selectedIds.length === units.length && units.length > 0}
                                    onChange={(e) => setSelectedIds(e.target.checked ? units.map(u => u.id) : [])}
                                />
                            </th>
                            <th className="p-4 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Asset Tag</th>
                            <th className="p-4 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Product / Model</th>
                            <th className="p-4 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Vendor</th>
                            <th className="p-4 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Status</th>
                            <th className="p-4 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Condition</th>
                            <th className="p-4 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading && units.length === 0 ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={7} className="p-6 bg-white/5 mb-2" />
                                </tr>
                            ))
                        ) : filteredUnits.map((unit) => (
                            <tr key={unit.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="accent-[var(--color-gold)]"
                                        checked={selectedIds.includes(unit.id)}
                                        onChange={() => toggleSelect(unit.id)}
                                    />
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-[var(--color-warm-white)] font-mono text-xs">{unit.assetTagCode}</span>
                                        <span className="text-[10px] text-[var(--color-slate)] font-mono opacity-50">{unit.serialNumber || 'NO SERIAL'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm font-bold text-[var(--color-warm-white)]">{unit.productName}</span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">
                                            {unit.vendorName[0]}
                                        </div>
                                        <span className="text-xs font-bold text-[var(--color-slate)]">{unit.vendorName}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${availabilityColors[unit.availabilityStatus]}`}>
                                        {unit.availabilityStatus.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${conditionColors[unit.conditionStatus]}`}>
                                        {unit.conditionStatus.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 rounded-lg hover:bg-[var(--color-gold)] hover:text-black transition-all" title="View Digital Passport">
                                            <QrCode className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-blue-500 hover:text-white transition-all" title="Log Inspection">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Mark Maintenance">
                                            <Wrench className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {!loading && filteredUnits.length === 0 && (
                    <div className="p-12 text-center">
                        <Package className="w-12 h-12 text-[var(--color-slate)] mx-auto mb-4 opacity-20" />
                        <h3 className="font-bold text-[var(--color-warm-white)]">No assets found</h3>
                        <p className="text-sm text-[var(--color-slate)]">Add inventory units to start tracking your physical fleet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function RefreshCcw(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    )
}
