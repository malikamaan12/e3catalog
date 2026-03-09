import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// This file configures the S3 client to work with AWS S3, Cloudflare R2, MinIO, or Wasabi

const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
const region = process.env.S3_REGION || "auto";
const endpoint = process.env.S3_ENDPOINT; // Required for Cloudflare R2, MinIO, Wasabi

export const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
    ...(endpoint ? { endpoint } : {}),
    // Required for Cloudflare R2: disable checksum headers that R2 doesn't support
    requestChecksumCalculation: "WHEN_REQUIRED" as any,
    responseChecksumValidation: "WHEN_REQUIRED" as any,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "rental-app-media";

/**
 * Generate a pre-signed URL for client-side direct-to-S3 uploads
 * @param key The unique file name/path in the bucket
 * @param contentType The MIME type of the file being uploaded
 * @param expiresIn Seconds until the URL expires (default: 3600 / 1 hour)
 */
export async function generatePresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return { url, key, error: null };
    } catch (error) {
        console.error("Error generating pre-signed URL:", error);
        return { url: null, key: null, error: "Failed to generate upload URL" };
    }
}

/**
 * Delete a media object from the S3 bucket
 * @param key The unique file name/path in the bucket
 */
export async function deleteS3Object(key: string) {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    try {
        await s3Client.send(command);
        return { success: true, error: null };
    } catch (error) {
        console.error("Error deleting object from S3:", error);
        return { success: false, error: "Failed to delete file from storage" };
    }
}

/**
 * Formats a key based on bucket settings to return the public CDN URL
 * @param key The file key in the bucket
 */
export function getPublicCDNUrl(key: string) {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
    if (cdnUrl) {
        // e.g., https://cdn.example.com/filename.jpg
        return `${cdnUrl.replace(/\/$/, '')}/${key}`;
    }
    // Fallback to direct bucket URL
    return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}
