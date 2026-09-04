import fs from "fs";
import path from "path";

const rootDir = path.resolve("src");

function getAllFiles(dir: string, exts = [".ts", ".tsx"]): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath, exts));
        } else if (exts.some(ext => file.endsWith(ext))) {
            results.push(fullPath);
        }
    }
    return results;
}

const allSrcFiles = getAllFiles(rootDir);
const allFileContents = new Map<string, string>();
for (const f of allSrcFiles) {
    allFileContents.set(f, fs.readFileSync(f, "utf8"));
}

console.log(`📁 Loaded ${allSrcFiles.length} source files for comprehensive audit.\n`);

// ─── 1. CHECK UNUSED COMPONENTS ───
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("1. AUDITING COMPONENTS IN src/components/");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const componentFiles = getAllFiles(path.join(rootDir, "components"), [".tsx", ".ts"]);
const unusedComponents: { file: string; baseName: string }[] = [];

for (const compFile of componentFiles) {
    const baseName = path.basename(compFile, path.extname(compFile));
    if (baseName === "index") continue;
    
    // Check if imported by name or path anywhere else
    let importCount = 0;
    const relImportPattern1 = baseName;
    const relImportPattern2 = path.basename(compFile);

    for (const [srcFile, content] of allFileContents.entries()) {
        if (srcFile === compFile) continue;
        if (content.includes(baseName)) {
            importCount++;
        }
    }

    if (importCount === 0) {
        unusedComponents.push({
            file: path.relative(rootDir, compFile),
            baseName,
        });
    }
}

console.log(`Found ${unusedComponents.length} potentially unused components:`);
unusedComponents.forEach(c => console.log(`  - [UNUSED COMPONENT] ${c.file} (${c.baseName})`));

// ─── 2. CHECK UNUSED LIB MODULES ───
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("2. AUDITING UTILITIES & SERVICES IN src/lib/");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const libFiles = getAllFiles(path.join(rootDir, "lib"), [".ts", ".tsx"]);
const unusedLibs: { file: string; baseName: string }[] = [];

for (const libFile of libFiles) {
    const baseName = path.basename(libFile, path.extname(libFile));
    if (baseName === "index" || baseName === "schema" || baseName === "db") continue;

    let importCount = 0;
    for (const [srcFile, content] of allFileContents.entries()) {
        if (srcFile === libFile) continue;
        // Search for import ... from "@/lib/..." or "./..."
        if (content.includes(baseName)) {
            importCount++;
        }
    }

    if (importCount === 0) {
        unusedLibs.push({
            file: path.relative(rootDir, libFile),
            baseName,
        });
    }
}

console.log(`Found ${unusedLibs.length} potentially unused lib files:`);
unusedLibs.forEach(l => console.log(`  - [UNUSED LIB] ${l.file}`));

// ─── 3. CHECK API ROUTES USAGE ───
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("3. AUDITING API ROUTES IN src/app/api/");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const apiRouteFiles = getAllFiles(path.join(rootDir, "app", "api"), [".ts"]);
const unusedApiRoutes: string[] = [];

for (const apiFile of apiRouteFiles) {
    const relPath = path.relative(path.join(rootDir, "app"), apiFile).replace(/\\/g, "/");
    // e.g. "api/admin/analytics/route.ts" -> "/api/admin/analytics"
    const endpoint = "/" + relPath.replace(/\/route\.ts$/, "");
    // Also dynamic parts like [id]
    const baseEndpoint = endpoint.split("[")[0].replace(/\/$/, "");

    let callCount = 0;
    for (const [srcFile, content] of allFileContents.entries()) {
        if (srcFile === apiFile) continue;
        if (content.includes(baseEndpoint)) {
            callCount++;
        }
    }

    if (callCount === 0) {
        unusedApiRoutes.push(endpoint);
    }
}

console.log(`Found ${unusedApiRoutes.length} API routes with zero direct frontend callers:`);
unusedApiRoutes.forEach(r => console.log(`  - [ORPHAN / EXTERNAL API] ${r}`));

