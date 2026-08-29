"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass rounded-2xl p-8 border border-white/5 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]">
            Something went wrong
          </h2>
          <p className="text-[var(--color-slate)] text-sm">
            A client-side exception occurred. We&apos;ve been notified and are looking into it.
          </p>
          {error.digest && (
            <p className="text-[10px] text-white/20 font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--color-gold)] text-navy font-bold rounded-xl hover:bg-yellow-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="text-white/60 hover:text-white text-sm transition-colors pt-2"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
