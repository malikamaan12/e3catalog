/**
 * E3 Rentals — Object Storage Adapter Interface & Implementations
 * 
 * Supports AWS S3 / Cloudflare R2 / MinIO with separate private & public bucket isolation,
 * plus a development mock provider with signed token simulation.
 */

import { env } from "../env";
import * as crypto from "crypto";

export interface PresignedUploadOptions {
    key: string;
    contentType: string;
    isPrivate?: boolean;
    expiresInSeconds?: number;
}

export interface PresignedUploadResult {
    uploadUrl: string;
    key: string;
    isPrivate: boolean;
    expiresInSeconds: number;
    headers?: Record<string, string>;
}

export interface PresignedDownloadOptions {
    key: string;
    isPrivate?: boolean;
    expiresInSeconds?: number;
    responseContentDisposition?: string;
}

export interface PresignedDownloadResult {
    downloadUrl: string;
    key: string;
    expiresAt: Date;
}

export interface StorageAdapter {
    generatePresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult>;
    generatePresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedDownloadResult>;
    getPublicUrl(key: string): string | null;
    deleteFile(key: string, isPrivate?: boolean): Promise<{ success: boolean; error?: string }>;
}

export class S3StorageAdapter implements StorageAdapter {
    private s3Client: any = null;

    private async getClient() {
        if (!this.s3Client) {
            const { S3Client } = await import("@aws-sdk/client-s3");
            this.s3Client = new S3Client({
                region: env.S3_REGION || "auto",
                credentials: {
                    accessKeyId: env.S3_ACCESS_KEY_ID || "",
                    secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
                },
                ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
                requestChecksumCalculation: "WHEN_REQUIRED" as any,
                responseChecksumValidation: "WHEN_REQUIRED" as any,
            });
        }
        return this.s3Client;
    }

    async generatePresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
        const client = await this.getClient();
        const { PutObjectCommand } = await import("@aws-sdk/client-s3");
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

        const bucket = options.isPrivate 
            ? (env.S3_PRIVATE_BUCKET_NAME || env.S3_BUCKET_NAME) 
            : env.S3_BUCKET_NAME;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: options.key,
            ContentType: options.contentType,
        });

        const expiresIn = options.expiresInSeconds || 900; // 15 mins default
        const uploadUrl = await getSignedUrl(client, command, { expiresIn });

        return {
            uploadUrl,
            key: options.key,
            isPrivate: Boolean(options.isPrivate),
            expiresInSeconds: expiresIn,
        };
    }

    async generatePresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedDownloadResult> {
        const client = await this.getClient();
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

        const bucket = options.isPrivate 
            ? (env.S3_PRIVATE_BUCKET_NAME || env.S3_BUCKET_NAME) 
            : env.S3_BUCKET_NAME;

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: options.key,
            ...(options.responseContentDisposition ? { ResponseContentDisposition: options.responseContentDisposition } : {}),
        });

        const expiresIn = options.expiresInSeconds || 900; // 15 mins default
        const downloadUrl = await getSignedUrl(client, command, { expiresIn });

        return {
            downloadUrl,
            key: options.key,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
    }

    getPublicUrl(key: string): string | null {
        if (env.NEXT_PUBLIC_CDN_URL) {
            return `${env.NEXT_PUBLIC_CDN_URL.replace(/\/$/, "")}/${key}`;
        }
        return `https://${env.S3_BUCKET_NAME}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
    }

    async deleteFile(key: string, isPrivate = false): Promise<{ success: boolean; error?: string }> {
        try {
            const client = await this.getClient();
            const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
            const bucket = isPrivate ? (env.S3_PRIVATE_BUCKET_NAME || env.S3_BUCKET_NAME) : env.S3_BUCKET_NAME;

            await client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }));

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}

export class DevStorageAdapter implements StorageAdapter {
    async generatePresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
        const expiresIn = options.expiresInSeconds || 900;
        const expiresAt = Date.now() + expiresIn * 1000;
        const signature = crypto
            .createHmac("sha256", env.AUTHENTICATION_SECRET)
            .update(`upload:${options.key}:${expiresAt}:${options.isPrivate ? "1" : "0"}`)
            .digest("hex");

        const uploadUrl = `${env.APP_URL}/api/storage/dev-upload?key=${encodeURIComponent(options.key)}&expires=${expiresAt}&sig=${signature}`;

        return {
            uploadUrl,
            key: options.key,
            isPrivate: Boolean(options.isPrivate),
            expiresInSeconds: expiresIn,
        };
    }

    async generatePresignedDownloadUrl(options: PresignedDownloadOptions): Promise<PresignedDownloadResult> {
        const expiresIn = options.expiresInSeconds || 900;
        const expiresAt = Date.now() + expiresIn * 1000;
        const signature = crypto
            .createHmac("sha256", env.AUTHENTICATION_SECRET)
            .update(`download:${options.key}:${expiresAt}`)
            .digest("hex");

        const downloadUrl = `${env.APP_URL}/api/storage/dev-download?key=${encodeURIComponent(options.key)}&expires=${expiresAt}&sig=${signature}`;

        return {
            downloadUrl,
            key: options.key,
            expiresAt: new Date(expiresAt),
        };
    }

    getPublicUrl(key: string): string | null {
        return `${env.APP_URL}/uploads/${key}`;
    }

    async deleteFile(_key: string, _isPrivate = false): Promise<{ success: boolean; error?: string }> {
        return { success: true };
    }
}

let activeStorageAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
    if (activeStorageAdapter) return activeStorageAdapter;

    if (env.STORAGE_DRIVER === "s3" && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
        activeStorageAdapter = new S3StorageAdapter();
    } else {
        activeStorageAdapter = new DevStorageAdapter();
    }

    return activeStorageAdapter;
}
