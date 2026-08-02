import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

const lazyRenderedMenus = [
    "dashboard",
    "music",
    "mixes",
    "adaptive",
    "assistant",
    "recommendations",
    "statistics",
    "goals",
    "intelligence",
    "quick",
    "modes",
    "guide",
    "settings"
];

test("app.js utilise les modules partagés de la v7.2", () => {
    assert.match(appSource, /\.\/core\/html-utils\.js/);
    assert.match(appSource, /\.\/core\/app-menu\.js/);
    assert.doesNotMatch(
        appSource,
        /function escapeHtml\s*\(/
    );
});

test("une seule rubrique standard est rendue à la fois", () => {
    for (const menuId of lazyRenderedMenus) {
        const branch = new RegExp(
            '\\$\\{activeAppMenu === "' +
            menuId +
            '"\\s*\\n\\s*\\? `'
        );
        assert.match(
            appSource,
            branch,
            `Branche de rendu différé absente pour ${menuId}`
        );
    }
});

test("le Service Worker précharge les nouveaux modules et borne son cache", () => {
    assert.match(serviceWorkerSource, /\.\/core\/app-menu\.js/);
    assert.match(serviceWorkerSource, /\.\/core\/html-utils\.js/);
    assert.match(serviceWorkerSource, /MAX_RUNTIME_ENTRIES = 120/);
    assert.match(serviceWorkerSource, /cache\.addAll\(CRITICAL_APP_SHELL\)/);
    assert.match(serviceWorkerSource, /trimRuntimeCache/);
});
