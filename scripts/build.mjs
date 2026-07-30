import {
    cp,
    mkdir,
    readdir,
    rm,
    writeFile
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const destination = path.join(root, "dist");

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const rootFiles = await readdir(root, { withFileTypes: true });
const staticFiles = new Set([
    "index.html",
    "style.css",
    "manifest.webmanifest",
    "favicon.ico"
]);

for (const entry of rootFiles) {
    if (!entry.isFile()) {
        continue;
    }

    if (entry.name.endsWith(".js") || staticFiles.has(entry.name)) {
        await cp(
            path.join(root, entry.name),
            path.join(destination, entry.name)
        );
    }
}

await cp(
    path.join(root, "icons"),
    path.join(destination, "icons"),
    { recursive: true }
);

await writeFile(path.join(destination, ".nojekyll"), "");

console.log("Build GitHub Pages créé dans dist/.");
