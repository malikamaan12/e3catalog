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

const allFiles = getAllFiles(rootDir);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const dependencies = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {}), "react", "react-dom", "next"]);

const brokenImports: { file: string; line: number; importPath: string; reason: string }[] = [];

// Regular expression to match imports
const importRegex = /(?:import|export\s+(?:\{[^}]+\}|\*))\s+from\s+['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        
        while ((match = importRegex.exec(line)) !== null || (match = dynamicImportRegex.exec(line)) !== null) {
            const imp = match[1];
            if (!imp) continue;

            // Check if standard node module
            if (!imp.startsWith(".") && !imp.startsWith("@/")) {
                const basePkg = imp.startsWith("@") ? imp.split("/").slice(0, 2).join("/") : imp.split("/")[0];
                if (!dependencies.has(basePkg) && !["path", "fs", "crypto", "http", "https", "stream", "url", "util", "os", "events"].includes(basePkg)) {
                    brokenImports.push({
                        file: path.relative(rootDir, file),
                        line: i + 1,
                        importPath: imp,
                        reason: `Package '${basePkg}' not in package.json`,
                    });
                }
                continue;
            }

            // Resolve file path
            let targetPath = "";
            if (imp.startsWith("@/")) {
                targetPath = path.join(rootDir, imp.slice(2));
            } else {
                targetPath = path.resolve(path.dirname(file), imp);
            }

            // Check if file exists with .ts, .tsx, /index.ts, /index.tsx, .json, or as is
            const candidates = [
                targetPath,
                targetPath + ".ts",
                targetPath + ".tsx",
                targetPath + ".js",
                targetPath + ".jsx",
                targetPath + ".json",
                path.join(targetPath, "index.ts"),
                path.join(targetPath, "index.tsx"),
            ];

            const exists = candidates.some(c => fs.existsSync(c));
            if (!exists) {
                brokenImports.push({
                    file: path.relative(rootDir, file),
                    line: i + 1,
                    importPath: imp,
                    reason: `Resolved path does not exist: ${targetPath}`,
                });
            }
        }
    }
}

console.log(`Scan Complete across ${allFiles.length} files.`);
console.log(`Broken / Unresolved imports found: ${brokenImports.length}`);
brokenImports.forEach(b => console.log(`  ❌ [BROKEN IMPORT] ${b.file}:${b.line} -> "${b.importPath}" (${b.reason})`));

// ─── CHECK ROUTE AND PAGE HANDLERS ───
const brokenRoutes: string[] = [];
for (const file of allFiles) {
    if (file.endsWith("route.ts") || file.endsWith("route.js")) {
        const content = fs.readFileSync(file, "utf8");
        const hasHandler = /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/.test(content);
        if (!hasHandler) {
            brokenRoutes.push(`Route without HTTP handler: ${path.relative(rootDir, file)}`);
        }
    }
    if (file.endsWith("page.tsx") || file.endsWith("page.jsx")) {
        const content = fs.readFileSync(file, "utf8");
        const hasDefault = /export\s+default\s+(function|class|const|async\s+function)/.test(content) || /export\s*\{\s*\w+\s+as\s+default\s*\}/.test(content);
        if (!hasDefault) {
            brokenRoutes.push(`Page without default export: ${path.relative(rootDir, file)}`);
        }
    }
}

console.log(`Broken Routes / Pages: ${brokenRoutes.length}`);
brokenRoutes.forEach(r => console.log(`  ❌ ${r}`));
