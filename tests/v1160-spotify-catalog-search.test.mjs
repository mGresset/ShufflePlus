import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    normalizeSpotifyCatalogResults,
    getSpotifyCatalogTypeLabel
} from "../universal-search.js";

const apiSource = await readFile("spotify-api.js", "utf8");
const appSource = await readFile("app.js", "utf8");
const universalSearchSource = await readFile("universal-search.js", "utf8");
const searchStyles = await readFile("styles/feature-search.css", "utf8");
const configSource = await readFile("config.js", "utf8");

function makePayload() {
    return {
        tracks: {
            items: [{
                id: "track-1",
                uri: "spotify:track:track-1",
                name: "One More Test",
                duration_ms: 210000,
                explicit: false,
                is_playable: true,
                artists: [{ name: "Shuffle Artist" }],
                album: {
                    name: "Test Album",
                    images: [{ url: "https://i.scdn.co/test.jpg" }]
                },
                external_urls: {
                    spotify: "https://open.spotify.com/track/track-1"
                }
            }]
        },
        albums: {
            items: [{
                id: "album-1",
                uri: "spotify:album:album-1",
                name: "Album Search",
                release_date: "2026-10-01",
                total_tracks: 11,
                artists: [{ name: "Album Artist" }],
                images: [{ url: "https://i.scdn.co/album.jpg" }],
                external_urls: {
                    spotify: "https://open.spotify.com/album/album-1"
                }
            }]
        },
        artists: {
            items: [{
                id: "artist-1",
                uri: "spotify:artist:artist-1",
                name: "Artist Search",
                genres: ["dance pop", "electro"],
                images: [{ url: "https://i.scdn.co/artist.jpg" }],
                external_urls: {
                    spotify: "https://open.spotify.com/artist/artist-1"
                }
            }]
        }
    };
}

test("la recherche catalogue normalise titres, albums et artistes", () => {
    const items = normalizeSpotifyCatalogResults(makePayload());

    assert.equal(items.length, 3);
    assert.deepEqual(items.map((item) => item.type), [
        "track",
        "album",
        "artist"
    ]);
    assert.equal(items[0].subtitle, "Shuffle Artist");
    assert.equal(items[0].album, "Test Album");
    assert.equal(items[1].description, "2026 · 11 titres");
    assert.equal(items[2].description, "dance pop · electro");
    assert.equal(getSpotifyCatalogTypeLabel("track"), "Titre");
});

test("les résultats invalides ou sans URI Spotify sont ignorés", () => {
    const payload = makePayload();
    payload.tracks.items.unshift({ id: "bad", uri: "https://example.com" });
    payload.albums.items.unshift(null);

    const items = normalizeSpotifyCatalogResults(payload);
    assert.equal(items.length, 3);
    assert.ok(items.every((item) => item.uri.startsWith("spotify:")));
});

test("Spotify API expose recherche et lecture de contexte sans nouveau scope", () => {
    assert.match(apiSource, /export async function searchSpotifyCatalog/);
    assert.match(apiSource, /`\/search\?\$\{parameters\.toString\(\)\}`/);
    assert.match(apiSource, /export async function startPlaybackContext/);
    assert.match(apiSource, /context_uri: normalizedUri/);
    assert.match(configSource, /"user-modify-playback-state"/);
    assert.doesNotMatch(configSource, /spotify-search/i);
});

test("l’interface propose Lire, Lire ensuite et ajout aux priorités d’un profil", () => {
    assert.match(appSource, /renderSpotifyCatalogSearchResults/);
    assert.match(universalSearchSource, /data-spotify-catalog-action="play"/);
    assert.match(universalSearchSource, /data-spotify-catalog-action="queue"/);
    assert.match(universalSearchSource, /data-spotify-catalog-action="profile"/);
    assert.match(appSource, /addSpotifyCatalogItemToProfile/);
    assert.match(appSource, /favoredTrackUris/);
    assert.match(appSource, /favoredArtists/);
    assert.match(appSource, /favoredAlbums/);
});

test("la recherche distante est temporisée et possède un rendu mobile dédié", () => {
    assert.match(appSource, /SPOTIFY_CATALOG_SEARCH_DEBOUNCE_MS = 320/);
    assert.match(appSource, /requestId !== spotifyCatalogSearchRequestId/);
    assert.match(searchStyles, /Shuffle\+ v11\.12\.0 — Recherche catalogue Spotify/);
    assert.match(searchStyles, /\.spotify-catalog-result__actions/);
    assert.match(searchStyles, /@media \(max-width: 640px\)/);
});
