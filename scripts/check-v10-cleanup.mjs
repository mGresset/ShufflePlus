import { readFile } from "node:fs/promises";
import process from "node:process";

const failures = [];
const version = (await readFile("VERSION", "utf8")).trim();
const app = await readFile("app.js", "utf8");
const index = await readFile("index.html", "utf8");
const style = await readFile("style.css", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const serviceWorker = await readFile("service-worker.js", "utf8");

function fail(message) {
    failures.push(message);
}

if (version !== "10.1.1") {
    fail(`La release V10 doit annoncer 10.1.1, pas ${version}.`);
}

if (!index.includes('name="shuffleplus-release-channel" content="stable"')) {
    fail("Le canal de release V10 doit être stable.");
}

const forbiddenUiMarkers = [
    "Shuffle+ v6",
    "Shuffle+ 8",
    "Shuffle+ 8.1",
    "Expérience Shuffle+ 8",
    "v4.9 ·",
    "v4.7 ·",
    "v5.5 ·",
    "v5.6",
    ">v4.0<",
    ">v3.0<",
    ">v5.2<",
    "Assistant vocal 6.1"
];

for (const marker of forbiddenUiMarkers) {
    if (app.includes(marker)) {
        fail(`Ancien libellé visible encore présent dans app.js : ${marker}`);
    }
}

if (app.includes("renderV8WelcomePanel") || style.includes(".v8-welcome")) {
    fail("Le panneau d’accueil historique V8 n’a pas été entièrement supprimé.");
}

if (app.includes("renderV9HomePanel")) {
    fail("Le rendu d’accueil porte encore un nom de version historique.");
}

for (const modulePath of [
    "./core/experience-mode-ui.js",
    "./core/release-readiness-ui.js"
]) {
    if (!serviceWorker.includes(modulePath)) {
        fail(`Module V10 absent du shell PWA : ${modulePath}`);
    }
}

if (!app.includes("function renderHomePanel()")) {
    fail("Le rendu d’accueil V10 neutre est absent.");
}

const checkScript = String(packageJson.scripts?.check || "");
if (!checkScript.includes("check-v10-cleanup.mjs")) {
    fail("Le garde-fou V10 n’est pas branché à npm run check.");
}

if (failures.length) {
    console.error("Nettoyage V10 incomplet :");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Nettoyage V10 validé : aucun reliquat d’interface historique critique.");
