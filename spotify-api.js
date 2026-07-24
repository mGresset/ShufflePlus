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

        if (response.status === 401) {
            throw new Error(
                "La session Spotify n'est plus valide."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Spotify refuse l'accès. Vérifie les autorisations de l'application."
            );
        }

        throw new Error(
            `Erreur Spotify ${response.status}.`
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
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

export async function getMyProfile() {
    return spotifyFetch("/me");
}