import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    DEFAULT_HOME_LAYOUT,
    applyHomeLayoutPreset,
    getHomeLayoutPresetId,
    normalizeHomeLayout
} from "../core/home-layout.js";
import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const homeStyles = await readFile("styles/feature-home.css", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

test("la distribution active annonce Shuffle+ 9.9.39", () => {
    assert.equal(version, "9.9.39");
});

test("la disposition de l’accueil normalise les valeurs importées", () => {
    const layout = normalizeHomeLayout({
        density: "compact",
        order: ["queue", "queue", "inconnu", "main"],
        queuePreviewCount: 5,
        showQuickAccess: false
    });

    assert.equal(layout.density, "compact");
    assert.deepEqual(layout.order, [
        "queue",
        "main",
        "quickAccess",
        "shortcuts"
    ]);
    assert.equal(layout.queuePreviewCount, 5);
    assert.equal(layout.showQuickAccess, false);
    assert.equal(layout.showQueue, true);
});

test("les trois préréglages réordonnent les blocs sans perdre les options", () => {
    const compact = normalizeHomeLayout({
        ...DEFAULT_HOME_LAYOUT,
        density: "compact",
        showShortcuts: false
    });
    const queueFirst = applyHomeLayoutPreset(compact, "queueFirst");

    assert.equal(queueFirst.order[0], "queue");
    assert.equal(queueFirst.density, "compact");
    assert.equal(queueFirst.showShortcuts, false);
    assert.equal(getHomeLayoutPresetId(queueFirst), "queueFirst");
});

test("l’accueil applique le mode compact et masque les blocs désactivés", () => {
    const snapshot = buildDailyHomeSnapshot({
        homeLayout: {
            density: "compact",
            order: ["main", "queue", "quickAccess", "shortcuts"],
            showQuickAccess: false,
            showNowPlaying: false,
            showQueue: true,
            showShortcuts: false,
            queuePreviewCount: 2
        },
        queue: [
            { id: "1", name: "Un" },
            { id: "2", name: "Deux" },
            { id: "3", name: "Trois" }
        ],
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });
    const html = renderDailyHomeMarkup(snapshot);

    assert.equal(snapshot.upcoming.length, 2);
    assert.match(html, /v9-home is-compact/);
    assert.match(html, /data-home-customizer/);
    assert.match(html, /v9-home-now-playing" hidden/);
    assert.match(html, /class="v9-home-access"[\s\S]*?hidden/);
    assert.match(html, /class="v9-home-shortcuts"[\s\S]*?hidden/);
});

test("la personnalisation est stockée, sauvegardée et précachée", () => {
    assert.match(appSource, /HOME_LAYOUT_KEY/);
    assert.match(appSource, /homeLayoutSettings/);
    assert.match(appSource, /homeLayoutSettingsForm/);
    assert.match(appSource, /payload\.data\.homeLayoutSettings/);
    assert.match(homeStyles, /\.v98-home-customizer/);
    assert.match(homeStyles, /\.v98-home-blocks/);
    assert.match(serviceWorkerSource, /core\/home-layout\.js/);
});
