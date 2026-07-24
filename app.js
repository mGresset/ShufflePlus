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
    getPlaylistItems,
    getAvailableDevices,
    setPlaybackShuffle,
    startPlayback
} from "./spotify-api.js";

const versionElement = document.querySelector(".version");
const welcomeElement = document.getElementById("welcome");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const contentElement = document.getElementById("content");
const statusElement = document.getElementById("status");

const MAX_DIRECT_PLAYBACK_TRACKS = 100;

let currentUserId = "";
let playlistsCache = [];
let selectedPlaylist = null;
let selectedTracks = [];
let availableDevices = [];

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

function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
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
    availableDevices = [];

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
    availableDevices = [];

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

            const imageUrl = playlist.images?.[0]?.url || "";
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
                >
                    ${image}

                    <div class="playlist-info">
                        <h3 title="${playlistName}">
                            ${playlistName}
                        </h3>

                        <p>${availabilityText}</p>
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

    const albumImages = track.album?.images || [];
    const imageUrl =
        albumImages[albumImages.length - 1]?.url ||
        albumImages[0]?.url ||
        "";

    const spotifyUrl = track.external_urls?.spotify || "";

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
    const trackListElement = document.getElementById("trackList");

    if (!trackListElement) {
        return;
    }

    trackListElement.innerHTML = selectedTracks
        .map(createTrackRow)
        .join("");
}

function getDeviceIcon(type = "") {
    switch (type.toLowerCase()) {
        case "smartphone":
            return "📱";
        case "computer":
            return "💻";
        case "speaker":
            return "🔊";
        case "tv":
            return "📺";
        case "automobile":
            return "🚗";
        default:
            return "🎧";
    }
}

function createDeviceOptions() {
    if (!availableDevices.length) {
        return `
            <option value="">
                Aucun appareil Spotify disponible
            </option>
        `;
    }

    const sortedDevices = [...availableDevices].sort(
        (first, second) =>
            Number(second.is_active) - Number(first.is_active)
    );

    return sortedDevices
        .map((device) => {
            const activeText = device.is_active ? " · actif" : "";

            return `
                <option
                    value="${escapeHtml(device.id)}"
                    ${device.is_active ? "selected" : ""}
                >
                    ${getDeviceIcon(device.type)}
                    ${escapeHtml(device.name)}${activeText}
                </option>
            `;
        })
        .join("");
}

