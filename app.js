import {
    smartShuffleTracks,
    analyzeShuffleOrder,
    rememberPlaybackOrder
} from "./shuffle-engine.js";

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
    getMySavedTracks,
    getAvailableDevices,
    transferPlayback,
    setPlaybackShuffle,
    startPlayback,
    createPrivatePlaylist,
    addItemsToPlaylist,
    getPlaylistLastAddedAt
} from "./spotify-api.js";

const versionElement = document.querySelector(".version");
const welcomeElement = document.getElementById("welcome");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const contentElement = document.getElementById("content");
const statusElement = document.getElementById("status");

const APP_VERSION = "1.1.0";
const MAX_DIRECT_PLAYBACK_TRACKS = 100;
const MAX_MIX_SOURCES = 12;
const MODIFICATION_CACHE_KEY =
    "shuffleplus_playlist_modification_dates_v1";
const MODIFICATION_CACHE_TTL = 24 * 60 * 60 * 1000;
const MODIFICATION_REQUEST_CONCURRENCY = 4;

let currentUserId = "";
let currentUserProduct = "";
let playlistsCache = [];
let selectedPlaylist = null;
let sourceTracks = [];
let selectedTracks = [];
let availableDevices = [];
const selectedSourceKeys = new Set();

let librarySearchTerm = "";
let libraryFilter = "all";
let librarySort = "name-asc";
let modificationDatesLoading = false;
let modificationDatesProgress = {
    completed: 0,
    total: 0
};
const playlistModificationDates = new Map();

versionElement.textContent = `Version ${APP_VERSION}`;

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

    currentUserProduct = "";
    playlistsCache = [];
    selectedPlaylist = null;
    sourceTracks = [];
    selectedTracks = [];
    availableDevices = [];
    selectedSourceKeys.clear();
    playlistModificationDates.clear();
    modificationDatesLoading = false;
    modificationDatesProgress = {
        completed: 0,
        total: 0
    };

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

function getPlaylistSourceKey(playlistId) {
    return `playlist:${playlistId}`;
}


function normalizeSearchText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function getPlaylistCategory(playlist) {
    if (playlist.owner?.id === currentUserId) {
        return "personal";
    }

    if (playlist.collaborative === true) {
        return "collaborative";
    }

    return "followed";
}

function readModificationDateCache() {
    try {
        const rawCache = localStorage.getItem(
            MODIFICATION_CACHE_KEY
        );

        if (!rawCache) {
            return {};
        }

        const parsedCache = JSON.parse(rawCache);

        return parsedCache &&
            typeof parsedCache === "object" &&
            parsedCache.entries &&
            typeof parsedCache.entries === "object"
            ? parsedCache.entries
            : {};
    } catch (error) {
        console.warn(
            "Cache des dates de modification illisible :",
            error
        );
        return {};
    }
}

function writeModificationDateCache(entries) {
    try {
        localStorage.setItem(
            MODIFICATION_CACHE_KEY,
            JSON.stringify({
                savedAt: Date.now(),
                entries
            })
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer le cache des dates :",
            error
        );
    }
}

function isModificationCacheEntryValid(
    playlist,
    cacheEntry
) {
    if (!cacheEntry) {
        return false;
    }

    const cacheAge =
        Date.now() - Number(cacheEntry.cachedAt || 0);

    const sameSnapshot =
        !playlist.snapshot_id ||
        !cacheEntry.snapshotId ||
        playlist.snapshot_id === cacheEntry.snapshotId;

    return (
        cacheAge >= 0 &&
        cacheAge < MODIFICATION_CACHE_TTL &&
        sameSnapshot
    );
}

function formatModificationDate(timestamp) {
    if (!timestamp) {
        return "Date inconnue";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(new Date(timestamp));
}

function updateModificationProgressUI() {
    const progressElement = document.getElementById(
        "modificationSortProgress"
    );

    if (!progressElement) {
        return;
    }

    if (!modificationDatesLoading) {
        progressElement.textContent = "";
        progressElement.hidden = true;
        return;
    }

    progressElement.hidden = false;
    progressElement.textContent =
        `Analyse des playlists : ` +
        `${modificationDatesProgress.completed}/` +
        `${modificationDatesProgress.total}`;
}

async function runWithConcurrency(
    tasks,
    concurrency
) {
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < tasks.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            await tasks[currentIndex]();
        }
    }

    const workerCount = Math.min(
        concurrency,
        tasks.length
    );

    await Promise.all(
        Array.from(
            { length: workerCount },
            () => worker()
        )
    );
}

