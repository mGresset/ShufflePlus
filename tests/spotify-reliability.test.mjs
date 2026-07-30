import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
    #values = new Map();

    getItem(key) {
        return this.#values.has(key)
            ? this.#values.get(key)
            : null;
    }

    setItem(key, value) {
        this.#values.set(key, String(value));
    }

    removeItem(key) {
        this.#values.delete(key);
    }

    clear() {
        this.#values.clear();
    }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.location = {
    hostname: "127.0.0.1"
};
globalThis.window = {
    setTimeout
};

const storage = await import("../storage.js");
const auth = await import("../auth.js");
const spotifyApi = await import("../spotify-api.js");

function resetStorage() {
    localStorage.clear();
    sessionStorage.clear();
}

test("l’autorisation initiale conserve sa date", () => {
    resetStorage();

    storage.saveTokens(
        {
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 3600
        },
        { markAuthorization: true }
    );

    const tokens = storage.getStoredTokens();

    assert.equal(tokens.accessToken, "access");
    assert.equal(tokens.refreshToken, "refresh");
    assert.ok(tokens.authorizedAt > 0);
});

test("invalid_grant supprime la session et demande une reconnexion", async () => {
    resetStorage();

    storage.saveTokens(
        {
            access_token: "expired-access",
            refresh_token: "expired-refresh",
            expires_in: -1
        },
        { markAuthorization: true }
    );

    globalThis.fetch = async () => new Response(
        JSON.stringify({ error: "invalid_grant" }),
        {
            status: 400,
            headers: { "Content-Type": "application/json" }
        }
    );

    await assert.rejects(
        auth.getValidAccessToken(),
        (error) => {
            assert.equal(error.code, "SPOTIFY_REAUTH_REQUIRED");
            return true;
        }
    );

    const tokens = storage.getStoredTokens();
    assert.equal(tokens.accessToken, null);
    assert.equal(tokens.refreshToken, null);
    assert.equal(tokens.authorizedAt, 0);
});

test("plusieurs appels simultanés ne renouvellent le token qu’une fois", async () => {
    resetStorage();

    storage.saveTokens({
        access_token: "expired-access",
        refresh_token: "valid-refresh",
        expires_in: -1
    });

    let refreshCalls = 0;

    globalThis.fetch = async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));

        return new Response(
            JSON.stringify({
                access_token: "new-access",
                expires_in: 3600
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );
    };

    const tokens = await Promise.all([
        auth.getValidAccessToken(),
        auth.getValidAccessToken(),
        auth.getValidAccessToken()
    ]);

    assert.deepEqual(tokens, [
        "new-access",
        "new-access",
        "new-access"
    ]);
    assert.equal(refreshCalls, 1);
});

test("QUOTA_EXCEEDED n’est pas retenté", async () => {
    resetStorage();

    storage.saveTokens({
        access_token: "valid-access",
        refresh_token: "valid-refresh",
        expires_in: 3600
    });

    let apiCalls = 0;

    globalThis.fetch = async () => {
        apiCalls += 1;

        return new Response(
            JSON.stringify({
                error: {
                    status: 429,
                    message: "Too many requests",
                    reason: "QUOTA_EXCEEDED"
                }
            }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": "1"
                }
            }
        );
    };

    await assert.rejects(
        spotifyApi.getPlaylistLastAddedAt("playlist-id"),
        (error) => {
            assert.equal(error.status, 429);
            assert.equal(error.reason, "QUOTA_EXCEEDED");
            assert.match(error.message, /quota Spotify/i);
            return true;
        }
    );

    assert.equal(apiCalls, 1);
});

test("un rate limit classique respecte Retry-After puis recommence", async () => {
    resetStorage();

    storage.saveTokens({
        access_token: "valid-access",
        refresh_token: "valid-refresh",
        expires_in: 3600
    });

    let apiCalls = 0;

    globalThis.fetch = async () => {
        apiCalls += 1;

        if (apiCalls === 1) {
            return new Response(
                JSON.stringify({
                    error: {
                        status: 429,
                        message: "Too many requests"
                    }
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": "0.001"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({ items: [], next: null }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );
    };

    const result = await spotifyApi.getPlaylistLastAddedAt("playlist-id");

    assert.equal(result, null);
    assert.equal(apiCalls, 2);
});
