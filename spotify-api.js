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

        console.error(
            "Erreur Spotify API :",
            response.status,
            errorBody
        );

        const error = new Error(
            `Erreur Spotify ${response.status}.`
        );

        error.status = response.status;
        error.details = errorBody;

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
            playlists.push(
                ...page.items.filter(Boolean)
            );
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
                /*
                 * Le nouveau format utilise playlistItem.item.
                 * Le format précédent utilisait playlistItem.track.
                 */
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