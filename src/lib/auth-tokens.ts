/**
 * E3 Rentals — Authentication & Verification Token Manager
 * 
 * Generates high-entropy cryptographic tokens, stores SHA-256 digests in database,
 * and provides atomic validation & single-use consumption.
 */

import { db } from "./db";
import { authTokens } from "./db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import * as crypto from "crypto";
import { v4 as uuid } from "uuid";

export type AuthTokenType = "password_reset" | "email_verification" | "vendor_invitation";

export interface CreateTokenResult {
    rawToken: string;
    tokenId: string;
    expiresAt: Date;
}

export interface VerifyTokenResult {
    valid: boolean;
    userId?: string;
    metadata?: Record<string, any> | null;
    error?: string;
}

/**
 * Computes deterministic SHA-256 digest of a raw token.
 */
export function hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates and persists an authentication/verification token.
 * Returns the plaintext token (for delivery to user) while storing only the SHA-256 hash.
 */
export async function createAuthToken(
    userId: string,
    type: AuthTokenType,
    expiresInSeconds = 3600,
    metadata?: Record<string, any>
): Promise<CreateTokenResult> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const tokenId = uuid();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await db.insert(authTokens).values({
        id: tokenId,
        userId,
        type,
        tokenHash,
        expiresAt,
        usedAt: null,
        metadata: metadata || null,
        createdAt: new Date(),
    });

    return {
        rawToken,
        tokenId,
        expiresAt,
    };
}

/**
 * Verifies and atomically consumes a token.
 * Prevents replay attacks by marking usedAt upon first consumption.
 */
export async function verifyAndConsumeAuthToken(
    rawToken: string,
    type: AuthTokenType
): Promise<VerifyTokenResult> {
    if (!rawToken || typeof rawToken !== "string") {
        return { valid: false, error: "Token is required" };
    }

    const tokenHash = hashToken(rawToken.trim());
    const now = new Date();

    const [tokenRecord] = await db
        .select()
        .from(authTokens)
        .where(
            and(
                eq(authTokens.tokenHash, tokenHash),
                eq(authTokens.type, type),
                isNull(authTokens.usedAt),
                gt(authTokens.expiresAt, now)
            )
        )
        .limit(1);

    if (!tokenRecord) {
        return { valid: false, error: "Invalid, expired, or already used token" };
    }

    // Atomically consume token
    await db
        .update(authTokens)
        .set({ usedAt: now })
        .where(eq(authTokens.id, tokenRecord.id));

    return {
        valid: true,
        userId: tokenRecord.userId,
        metadata: tokenRecord.metadata as Record<string, any> | null,
    };
}
