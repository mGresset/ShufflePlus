import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const version = (await readFile(path.join(root, "VERSION"), "utf8")).trim();
const required = [
    "index.html",
    "style.css",
    "app.js",
    "service-worker.js",
    "manifest.webmanifest",
    "core/app-menu.js",
    "core/html-utils.js",
    "core/spotify-device.js",
    "core/playback-queue.js",
    "icons/icon-192.png",
    ".nojekyll"
];

for (const file of required) {
    try {
        await access(path.join(dist, file));
    } catch {
        console.error(`Fichier absent du build : dist/${file}`);
        process.exit(1);
    }
}

const index = await readFile(path.join(dist, "index.html"), "utf8");
if (
    !index.includes(`app.js?v=${version}`) ||
    !index.includes(`style.css?v=${version}`)
) {
    console.error("Le build ne référence pas les ressources de la version courante.");
    process.exit(1);
}

console.log(`Build vérifié : Shuffle+ ${version}.`);
