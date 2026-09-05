"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        // Delay registration until page load to keep initial render fast
        const register = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
                if (process.env.NODE_ENV === "development") {
                    console.log("[PWA] Service Worker registered with scope:", reg.scope);
                }
            } catch (err) {
                console.warn("[PWA] Service Worker registration failed:", err);
            }
        };

        if (document.readyState === "complete") {
            register();
        } else {
            window.addEventListener("load", register);
            return () => window.removeEventListener("load", register);
        }
    }, []);

    return null;
}
