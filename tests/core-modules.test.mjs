import test from "node:test";
import assert from "node:assert/strict";

import { escapeHtml } from "../core/html-utils.js";
import {
    APP_MENU_GROUPS,
    APP_MENU_IDS,
    normalizeAppMenu,
    normalizeAppMenuScrollPositions,
    readStoredAppMenu,
    resolveAppMenuView,
    writeStoredAppMenu
} from "../core/app-menu.js";

test("escapeHtml neutralise les caractères HTML sensibles", () => {
    assert.equal(
        escapeHtml(`<a title="L'été">&</a>`),
        "&lt;a title=&quot;L&#039;été&quot;&gt;&amp;&lt;/a&gt;"
    );
});

test("la navigation expose chaque écran une seule fois", () => {
    const groupedIds = APP_MENU_GROUPS.flatMap((group) =>
        group.items.map(([id]) => id)
    );

    assert.deepEqual(groupedIds, APP_MENU_IDS);
    assert.equal(new Set(groupedIds).size, APP_MENU_IDS.length);
});

test("normalizeAppMenu protège contre les vues inconnues", () => {
    assert.equal(normalizeAppMenu("MUSIC"), "music");
    assert.equal(normalizeAppMenu("inconnue"), "dashboard");
    assert.equal(normalizeAppMenu(null), "dashboard");
});

test("resolveAppMenuView consomme seulement une vue valide", () => {
    assert.deepEqual(
        resolveAppMenuView(
            "https://mgresset.github.io/ShufflePlus/?view=quick&autoplay=1#top"
        ),
        {
            consumed: true,
            menuId: "quick",
            cleanPath: "/ShufflePlus/?autoplay=1#top"
        }
    );

    const invalid = resolveAppMenuView(
        "https://mgresset.github.io/ShufflePlus/?view=unknown"
    );
    assert.equal(invalid.consumed, false);
    assert.equal(invalid.menuId, null);
});

test("le menu actif résiste à un stockage indisponible", () => {
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };

    assert.equal(readStoredAppMenu(storage, "menu"), "dashboard");
    assert.equal(writeStoredAppMenu(storage, "menu", "settings"), true);
    assert.equal(readStoredAppMenu(storage, "menu"), "settings");

    const blocked = {
        getItem() {
            throw new Error("blocked");
        },
        setItem() {
            throw new Error("blocked");
        }
    };
    assert.equal(readStoredAppMenu(blocked, "menu", "music"), "music");
    assert.equal(writeStoredAppMenu(blocked, "menu", "music"), false);
});

test("les positions de défilement ignorent les données invalides", () => {
    assert.deepEqual(
        normalizeAppMenuScrollPositions({
            music: 120.7,
            settings: -4,
            unknown: 50,
            quick: "42",
            guide: "abc"
        }),
        {
            music: 121,
            settings: 0,
            quick: 42
        }
    );
});
