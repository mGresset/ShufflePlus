import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const config = await readFile(new URL("../playwright.config.mjs", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
const onboarding = await readFile(new URL("../e2e/onboarding.spec.mjs", import.meta.url), "utf8");
const navigation = await readFile(new URL("../e2e/navigation-search.spec.mjs", import.meta.url), "utf8");
const player = await readFile(new URL("../e2e/player-plus.spec.mjs", import.meta.url), "utf8");
const pwa = await readFile(new URL("../e2e/pwa.spec.mjs", import.meta.url), "utf8");
const helpers = await readFile(new URL("../e2e/helpers.mjs", import.meta.url), "utf8");

test("Shuffle+ 11.9.2 verrouille Playwright stable", () => {
    assert.equal(version, "11.9.2");
    assert.equal(packageJson.devDependencies?.["@playwright/test"], "1.63.0");
});

test("la matrice E2E couvre Chromium desktop et WebKit iPhone", () => {
    assert.match(config, /name: "chromium-desktop"/);
    assert.match(config, /name: "webkit-iphone"/);
    assert.match(config, /devices\["iPhone 15 Pro"\]/);
    assert.match(config, /serviceWorkers: "block"/);
});

test("un projet séparé valide le vrai Service Worker PWA", () => {
    assert.match(config, /name: "pwa-chromium"/);
    assert.match(config, /serviceWorkers: "allow"/);
    assert.match(pwa, /GET_VERSION/);
    assert.match(pwa, /expect\.poll/);
    assert.match(pwa, /Execution context was destroyed/);
    assert.match(pwa, /shuffleplus-v11\.9\.2-shell/);
});

test("les parcours navigateur couvrent onboarding, recherche et Player+", () => {
    assert.match(onboarding, /spotifySetupClientIdInput/);
    assert.match(navigation, /universalSearchInput/);
    assert.match(navigation, /Yellow Test/);
    assert.match(player, /data-home-seek/);
    assert.match(player, /volume_percent=63/);
});


test("Player+ attend la fin du verrou anti-double-commande avant Répétition", () => {
    assert.match(player, /waitForTimeout\(650\)/);
    assert.match(player, /player\/previous/);
    assert.match(player, /player\/repeat/);
});

test("Spotify est simulé sans compte réel", () => {
    assert.match(helpers, /page\.route\("https:\/\/api\.spotify\.com\/v1\/\*\*"/);
    assert.match(helpers, /shuffleplus-e2e-token/);
    assert.match(helpers, /shuffleplus_contextual_help_state_v1/);
    assert.match(helpers, /tourCompleted:\s*true/);
    assert.doesNotMatch(helpers, /client_secret/i);
    assert.doesNotMatch(helpers, /refresh_token/i);
});

test("la CI installe les navigateurs avant le déploiement", () => {
    assert.match(workflow, /npm ci/);
    assert.match(workflow, /playwright install --with-deps chromium webkit/);
    assert.match(workflow, /npm run test:e2e/);
    assert.match(workflow, /actions\/upload-artifact@v7/);
    assert.match(workflow, /actions\/upload-pages-artifact@v5/);
    assert.match(workflow, /actions\/deploy-pages@v5/);
    assert.match(workflow, /actions:\s*read/);
});
