"use client";

import { useState, useEffect } from "react";
import { 
    Truck, FileSignature, 
    Search, Calendar, Weight, RefreshCw, Loader2, User, Key
} from "lucide-react";
import { format } from "date-fns";

type TransportLog = {
    id: string;
    bookingId: string;
    projectName: string;
    driverName: string;
    vehiclePlateNumber: string;
    transportCompany: string;
    totalGrossWeight: number;
    dispatchedAt: string;
};

export default function TransportLogsPage() {
    const [logs, setLogs] = useState<TransportLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const load = () => {
        setLoading(true);
        fetch("/api/admin/transport")
            .then(r => r.json())
            .then(data => {
                setLogs(Array.isArray(data) ? data : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const filteredLogs = logs.filter(l => 
        l.projectName.toLowerCase().includes(search.toLowerCase()) ||
        l.driverName.toLowerCase().includes(search.toLowerCase()) ||
        l.vehiclePlateNumber.toLowerCase().includes(search.toLowerCase()) ||
        l.bookingId.toLowerCase().includes(search.toLowerCase())
    );

    const handleDownloadPDF = (bookingId: string) => {
        window.open(`/api/pdf/manifest/${bookingId}`, "_blank");
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto h-full">
            <header className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-100 italic uppercase">
                            Transport <span className="text-emerald-500 font-black">Logs</span>
                        </h1>
                        <p className="text-slate-400 font-medium tracking-tight mt-1">
                            Historical Transport Manifests & Physical Vehicle Tracking
                        </p>
                    </div>
                    <button 
                        onClick={load} 
                        className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all active:scale-95 border border-white/5"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>

            {/* Controls */}
            <div className="flex gap-4 mb-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                    <input
                        type="text"
                        placeholder="Search by Driver, Plate, Project, or Booking ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
                    />
                </div>
            </div>

            {/* Data View */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar pb-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Logistics Database...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 glass rounded-[2rem] border border-white/5">
                        <Truck className="h-12 w-12 text-slate-700 mb-4" />
                        <p className="text-xl font-black text-slate-500 uppercase tracking-widest italic">No Transport Logs Found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="glass rounded-[2rem] p-6 border border-white/10 flex flex-col gap-6 hover:border-emerald-500/30 transition-all hover:bg-white/[0.02]">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter truncate max-w-[200px]">
                                            {log.projectName}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            ID: {log.bookingId.slice(0, 8)}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleDownloadPDF(log.bookingId)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 shrink-0"
                                    >
                                        <FileSignature className="h-4 w-4" /> 
                                        <span>Manifest</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <div className="bg-slate-800 p-2 rounded-xl text-slate-400 shrink-0">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Driver</span>
                                            <span className="text-xs font-bold text-slate-200 truncate">{log.driverName}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <div className="bg-slate-800 p-2 rounded-xl text-slate-400 shrink-0">
                                            <Key className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Plate</span>
                                            <span className="text-xs font-bold text-slate-200 truncate">{log.vehiclePlateNumber}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <div className="bg-slate-800 p-2 rounded-xl text-slate-400 shrink-0">
                                            <Weight className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gross Wt.</span>
                                            <span className="text-xs font-bold text-slate-200 truncate">{log.totalGrossWeight} kg</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <div className="bg-slate-800 p-2 rounded-xl text-slate-400 shrink-0">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dispatch Time</span>
                                            <span className="text-[10px] font-bold text-slate-200 truncate">{format(new Date(log.dispatchedAt), "MMM do, HH:mm")}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[9px] text-right font-black text-slate-600 uppercase tracking-widest">
                                    {log.transportCompany}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
