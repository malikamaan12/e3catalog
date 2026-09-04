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

// Gather all existing page routes
const existingPages = getAllFiles(path.join(rootDir, "app"), [".tsx", ".js"])
    .filter(f => f.endsWith("page.tsx") || f.endsWith("page.js"))
    .map(f => {
        const rel = path.relative(path.join(rootDir, "app"), path.dirname(f)).replace(/\\/g, "/");
        return "/" + rel;
    })
    .map(p => p === "/." ? "/" : p);

console.log(`Registered Page Routes: ${existingPages.length}`);

function doesPageMatch(calledPath: string): boolean {
    if (calledPath === "/" || calledPath === "") return true;
    if (calledPath.startsWith("#") || calledPath.startsWith("http://") || calledPath.startsWith("https://") || calledPath.startsWith("mailto:") || calledPath.startsWith("tel:")) return true;

    // Strip query strings and hash
    const cleanCalled = calledPath.split("?")[0].split("#")[0].replace(/\/$/, "");
    const calledParts = cleanCalled.split("/").filter(Boolean);

    for (const p of existingPages) {
        const pageParts = p.split("/").filter(Boolean);
        if (pageParts.length !== calledParts.length) continue;

        let match = true;
        for (let i = 0; i < pageParts.length; i++) {
            if (pageParts[i].startsWith("[") && pageParts[i].endsWith("]")) {
                continue;
            }
            if (pageParts[i] !== calledParts[i]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }
    return false;
}

const brokenLinks: any[] = [];

for (const file of frontendFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match href="..." or href={`...`}
        const hrefMatches = line.matchAll(/href\s*=\s*(?:["']([^"']+)["']|{`([^`]+)`})/g);
        for (const m of hrefMatches) {
            const rawHref = m[1] || m[2];
            if (!rawHref || rawHref.startsWith("/api/") || rawHref.startsWith("http") || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) continue;

            const mocked = rawHref.replace(/\$\{[^}]+\}/g, "placeholder");
            if (!doesPageMatch(mocked)) {
                brokenLinks.push({
                    file: path.relative(rootDir, file),
                    line: i + 1,
                    rawHref,
                    mocked,
                });
            }
        }

        // Match router.push(...)
        const pushMatches = line.matchAll(/router\.push\s*\(\s*(?:["']([^"']+)["']|{?`([^`]+)`}?)\s*\)/g);
        for (const m of pushMatches) {
            const rawPush = m[1] || m[2];
            if (!rawPush || rawPush.startsWith("/api/") || rawPush.startsWith("http")) continue;

            const mocked = rawPush.replace(/\$\{[^}]+\}/g, "placeholder");
            if (!doesPageMatch(mocked)) {
                brokenLinks.push({
                    file: path.relative(rootDir, file),
                    line: i + 1,
                    rawHref: rawPush,
                    mocked,
                });
            }
        }
    }
}

console.log(`Potentially Broken / 404 Page Links: ${brokenLinks.length}`);
brokenLinks.forEach(b => console.log(`  ❌ ${b.file}:${b.line} -> ${b.rawHref} (Mocked: ${b.mocked})`));
