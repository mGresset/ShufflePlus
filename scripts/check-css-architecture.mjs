import { readFile, access } from "node:fs/promises";
import process from "node:process";

const required = [
    "styles/feature-home.css",
    "styles/feature-search.css",
    "styles/feature-settings.css",
    "styles/feature-driving.css",
    "core/style-loader.js",
    "core/feature-assets.js"
];

for (const file of required) {
    try {
        await access(file);
    } catch {
        console.error(`Ressource modulaire absente : ${file}`);
        process.exit(1);
    }
}

const [app, style, design, home, search, settings, driving, index] = await Promise.all([
    readFile("app.js", "utf8"),
    readFile("style.css", "utf8"),
    readFile("design-system.css", "utf8"),
    readFile("styles/feature-home.css", "utf8"),
    readFile("styles/feature-search.css", "utf8"),
    readFile("styles/feature-settings.css", "utf8"),
    readFile("styles/feature-driving.css", "utf8"),
    readFile("index.html", "utf8")
]);

const failures = [];
if (/from ["']\.\/universal-search\.js["']/.test(app)) {
    failures.push("universal-search.js est encore importé statiquement");
}
if (!/universalSearch:\s*\(\)\s*=>\s*import\(["']\.\/universal-search\.js["']\)/.test(app)) {
    failures.push("le chargement dynamique de la recherche est absent");
}
if (!app.includes('ensureMenuFeatureStyles(normalizedMenu)')) {
    failures.push("les styles de menu ne sont pas chargés avant la navigation");
}
if (style.includes("Shuffle+ v8.7.1 — Recherche compacte")) {
    failures.push("le bloc de recherche est encore dans style.css");
}
if (design.includes("Mode conduite v8.4 : progression")) {
    failures.push("le bloc conduite est encore dans design-system.css");
}
if (!home.includes(".v9-home-launch-button")) {
    failures.push("feature-home.css ne contient pas le lancement principal v9");
}
if (!search.includes(".app-menu-search-button")) {
    failures.push("feature-search.css ne contient pas la navigation de recherche");
}
if (!settings.includes(".pwa-capabilities > .pwa-capability")) {
    failures.push("feature-settings.css ne contient pas la correction PWA");
}

if (style.includes(".experience-mode-option")) {
    failures.push("les styles Essentiel/Expert sont encore dans style.css");
}
if (!settings.includes("Shuffle+ v10.3.0 — Expérience Essentiel / Expert")) {
    failures.push("feature-settings.css ne contient pas le contrat Essentiel/Expert v10.3.0");
}
if (!settings.includes(".experience-mode-option__content")) {
    failures.push("la structure lisible des cartes Essentiel/Expert est absente");
}
if (!driving.includes(".driving-playback-progress")) {
    failures.push("feature-driving.css ne contient pas l’interface de conduite");
}
if (!driving.includes("Shuffle+ v10.2.0 — contrat mobile conduite consolidé")) {
    failures.push("le contrat mobile conduite consolidé 10.2.0 est absent");
}
if (/Shuffle\+ v9\.9\.(?:30|33|34|39|41|42|45|47) —/.test(driving)) {
    failures.push("des couches CSS conduite historiques 9.9.30→9.9.47 sont encore actives");
}
if (/feature-(?:home|search|settings|driving)\.css/.test(index)) {
    failures.push("les styles de fonctionnalité sont encore chargés statiquement dans index.html");
}

if (failures.length) {
    console.error("Architecture CSS invalide :");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log("Architecture CSS modulaire valide : 4 feuilles chargées à la demande.");
