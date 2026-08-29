/**
 * E3 Rentals — Centralized Object Storage Interface
 */

import { getStorageAdapter, PresignedUploadOptions, PresignedDownloadOptions, PresignedUploadResult, PresignedDownloadResult } from "./adapter";

export * from "./adapter";

/**
 * Generates a presigned URL for direct object upload.
 */
export async function createPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
    const adapter = getStorageAdapter();
    return await adapter.generatePresignedUploadUrl(options);
}

/**
 * Generates a short-lived presigned URL for authorized download of private objects.
 */
export async function createPresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedDownloadResult> {
    const adapter = getStorageAdapter();
    return await adapter.generatePresignedDownloadUrl(options);
}

/**
 * Resolves a public CDN URL (only for public catalog media; never for private documents).
 */
export function getPublicMediaUrl(key: string): string | null {
    const adapter = getStorageAdapter();
    return adapter.getPublicUrl(key);
}
