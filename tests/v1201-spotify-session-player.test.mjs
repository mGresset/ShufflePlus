import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
    #values = new Map();
    get length() { return this.#values.size; }
    key(index) { return [...this.#values.keys()][index] ?? null; }
    getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
    setItem(key, value) { this.#values.set(key, String(value)); }
    removeItem(key) { this.#values.delete(key); }
    clear() { this.#values.clear(); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.location = { hostname: "127.0.0.1" };
globalThis.window = { setTimeout };

const storage = await import("../storage.js");
const auth = await import("../auth.js");
const spotifyApi = await import("../spotify-api.js");
const {
    createSpotifyPlayerCommandQueue
} = await import("../core/spotify-player-command-queue.js");
const {
    claimShortcutRequest,
    completeShortcutRequest,
    createShortcutProgressPublisher,
    createLaunchAbortScope
} = await import("../core/shortcut-launch-controller.js");
const { describeSpotifyError, normalizeSpotifyErrorCode } = await import("../core/spotify-errors.js");
const { classifyLaunchError } = await import("../core/launch-reliability.js");

const PREFERRED_KEY = "shuffleplus_preferred_spotify_device_v2";
const PROFILES_KEY = "shuffleplus_mix_profiles_v1";

function reset({ access = "access-1", refresh = "refresh-1", expiresIn = 3600 } = {}) {
    localStorage.clear();
    sessionStorage.clear();
    spotifyApi.clearSpotifyApiMemoryCache();
    spotifyApi.resetSpotifyApiDiagnostics({ keepCooldown: false });
    storage.saveTokens({ access_token: access, refresh_token: refresh, expires_in: expiresIn }, { markAuthorization: true });
    localStorage.setItem(PREFERRED_KEY, JSON.stringify({ schemaVersion: 2, displayName: "iPhone" }));
    localStorage.setItem(PROFILES_KEY, JSON.stringify([{ id: "p1" }]));
}

function json(status, body, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...headers }
    });
}

function isTokenRequest(url) {
    return String(url).includes("accounts.spotify.com/api/token");
}

test("token valide : aucun renouvellement", async () => {
    reset();
    let tokenCalls = 0;
    globalThis.fetch = async (url) => {
        if (isTokenRequest(url)) tokenCalls += 1;
        return json(200, {});
    };
    assert.equal(await auth.getValidAccessToken(), "access-1");
    assert.equal(tokenCalls, 0);
});

test("token bientôt expiré : renouvellement anticipé", async () => {
    reset({ expiresIn: 30 });
    globalThis.fetch = async () => json(200, { access_token: "access-2", expires_in: 3600 });
    assert.equal(await auth.getValidAccessToken(), "access-2");
});

test("single-flight : trois appels simultanés, un seul refresh", async () => {
    reset({ expiresIn: -1 });
    let tokenCalls = 0;
    globalThis.fetch = async () => {
        tokenCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, { access_token: "access-2", expires_in: 3600 });
    };
    const tokens = await Promise.all([
        auth.getValidAccessToken(),
        auth.forceRefreshAccessToken(),
        auth.getValidAccessToken()
    ]);
    assert.deepEqual(tokens, ["access-2", "access-2", "access-2"]);
    assert.equal(tokenCalls, 1);
});

test("rotation : le nouveau refresh token est enregistré", async () => {
    reset({ expiresIn: -1 });
    globalThis.fetch = async () => json(200, { access_token: "access-2", refresh_token: "refresh-NEW", expires_in: 3600 });
    await auth.getValidAccessToken();
    assert.equal(storage.getStoredTokens().refreshToken, "refresh-NEW");
});

test("sans nouveau refresh_token : l’ancien est conservé", async () => {
    reset({ expiresIn: -1 });
    globalThis.fetch = async () => json(200, { access_token: "access-2", expires_in: 3600 });
    await auth.getValidAccessToken();
    assert.equal(storage.getStoredTokens().refreshToken, "refresh-1");
    assert.equal(storage.getStoredTokens().accessToken, "access-2");
});

test("HTTP 401 → un refresh forcé → un seul nouvel essai réussi", async () => {
    reset();
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        if (isTokenRequest(url)) {
            calls.push("token");
            return json(200, { access_token: "access-2", expires_in: 3600 });
        }
        const auth = options.headers?.Authorization;
        calls.push(`api:${auth}`);
        return auth === "Bearer access-1"
            ? json(401, { error: { status: 401, message: "The access token expired" } })
            : json(200, { devices: [] });
    };
    const devices = await spotifyApi.getAvailableDevices({ fresh: true });
    assert.deepEqual(devices, []);
    assert.deepEqual(calls, ["api:Bearer access-1", "token", "api:Bearer access-2"]);
});

test("second 401 : reconnexion demandée sans boucle, données conservées", async () => {
    reset();
    let apiCalls = 0;
    let tokenCalls = 0;
    globalThis.fetch = async (url) => {
        if (isTokenRequest(url)) {
            tokenCalls += 1;
            return json(200, { access_token: `access-${tokenCalls + 1}`, expires_in: 3600 });
        }
        apiCalls += 1;
        return json(401, { error: { status: 401, message: "Invalid access token" } });
    };
    await assert.rejects(
        spotifyApi.getAvailableDevices({ fresh: true }),
        (error) => error.code === "SPOTIFY_REAUTH_REQUIRED"
    );
    assert.equal(apiCalls, 2);
    assert.equal(tokenCalls, 1);
    assert.ok(localStorage.getItem(PREFERRED_KEY));
    assert.ok(localStorage.getItem(PROFILES_KEY));
});

test("refresh hors ligne : jamais de suppression du refresh token ni des données", async () => {
    reset({ expiresIn: -1 });
    globalThis.fetch = async () => {
        throw new TypeError("Failed to fetch");
    };
    await assert.rejects(auth.getValidAccessToken(), (error) => error.code === "SPOTIFY_REFRESH_NETWORK_ERROR");
    assert.equal(storage.getStoredTokens().refreshToken, "refresh-1");
    assert.ok(localStorage.getItem(PREFERRED_KEY));
    assert.ok(localStorage.getItem(PROFILES_KEY));
    assert.equal(normalizeSpotifyErrorCode({ code: "SPOTIFY_REFRESH_NETWORK_ERROR" }), "OFFLINE");
});

test("invalid_grant : reauth propre, iPhone préféré et profils conservés", async () => {
    reset({ expiresIn: -1 });
    let tokenCalls = 0;
    globalThis.fetch = async () => {
        tokenCalls += 1;
        return json(400, { error: "invalid_grant", error_description: "Refresh token revoked" });
    };
    await assert.rejects(auth.getValidAccessToken(), (error) => {
        assert.equal(error.code, "SPOTIFY_REAUTH_REQUIRED");
        assert.match(error.message, /profils, ton iPhone préféré et tes réglages sont conservés/);
        return true;
    });
    assert.equal(tokenCalls, 1, "aucune boucle de refresh");
    assert.equal(storage.getStoredTokens().refreshToken, null);
    assert.ok(localStorage.getItem(PREFERRED_KEY));
    assert.ok(localStorage.getItem(PROFILES_KEY));
    assert.equal(auth.getSpotifySessionDiagnostics().lastRefreshOutcome, "reauth-required");
    assert.equal(await auth.getValidAccessToken(), null);
});

test("invalid_grant après rotation par un autre onglet : le jeton récent est réessayé", async () => {
    reset({ expiresIn: -1 });
    const used = [];
    globalThis.fetch = async (url, options) => {
        const token = new URLSearchParams(options.body).get("refresh_token");
        used.push(token);
        if (token === "refresh-1") {
            storage.saveTokens({ refresh_token: "refresh-rotated" });
            return json(400, { error: "invalid_grant" });
        }
        return json(200, { access_token: "access-3", expires_in: 3600 });
    };
    assert.equal(await auth.getValidAccessToken(), "access-3");
    assert.deepEqual(used, ["refresh-1", "refresh-rotated"]);
    assert.equal(storage.getStoredTokens().refreshToken, "refresh-rotated");
});

test("diagnostic de session : aucun secret exposé", async () => {
    reset();
    const text = JSON.stringify(auth.getSpotifySessionDiagnostics());
    assert.ok(!text.includes("access-1"));
    assert.ok(!text.includes("refresh-1"));
});

test("Premium requis est distingué d’une session invalide", () => {
    const premium = Object.assign(new Error("Player command failed: Premium required"), { status: 403, reason: "PREMIUM_REQUIRED" });
    assert.equal(normalizeSpotifyErrorCode(premium), "SPOTIFY_PREMIUM_REQUIRED");
    assert.equal(classifyLaunchError(premium).code, "SPOTIFY_PREMIUM_REQUIRED");
    assert.equal(classifyLaunchError({ status: 401, message: "" }).code, "SPOTIFY_REAUTH_REQUIRED");
    assert.equal(describeSpotifyError({ code: "PREFERRED_DEVICE_UNAVAILABLE" }).code, "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE");
    for (const code of ["LAUNCH_TIMEOUT", "LAUNCH_CANCELLED", "PREFERRED_DEVICE_AMBIGUOUS", "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE", "SPOTIFY_DEVICE_RESTRICTED"]) {
        assert.equal(classifyLaunchError({ code, message: "x" }).code, code);
    }
});

test("Player : les commandes sont sérialisées dans l’ordre (previous → repeat)", async () => {
    const queue = createSpotifyPlayerCommandQueue();
    const log = [];
    const slow = (name, ms) => async () => {
        log.push(`start:${name}`);
        await new Promise((resolve) => setTimeout(resolve, ms));
        log.push(`end:${name}`);
        return name;
    };
    const results = await Promise.all([
        queue.enqueue("previous", slow("previous", 20)),
        queue.enqueue("repeat", slow("repeat", 1)),
        queue.enqueue("volume", slow("volume", 1))
    ]);
    assert.deepEqual(results, ["previous", "repeat", "volume"]);
    assert.deepEqual(log, ["start:previous", "end:previous", "start:repeat", "end:repeat", "start:volume", "end:volume"]);
});

test("Player : une commande en échec ne bloque pas la suivante (transfer → play)", async () => {
    const queue = createSpotifyPlayerCommandQueue();
    await assert.rejects(queue.enqueue("transfer", async () => { throw new Error("404"); }));
    assert.equal(await queue.enqueue("play", async () => "ok"), "ok");
    assert.equal(queue.getDiagnostics().lastCommand.label, "play");
});

test("Player : une commande bloquée est abandonnée après le délai", async () => {
    const queue = createSpotifyPlayerCommandQueue({ commandTimeoutMs: 1000 });
    const hung = queue.enqueue("seek", () => new Promise(() => {}));
    const next = queue.enqueue("shuffle", async () => "shuffle-ok");
    await assert.rejects(hung, (error) => error.code === "PLAYER_COMMAND_TIMEOUT");
    assert.equal(await next, "shuffle-ok");
});

test("spotify-api sérialise réellement les commandes Player concurrentes", async () => {
    reset();
    let inFlight = 0;
    let maxInFlight = 0;
    const order = [];
    globalThis.fetch = async (url) => {
        const path = new URL(url).pathname;
        order.push(path);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return new Response(null, { status: 204 });
    };
    await Promise.all([
        spotifyApi.skipToPrevious("dev"),
        spotifyApi.setPlaybackRepeat("context", "dev"),
        spotifyApi.seekPlayback(60000, "dev"),
        spotifyApi.setPlaybackVolume(63, "dev"),
        spotifyApi.addToPlaybackQueue("spotify:track:x", "dev")
    ]);
    assert.equal(maxInFlight, 1);
    assert.deepEqual(order, ["/v1/me/player/previous", "/v1/me/player/repeat", "/v1/me/player/seek", "/v1/me/player/volume", "/v1/me/player/queue"]);
});

test("Raccourci : un même requestId n’est lancé qu’une fois", () => {
    const local = new MemoryStorage();
    const id = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(claimShortcutRequest(local, id).accepted, true);
    const duplicate = claimShortcutRequest(local, id);
    assert.equal(duplicate.accepted, false);
    completeShortcutRequest(local, id, "success");
    assert.equal(claimShortcutRequest(local, id).previousStatus, "success");
    // Les anciens raccourcis sans requestId restent acceptés.
    assert.equal(claimShortcutRequest(local, "").accepted, true);
    assert.equal(claimShortcutRequest(local, "").accepted, true);
});

test("Raccourci : registre borné et expiré", () => {
    const local = new MemoryStorage();
    for (let index = 0; index < 60; index += 1) {
        claimShortcutRequest(local, `request-${String(index).padStart(4, "0")}`, { now: 1_000_000 + index });
    }
    assert.ok(JSON.parse(local.getItem("shuffleplus_shortcut_request_registry_v1")).length <= 40);
    assert.equal(claimShortcutRequest(local, "request-0059", { now: 1_000_000 + 7 * 3600 * 1000 }).accepted, true);
});

test("Raccourci : les statuts running sont ordonnés, limités, jamais après le final", async () => {
    const published = [];
    let clock = 0;
    const publisher = createShortcutProgressPublisher(async (outcome) => {
        await new Promise((resolve) => setTimeout(resolve, outcome.status === "running" ? 5 : 0));
        published.push(`${outcome.status}:${outcome.message || ""}`);
    }, { now: () => clock, minIntervalMs: 1000 });
    publisher.progress("Connexion Spotify…");
    clock = 100;
    publisher.progress("Recherche de l’iPhone…"); // ignoré : trop rapproché
    clock = 2000;
    publisher.progress("iPhone retrouvé…");
    publisher.finish({ status: "success", message: "ok" });
    clock = 5000;
    publisher.progress("Vérification…"); // ignoré : après le final
    await publisher.idle();
    assert.deepEqual(published, ["running:Connexion Spotify…", "running:iPhone retrouvé…", "success:ok"]);
});

test("Raccourci : délai global et annulation via AbortController", async () => {
    const scope = createLaunchAbortScope({ timeoutMs: 1000 });
    await new Promise((resolve) => scope.signal.addEventListener("abort", resolve, { once: true }));
    assert.equal(scope.signal.reason.code, "LAUNCH_TIMEOUT");
    scope.dispose();
    const cancelled = createLaunchAbortScope({ timeoutMs: 60_000 });
    cancelled.cancel();
    assert.equal(cancelled.signal.reason.code, "LAUNCH_CANCELLED");
    cancelled.dispose();
});

test("Raccourci : un requestId resté « running » après une coupure est signalé interrompu, jamais relancé", () => {
    const local = new MemoryStorage();
    const id = "550e8400-e29b-41d4-a716-446655440001";
    claimShortcutRequest(local, id, { now: 1_000_000 });
    const soon = claimShortcutRequest(local, id, { now: 1_010_000 });
    assert.equal(soon.accepted, false);
    assert.equal(soon.interrupted, false);
    const later = claimShortcutRequest(local, id, { now: 1_000_000 + 120_000 });
    assert.equal(later.accepted, false);
    assert.equal(later.interrupted, true);
    completeShortcutRequest(local, id, "success", { now: 1_000_000 + 200_000 });
    const done = claimShortcutRequest(local, id, { now: 1_000_000 + 240_000 });
    assert.equal(done.accepted, false);
    assert.equal(done.interrupted, false);
});
