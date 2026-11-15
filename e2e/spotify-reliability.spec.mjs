import { test, expect } from "@playwright/test";
import { seedConnectedSpotify } from "./helpers.mjs";

// Scénarios critiques v12 : aucun vrai compte Spotify, tout est simulé.
const RAILWAY = "https://shuffleplus-e2e.up.railway.app";
const REQUEST_ID = "550e8400-e29b-41d4-a716-446655440000";
const RESULT_TOKEN = "68b19b94-19a4-4ef6-83ac-6d932eea7f47";
const PLAYLIST_ID = "playlist-e2e-1";
const IPHONE_A = { id: "iphone-device-A", name: "iPhone E2E", type: "Smartphone" };
const IPHONE_B = { ...IPHONE_A, id: "iphone-device-B" };
const MAC = { id: "mac-device-1", name: "MacBook E2E", type: "Computer" };

function device(base, extra = {}) {
    return {
        is_active: false,
        is_private_session: false,
        is_restricted: false,
        volume_percent: 50,
        supports_volume: true,
        ...base,
        ...extra
    };
}

function track() {
    return {
        id: "track-e2e-1",
        uri: "spotify:track:track-e2e-1",
        type: "track",
        name: "One More Test",
        duration_ms: 180_000,
        artists: [{ id: "artist-e2e-1", name: "Daft Test" }],
        album: { id: "album-e2e-1", name: "Album Test", images: [] },
        external_urls: { spotify: "https://open.spotify.com/track/track-e2e-1" }
    };
}

async function seedPreferredV11Device(page, preferred = IPHONE_A) {
    await page.addInitScript(({ preferred }) => {
        // Format historique v11 : { id, name, type } choisi par l’utilisateur.
        localStorage.setItem(
            "shuffleplus_preferred_spotify_device_v1",
            JSON.stringify({ ...preferred, savedAt: Date.now() - 86_400_000, lastSeenAt: Date.now() - 86_400_000 })
        );
        localStorage.setItem(
            "shuffleplus_mix_profiles_v1",
            localStorage.getItem("shuffleplus_mix_profiles_v1") || "[]"
        );
    }, { preferred });
}

// Simule Spotify + Railway. `devicesAfterLaunch(n)` reçoit le numéro d’appel
// /me/player/devices depuis le début du lancement Raccourci.
async function mockLaunchBackends(page, {
    devicesAfterLaunch,
    playbackBeforePlay = null,
    transferStatusFor = () => 204
}) {
    const spotifyCalls = [];
    const railwayPosts = [];
    const state = { launchStarted: false, devicesCalls: 0, playingOn: null };

    await page.route(`${RAILWAY}/**`, async (route) => {
        const request = route.request();
        if (request.method() === "POST") {
            const body = JSON.parse(request.postData() || "{}");
            railwayPosts.push(body);
            state.launchStarted = true;
            await route.fulfill({
                status: body.status === "running" ? 202 : 201,
                contentType: "application/json",
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ accepted: true, status: body.status })
            });
            return;
        }
        await route.fulfill({
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, content-type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            },
            body: ""
        });
    });

    await page.route("https://api.spotify.com/v1/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace(/^\/v1/, "") || "/";
        const method = request.method();
        const call = { method, path, search: url.search, postData: request.postData() || "", launch: state.launchStarted };
        spotifyCalls.push(call);
        const fulfillJson = (body, status = 200) => route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(body)
        });

        if (method === "PUT" && path === "/me/player") {
            const target = JSON.parse(call.postData || "{}").device_ids?.[0] || "";
            const status = transferStatusFor(target);
            if (status >= 400) {
                await fulfillJson({ error: { status, message: "Device not found" } }, status);
                return;
            }
            await route.fulfill({ status: 204, body: "" });
            return;
        }
        if (method === "PUT" && path === "/me/player/play") {
            state.playingOn = url.searchParams.get("device_id");
            await route.fulfill({ status: 204, body: "" });
            return;
        }
        if (method !== "GET") {
            await route.fulfill({ status: 204, body: "" });
            return;
        }
        if (path === "/me") {
            await fulfillJson({ id: "shuffleplus-e2e-user", display_name: "Test E2E", product: "premium" });
            return;
        }
        if (path === "/me/playlists") {
            await fulfillJson({
                items: [{
                    id: PLAYLIST_ID,
                    uri: `spotify:playlist:${PLAYLIST_ID}`,
                    name: "Road Trip E2E",
                    public: false,
                    collaborative: false,
                    owner: { id: "shuffleplus-e2e-user", display_name: "Test E2E" },
                    tracks: { total: 3 },
                    images: [],
                    external_urls: { spotify: `https://open.spotify.com/playlist/${PLAYLIST_ID}` }
                }],
                next: null
            });
            return;
        }
        if (path === "/me/player/devices") {
            if (!state.launchStarted) {
                await fulfillJson({ devices: [] });
                return;
            }
            state.devicesCalls += 1;
            await fulfillJson({ devices: devicesAfterLaunch(state.devicesCalls) });
            return;
        }
        if (path === "/me/player") {
            if (state.playingOn) {
                const playingDevice = [IPHONE_A, IPHONE_B, MAC].find((item) => item.id === state.playingOn) ||
                    { id: state.playingOn, name: "Inconnu", type: "Unknown" };
                await fulfillJson({
                    is_playing: true,
                    progress_ms: 1_000,
                    shuffle_state: true,
                    repeat_state: "off",
                    context: { uri: `spotify:playlist:${PLAYLIST_ID}` },
                    device: device(playingDevice, { is_active: true }),
                    item: track()
                });
                return;
            }
            if (playbackBeforePlay) {
                await fulfillJson(playbackBeforePlay);
                return;
            }
            await route.fulfill({ status: 204, body: "" });
            return;
        }
        if (path === "/me/player/queue") {
            await fulfillJson({ currently_playing: null, queue: [] });
            return;
        }
        await fulfillJson({ items: [], next: null });
    });

    return { spotifyCalls, railwayPosts, state };
}

