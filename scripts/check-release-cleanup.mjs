import { readFile } from "node:fs/promises";
import process from "node:process";

const failures = [];
const version = (await readFile("VERSION", "utf8")).trim();
const app = await readFile("app.js", "utf8");
const index = await readFile("index.html", "utf8");
const style = await readFile("style.css", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const serviceWorker = await readFile("service-worker.js", "utf8");
const readinessUi = await readFile("core/release-readiness-ui.js", "utf8");
const readinessCore = await readFile("core/release-readiness.js", "utf8");

function fail(message) {
    failures.push(message);
}

if (version !== "11.0.0") {
    fail(`La release V11 doit annoncer 11.0.0, pas ${version}.`);
}

if (!index.includes('name="shuffleplus-release-channel" content="stable"')) {
    fail("Le canal de release doit rester stable.");
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
    "✨ Apparence V10",
    "Validation V10 mise à jour",
    "validations terrain de la V10"
];

for (const marker of forbiddenUiMarkers) {
    if (app.includes(marker)) {
        fail(`Ancien libellé visible encore présent dans app.js : ${marker}`);
    }
}

if (index.includes("· V10")) {
    fail("L’écran de connexion affiche encore un marqueur V10 actif.");
}

for (const marker of ["V10 · Validation terrain", "Exporter la validation V10", "V10 validée"]) {
    if (readinessUi.includes(marker) || readinessCore.includes(marker)) {
        fail(`Le Centre de validation contient encore un libellé de release figé : ${marker}`);
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
    "./core/experience-mode-controller.js",
    "./core/release-readiness-ui.js",
    "./core/dynamic-lyrics-sync.js",
    "./core/ios-shortcut-assistant.js",
    "./core/session-resume.js",
    "./core/backup-history.js"
]) {
    if (!serviceWorker.includes(modulePath)) {
        fail(`Module stable absent du shell PWA : ${modulePath}`);
    }
}

if (!app.includes("function renderHomePanel()")) {
    fail("Le rendu d’accueil neutre est absent.");
}

if (!app.includes("prepareExperienceModeTransition")) {
    fail("La transition Essentiel/Expert n’est pas extraite hors du noyau app.js.");
}

if (style.includes(".experience-mode-option")) {
    fail("Les styles Essentiel/Expert sont encore dans style.css au lieu du module Réglages.");
}

if (!app.includes("observeDynamicLyricsPlayback") || !app.includes("renderIosShortcutAssistantMarkup")) {
    fail("Les briques iPhone/Dynamic Lyrics ne sont pas reliées à l’application.");
}

if (!serviceWorker.includes("ROLLBACK_TO_PREVIOUS") || !serviceWorker.includes("META_CACHE")) {
    fail("Le Service Worker ne conserve pas le mécanisme de rollback PWA.");
}

if (!index.includes('./update-guard.js')) {
    fail("Le garde de démarrage PWA n’est pas chargé avant le bootstrap.");
}

const checkScript = String(packageJson.scripts?.check || "");
if (!checkScript.includes("check-release-cleanup.mjs")) {
    fail("Le garde-fou de nettoyage de release n’est pas branché à npm run check.");
}
if (checkScript.includes("check-v10-cleanup.mjs")) {
    fail("Le pipeline utilise encore le garde-fou nommé V10.");
}

if (failures.length) {
    console.error("Nettoyage de release incomplet :");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Nettoyage de release validé : aucun reliquat d’interface historique critique actif.");
