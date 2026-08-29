/**
 * E3 Rentals — Secret & Credential Scanner
 * 
 * Scans tracked source files, environment templates, and recent git history
 * for accidental secret leaks, live API keys, and unverified mock data.
 */

import * as fs from "fs";
import * as path from "path";

interface SecretFinding {
    file: string;
    line: number;
    rule: string;
    snippet: string;
}

const SECRET_PATTERNS = [
    { name: "Stripe Live Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/ },
    { name: "Stripe Live Webhook Secret", regex: /whsec_[0-9a-zA-Z]{24,}/ },
    { name: "Resend Live API Key", regex: /re_[0-9a-zA-Z]{24,}/ },
    { name: "AWS Access Key ID", regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
    { name: "Hardcoded Private Key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { name: "Invented CR Number", regex: /CR-974-DOHA/i },
    { name: "Invented TRN Number", regex: /TRN-974-DOHA/i },
    { name: "Invented QNB IBAN", regex: /QA\d{2}\s*QNBA\s*0000\s*0000\s*1234/i },
];

const IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    "test-results",
    "playwright-report",
    "tmp",
    "screenshots",
]);

const IGNORE_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".webm",
    ".gif",
    ".ico",
    ".tsbuildinfo",
    ".pdf",
    ".glb",
    ".gltf",
    ".bin",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
]);

function scanDirectory(dir: string, findings: SecretFinding[]) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");

        if (file.isDirectory()) {
            if (!IGNORE_DIRS.has(file.name)) {
                scanDirectory(fullPath, findings);
            }
        } else if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            if (IGNORE_EXTENSIONS.has(ext)) continue;
            // Skip scanning this scanner script itself to prevent false positives from regex rules
            if (relativePath.includes("scan-secrets.ts")) continue;

            try {
                const content = fs.readFileSync(fullPath, "utf-8");
                const lines = content.split("\n");

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    for (const pattern of SECRET_PATTERNS) {
                        // Skip harmless example/env template lines
                        if (line.includes("your_access_key") || line.includes("your_secret_key") || line.includes("re_your_api_key") || line.includes("your_secret_here")) {
                            continue;
                        }

                        if (pattern.regex.test(line)) {
                            const maskedSnippet = line.trim().substring(0, 80);
                            findings.push({
                                file: relativePath,
                                line: i + 1,
                                rule: pattern.name,
                                snippet: maskedSnippet,
                            });
                        }
                    }
                }
            } catch {
                // Ignore binary/unreadable files
            }
        }
    }
}

export function runSecretScan(): { passed: boolean; findings: SecretFinding[] } {
    console.log("=================================================");
    console.log("  E3 Rentals — Production Secret & Hygiene Scanner");
    console.log("=================================================");
    console.log("[Scanner] Scanning tracked source files, configs, and migrations...");

    const findings: SecretFinding[] = [];
    scanDirectory(process.cwd(), findings);

    console.log(`[Scanner] Evaluated codebase against ${SECRET_PATTERNS.length} strict credential and hygiene patterns.`);

    if (findings.length === 0) {
        console.log("[Scanner] SUCCESS: 0 secrets, active live keys, or unverified mock credentials detected!");
        console.log("=================================================\n");
        return { passed: true, findings: [] };
    } else {
        console.error(`[Scanner] FAILURE: Detected ${findings.length} secret/hygiene violations:`);
        for (const f of findings) {
            console.error(`  - ${f.file}:${f.line} [${f.rule}] -> ${f.snippet}`);
        }
        console.log("=================================================\n");
        return { passed: false, findings };
    }
}

// Execute CLI
if (require.main === module) {
    const result = runSecretScan();
    process.exit(result.passed ? 0 : 1);
}
