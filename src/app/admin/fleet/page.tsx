"use client";

import React, { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { 
    QrCode, Plus, Filter, Search, Printer, Wrench, CheckCircle2,
    Package, RefreshCcw, ChevronRight, ChevronDown, FolderOpen,
    ScanLine, X, Camera, Building2, Tag, Eye, List, History as HistoryIcon
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { AssetTagPDF, LABEL_SIZE_OPTIONS, type LabelSize } from "@/components/admin/AssetTagPDF";
import { QRCodeCanvas } from "qrcode.react";

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
    categoryId: string;
    categoryName: string;
    categorySlug: string;
}

interface TreeNode {
    id: string;
    label: string;
    type: 'vendor' | 'category' | 'product';
    count: number;
    children?: TreeNode[];
}

// ─── Helper: Build hierarchical tree ───
function buildTree(units: InventoryUnit[], isAdmin: boolean): TreeNode[] {
    if (isAdmin) {
        // Admin: Vendor → Category → Product
        const vendorMap = new Map<string, { name: string; categories: Map<string, { name: string; products: Map<string, { name: string; count: number }> }> }>();
        for (const u of units) {
            const vName = u.vendorName || "Unassigned";
            const vId = u.vendorId || "unassigned";
            if (!vendorMap.has(vId)) vendorMap.set(vId, { name: vName, categories: new Map() });
            const vendor = vendorMap.get(vId)!;
            const catName = u.categoryName || "Uncategorized";
            const catId = u.categoryId || "uncategorized";
            if (!vendor.categories.has(catId)) vendor.categories.set(catId, { name: catName, products: new Map() });
            const cat = vendor.categories.get(catId)!;
            if (!cat.products.has(u.productId)) cat.products.set(u.productId, { name: u.productName, count: 0 });
            cat.products.get(u.productId)!.count++;
        }
        return Array.from(vendorMap.entries()).map(([vId, v]) => ({
            id: vId, label: v.name, type: 'vendor' as const, count: units.filter(u => (u.vendorId || "unassigned") === vId).length,
            children: Array.from(v.categories.entries()).map(([cId, c]) => ({
                id: cId, label: c.name, type: 'category' as const, count: Array.from(c.products.values()).reduce((s, p) => s + p.count, 0),
                children: Array.from(c.products.entries()).map(([pId, p]) => ({
                    id: pId, label: p.name, type: 'product' as const, count: p.count,
                })),
            })),
        }));
    } else {
        // Vendor: Category → Product
        const catMap = new Map<string, { name: string; products: Map<string, { name: string; count: number }> }>();
        for (const u of units) {
            const catName = u.categoryName || "Uncategorized";
            const catId = u.categoryId || "uncategorized";
            if (!catMap.has(catId)) catMap.set(catId, { name: catName, products: new Map() });
            const cat = catMap.get(catId)!;
            if (!cat.products.has(u.productId)) cat.products.set(u.productId, { name: u.productName, count: 0 });
            cat.products.get(u.productId)!.count++;
        }
        return Array.from(catMap.entries()).map(([cId, c]) => ({
            id: cId, label: c.name, type: 'category' as const, count: Array.from(c.products.values()).reduce((s, p) => s + p.count, 0),
            children: Array.from(c.products.entries()).map(([pId, p]) => ({
                id: pId, label: p.name, type: 'product' as const, count: p.count,
            })),
        }));
    }
}

// ─── Sidebar Tree Node ───
function TreeItem({ node, depth, activeId, onSelect, expanded, toggleExpand }: {
    node: TreeNode; depth: number; activeId: string | null;
    onSelect: (id: string, type: string) => void;
    expanded: Set<string>; toggleExpand: (id: string) => void;
}) {
    const isExpanded = expanded.has(node.id);
    const isActive = activeId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const icons = { vendor: Building2, category: FolderOpen, product: Package };
    const Icon = icons[node.type];

    return (
        <div>
            <button
                onClick={() => { if (hasChildren) toggleExpand(node.id); onSelect(node.id, node.type); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs rounded-lg transition-all ${
                    isActive ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]' : 'text-[var(--color-slate)] hover:bg-white/5 hover:text-white'
                }`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
                {hasChildren ? (
                    isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
                ) : <span className="w-3" />}
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1 font-bold">{node.label}</span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full font-mono shrink-0">{node.count}</span>
            </button>
            {hasChildren && isExpanded && (
                <div>{node.children!.map(child => (
                    <TreeItem key={child.id} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} expanded={expanded} toggleExpand={toggleExpand} />
                ))}</div>
            )}
        </div>
    );
}

// ─── Fleet Content (inner) ───
function FleetPageContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";

    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [labelSize, setLabelSize] = useState<LabelSize>("a4_sheet");
    const [userRole, setUserRole] = useState<string>("vendor");
    const [sidebarFilter, setSidebarFilter] = useState<{ id: string; type: string } | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [groupByProduct, setGroupByProduct] = useState(false);

    // Modals
    const [showInspectionModal, setShowInspectionModal] = useState<string | null>(null);
    const [showAddAssetModal, setShowAddAssetModal] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [viewLogsUnit, setViewLogsUnit] = useState<InventoryUnit | null>(null);
    const [qrDataUris, setQrDataUris] = useState<Record<string, string>>({});

    // Products & categories for add-asset form
    const [productsForAdd, setProductsForAdd] = useState<Array<{ id: string; name: string; categoryName: string; vendorId: string }>>([]);

    const conditionColors: Record<string, string> = {
        excellent: "text-green-400 bg-green-500/10",
        good: "text-blue-400 bg-blue-500/10",
        fair: "text-yellow-400 bg-yellow-500/10",
        maintenance_required: "text-red-400 bg-red-500/10",
        retired: "text-gray-400 bg-gray-500/10"
    };
    const availabilityColors: Record<string, string> = {
        in_warehouse: "text-green-400 bg-green-500/10",
        on_rent: "text-purple-400 bg-purple-500/10",
        in_maintenance: "text-orange-400 bg-orange-500/10"
    };

    const fetchFleet = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/fleet");
            if (res.ok) {
                const data = await res.json();
                setUnits(data);
                // Detect role from data
                const r = await fetch("/api/auth/session");
                if (r.ok) {
                    const s = await r.json();
                    setUserRole(s?.role || "vendor");
                }
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchFleet(); }, [fetchFleet]);

    // Fetch products for add-asset form
    useEffect(() => {
        fetch("/api/admin/products").then(r => r.ok ? r.json() : []).then(data => {
            setProductsForAdd(data.map((p: any) => ({ id: p.id, name: p.name, categoryName: p.category?.name || "—", vendorId: p.vendorId })));
        }).catch(() => {});
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const isAdmin = ["admin", "super_admin"].includes(userRole);
    const tree = buildTree(units, isAdmin);

    // Apply sidebar + search filters
    const filteredUnits = units.filter(u => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!u.assetTagCode.toLowerCase().includes(q) && !u.productName.toLowerCase().includes(q) && !(u.vendorName || "").toLowerCase().includes(q)) return false;
        }
        if (sidebarFilter) {
            if (sidebarFilter.type === 'vendor' && u.vendorId !== sidebarFilter.id) return false;
            if (sidebarFilter.type === 'category' && u.categoryId !== sidebarFilter.id) return false;
            if (sidebarFilter.type === 'product' && u.productId !== sidebarFilter.id) return false;
        }
        return true;
    });

    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    // Handle QR Generation whenever selection changes
    useEffect(() => {
        if (selectedIds.length === 0) return;
        const timer = setTimeout(() => {
            const newUris: Record<string, string> = { ...qrDataUris };
            let changed = false;
            selectedIds.forEach(id => {
                if (!newUris[id]) {
                    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
                    if (canvas) {
                        newUris[id] = canvas.toDataURL("image/png");
                        changed = true;
                    }
                }
            });
            if (changed) setQrDataUris(newUris);
        }, 500); // Wait for canvas to render
        return () => clearTimeout(timer);
    }, [selectedIds, units]);

    // ─── Maintenance Toggle ───
    const handleMaintenanceToggle = async (unit: InventoryUnit) => {
        const newStatus = unit.availabilityStatus === 'in_maintenance' ? 'in_warehouse' : 'in_maintenance';
        // Optimistic
        setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, availabilityStatus: newStatus as any } : u));
        await fetch("/api/admin/fleet", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: unit.id, availabilityStatus: newStatus }),
        });
    };

    // ─── View Passport ───
    const handleViewPassport = (assetTagCode: string) => window.open(`/passport/${assetTagCode}`, '_blank');

    return (
        <div className="flex gap-6 min-h-[80vh]">
            {/* ─── Sidebar ─── */}
            <aside className="w-64 shrink-0 hidden lg:block">
                <div className="glass border border-white/10 rounded-2xl p-3 sticky top-6 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-widest mb-3 px-3">Asset Navigator</h3>
                    <button
                        onClick={() => setSidebarFilter(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all mb-1 ${
                            !sidebarFilter ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]' : 'text-[var(--color-slate)] hover:bg-white/5'
                        }`}
                    >
                        <Package className="w-3.5 h-3.5" />
                        <span className="font-bold flex-1 text-left">All Assets</span>
                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full font-mono">{units.length}</span>
                    </button>
                    <div className="border-t border-white/5 mt-1 pt-1">
                        {tree.map(node => (
                            <TreeItem
                                key={node.id} node={node} depth={0}
                                activeId={sidebarFilter?.id || null}
                                onSelect={(id, type) => setSidebarFilter({ id, type })}
                                expanded={expanded} toggleExpand={toggleExpand}
                            />
                        ))}
                    </div>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <div className="flex-1 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-[var(--color-warm-white)] flex items-center gap-3">
                            <Package className="w-7 h-7 text-[var(--color-gold)]" />
                            Asset Fleet Manager
                        </h1>
                        <p className="text-[var(--color-slate)] text-sm">
                            {units.length} total units across all products
                        </p>
                    </div>
                    
                    {/* Breadcrumbs */}
                    {sidebarFilter && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold tracking-widest text-[var(--color-gold)]">
                            <span className="opacity-50">Filter:</span>
                            {sidebarFilter.type === 'vendor' && <><Building2 className="w-3 h-3" /> {tree.find(v => v.id === sidebarFilter.id)?.label || "Vendor"}</>}
                            {sidebarFilter.type === 'category' && <><FolderOpen className="w-3 h-3" /> {units.find(u => u.categoryId === sidebarFilter.id)?.categoryName || "Category"}</>}
                            {sidebarFilter.type === 'product' && <><Package className="w-3 h-3" /> {units.find(u => u.productId === sidebarFilter.id)?.productName || "Product"}</>}
                            <button onClick={() => setSidebarFilter(null)} className="ml-2 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Bulk Inspect */}
                        {selectedIds.length > 0 && (
                            <button 
                                onClick={() => setShowInspectionModal(selectedIds.join(','))} 
                                className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl font-bold text-xs hover:bg-emerald-500/20 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.1)]"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Bulk Inspect ({selectedIds.length})
                            </button>
                        )}

                        {/* QR Scanner */}
                        <button onClick={() => setShowScannerModal(true)} className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-xl font-bold text-xs hover:bg-blue-500/20 transition-all">
                            <ScanLine className="w-4 h-4" /> Scan QR
                        </button>
                        {/* Label Size Selector + Print */}
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-1">
                                <select value={labelSize} onChange={e => setLabelSize(e.target.value as LabelSize)}
                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
                                    {LABEL_SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <PDFDownloadLink
                                    document={<AssetTagPDF items={units.filter(u => selectedIds.includes(u.id)).map(u => ({ ...u, qrDataUri: qrDataUris[u.id] }))} labelSize={labelSize} />}
                                    fileName={`E3-Tags-${labelSize}-${Date.now()}.pdf`}
                                    className="flex items-center gap-2 bg-[var(--color-gold)] text-[var(--color-navy)] px-3 py-2 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all"
                                >
                                    {({ loading: pdfLoading }) => <><Printer className="w-4 h-4" /> {pdfLoading ? "..." : `Print (${selectedIds.length})`}</>}
                                </PDFDownloadLink>
                            </div>
                        )}
                        <button onClick={() => setShowAddAssetModal(true)} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/10 transition-all">
                            <Plus className="w-4 h-4" /> Add Asset
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="glass border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                        <input type="text" placeholder="Search asset tag, product, vendor..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-[var(--color-gold)] transition-all text-sm text-white"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={fetchFleet} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-[var(--color-slate)]" title="Refresh">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setGroupByProduct(!groupByProduct)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${groupByProduct ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/40 text-[var(--color-gold)]' : 'bg-white/5 border-white/10 text-[var(--color-slate)] hover:text-white'}`}
                    >
                        <List className="w-4 h-4" /> Grouped
                    </button>
                </div>

                {/* Table */}
                <div className="glass border border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="p-3 w-10 text-center">
                                    <input type="checkbox" className="accent-[var(--color-gold)]"
                                        checked={selectedIds.length === filteredUnits.length && filteredUnits.length > 0}
                                        onChange={e => setSelectedIds(e.target.checked ? filteredUnits.map(u => u.id) : [])} />
                                </th>
                                <th className="p-3 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Asset Tag</th>
                                <th className="p-3 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Product</th>
                                {isAdmin && <th className="p-3 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Vendor</th>}
                                <th className="p-3 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Status</th>
                                <th className="p-3 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">Condition</th>
                                <th className="p-3 text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && units.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={7} className="p-5 bg-white/5" /></tr>)
                            ) : filteredUnits.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-[var(--color-slate)]">
                                    <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold text-white">No assets found</p>
                                    <p className="text-xs mt-1">Try a different filter or add new assets.</p>
                                </td></tr>
                            ) : !groupByProduct ? (
                                filteredUnits.map(unit => <AssetRow 
                                    key={unit.id} unit={unit} isAdmin={isAdmin} 
                                    isSelected={selectedIds.includes(unit.id)} 
                                    onSelect={() => toggleSelect(unit.id)}
                                    onInspect={() => setShowInspectionModal(unit.id)}
                                    onMaintenance={() => handleMaintenanceToggle(unit)}
                                    conditionColors={conditionColors}
                                    availabilityColors={availabilityColors}
                                    onViewPassport={handleViewPassport}
                                    setViewLogsUnit={setViewLogsUnit}
                                />)
                            ) : (
                                Array.from(new Set(filteredUnits.map(u => u.productId))).map(pId => {
                                    const productUnits = filteredUnits.filter(u => u.productId === pId);
                                    const pName = productUnits[0].productName;
                                    const catName = productUnits[0].categoryName;
                                    return (
                                        <React.Fragment key={pId}>
                                            <tr className="bg-white/5 border-y border-white/10">
                                                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-3.5 h-3.5 text-[var(--color-gold)]" />
                                                        <span className="text-xs font-black text-white uppercase tracking-wider">{pName}</span>
                                                        <span className="text-[10px] text-[var(--color-slate)] uppercase font-bold opacity-50">• {catName}</span>
                                                        <span className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">{productUnits.length} Total Units</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {productUnits.map(unit => <AssetRow 
                                                key={unit.id} unit={unit} isAdmin={isAdmin} 
                                                isSelected={selectedIds.includes(unit.id)} 
                                                onSelect={() => toggleSelect(unit.id)}
                                                onInspect={() => setShowInspectionModal(unit.id)}
                                                onMaintenance={() => handleMaintenanceToggle(unit)}
                                                conditionColors={conditionColors}
                                                availabilityColors={availabilityColors}
                                                onViewPassport={handleViewPassport}
                                                setViewLogsUnit={setViewLogsUnit}
                                            />)}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Inspection Log Modal ─── */}
            {showInspectionModal && (
                <InspectionModal 
                    unitIds={showInspectionModal.split(',')} 
                    units={units.filter(u => showInspectionModal.split(',').includes(u.id))}
                    onClose={() => setShowInspectionModal(null)} 
                    onSuccess={() => { fetchFleet(); setSelectedIds([]); }} 
                />
            )}

            {/* ─── Add Asset Modal ─── */}
            {showAddAssetModal && (
                <AddAssetModal products={productsForAdd} onClose={() => setShowAddAssetModal(false)} onSuccess={fetchFleet} />
            )}

            {/* ─── Log Viewer Modal ─── */}
            {viewLogsUnit && (
                <LogViewer unit={viewLogsUnit} onClose={() => setViewLogsUnit(null)} />
            )}

            {/* Off-screen QR Generator (Reliable for canvas.toDataURL) */}
            <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
                {selectedIds.map(id => {
                    const unit = units.find(u => u.id === id);
                    if (!unit) return null;
                    const passportUrl = `${window.location.protocol}//${window.location.host}/passport/${unit.assetTagCode}`;
                    return (
                        <QRCodeCanvas 
                            key={id}
                            id={`qr-${id}`}
                            value={passportUrl}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ─── Log Viewer Modal ───
function LogViewer({ unit, onClose }: { unit: InventoryUnit; onClose: () => void }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/passport/${unit.assetTagCode}`)
            .then(r => r.json())
            .then(data => { setLogs(data.history || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [unit]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="glass border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-black text-lg text-white flex items-center gap-2 tracking-tight">
                            <HistoryIcon className="w-5 h-5 text-[var(--color-gold)]" /> Maintenance History
                        </h3>
                        <p className="text-[var(--color-gold)] font-mono text-[10px] font-bold mt-0.5">{unit.assetTagCode} • {unit.productName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-[var(--color-slate)] animate-pulse">Scanning records...</div>
                ) : logs.length === 0 ? (
                    <div className="py-12 text-center text-[var(--color-slate)] italic">No maintenance logs found for this asset.</div>
                ) : (
                    <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                        {logs.map((log) => (
                            <div key={log.id} className="relative pl-10">
                                <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-[var(--color-navy)] border-2 border-white/10" />
                                <p className="text-[10px] font-black text-[var(--color-slate)] uppercase tracking-[0.1em]">{new Date(log.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                <p className="text-sm font-bold text-white uppercase tracking-tight leading-none mt-1">{log.inspectionType.replace('_', ' ')}</p>
                                <div className="flex items-center gap-2 mt-1.5 mb-2">
                                    <span className="text-[10px] font-bold text-[var(--color-slate)] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{log.conditionBefore}</span>
                                    <ChevronRight className="w-3 h-3 text-[var(--color-slate)]" />
                                    <span className="text-[10px] font-black text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-1.5 py-0.5 rounded border border-[var(--color-gold)]/20">{log.conditionAfter}</span>
                                </div>
                                {log.notes && (
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-[var(--color-slate)] italic relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-gold)] opacity-30" />
                                        "{log.notes}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Inspection Log Modal ───
function InspectionModal({ unitIds, units, onClose, onSuccess }: { unitIds: string[]; units: InventoryUnit[]; onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ inspectionType: "routine", conditionAfter: (units[0]?.conditionStatus || "excellent") as string, notes: "" });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            // Bulk post to unique endpoint or loop (endpoint is preferred if exists, but we'll loop for now if not sure)
            await Promise.all(units.map(unit => 
                fetch("/api/admin/fleet/inspection", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        unitId: unit.id, 
                        inspectionType: form.inspectionType, 
                        conditionBefore: unit.conditionStatus, 
                        conditionAfter: form.conditionAfter, 
                        notes: form.notes + (units.length > 1 ? ` (Bulk inspection of ${units.length} items)` : "")
                    }),
                })
            ));
            onSuccess();
            onClose();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="glass border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-lg text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> {units.length > 1 ? `Bulk Inspection (${units.length})` : "Log Inspection"}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>
                
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-[var(--color-slate)] uppercase font-black tracking-widest mb-1">Target Assets</p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {units.map(u => (
                            <span key={u.id} className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-[var(--color-gold)]">
                                {u.assetTagCode}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Inspection Type</label>
                    <select value={form.inspectionType} onChange={e => setForm(p => ({ ...p, inspectionType: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]">
                        <option value="routine">Routine Check</option>
                        <option value="pre_rental">Pre-Rental Inspection</option>
                        <option value="return">Return Inspection</option>
                        <option value="damage">Damage Report</option>
                    </select>

                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Condition After</label>
                    <select value={form.conditionAfter} onChange={e => setForm(p => ({ ...p, conditionAfter: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]">
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="maintenance_required">Maintenance Required</option>
                        <option value="retired">Retired</option>
                    </select>

                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)] resize-none" placeholder="Optional inspection notes..." />
                </div>

                <button onClick={submit} disabled={saving}
                    className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {saving ? "Saving..." : "Submit Inspection Log"}
                </button>
            </div>
        </div>
    );
}

// ─── Add Asset Modal ───
function AddAssetModal({ products, onClose, onSuccess }: { products: Array<{ id: string; name: string; categoryName: string; vendorId: string }>; onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ productId: "", serialNumber: "", assetTagCode: "", warehouseLocation: "", conditionStatus: "excellent" });
    const [saving, setSaving] = useState(false);
    const [catFilter, setCatFilter] = useState("");

    const categories = [...new Set(products.map(p => p.categoryName))].sort();
    const filteredProducts = catFilter ? products.filter(p => p.categoryName === catFilter) : products;

    const submit = async () => {
        if (!form.productId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/fleet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) { onSuccess(); onClose(); }
            else { const e = await res.json(); alert(e.error || "Failed to add asset"); }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="glass border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-lg text-white flex items-center gap-2"><Plus className="w-5 h-5 text-[var(--color-gold)]" /> Add New Asset</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Category</label>
                    <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setForm(p => ({ ...p, productId: "" })); }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Product *</label>
                    <select value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]">
                        <option value="">Select a product...</option>
                        {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Serial Number</label>
                            <input value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]" placeholder="Optional" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest flex items-center justify-between">
                                Asset Tag
                                <span className="text-[10px] text-[var(--color-gold)] opacity-50 font-normal normal-case italic">Empty for auto-generate</span>
                            </label>
                            <div className="flex gap-2">
                                <input value={form.assetTagCode} onChange={e => setForm(p => ({ ...p, assetTagCode: e.target.value }))}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]" placeholder="E3-XXXXX" />
                                <ScannerButton onScan={code => setForm(p => ({ ...p, assetTagCode: code }))} />
                            </div>
                        </div>
                    </div>

                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Warehouse Location</label>
                    <input value={form.warehouseLocation} onChange={e => setForm(p => ({ ...p, warehouseLocation: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]" placeholder="e.g. Warehouse A - Bay 3" />

                    <label className="block text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest">Condition</label>
                    <select value={form.conditionStatus} onChange={e => setForm(p => ({ ...p, conditionStatus: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-gold)]">
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                    </select>
                </div>

                <button onClick={submit} disabled={saving || !form.productId}
                    className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {saving ? "Adding..." : "Add Asset Unit"}
                </button>
            </div>
        </div>
    );
}

// ─── QR Scanner Modal ───
function ScannerModal({ onClose }: { onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scanning, setScanning] = useState(true);
    const [result, setResult] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let active = true;
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                streamRef.current = stream;
                if (videoRef.current && active) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (e) {
                console.error("Camera access denied:", e);
                setScanning(false);
            }
        };
        startCamera();
        return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
    }, []);

    // Simple QR detection using BarcodeDetector API (Chrome/Edge/Safari)
    useEffect(() => {
        if (!scanning || result) return;
        const interval = setInterval(async () => {
            if (!videoRef.current || !videoRef.current.videoWidth) return;
            try {
                if ('BarcodeDetector' in window) {
                    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const url = barcodes[0].rawValue;
                        const match = url.match(/\/passport\/(.+)/);
                        if (match) {
                            setResult(match[1]);
                            setScanning(false);
                            streamRef.current?.getTracks().forEach(t => t.stop());
                        }
                    }
                }
            } catch { /* no-op */ }
        }, 500);
        return () => clearInterval(interval);
    }, [scanning, result]);

    const handleNavigate = () => {
        if (result) window.open(`/passport/${result}`, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="glass border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-lg text-white flex items-center gap-2"><Camera className="w-5 h-5 text-[var(--color-gold)]" /> Scan Asset QR</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-[var(--color-slate)]" /></button>
                </div>

                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    {scanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-[var(--color-gold)] rounded-2xl animate-pulse" />
                        </div>
                    )}
                </div>

                {result ? (
                    <div className="text-center space-y-3">
                        <p className="text-green-400 font-bold text-sm flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Asset Found!</p>
                        <p className="text-[var(--color-gold)] font-mono font-black text-lg">{result}</p>
                        <button onClick={handleNavigate} className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-sm">
                            Open Digital Passport
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-xs text-[var(--color-slate)]">Point camera at an E3 asset QR code</p>
                )}
            </div>
        </div>
    );
}

function AssetRow({ 
    unit, isAdmin, isSelected, onSelect, onInspect, onMaintenance, 
    conditionColors, availabilityColors, onViewPassport, setViewLogsUnit
}: { 
    unit: InventoryUnit, isAdmin: boolean, isSelected: boolean, 
    onSelect: () => void, onInspect: () => void, onMaintenance: () => void,
    conditionColors: Record<string, string>, availabilityColors: Record<string, string>,
    onViewPassport: (tag: string) => void,
    setViewLogsUnit: (unit: InventoryUnit) => void
}) {
    return (
        <tr className="hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0">
            <td className="p-3 text-center">
                <input type="checkbox" className="accent-[var(--color-gold)]"
                    checked={isSelected} onChange={onSelect} />
            </td>
            <td className="p-3">
                <span className="font-black text-white font-mono text-xs">{unit.assetTagCode}</span>
                <br/><span className="text-[10px] text-[var(--color-slate)] font-mono">{unit.serialNumber || '—'}</span>
            </td>
            <td className="p-3">
                <span className="text-sm font-bold text-white uppercase tracking-tight">{unit.productName}</span>
                <br/><span className="text-[10px] text-[var(--color-slate)] capitalize">{unit.categoryName}</span>
            </td>
            {isAdmin && <td className="p-3"><span className="text-xs font-bold text-[var(--color-slate)]">{unit.vendorName || "E3"}</span></td>}
            <td className="p-3">
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${availabilityColors[unit.availabilityStatus] || ''}`}>
                    {unit.availabilityStatus.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="p-3">
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${conditionColors[unit.conditionStatus] || ''}`}>
                    {unit.conditionStatus.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setViewLogsUnit(unit)} className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-all" title="View History">
                        <HistoryIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onViewPassport(unit.assetTagCode)} className="p-1.5 rounded-lg hover:bg-[var(--color-gold)] hover:text-navy transition-all" title="View Passport">
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onInspect} className="p-1.5 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" title="Log Inspection">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onMaintenance} className={`p-1.5 rounded-lg transition-all ${unit.availabilityStatus === 'in_maintenance' ? 'bg-orange-500 text-white' : 'hover:bg-red-500 hover:text-white'}`} title={unit.availabilityStatus === 'in_maintenance' ? 'Return to Warehouse' : 'Mark Maintenance'}>
                        <Wrench className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function ScannerButton({ onScan }: { onScan: (code: string) => void }) {
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const startScan = async () => {
        setScanning(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
                const interval = setInterval(async () => {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        onScan(barcodes[barcodes.length - 1].rawValue);
                        stopScan(stream, interval);
                    }
                }, 500);
            }
        } catch (e) {
            console.error(e);
            setScanning(false);
        }
    };

    const stopScan = (stream: MediaStream, interval: any) => {
        clearInterval(interval);
        stream.getTracks().forEach(t => t.stop());
        setScanning(false);
    };

    return (
        <div className="relative">
            <button onClick={startScan} className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                <Camera className="w-4 h-4" />
            </button>
            {scanning && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6">
                    <h3 className="text-white font-black mb-4 uppercase tracking-[0.2em] animate-pulse text-xs">Align QR Code</h3>
                    <div className="relative w-full max-w-sm aspect-square border-4 border-[var(--color-gold)] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(255,191,0,0.2)]">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-gold)]/10 to-transparent animate-scan-line" />
                    </div>
                    <button onClick={() => setScanning(false)} className="mt-8 px-8 py-3 rounded-2xl bg-white/10 text-white font-black uppercase text-xs tracking-widest border border-white/10">Cancel</button>
                </div>
            )}
        </div>
    );
}

// ─── Main Export ───
export default function FleetPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-[var(--color-slate)]">Loading Asset Fleet...</div>}>
            <FleetPageContent />
        </Suspense>
    );
}
