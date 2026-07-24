import { CONFIG } from "./config.js";

import {
    loginWithSpotify,
    handleSpotifyCallback,
    getValidAccessToken,
    logoutSpotify
} from "./auth.js";

import {
    getMyPlaylists,
    getMyProfile,
    getPlaylistItems
} from "./spotify-api.js";

const versionElement = document.querySelector(".version");
const welcomeElement = document.getElementById("welcome");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const contentElement = document.getElementById("content");
const statusElement = document.getElementById("status");

let currentUserId = "";
let playlistsCache = [];
let selectedPlaylist = null;
let selectedTracks = [];

versionElement.textContent = `Version ${CONFIG.version}`;

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDuration(durationMs = 0) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setStatus(message = "", type = "") {
    statusElement.textContent = message;
    statusElement.className = "status";

    if (type) {
        statusElement.classList.add(type);
    }
}

function setDisconnectedInterface() {
    loginButton.hidden = false;
    loginButton.disabled = false;
    loginButton.textContent = "Se connecter à Spotify";

    logoutButton.hidden = true;

    playlistsCache = [];
    selectedPlaylist = null;
    selectedTracks = [];

    contentElement.innerHTML = "";
    setStatus("");
}

function setConnectedInterface() {
    loginButton.hidden = true;
    logoutButton.hidden = false;
}

function getPlaylistTotal(playlist) {
    return (
        playlist.items?.total ??
        playlist.tracks?.total ??
        0
    );
}

function canReadPlaylist(playlist) {
    return (
        playlist.owner?.id === currentUserId ||
        playlist.collaborative === true
    );
}

function displayPlaylists(playlists) {
    selectedPlaylist = null;
    selectedTracks = [];

    if (!playlists.length) {
        contentElement.innerHTML = `
            <section class="playlists-section">
                <h2>Mes playlists</h2>
                <p>Aucune playlist trouvée.</p>
            </section>
        `;

        return;
    }

    const cards = playlists
        .map((playlist) => {
            const playlistName = escapeHtml(
                playlist.name || "Playlist sans nom"
            );

            const imageUrl =
                playlist.images?.[0]?.url || "";

            const total = getPlaylistTotal(playlist);
            const readable = canReadPlaylist(playlist);

            const image = imageUrl
                ? `
                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="Pochette de ${playlistName}"
                        loading="lazy"
                    >
                `
                : `
                    <div class="playlist-placeholder">
                        🎵
                    </div>
                `;

            const availabilityText = readable
                ? `${total} morceau${total > 1 ? "x" : ""}`
                : "Playlist suivie · accès limité";

            return `
                <button
                    class="playlist-card"
                    type="button"
                    data-playlist-id="${escapeHtml(playlist.id)}"
                    ${readable ? "" : "disabled"}
                    title="${
                        readable
                            ? `Ouvrir ${playlistName}`
                            : "Spotify ne permet pas à cette application d’en lire le contenu."
                    }"
                >
                    ${image}

                    <div class="playlist-info">
                        <h3 title="${playlistName}">
                            ${playlistName}
                        </h3>

                        <p>
                            ${availabilityText}
                        </p>
                    </div>
                </button>
            `;
        })
        .join("");

    contentElement.innerHTML = `
        <section class="playlists-section">
            <div class="section-heading">
                <div>
                    <h2>Mes playlists</h2>
                    <p>${playlists.length} playlists trouvées</p>
                </div>
            </div>

            <p class="access-note">
                Les playlists grisées sont visibles dans ton compte,
                mais leur contenu n’est pas accessible à Shuffle+.
            </p>

            <div class="playlists-grid">
                ${cards}
            </div>
        </section>
    `;
}

