import {
    cp,
    mkdir,
    readdir,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const destination = path.join(root, "dist");
const appVersion = (await readFile(path.join(root, "VERSION"), "utf8")).trim();
const currentRecoveryFile = `startup-recovery-${appVersion}.js`;
const runtimeDirectories = ["core", "icons"];
const staticFiles = new Set([
    "index.html",
    "style.css",
    "design-system.css",
    "manifest.webmanifest",
    "favicon.ico"
]);

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const rootFiles = await readdir(root, { withFileTypes: true });

for (const entry of rootFiles) {
    if (!entry.isFile()) {
        continue;
    }

    if (
        /^startup-recovery-\d+\.\d+\.\d+\.js$/.test(entry.name) &&
        entry.name !== currentRecoveryFile
    ) {
        continue;
    }

    if (entry.name.endsWith(".js") || staticFiles.has(entry.name)) {
        await cp(
            path.join(root, entry.name),
            path.join(destination, entry.name)
        );
    }
}

for (const directory of runtimeDirectories) {
    await cp(
        path.join(root, directory),
        path.join(destination, directory),
        { recursive: true }
    );
}

await writeFile(path.join(destination, ".nojekyll"), "");

console.log("Build GitHub Pages créé dans dist/.");
