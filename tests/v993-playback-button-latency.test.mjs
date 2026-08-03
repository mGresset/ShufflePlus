import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("la correction de latence active annonce Shuffle+ 9.9.18", () => {
    assert.equal(version, "9.9.18");
    assert.match(appSource, /const APP_VERSION = "9\.9\.18"/);
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