function createTrackRow(track, index) {
    const trackName = escapeHtml(
        track.name || "Morceau indisponible"
    );

    const artists = escapeHtml(
        track.artists
            ?.map((artist) => artist.name)
            .filter(Boolean)
            .join(", ") || "Artiste inconnu"
    );

    const albumName = escapeHtml(
        track.album?.name || "Album inconnu"
    );

    const imageUrl =
        track.album?.images?.at(-1)?.url ||
        track.album?.images?.[0]?.url ||
        "";

    const spotifyUrl =
        track.external_urls?.spotify || "";

    const image = imageUrl
        ? `
            <img
                class="track-image"
                src="${escapeHtml(imageUrl)}"
                alt=""
                loading="lazy"
            >
        `
        : `
            <div class="track-image track-placeholder">
                🎵
            </div>
        `;

    const title = spotifyUrl
        ? `
            <a
                class="track-link"
                href="${escapeHtml(spotifyUrl)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${trackName}
            </a>
        `
        : `<span class="track-title">${trackName}</span>`;

    return `
        <li class="track-row">
            <span class="track-number">
                ${index + 1}
            </span>

            ${image}

            <div class="track-main">
                ${title}

                <span class="track-artists">
                    ${artists}
                </span>
            </div>

            <span class="track-album">
                ${albumName}
            </span>

            <span class="track-duration">
                ${formatDuration(track.duration_ms)}
            </span>
        </li>
    `;
}

function renderTrackList() {
    const trackListElement =
        document.getElementById("trackList");

    if (!trackListElement) {
        return;
    }

    trackListElement.innerHTML = selectedTracks
        .map(createTrackRow)
        .join("");
}

function displayPlaylistDetails(playlist, tracks) {
    const playlistName = escapeHtml(
        playlist.name || "Playlist sans nom"
    );

    const ownerName = escapeHtml(
        playlist.owner?.display_name ||
        playlist.owner?.id ||
        "Spotify"
    );

    const playlistUrl =
        playlist.external_urls?.spotify || "";

    const imageUrl =
        playlist.images?.[0]?.url || "";

    const cover = imageUrl
        ? `
            <img
                class="playlist-detail-cover"
                src="${escapeHtml(imageUrl)}"
                alt="Pochette de ${playlistName}"
            >
        `
        : `
            <div class="playlist-detail-cover detail-placeholder">
                🎵
            </div>
        `;

    const spotifyLink = playlistUrl
        ? `
            <a
                class="spotify-link"
                href="${escapeHtml(playlistUrl)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Ouvrir dans Spotify
            </a>
        `
        : "";

    contentElement.innerHTML = `
        <section class="playlist-detail">
            <button
                id="backToPlaylists"
                class="back-button"
                type="button"
            >
                ← Retour aux playlists
            </button>

            <div class="playlist-detail-header">
                ${cover}

                <div class="playlist-detail-info">
                    <span class="playlist-label">
                        Playlist
                    </span>

                    <h2>${playlistName}</h2>

                    <p>
                        Par ${ownerName} ·
                        ${tracks.length} morceau${tracks.length > 1 ? "x" : ""}
                    </p>

                    <div class="playlist-detail-actions">
                        <button
                            id="shuffleButton"
                            class="shuffle-button"
                            type="button"
                            ${tracks.length < 2 ? "disabled" : ""}
                        >
                            🔀 Mélanger avec Shuffle+
                        </button>

                        ${spotifyLink}
                    </div>
                </div>
            </div>

            <p class="shuffle-explanation">
                Pour le moment, ce bouton crée un nouvel ordre
                aléatoire dans Shuffle+. La lecture automatique
                dans Spotify sera ajoutée à l’étape suivante.
            </p>

            <ol id="trackList" class="track-list"></ol>
        </section>
    `;

    renderTrackList();
}

function shuffleTracks(tracks) {
    const shuffledTracks = [...tracks];

    /*
     * Mélange de Fisher-Yates :
     * chaque position est échangée avec une position aléatoire.
     */
    for (
        let index = shuffledTracks.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        [
            shuffledTracks[index],
            shuffledTracks[randomIndex]
        ] = [
            shuffledTracks[randomIndex],
            shuffledTracks[index]
        ];
    }

    return shuffledTracks;
}

