import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const entryPoints = ["app.js"];
const visited = new Set();
const missing = [];

function getRelativeImports(source) {
    const matches = source.matchAll(
        /(?:from\s+|import\s*\()(["'])(\.\.?\/[^"']+)\1/g
    );
    return [...matches].map((match) => match[2]);
}

async function visit(relativeFile) {
    const normalized = relativeFile.replaceAll("\\", "/");
    if (visited.has(normalized)) {
        return;
    }
    visited.add(normalized);

    const absolute = path.resolve(root, normalized);
    let source;
    try {
        source = await readFile(absolute, "utf8");
    } catch {
        missing.push(normalized);
        return;
    }

    for (const specifier of getRelativeImports(source)) {
        const resolved = path.resolve(path.dirname(absolute), specifier);
        let candidate = resolved;
        if (!path.extname(candidate)) {
            candidate += ".js";
        }
        const child = path.relative(root, candidate).replaceAll("\\", "/");
        try {
            await access(candidate);
            await visit(child);
        } catch {
            missing.push(`${normalized} → ${specifier}`);
        }
    }
}

for (const entry of entryPoints) {
    await visit(entry);
}

if (missing.length) {
    console.error("Imports relatifs manquants :");
    for (const item of missing) {
        console.error(`- ${item}`);
    }
    process.exit(1);
}

console.log(
    `Graphe des modules valide : ${visited.size} fichier(s) relié(s) à app.js.`
);
