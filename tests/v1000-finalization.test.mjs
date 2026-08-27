import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
    version,
    appSource,
    indexSource,
    workerSource,
    recoverySource,
    experienceSource,
    menuSource,
    experienceUiSource,
    releaseUiSource
] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../service-worker.js", import.meta.url), "utf8"),
    readFile(new URL("../startup-recovery-10.1.0.js", import.meta.url), "utf8"),
    readFile(new URL("../core/experience-mode.js", import.meta.url), "utf8"),
    readFile(new URL("../core/app-menu.js", import.meta.url), "utf8"),
    readFile(new URL("../core/experience-mode-ui.js", import.meta.url), "utf8"),
    readFile(new URL("../core/release-readiness-ui.js", import.meta.url), "utf8")
]);

test("Shuffle+ V10 annonce une release stable cohérente", () => {
    assert.equal(version, "10.1.0");
    assert.match(indexSource, /shuffleplus-release-channel" content="stable"/);
    assert.match(indexSource, /bootstrap-10\.1\.0\.js/);
    assert.match(workerSource, /shuffleplus-v10\.1\.0/);
});

test("V10 ne présente plus les numéros historiques des sous-fonctions", () => {
    for (const marker of [
        "Shuffle+ v6",
        "Shuffle+ 8",
        "Expérience Shuffle+ 8",
        "v4.9 ·",
        "v4.7 ·",
        "v5.5 ·",
        "v5.6",
        ">v4.0<",
        ">v3.0<",
        ">v5.2<"
    ]) {
        assert.equal(appSource.includes(marker), false, marker);
    }
});

test("l’accueil V10 n’utilise plus les rendus historiques V8/V9", () => {
    assert.doesNotMatch(appSource, /renderV8WelcomePanel/);
    assert.doesNotMatch(appSource, /renderV9HomePanel/);
    assert.match(appSource, /function renderHomePanel\(\)/);
});

test("le mode Essentiel continue de masquer les outils avancés", () => {
    assert.match(experienceSource, /id: "essential"/);
    assert.match(menuSource, /more: \[\]/);
    assert.match(menuSource, /id === "driving"/);
});

test("la protection anti-boucle iPhone reste active en V10", () => {
    assert.match(recoverySource, /REPAIR_RELOAD_KEY/);
    assert.match(recoverySource, /hasOAuthCallback/);
    assert.match(recoverySource, /registration\.scope === shufflePlusScope/);
});

test("le mode conduite V10 garde Aléatoire et ne réintroduit pas le bouton Spotify supprimé", () => {
    assert.match(appSource, /data-driving-control="shuffle"/);
    assert.doesNotMatch(appSource, /data-driving-control="spotify"/);
});


test("V10 extrait deux gros rendus de réglages hors de app.js", () => {
    assert.match(appSource, /renderExperienceModePanelMarkup/);
    assert.match(appSource, /renderReleaseReadinessPanelMarkup/);
    assert.match(experienceUiSource, /experience-mode-options/);
    assert.match(releaseUiSource, /data-finalization-check/);
    assert.match(workerSource, /core\/experience-mode-ui\.js/);
    assert.match(workerSource, /core\/release-readiness-ui\.js/);
});
