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

const frontendFiles = [
    ...getAllFiles(path.join(rootDir, "app")),
    ...getAllFiles(path.join(rootDir, "components")),
].filter(f => !f.includes(path.join("app", "api")));

const existingRoutes = getAllFiles(path.join(rootDir, "app", "api"), [".ts", ".js"])
    .map(f => {
        const rel = path.relative(path.join(rootDir, "app", "api"), path.dirname(f)).replace(/\\/g, "/");
        return "/api" + (rel ? "/" + rel : "");
    });

console.log(`Registered API Route Endpoints: ${existingRoutes.length}`);

function doesRouteMatch(calledPath: string): boolean {
    // Strip query strings
    const cleanCalled = calledPath.split("?")[0].replace(/\/$/, "");
    const calledParts = cleanCalled.split("/").filter(Boolean);

    for (const r of existingRoutes) {
        const routeParts = r.split("/").filter(Boolean);
        if (routeParts.length !== calledParts.length) continue;

        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith("[") && routeParts[i].endsWith("]")) {
                // dynamic segment matches anything
                continue;
            }
            if (routeParts[i] !== calledParts[i]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }
    return false;
}

const suspicious: any[] = [];

for (const file of frontendFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = line.matchAll(/fetch\s*\(\s*[`"']([^`"']+)[`"']/g);
        for (const m of matches) {
            const rawUrl = m[1];
            if (!rawUrl.startsWith("/api/")) continue;

            // Check if static or has template expressions
            if (!rawUrl.includes("${")) {
                if (!doesRouteMatch(rawUrl)) {
                    suspicious.push({
                        file: path.relative(rootDir, file),
                        line: i + 1,
                        rawUrl,
                        type: "static",
                    });
                }
            } else {
                // Template literal: replace ${...} with a dummy ID like "dummy_id"
                const mocked = rawUrl.replace(/\$\{[^}]+\}/g, "placeholder");
                if (!doesRouteMatch(mocked)) {
                    suspicious.push({
                        file: path.relative(rootDir, file),
                        line: i + 1,
                        rawUrl,
                        mocked,
                        type: "dynamic",
                    });
                }
            }
        }
    }
}

console.log(`Suspicious / Unmatched API calls: ${suspicious.length}`);
suspicious.forEach(s => {
    console.log(`  ❌ ${s.file}:${s.line} -> ${s.rawUrl} (${s.mocked || ""})`);
});