function shortcutUrl() {
    const params = new URLSearchParams({
        action: "quickplay",
        playlist: PLAYLIST_ID,
        autoplay: "1",
        requestId: REQUEST_ID,
        resultToken: RESULT_TOKEN,
        resultServer: RAILWAY
    });
    return `/?${params.toString()}`;
}

async function readPreferredIdentity(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem("shuffleplus_preferred_spotify_device_v2") || "null"));
}

test("Raccourci : iPhone retrouvé automatiquement quand Spotify renouvelle son device_id (A → B)", async ({ page }) => {
    test.setTimeout(60_000);
    await seedConnectedSpotify(page);
    await seedPreferredV11Device(page, IPHONE_A);
    const { spotifyCalls, railwayPosts } = await mockLaunchBackends(page, {
        // Spotify Connect se réveille : deux réponses vides, puis l’iPhone
        // réapparaît avec un NOUVEL identifiant.
        devicesAfterLaunch: (call) => (call <= 2 ? [] : [device(IPHONE_B)])
    });

    await page.goto(shortcutUrl(), { waitUntil: "domcontentloaded" });

    await expect.poll(
        () => railwayPosts.find((post) => post.status !== "running") || null,
        { timeout: 40_000 }
    ).not.toBeNull();

    const final = railwayPosts.find((post) => post.status !== "running");
    expect(final.status).toBe("success");
    expect(final.device).toBe("iPhone E2E");
    expect(railwayPosts.some((post) => post.status === "running")).toBe(true);
    expect(railwayPosts.findIndex((post) => post.status !== "running")).toBe(railwayPosts.length - 1);

    const launchCalls = spotifyCalls.filter((call) => call.launch);
    const transfers = launchCalls.filter((call) => call.method === "PUT" && call.path === "/me/player");
    const plays = launchCalls.filter((call) => call.method === "PUT" && call.path === "/me/player/play");
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((call) => call.postData.includes(IPHONE_B.id))).toBe(true);
    expect(plays.length).toBeGreaterThan(0);
    expect(plays.every((call) => call.search.includes(`device_id=${IPHONE_B.id}`))).toBe(true);

    const identity = await readPreferredIdentity(page);
    expect(identity.currentSpotifyDeviceId).toBe(IPHONE_B.id);
    expect(identity.displayName).toBe("iPhone E2E");
    expect(identity.userConfirmed).toBe(true);
    expect(identity.knownSpotifyDeviceIds.map((entry) => entry.id).sort()).toEqual([IPHONE_A.id, IPHONE_B.id]);
    expect(identity.lastSuccessfulAt).toBeGreaterThan(0);

    // L’URL du raccourci est nettoyée après le lancement.
    await expect.poll(() => new URL(page.url()).searchParams.get("requestId")).toBeNull();
});

