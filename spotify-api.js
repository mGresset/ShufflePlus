import { getValidAccessToken } from "./auth.js";
import {
    spotifyRequestManager
} from "./core/spotify-request-manager.js";

const API_BASE_URL = "https://api.spotify.com/v1";

function getSpotifyCacheTtl(endpoint, method = "GET") {
    if (String(method).toUpperCase() !== "GET") return 0;

    if (endpoint === "/me") return 5 * 60 * 1000;
    if (endpoint === "/me/player") return 4 * 1000;
    if (endpoint === "/me/player/devices") return 12 * 1000;
    if (endpoint === "/me/player/queue") return 8 * 1000;
    if (endpoint.startsWith("/me/playlists")) return 30 * 1000;
    if (endpoint.startsWith("/me/player/recently-played")) {
        return 60 * 1000;
    }
    if (endpoint.startsWith("/me/tracks")) return 30 * 1000;
    if (/^\/playlists\/[^/]+\/items/.test(endpoint)) {
        return 20 * 1000;
    }

    return 0;
}

function buildSpotifyRequestKey(endpoint, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const body = typeof options.body === "string"
        ? options.body
        : "";
    return `${method}:${endpoint}:${body}`;
}

async function spotifyFetch(endpoint, options = {}) {
    const {
        skipCache = false,
        cacheTtlMs: cacheTtlOverride,
        ...requestOptions
    } = options;
    const method = String(
        requestOptions.method || "GET"
    ).toUpperCase();
    const defaultCacheTtlMs = getSpotifyCacheTtl(
        endpoint,
        method
    );
    const cacheTtlMs = skipCache
        ? 0
        : Number.isFinite(Number(cacheTtlOverride))
            ? Math.max(0, Number(cacheTtlOverride))
            : defaultCacheTtlMs;

    return spotifyRequestManager.execute({
        key: buildSpotifyRequestKey(endpoint, requestOptions),
        method,
        cacheTtlMs,
        request: async () => {
            const token = await getValidAccessToken();

            if (!token) {
                throw new Error("Utilisateur non connecté à Spotify.");
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...requestOptions,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    ...requestOptions.headers
                }
            });

            if (!response.ok) {
                const errorBody = await response.text();

                let spotifyMessage = "";
                let spotifyReason = "";
                let parsedError = null;

                try {
                    parsedError = JSON.parse(errorBody);

                    spotifyMessage =
                        parsedError?.error?.message ||
                        parsedError?.error_description ||
                        parsedError?.message ||
                        "";

                    spotifyReason =
                        parsedError?.error?.reason ||
                        parsedError?.reason ||
                        "";
                } catch {
                    spotifyMessage = errorBody;
                }

                if (spotifyReason === "QUOTA_EXCEEDED") {
                    spotifyMessage =
                        "Le quota Spotify de l’application est temporairement épuisé. " +
                        "Shuffle+ suspend automatiquement les appels pour éviter de l’aggraver.";
                }

                console.error(
                    "Erreur Spotify API :",
                    response.status,
                    spotifyMessage || errorBody
                );

                const error = new Error(
                    spotifyMessage ||
                    `Erreur Spotify ${response.status}.`
                );

                error.status = response.status;
                error.details = errorBody;
                error.spotifyMessage = spotifyMessage;
                error.reason = spotifyReason;
                error.payload = parsedError;
                error.retryAfter = response.headers.get("Retry-After");

                throw error;
            }

            if (response.status === 204) {
                return null;
            }

            return response.json();
        }
    });
}

export function getSpotifyApiDiagnostics() {
    return spotifyRequestManager.getDiagnostics();
}

export function clearSpotifyApiMemoryCache() {
    spotifyRequestManager.clearCache();
}

export function resetSpotifyApiDiagnostics(options = {}) {
    spotifyRequestManager.resetDiagnostics(options);
}

export async function getMyProfile() {
    return spotifyFetch("/me");
}

export async function getMyPlaylists() {
    const playlists = [];
    let endpoint = "/me/playlists?limit=50";

    while (endpoint) {
        const page = await spotifyFetch(endpoint);

        if (Array.isArray(page.items)) {
            playlists.push(...page.items.filter(Boolean));
        }

        endpoint = page.next
            ? page.next.replace(API_BASE_URL, "")
            : null;
    }

    return playlists;
}

