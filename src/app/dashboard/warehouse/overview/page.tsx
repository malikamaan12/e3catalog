import { db } from "@/lib/db";
import { 
    bookings, inventoryUnits, safetyCertificates, stagingInventory, 
    warehouseTransfers, warehousePickLists, inventoryCycleCounts, 
    bookingDispatchLogs, products, fleetGpsPings 
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, desc, sql, asc } from "drizzle-orm";
import { 
    Truck, RotateCcw, Wrench, AlertTriangle,
    Scan, LayoutGrid, Printer, ShieldAlert, Boxes,
    CheckSquare, ArrowLeftRight, Grid, ClipboardList,
    Clock, Sparkles, MapPin, Radio, Activity, ArrowRight,
    FileSignature, CheckCircle2, Navigation, Gauge, Battery,
    Map
} from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import WarehouseActivityFeed from "@/components/warehouse/ActivityFeed";
import { detectQatarZone } from "@/lib/telemetry-gps";

export default async function WarehouseOverviewPage() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const next48h = addDays(today, 2);

    // 1. Pending Dispatches Today & Next 48h
    const upcomingDispatches = await db
        .select({
            id: bookings.id,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            startDate: bookings.startDate,
            startTime: bookings.startTime,
            units: bookings.units,
            status: bookings.status,
            fulfillmentStatus: bookings.fulfillmentStatus,
            productName: products.name,
        })
        .from(bookings)
        .leftJoin(products, eq(bookings.productId, products.id))
        .where(and(
            inArray(bookings.status, ["approved", "booked", "quote_accepted"]),
            gte(bookings.startDate, startOfToday),
            lte(bookings.startDate, next48h)
        ))
        .orderBy(asc(bookings.startDate))
        .limit(6);

    // 2. Pending Returns Today
    const returnsToday = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
            gte(bookings.endDate, startOfToday),
            lte(bookings.endDate, endOfToday)
        ));

    // 3. Units Status Breakdown
    const [unitCounts] = await db.select({
        total: sql<number>`count(*)::int`,
        onRent: sql<number>`count(case when ${inventoryUnits.availabilityStatus} in ('on_rent', 'dispatched') then 1 end)::int`,
        inWarehouse: sql<number>`count(case when ${inventoryUnits.availabilityStatus} in ('in_warehouse', 'available') then 1 end)::int`,
        maintenance: sql<number>`count(case when ${inventoryUnits.availabilityStatus} in ('in_maintenance', 'maintenance', 'damaged') then 1 end)::int`,
        awaitingQC: sql<number>`count(case when ${inventoryUnits.availabilityStatus} = 'awaiting_inspection' then 1 end)::int`,
        taggedRfid: sql<number>`count(case when ${inventoryUnits.rfidTag} is not null and ${inventoryUnits.rfidTag} != '' then 1 end)::int`,
    }).from(inventoryUnits);

    // 4. Active Pick Lists
    const activePickLists = await db
        .select({ id: warehousePickLists.id })
        .from(warehousePickLists)
        .where(inArray(warehousePickLists.status, ["pending", "picking", "packed", "staged"]));

    // 5. In-Transit Transfers
    const activeTransfers = await db
        .select({ id: warehouseTransfers.id })
        .from(warehouseTransfers)
        .where(inArray(warehouseTransfers.status, ["requested", "in_transit"]));

    // 6. Recent Dispatches with Transport Logs
    const recentDispatches = await db
        .select({
            id: bookingDispatchLogs.id,
            bookingId: bookingDispatchLogs.bookingId,
            driverName: bookingDispatchLogs.driverName,
            vehiclePlateNumber: bookingDispatchLogs.vehiclePlateNumber,
            transportCompany: bookingDispatchLogs.transportCompany,
            dispatchedAt: bookingDispatchLogs.dispatchedAt,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
        })
        .from(bookingDispatchLogs)
        .leftJoin(bookings, eq(bookingDispatchLogs.bookingId, bookings.id))
        .orderBy(desc(bookingDispatchLogs.dispatchedAt))
        .limit(4);

    // 7. Active Road Telemetry / Live Fleet Radar
    const activeDispatches = await db
        .select({
            id: bookingDispatchLogs.id,
            bookingId: bookingDispatchLogs.bookingId,
            driverName: bookingDispatchLogs.driverName,
            vehiclePlateNumber: bookingDispatchLogs.vehiclePlateNumber,
            transportCompany: bookingDispatchLogs.transportCompany,
            dispatchedAt: bookingDispatchLogs.dispatchedAt,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            fulfillmentStatus: bookings.fulfillmentStatus,
        })
        .from(bookingDispatchLogs)
        .leftJoin(bookings, eq(bookingDispatchLogs.bookingId, bookings.id))
        .orderBy(desc(bookingDispatchLogs.dispatchedAt))
        .limit(4);

    const activeFleetWithPings = await Promise.all(
        activeDispatches.map(async (dispatch) => {
            const [ping] = await db
                .select()
                .from(fleetGpsPings)
                .where(eq(fleetGpsPings.dispatchLogId, dispatch.id))
                .orderBy(desc(fleetGpsPings.createdAt))
                .limit(1);

            let zone = "Warehouse Terminal";
            if (ping) {
                zone = detectQatarZone(ping.latitude, ping.longitude);
            }
            return {
                ...dispatch,
                ping,
                zone,
            };
        })
    );

    const QUICK_ACTIONS = [
        {
            href: "/dashboard/warehouse/fulfillment",
            icon: Scan,
            label: "Scan Station",
            sub: "Dispatch · Return · e-POD",
            accent: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/25 hover:border-emerald-500/60",
            iconColor: "text-emerald-400",
        },
        {
            href: "/dashboard/warehouse/pick-lists",
            icon: CheckSquare,
            label: "Wave Picking",
            sub: "Pick · Pack · Stage",
            accent: "from-amber-500/20 to-amber-600/5 border-amber-500/25 hover:border-amber-500/60",
            iconColor: "text-amber-400",
        },
        {
            href: "/dashboard/warehouse/zones",
            icon: Grid,
            label: "Directed Putaway",
            sub: "Smart Slotting · Bins",
            accent: "from-sky-500/20 to-sky-600/5 border-sky-500/25 hover:border-sky-500/60",
            iconColor: "text-sky-400",
        },
        {
            href: "/dashboard/warehouse/consumables",
            icon: Boxes,
            label: "Consumables",
            sub: "Tape · Batteries · Fluid",
            accent: "from-purple-500/20 to-purple-600/5 border-purple-500/25 hover:border-purple-500/60",
            iconColor: "text-purple-400",
        },
        {
            href: "/dashboard/warehouse/counts",
            icon: Radio,
            label: "RFID Stock Audit",
            sub: "Wand Sweeps · Reconcile",
            accent: "from-blue-500/20 to-blue-600/5 border-blue-500/25 hover:border-blue-500/60",
            iconColor: "text-blue-400",
        },
        {
            href: "/dashboard/warehouse/map",
            icon: Map,
            label: "3D Floor Map",
            sub: "Digital Twin · Locator",
            accent: "from-amber-500/20 to-amber-600/5 border-amber-500/25 hover:border-amber-500/60",
            iconColor: "text-[var(--color-gold)]",
        },
        {
            href: "/dashboard/warehouse/setup",
            icon: Wrench,
            label: "Hardware Setup",
            sub: "Chainway Sleds · Thermal",
            accent: "from-amber-500/20 to-amber-600/5 border-amber-500/25 hover:border-amber-500/60",
            iconColor: "text-[var(--color-gold)]",
        },
    ];

    const DOCK_BAYS = [
        {
            bayNumber: "Bay 01",
            title: "Outbound Heavy Logistics",
            status: upcomingDispatches.length > 0 ? "active" : "standby",
            statusText: upcomingDispatches.length > 0 ? "Loading Active" : "Clear for Staging",
            currentBooking: upcomingDispatches[0]?.projectName || upcomingDispatches[0]?.customerName || "No Outbound Assigned",
            details: upcomingDispatches[0] ? `Departs today · ${upcomingDispatches[0].units || 1} units` : "Standby for next wave",
            badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        },
        {
            bayNumber: "Bay 02",
            title: "Cross-Dock Fast Track",
            status: "ready",
            statusText: "Dock-to-Dock Ready",
            currentBooking: "Direct Staging Area",
            details: "Fast-turnaround returns routed directly to next departure",
            badgeColor: "bg-amber-500/10 text-[var(--color-gold)] border-amber-500/30",
        },
        {
            bayNumber: "Bay 03",
            title: "Inbound Returns & QC Intake",
            status: returnsToday.length > 0 ? "incoming" : "standby",
            statusText: returnsToday.length > 0 ? `${returnsToday.length} Returns Expected` : "Dock Available",
            currentBooking: "Inspection Dock",
            details: `${unitCounts?.awaitingQC || 0} units awaiting technical QC`,
            badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        },
        {
            bayNumber: "Bay 04",
            title: "Inter-Hub Regional Transit",
            status: activeTransfers.length > 0 ? "in_transit" : "idle",
            statusText: activeTransfers.length > 0 ? `${activeTransfers.length} In-Transit Transfers` : "Dock Idle",
            currentBooking: "Logistics Fleet Transfer",
            details: "Hub-to-hub inventory rebalancing",
            badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        },
    ];

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full text-slate-100">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-[var(--color-gold)] border border-amber-500/20">
                            <Activity className="w-3.5 h-3.5" />
                            Operations Control Tower
                        </span>
                        <span className="text-xs text-slate-500 font-mono">WMS Enterprise v2026.09</span>
                    </div>
                    <h1 className="text-3xl font-[family-name:var(--font-heading)] font-black tracking-tight text-[var(--color-warm-white)] uppercase italic">
                        Warehouse <span className="text-[var(--color-gold)]">Hub</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        {format(today, "EEEE, MMMM do yyyy")} &middot; Real-time dock operations, fast-track cross-docking, and spatial inventory tracking.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400">RFID Wedge:</span>
                        <span className="font-bold text-white">Active</span>
                    </div>

                    <Link
                        href="/dashboard/warehouse/map"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 transition-all active:scale-95"
                    >
                        <Map className="w-4 h-4 text-amber-400" />
                        Floor Map 3D
                    </Link>

                    <Link
                        href="/dashboard/warehouse/fulfillment"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--color-gold)] text-black hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all active:scale-95"
                    >
                        <Scan className="w-4 h-4" />
                        Open Scan Station
                    </Link>
                </div>
            </header>

            {/* Top Operational Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Pick &amp; Stage Queue</div>
                    <div className="text-3xl font-black text-amber-400 font-mono">{activePickLists.length}</div>
                    <div className="text-[11px] text-slate-400">Active wave pick lists in progress</div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">On Rent / Deployed</div>
                    <div className="text-3xl font-black text-emerald-400 font-mono">{unitCounts?.onRent || 0}</div>
                    <div className="text-[11px] text-slate-400">Active equipment in field</div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">In Warehouse Ready</div>
                    <div className="text-3xl font-black text-white font-mono">{unitCounts?.inWarehouse || 0}</div>
                    <div className="text-[11px] text-slate-400">Slotted in storage bins</div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Service &amp; Maintenance</div>
                    <div className="text-3xl font-black text-rose-400 font-mono">{unitCounts?.maintenance || 0}</div>
                    <div className="text-[11px] text-slate-400">Quarantine &amp; repairs</div>
                </div>
            </div>

            {/* Dock Schedule & Loading Bays (Hourly Control Tower) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[var(--color-gold)]" />
                        <h2 className="text-base font-bold text-white uppercase tracking-wider">
                            Loading Dock Bays Schedule
                        </h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500">4 Physical Bays Configured</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {DOCK_BAYS.map((bay, idx) => (
                        <div
                            key={idx}
                            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between gap-4"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-black text-white">{bay.bayNumber}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${bay.badgeColor}`}>
                                        {bay.statusText}
                                    </span>
                                </div>
                                <div className="font-bold text-sm text-slate-200">{bay.title}</div>
                                <div className="text-xs text-[var(--color-gold)] font-medium truncate">
                                    {bay.currentBooking}
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 border-t border-white/[0.04] pt-3">
                                {bay.details}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Fleet Logistics Radar (Telematics) */}
            <div className="bg-[#05070D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <Radio className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                            Active Fleet Logistics Radar & Telematics ({activeFleetWithPings.length} Active Runs)
                        </span>
                    </div>
                    <Link href="/dashboard/warehouse/transport" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                        Transport Hub <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {activeFleetWithPings.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center gap-1">
                        <Truck className="w-6 h-6 text-slate-600 mb-1" />
                        <span>All vehicles currently docked at base depot. No active road transports.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {activeFleetWithPings.map(truck => (
                            <div 
                                key={truck.id}
                                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all space-y-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/5 text-white border border-white/10">
                                        {truck.vehiclePlateNumber || "QA-FLEET"}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        {truck.fulfillmentStatus === "out_for_delivery" ? "En Route" : "Dispatched"}
                                    </span>
                                </div>

                                <div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {truck.projectName || truck.customerName}
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                                        <span className="truncate">{truck.zone}</span>
                                    </div>
                                </div>

                                <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-white/[0.04] pt-2">
                                    <span>Driver: <strong className="text-slate-300">{truck.driverName}</strong></span>
                                    {truck.ping?.speed ? (
                                        <span className="font-mono text-emerald-400">{Math.round(truck.ping.speed * 3.6)} km/h</span>
                                    ) : (
                                        <span className="font-mono text-slate-500">Live GPS</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Middle Section: Outbound Departure Timetable & Recent e-POD Handover Signatures */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Outbound Departure Timetable */}
                <div className="lg:col-span-7 bg-[#05070D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-white">
                                Outbound Departures Timetable (Next 48h)
                            </span>
                        </div>
                        <Link href="/dashboard/warehouse/dispatch" className="text-xs text-[var(--color-gold)] hover:underline flex items-center gap-1">
                            Full Pipeline <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-2.5">
                        {upcomingDispatches.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-xs">
                                No outbound departures scheduled in the next 48 hours.
                            </div>
                        ) : (
                            upcomingDispatches.map(item => (
                                <div
                                    key={item.id}
                                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-colors flex items-center justify-between gap-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-xs">
                                                {item.projectName || item.customerName}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
                                                {item.fulfillmentStatus || "staged"}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {item.productName || "Multi-Item Booking"} &middot; {item.units || 1} Units
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-xs font-bold text-white font-mono">
                                            {format(new Date(item.startDate), "MMM dd, HH:mm")}
                                        </div>
                                        <Link
                                            href={`/dashboard/warehouse/fulfillment?bookingId=${item.id}`}
                                            className="text-[10px] text-sky-400 hover:underline font-semibold"
                                        >
                                            Fulfill &rarr;
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Dispatches with Signed Manifests (e-POD) */}
                <div className="lg:col-span-5 bg-[#05070D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div className="flex items-center gap-2">
                            <FileSignature className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-white">
                                Recent Signed Handover Notes (e-POD)
                            </span>
                        </div>
                        <Link href="/dashboard/warehouse/transport" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                            Transport Logs <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-2.5">
                        {recentDispatches.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-xs">
                                No transport dispatches logged yet today.
                            </div>
                        ) : (
                            recentDispatches.map(log => (
                                <div
                                    key={log.id}
                                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-white">
                                            {log.projectName || log.customerName || "Dispatched Project"}
                                        </span>
                                        <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Signed
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                        <span>Driver: {log.driverName} ({log.vehiclePlateNumber})</span>
                                        <a
                                            href={`/api/pdf/manifest/${log.bookingId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-amber-400 hover:underline font-mono"
                                        >
                                            PDF Note &rarr;
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Warehouse Operational Stations
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {QUICK_ACTIONS.map((action, idx) => (
                        <Link
                            key={idx}
                            href={action.href}
                            className="flex flex-col items-center justify-center text-center p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-[var(--color-gold)]/40 transition-all group active:scale-95"
                        >
                            <action.icon className={`h-8 w-8 ${action.iconColor} mb-3 group-hover:scale-110 transition-transform`} />
                            <div className="text-xs font-bold uppercase tracking-wide text-white">{action.label}</div>
                            <div className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">{action.sub}</div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Live Activity Feed */}
            <WarehouseActivityFeed />
        </div>
    );
}