async function openPlaylist(playlist) {
    selectedPlaylist = playlist;
    selectedTracks = [];

    setStatus(
        `Chargement de « ${playlist.name} »…`
    );

    contentElement.innerHTML = `
        <section class="loading-panel">
            <p>Chargement des morceaux…</p>
        </section>
    `;

    try {
        const tracks = await getPlaylistItems(
            playlist.id
        );

        selectedTracks = tracks;

        displayPlaylistDetails(
            selectedPlaylist,
            selectedTracks
        );

        setStatus("");

        contentElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        console.error(error);

        const message =
            error.status === 403
                ? "Spotify ne permet pas de consulter le contenu de cette playlist avec l’application actuelle."
                : "Impossible de charger les morceaux de cette playlist.";

        contentElement.innerHTML = `
            <section class="playlist-error-panel">
                <button
                    id="backToPlaylists"
                    class="back-button"
                    type="button"
                >
                    ← Retour aux playlists
                </button>

                <h2>Playlist inaccessible</h2>
                <p>${escapeHtml(message)}</p>
            </section>
        `;

        setStatus(message, "error");
    }
}

async function initializeApp() {
    loginButton.disabled = true;
    loginButton.textContent = "Initialisation…";
    logoutButton.hidden = true;

    setStatus("Initialisation de Shuffle+…");

    try {
        await handleSpotifyCallback();

        const accessToken =
            await getValidAccessToken();

        if (!accessToken) {
            setDisconnectedInterface();
            return;
        }

        setConnectedInterface();
        setStatus(
            "Chargement de ton compte Spotify…"
        );

        const [profile, playlists] =
            await Promise.all([
                getMyProfile(),
                getMyPlaylists()
            ]);

        currentUserId = profile?.id || "";
        playlistsCache = playlists;

        const displayName =
            profile?.display_name ||
            profile?.id ||
            "utilisateur";

        welcomeElement.textContent =
            `Bienvenue ${displayName} 👋`;

        displayPlaylists(playlistsCache);
        setStatus("");
    } catch (error) {
        console.error(error);

        setDisconnectedInterface();
        setStatus(error.message, "error");

        loginButton.textContent =
            "Réessayer la connexion";
    }
}

loginButton.addEventListener("click", async () => {
    loginButton.disabled = true;
    loginButton.textContent =
        "Redirection vers Spotify…";

    setStatus("");

    try {
        await loginWithSpotify();
    } catch (error) {
        console.error(error);

        loginButton.disabled = false;
        loginButton.textContent =
            "Se connecter à Spotify";

        setStatus(error.message, "error");
    }
});

logoutButton.addEventListener("click", () => {
    logoutSpotify();

    currentUserId = "";
    welcomeElement.textContent = "Bienvenue 👋";

    setDisconnectedInterface();
});

contentElement.addEventListener(
    "click",
    async (event) => {
        const playlistCard =
            event.target.closest(".playlist-card");

        if (playlistCard) {
            const playlistId =
                playlistCard.dataset.playlistId;

            const playlist =
                playlistsCache.find(
                    (item) => item.id === playlistId
                );

            if (playlist) {
                await openPlaylist(playlist);
            }

            return;
        }

        const backButton =
            event.target.closest("#backToPlaylists");

        if (backButton) {
            setStatus("");
            displayPlaylists(playlistsCache);

            contentElement.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            return;
        }

        const shuffleButton =
            event.target.closest("#shuffleButton");

        if (shuffleButton && selectedTracks.length > 1) {
            selectedTracks =
                shuffleTracks(selectedTracks);

            renderTrackList();

            shuffleButton.textContent =
                "✅ Nouvel ordre créé";

            window.setTimeout(() => {
                if (
                    document.body.contains(
                        shuffleButton
                    )
                ) {
                    shuffleButton.textContent =
                        "🔀 Mélanger à nouveau";
                }
            }, 1200);
        }
    }
);

initializeApp();