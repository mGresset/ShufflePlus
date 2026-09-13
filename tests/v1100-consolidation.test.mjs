import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const app = await readFile("app.js", "utf8");
const index = await readFile("index.html", "utf8");
const readinessUi = await readFile("core/release-readiness-ui.js", "utf8");
const readinessCore = await readFile("core/release-readiness.js", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

await access("RELEASE-CHECKLIST.md");
await access("scripts/check-release-cleanup.mjs");

test("Shuffle+ 11.0.0 ouvre une branche stable cohérente", () => {
    assert.equal(version, "11.0.0");
    assert.match(index, /Shuffle\+ 11\.0\.0 · Stable/);
    assert.match(index, /bootstrap-11\.0\.0\.js/);
    assert.match(index, /startup-recovery-11\.0\.0\.js/);
});

test("app.js réutilise CONFIG.version comme source runtime", () => {
    assert.match(app, /const APP_VERSION = CONFIG\.version;/);
    assert.doesNotMatch(app, /const APP_VERSION = "11\.0\.0";/);
});

test("la validation terrain n'est plus figée sur V10", () => {
    assert.match(readinessUi, /readiness\.appVersion/);
    assert.match(readinessCore, /label: "Version validée"/);
    assert.doesNotMatch(readinessUi, /V10 · Validation terrain|Exporter la validation V10|V10 validée/);
    assert.doesNotMatch(app, /✨ Apparence V10|validations terrain de la V10/);
});

test("le pipeline utilise le garde-fou de release générique", () => {
    assert.match(packageJson.scripts.check, /check-release-cleanup\.mjs/);
    assert.doesNotMatch(packageJson.scripts.check, /check-v10-cleanup\.mjs/);
});
