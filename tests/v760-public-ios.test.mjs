import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    canUseDrivingMode,
    hasLocalIosDebugOverride,
    isAppleMobileDevice
} from "../core/platform.js";

import {
    clearSpotifyAppConfiguration,
    getConfiguredSpotifyClientId,
    isValidSpotifyClientId,
    maskSpotifyClientId,
    migrateLegacySpotifyClientId,
    readSpotifyAppConfiguration,
    saveSpotifyAppConfiguration
} from "../core/spotify-app-config.js";

const appSource = await readFile("app.js", "utf8");
const configSource = await readFile("config.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const menuSource = await readFile("core/app-menu.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key)
    };
}

test("la détection reconnaît iPhone, iPad tactile et refuse le PC", () => {
    assert.equal(isAppleMobileDevice({ userAgent: "Mozilla iPhone", platform: "iPhone", maxTouchPoints: 5 }), true);
    assert.equal(isAppleMobileDevice({ userAgent: "Mozilla Macintosh", platform: "MacIntel", maxTouchPoints: 5 }), true);
    assert.equal(isAppleMobileDevice({ userAgent: "Mozilla Windows", platform: "Win32", maxTouchPoints: 0 }), false);
});

test("la simulation iOS fonctionne uniquement en développement local", () => {
    assert.equal(hasLocalIosDebugOverride({ hostname: "127.0.0.1", search: "?debug_ios=1" }), true);
    assert.equal(hasLocalIosDebugOverride({ hostname: "mgresset.github.io", search: "?debug_ios=1" }), false);
    assert.equal(canUseDrivingMode({
        userAgent: "Mozilla Windows",
        platform: "Win32",
        maxTouchPoints: 0,
        location: { hostname: "127.0.0.1", search: "?debug_ios=1" }
    }), true);
});

test("un Client ID personnel est validé, enregistré, masqué puis supprimé", () => {
    const storage = createStorage();
    const clientId = "0123456789abcdef0123456789abcdef";

    assert.equal(isValidSpotifyClientId(clientId), true);
    assert.equal(saveSpotifyAppConfiguration(storage, { clientId, redirectUri: "https://example.test/" }).saved, true);
    assert.equal(getConfiguredSpotifyClientId(storage), clientId);
    assert.equal(readSpotifyAppConfiguration(storage).redirectUri, "https://example.test/");
    assert.equal(maskSpotifyClientId(clientId), "012345••••••cdef");
    assert.equal(clearSpotifyAppConfiguration(storage), true);
    assert.equal(getConfiguredSpotifyClientId(storage), "");
});

test("le Client ID historique migre uniquement pour une installation déjà authentifiée", () => {
    const legacyClientId = "abcdef0123456789abcdef0123456789";
    const newLocal = createStorage();
    const existingLocal = createStorage({ shuffleplus_refresh_token: "refresh" });
    const session = createStorage();

    assert.equal(migrateLegacySpotifyClientId({
        local: newLocal,
        session,
        legacyClientId,
        redirectUri: "https://example.test/"
    }).migrated, false);

    assert.equal(migrateLegacySpotifyClientId({
        local: existingLocal,
        session,
        legacyClientId,
        redirectUri: "https://example.test/"
    }).migrated, true);
    assert.equal(getConfiguredSpotifyClientId(existingLocal), legacyClientId);
});

test("la v7.6 expose l’assistant public et masque la conduite hors iOS", () => {
    assert.match(indexSource, /id="spotifySetupPanel"/);
    assert.match(indexSource, /id="spotifySetupClientIdInput"/);
    assert.match(configSource, /get clientId\(\)/);
    assert.match(configSource, /legacyClientId: LEGACY_CLIENT_ID/);
    assert.match(menuSource, /getVisibleAppMenuGroups/);
    assert.match(appSource, /const DRIVING_MODE_AVAILABLE = canUseDrivingMode\(\)/);
    assert.match(appSource, /drivingAvailable: DRIVING_MODE_AVAILABLE/);
    assert.match(appSource, /Le mode conduite est réservé aux appareils iOS et iPadOS/);
    assert.match(appSource, /renderSpotifyConnectionSettingsPanel/);
    assert.match(serviceWorkerSource, /\.\/core\/platform\.js/);
    assert.match(serviceWorkerSource, /\.\/core\/spotify-app-config\.js/);
});
