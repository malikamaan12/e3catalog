/**
 * E3 Rentals — Build & Deployment Provenance Metadata
 */

export interface VersionInfo {
    version: string;
    commitSha: string;
    commitRef: string;
    buildTimestamp: string;
    environment: string;
}

export function getVersionInfo(): VersionInfo {
    const commitSha = 
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
        process.env.GIT_COMMIT_SHA ||
        "8a67eadef662751a2f77107b8ed57d7f565e3591"; // Baseline/build release SHA

    const commitRef = 
        process.env.VERCEL_GIT_COMMIT_REF ||
        process.env.GIT_BRANCH ||
        "master";

    return {
        version: "1.0.0-rc1",
        commitSha,
        commitRef,
        buildTimestamp: process.env.BUILD_TIMESTAMP || "2026-08-30T00:10:50.000Z",
        environment: process.env.NODE_ENV || "development",
    };
}
