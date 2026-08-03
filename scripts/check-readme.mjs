import { readFile } from "node:fs/promises";
import process from "node:process";

const readme = await readFile("README.md", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();
const requiredHeadings = [
    "# Shuffle+",
    "## Fonctions principales",
    "## Configuration de Spotify",
    "## Navigation détaillée",
    "## Développement local",
    "## Build et déploiement",
    "## Dépannage"
];

const failures = [];

if (readme.length < 10000 || readme.split(/\r?\n/).length < 250) {
    failures.push("README.md est trop court pour constituer la documentation complète.");
}

if (!readme.includes(`v${version}`)) {
    failures.push(`README.md ne mentionne pas la version active ${version}.`);
}

for (const heading of requiredHeadings) {
    if (!readme.includes(heading)) {
        failures.push(`Section obligatoire absente : ${heading}`);
    }
}

if (failures.length) {
    console.error("Documentation README invalide :");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(
    `README complet validé : ${readme.split(/\r?\n/).length} lignes, ` +
    `${readme.length} caractères.`
);
