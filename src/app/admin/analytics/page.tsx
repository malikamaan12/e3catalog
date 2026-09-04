"use client";

import React, { useState, useEffect } from "react";
import { Loader2, TrendingUp, HandCoins, BarChart3, PieChart, Info, PercentCircle, Activity, Box, Search, Layers } from "lucide-react";
import { USER_ROLES } from "@/lib/constants";
import PredictiveUtilizationCockpit from "@/components/analytics/PredictiveUtilizationCockpit";
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

type AnalyticsData = {
    grossVolume: number;
    totalPlatformFee: number;
    totalVendorPayout: number;
    conversionRate: number;
    totalQuotes: number;
    totalConverted: number;
    operationalRevenue: number;
    chartData: { month: string; volume: number; platformFee: number; payout: number }[];
    topProducts: { name: string; viewCount: number; itemCode: string }[];
    projectedRevenue: number;
};

export default function AnalyticsDashboard() {
    const [activeSection, setActiveSection] = useState<'financial' | 'predictive'>('financial');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const userRes = await fetch("/api/auth/me");
                const userData = await userRes.json();
                setUser(userData.user);

                const dataRes = await fetch("/api/admin/analytics");
                if (dataRes.ok) {
                    const analytics = await dataRes.json();
                    setData(analytics);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, []);

    const isSuperAdmin = user?.role === USER_ROLES.SUPER_ADMIN || user?.role === USER_ROLES.ADMIN;
    
    // Formatting currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-[var(--color-gold)]" />
                        {isSuperAdmin ? "Master Financial Analytics" : "Earnings & Analytics"}
                    </h1>
                    <p className="text-[var(--color-slate)] mt-1">
                        {isSuperAdmin 
                            ? "Macroscopic view of marketplace health, platform commissions, and conversion ratios." 
                            : "Transparent overview of your payouts, historical metrics, and projected revenue."}
                    </p>
                </div>

                <div className="flex gap-1.5 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
                    <button
                        onClick={() => setActiveSection('financial')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeSection === 'financial'
                                ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md'
                                : 'text-[var(--color-slate)] hover:text-white'
                        }`}
                    >
                        <BarChart3 className="w-3.5 h-3.5" /> Financial Overview
                    </button>
                    <button
                        onClick={() => setActiveSection('predictive')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeSection === 'predictive'
                                ? 'bg-[var(--color-gold)] text-[var(--color-navy)] shadow-md'
                                : 'text-[var(--color-slate)] hover:text-white'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" /> Predictive Fleet & RevPAR
                    </button>
                </div>
            </div>

            {activeSection === 'predictive' ? (
                <PredictiveUtilizationCockpit />
            ) : loading || !data ? (
                <div className="flex justify-center items-center h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
                </div>
            ) : (
                <>
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isSuperAdmin ? (
                    <>
                        <StatCard 
                            title="Gross Marketplace Volume" 
                            value={formatCurrency(data.grossVolume)} 
                            icon={Activity} 
                            description="All-time approved transaction value."
                            color="text-blue-400"
                        />
                        <StatCard 
                            title="Total Platform Comm." 
                            value={formatCurrency(data.totalPlatformFee)} 
                            icon={HandCoins} 
                            description="E3's aggregate commission revenue."
                            color="text-[var(--color-gold)]"
                        />
                         <StatCard 
                            title="Operational Revenue" 
                            value={formatCurrency(data.operationalRevenue)} 
                            icon={PieChart} 
                            description="Logistics, setup, labor, etc."
                            color="text-emerald-400"
                        />
                        <StatCard 
                            title="Quote-to-Book Ratio" 
                            value={`${data.conversionRate}%`} 
                            icon={PercentCircle} 
                            description={`${data.totalConverted} booked out of ${data.totalQuotes} total quotes.`}
                            color="text-purple-400"
                        />
                    </>
                ) : (
                    <>
                        <StatCard 
                            title="Gross Product Volume" 
                            value={formatCurrency(data.grossVolume)} 
                            icon={Activity} 
                            description="Total value of your gear booked."
                            color="text-blue-400"
                        />
                        <StatCard 
                            title="Total Net Payouts" 
                            value={formatCurrency(data.totalVendorPayout)} 
                            icon={HandCoins} 
                            description="Your total lifetime earnings."
                            color="text-[var(--color-gold)]"
                        />
                        <StatCard 
                            title="Projected Upcoming Rev." 
                            value={formatCurrency(data.projectedRevenue)} 
                            icon={TrendingUp} 
                            description="Earnings from approved future bookings."
                            color="text-emerald-400"
                        />
                        <StatCard 
                            title="Conversion Rate" 
                            value={`${data.conversionRate}%`} 
                            icon={PercentCircle} 
                            description={`${data.totalConverted} booked out of ${data.totalQuotes} total quotes.`}
                            color="text-purple-400"
                        />
                    </>
                )}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Graph (Takes 2 columns) */}
                <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-2xl">
                    <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-warm-white)] mb-6">
                        {isSuperAdmin ? "Marketplace Revenue & Payouts (6 Mo.)" : "Gross Volume vs Your Payout (6 Mo.)"}
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" stroke="#475569" fontSize={12} tickMargin={10} />
                                <YAxis stroke="#475569" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    formatter={(value: any) => [formatCurrency(Number(value))]}
                                />
                                <Area type="monotone" dataKey="volume" name={isSuperAdmin ? "Platform Gross" : "Gross Volume"} stroke="#3b82f6" fillOpacity={1} fill="url(#colorVolume)" />
                                {isSuperAdmin ? (
                                    <Area type="monotone" dataKey="platformFee" name="E3 Commission" stroke="#eab308" fillOpacity={1} fill="url(#colorPayout)" />
                                ) : (
                                    <Area type="monotone" dataKey="payout" name="Your Net Payout" stroke="#eab308" fillOpacity={1} fill="url(#colorPayout)" />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Column: Catalog Demand & Forecasting */}
                <div className="space-y-6">
                    {/* Catalog Demand */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-2xl h-full">
                        <div className="flex items-center gap-2 mb-6">
                            <Search className="w-5 h-5 text-purple-400" />
                            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-warm-white)]">
                                Catalog Demand
                            </h3>
                        </div>
                        <p className="text-xs text-[var(--color-slate)] mb-4">Most viewed catalog items (traffic volume vs booked).</p>
                        
                        <div className="space-y-4">
                            {data.topProducts.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-navy)]/40 hover:bg-[var(--color-navy-lighter)] transition-colors border border-white/5">
                                    <div className="flex items-center gap-3 truncate pr-4">
                                        <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                                            <Box className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-white truncate">{p.name}</p>
                                            <p className="text-xs text-[var(--color-slate)]">{p.itemCode || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-[var(--color-gold)]">{p.viewCount}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Views</p>
                                    </div>
                                </div>
                            ))}
                            {data.topProducts.length === 0 && (
                                <div className="text-center text-[var(--color-slate)] text-sm py-8">
                                    No demand data recorded yet.
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Super Admin specific Forecasting block */}
                    {isSuperAdmin && (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-2xl bg-gradient-to-br from-[var(--color-surface)] to-emerald-900/10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--color-slate)]">Projected Upcoming Fees</p>
                                    <h4 className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(data.projectedRevenue)}</h4>
                                </div>
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-xs text-[var(--color-slate)] mt-4">
                                Future platform margins calculated from approved bookings that haven't occurred yet (includes projected logistics).
                            </p>
                        </div>
                    )}
                </div>
            </div>
            </>
            )}
        </div>
    );
}

function StatCard({ title, value, icon: Icon, description, color }: any) {
    return (
        <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border-subtle)] shadow-xl relative overflow-hidden group hover:border-[var(--color-gold)]/30 transition-colors">
            {/* Subtle glow effect */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-[0.05] group-hover:opacity-10 transition-opacity bg-current ${color}`} />
            
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg bg-[var(--color-navy)] border border-white/5 ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="group-hover:text-[var(--color-gold)] transition-colors text-white/20">
                    <Info className="w-4 h-4" />
                </div>
            </div>
            
            <h3 className="text-sm font-medium text-[var(--color-slate)] mb-1">{title}</h3>
            <div className="text-2xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-warm-white)] mb-3">
                {value}
            </div>
            
            <div className="text-xs text-[var(--color-slate)] border-t border-[var(--color-border-subtle)] pt-3">
                {description}
            </div>
        </div>
    );
}
