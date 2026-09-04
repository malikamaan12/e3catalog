"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Users, Clock, Calendar, Plus, ShieldCheck, AlertCircle, FileText, 
    CheckCircle2, X, Play, Square, Printer, Download, Sparkles, RefreshCw, 
    DollarSign, MapPin 
} from "lucide-react";

interface CrewRole {
    id: string;
    code: string;
    name: string;
    defaultHourlyRate: number;
    overtimeMultiplier: number;
}

interface CrewAssignment {
    id: string;
    bookingId: string;
    projectName?: string | null;
    crewName: string;
    roleId?: string | null;
    roleName?: string | null;
    callTime: string;
    endTime: string;
    venueLocation: string;
    status: string;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    standardHours: number;
    overtimeHours: number;
    hourlyRate: number;
    laborCost: number;
    notes?: string | null;
}

interface Props {
    bookingId?: string;
    venueDefault?: string;
}

export default function CrewSchedulingCockpit({ bookingId, venueDefault = "Qatar National Convention Centre (QNCC)" }: Props) {
    const [assignments, setAssignments] = useState<CrewAssignment[]>([]);
    const [roles, setRoles] = useState<CrewRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isCallSheetOpen, setIsCallSheetOpen] = useState(false);
    const [callSheetData, setCallSheetData] = useState<any | null>(null);
    const [callSheetLoading, setCallSheetLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form fields
    const [formName, setFormName] = useState("");
    const [formRoleId, setFormRoleId] = useState("");
    const [formCallTime, setFormCallTime] = useState("");
    const [formEndTime, setFormEndTime] = useState("");
    const [formVenue, setFormVenue] = useState(venueDefault);
    const [formNotes, setFormNotes] = useState("");

    const fetchCrewData = useCallback(async () => {
        try {
            setLoading(true);
            const roleRes = await fetch("/api/admin/crew/roles");
            if (roleRes.ok) {
                const rData = await roleRes.json();
                setRoles(rData.roles || []);
                if (rData.roles?.length > 0 && !formRoleId) {
                    setFormRoleId(rData.roles[0].id);
                }
            }

            const url = bookingId 
                ? `/api/admin/crew/assignments?bookingId=${bookingId}` 
                : "/api/admin/crew/assignments";
            const assignRes = await fetch(url);
            if (assignRes.ok) {
                const aData = await assignRes.json();
                setAssignments(aData.assignments || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [bookingId, formRoleId]);

    useEffect(() => {
        fetchCrewData();

        // Defaults for call time: today 14:00 to 23:00
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0);
        setFormCallTime(start.toISOString().slice(0, 16));
        setFormEndTime(end.toISOString().slice(0, 16));
    }, [fetchCrewData]);

    const handleAssignShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (!formName || !formCallTime || !formEndTime) return;

        try {
            setSubmitting(true);
            const res = await fetch("/api/admin/crew/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: bookingId || "default-booking",
                    crewName: formName,
                    roleId: formRoleId,
                    callTime: new Date(formCallTime).toISOString(),
                    endTime: new Date(formEndTime).toISOString(),
                    venueLocation: formVenue,
                    notes: formNotes,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || "Failed to schedule shift.");
                return;
            }

            setIsAssignModalOpen(false);
            setFormName("");
            setFormNotes("");
            await fetchCrewData();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to schedule shift.");
        } finally {
            setSubmitting(false);
        }
    };

    // Punch Clock Check In / Out
    const handlePunchClock = async (assignmentId: string, action: "check_in" | "check_out") => {
        try {
            const body = action === "check_in"
                ? { checkInAt: new Date().toISOString(), status: "checked_in" }
                : { checkOutAt: new Date().toISOString(), status: "completed" };

            const res = await fetch(`/api/admin/crew/assignments/${assignmentId}/timesheet`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                await fetchCrewData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Load Call Sheet
    const handleOpenCallSheet = async () => {
        if (!bookingId) return;
        try {
            setCallSheetLoading(true);
            const res = await fetch(`/api/admin/crew/call-sheet/${bookingId}`);
            if (res.ok) {
                const data = await res.json();
                setCallSheetData(data);
                setIsCallSheetOpen(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCallSheetLoading(false);
        }
    };

    const totalLabor = assignments.reduce((s, a) => s + (a.laborCost || 0), 0);

    return (
        <div className="flex flex-col gap-5 w-full animate-fade-in">
            {/* Header & Control Bar */}
            <div className="glass p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Technical Crew & Event Labor Scheduling
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {assignments.length} Scheduled
                            </span>
                        </div>
                        <p className="text-xs text-[var(--color-slate)]">
                            Conflict Detection, Standard (8h) & Overtime (1.5x) Timesheets, and Official Event Call Sheets
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {bookingId && (
                        <button
                            onClick={handleOpenCallSheet}
                            disabled={callSheetLoading}
                            className="px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/40 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <FileText className="w-3.5 h-3.5 text-amber-400" /> Event Call Sheet
                        </button>
                    )}

                    <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[var(--color-gold)]/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Schedule Shift
                    </button>
                </div>
            </div>

            {/* Shift Roster Table */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        Production Crew Roster & Timesheet Punch Auditor
                    </h4>
                    <div className="font-mono text-xs text-[var(--color-gold)] font-black">
                        Total Aggregated Labor: QAR {totalLabor.toLocaleString()}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-white/10 text-[var(--color-slate)] text-[10px] uppercase tracking-wider font-mono bg-white/[0.01]">
                                <th className="py-3 px-4">Technician Name</th>
                                <th className="py-3 px-4">Role Title</th>
                                <th className="py-3 px-4">Call Time — End Time</th>
                                <th className="py-3 px-4">Venue</th>
                                <th className="py-3 px-4">Hours (Std / OT)</th>
                                <th className="py-3 px-4">Labor Cost</th>
                                <th className="py-3 px-4">Shift Status</th>
                                <th className="py-3 px-4 text-right">Punch Clock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {assignments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--color-slate)] italic">
                                        No crew shifts scheduled for this production yet. Click "Schedule Shift" to assign engineers.
                                    </td>
                                </tr>
                            ) : (
                                assignments.map((shift) => {
                                    const isCheckedIn = shift.status === "checked_in";
                                    const isCompleted = shift.status === "completed";

                                    return (
                                        <tr key={shift.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-white">
                                                {shift.crewName}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-purple-300">
                                                {shift.roleName || "Technician"}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--color-slate)]">
                                                {new Date(shift.callTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3.5 px-4 text-[11px] text-[var(--color-slate)]">
                                                {shift.venueLocation.split(",")[0]}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs">
                                                <span className="text-white font-bold">{shift.standardHours}h</span>
                                                {shift.overtimeHours > 0 && (
                                                    <span className="text-amber-400 font-bold ml-1.5">
                                                        (+{shift.overtimeHours}h OT @ 1.5x)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-black text-emerald-400">
                                                QAR {shift.laborCost}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                    isCompleted
                                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                        : isCheckedIn
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse"
                                                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                }`}>
                                                    {shift.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                {!isCheckedIn && !isCompleted ? (
                                                    <button
                                                        onClick={() => handlePunchClock(shift.id, "check_in")}
                                                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase tracking-wider hover:bg-blue-500/30 transition-all flex items-center gap-1 ml-auto"
                                                    >
                                                        <Play className="w-2.5 h-2.5" /> Check In
                                                    </button>
                                                ) : isCheckedIn ? (
                                                    <button
                                                        onClick={() => handlePunchClock(shift.id, "check_out")}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/30 transition-all flex items-center gap-1 ml-auto"
                                                    >
                                                        <Square className="w-2.5 h-2.5" /> Check Out
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-mono text-[var(--color-slate)]">
                                                        Audited & Signed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Shift Assignment Modal with Live Conflict Detection */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={handleAssignShift} className="glass rounded-3xl border border-white/10 w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Schedule Crew Shift & Validate Conflicts
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(false)}
                                className="p-1.5 rounded-lg text-[var(--color-slate)] hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 font-bold">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 text-xs">
                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Crew Member Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Tariq Soundmaster"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[var(--color-gold)]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Production Role</label>
                                <select
                                    value={formRoleId}
                                    onChange={e => setFormRoleId(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} — QAR {r.defaultHourlyRate}/hr (OT {r.overtimeMultiplier}x)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Call Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formCallTime}
                                        onChange={e => setFormCallTime(e.target.value)}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Wrap / End Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formEndTime}
                                        onChange={e => setFormEndTime(e.target.value)}
                                        className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Qatar Venue Location</label>
                                <input
                                    type="text"
                                    required
                                    value={formVenue}
                                    onChange={e => setFormVenue(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Duties / Shift Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. FOH system tuning and RF frequency wireless coordination"
                                    value={formNotes}
                                    onChange={e => setFormNotes(e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Validate & Schedule
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Official Call Sheet Preview Modal */}
            {isCallSheetOpen && callSheetData && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="glass rounded-3xl border border-white/10 w-full max-w-3xl p-6 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-white/10 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                                        {callSheetData.documentNumber}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Official Production Call Sheet
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--color-slate)] mt-0.5">
                                    Event: <span className="text-white font-bold">{callSheetData.event.name}</span> • Venue: {callSheetData.event.venue}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCallSheetOpen(false)}
                                className="p-2 rounded-xl text-[var(--color-slate)] hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Safety Guidelines & Protocols */}
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
                            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-amber-400" /> Qatar Ministry of Labor Health & Safety Compliance
                            </h4>
                            <ul className="text-xs text-[var(--color-slate)] list-disc list-inside space-y-1">
                                {callSheetData.safetyGuidelines?.map((g: string, i: number) => (
                                    <li key={i} className="text-slate-300">{g}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Production Contacts */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Production Lead</span>
                                <p className="font-bold text-white mt-0.5">{callSheetData.contacts?.leadProductionManager}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Safety Officer</span>
                                <p className="font-bold text-white mt-0.5">{callSheetData.contacts?.safetyOfficer}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-[10px] text-[var(--color-slate)] uppercase tracking-wider font-bold">Loading Gate</span>
                                <p className="font-bold text-white mt-0.5">{callSheetData.contacts?.venueLogisticsGate}</p>
                            </div>
                        </div>

                        {/* Crew Call Times Table */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                Crew Call Times & Shift Roles ({callSheetData.totalCrewCount})
                            </h4>
                            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden text-xs">
                                {callSheetData.crewRoster?.map((c: any) => (
                                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                                        <div>
                                            <p className="font-bold text-white">{c.crewName}</p>
                                            <p className="text-[11px] text-purple-300">{c.roleName}</p>
                                        </div>
                                        <div className="text-right font-mono text-xs">
                                            <p className="font-bold text-amber-300">
                                                Call: {new Date(c.callTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-[10px] text-[var(--color-slate)]">
                                                Wrap: {new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl bg-white/[0.08] text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 hover:bg-white/[0.15] transition-all"
                            >
                                <Printer className="w-3.5 h-3.5" /> Print Call Sheet
                            </button>

                            <button
                                onClick={() => setIsCallSheetOpen(false)}
                                className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[var(--color-navy)] font-black text-xs uppercase tracking-wider"
                            >
                                Close Call Sheet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
