import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildHomeQuickAccess,
    formatHomeQuickAccessAge,
    normalizePinnedProfileIds
} from "../core/home-quick-access.js";
import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const homeStyleSource = await readFile("styles/feature-home.css", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

const commands = [
    {
        id: "principal",
        name: "Voiture",
        icon: "🚗",
        commandType: "fixed",
        playlistName: "Route"
    },
    {
        id: "sport",
        name: "Sport",
        icon: "🔥",
        commandType: "smartmix",
        mixId: "mix-sport"
    }
];

test("la distribution active annonce Shuffle+ 9.6.1", () => {
    assert.equal(version, "9.6.1");
});

test("les profils épinglés sont dédupliqués, filtrés et limités", () => {
    assert.deepEqual(
        normalizePinnedProfileIds(
            ["sport", "sport", "inconnu", "principal", "autre"],
            ["principal", "sport"],
            { fallbackId: "principal" }
        ),
        ["sport", "principal"]
    );
    assert.deepEqual(
        normalizePinnedProfileIds([], ["principal"], { fallbackId: "principal" }),
        ["principal"]
    );
});

test("l’accès rapide regroupe épinglés, historique et favoris", () => {
    const now = new Date("2026-08-02T19:00:00+02:00").getTime();
    const access = buildHomeQuickAccess({
        commands,
        pinnedIds: ["sport", "principal"],
        history: [
            {
                id: "run-1",
                commandId: "sport",
                status: "success",
                deviceName: "iPhone",
                createdAt: now - 120_000
            },
            {
                id: "run-2",
                commandId: "sport",
                status: "success",
                deviceName: "Ancien appareil",
                createdAt: now - 300_000
            },
            {
                id: "run-3",
                commandId: "principal",
                status: "error",
                createdAt: now - 60_000
            }
        ],
        favoriteSourceKeys: ["liked", "playlist:abc"],
        playlists: [{ id: "abc", name: "Découvertes" }],
        savedMixes: [{ id: "mix-sport", name: "Énergie maximale" }],
        now
    });

    assert.equal(access.pinnedProfiles.length, 2);
    assert.equal(access.pinnedProfiles[0].subtitle, "Énergie maximale");
    assert.equal(access.recentLaunches.length, 1);
    assert.equal(access.recentLaunches[0].ageLabel, "Il y a 2 min");
    assert.equal(access.favoriteCount, 2);
    assert.deepEqual(
        access.favorites.map((item) => item.name),
        ["Titres likés", "Découvertes"]
    );
});

test("l’accueil affiche les actions de relance, recherche et favoris", () => {
    const quickAccess = buildHomeQuickAccess({
        commands,
        pinnedIds: ["principal"],
        history: [{
            id: "run-1",
            commandId: "principal",
            status: "success",
            deviceName: "iPhone",
            createdAt: Date.now()
        }],
        favoriteSourceKeys: ["liked"]
    });
    const snapshot = buildDailyHomeSnapshot({
        quickAccess,
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });
    const html = renderDailyHomeMarkup(snapshot);

    assert.match(html, /Accès immédiat/);
    assert.match(html, /data-home-run-profile="principal"/);
    assert.match(html, /data-home-pin-profile="principal"/);
    assert.match(html, /data-home-open-favorites/);
    assert.match(html, /data-open-universal-search/);
});

test("la v9.6 branche les épingles au stockage, aux sauvegardes et au cache PWA", () => {
    assert.match(appSource, /PINNED_SHORTCUT_PROFILES_KEY/);
    assert.match(appSource, /pinnedShortcutProfileIds/);
    assert.match(appSource, /buildHomeQuickAccess/);
    assert.match(appSource, /data-home-run-profile/);
    assert.match(appSource, /savePinnedShortcutProfiles/);
    assert.match(homeStyleSource, /\.v9-home-access/);
    assert.match(serviceWorkerSource, /core\/home-quick-access\.js/);
    assert.equal(formatHomeQuickAccessAge(1_000, 61_000), "Il y a 1 min");
});
