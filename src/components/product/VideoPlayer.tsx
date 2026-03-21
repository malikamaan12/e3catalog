"use client";

export default function VideoPlayer({ url, posterUrl }: { url?: string; posterUrl?: string }) {
    if (url) {
        return (
            <div className="h-96 rounded-xl overflow-hidden bg-black flex items-center justify-center relative">
                <video
                    src={url}
                    poster={posterUrl}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    preload="none"
                    className="w-full h-full object-contain"
                />
            </div>
        );
    }

    return (
        <div className="h-96 rounded-xl overflow-hidden bg-[var(--color-navy-lighter)] flex items-center justify-center relative">
            {/* Demo video placeholder — in production would load actual product video */}
            <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--color-gold)] bg-opacity-10 flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-gold)] ml-1">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-warm-white)] mb-2">
                    Product Video
                </h3>
                <p className="text-sm text-[var(--color-slate)] max-w-sm">
                    High-definition product showcase video demonstrating setup, operation, and key features.
                </p>
                <p className="text-xs text-[var(--color-slate)] mt-4 opacity-50">
                    Video content will be available upon media upload
                </p>
            </div>

            {/* Progress bar decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-navy)]">
                <div className="h-full w-1/3 gradient-gold rounded-r opacity-50" />
            </div>
        </div>
    );
}