async function ensureModificationDatesLoaded() {
    if (modificationDatesLoading) {
        return;
    }

    const readablePlaylists = playlistsCache.filter(
        canReadPlaylist
    );

    const cacheEntries = readModificationDateCache();
    const updatedCacheEntries = {
        ...cacheEntries
    };

    const playlistsToLoad = [];

    for (const playlist of readablePlaylists) {
        const cacheEntry = cacheEntries[playlist.id];

        if (
            isModificationCacheEntryValid(
                playlist,
                cacheEntry
            )
        ) {
            playlistModificationDates.set(
                playlist.id,
                cacheEntry.lastAddedAt || null
            );
        } else {
            playlistsToLoad.push(playlist);
        }
    }

    if (!playlistsToLoad.length) {
        return;
    }

    modificationDatesLoading = true;
    modificationDatesProgress = {
        completed: 0,
        total: playlistsToLoad.length
    };

    updateModificationProgressUI();
    setStatus(
        `Analyse de ${playlistsToLoad.length} playlist` +
        `${playlistsToLoad.length > 1 ? "s" : ""}…`
    );

    const tasks = playlistsToLoad.map(
        (playlist) => async () => {
            let lastAddedAt = null;

            try {
                lastAddedAt =
                    await getPlaylistLastAddedAt(
                        playlist.id
                    );
            } catch (error) {
                console.warn(
                    `Date indisponible pour « ${playlist.name} » :`,
                    error
                );
            }

            playlistModificationDates.set(
                playlist.id,
                lastAddedAt
            );

            updatedCacheEntries[playlist.id] = {
                snapshotId:
                    playlist.snapshot_id || "",
                lastAddedAt,
                cachedAt: Date.now()
            };

            modificationDatesProgress.completed += 1;
            updateModificationProgressUI();
        }
    );

    try {
        await runWithConcurrency(
            tasks,
            MODIFICATION_REQUEST_CONCURRENCY
        );

        writeModificationDateCache(
            updatedCacheEntries
        );
    } finally {
        modificationDatesLoading = false;
        updateModificationProgressUI();
        setStatus("");
    }
}

function getFilteredAndSortedPlaylists(playlists) {
    const normalizedQuery = normalizeSearchText(librarySearchTerm);

    const filtered = playlists.filter((playlist) => {
        const category = getPlaylistCategory(playlist);
        const matchesFilter =
            libraryFilter === "all" ||
            category === libraryFilter;

        if (!matchesFilter) {
            return false;
        }

        if (!normalizedQuery) {
            return true;
        }

        const searchableText = normalizeSearchText([
            playlist.name,
            playlist.owner?.display_name,
            playlist.owner?.id
        ].filter(Boolean).join(" "));

        return searchableText.includes(normalizedQuery);
    });

    return filtered.sort((first, second) => {
        const firstName = first.name || "";
        const secondName = second.name || "";
        const firstTotal = getPlaylistTotal(first);
        const secondTotal = getPlaylistTotal(second);

        const firstModifiedAt =
            playlistModificationDates.get(first.id) || 0;
        const secondModifiedAt =
            playlistModificationDates.get(second.id) || 0;

        switch (librarySort) {
            case "name-desc":
                return secondName.localeCompare(firstName, "fr", {
                    sensitivity: "base"
                });
            case "tracks-desc":
                return secondTotal - firstTotal ||
                    firstName.localeCompare(secondName, "fr", {
                        sensitivity: "base"
                    });
            case "tracks-asc":
                return firstTotal - secondTotal ||
                    firstName.localeCompare(secondName, "fr", {
                        sensitivity: "base"
                    });
            case "modified-desc":
                return (
                    secondModifiedAt - firstModifiedAt ||
                    firstName.localeCompare(secondName, "fr", {
                        sensitivity: "base"
                    })
                );
            case "modified-asc": {
                if (!firstModifiedAt && !secondModifiedAt) {
                    return firstName.localeCompare(
                        secondName,
                        "fr",
                        { sensitivity: "base" }
                    );
                }

                if (!firstModifiedAt) {
                    return 1;
                }

                if (!secondModifiedAt) {
                    return -1;
                }

                return (
                    firstModifiedAt - secondModifiedAt ||
                    firstName.localeCompare(secondName, "fr", {
                        sensitivity: "base"
                    })
                );
            }
            case "name-asc":
            default:
                return firstName.localeCompare(secondName, "fr", {
                    sensitivity: "base"
                });
        }
    });
}

function isLikedSourceVisible() {
    if (libraryFilter !== "all") {
        return false;
    }

    const normalizedQuery = normalizeSearchText(librarySearchTerm);

    return !normalizedQuery ||
        normalizeSearchText("Morceaux aimés bibliothèque Spotify")
            .includes(normalizedQuery);
}

function updateMixSelectionControls() {
    const selectionCountElement = document.getElementById(
        "mixSelectionCount"
    );
    const createMixButton = document.getElementById(
        "createMixButton"
    );
    const clearSelectionButton = document.getElementById(
        "clearSourceSelection"
    );

    const selectedCount = selectedSourceKeys.size;

    if (selectionCountElement) {
        selectionCountElement.textContent =
            `${selectedCount} source${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}`;
    }

    if (createMixButton) {
        createMixButton.disabled = selectedCount < 1;
    }

    if (clearSelectionButton) {
        clearSelectionButton.disabled = selectedCount < 1;
    }

    document
        .querySelectorAll(".source-card")
        .forEach((card) => {
            const sourceKey = card.dataset.sourceKey || "";
            card.classList.toggle(
                "is-selected",
                selectedSourceKeys.has(sourceKey)
            );
        });
}

