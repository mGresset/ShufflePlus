import { CONFIG } from "./config.js";

import {
    loginWithSpotify,
    handleSpotifyCallback,
    getValidAccessToken,
    logoutSpotify
} from "./auth.js";

import {
    getMyPlaylists,
    getMyProfile
} from "./spotify-api.js";

const versionElement = document.querySelector(".version");
const welcomeElement = document.getElementById("welcome");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const contentElement = document.getElementById("content");
const statusElement = document.getElementById("status");

versionElement.textContent = `Version ${CONFIG.version}`;

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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

    contentElement.innerHTML = "";
    setStatus("");
}

function setConnectedInterface() {
    loginButton.hidden = true;
    logoutButton.hidden = false;
}

function displayPlaylists(playlists) {
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

            const total =
                playlist.items?.total ??
                playlist.tracks?.total ??
                0;

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

            return `
                <article
                    class="playlist-card"
                    data-playlist-id="${escapeHtml(playlist.id)}"
                >
                    ${image}

                    <div class="playlist-info">
                        <h3 title="${playlistName}">
                            ${playlistName}
                        </h3>

                        <p>
                            ${total} morceau${total > 1 ? "x" : ""}
                        </p>
                    </div>
                </article>
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

            <div class="playlists-grid">
                ${cards}
            </div>
        </section>
    `;
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

        const displayName =
            profile?.display_name ||
            profile?.id ||
            "utilisateur";

        welcomeElement.textContent =
            `Bienvenue ${displayName} 👋`;

        displayPlaylists(playlists);
        setStatus("");
    } catch (error) {
        console.error(error);

        setDisconnectedInterface();
        setStatus(error.message, "error");

        loginButton.textContent = "Réessayer la connexion";
    }
}

loginButton.addEventListener("click", async () => {
    loginButton.disabled = true;
    loginButton.textContent = "Redirection vers Spotify…";
    setStatus("");

    try {
        await loginWithSpotify();
    } catch (error) {
        console.error(error);

        loginButton.disabled = false;
        loginButton.textContent = "Se connecter à Spotify";

        setStatus(error.message, "error");
    }
});

logoutButton.addEventListener("click", () => {
    logoutSpotify();

    welcomeElement.textContent = "Bienvenue 👋";
    setDisconnectedInterface();
});

initializeApp();