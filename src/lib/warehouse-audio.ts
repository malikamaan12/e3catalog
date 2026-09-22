// Zero-latency Web Audio API Synthesizer for Warehouse Floor Operations
// No external MP3 files needed; works 100% offline with zero latency on mobile/tablets/desktops.

let audioCtx: AudioContext | null = null;

const SOUND_STORAGE_KEY = "e3_warehouse_sound_enabled";

export function isWarehouseSoundEnabled(): boolean {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored === null ? true : stored === "true";
}

export function setWarehouseSoundEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent("warehouse-sound-changed", { detail: enabled }));
}

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    } catch (e) {
        console.warn("[WarehouseAudio] AudioContext initialization failed:", e);
        return null;
    }
}

/**
 * Positive high-frequency confirmation chime (1050 Hz -> 1500 Hz).
 * Clear, crisp beep that cuts through noisy warehouse environments.
 */
export function playScannerBeep(): void {
    if (!isWarehouseSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(1050, now);
        osc.frequency.exponentialRampToValueAtTime(1550, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);

        // Tactile vibration if supported (Zebra / Chainway / Android tablets)
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(75);
        }
    } catch (e) {
        console.warn("[WarehouseAudio] Scanner beep error:", e);
    }
}

/**
 * Low warning buzz (180 Hz sawtooth, 250ms).
 * Unambiguous error tone for missing bookings, wrong barcodes, or defects.
 */
export function playErrorBuzzer(): void {
    if (!isWarehouseSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(180, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    } catch (e) {
        console.warn("[WarehouseAudio] Error buzzer error:", e);
    }
}

/**
 * Triple ascending alert chime (880 Hz -> 1100 Hz -> 1320 Hz).
 * Used for fast-turnaround cross-docking or urgent flight-case kit alerts.
 */
export function playCrossDockChime(): void {
    if (!isWarehouseSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const notes = [880, 1100, 1320];
        const now = ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "triangle";
            const noteStart = now + idx * 0.09;
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.2, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(noteStart);
            osc.stop(noteStart + 0.08);
        });

        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([60, 40, 60, 40, 100]);
        }
    } catch (e) {
        console.warn("[WarehouseAudio] Cross-dock chime error:", e);
    }
}

/**
 * Subtle tactile click blip for keypad, buttons, and mode switches.
 */
export function playClickBeep(): void {
    if (!isWarehouseSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
    } catch (e) {
        console.warn("[WarehouseAudio] Click blip error:", e);
    }
}
