import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");

<<<<<<< HEAD
test("Shuffle+ 9.9.48 complète la grille de commandes rapides", () => {
    assert.equal(version, "9.9.48");
=======
test("Shuffle+ 9.9.47 complète la grille de commandes rapides", () => {
    assert.equal(version, "9.9.47");
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
    assert.match(appSource, /id: "refresh"/);
    assert.match(appSource, /label: "Actualiser Spotify"/);
    assert.match(appSource, /action\.id === "refresh"/);
    assert.match(appSource, /return !DRIVING_MODE_AVAILABLE/);
});

test("Actualiser Spotify déclenche une lecture fraîche", () => {
    assert.match(appSource, /normalizedAction === "refresh"/);
    assert.match(appSource, /getCurrentPlayback\(\{ fresh: true \}\)/);
});

test("les commandes rapides ne conservent aucun faux état sélectionné", () => {
    assert.match(designSource, /commandes rapides neutres et grille complète/);
    assert.match(designSource, /\.quick-action-button:active:not\(:disabled\)/);
    assert.match(designSource, /@media \(hover: none\), \(pointer: coarse\)/);
    assert.match(designSource, /background: var\(--ui-control-bg\) !important/);
});
