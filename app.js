import { CONFIG } from "./config.js";
import {
    loginWithSpotify,
    handleSpotifyCallback,
    getValidAccessToken
} from "./auth.js";

import { getMyPlaylists } from "./spotify-api.js";

const versionElement = document.querySelector(".version");
const loginButton = document.getElementById("loginButton");
const contentElement = document.getElementById("content");

versionElement.textContent = `Version ${CONFIG.version}`;

function displayPlaylists(playlists) {
    contentElement.innerHTML = `
        <section class="playlists-section">
            <h2>Mes playlists</h2>
            <p>${playlists.length} playlists trouvées</p>

            <div class="playlists-grid">
                ${playlists.map((playlist) => {
                    const imageUrl =
                        playlist.images?.[0]?.url ||
                        "https://placehold.co/300x300?text=Playlist";

                    return `
                        <article class="playlist-card">
                            <img
                                src="${imageUrl}"
                                alt="Pochette de ${playlist.name}"
                            >

                            <div class="playlist-info">
                                <h3>${playlist.name}</h3>
                                <p>
                                    ${playlist.tracks.total} morceau${playlist.tracks.total > 1 ? "x" : ""}
                                </p>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        </section>
    `;
}

async function initializeApp() {
    loginButton.disabled = true;
    loginButton.textContent = "Initialisation…";

    try {
        await handleSpotifyCallback();

        const accessToken = await getValidAccessToken();

        if (accessToken) {
            loginButton.textContent = "Spotify connecté ✓";
            loginButton.disabled = true;

            contentElement.innerHTML = "<p>Chargement des playlists…</p>";

            const playlists = await getMyPlaylists();

            console.log("Playlists récupérées :", playlists);

            displayPlaylists(playlists);
        } else {
            loginButton.textContent = "Se connecter à Spotify";
            loginButton.disabled = false;

            contentElement.innerHTML = "";
        }
    } catch (error) {
        console.error(error);

        loginButton.textContent = "Réessayer la connexion";
        loginButton.disabled = false;

        contentElement.innerHTML = `
            <p class="error-message">
                Impossible de charger les playlists.
            </p>
        `;

        alert(error.message);
    }
}

loginButton.addEventListener("click", async () => {
    loginButton.disabled = true;
    loginButton.textContent = "Redirection vers Spotify…";

    try {
        await loginWithSpotify();
    } catch (error) {
        console.error(error);

        loginButton.disabled = false;
        loginButton.textContent = "Se connecter à Spotify";

        alert("Impossible de démarrer la connexion Spotify.");
    }
});

initializeApp();