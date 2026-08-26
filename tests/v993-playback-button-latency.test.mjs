import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

<<<<<<< HEAD
test("la correction de latence active annonce Shuffle+ 9.9.48", () => {
    assert.equal(version, "9.9.48");
    assert.match(appSource, /const APP_VERSION = "9\.9\.48"/);
=======
test("la correction de latence active annonce Shuffle+ 9.9.47", () => {
    assert.equal(version, "9.9.47");
    assert.match(appSource, /const APP_VERSION = "9\.9\.47"/);
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
});

test("le bouton Pause Lecture est modifié avant l’appel Spotify", () => {
    const updateIndex = appSource.indexOf(
        "updateVisiblePlaybackButtons("
    );
    const runIndex = appSource.indexOf(
        "await runQuickControlAction("
    );

    assert.ok(updateIndex >= 0);
    assert.ok(runIndex >= 0);
    assert.ok(updateIndex < runIndex);
    assert.match(
        appSource,
        /button\.textContent = isPlaying[\s\S]*"⏸ Pause"[\s\S]*"▶ Lecture"/
    );
});

test("la vérification Spotify est différée sans bloquer le libellé", () => {
    assert.match(
        appSource,
        /window\.setTimeout\(\(\) => \{[\s\S]*refreshMusicalDashboardPlayback[\s\S]*650/
    );
});
