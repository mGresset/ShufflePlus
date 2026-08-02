import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getUiActionVariant
} from "../core/ui-consistency.js";
import {
    buildDrivingQueuePreview,
    getDrivingPlaybackProgress,
    getDrivingQueueFreshness
} from "../core/driving-ui.js";

const versionSource = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const drivingStyleSource = await readFile("styles/feature-driving.css", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const indexSource = await readFile("index.html", "utf8");

test("la distribution active annonce Shuffle+ 9.0.0", () => {
    assert.equal(versionSource, "9.0.0");
    assert.match(indexSource, /shuffleplus-version" content="9\.0\.0/);
    assert.match(appSource, /const APP_VERSION = "9\.0\.0"/);
    assert.match(serviceWorkerSource, /shuffleplus-v9\.0\.0/);
});

test("les actions historiques reçoivent une variante sémantique stable", () => {
    assert.equal(getUiActionVariant({ label: "Enregistrer les réglages" }), "primary");
    assert.equal(getUiActionVariant({ label: "Réinitialiser les filtres" }), "ghost");
    assert.equal(getUiActionVariant({ label: "Se déconnecter" }), "danger");
    assert.equal(getUiActionVariant({ label: "Afficher les détails" }), "secondary");
    assert.equal(getUiActionVariant({ label: "N'importe quoi", explicit: "primary" }), "primary");
});

test("la progression conduite est bornée et fournit des temps lisibles", () => {
    const progress = getDrivingPlaybackProgress({
        progress_ms: 90_000,
        item: { duration_ms: 240_000 }
    });

    assert.equal(progress.available, true);
    assert.equal(progress.percent, 37.5);
    assert.equal(progress.elapsedLabel, "1:30");
    assert.equal(progress.remainingLabel, "-2:30");

    const overflow = getDrivingPlaybackProgress({
        progress_ms: 500_000,
        item: { duration_ms: 200_000 }
    });
    assert.equal(overflow.percent, 100);
});

test("la fraîcheur de la file distingue vide, à jour et périmée", () => {
    const now = 1_000_000;

    assert.equal(getDrivingQueueFreshness(0, now).state, "empty");
    assert.equal(getDrivingQueueFreshness(now - 30_000, now).state, "fresh");
    assert.equal(getDrivingQueueFreshness(now - 120_000, now).state, "stale");
});

test("l’aperçu conduite conserve trois titres et normalise leurs durées", () => {
    const preview = buildDrivingQueuePreview([
        { name: "A", artist: "Artiste A", durationMs: 180_000 },
        { name: "B", artist: "Artiste B", durationMs: 200_000 },
        { name: "C", artist: "Artiste C", durationMs: 210_000 },
        { name: "D", artist: "Artiste D", durationMs: 220_000 }
    ]);

    assert.equal(preview.length, 3);
    assert.deepEqual(preview.map((item) => item.index), [1, 2, 3]);
    assert.equal(preview[0].durationLabel, "3:00");
});

test("le mode conduite affiche toujours la file, la progression et le lien Spotify", () => {
    assert.match(appSource, /function renderDrivingPlaybackProgress/);
    assert.match(appSource, /class="driving-playback-progress"/);
    assert.match(appSource, /class="driving-queue-preview \$\{upcoming\.length/);
    assert.match(appSource, /Charger la liste/);
    assert.match(appSource, /class="driving-spotify-link"/);
});

test("le design system v8.4 couvre les formulaires et le layout conduite mobile", () => {
    assert.match(designSource, /Shuffle\+ v8\.4\.0/);
    assert.match(designSource, /#content :where\(/);
    assert.match(drivingStyleSource, /"progress"/);
    assert.match(drivingStyleSource, /"queue"/);
    assert.match(drivingStyleSource, /driving-queue-freshness/);
});

test("le Service Worker précharge les modules UI v8.4", () => {
    assert.match(serviceWorkerSource, /\.\/core\/ui-consistency\.js/);
    assert.match(serviceWorkerSource, /\.\/core\/driving-ui\.js/);
});