function displayPlaylists(playlists) {
    selectedPlaylist = null;
    sourceTracks = [];
    selectedTracks = [];
    availableDevices = [];

    const visiblePlaylists = getFilteredAndSortedPlaylists(playlists);
    const likedVisible = isLikedSourceVisible();

    const cards = visiblePlaylists
        .map((playlist) => {
            const playlistName = escapeHtml(
                playlist.name || "Playlist sans nom"
            );

            const imageUrl = playlist.images?.[0]?.url || "";
            const total = getPlaylistTotal(playlist);
            const readable = canReadPlaylist(playlist);
            const sourceKey = getPlaylistSourceKey(playlist.id);
            const selected = selectedSourceKeys.has(sourceKey);

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

            const modifiedAt =
                playlistModificationDates.get(
                    playlist.id
                ) || null;

            const modificationText =
                librarySort.startsWith("modified")
                    ? ` · ${formatModificationDate(modifiedAt)}`
                    : "";

            const availabilityText = readable
                ? `${total} morceau${total > 1 ? "x" : ""}${modificationText}`
                : "Playlist suivie · accès limité";

            return `
                <article
                    class="playlist-card source-card ${selected ? "is-selected" : ""} ${readable ? "" : "is-disabled"}"
                    data-source-key="${escapeHtml(sourceKey)}"
                >
                    <label
                        class="source-selector"
                        title="${readable ? "Ajouter au mix" : "Source indisponible"}"
                    >
                        <input
                            class="source-checkbox"
                            type="checkbox"
                            data-source-key="${escapeHtml(sourceKey)}"
                            ${selected ? "checked" : ""}
                            ${readable ? "" : "disabled"}
                        >
                        <span aria-hidden="true"></span>
                    </label>

                    <button
                        class="source-open-button"
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
                </article>
            `;
        })
        .join("");

    const likedSelected = selectedSourceKeys.has("liked");

    const likedTracksCard = likedVisible
        ? `
            <article
                class="playlist-card source-card liked-tracks-card ${likedSelected ? "is-selected" : ""}"
                data-source-key="liked"
            >
                <label class="source-selector" title="Ajouter au mix">
                    <input
                        class="source-checkbox"
                        type="checkbox"
                        data-source-key="liked"
                        ${likedSelected ? "checked" : ""}
                    >
                    <span aria-hidden="true"></span>
                </label>

                <button
                    class="source-open-button"
                    type="button"
                    data-library-source="liked"
                >
                    <div class="playlist-placeholder liked-tracks-placeholder">
                        ♥
                    </div>

                    <div class="playlist-info">
                        <h3>Morceaux aimés</h3>
                        <p>Ta bibliothèque Spotify</p>
                    </div>
                </button>
            </article>
        `
        : "";

    const visibleCount = visiblePlaylists.length + (likedVisible ? 1 : 0);
    const totalCount = playlists.length + 1;

    const emptyState = visibleCount === 0
        ? `
            <div class="library-empty-state">
                <span aria-hidden="true">🔎</span>
                <h3>Aucun résultat</h3>
                <p>Modifie la recherche ou les filtres pour retrouver tes playlists.</p>
                <button id="resetLibraryFilters" type="button">
                    Réinitialiser les filtres
                </button>
            </div>
        `
        : `
            <div class="playlists-grid">
                ${likedTracksCard}
                ${cards}
            </div>
        `;

    contentElement.innerHTML = `
        <section class="playlists-section">
            <div class="section-heading">
                <div>
                    <h2>Ma musique</h2>
                    <p>
                        ${visibleCount} source${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""}
                        sur ${totalCount}
                    </p>
                </div>
            </div>

            <section class="library-toolbar" aria-label="Recherche et filtres">
                <label class="library-search-field" for="librarySearchInput">
                    <span>Rechercher</span>
                    <input
                        id="librarySearchInput"
                        type="search"
                        placeholder="Nom de playlist ou propriétaire…"
                        value="${escapeHtml(librarySearchTerm)}"
                        autocomplete="off"
                    >
                </label>

                <label class="library-select-field" for="libraryFilterSelect">
                    <span>Afficher</span>
                    <select id="libraryFilterSelect">
                        <option value="all" ${libraryFilter === "all" ? "selected" : ""}>Toutes les sources</option>
                        <option value="personal" ${libraryFilter === "personal" ? "selected" : ""}>Mes playlists</option>
                        <option value="collaborative" ${libraryFilter === "collaborative" ? "selected" : ""}>Collaboratives</option>
                        <option value="followed" ${libraryFilter === "followed" ? "selected" : ""}>Playlists suivies</option>
                    </select>
                </label>

                <label class="library-select-field" for="librarySortSelect">
                    <span>Trier</span>
                    <select id="librarySortSelect">
                        <option value="name-asc" ${librarySort === "name-asc" ? "selected" : ""}>Nom A → Z</option>
                        <option value="name-desc" ${librarySort === "name-desc" ? "selected" : ""}>Nom Z → A</option>
                        <option value="tracks-desc" ${librarySort === "tracks-desc" ? "selected" : ""}>Plus de morceaux</option>
                        <option value="tracks-asc" ${librarySort === "tracks-asc" ? "selected" : ""}>Moins de morceaux</option>
                        <option value="modified-desc" ${librarySort === "modified-desc" ? "selected" : ""}>Modifiées récemment</option>
                        <option value="modified-asc" ${librarySort === "modified-asc" ? "selected" : ""}>Modifiées anciennement</option>
                    </select>
                </label>

                <button
                    id="resetLibraryFilters"
                    class="library-reset-button"
                    type="button"
                    ${(librarySearchTerm || libraryFilter !== "all" || librarySort !== "name-asc") ? "" : "disabled"}
                >
                    Réinitialiser
                </button>
            </section>

            <p
                id="modificationSortProgress"
                class="modification-sort-progress"
                ${modificationDatesLoading ? "" : "hidden"}
                aria-live="polite"
            >
                ${
                    modificationDatesLoading
                        ? `Analyse des playlists : ${modificationDatesProgress.completed}/${modificationDatesProgress.total}`
                        : ""
                }
            </p>

            <section class="mix-builder" aria-label="Créateur de mix">
                <div class="mix-builder-copy">
                    <strong>Créer un mix multi-sources</strong>
                    <small>Jusqu’à ${MAX_MIX_SOURCES} sources</small>
                    <span id="mixSelectionCount">
                        0 source sélectionnée
                    </span>
                </div>

                <div class="mix-builder-actions">
                    <button
                        id="selectAllSources"
                        class="mix-secondary-button"
                        type="button"
                        ${visibleCount ? "" : "disabled"}
                    >
                        Sélectionner les visibles
                    </button>

                    <button
                        id="clearSourceSelection"
                        class="mix-secondary-button"
                        type="button"
                        ${selectedSourceKeys.size ? "" : "disabled"}
                    >
                        Effacer
                    </button>

                    <button
                        id="createMixButton"
                        class="mix-create-button"
                        type="button"
                        ${selectedSourceKeys.size ? "" : "disabled"}
                    >
                        🧠 Créer le mix
                    </button>
                </div>
            </section>

            <p class="access-note">
                Recherche, filtre et trie tes sources. Les playlists grisées
                restent visibles, mais leur contenu n’est pas lisible par Shuffle+.
            </p>

            ${emptyState}
        </section>
    `;

    updateMixSelectionControls();
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

function renderShuffleStats(stats = null) {
    const statsElement = document.getElementById("shuffleStats");

    if (!statsElement) {
        return;
    }

    if (!stats) {
        statsElement.innerHTML = "";
        statsElement.hidden = true;
        return;
    }

    statsElement.hidden = false;
    statsElement.innerHTML = `
        <p class="shuffle-stats-text">
            <strong class="shuffle-stats-title">
                Mélange analysé !
            </strong>
            <br>
            <em>Artistes consécutifs</em> :
            <strong>${stats.consecutiveArtistRepeats}</strong>
            &nbsp;–&nbsp;
            <em>Albums consécutifs</em> :
            <strong>${stats.consecutiveAlbumRepeats}</strong>
            &nbsp;–&nbsp;
            <em>Morceaux lus récemment dans les 20 premiers</em> :
            <strong>${stats.recentTracksInFirstTwenty}</strong>.
        </p>
    `;
}


function createDefaultSavedPlaylistName(playlist) {
    const sourceName = String(
        playlist?.name || "Sélection"
    ).trim();

    const dateText = new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(new Date());

    const prefix =
        playlist?.sourceType === "mix"
            ? "Mix Shuffle+"
            : `Shuffle+ – ${sourceName}`;

    return `${prefix} – ${dateText}`.slice(0, 100);
}

function createSavedPlaylistDescription() {
    if (selectedPlaylist?.sourceType === "mix") {
        const sourceCount =
            selectedPlaylist.sourceCount || 0;

        return (
            `Mix intelligent créé avec Shuffle+ à partir de ` +
            `${sourceCount} source${sourceCount > 1 ? "s" : ""}.`
        ).slice(0, 300);
    }

    const sourceName =
        selectedPlaylist?.name || "une sélection Spotify";

    return (
        `Ordre intelligent créé avec Shuffle+ à partir de « ` +
        `${sourceName} ».`
    ).slice(0, 300);
}

function getSavePlaylistErrorMessage(error) {
    const spotifyMessage =
        error.spotifyMessage ||
        error.message ||
        "";

    if (error.status === 403) {
        return (
            "Spotify n’a pas autorisé la création de playlist privée. " +
            "Ajoute le scope playlist-modify-private dans config.js, " +
            "puis déconnecte-toi et reconnecte-toi à Shuffle+."
        );
    }

    if (error.status === 429) {
        return (
            "Spotify reçoit trop de demandes. Patiente quelques " +
            "secondes, puis recommence."
        );
    }

    return spotifyMessage
        ? `Impossible d’enregistrer la playlist : ${spotifyMessage}`
        : "Impossible d’enregistrer cette playlist dans Spotify.";
}

async function saveCurrentOrderToSpotify() {
    const form = document.getElementById(
        "savePlaylistForm"
    );
    const nameInput = document.getElementById(
        "savePlaylistName"
    );
    const saveButton = document.getElementById(
        "confirmSavePlaylistButton"
    );
    const cancelButton = document.getElementById(
        "cancelSavePlaylistButton"
    );
    const messageElement = document.getElementById(
        "savePlaylistMessage"
    );

    if (
        !form ||
        !nameInput ||
        !saveButton ||
        !cancelButton ||
        !messageElement
    ) {
        return;
    }

    const playlistName = nameInput.value.trim();
    const uris = selectedTracks
        .map((track) => track?.uri)
        .filter(Boolean);

    if (!playlistName) {
        messageElement.textContent =
            "Donne un nom à la playlist.";
        messageElement.className =
            "save-playlist-message error";
        nameInput.focus();
        return;
    }

    if (!uris.length) {
        messageElement.textContent =
            "Aucun morceau ne peut être enregistré.";
        messageElement.className =
            "save-playlist-message error";
        return;
    }

    saveButton.disabled = true;
    cancelButton.disabled = true;
    nameInput.disabled = true;
    saveButton.textContent = "Création…";
    messageElement.textContent =
        "Création de la playlist privée…";
    messageElement.className =
        "save-playlist-message";

    let createdPlaylist = null;

    try {
        createdPlaylist = await createPrivatePlaylist(
            playlistName,
            createSavedPlaylistDescription()
        );

        await addItemsToPlaylist(
            createdPlaylist.id,
            uris,
            ({ addedCount, totalCount }) => {
                messageElement.textContent =
                    `Ajout des morceaux : ${addedCount}/${totalCount}…`;
            }
        );

        const spotifyUrl =
            createdPlaylist.external_urls?.spotify || "";

        const savedPlaylist = {
            ...createdPlaylist,
            items: {
                ...(createdPlaylist.items || {}),
                total: uris.length
            },
            tracks: {
                ...(createdPlaylist.tracks || {}),
                total: uris.length
            }
        };

        playlistsCache = [
            savedPlaylist,
            ...playlistsCache.filter(
                (playlist) =>
                    playlist.id !== savedPlaylist.id
            )
        ];

        messageElement.className =
            "save-playlist-message success";

        if (spotifyUrl) {
            messageElement.innerHTML = `
                Playlist privée créée avec
                <strong>${uris.length}</strong>
                morceau${uris.length > 1 ? "x" : ""}.
                <a
                    href="${escapeHtml(spotifyUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Ouvrir dans Spotify
                </a>
            `;
        } else {
            messageElement.textContent =
                `Playlist privée créée avec ${uris.length} ` +
                `morceau${uris.length > 1 ? "x" : ""}.`;
        }

        saveButton.textContent = "✓ Playlist enregistrée";
        cancelButton.disabled = false;
        cancelButton.textContent = "Fermer";
        form.dataset.savedPlaylistId =
            createdPlaylist.id;
    } catch (error) {
        console.error(error);

        messageElement.className =
            "save-playlist-message error";

        if (createdPlaylist) {
            messageElement.textContent =
                "La playlist a été créée, mais l’ajout des morceaux " +
                "n’a pas pu être terminé. Vérifie-la dans Spotify, " +
                "puis recommence avec un nouveau nom si nécessaire.";
        } else {
            messageElement.textContent =
                getSavePlaylistErrorMessage(error);
        }

        saveButton.disabled = false;
        saveButton.textContent =
            "Créer la playlist privée";
        cancelButton.disabled = false;
        nameInput.disabled = false;
    }
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

function isKnownNonPremiumAccount() {
    return (
        currentUserProduct &&
        currentUserProduct !== "premium"
    );
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
        !availableDevices.length ||
        !selectedTracks.length ||
        isKnownNonPremiumAccount();
}

function displayPlaylistDetails(playlist, tracks) {
    const isLikedTracks = playlist.sourceType === "liked";
    const isMultiSourceMix = playlist.sourceType === "mix";

    const playlistName = escapeHtml(
        playlist.name || "Playlist sans nom"
    );

    const ownerName = escapeHtml(
        isLikedTracks
            ? "Ta bibliothèque"
            : isMultiSourceMix
                ? "Shuffle+"
                : (
                playlist.owner?.display_name ||
                playlist.owner?.id ||
                "Spotify"
            )
    );

    const playlistUrl = (isLikedTracks || isMultiSourceMix)
        ? ""
        : (playlist.external_urls?.spotify || "");

    const imageUrl = playlist.images?.[0]?.url || "";
    const defaultSavedPlaylistName = escapeHtml(
        createDefaultSavedPlaylistName(playlist)
    );

    const cover = imageUrl
        ? `
            <img
                class="playlist-detail-cover"
                src="${escapeHtml(imageUrl)}"
                alt="Pochette de ${playlistName}"
            >
        `
        : `
            <div class="playlist-detail-cover detail-placeholder ${
                isLikedTracks
                    ? "liked-detail-placeholder"
                    : isMultiSourceMix
                        ? "mix-detail-placeholder"
                        : ""
            }">
                ${isLikedTracks ? "♥" : isMultiSourceMix ? "✨" : "🎵"}
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
                        ${isLikedTracks ? "Bibliothèque" : isMultiSourceMix ? "Mix personnalisé" : "Playlist"}
                    </span>

                    <h2>${playlistName}</h2>

                    <p>
                        ${
                            isMultiSourceMix
                                ? `${tracks.length} morceau${tracks.length > 1 ? "x" : ""} unique${tracks.length > 1 ? "s" : ""} · ${playlist.sourceCount || 0} source${(playlist.sourceCount || 0) > 1 ? "s" : ""}`
                                : `Par ${ownerName} · ${tracks.length} morceau${tracks.length > 1 ? "x" : ""}`
                        }
                    </p>

                    <div class="playlist-detail-actions">
                        <button
                            id="shuffleButton"
                            class="shuffle-button"
                            type="button"
                            ${tracks.length < 2 ? "disabled" : ""}
                        >
                            ${isMultiSourceMix ? "🧠 Mélanger à nouveau" : "🧠 Mélange intelligent"}
                        </button>

                        <button
                            id="showSavePlaylistButton"
                            class="save-playlist-button"
                            type="button"
                            ${tracks.length ? "" : "disabled"}
                        >
                            💾 Enregistrer dans Spotify
                        </button>

                        ${spotifyLink}
                    </div>
                </div>
            </div>

            <form
                id="savePlaylistForm"
                class="save-playlist-panel"
                hidden
            >
                <div class="save-playlist-heading">
                    <div>
                        <h3>Enregistrer l’ordre actuel</h3>
                        <p>
                            Shuffle+ créera une playlist privée dans
                            ton compte Spotify.
                        </p>
                    </div>
                </div>

                <label
                    class="save-playlist-field"
                    for="savePlaylistName"
                >
                    <span>Nom de la playlist</span>

                    <input
                        id="savePlaylistName"
                        name="playlistName"
                        type="text"
                        maxlength="100"
                        value="${defaultSavedPlaylistName}"
                        autocomplete="off"
                        required
                    >
                </label>

                <div class="save-playlist-actions">
                    <button
                        id="confirmSavePlaylistButton"
                        class="save-playlist-confirm"
                        type="submit"
                    >
                        Créer la playlist privée
                    </button>

                    <button
                        id="cancelSavePlaylistButton"
                        class="save-playlist-cancel"
                        type="button"
                    >
                        Annuler
                    </button>
                </div>

                <p
                    id="savePlaylistMessage"
                    class="save-playlist-message"
                    aria-live="polite"
                ></p>
            </form>

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
                            availableDevices.length &&
                            tracks.length &&
                            !isKnownNonPremiumAccount()
                                ? ""
                                : "disabled"
                        }
                    >
                        ▶ Lire cet ordre dans Spotify
                    </button>
                </div>

                <p id="playbackMessage" class="playback-message">
                    ${
                        isKnownNonPremiumAccount()
                            ? "La commande de lecture nécessite un compte Spotify Premium."
                            : availableDevices.length
                                ? "Un appareil Spotify est prêt."
                                : "Ouvre Spotify sur ton téléphone ou ton ordinateur, lance ou mets en pause un morceau, puis clique sur Actualiser."
                    }
                </p>
            </section>

            <p class="shuffle-explanation">
                Le mélange intelligent espace les artistes et les albums,
                puis évite de placer trop tôt les titres récemment envoyés
                par Shuffle+ vers Spotify.
            </p>

            <div
                id="shuffleStats"
                class="shuffle-stats"
                hidden
                aria-live="polite"
            ></div>

            <ol id="trackList" class="track-list"></ol>
        </section>
    `;

    renderTrackList();
}

function getPlaybackErrorMessage(error) {
    const spotifyMessage =
        error.spotifyMessage ||
        error.message ||
        "";

    const normalizedMessage =
        spotifyMessage.toLowerCase();

    if (
        normalizedMessage.includes("premium") ||
        normalizedMessage.includes("product")
    ) {
        return (
            "Spotify exige un compte Premium pour contrôler la lecture. " +
            "Vérifie aussi que le propriétaire de l’application Shuffle+ " +
            "possède toujours Premium."
        );
    }

    if (
        normalizedMessage.includes("no active device") ||
        normalizedMessage.includes("device not found")
    ) {
        return (
            "L’appareil n’est pas actif. Ouvre Spotify sur cet appareil, " +
            "lance ou mets en pause un morceau, actualise, puis recommence."
        );
    }

    if (
        normalizedMessage.includes("restriction") ||
        normalizedMessage.includes("restricted")
    ) {
        return (
            "Spotify refuse les commandes sur cet appareil. " +
            "Essaie l’application Spotify sur téléphone ou ordinateur."
        );
    }

    if (error.status === 403) {
        return (
            "Spotify a refusé la commande de lecture. " +
            (spotifyMessage
                ? `Détail : ${spotifyMessage}`
                : "Vérifie le compte Premium et les autorisations.")
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

    return spotifyMessage
        ? `Impossible de lancer la lecture : ${spotifyMessage}`
        : "Impossible de lancer la lecture dans Spotify.";
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

    if (isKnownNonPremiumAccount()) {
        playbackMessage.textContent =
            "La lecture à distance nécessite un compte Spotify Premium.";
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
        /*
         * On active d’abord explicitement l’appareil.
         * Dans la v0.5.0, la commande Shuffle était envoyée
         * avant l’activation et pouvait interrompre toute la lecture.
         */
        await transferPlayback(deviceId, false);
        await wait(800);

        await startPlayback(playbackUris, deviceId);

        /*
         * La désactivation du shuffle Spotify est volontairement
         * non bloquante : la lecture ne doit pas échouer si cette
         * commande secondaire est refusée par l’appareil.
         */
        await wait(600);

        try {
            await setPlaybackShuffle(false, deviceId);
        } catch (shuffleError) {
            console.warn(
                "Impossible de désactiver le shuffle Spotify :",
                shuffleError
            );
        }

        const truncatedText =
            allUris.length > playbackUris.length
                ? ` Les ${playbackUris.length} premiers morceaux de cet ordre ont été envoyés.`
                : "";

        rememberPlaybackOrder(
            selectedTracks.slice(0, playbackUris.length)
        );

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

function deduplicateTracks(tracks) {
    const uniqueTracks = [];
    const seenKeys = new Set();

    for (const track of tracks) {
        const key = track?.uri || track?.id || "";

        if (!key || seenKeys.has(key)) {
            continue;
        }

        seenKeys.add(key);
        uniqueTracks.push(track);
    }

    return uniqueTracks;
}

async function createSelectedMix() {
    const selectedKeys = [...selectedSourceKeys];

    if (!selectedKeys.length) {
        setStatus(
            "Sélectionne au moins une source pour créer un mix.",
            "error"
        );
        return;
    }

    if (selectedKeys.length > MAX_MIX_SOURCES) {
        setStatus(
            `Le mix est limité à ${MAX_MIX_SOURCES} sources pour cette version.`,
            "error"
        );
        return;
    }

    const sourceDefinitions = selectedKeys
        .map((sourceKey) => {
            if (sourceKey === "liked") {
                return {
                    key: sourceKey,
                    name: "Morceaux aimés",
                    loader: () => getMySavedTracks()
                };
            }

            const playlistId = sourceKey.replace(/^playlist:/, "");
            const playlist = playlistsCache.find(
                (item) => item.id === playlistId
            );

            if (!playlist || !canReadPlaylist(playlist)) {
                return null;
            }

            return {
                key: sourceKey,
                name: playlist.name || "Playlist sans nom",
                loader: () => getPlaylistItems(playlist.id)
            };
        })
        .filter(Boolean);

    if (!sourceDefinitions.length) {
        setStatus(
            "Aucune des sources sélectionnées n’est accessible.",
            "error"
        );
        return;
    }

    contentElement.innerHTML = `
        <section class="loading-panel mix-loading-panel">
            <h2>Création du mix…</h2>
            <p id="mixLoadingMessage">
                Préparation des sources sélectionnées.
            </p>
        </section>
    `;

    setStatus("Création du mix multi-sources…");

    const collectedTracks = [];
    const loadedSourceNames = [];
    const failedSourceNames = [];

    try {
        for (
            let index = 0;
            index < sourceDefinitions.length;
            index += 1
        ) {
            const source = sourceDefinitions[index];
            const loadingMessage = document.getElementById(
                "mixLoadingMessage"
            );

            if (loadingMessage) {
                loadingMessage.textContent =
                    `Chargement ${index + 1}/${sourceDefinitions.length} : ${source.name}`;
            }

            try {
                const tracks = await source.loader();
                collectedTracks.push(...tracks);
                loadedSourceNames.push(source.name);
            } catch (error) {
                console.warn(
                    `Source ignorée : ${source.name}`,
                    error
                );
                failedSourceNames.push(source.name);
            }
        }

        const uniqueTracks = deduplicateTracks(collectedTracks);

        if (!uniqueTracks.length) {
            throw new Error(
                "Aucun morceau lisible n’a été trouvé dans les sources sélectionnées."
            );
        }

        availableDevices = await getAvailableDevices().catch(
            (error) => {
                console.warn(
                    "Appareils Spotify indisponibles :",
                    error
                );
                return [];
            }
        );

        selectedPlaylist = {
            id: "shuffleplus-multi-source-mix",
            name: "Mix Shuffle+",
            sourceType: "mix",
            sourceCount: loadedSourceNames.length,
            sourceNames: loadedSourceNames,
            owner: {
                display_name: "Shuffle+"
            },
            images: [],
            external_urls: {}
        };

        sourceTracks = uniqueTracks;
        selectedTracks = smartShuffleTracks(sourceTracks);

        displayPlaylistDetails(
            selectedPlaylist,
            selectedTracks
        );
        renderShuffleStats(
            analyzeShuffleOrder(selectedTracks)
        );

        const shuffleButton = document.getElementById(
            "shuffleButton"
        );

        if (shuffleButton) {
            shuffleButton.textContent = "🧠 Mélanger à nouveau";
        }

        const duplicateCount =
            collectedTracks.length - uniqueTracks.length;

        const summaryParts = [
            `${uniqueTracks.length} morceau${uniqueTracks.length > 1 ? "x" : ""} unique${uniqueTracks.length > 1 ? "s" : ""}`,
            `${loadedSourceNames.length} source${loadedSourceNames.length > 1 ? "s" : ""}`
        ];

        if (duplicateCount > 0) {
            summaryParts.push(
                `${duplicateCount} doublon${duplicateCount > 1 ? "s" : ""} retiré${duplicateCount > 1 ? "s" : ""}`
            );
        }

        if (failedSourceNames.length) {
            summaryParts.push(
                `${failedSourceNames.length} source${failedSourceNames.length > 1 ? "s" : ""} ignorée${failedSourceNames.length > 1 ? "s" : ""}`
            );
        }

        setStatus(
            `Mix créé : ${summaryParts.join(" · ")}.`
        );

        contentElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        console.error(error);
        displayPlaylists(playlistsCache);
        setStatus(
            error.message || "Impossible de créer le mix.",
            "error"
        );
    }
}

async function openPlaylist(playlist) {
    selectedPlaylist = playlist;
    sourceTracks = [];
    selectedTracks = [];
    availableDevices = [];

    const isLikedTracks = playlist.sourceType === "liked";

    setStatus(`Chargement de « ${playlist.name} »…`);

    contentElement.innerHTML = `
        <section class="loading-panel">
            <p>Chargement des morceaux…</p>
        </section>
    `;

    try {
        const tracksPromise = isLikedTracks
            ? getMySavedTracks()
            : getPlaylistItems(playlist.id);

        const [tracks, devices] = await Promise.all([
            tracksPromise,
            getAvailableDevices().catch((error) => {
                console.warn(
                    "Appareils Spotify indisponibles :",
                    error
                );

                return [];
            })
        ]);

        sourceTracks = [...tracks];
        selectedTracks = [...tracks];
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

        const message = isLikedTracks
            ? "Impossible de charger tes morceaux aimés."
            : (
                error.status === 403
                    ? "Spotify ne permet pas de consulter le contenu de cette playlist avec l’application actuelle."
                    : "Impossible de charger les morceaux de cette playlist."
            );

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
        currentUserProduct = profile?.product || "";
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
    currentUserProduct = "";
    welcomeElement.textContent = "Bienvenue 👋";

    setDisconnectedInterface();
});

contentElement.addEventListener(
    "click",
    async (event) => {
        const openSourceButton =
            event.target.closest(".source-open-button");

        if (openSourceButton) {
            if (openSourceButton.dataset.librarySource === "liked") {
                await openPlaylist({
                    id: "liked-tracks",
                    name: "Morceaux aimés",
                    sourceType: "liked",
                    owner: {
                        display_name: "Ta bibliothèque"
                    },
                    images: [],
                    external_urls: {}
                });

                return;
            }

            const playlistId =
                openSourceButton.dataset.playlistId;

            const playlist = playlistsCache.find(
                (item) => item.id === playlistId
            );

            if (playlist) {
                await openPlaylist(playlist);
            }

            return;
        }

        const selectAllSourcesButton =
            event.target.closest("#selectAllSources");

        if (selectAllSourcesButton) {
            selectedSourceKeys.clear();

            if (isLikedSourceVisible()) {
                selectedSourceKeys.add("liked");
            }

            for (const playlist of getFilteredAndSortedPlaylists(playlistsCache)) {
                if (
                    canReadPlaylist(playlist) &&
                    selectedSourceKeys.size < MAX_MIX_SOURCES
                ) {
                    selectedSourceKeys.add(
                        getPlaylistSourceKey(playlist.id)
                    );
                }
            }

            setStatus(
                `${selectedSourceKeys.size} source${selectedSourceKeys.size > 1 ? "s" : ""} visible${selectedSourceKeys.size > 1 ? "s" : ""} sélectionnée${selectedSourceKeys.size > 1 ? "s" : ""}.`
            );
            displayPlaylists(playlistsCache);
            return;
        }

        const clearSourceSelectionButton =
            event.target.closest("#clearSourceSelection");

        if (clearSourceSelectionButton) {
            selectedSourceKeys.clear();
            displayPlaylists(playlistsCache);
            return;
        }

        const createMixButton =
            event.target.closest("#createMixButton");

        if (createMixButton) {
            await createSelectedMix();
            return;
        }

        const resetLibraryFiltersButton =
            event.target.closest("#resetLibraryFilters");

        if (resetLibraryFiltersButton) {
            librarySearchTerm = "";
            libraryFilter = "all";
            librarySort = "name-asc";
            displayPlaylists(playlistsCache);
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

        const showSavePlaylistButton =
            event.target.closest("#showSavePlaylistButton");

        if (showSavePlaylistButton) {
            const savePanel = document.getElementById(
                "savePlaylistForm"
            );
            const nameInput = document.getElementById(
                "savePlaylistName"
            );

            if (savePanel) {
                savePanel.hidden = false;
                savePanel.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

            if (nameInput) {
                window.setTimeout(() => {
                    nameInput.focus();
                    nameInput.select();
                }, 250);
            }

            return;
        }

        const cancelSavePlaylistButton =
            event.target.closest("#cancelSavePlaylistButton");

        if (cancelSavePlaylistButton) {
            const savePanel = document.getElementById(
                "savePlaylistForm"
            );

            if (savePanel) {
                savePanel.hidden = true;
            }

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
            selectedTracks = smartShuffleTracks(sourceTracks);

            renderTrackList();
            renderShuffleStats(
                analyzeShuffleOrder(selectedTracks)
            );

            shuffleButton.textContent =
                "✅ Ordre intelligent créé";

            window.setTimeout(() => {
                if (
                    document.body.contains(shuffleButton)
                ) {
                    shuffleButton.textContent =
                        "🧠 Mélanger à nouveau";
                }
            }, 1200);
        }
    }
);

contentElement.addEventListener(
    "submit",
    async (event) => {
        if (event.target.id !== "savePlaylistForm") {
            return;
        }

        event.preventDefault();
        await saveCurrentOrderToSpotify();
    }
);

contentElement.addEventListener(
    "change",
    async (event) => {
        if (event.target.id === "libraryFilterSelect") {
            libraryFilter = event.target.value;
            displayPlaylists(playlistsCache);
            return;
        }

        if (event.target.id === "librarySortSelect") {
            librarySort = event.target.value;
            displayPlaylists(playlistsCache);

            if (librarySort.startsWith("modified")) {
                await ensureModificationDatesLoaded();
                displayPlaylists(playlistsCache);
            }

            return;
        }

        const checkbox = event.target.closest(
            ".source-checkbox"
        );

        if (!checkbox) {
            return;
        }

        const sourceKey = checkbox.dataset.sourceKey || "";

        if (!sourceKey) {
            return;
        }

        if (checkbox.checked) {
            if (selectedSourceKeys.size >= MAX_MIX_SOURCES) {
                checkbox.checked = false;
                setStatus(
                    `Tu peux sélectionner jusqu’à ${MAX_MIX_SOURCES} sources dans cette version.`,
                    "error"
                );
                return;
            }

            selectedSourceKeys.add(sourceKey);
            setStatus("");
        } else {
            selectedSourceKeys.delete(sourceKey);
        }

        updateMixSelectionControls();
    }
);

contentElement.addEventListener(
    "input",
    (event) => {
        if (event.target.id !== "librarySearchInput") {
            return;
        }

        const cursorPosition = event.target.selectionStart;
        librarySearchTerm = event.target.value;
        displayPlaylists(playlistsCache);

        const searchInput = document.getElementById(
            "librarySearchInput"
        );

        if (searchInput) {
            searchInput.focus();
            const nextCursor = Math.min(
                cursorPosition ?? librarySearchTerm.length,
                librarySearchTerm.length
            );
            searchInput.setSelectionRange(nextCursor, nextCursor);
        }
    }
);

initializeApp();
