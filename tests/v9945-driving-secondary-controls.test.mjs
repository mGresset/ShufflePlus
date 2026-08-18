import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

test("Shuffle+ 9.9.47 simplifie les commandes secondaires du mode conduite", () => {
    assert.equal(version, "9.9.47");
    assert.doesNotMatch(appSource, /class="driving-spotify-link"/);
    assert.doesNotMatch(appSource, /id="drivingQueueButton"/);
    assert.doesNotMatch(appSource, /function getDrivingSpotifyUrl/);
    assert.match(appSource, /id="drivingRefreshButton"/);
    assert.match(appSource, /id="drivingWakeLockInput"/);
    assert.match(appSource, /id="drivingAutoRefreshInput"/);
    assert.match(appSource, /<small>Actualisation auto<\/small>/);
    assert.match(cssSource, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(cssSource, /white-space:\s*normal/);
    assert.match(cssSource, /text-overflow:\s*clip/);
});
