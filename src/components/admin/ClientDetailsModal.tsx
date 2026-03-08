import React, { useState, useEffect } from "react";
import { X, CalendarCheck, TrendingDown, DollarSign, Package } from "lucide-react";

export function ClientDetailsModal({ user, onClose }: { user: any, onClose: () => void }) {
    const [history, setHistory] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/admin/users/${user.id}/history`);
                const data = await res.json();
                if (data.history) {
                    setHistory(data.history);
                    setStats(data.stats);
                }
            } catch (err) {
                console.error("Failed to fetch client history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user.id]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--color-warm-white)]">
                            {user.name}
                        </h3>
                        <p className="text-sm text-[var(--color-slate)]">{user.email} • {user.phoneNumber || 'No phone'}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-slate)] hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8 flex-1">

                    {/* Stats Grid */}
                    {loading ? (
                        <div className="text-center py-10 text-[var(--color-slate)] animate-pulse">Loading analytics...</div>
                    ) : stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <Package className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-slate)] uppercase tracking-wider font-bold">Total Orders</p>
                                    <p className="text-2xl font-bold text-[var(--color-warm-white)]">{stats.totalOrders}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl">
                                    <CalendarCheck className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-slate)] uppercase tracking-wider font-bold">Completed</p>
                                    <p className="text-2xl font-bold text-[var(--color-warm-white)]">{stats.completedOrders}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-[var(--color-gold)]/10 rounded-xl">
                                    <DollarSign className="w-6 h-6 text-[var(--color-gold)]" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-slate)] uppercase tracking-wider font-bold">Lifetime Value</p>
                                    <p className="text-2xl font-bold text-[var(--color-warm-white)]">${stats.totalLTV.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-xl">
                                    <TrendingDown className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-slate)] uppercase tracking-wider font-bold">Avg Discount</p>
                                    <p className="text-2xl font-bold text-[var(--color-warm-white)]">${stats.avgDiscountPerOrder.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order History Table */}
                    {!loading && (
                        <div>
                            <h4 className="font-bold text-[var(--color-warm-white)] mb-4 uppercase tracking-widest text-xs">Order History</h4>
                            <div className="border border-white/5 bg-black/20 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10 text-[var(--color-slate)]">
                                            <th className="p-4 font-bold">Date</th>
                                            <th className="p-4 font-bold">Project / Product</th>
                                            <th className="p-4 font-bold">Status</th>
                                            <th className="p-4 font-bold text-right">Value</th>
                                            <th className="p-4 font-bold text-right">Discount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {history.length === 0 ? (
                                            <tr><td colSpan={5} className="p-4 text-center text-[var(--color-slate)]">No orders found.</td></tr>
                                        ) : history.map((b) => (
                                            <tr key={b.id} className="hover:bg-white/5">
                                                <td className="p-4 text-[var(--color-slate)] whitespace-nowrap">
                                                    {new Date(b.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-[var(--color-warm-white)]">{b.projectName || 'Un-named Request'}</p>
                                                    <p className="text-xs text-[var(--color-slate)]">{b.productName} ({b.units} units)</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${b.status === 'booked' || b.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                                                            b.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                                'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                        {b.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-mono text-[var(--color-warm-white)]">
                                                    ${(b.totalPrice || 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right font-mono text-red-400">
                                                    ${(b.discount || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
