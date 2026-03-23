"use client";

import React, { useState, useEffect, Suspense } from "react";
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
    FileText,
    RefreshCcw
} from "lucide-react";
import { useSearchParams } from "next/navigation";
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

function FleetPageContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    
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
        (u.vendorName && u.vendorName.toLowerCase().includes(searchQuery.toLowerCase()))
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
                            className="flex items-center gap-2 bg-[var(--color-gold)] text-[var(--color-navy)] px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 transition-all outline-none"
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
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[var(--color-gold)] transition-all text-sm text-[var(--color-warm-white)]"
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
                                    checked={selectedIds.length === filteredUnits.length && filteredUnits.length > 0}
                                    onChange={(e) => setSelectedIds(e.target.checked ? filteredUnits.map(u => u.id) : [])}
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
                                    <td colSpan={7} className="p-6 bg-white/5" />
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
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-[var(--color-gold)]">
                                            {unit.vendorName ? unit.vendorName[0] : 'E'}
                                        </div>
                                        <span className="text-xs font-bold text-[var(--color-slate)]">{unit.vendorName || "E3 Rentals"}</span>
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
                                        <button 
                                            onClick={() => window.open(`/passport/${unit.assetTagCode}`, '_blank')}
                                            className="p-2 rounded-lg hover:bg-[var(--color-gold)] hover:text-black transition-all" 
                                            title="View Digital Passport"
                                        >
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
                    <div className="p-12 text-center text-[var(--color-slate)]">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="font-bold text-[var(--color-warm-white)]">No assets found</h3>
                        <p className="text-sm">Try a different search or add inventory units.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FleetPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-[var(--color-slate)]">Loading Asset Fleet...</div>}>
            <FleetPageContent />
        </Suspense>
    );
}