test("Raccourci strict : iPhone absent et Mac disponible → aucune commande vers le Mac", async ({ page }) => {
    test.setTimeout(75_000);
    await seedConnectedSpotify(page);
    await seedPreferredV11Device(page, IPHONE_A);
    const { spotifyCalls, railwayPosts } = await mockLaunchBackends(page, {
        devicesAfterLaunch: () => [device(MAC, { is_active: true })],
        playbackBeforePlay: {
            is_playing: true,
            progress_ms: 1_000,
            context: null,
            device: device(MAC, { is_active: true }),
            item: track()
        },
        // L’ancien ID de l’iPhone n’est plus connu de Spotify.
        transferStatusFor: (id) => (id === IPHONE_A.id ? 404 : 204)
    });

    await page.goto(shortcutUrl(), { waitUntil: "domcontentloaded" });

    await expect.poll(
        () => railwayPosts.find((post) => post.status !== "running") || null,
        { timeout: 60_000 }
    ).not.toBeNull();

    const final = railwayPosts.find((post) => post.status !== "running");
    expect(final.status).toBe("error");
    expect(final.code).toBe("PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE");

    const commandsToMac = spotifyCalls.filter((call) =>
        call.method !== "GET" &&
        (call.postData.includes(MAC.id) || call.search.includes(MAC.id))
    );
    expect(commandsToMac).toEqual([]);
    expect(spotifyCalls.some((call) => call.method === "PUT" && call.path === "/me/player/play")).toBe(false);

    const identity = await readPreferredIdentity(page);
    expect(identity.currentSpotifyDeviceId).toBe(IPHONE_A.id);
    expect(identity.displayName).toBe("iPhone E2E");
    await expect(page.locator("[data-launch-error-code]")).toHaveAttribute(
        "data-launch-error-code",
        "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE"
    );
});

test("Raccourci : une seconde ouverture du même requestId ne relance rien", async ({ page }) => {
    test.setTimeout(60_000);
    await seedConnectedSpotify(page);
    await seedPreferredV11Device(page, IPHONE_A);
    const { spotifyCalls, railwayPosts } = await mockLaunchBackends(page, {
        devicesAfterLaunch: () => [device(IPHONE_A)]
    });

    await page.goto(shortcutUrl(), { waitUntil: "domcontentloaded" });
    await expect.poll(
        () => railwayPosts.find((post) => post.status === "success") || null,
        { timeout: 40_000 }
    ).not.toBeNull();
    const playsAfterFirst = spotifyCalls.filter((call) => call.method === "PUT" && call.path === "/me/player/play").length;
    const postsAfterFirst = railwayPosts.length;

    await page.goto(shortcutUrl(), { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveClass(/is-connected/);
    await expect.poll(() => new URL(page.url()).searchParams.get("requestId")).toBeNull();

    expect(spotifyCalls.filter((call) => call.method === "PUT" && call.path === "/me/player/play").length).toBe(playsAfterFirst);
    expect(railwayPosts.length).toBe(postsAfterFirst);
});

test("Session : API 401 puis refresh invalid_grant → reconnexion propre, données conservées", async ({ page }) => {
    await seedConnectedSpotify(page);
    await seedPreferredV11Device(page, IPHONE_A);
    await page.addInitScript(() => {
        localStorage.setItem("shuffleplus_refresh_token", "shuffleplus-e2e-refresh");
    });
    let tokenRequests = 0;
    await page.route("https://accounts.spotify.com/api/token", async (route) => {
        tokenRequests += 1;
        await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "invalid_grant", error_description: "Refresh token revoked" })
        });
    });
    await page.route("https://api.spotify.com/v1/**", async (route) => {
        await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ error: { status: 401, message: "The access token expired" } })
        });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#loginButton")).toHaveText(/Se reconnecter à Spotify/);
    await expect(page.locator("#status")).toContainText(/conservés/);
    expect(tokenRequests).toBe(1);

    const stored = await page.evaluate(() => ({
        preferredV1: localStorage.getItem("shuffleplus_preferred_spotify_device_v1"),
        preferredV2: localStorage.getItem("shuffleplus_preferred_spotify_device_v2"),
        profiles: localStorage.getItem("shuffleplus_mix_profiles_v1"),
        refresh: localStorage.getItem("shuffleplus_refresh_token")
    }));
    expect(stored.preferredV1).toContain(IPHONE_A.id);
    expect(stored.preferredV2).toContain(IPHONE_A.id);
    expect(stored.profiles).not.toBeNull();
    expect(stored.refresh).toBeNull();
});

test("Appareil préféré : la carte affiche l’identité logique sans exposer le device_id", async ({ page }) => {
    await seedConnectedSpotify(page);
    await seedPreferredV11Device(page, IPHONE_A);
    await mockLaunchBackends(page, { devicesAfterLaunch: () => [] });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveClass(/is-connected/);

    const markup = await page.evaluate(async () => {
        const module = await import("./core/spotify-reliability.js");
        const controller = module.createPreferredDeviceController();
        return module.renderPreferredDevicePanelMarkup({
            controller,
            availableDevices: [],
            escapeHtml: (value) => String(value)
        });
    });
    expect(markup).toContain("iPhone E2E");
    expect(markup).toContain("Géré automatiquement");
    expect(markup).not.toContain(IPHONE_A.id);
    expect(markup).toContain("Rechercher maintenant");
    expect(markup).toContain("Réassocier");
});