function updateDeviceControls(previousDeviceId = "") {
    const deviceSelect = document.getElementById("deviceSelect");
    const playButton = document.getElementById("playSpotifyButton");

    if (!deviceSelect || !playButton) {
        return;
    }

    deviceSelect.innerHTML = createDeviceOptions();

    if (
        previousDeviceId &&
        availableDevices.some(
            (device) => device.id === previousDeviceId
        )
    ) {
        deviceSelect.value = previousDeviceId;
    }

    deviceSelect.disabled = !availableDevices.length;
    playButton.disabled =
        !availableDevices.length || !selectedTracks.length;
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

    const playlistUrl = playlist.external_urls?.spotify || "";
    const imageUrl = playlist.images?.[0]?.url || "";

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

            <section class="playback-panel">
                <div class="playback-panel-heading">
                    <div>
                        <h3>Lecture Spotify</h3>
                        <p>
                            Choisis l’appareil sur lequel lancer
                            l’ordre créé par Shuffle+.
                        </p>
                    </div>
                </div>

                <div class="playback-controls">
                    <label class="device-field" for="deviceSelect">
                        <span>Appareil</span>

                        <select
                            id="deviceSelect"
                            ${availableDevices.length ? "" : "disabled"}
                        >
                            ${createDeviceOptions()}
                        </select>
                    </label>

                    <button
                        id="refreshDevicesButton"
                        class="device-refresh-button"
                        type="button"
                    >
                        ↻ Actualiser
                    </button>

                    <button
                        id="playSpotifyButton"
                        class="play-spotify-button"
                        type="button"
                        ${
                            availableDevices.length && tracks.length
                                ? ""
                                : "disabled"
                        }
                    >
                        ▶ Lire cet ordre dans Spotify
                    </button>
                </div>

                <p id="playbackMessage" class="playback-message">
                    ${
                        availableDevices.length
                            ? "Un appareil Spotify est prêt."
                            : "Ouvre Spotify sur ton téléphone ou ton ordinateur, lance ou mets en pause un morceau, puis clique sur Actualiser."
                    }
                </p>
            </section>

            <p class="shuffle-explanation">
                Le bouton vert modifie l’ordre dans Shuffle+.
                Le bouton de lecture envoie ensuite cet ordre
                vers l’appareil Spotify sélectionné.
            </p>

            <ol id="trackList" class="track-list"></ol>
        </section>
    `;

    renderTrackList();
}

function shuffleTracks(tracks) {
    const shuffledTracks = [...tracks];

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

function getPlaybackErrorMessage(error) {
    if (error.status === 403) {
        return (
            "Spotify a refusé la commande. Vérifie que le compte " +
            "est Premium et reconnecte Shuffle+ si les autorisations ont changé."
        );
    }

    if (error.status === 404) {
        return (
            "L’appareil n’est plus disponible. Ouvre Spotify, " +
            "lance ou mets en pause un morceau, puis actualise les appareils."
        );
    }

    if (error.status === 429) {
        return (
            "Trop de demandes ont été envoyées à Spotify. " +
            "Patiente quelques secondes puis recommence."
        );
    }

    return "Impossible de lancer la lecture dans Spotify.";
}

async function refreshPlaybackDevices() {
    const deviceSelect = document.getElementById("deviceSelect");
    const refreshButton = document.getElementById(
        "refreshDevicesButton"
    );
    const playbackMessage = document.getElementById(
        "playbackMessage"
    );

    if (!refreshButton || !playbackMessage) {
        return;
    }

    const previousDeviceId = deviceSelect?.value || "";

    refreshButton.disabled = true;
    refreshButton.textContent = "Actualisation…";
    playbackMessage.textContent =
        "Recherche des appareils Spotify…";
    playbackMessage.className = "playback-message";

    try {
        availableDevices = await getAvailableDevices();
        updateDeviceControls(previousDeviceId);

        playbackMessage.textContent = availableDevices.length
            ? `${availableDevices.length} appareil${
                availableDevices.length > 1 ? "s" : ""
            } disponible${availableDevices.length > 1 ? "s" : ""}.`
            : (
                "Aucun appareil trouvé. Ouvre Spotify, lance ou " +
                "mets en pause un morceau, puis réessaie."
            );
    } catch (error) {
        console.error(error);

        availableDevices = [];
        updateDeviceControls();

        playbackMessage.textContent =
            "Impossible de récupérer les appareils Spotify.";
        playbackMessage.className =
            "playback-message error";
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Actualiser";
    }
}

async function playSelectedOrder() {
    const deviceSelect = document.getElementById("deviceSelect");
    const playButton = document.getElementById(
        "playSpotifyButton"
    );
    const playbackMessage = document.getElementById(
        "playbackMessage"
    );

    if (!deviceSelect || !playButton || !playbackMessage) {
        return;
    }

    const deviceId = deviceSelect.value;

    if (!deviceId) {
        playbackMessage.textContent =
            "Sélectionne d’abord un appareil Spotify.";
        playbackMessage.className =
            "playback-message error";
        return;
    }

    const allUris = selectedTracks
        .map((track) => track.uri)
        .filter(Boolean);

    const playbackUris = allUris.slice(
        0,
        MAX_DIRECT_PLAYBACK_TRACKS
    );

    if (!playbackUris.length) {
        playbackMessage.textContent =
            "Aucun morceau lisible dans cette playlist.";
        playbackMessage.className =
            "playback-message error";
        return;
    }

    playButton.disabled = true;
    playButton.textContent = "Lancement…";
    playbackMessage.textContent =
        "Préparation de la lecture Spotify…";
    playbackMessage.className = "playback-message";

    try {
        await setPlaybackShuffle(false, deviceId);
        await wait(300);
        await startPlayback(playbackUris, deviceId);

        const truncatedText =
            allUris.length > playbackUris.length
                ? ` Les ${playbackUris.length} premiers morceaux de cet ordre ont été envoyés.`
                : "";

        playbackMessage.textContent =
            `Lecture lancée sur l’appareil sélectionné.${truncatedText}`;
        playbackMessage.className =
            "playback-message success";

        playButton.textContent = "✓ Lecture lancée";
    } catch (error) {
        console.error(error);

        playbackMessage.textContent =
            getPlaybackErrorMessage(error);
        playbackMessage.className =
            "playback-message error";

        playButton.textContent =
            "▶ Réessayer la lecture";
    } finally {
        playButton.disabled = false;
    }
}

async function openPlaylist(playlist) {
    selectedPlaylist = playlist;
    selectedTracks = [];
    availableDevices = [];

    setStatus(`Chargement de « ${playlist.name} »…`);

    contentElement.innerHTML = `
        <section class="loading-panel">
            <p>Chargement des morceaux…</p>
        </section>
    `;

    try {
        const [tracks, devices] = await Promise.all([
            getPlaylistItems(playlist.id),
            getAvailableDevices().catch((error) => {
                console.warn(
                    "Appareils Spotify indisponibles :",
                    error
                );

                return [];
            })
        ]);

        selectedTracks = tracks;
        availableDevices = devices;

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

        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            setDisconnectedInterface();
            return;
        }

        setConnectedInterface();
        setStatus("Chargement de ton compte Spotify…");

        const [profile, playlists] = await Promise.all([
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

            const playlist = playlistsCache.find(
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

        const refreshDevicesButton =
            event.target.closest("#refreshDevicesButton");

        if (refreshDevicesButton) {
            await refreshPlaybackDevices();
            return;
        }

        const playSpotifyButton =
            event.target.closest("#playSpotifyButton");

        if (playSpotifyButton) {
            await playSelectedOrder();
            return;
        }

        const shuffleButton =
            event.target.closest("#shuffleButton");

        if (
            shuffleButton &&
            selectedTracks.length > 1
        ) {
            selectedTracks = shuffleTracks(selectedTracks);

            renderTrackList();

            shuffleButton.textContent =
                "✅ Nouvel ordre créé";

            window.setTimeout(() => {
                if (
                    document.body.contains(shuffleButton)
                ) {
                    shuffleButton.textContent =
                        "🔀 Mélanger à nouveau";
                }
            }, 1200);
        }
    }
);

initializeApp();