export async function getPlaylistItems(playlistId) {
    const tracks = [];

    let endpoint =
        `/playlists/${encodeURIComponent(playlistId)}` +
        "/items?limit=50&additional_types=track";

    while (endpoint) {
        const page = await spotifyFetch(endpoint);

        if (Array.isArray(page.items)) {
            for (const playlistItem of page.items) {
                const track =
                    playlistItem?.item ??
                    playlistItem?.track ??
                    null;

                if (
                    track &&
                    track.type === "track" &&
                    track.uri
                ) {
                    tracks.push(track);
                }
            }
        }

        endpoint = page.next
            ? page.next.replace(API_BASE_URL, "")
            : null;
    }

    return tracks;
}


export async function getPlaylistLastAddedAt(playlistId) {
    if (!playlistId) {
        throw new Error("Identifiant de playlist manquant.");
    }

    let latestTimestamp = 0;

    const fields = encodeURIComponent(
        "items(added_at),next"
    );

    let endpoint =
        `/playlists/${encodeURIComponent(playlistId)}` +
        `/items?limit=50&fields=${fields}`;

    while (endpoint) {
        const page = await spotifyFetchWithRetry(endpoint);

        if (Array.isArray(page.items)) {
            for (const playlistItem of page.items) {
                const timestamp = Date.parse(
                    playlistItem?.added_at || ""
                );

                if (
                    Number.isFinite(timestamp) &&
                    timestamp > latestTimestamp
                ) {
                    latestTimestamp = timestamp;
                }
            }
        }

        endpoint = page.next
            ? page.next.replace(API_BASE_URL, "")
            : null;
    }

    return latestTimestamp || null;
}



export async function getRecentlyPlayedPlaylistActivity(
    maxPages = 4
) {
    const activity = {};
    let endpoint =
        "/me/player/recently-played?limit=50";
    let pageCount = 0;

    while (endpoint && pageCount < maxPages) {
        const page = await spotifyFetchWithRetry(endpoint);
        pageCount += 1;

        if (Array.isArray(page?.items)) {
            for (const playedItem of page.items) {
                const context = playedItem?.context;
                const contextUri = context?.uri || "";

                if (
                    context?.type !== "playlist" ||
                    !contextUri.startsWith("spotify:playlist:")
                ) {
                    continue;
                }

                const playlistId = contextUri.split(":").at(-1);
                const timestamp = Date.parse(
                    playedItem?.played_at || ""
                );

                if (
                    !playlistId ||
                    !Number.isFinite(timestamp)
                ) {
                    continue;
                }

                activity[playlistId] = Math.max(
                    Number(activity[playlistId] || 0),
                    timestamp
                );
            }
        }

        endpoint = page?.next
            ? page.next.replace(API_BASE_URL, "")
            : null;
    }

    return activity;
}

export async function getMySavedTracks() {
    const tracks = [];
    let endpoint = "/me/tracks?limit=50";

    while (endpoint) {
        const page = await spotifyFetch(endpoint);

        if (Array.isArray(page.items)) {
            for (const savedItem of page.items) {
                const track =
                    savedItem?.track ??
                    savedItem?.item ??
                    null;

                if (
                    track &&
                    track.type === "track" &&
                    track.uri
                ) {
                    tracks.push(track);
                }
            }
        }

        endpoint = page.next
            ? page.next.replace(API_BASE_URL, "")
            : null;
    }

    return tracks;
}

export async function getAvailableDevices({
    fresh = false
} = {}) {
    const data = await spotifyFetch(
        "/me/player/devices",
        { skipCache: Boolean(fresh) }
    );

    return Array.isArray(data?.devices)
        ? data.devices.filter(
            (device) => device?.id && !device.is_restricted
        )
        : [];
}

export async function transferPlayback(
    deviceId,
    play = false
) {
    if (!deviceId) {
        throw new Error(
            "Aucun appareil Spotify n’a été sélectionné."
        );
    }

    await spotifyFetch(
        "/me/player",
        {
            method: "PUT",
            body: JSON.stringify({
                device_ids: [deviceId],
                play
            })
        }
    );
}

