"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
    Clock, 
    FileText, 
    CheckCircle2, 
    Target,
    ArrowRight,
    Search
} from "lucide-react";
import Link from "next/link";

interface Project {
    id: string;
    projectName: string;
    status: string;
    vendorName: string;
    itemCount: number;
    totalUnits: number;
    createdAt: string;
}

interface ClientPipelineProps {
    projects: Project[];
}

const STAGES = [
    { key: "request", label: "Requested", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { key: "quote_sent", label: "Quoted", icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", pulse: true },
    { key: "quote_accepted", label: "Accepted", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { key: "booked", label: "Confirmed", icon: Target, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" }
];

export default function ClientPipeline({ projects }: ClientPipelineProps) {
    const getStageProjects = (status: string) => {
        if (status === "booked") {
             return projects.filter(p => ["booked", "approved"].includes(p.status)).slice(0, 3);
        }
        return projects.filter(p => p.status === status).slice(0, 3);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {STAGES.map((stage, idx) => {
                const stageProjects = getStageProjects(stage.key);
                const count = projects.filter(p => {
                    if (stage.key === "booked") return ["booked", "approved"].includes(p.status);
                    return p.status === stage.key;
                }).length;
                
                return (
                    <motion.div
                        key={stage.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${stage.bg} ${stage.color}`}>
                                    <stage.icon className={`w-4 h-4 ${stage.pulse ? 'animate-pulse' : ''}`} />
                                </div>
                                <h3 className="font-bold text-xs text-[var(--color-warm-white)] uppercase tracking-wider">
                                    {stage.label}
                                </h3>
                            </div>
                            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[var(--color-slate)] font-bold">
                                {count}
                            </span>
                        </div>

                        {/* Shelf */}
                        <div className="flex-1 space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 min-h-[250px] transition-colors hover:bg-white/[0.03]">
                            {stageProjects.length > 0 ? (
                                stageProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/dashboard/quote/${project.id}`}
                                        className={`block p-3 rounded-xl bg-[var(--color-navy)] border transition-all group relative overflow-hidden ${
                                            stage.key === 'quote_sent' ? 'border-amber-500/20 hover:border-amber-500/40' : 'border-white/5 hover:border-[var(--color-gold)]/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-bold text-[var(--color-warm-white)] line-clamp-1 group-hover:text-[var(--color-gold)] transition-colors">
                                                {project.projectName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <span className="text-[9px] font-bold text-[var(--color-gold)] uppercase tracking-wider bg-[var(--color-gold)]/10 px-1.5 py-0.5 rounded border border-[var(--color-gold)]/20">
                                                {project.vendorName}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                            <div className="text-[10px] text-[var(--color-slate)]">
                                                {project.itemCount} Items
                                            </div>
                                            <ArrowRight className="w-3 h-3 text-[var(--color-slate)] group-hover:text-[var(--color-gold)] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-10">
                                    <stage.icon className="w-8 h-8 mb-2" />
                                    <p className="text-[10px] font-medium uppercase tracking-widest">No active {stage.label.toLowerCase()}</p>
                                </div>
                            )}

                            {count > 3 && (
                                <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold text-[var(--color-slate)] hover:text-[var(--color-warm-white)] hover:bg-white/5 transition-all mt-2">
                                    View {count - 3} More
                                </button>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
