"use client";

import Link from "next/link";
import { Search, Home, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass rounded-3xl p-10 border border-white/5 space-y-8 animate-fade-in">
        {/* Animated 404 Icon */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center shadow-2xl">
            <Search className="w-12 h-12 text-navy" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-white font-[family-name:var(--font-heading)] italic tracking-tighter">
            404
          </h1>
          <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em]">
            Page Not Found
          </h2>
          <p className="text-[var(--color-slate)] text-sm leading-relaxed">
            The page or resource you are looking for does not exist, has been removed, or is currently unavailable.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/catalog"
            className="flex items-center justify-center gap-2 w-full py-4 bg-[var(--color-gold)] text-navy font-black text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Browse Equipment Catalog
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-4 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Return to Homepage
          </Link>
        </div>

        <button 
          onClick={() => window.history.back()}
          className="text-white/40 hover:text-gold text-[10px] font-bold uppercase tracking-[0.3em] transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <ChevronLeft className="w-3 h-3" />
          Go Back
        </button>
      </div>
    </div>
  );
}
