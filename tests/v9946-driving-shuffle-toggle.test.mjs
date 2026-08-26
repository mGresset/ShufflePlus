import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const drivingCore = await readFile("core/driving-advanced.js", "utf8");
const drivingCss = await readFile("styles/feature-driving.css", "utf8");

<<<<<<< HEAD
test("Shuffle+ 9.9.48 remplace Adaptive DJ par Aléatoire dans le mode conduite", () => {
    assert.equal(version, "9.9.48");
=======
test("Shuffle+ 9.9.47 remplace Adaptive DJ par Aléatoire dans le mode conduite", () => {
    assert.equal(version, "9.9.47");
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
    assert.match(appSource, /id: "shuffle"/);
    assert.match(appSource, /buttonId: "drivingShuffleButton"/);
    assert.match(appSource, /label: `Aléatoire \$\{shuffleEnabled \? "ON" : "OFF"\}`/);
    assert.doesNotMatch(appSource, /buttonId: "drivingAdaptiveButton"/);
});

test("le bouton Aléatoire pilote le shuffle Spotify sur l’appareil actif", () => {
    assert.match(appSource, /async function toggleDrivingShuffle\(\)/);
    assert.match(appSource, /await setPlaybackShuffle\(\s*nextShuffleState,\s*deviceId\s*\)/s);
    assert.match(appSource, /shuffle_state: nextShuffleState/);
    assert.match(appSource, /expiresAt: Date\.now\(\) \+ 5000/);
    assert.match(appSource, /aria-pressed/);
});

test("les anciennes préférences Adaptive DJ migrent vers Aléatoire", () => {
    assert.match(drivingCore, /storedPrimaryAction === "adaptive"/);
    assert.match(drivingCore, /\? "shuffle"/);
    assert.match(drivingCore, /primaryAction: "shuffle"/);
});

test("l’état ON du shuffle est identifiable visuellement", () => {
    assert.match(drivingCss, /data-driving-control="shuffle"\]\.is-shuffle-on/);
});