test("Appareil préféré : carte réelle utilisable au doigt, sans débordement horizontal", async ({ page }) => {
    await seedConnectedSpotify(page);
    await seedPreferredV11Device(page, IPHONE_A);
    await mockLaunchBackends(page, { devicesAfterLaunch: () => [] });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveClass(/is-connected/);

    await page.locator('button[data-app-menu="mixes"]').first().click();
    const card = page.locator("[data-preferred-device-card]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card.locator("[data-preferred-device-name]")).toContainText("iPhone E2E");
    await expect(card).toContainText("Géré automatiquement");
    await expect(card).not.toContainText(IPHONE_A.id);

    for (const selector of [
        "#refreshPreferredSpotifyDevicesButton",
        "#testPreferredSpotifyDeviceButton",
        "#savePreferredSpotifyDeviceButton",
        "#clearPreferredSpotifyDeviceButton"
    ]) {
        const box = await card.locator(selector).boundingBox();
        expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }

    const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    if (process.env.SHUFFLEPLUS_CAPTURE_DIR) {
        await card.screenshot({
            path: `${process.env.SHUFFLEPLUS_CAPTURE_DIR}/preferred-device-${test.info().project.name}.png`
        });
    }

    // « Oublier » exige une confirmation explicite : un refus ne supprime rien.
    page.once("dialog", (dialog) => dialog.dismiss());
    await card.locator("#clearPreferredSpotifyDeviceButton").click();
    await expect.poll(() => page.evaluate(() =>
        localStorage.getItem("shuffleplus_preferred_spotify_device_v2")
    )).toContain(IPHONE_A.id);
});

test("Mise à jour v11 → v12 : tokens, profils, mix, routines conservés et iPhone migré", async ({ page }) => {
    await seedConnectedSpotify(page);
    await page.addInitScript(({ preferred }) => {
        if (sessionStorage.getItem("v11-seeded")) return;
        sessionStorage.setItem("v11-seeded", "1");
        const now = Date.now();
        localStorage.setItem("shuffleplus_refresh_token", "shuffleplus-e2e-refresh");
        localStorage.setItem("shuffleplus_preferred_spotify_device_v1", JSON.stringify({ ...preferred, savedAt: now - 86_400_000 }));
        localStorage.setItem("shuffleplus_saved_mixes_v1", JSON.stringify([{ id: "mix-v11", name: "Mix v11", sources: [], createdAt: now }]));
        localStorage.setItem("shuffleplus_mix_profiles_v1", JSON.stringify([{ id: "profile-v11", name: "Profil v11" }]));
        localStorage.setItem("shuffleplus_mix_schedules_v1", JSON.stringify([{ id: "routine-v11", name: "Routine v11", enabled: false }]));
        localStorage.setItem("shuffleplus_storage_schema_v1", JSON.stringify({ schemaVersion: 3, appVersion: "11.13.0" }));
    }, { preferred: IPHONE_A });
    await mockLaunchBackends(page, { devicesAfterLaunch: () => [] });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveClass(/is-connected/);

    const stored = await page.evaluate(() => Object.fromEntries(
        [
            "shuffleplus_access_token",
            "shuffleplus_refresh_token",
            "shuffleplus_saved_mixes_v1",
            "shuffleplus_mix_profiles_v1",
            "shuffleplus_mix_schedules_v1",
            "shuffleplus_preferred_spotify_device_v1",
            "shuffleplus_preferred_spotify_device_v2",
            "shuffleplus_preferred_spotify_device_v1_backup"
        ].map((key) => [key, localStorage.getItem(key)])
    ));
    expect(stored.shuffleplus_access_token).toBe("shuffleplus-e2e-token");
    expect(stored.shuffleplus_refresh_token).toBe("shuffleplus-e2e-refresh");
    expect(stored.shuffleplus_saved_mixes_v1).toContain("mix-v11");
    expect(stored.shuffleplus_mix_profiles_v1).toContain("profile-v11");
    expect(stored.shuffleplus_mix_schedules_v1).toContain("routine-v11");
    expect(stored.shuffleplus_preferred_spotify_device_v1).toContain(IPHONE_A.id);
    expect(stored.shuffleplus_preferred_spotify_device_v1_backup).toContain(IPHONE_A.id);
    const identity = JSON.parse(stored.shuffleplus_preferred_spotify_device_v2);
    expect(identity.schemaVersion).toBe(2);
    expect(identity.currentSpotifyDeviceId).toBe(IPHONE_A.id);
    expect(identity.userConfirmed).toBe(true);
    expect(identity.migratedFrom).toBe("v1");

    // Rechargement : la migration est idempotente (même identité logique).
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveClass(/is-connected/);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("shuffleplus_preferred_spotify_device_v2")));
    expect(after.logicalId).toBe(identity.logicalId);
});
