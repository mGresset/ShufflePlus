import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const version = (await readFile(path.join(root, "VERSION"), "utf8")).trim();
const failures = [];

function fail(message) {
    failures.push(message);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`VERSION invalide : ${version}`);
}

const requiredFiles = [
    "index.html",
    "app.js",
    `bootstrap-${version}.js`,
    "config.js",
    "service-worker.js",
    "update-guard.js",
    `startup-recovery-${version}.js`,
    "core/release-readiness.js",
    "core/storage-migrations.js",
    "core/reliability-center.js",
    "styles/feature-settings.css",
    "server/server.js",
    "server/test.js",
    "server/Dockerfile",
    "CHANGELOG.md",
    "DEPLOIEMENT.md",
    "GUIDE-RACCOURCI.md"
];

for (const relative of requiredFiles) {
    try {
        await access(path.join(root, relative));
    } catch {
        fail(`Fichier de finalisation absent : ${relative}`);
    }
}

const index = await readFile(path.join(root, "index.html"), "utf8");
const serviceWorker = await readFile(path.join(root, "service-worker.js"), "utf8");
const app = await readFile(path.join(root, "app.js"), "utf8");
const server = await readFile(path.join(root, "server/server.js"), "utf8");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const bootstrap = await readFile(path.join(root, `bootstrap-${version}.js`), "utf8");
const startupRecovery = await readFile(path.join(root, `startup-recovery-${version}.js`), "utf8");

const expectedTexts = [
    ["index.html", index, `shuffleplus-version\" content=\"${version}`],
    ["index.html", index, `startup-recovery-${version}.js`],
    ["index.html", index, `bootstrap-${version}.js`],
    ["index.html", index, 'name="shuffleplus-build-validated" content="true"'],
    ["index.html", index, 'name="shuffleplus-server-tests-validated" content="true"'],
    ["service-worker.js", serviceWorker, `shuffleplus-v${version}`],
    ["service-worker.js", serviceWorker, `./core/release-readiness.js`],
    ["service-worker.js", serviceWorker, `./update-guard.js`],
    ["index.html", index, `./update-guard.js`],
    ["app.js", app, `const APP_VERSION = "${version}"`],
    ["server/server.js", server, 'requestUrl.pathname === "/health"'],
    ["server/server.js", server, 'const VERSION = "5.2.0"'],
    ["server/server.js", server, "ensureLaunchResultReservation"],
    ["server/server.js", server, "tokenHash: sha256(token)"]
];

for (const [file, content, expected] of expectedTexts) {
    if (!content.includes(expected)) {
        fail(`${file} ne contient pas : ${expected}`);
    }
}

for (const [name, source] of [[`bootstrap-${version}.js`, bootstrap], [`startup-recovery-${version}.js`, startupRecovery]]) {
    if (!source.includes('registration.scope === shufflePlusScope')) {
        fail(`${name} ne limite pas la réparation PWA au scope exact.`);
    }
    if (source.includes('registration.scope.startsWith(window.location.origin)')) {
        fail(`${name} contient encore une suppression de Service Workers trop large.`);
    }
}

if (!String(packageJson.scripts?.check || "").includes("check-release-readiness.mjs")) {
    fail("Le contrôle de finalisation n’est pas inclus dans npm run check.");
}

const startupFiles = (await readdir(root))
    .filter((name) => /^startup-recovery-\d+\.\d+\.\d+\.js$/.test(name));
if (startupFiles.length !== 1 || startupFiles[0] !== `startup-recovery-${version}.js`) {
    fail(`Fichiers startup-recovery incohérents : ${startupFiles.join(", ") || "aucun"}`);
}

const declaredAssets = [...serviceWorker.matchAll(/"\.\/([^"?]+)(?:\?v=[^"]+)?"/g)]
    .map((match) => match[1])
    .filter((value) =>
        value &&
        value !== "" &&
        !value.startsWith("__shuffleplus_")
    );
for (const asset of new Set(declaredAssets)) {
    try {
        await access(path.join(root, asset));
    } catch {
        fail(`Ressource déclarée dans le Service Worker mais absente : ${asset}`);
    }
}

const rootEntries = await readdir(root);
const obsoleteReleaseDocs = rootEntries.filter((name) => (
    /^V\d+\.\d+\.\d+_NOTES\.md$/.test(name) ||
    /^DEPLOIEMENT-V\d+\.\d+\.\d+\.md$/.test(name) ||
    /^INSTALLATION-V\d+\.\d+\.\d+\.txt$/.test(name) ||
    /^PATCH_MANIFEST_V\d+\.\d+\.\d+\.txt$/.test(name)
));
if (obsoleteReleaseDocs.length) {
    fail(`Documentation de release obsolète présente : ${obsoleteReleaseDocs.join(", ")}`);
}

const forbiddenEnvironmentFiles = rootEntries.filter((name) => (
    name === ".env" || /^\.env\.(?!example$)/.test(name)
));
if (forbiddenEnvironmentFiles.length) {
    fail(`Fichier(s) d’environnement privé(s) présent(s) : ${forbiddenEnvironmentFiles.join(", ")}`);
}

const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /SPOTIFY_CLIENT_SECRET\s*=\s*[^\s#]+/,
    /RAILWAY_TOKEN\s*=\s*[^\s#]+/
];
const securityCandidates = ["config.js", "app.js", "server/server.js"];
for (const relative of securityCandidates) {
    const content = await readFile(path.join(root, relative), "utf8");
    for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
            fail(`Secret potentiel détecté dans ${relative}.`);
        }
    }
}

if (failures.length) {
    console.error("Préparation de release incomplète :");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(
    `Préparation de release validée : Shuffle+ ${version} · ` +
    `${requiredFiles.length} fichiers critiques · ${new Set(declaredAssets).size} ressources PWA.`
);