export async function setPlaybackShuffle(enabled, deviceId = "") {
    const parameters = new URLSearchParams({
        state: String(enabled)
    });

    if (deviceId) {
        parameters.set("device_id", deviceId);
    }

    await spotifyFetch(
        `/me/player/shuffle?${parameters.toString()}`,
        { method: "PUT" }
    );
}

export async function startPlayback(trackUris, deviceId = "") {
    const uris = trackUris.filter(Boolean);

    if (!uris.length) {
        throw new Error("Aucun morceau ne peut être lu.");
    }

    const parameters = new URLSearchParams();

    if (deviceId) {
        parameters.set("device_id", deviceId);
    }

    const query = parameters.toString();

    await spotifyFetch(
        `/me/player/play${query ? `?${query}` : ""}`,
        {
            method: "PUT",
            body: JSON.stringify({ uris })
        }
    );
}


export async function getCurrentPlayback({
    fresh = false
} = {}) {
    return spotifyFetch("/me/player", {
        skipCache: Boolean(fresh)
    });
}

export async function getPlaybackQueue({
    fresh = false
} = {}) {
    return spotifyFetch("/me/player/queue", {
        skipCache: Boolean(fresh)
    });
}

function buildPlaybackDeviceQuery(deviceId = "") {
    const parameters = new URLSearchParams();

    if (deviceId) {
        parameters.set("device_id", deviceId);
    }

    const query = parameters.toString();
    return query ? `?${query}` : "";
}

export async function resumePlayback(deviceId = "") {
    await spotifyFetch(
        `/me/player/play${buildPlaybackDeviceQuery(deviceId)}`,
        { method: "PUT" }
    );
}

export async function pausePlayback(deviceId = "") {
    await spotifyFetch(
        `/me/player/pause${buildPlaybackDeviceQuery(deviceId)}`,
        { method: "PUT" }
    );
}

export async function skipToNext(deviceId = "") {
    await spotifyFetch(
        `/me/player/next${buildPlaybackDeviceQuery(deviceId)}`,
        { method: "POST" }
    );
}

function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

async function spotifyFetchWithRetry(
    endpoint,
    options = {},
    maxAttempts = 3
) {
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            return await spotifyFetch(endpoint, options);
        } catch (error) {
            attempt += 1;

            if (
                error.status !== 429 ||
                error.reason === "QUOTA_EXCEEDED" ||
                attempt >= maxAttempts
            ) {
                throw error;
            }

            const retryAfterSeconds =
                Number(error.retryAfter) ||
                (2 ** (attempt - 1));

            await wait(retryAfterSeconds * 1000 + 25);
        }
    }

    throw new Error("La requête Spotify n’a pas abouti.");
}

export async function createPrivatePlaylist(
    name,
    description = ""
) {
    const normalizedName = String(name || "").trim();

    if (!normalizedName) {
        throw new Error(
            "Donne un nom à la playlist avant de l’enregistrer."
        );
    }

    return spotifyFetch("/me/playlists", {
        method: "POST",
        body: JSON.stringify({
            name: normalizedName,
            public: false,
            collaborative: false,
            description: String(description || "").trim()
        })
    });
}

export async function addItemsToPlaylist(
    playlistId,
    itemUris,
    onProgress = null
) {
    const uris = itemUris.filter(Boolean);

    if (!playlistId) {
        throw new Error("Identifiant de playlist manquant.");
    }

    if (!uris.length) {
        throw new Error(
            "Aucun morceau ne peut être ajouté à la playlist."
        );
    }

    const batchSize = 100;
    let addedCount = 0;

    for (
        let startIndex = 0;
        startIndex < uris.length;
        startIndex += batchSize
    ) {
        const batch = uris.slice(
            startIndex,
            startIndex + batchSize
        );

        await spotifyFetchWithRetry(
            `/playlists/${encodeURIComponent(playlistId)}/items`,
            {
                method: "POST",
                body: JSON.stringify({
                    uris: batch
                })
            }
        );

        addedCount += batch.length;

        if (typeof onProgress === "function") {
            onProgress({
                addedCount,
                totalCount: uris.length
            });
        }
    }

    return {
        addedCount,
        totalCount: uris.length
    };
}