// ─── 4. CHECK FRONTEND FETCH CALLS FOR BROKEN API ENDPOINTS ───
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("4. CHECKING FRONTEND FETCH CALLS FOR 404/BROKEN ENDPOINTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const brokenFetchCalls: { file: string; endpoint: string; line: number }[] = [];

// Regex to find fetch(`/api/...`) or fetch("/api/...")
const fetchRegex = /fetch\s*\(\s*[`"'](\/api\/[^`"'$?]+)/g;

for (const [srcFile, content] of allFileContents.entries()) {
    if (srcFile.includes(path.join("app", "api"))) continue; // skip API routes themselves
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        let match;
        const lineContent = lines[i];
        const regex = /fetch\s*\(\s*[`"'](\/api\/[^`"'?]+)/g;
        while ((match = regex.exec(lineContent)) !== null) {
            const endpoint = match[1];
            // Check if corresponding route.ts exists
            // Replace dynamic segments like /api/products/123 with [id] or [slug]
            const cleanPath = endpoint.replace(/^\/api\//, "");
            const parts = cleanPath.split("/").filter(Boolean);
            
            // Try resolving in src/app/api
            let currentDir = path.join(rootDir, "app", "api");
            let resolved = true;
            for (const part of parts) {
                if (part.includes("${") || part.includes("`") || part.includes("+")) {
                    // dynamic variable inside template string, allow match with any [slug] / [id]
                    const entries = fs.existsSync(currentDir) ? fs.readdirSync(currentDir) : [];
                    const dynamicFolder = entries.find(e => e.startsWith("[") && e.endsWith("]"));
                    if (dynamicFolder) {
                        currentDir = path.join(currentDir, dynamicFolder);
                    } else {
                        resolved = false;
                        break;
                    }
                } else {
                    const directPath = path.join(currentDir, part);
                    if (fs.existsSync(directPath)) {
                        currentDir = directPath;
                    } else {
                        // check dynamic folder fallback
                        const entries = fs.existsSync(currentDir) ? fs.readdirSync(currentDir) : [];
                        const dynamicFolder = entries.find(e => e.startsWith("[") && e.endsWith("]"));
                        if (dynamicFolder) {
                            currentDir = path.join(currentDir, dynamicFolder);
                        } else {
                            resolved = false;
                            break;
                        }
                    }
                }
            }

            if (!resolved || !fs.existsSync(path.join(currentDir, "route.ts"))) {
                brokenFetchCalls.push({
                    file: path.relative(rootDir, srcFile),
                    endpoint,
                    line: i + 1,
                });
            }
        }
    }
}

console.log(`Checked frontend fetch calls. Found ${brokenFetchCalls.length} suspicious/unresolved endpoints:`);
brokenFetchCalls.forEach(b => console.log(`  - [SUSPICIOUS FETCH] ${b.file}:${b.line} -> ${b.endpoint}`));

// ─── 5. CHECK UNUSED DATABASE TABLES ───
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("5. AUDITING DATABASE SCHEMA TABLES IN src/lib/db/schema.ts");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const schemaContent = fs.readFileSync(path.join(rootDir, "lib", "db", "schema.ts"), "utf8");
const tableMatches = [...schemaContent.matchAll(/export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*pgTable\(/g)];
const unusedTables: string[] = [];

for (const match of tableMatches) {
    const tableName = match[1];
    let usageCount = 0;
    for (const [srcFile, content] of allFileContents.entries()) {
        if (srcFile.endsWith("schema.ts")) continue;
        if (content.includes(tableName)) {
            usageCount++;
        }
    }
    if (usageCount === 0) {
        unusedTables.push(tableName);
    }
}

console.log(`Found ${tableMatches.length} total tables. ${unusedTables.length} tables have ZERO references outside schema.ts:`);
unusedTables.forEach(t => console.log(`  - [UNUSED DB TABLE] ${t}`));

// ─── 6. CHECK FOR RUNTIME EXCEPTION PATTERNS / BUGS ───
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("6. SCANNING FOR COMMON REACT / NEXT.JS BUGS & RUNTIME HAZARDS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const bugFindings: { file: string; line: number; issue: string }[] = [];

for (const [srcFile, content] of allFileContents.entries()) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for missing key prop inside .map(
        if (line.includes(".map(") && !line.includes("key=") && lines[i + 1] && !lines[i + 1].includes("key=")) {
            // potential key warning
        }

        // Check for window/localStorage usage without checking typeof window !== 'undefined'
        if ((line.includes("localStorage.") || line.includes("window.")) && !content.includes('"use client"') && !line.includes("typeof window")) {
            bugFindings.push({
                file: path.relative(rootDir, srcFile),
                line: i + 1,
                issue: "window / localStorage referenced in server component without typeof window check",
            });
        }

        // Check for useParams or router in Server Component
        if ((line.includes("useRouter()") || line.includes("useParams()")) && !content.includes('"use client"')) {
            bugFindings.push({
                file: path.relative(rootDir, srcFile),
                line: i + 1,
                issue: "Client hook used without 'use client' directive",
            });
        }

        // Check for async params without await in Next.js 15+ Server Components
        if (line.includes("params:") && line.includes("Promise<") && content.includes("export default") && !content.includes("await") && !content.includes("use(")) {
            bugFindings.push({
                file: path.relative(rootDir, srcFile),
                line: i + 1,
                issue: "Promise params declared in page but never awaited or unwrapped with use()",
            });
        }
    }
}

console.log(`Found ${bugFindings.length} runtime hazards:`);
bugFindings.forEach(b => console.log(`  - [HAZARD] ${b.file}:${b.line}: ${b.issue}`));

console.log("\n✅ AUDIT COMPLETE!");
