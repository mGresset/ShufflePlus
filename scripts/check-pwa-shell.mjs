import {
    access,
    readFile,
    stat
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const workerSource = await readFile("service-worker.js", "utf8");
const failures = [];

function fail(message) {
    failures.push(message);
}

function readShellArray(name) {
    const pattern = new RegExp(
        `const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`
    );
    const match = workerSource.match(pattern);
    if (!match) {
        fail(`Tableau ${name} absent du Service Worker.`);
        return [];
    }
    return [...match[1].matchAll(/"([^"\\]+)"/g)]
        .map((item) => item[1]);
}

function normalizeShellPath(url = "") {
    const clean = String(url).split(/[?#]/)[0];
    if (clean === "./" || clean === "/") {
        return "index.html";
    }
    return clean.replace(/^\.\//, "");
}

function getStaticImports(source = "") {
    const imports = new Set();
    const fromPattern = /(?:^|\n)\s*(?:import|export)\s+(?!\()([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
    const barePattern = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;

    for (const match of source.matchAll(fromPattern)) {
        if (match[2]?.startsWith(".")) {
            imports.add(match[2]);
        }
    }
    for (const match of source.matchAll(barePattern)) {
        if (match[1]?.startsWith(".")) {
            imports.add(match[1]);
        }
    }
    return [...imports];
}

async function collectStaticGraph(entryFile) {
    const visited = new Set();
    const pending = [entryFile];

    while (pending.length) {
        const current = pending.pop();
        if (!current || visited.has(current)) {
            continue;
        }
        visited.add(current);

        let source;
        try {
            source = await readFile(path.join(root, current), "utf8");
        } catch {
            fail(`Dépendance statique introuvable : ${current}`);
            continue;
        }

        const baseDirectory = path.dirname(current);
        for (const specifier of getStaticImports(source)) {
            const resolved = path
                .normalize(path.join(baseDirectory, specifier))
                .replaceAll("\\", "/")
                .replace(/^\.\//, "");
            pending.push(resolved);
        }
    }

    return visited;
}

const critical = readShellArray("CRITICAL_APP_SHELL");
const runtime = readShellArray("RUNTIME_APP_SHELL");
const optional = readShellArray("OPTIONAL_APP_SHELL");

if (critical.length > 16) {
    fail(`Le shell critique contient ${critical.length} ressources (maximum : 16).`);
}

const groups = new Map([
    ["critique", critical],
    ["runtime", runtime],
    ["optionnel", optional]
]);
const seen = new Map();
for (const [groupName, urls] of groups) {
    for (const url of urls) {
        const normalized = normalizeShellPath(url);
        if (seen.has(normalized)) {
            fail(
                `Ressource dupliquée entre les groupes PWA : ${normalized} ` +
                `(${seen.get(normalized)} / ${groupName}).`
            );
        } else {
            seen.set(normalized, groupName);
        }
    }
}

const requiredShellFiles = new Set(
    [...critical, ...runtime].map(normalizeShellPath)
);
const staticGraph = await collectStaticGraph("app.js");
staticGraph.delete("app.js");

for (const dependency of staticGraph) {
    if (!requiredShellFiles.has(dependency)) {
        fail(`Import statique absent du shell hors ligne : ${dependency}`);
    }
}

for (const required of [
    "index.html",
    "app.js",
    "auth.js",
    "config.js",
    "spotify-api.js",
    "storage.js"
]) {
    if (!requiredShellFiles.has(required)) {
        fail(`Ressource essentielle absente du shell PWA : ${required}`);
    }
}

for (const optionalOnly of [
    "app-health.js",
    "universal-search.js"
]) {
    if (!optional.map(normalizeShellPath).includes(optionalOnly)) {
        fail(`Module différé absent du shell optionnel : ${optionalOnly}`);
    }
    if (requiredShellFiles.has(optionalOnly)) {
        fail(`Module différé chargé trop tôt dans le shell essentiel : ${optionalOnly}`);
    }
}

const warmRuntimeIndex = workerSource.indexOf("await warmRuntimeShell();");
const claimIndex = workerSource.indexOf("await self.clients.claim();");
if (warmRuntimeIndex < 0 || claimIndex < 0 || warmRuntimeIndex > claimIndex) {
    fail("Le runtime PWA doit être préchauffé avant self.clients.claim().");
}

if (!workerSource.includes('event.data?.type === "GET_SHELL_STATUS"')) {
    fail("Le diagnostic GET_SHELL_STATUS est absent du Service Worker.");
}
if (!workerSource.includes("async function fetchShellAsset")) {
    fail("Le chargement PWA avec retry est absent.");
}
if (!workerSource.includes("retries: 2")) {
    fail("Le noyau critique n’utilise pas la politique de retry renforcée.");
}

for (const legacyFile of ["adaptive-config.js", "adaptive-dashboard.js"]) {
    try {
        await access(legacyFile);
        fail(`Module historique inutilisé encore présent : ${legacyFile}`);
    } catch {
        // attendu
    }
}

let criticalBytes = 0;
for (const url of critical) {
    const file = normalizeShellPath(url);
    try {
        criticalBytes += (await stat(file)).size;
    } catch {
        // "./" est normalisé vers index.html et les fichiers sont déjà vérifiés ailleurs.
    }
}

if (failures.length) {
    console.error("Architecture du shell PWA invalide :");
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
}

console.log(
    `Shell PWA valide : ${critical.length} critique(s), ` +
    `${runtime.length} runtime, ${optional.length} optionnelle(s), ` +
    `${staticGraph.size} dépendance(s) statique(s), ` +
    `${Math.round(criticalBytes / 1024)} Kio bruts critiques.`
);
