"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Package,
    Calendar,
    Store,
    ArrowRight,
    Loader2,
    X
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
    id: string;
    type: "product" | "booking" | "vendor";
    title: string;
    subtitle: string;
    href: string;
}

interface AdminCommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminCommandPalette({ isOpen, onClose }: AdminCommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery("");
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (isOpen) onClose();
                else {
                    // This should be handled by the parent, but we keep it here as fallback
                }
            }
            
            if (!isOpen) return;

            if (e.key === "Escape") onClose();
            
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (results.length || 1));
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
            }
            if (e.key === "Enter" && results[selectedIndex]) {
                e.preventDefault();
                handleSelect(results[selectedIndex]);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, results, selectedIndex]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const debounce = setTimeout(async () => {
            setLoading(true);
            try {
                // For now, we'll hit several APIs or a single global search if we create one.
                // Since we don't have a global search yet, I'll simulate a few high-level results
                // or eventually create a /api/admin/search route.
                
                // Let's create a combined search effect for MVP
                const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data);
            } catch (err) {
                console.error("Search error", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        router.push(result.href);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[var(--color-surface)] border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden"
                    >
                        <div className="relative flex items-center p-4 border-b border-white/5">
                            <Search className="w-5 h-5 text-[var(--color-gold)] ml-2" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search everything (Quotes, Products, Vendors)..."
                                className="flex-1 bg-transparent border-none outline-none px-4 text-[var(--color-warm-white)] placeholder:text-[var(--color-slate)] text-lg"
                            />
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-gold)]" />
                            ) : query ? (
                                <button onClick={() => setQuery("")} className="p-1 hover:bg-white/5 rounded-md">
                                    <X className="w-4 h-4 text-[var(--color-slate)]" />
                                </button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[var(--color-slate)]">ESC</span>
                                </div>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                            {results.length > 0 ? (
                                <div className="space-y-1">
                                    {results.map((result, index) => {
                                        const isSelected = index === selectedIndex;
                                        const Icon = result.type === "product" ? Package : result.type === "booking" ? Calendar : Store;
                                        
                                        return (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                onClick={() => handleSelect(result)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all ${
                                                    isSelected ? "bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 shadow-lg shadow-gold/5" : "border border-transparent"
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                                    isSelected ? "bg-[var(--color-gold)]/20 border-[var(--color-gold)]/30 text-[var(--color-gold)]" : "bg-white/5 border-white/5 text-[var(--color-slate)]"
                                                }`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-bold truncate ${isSelected ? "text-[var(--color-gold)]" : "text-[var(--color-warm-white)]"}`}>
                                                            {result.title}
                                                        </p>
                                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-slate)] border border-white/5">
                                                            {result.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--color-slate)] truncate">{result.subtitle}</p>
                                                </div>
                                                {isSelected && (
                                                    <ArrowRight className="w-4 h-4 text-[var(--color-gold)] animate-in slide-in-from-left-2" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : query.length >= 2 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <Search className="w-6 h-6 text-[var(--color-slate)]" />
                                    </div>
                                    <p className="text-[var(--color-warm-white)] font-bold">No results found for "{query}"</p>
                                    <p className="text-sm text-[var(--color-slate)]">Try searching for a different keyword or ID.</p>
                                </div>
                            ) : (
                                <div className="p-4 grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <p className="text-xs font-bold text-[var(--color-slate)] uppercase tracking-widest mb-3">Recent Searches / Quick Links</p>
                                    </div>
                                    {[
                                        { label: "Products", icon: Package, href: "/admin/products" },
                                        { label: "Bookings", icon: Calendar, href: "/admin/bookings" },
                                        { label: "Vendors", icon: Store, href: "/admin/super/vendors" }
                                    ].map(link => (
                                        <button
                                            key={link.label}
                                            onClick={() => { router.push(link.href); onClose(); }}
                                            className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-all text-left group"
                                        >
                                            <link.icon className="w-5 h-5 text-[var(--color-gold)] group-hover:scale-110 transition-transform" />
                                            <span className="font-bold text-[var(--color-warm-white)]">{link.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-slate)] font-medium">
                                    <ArrowRight className="w-3 h-3 rotate-90" /> Select
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-slate)] font-medium">
                                    <span className="px-1 py-0.5 rounded border border-white/10 bg-white/5 font-mono">⏎</span> Confirm
                                </span>
                            </div>
                            <span className="text-[10px] text-[var(--color-slate)] font-bold tracking-widest uppercase">E3 Command Palette</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
