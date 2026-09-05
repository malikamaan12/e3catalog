/**
 * E3 Rentals - Offline Action Buffer Engine
 * Provides resilient client-side queuing for QR scanning, flight case pack verification,
 * and Driver Proof of Delivery (POD) in low/zero-connectivity event docks.
 */

export type ActionType = 
    | "fulfillment_scan" 
    | "flight_case_verify" 
    | "driver_pod" 
    | "driver_gps";

export interface BufferedAction {
    id: string;
    actionType: ActionType;
    endpoint: string;
    method: "POST" | "PUT" | "PATCH";
    payload: any;
    timestamp: number;
    status: "pending" | "syncing" | "synced" | "failed";
    retryCount: number;
    lastError?: string;
    description: string;
}

export interface SyncStatus {
    isOnline: boolean;
    pendingCount: number;
    syncingCount: number;
    lastSyncTimestamp?: number;
    isSyncing: boolean;
}

const STORAGE_KEY = "e3_offline_action_buffer_v1";

class OfflineSyncBufferEngine {
    private queue: BufferedAction[] = [];
    private listeners: Set<(status: SyncStatus) => void> = new Set();
    private isSyncing = false;
    private lastSyncTimestamp?: number;
    private isInitialized = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.init();
        }
    }

    private init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.loadFromStorage();

        window.addEventListener("online", () => {
            console.log("[OfflineBuffer] Network restored. Triggering auto-sync...");
            this.notify();
            this.flushQueue();
        });

        window.addEventListener("offline", () => {
            console.warn("[OfflineBuffer] Network lost. Operating in local buffer mode.");
            this.notify();
        });

        // Listen for Service Worker background sync wakeups
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data?.type === "TRIGGER_OFFLINE_SYNC") {
                    this.flushQueue();
                }
            });
        }
    }

    private loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.queue = JSON.parse(raw);
            }
        } catch (e) {
            console.warn("[OfflineBuffer] Failed to load queue from storage", e);
            this.queue = [];
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.warn("[OfflineBuffer] Failed to persist queue to storage", e);
        }
    }

    private notify() {
        const status = this.getStatus();
        this.listeners.forEach(fn => fn(status));
    }

    public getStatus(): SyncStatus {
        const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
        const pendingCount = this.queue.filter(a => a.status === "pending" || a.status === "failed").length;
        const syncingCount = this.queue.filter(a => a.status === "syncing").length;

        return {
            isOnline,
            pendingCount,
            syncingCount,
            lastSyncTimestamp: this.lastSyncTimestamp,
            isSyncing: this.isSyncing,
        };
    }

    public subscribe(listener: (status: SyncStatus) => void): () => void {
        this.listeners.add(listener);
        listener(this.getStatus());
        return () => this.listeners.delete(listener);
    }

    public getQueue(): BufferedAction[] {
        return [...this.queue];
    }

    public getPendingCount(): number {
        return this.queue.filter(a => a.status === "pending" || a.status === "failed").length;
    }

    public enqueueAction(params: {
        actionType: ActionType;
        endpoint: string;
        method?: "POST" | "PUT" | "PATCH";
        payload: any;
        description: string;
    }): BufferedAction {
        const newAction: BufferedAction = {
            id: `BUF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
            actionType: params.actionType,
            endpoint: params.endpoint,
            method: params.method || "POST",
            payload: params.payload,
            timestamp: Date.now(),
            status: "pending",
            retryCount: 0,
            description: params.description,
        };

        this.queue.push(newAction);
        this.saveToStorage();
        this.notify();

        // If currently online, try to flush immediately in background
        if (typeof navigator !== "undefined" && navigator.onLine) {
            this.flushQueue();
        }

        return newAction;
    }

    /**
     * Flush all pending items in the offline queue
     */
    public async flushQueue(): Promise<{ total: number; synced: number; failed: number }> {
        if (this.isSyncing) {
            return { total: 0, synced: 0, failed: 0 };
        }

        const pending = this.queue.filter(a => a.status === "pending" || a.status === "failed");
        if (pending.length === 0) {
            return { total: 0, synced: 0, failed: 0 };
        }

        this.isSyncing = true;
        this.notify();

        let synced = 0;
        let failed = 0;

        try {
            // Check if batch endpoint is available
            const batchPayload = pending.map(item => ({
                id: item.id,
                actionType: item.actionType,
                endpoint: item.endpoint,
                method: item.method,
                payload: item.payload,
                timestamp: item.timestamp,
            }));

            const res = await fetch("/api/warehouse/offline-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actions: batchPayload }),
            });

            if (res.ok) {
                const data = await res.json();
                const resultsMap = new Map<string, { success: boolean; message?: string }>();
                if (Array.isArray(data.results)) {
                    data.results.forEach((r: any) => resultsMap.set(r.id, r));
                }

                for (const item of pending) {
                    const result = resultsMap.get(item.id);
                    if (result && result.success) {
                        item.status = "synced";
                        synced++;
                    } else {
                        item.status = "failed";
                        item.retryCount++;
                        item.lastError = result?.message || "Sync processing error";
                        failed++;
                    }
                }
            } else {
                // Fallback: Individual sync for each action
                for (const item of pending) {
                    item.status = "syncing";
                    this.notify();
                    try {
                        const itemRes = await fetch(item.endpoint, {
                            method: item.method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(item.payload),
                        });

                        if (itemRes.ok) {
                            item.status = "synced";
                            synced++;
                        } else {
                            item.status = "failed";
                            item.retryCount++;
                            item.lastError = `HTTP ${itemRes.status}`;
                            failed++;
                        }
                    } catch (err: any) {
                        item.status = "failed";
                        item.retryCount++;
                        item.lastError = err.message || "Network request failed";
                        failed++;
                    }
                }
            }
        } catch (e: any) {
            console.error("[OfflineBuffer] Batch sync error", e);
            pending.forEach(item => {
                item.status = "failed";
                item.retryCount++;
                item.lastError = e.message;
            });
            failed = pending.length;
        } finally {
            this.isSyncing = false;
            this.lastSyncTimestamp = Date.now();
            // Automatically clean up successfully synced items older than 5 minutes
            this.cleanupSynced();
            this.saveToStorage();
            this.notify();
        }

        return { total: pending.length, synced, failed };
    }

    public cleanupSynced(): void {
        this.queue = this.queue.filter(a => a.status !== "synced");
        this.saveToStorage();
        this.notify();
    }

    public clearAll(): void {
        this.queue = [];
        this.saveToStorage();
        this.notify();
    }
}

// Export singleton instance
export const offlineBuffer = new OfflineSyncBufferEngine();
