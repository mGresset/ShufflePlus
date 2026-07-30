import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([
    ".git",
    "dist",
    "node_modules"
]);

async function collectJavaScriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (ignoredDirectories.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...await collectJavaScriptFiles(fullPath));
        } else if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

const files = await collectJavaScriptFiles(root);
let failed = false;

for (const file of files) {
    const result = spawnSync(
        process.execPath,
        ["--check", file],
        { encoding: "utf8" }
    );

    if (result.status !== 0) {
        failed = true;
        console.error(`\nErreur de syntaxe : ${path.relative(root, file)}`);
        console.error(result.stderr || result.stdout);
    }
}

if (failed) {
    process.exit(1);
}

console.log(`Syntaxe JavaScript valide : ${files.length} fichier(s).`);
