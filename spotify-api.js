import { getValidAccessToken } from "./auth.js";

const API_BASE_URL = "https://api.spotify.com/v1";

async function spotifyFetch(endpoint, options = {}) {
    const token = await getValidAccessToken();

    if (!token) {
        throw new Error("Utilisateur non connecté à Spotify.");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorBody = await response.text();

        let spotifyMessage = "";

        try {
            const parsedError = JSON.parse(errorBody);

            spotifyMessage =
                parsedError?.error?.message ||
                parsedError?.error_description ||
                parsedError?.message ||
                "";
        } catch {
            spotifyMessage = errorBody;
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
        error.retryAfter = response.headers.get("Retry-After");

        throw error;
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
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

export async function getAvailableDevices() {
    const data = await spotifyFetch("/me/player/devices");

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
                attempt >= maxAttempts
            ) {
                throw error;
            }

            const retryAfterSeconds =
                Number(error.retryAfter) ||
                (2 ** (attempt - 1));

            await wait(retryAfterSeconds * 1000);
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

