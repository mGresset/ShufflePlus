import { getValidAccessToken } from "./auth.js";

const API = "https://api.spotify.com/v1";

async function spotifyFetch(endpoint) {

    const token = await getValidAccessToken();

    if (!token)
        throw new Error("Utilisateur non connecté.");

    const response = await fetch(API + endpoint, {

        headers: {
            Authorization: `Bearer ${token}`
        }

    });

    if (!response.ok)
        throw new Error("Erreur Spotify");

    return response.json();

}

export async function getMyPlaylists() {

    const playlists = [];

    let url = "/me/playlists?limit=50";

    while (url) {

        const page = await spotifyFetch(url);

        playlists.push(...page.items);

        url = page.next
            ? page.next.replace(API, "")
            : null;

    }

    return playlists;

}