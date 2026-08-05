import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const css = await readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("Shuffle+ 9.9.42 compacte le mode conduite sans défilement mobile", () => {
    assert.equal(version, "9.9.42");
    assert.match(css, /v9\.9\.41 — conduite compacte sans défilement/);
    assert.match(css, /\.driving-mode-page\s*\{[\s\S]*?overflow:\s*hidden/);
    assert.match(css, /grid-template-rows:\s*repeat\(2, minmax\(68px, 1fr\)\)/);
    assert.match(css, /\.driving-control\s*\{[\s\S]*?min-height:\s*68px/);
    assert.match(css, /\.driving-control small\s*\{\s*display:\s*none/);
});

test("la compaction s'adapte automatiquement à la hauteur disponible", () => {
    assert.match(app, /function syncDrivingCompactLayout\(\)/);
    assert.match(app, /is-ultra-compact-layout/);
    assert.match(app, /page\.scrollHeight > page\.clientHeight \+ 2/);
    assert.match(app, /drivingPageScrollTop = 0/);
});
