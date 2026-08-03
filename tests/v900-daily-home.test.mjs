import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildDailyHomeSnapshot,
    getDailyHomeGreeting,
    renderDailyHomeMarkup
} from "../core/daily-home.js";
import {
    FEATURE_STYLE_ASSETS,
    getFeatureStyleNamesForMenu
} from "../core/feature-assets.js";

const appSource = await readFile("app.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const homeStyleSource = await readFile("styles/feature-home.css", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("la distribution active annonce Shuffle+ 9.9.11", () => {
    assert.equal(version, "9.9.11");
});

test("l’accueil adapte son message au moment de la journée", () => {
    assert.equal(getDailyHomeGreeting(new Date("2026-08-02T08:00:00")).label, "Bonjour");
    assert.equal(getDailyHomeGreeting(new Date("2026-08-02T20:00:00")).label, "Bonsoir");
});

test("l’instantané quotidien normalise lecture, progression et file", () => {
    const snapshot = buildDailyHomeSnapshot({
        command: { id: "drive", name: "Trajet", shuffle: true },
        commandReady: true,
        playback: {
            is_playing: true,
            progress_ms: 30_000,
            item: {
                name: "Titre test",
                duration_ms: 120_000,
                artists: [{ name: "Artiste" }],
                album: { name: "Album", images: [] }
            }
        },
        queue: [
            { name: "Suivant", duration_ms: 180_000, artists: [{ name: "A" }] }
        ],
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });

    assert.equal(snapshot.commandReady, true);
    assert.equal(snapshot.playback.progressPercent, 25);
    assert.equal(snapshot.playback.title, "Titre test");
    assert.equal(snapshot.upcoming[0].durationLabel, "3:00");
});

test("le rendu v9 expose le lancement, la lecture et la liste à suivre", () => {
    const snapshot = buildDailyHomeSnapshot({
        command: { id: "main", name: "Principal", icon: "▶️" },
        commandReady: true,
        drivingAvailable: true,
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });
    const html = renderDailyHomeMarkup(snapshot, {
        profileOptions: [{ id: "main", name: "Principal", selected: true }]
    });

    assert.match(html, /Lancer ma musique/);
    assert.match(html, /data-guided-primary-launch/);
    assert.match(html, /data-dashboard-playback="next"/);
    assert.match(html, /data-open-driving-queue/);
    assert.match(html, /primaryLaunchSettingsForm/);
});

test("l’accueil possède un style différé et reste réservé au tableau de bord", () => {
    assert.equal(FEATURE_STYLE_ASSETS.home, "./styles/feature-home.css");
    assert.deepEqual(getFeatureStyleNamesForMenu("dashboard"), ["home"]);
    assert.match(homeStyleSource, /\.v9-home-launch-button/);
    assert.match(appSource, /function renderV9HomePanel\(/);
    assert.match(appSource, /renderDailyHomeMarkup/);
    assert.match(serviceWorkerSource, /feature-home\.css\?v=9\.9\.11/);
});
