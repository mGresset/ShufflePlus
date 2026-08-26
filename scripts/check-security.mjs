import { readFile } from "node:fs/promises";
import process from "node:process";

import {
    SHUFFLEPLUS_CSP,
    getSecurityPolicyDiagnostics
} from "../core/security-policy.js";

const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");

const cspMatch = indexSource.match(
    /http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/i
);

if (!cspMatch) {
    console.error("Politique CSP absente de index.html.");
    process.exit(1);
}

const normalizedActual = cspMatch[1].replace(/\s+/g, " ").trim();
const normalizedExpected = SHUFFLEPLUS_CSP.replace(/\s+/g, " ").trim();

if (normalizedActual !== normalizedExpected) {
    console.error("La politique CSP de index.html ne correspond pas à la politique active.");
    process.exit(1);
}

const diagnostics = getSecurityPolicyDiagnostics(normalizedActual);
if (!diagnostics.valid || diagnostics.allowsEval || diagnostics.allowsInlineScripts) {
    console.error("La politique CSP autorise une source de script dangereuse.", diagnostics);
    process.exit(1);
}

if (/connect-src\s+[^;]*\shttps:(?:\s|;)/.test(normalizedActual)) {
    console.error("La politique CSP autorise encore toutes les destinations HTTPS dans connect-src.");
    process.exit(1);
}

for (const requiredConnectSource of [
    "https://accounts.spotify.com",
    "https://api.spotify.com",
    "https://*.up.railway.app"
]) {
    if (!normalizedActual.includes(requiredConnectSource)) {
        console.error(`Source connect-src requise absente : ${requiredConnectSource}`);
        process.exit(1);
    }
}

if (/\son[a-z]+\s*=/i.test(indexSource)) {
    console.error("Un gestionnaire d’événement HTML inline est présent dans index.html.");
    process.exit(1);
}

if (/\b(?:eval|Function)\s*\(/.test(appSource)) {
    console.error("Une construction JavaScript dynamique interdite est présente dans app.js.");
    process.exit(1);
}

if (/window\.open\s*\(/.test(appSource)) {
    console.error("app.js ouvre encore une URL externe sans le module de sécurité.");
    process.exit(1);
}

console.log(
    `Sécurité statique valide : ${diagnostics.directiveCount} directives CSP.`
);
