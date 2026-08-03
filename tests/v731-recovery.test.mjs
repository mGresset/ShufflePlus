import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    AUTH_STORAGE_KEYS,
    clearSpotifyAuthentication,
    inspectSpotifyAuthState,
    repairSpotifyAuthState
} from "../core/session-recovery.js";

class MemoryStorage {
    #values = new Map();

    getItem(key) {
        return this.#values.has(key) ? this.#values.get(key) : null;
    }

    setItem(key, value) {
        this.#values.set(key, String(value));
    }

    removeItem(key) {
        this.#values.delete(key);
    }
}

const appVersion = (await readFile("VERSION", "utf8")).trim();
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const authSource = await readFile("auth.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const bootstrapSource = await readFile(
    `startup-recovery-${appVersion}.js`,
    "utf8"
);

test("un état PKCE partiel est nettoyé hors retour OAuth", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    session.setItem(AUTH_STORAGE_KEYS.codeVerifier, "verifier");
    session.setItem(AUTH_STORAGE_KEYS.authStartedAt, Date.now());

    const result = repairSpotifyAuthState({ local, session });

    assert.equal(result.repaired, true);
    assert.equal(session.getItem(AUTH_STORAGE_KEYS.codeVerifier), null);
    assert.equal(session.getItem(AUTH_STORAGE_KEYS.authStartedAt), null);
    assert.deepEqual(result.after.issues, []);
});

test("une expiration corrompue retire l’access token mais conserve le refresh token", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem(AUTH_STORAGE_KEYS.accessToken, "access");
    local.setItem(AUTH_STORAGE_KEYS.refreshToken, "refresh");
    local.setItem(AUTH_STORAGE_KEYS.expiresAt, "not-a-date");

    const result = repairSpotifyAuthState({ local, session });

    assert.equal(result.repaired, true);
    assert.equal(local.getItem(AUTH_STORAGE_KEYS.accessToken), null);
    assert.equal(local.getItem(AUTH_STORAGE_KEYS.expiresAt), null);
    assert.equal(local.getItem(AUTH_STORAGE_KEYS.refreshToken), "refresh");
    assert.equal(result.after.hasUsableSession, true);
});

test("la réinitialisation Spotify conserve les préférences Shuffle+", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem(AUTH_STORAGE_KEYS.accessToken, "access");
    local.setItem(AUTH_STORAGE_KEYS.refreshToken, "refresh");
    local.setItem("shuffleplus_preferred_spotify_device_v1", "iphone");
    local.setItem("shuffleplus_ui_theme_v1", "violet");
    session.setItem(AUTH_STORAGE_KEYS.oauthState, "state");

    clearSpotifyAuthentication({ local, session });

    assert.equal(local.getItem(AUTH_STORAGE_KEYS.accessToken), null);
    assert.equal(local.getItem(AUTH_STORAGE_KEYS.refreshToken), null);
    assert.equal(session.getItem(AUTH_STORAGE_KEYS.oauthState), null);
    assert.equal(
        local.getItem("shuffleplus_preferred_spotify_device_v1"),
        "iphone"
    );
    assert.equal(local.getItem("shuffleplus_ui_theme_v1"), "violet");
});

test("l’inspection tolère un stockage navigateur indisponible", () => {
    const blocked = {
        getItem() {
            throw new Error("blocked");
        },
        removeItem() {
            throw new Error("blocked");
        }
    };

    const state = inspectSpotifyAuthState({
        local: blocked,
        session: blocked
    });

    assert.equal(state.hasUsableSession, false);
    assert.deepEqual(state.issues, []);
});

test("la page de connexion dispose d’un secours indépendant de app.js", () => {
    const bootstrapIndex = indexSource.indexOf(
        `src="./startup-recovery-${appVersion}.js"`
    );
    const appIndex = indexSource.indexOf(
        `type="module" src="./bootstrap-${appVersion}.js"`
    );

    assert.match(indexSource, /id="showStartupRecoveryButton"/);
    assert.match(indexSource, /id="repairStartupButton"/);
    assert.match(indexSource, /id="resetSpotifySessionButton"/);
    assert.ok(bootstrapIndex > 0);
    assert.ok(appIndex > bootstrapIndex);
    assert.match(bootstrapSource, /ShufflePlusRecovery/);
    assert.match(bootstrapSource, /getRegistrations/);
    assert.match(bootstrapSource, /name\.startsWith\(CACHE_PREFIX\)/);
});

test("l’application signale son chargement et répare la session avant le callback", () => {
    const repairIndex = appSource.indexOf("repairSpotifyAuthState({");
    const callbackIndex = appSource.indexOf("await handleSpotifyCallback();");

    assert.ok(repairIndex > 0);
    assert.ok(callbackIndex > repairIndex);
    assert.match(appSource, /shuffleplus:app-ready/);
    assert.match(appSource, /shuffleplus:startup-error/);
    assert.match(authSource, /SPOTIFY_AUTH_STORAGE_BLOCKED/);
    assert.match(authSource, /clearTemporaryAuth\(\);\r?\n\s*console\.error\("Erreur token Spotify/);
});

test("le Service Worker privilégie le réseau pour les scripts versionnés", () => {
    assert.match(workerSource, /staticNetworkFirst/);
    assert.doesNotMatch(workerSource, /staleWhileRevalidate/);
    assert.match(workerSource, /cache: "no-store"/);
    assert.ok(
        workerSource.includes(`startup-recovery-${appVersion}.js`)
    );
    assert.match(workerSource, /core\/session-recovery\.js/);
});
