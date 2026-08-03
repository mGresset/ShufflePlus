import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const version = (await readFile(path.join(root, "VERSION"), "utf8")).trim();
const required = [
    "index.html",
    "style.css",
    "design-system.css",
    "styles/feature-search.css",
    "styles/feature-settings.css",
    "styles/feature-driving.css",
    "app.js",
    "service-worker.js",
    "manifest.webmanifest",
    "core/app-menu.js",
    "core/experience-mode.js",
    "core/server-sync-recovery.js",
    "core/platform.js",
    "core/spotify-app-config.js",
    "core/html-utils.js",
    "core/spotify-device.js",
    "core/playback-queue.js",
    "core/playback-clock.js",
    "core/queue-continuity.js",
    "core/release-readiness.js",
    "core/style-loader.js",
    "core/feature-assets.js",
    "core/session-recovery.js",
    `startup-recovery-${version}.js`,
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
    !index.includes(`style.css?v=${version}`) ||
    !index.includes(`design-system.css?v=${version}`) ||
    !index.includes(`startup-recovery-${version}.js`)
) {
    console.error("Le build ne référence pas les ressources de la version courante.");
    process.exit(1);
}

console.log(`Build vérifié : Shuffle+ ${version}.`);
