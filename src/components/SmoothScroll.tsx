"use client";

import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export function SmoothScroll() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const lenis = new Lenis({
            duration: 1.0,
            lerp: 0.1,
            infinite: false,
        });

        let rafId: number;

        function raf(time: number) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }

        rafId = requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    return null;
}
