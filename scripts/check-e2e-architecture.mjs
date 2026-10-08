import { access, readFile } from "node:fs/promises";
import process from "node:process";

const failures = [];
const fail = (message) => failures.push(message);
const requiredFiles = [
    "playwright.config.mjs",
    "e2e/helpers.mjs",
    "e2e/onboarding.spec.mjs",
    "e2e/navigation-search.spec.mjs",
    "e2e/player-plus.spec.mjs",
    "e2e/pwa.spec.mjs"
];

for (const file of requiredFiles) {
    try {
        await access(file);
    } catch {
        fail(`Fichier E2E absent : ${file}`);
    }
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const config = await readFile("playwright.config.mjs", "utf8");
const workflow = await readFile(".github/workflows/deploy-pages.yml", "utf8");
const helpers = await readFile("e2e/helpers.mjs", "utf8");
const gitignore = await readFile(".gitignore", "utf8");

if (packageJson.devDependencies?.["@playwright/test"] !== "1.63.0") {
    fail("@playwright/test doit être verrouillé sur 1.63.0.");
}

for (const script of ["test:e2e", "test:e2e:chromium", "test:e2e:webkit", "test:e2e:pwa"]) {
    if (!packageJson.scripts?.[script]) {
        fail(`Script npm absent : ${script}`);
    }
}

for (const marker of ["chromium-desktop", "webkit-iphone", "pwa-chromium", 'devices["iPhone 15 Pro"]']) {
    if (!config.includes(marker)) {
        fail(`Configuration Playwright incomplète : ${marker}`);
    }
}

if (!config.includes('serviceWorkers: "block"') || !config.includes('serviceWorkers: "allow"')) {
    fail("Les tests UI et PWA doivent contrôler explicitement les Service Workers.");
}

if (!workflow.includes("npm ci")) {
    fail("La CI doit installer les dépendances verrouillées avec npm ci.");
}
if (!workflow.includes("playwright install --with-deps chromium webkit")) {
    fail("La CI doit installer Chromium et WebKit Playwright.");
}
if (!workflow.includes("npm run test:e2e")) {
    fail("La CI doit exécuter les tests E2E.");
}
for (const action of [
    "actions/upload-artifact@v7",
    "actions/upload-pages-artifact@v5",
    "actions/deploy-pages@v5"
]) {
    if (!workflow.includes(action)) {
        fail(`Action GitHub attendue absente : ${action}`);
    }
}
if (!/permissions:\s*[\s\S]*?actions:\s*read[\s\S]*?pages:\s*write[\s\S]*?id-token:\s*write/.test(workflow)) {
    fail("Le job de déploiement Pages doit autoriser actions: read, pages: write et id-token: write.");
}

if (!helpers.includes("shuffleplus-e2e-token") || !helpers.includes("page.route")) {
    fail("Le mock Spotify E2E n’est pas correctement isolé.");
}

for (const forbidden of ["refresh_token", "client_secret", "RAILWAY_TOKEN="]) {
    if (helpers.toLowerCase().includes(forbidden.toLowerCase())) {
        fail(`Le helper E2E contient un marqueur sensible interdit : ${forbidden}`);
    }
}

for (const ignored of ["playwright-report/", "test-results/"]) {
    if (!gitignore.includes(ignored)) {
        fail(`.gitignore doit exclure ${ignored}`);
    }
}

if (failures.length) {
    console.error("Architecture E2E incomplète :");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Architecture E2E validée : Chromium desktop + WebKit iPhone + runtime PWA.");
