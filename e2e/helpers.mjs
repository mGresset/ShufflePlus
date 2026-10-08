import { expect } from "@playwright/test";

export const E2E_CLIENT_ID = "12345678901234567890123456789012";

export async function seedConnectedSpotify(page) {
    await page.addInitScript(({ clientId }) => {
        const now = Date.now();
        localStorage.setItem(
            "shuffleplus_spotify_app_config_v1",
            JSON.stringify({
                clientId,
                redirectUri: "http://127.0.0.1:5500/",
                source: "user",
                configuredAt: now,
                updatedAt: now
            })
        );
        localStorage.setItem("shuffleplus_access_token", "shuffleplus-e2e-token");
        localStorage.setItem("shuffleplus_expires_at", String(now + 3_600_000));
        localStorage.setItem("shuffleplus_authorized_at", String(now));
    }, { clientId: E2E_CLIENT_ID });
}

function spotifyTrack(overrides = {}) {
    return {
        id: "track-e2e-1",
        uri: "spotify:track:track-e2e-1",
        type: "track",
        name: "One More Test",
        duration_ms: 180_000,
        explicit: false,
        is_playable: true,
        artists: [{ id: "artist-e2e-1", name: "Daft Test" }],
        album: {
            id: "album-e2e-1",
            uri: "spotify:album:album-e2e-1",
            name: "Album Test",
            images: []
        },
        external_urls: {
            spotify: "https://open.spotify.com/track/track-e2e-1"
        },
        ...overrides
    };
}

function searchPayload() {
    return {
        tracks: {
            items: [spotifyTrack({
                id: "yellow-e2e",
                uri: "spotify:track:yellow-e2e",
                name: "Yellow Test",
                artists: [{ id: "cold-e2e", name: "Cold Test" }],
                album: {
                    id: "parachute-e2e",
                    uri: "spotify:album:parachute-e2e",
                    name: "Parachute Test",
                    images: []
                },
                external_urls: {
                    spotify: "https://open.spotify.com/track/yellow-e2e"
                }
            })],
            next: null
        },
        albums: {
            items: [],
            next: null
        },
        artists: {
            items: [],
            next: null
        }
    };
}

export async function mockSpotifyApi(page) {
    const calls = [];

    await page.route("https://api.spotify.com/v1/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace(/^\/v1/, "") || "/";
        const method = request.method();

        calls.push({
            method,
            path,
            search: url.search,
            postData: request.postData() || ""
        });

        if (method !== "GET") {
            await route.fulfill({ status: 204, body: "" });
            return;
        }

        let body = {};

        if (path === "/me") {
            body = {
                id: "shuffleplus-e2e-user",
                display_name: "Test E2E",
                product: "premium"
            };
        } else if (path === "/me/playlists") {
            body = {
                items: [{
                    id: "playlist-e2e-1",
                    uri: "spotify:playlist:playlist-e2e-1",
                    name: "Road Trip E2E",
                    description: "Playlist de validation navigateur",
                    public: false,
                    collaborative: false,
                    owner: { id: "shuffleplus-e2e-user", display_name: "Test E2E" },
                    tracks: { total: 3 },
                    images: [],
                    external_urls: {
                        spotify: "https://open.spotify.com/playlist/playlist-e2e-1"
                    }
                }],
                next: null
            };
        } else if (path === "/me/player/devices") {
            body = {
                devices: [{
                    id: "device-e2e-1",
                    name: "iPhone E2E",
                    type: "Smartphone",
                    is_active: true,
                    is_private_session: false,
                    is_restricted: false,
                    volume_percent: 42
                }]
            };
        } else if (path === "/me/player") {
            body = {
                is_playing: true,
                progress_ms: 30_000,
                repeat_state: "off",
                shuffle_state: true,
                context: { uri: "spotify:playlist:playlist-e2e-1" },
                device: {
                    id: "device-e2e-1",
                    name: "iPhone E2E",
                    type: "Smartphone",
                    is_active: true,
                    is_restricted: false,
                    volume_percent: 42
                },
                item: spotifyTrack()
            };
        } else if (path === "/me/player/queue") {
            body = {
                currently_playing: spotifyTrack(),
                queue: [
                    spotifyTrack({
                        id: "track-e2e-2",
                        uri: "spotify:track:track-e2e-2",
                        name: "Next Test"
                    })
                ]
            };
        } else if (path === "/me/player/recently-played") {
            body = { items: [], next: null };
        } else if (path === "/me/tracks") {
            body = { items: [], next: null };
        } else if (path === "/search") {
            body = searchPayload();
        } else if (/^\/playlists\/[^/]+\/items$/.test(path)) {
            body = {
                items: [
                    { added_at: "2026-10-01T10:00:00Z", item: spotifyTrack() },
                    { added_at: "2026-10-02T10:00:00Z", item: spotifyTrack({
                        id: "track-e2e-2",
                        uri: "spotify:track:track-e2e-2",
                        name: "Next Test"
                    }) }
                ],
                next: null
            };
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(body)
        });
    });

    return calls;
}

export async function gotoConnectedApp(page) {
    await seedConnectedSpotify(page);
    const calls = await mockSpotifyApi(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveClass(/is-connected/);
    await expect(page.locator("#welcome")).toContainText("Test E2E");
    return calls;
}

export async function waitForSpotifyCall(calls, predicate, timeoutMs = 5_000) {
    await expect.poll(
        () => calls.find(predicate) || null,
        { timeout: timeoutMs }
    ).not.toBeNull();
    return calls.find(predicate);
}
