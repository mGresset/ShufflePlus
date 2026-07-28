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
    getPlaylistLastAddedAt,
    getRecentlyPlayedPlaylistActivity
} from "./spotify-api.js";

import {
    ADAPTIVE_SLOTS,
    getAdaptiveSlot
} from "./adaptive-dj.js";

const versionElement = document.querySelector(".version");
const welcomeElement = document.getElementById("welcome");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const contentElement = document.getElementById("content");
const statusElement = document.getElementById("status");
const installAppButton =
    document.getElementById("installAppButton");
const networkBannerElement =
    document.getElementById("networkBanner");
const pwaInstallGuideElement =
    document.getElementById("pwaInstallGuide");
const pwaUpdateBannerElement =
    document.getElementById("pwaUpdateBanner");
const applyPwaUpdateButton =
    document.getElementById("applyPwaUpdateButton");
const dismissPwaUpdateButton =
    document.getElementById("dismissPwaUpdateButton");

const APP_VERSION = "4.0.0";
const MAX_DIRECT_PLAYBACK_TRACKS = 100;
const MAX_MIX_SOURCES = 12;
const MODIFICATION_CACHE_KEY =
    "shuffleplus_playlist_modification_dates_v1";
const MODIFICATION_CACHE_TTL = 24 * 60 * 60 * 1000;
const MODIFICATION_REQUEST_CONCURRENCY = 4;
const RECENT_ACTIVITY_CACHE_KEY =
    "shuffleplus_recent_playlist_activity_v1";
const RECENT_ACTIVITY_CACHE_TTL = 60 * 60 * 1000;
const FAVORITE_SOURCES_KEY = "shuffleplus_favorite_sources_v1";
const SAVED_MIXES_KEY = "shuffleplus_saved_mixes_v1";
const MAX_SAVED_MIXES = 20;
const TRACK_HISTORY_KEY = "shuffleplus_recent_track_uris_v1";
const BACKUP_FORMAT = "shuffleplus-backup";
const BACKUP_SCHEMA_VERSION = 1;
const MAX_IMPORTED_FAVORITES = 500;
const MAX_IMPORTED_HISTORY = 50;
const PLAYBACK_QUEUE_STATE_KEY = "shuffleplus_playback_queue_state_v1";
const PLAYBACK_QUEUE_STATE_TTL = 30 * 24 * 60 * 60 * 1000;
const MIX_HISTORY_KEY = "shuffleplus_mix_history_v1";
const MAX_MIX_HISTORY_ITEMS = 50;
const EXCLUSION_RULES_KEY = "shuffleplus_exclusion_rules_v1";
const MAX_EXCLUDED_TEXT_ITEMS = 100;
const MIX_PROFILES_KEY = "shuffleplus_mix_profiles_v1";
const ACTIVE_PROFILE_KEY = "shuffleplus_active_profile_v1";
const MAX_MIX_PROFILES = 20;
const PRIORITY_RULES_KEY = "shuffleplus_priority_rules_v1";
const MAX_PRIORITY_TEXT_ITEMS = 100;
const DEFAULT_PRIORITY_RULES = {
    favoredArtists: [],
    favoredAlbums: [],
    favoredTrackUris: [],
    intensity: "normal",
    boostFirstTwenty: true
};
const COHERENCE_SETTINGS_KEY =
    "shuffleplus_coherence_settings_v1";
const DEFAULT_COHERENCE_SETTINGS = {
    level: "balanced",
    strengthenFirstThirty: true,
    durationJumpSeconds: 150
};
const INTENSITY_SETTINGS_KEY =
    "shuffleplus_intensity_settings_v1";
const DEFAULT_INTENSITY_SETTINGS = {
    curve: "stable",
    startIntensity: 45,
    endIntensity: 65,
    peakIntensity: 85,
    strength: "normal",
    smoothTransitions: true
};
const ADAPTIVE_SETTINGS_KEY =
    "shuffleplus_adaptive_settings_v1";
const DEFAULT_ADAPTIVE_SETTINGS = {
    enabled: false,
    autoProfileByTime: true,
    adaptIntensityByTime: true,
    durationMode: "none",
    customDurationMinutes: 60,
    targetTrackCount: 0
};
const CLEANUP_SETTINGS_KEY =
    "shuffleplus_cleanup_settings_v1";
const DEFAULT_CLEANUP_SETTINGS = {
    enabled: true,
    level: "normal",
    keepRemix: true,
    keepLive: true,
    preferOriginal: true,
    removeUnavailable: true
};
const IOS_QUICKPLAY_KEY =
    "shuffleplus_ios_quickplay_v1";
const PENDING_AUTOMATION_KEY =
    "shuffleplus_pending_automation_v1";
const DEFAULT_IOS_QUICKPLAY_SETTINGS = {
    playlistId: "",
    playlistName: "",
    deviceMode: "iphone",
    deviceName: "",
    shuffle: false,
    startFromBeginning: true,
    autoRetryCount: 5,
    retryDelayMs: 1200
};
const IOS_COMMANDS_KEY =
    "shuffleplus_ios_commands_v1";
const IOS_COMMAND_HISTORY_KEY =
    "shuffleplus_ios_command_history_v1";
const MAX_IOS_COMMANDS = 20;
const MAX_IOS_COMMAND_HISTORY = 40;
const APP_MENU_KEY =
    "shuffleplus_active_menu_v1";
const ADAPTIVE_DJ_MENU_KEY =
    "shuffleplus_adaptive_dj_menu_v1";
const ADAPTIVE_DJ_HISTORY_KEY =
    "shuffleplus_adaptive_dj_history_v1";
const MAX_ADAPTIVE_DJ_HISTORY = 40;
const DEFAULT_ADAPTIVE_DJ_MENU_SETTINGS = {
    enabled: true,
    slots: {
        morning: "",
        focus: "",
        drive: "",
        evening: "",
        night: ""
    }
};
const ADAPTIVE_LEARNING_KEY =
    "shuffleplus_adaptive_learning_v1";
const MAX_ADAPTIVE_LEARNING_OBSERVATIONS = 300;
const MAX_ADAPTIVE_LEARNING_DECISIONS = 80;
const MAX_ADAPTIVE_AUTO_CHANGES = 80;
const DEFAULT_ADAPTIVE_AUTO_CONFIDENCE = 75;
const DEFAULT_ADAPTIVE_AUTO_OBSERVATIONS = 5;
const ADAPTIVE_LEARNING_OBSERVATION_TTL =
    180 * 24 * 60 * 60 * 1000;
const ADAPTIVE_LEARNING_MIN_OBSERVATIONS = 3;
const ADAPTIVE_LEARNING_MIN_CONFIDENCE = 45;
const DEFAULT_ADAPTIVE_LEARNING_STATE = {
    enabled: true,
    autoApplyEnabled: false,
    autoApplyMinConfidence:
        DEFAULT_ADAPTIVE_AUTO_CONFIDENCE,
    autoApplyMinObservations:
        DEFAULT_ADAPTIVE_AUTO_OBSERVATIONS,
    observations: [],
    dismissedSuggestions: [],
    acceptedSuggestions: [],
    autoApplyHistory: [],
    updatedAt: 0
};
const INTELLIGENCE_ANALYTICS_KEY =
    "shuffleplus_intelligence_analytics_v1";
const MAX_INTELLIGENCE_EVENTS = 500;
const DEFAULT_INTELLIGENCE_ANALYTICS = {
    rangeDays: 30,
    eventTypeFilter: "all",
    dayTypeFilter: "all",
    events: [],
    updatedAt: 0
};
const LAST_ADAPTIVE_PROPOSAL_KEY =
    "shuffleplus_last_adaptive_proposal_v1";
const ADAPTIVE_CORRECTION_WINDOW =
    30 * 60 * 1000;
const MIX_SCHEDULES_KEY =
    "shuffleplus_mix_schedules_v1";
const MAX_MIX_SCHEDULES = 30;
const SCHEDULE_CHECK_INTERVAL = 30 * 1000;
const SCHEDULE_GRACE_PERIOD = 15 * 60 * 1000;
const SCHEDULE_MISSED_WARNING_PERIOD =
    12 * 60 * 60 * 1000;
const DEFAULT_EXCLUSION_RULES = {
    excludedArtists: [],
    excludedAlbums: [],
    excludedTrackUris: [],
    hideExplicit: false,
    minDurationSeconds: 0,
    maxDurationSeconds: 0,
    excludeLive: false,
    excludeRemix: false,
    excludeInstrumental: false,
    excludeKaraoke: false
};


const DEFAULT_MIX_PROFILES = [
    {
        id: "profile-sport",
        name: "Sport",
        icon: "🏃",
        description: "Rythme soutenu, montée progressive et titres très courts évités.",
        isDefault: true,
        shuffleSettings: {
            preset: "strict",
            artistGap: 5,
            albumGap: 3,
            recentAvoidance: 2
        },
        exclusionRules: {
            ...DEFAULT_EXCLUSION_RULES,
            minDurationSeconds: 120
        },
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES,
            intensity: "strong",
            boostFirstTwenty: true
        },
        coherenceSettings: {
            ...DEFAULT_COHERENCE_SETTINGS,
            level: "fluid"
        },
        intensitySettings: {
            ...DEFAULT_INTENSITY_SETTINGS,
            curve: "rising",
            startIntensity: 35,
            endIntensity: 90,
            peakIntensity: 90,
            strength: "strong"
        }
    },
    {
        id: "profile-soiree",
        name: "Soirée",
        icon: "🎉",
        description: "Deux temps forts avec une énergie élevée et variée.",
        isDefault: true,
        shuffleSettings: {
            preset: "balanced",
            artistGap: 4,
            albumGap: 2,
            recentAvoidance: 1
        },
        exclusionRules: {
            ...DEFAULT_EXCLUSION_RULES,
            excludeInstrumental: true,
            excludeKaraoke: true
        },
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        },
        coherenceSettings: {
            ...DEFAULT_COHERENCE_SETTINGS
        },
        intensitySettings: {
            ...DEFAULT_INTENSITY_SETTINGS,
            curve: "waves",
            startIntensity: 55,
            endIntensity: 80,
            peakIntensity: 95,
            strength: "strong"
        }
    },
    {
        id: "profile-famille",
        name: "Famille",
        icon: "👨‍👩‍👧‍👦",
        description: "Ambiance stable, explicites, live, remix et karaoké masqués.",
        isDefault: true,
        shuffleSettings: {
            preset: "balanced",
            artistGap: 3,
            albumGap: 2,
            recentAvoidance: 2
        },
        exclusionRules: {
            ...DEFAULT_EXCLUSION_RULES,
            hideExplicit: true,
            excludeLive: true,
            excludeRemix: true,
            excludeKaraoke: true
        },
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        },
        coherenceSettings: {
            ...DEFAULT_COHERENCE_SETTINGS
        },
        intensitySettings: {
            ...DEFAULT_INTENSITY_SETTINGS,
            curve: "stable",
            startIntensity: 55,
            endIntensity: 55,
            peakIntensity: 65
        }
    },
    {
        id: "profile-decouverte",
        name: "Découverte",
        icon: "🔭",
        description: "Espacement fort des artistes et courbe en vagues.",
        isDefault: true,
        shuffleSettings: {
            preset: "strict",
            artistGap: 7,
            albumGap: 4,
            recentAvoidance: 3
        },
        exclusionRules: {
            ...DEFAULT_EXCLUSION_RULES
        },
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        },
        coherenceSettings: {
            ...DEFAULT_COHERENCE_SETTINGS
        },
        intensitySettings: {
            ...DEFAULT_INTENSITY_SETTINGS,
            curve: "waves",
            startIntensity: 40,
            endIntensity: 65,
            peakIntensity: 85
        }
    },
    {
        id: "profile-concentration",
        name: "Concentration",
        icon: "🧠",
        description: "Énergie stable et transitions très fluides pour une écoute régulière.",
        isDefault: true,
        shuffleSettings: {
            preset: "soft",
            artistGap: 3,
            albumGap: 2,
            recentAvoidance: 1
        },
        exclusionRules: {
            ...DEFAULT_EXCLUSION_RULES,
            minDurationSeconds: 150,
            excludeLive: true,
            excludeRemix: true,
            excludeKaraoke: true
        },
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        },
        coherenceSettings: {
            ...DEFAULT_COHERENCE_SETTINGS,
            level: "fluid"
        },
        intensitySettings: {
            ...DEFAULT_INTENSITY_SETTINGS,
            curve: "stable",
            startIntensity: 35,
            endIntensity: 35,
            peakIntensity: 45,
            strength: "strong"
        }
    }
];

const DEFAULT_SHUFFLE_SETTINGS = {
    preset: "balanced",
    artistGap: 3,
    albumGap: 2,
    recentAvoidance: 2
};

const SHUFFLE_PRESETS = {
    soft: {
        preset: "soft",
        artistGap: 2,
        albumGap: 1,
        recentAvoidance: 1
    },
    balanced: {
        preset: "balanced",
        artistGap: 3,
        albumGap: 2,
        recentAvoidance: 2
    },
    strict: {
        preset: "strict",
        artistGap: 5,
        albumGap: 3,
        recentAvoidance: 3
    },
    custom: {
        preset: "custom",
        artistGap: 3,
        albumGap: 2,
        recentAvoidance: 2
    }
};

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
const playlistRecentActivity = new Map();
let recentActivityLoading = false;
const favoriteSourceKeys = new Set(readFavoriteSources());
let savedMixes = readSavedMixes();
let editingSavedMixId = "";
let configuringSavedMixId = "";
let currentShuffleSettings = {
    ...DEFAULT_SHUFFLE_SETTINGS
};
let originalGeneratedOrder = [];
let trackSearchTerm = "";
let draggedTrackIndex = -1;
let playbackQueueCursor = 0;
let playbackQueueResumeKey = "";
let pendingSavedMixResumeKey = "";
let mixHistory = readMixHistory();
let activeHistoryId = "";
let currentExclusionRules = readExclusionRules();
let lastExclusionSummary = null;
let mixProfiles = readMixProfiles();
let activeProfileId = readActiveProfileId();
let currentPriorityRules = readPriorityRules();
let lastPrioritySummary = null;
let currentCoherenceSettings = readCoherenceSettings();
let currentIntensitySettings = readIntensitySettings();
let currentAdaptiveSettings = readAdaptiveSettings();
let activeAdaptiveContext = null;
let currentCleanupSettings = readCleanupSettings();
let lastCleanupSummary = null;
let lastCleanupSnapshot = null;
let iosQuickPlaySettings =
    readIosQuickPlaySettings();
let iosCommands = readIosCommands();
let iosCommandHistory =
    readIosCommandHistory();
let activeAppMenu = readActiveAppMenu();
let adaptiveDjMenuSettings =
    readAdaptiveDjMenuSettings();
let adaptiveDjMenuHistory =
    readAdaptiveDjMenuHistory();
let adaptiveLearningState =
    readAdaptiveLearningState();
let intelligenceAnalytics =
    readIntelligenceAnalytics();
let lastAdaptiveProposal =
    readLastAdaptiveProposal();
let editingIosCommandId = "";
let pendingAutomationCommand =
    readPendingAutomationCommand();
let automationRunInProgress = false;
let mixSchedules = readMixSchedules();
let scheduleCheckTimer = 0;
let scheduleRunInProgress = false;
let pendingScheduledPlayback = null;
let deferredPwaInstallPrompt = null;
let pwaRegistration = null;
let pwaReloadRequested = false;

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
    editingSavedMixId = "";
    configuringSavedMixId = "";
    currentShuffleSettings = { ...DEFAULT_SHUFFLE_SETTINGS };
    originalGeneratedOrder = [];
    trackSearchTerm = "";
    draggedTrackIndex = -1;
    playbackQueueCursor = 0;
    playbackQueueResumeKey = "";
    pendingSavedMixResumeKey = "";
    automationRunInProgress = false;
    editingIosCommandId = "";
    activeHistoryId = "";
    lastExclusionSummary = null;
    lastPrioritySummary = null;
    lastCleanupSummary = null;
    lastCleanupSnapshot = null;
    playlistModificationDates.clear();
    playlistRecentActivity.clear();
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

function isIosDevice() {
    const platform = navigator.userAgent || "";
    const touchMac =
        navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1;

    return /iPad|iPhone|iPod/.test(platform) || touchMac;
}

function isStandalonePwa() {
    return (
        window.matchMedia(
            "(display-mode: standalone)"
        ).matches ||
        window.navigator.standalone === true
    );
}

function getPwaInstallState() {
    if (isStandalonePwa()) {
        return {
            id: "installed",
            label: "Installée",
            description:
                "Shuffle+ fonctionne déjà comme une application autonome."
        };
    }

    if (deferredPwaInstallPrompt) {
        return {
            id: "available",
            label: "Installation disponible",
            description:
                "Ce navigateur peut installer Shuffle+ directement."
        };
    }

    if (isIosDevice()) {
        return {
            id: "ios",
            label: "Ajout manuel sur iPhone",
            description:
                "Dans Safari, utilise Partager puis Sur l’écran d’accueil."
        };
    }

    return {
        id: "browser",
        label: "Selon le navigateur",
        description:
            "Utilise le menu du navigateur pour installer l’application lorsqu’il le propose."
    };
}

function syncPwaInstallControls() {
    if (!installAppButton) {
        return;
    }

    const state = getPwaInstallState();
    const shouldShow =
        state.id === "available" ||
        state.id === "ios";

    installAppButton.hidden = !shouldShow;
    installAppButton.disabled =
        state.id === "installed";
    installAppButton.textContent =
        state.id === "ios"
            ? "＋ Ajouter à l’écran d’accueil"
            : "⬇ Installer l’application";
}

function refreshPwaPanel() {
    const currentPanel =
        document.getElementById("pwaSettingsPanel");

    if (currentPanel) {
        currentPanel.outerHTML =
            renderPwaSettingsPanel();
    }
}

function updateNetworkStatus() {
    const offline = !navigator.onLine;
    document.body.classList.toggle(
        "is-offline",
        offline
    );

    if (networkBannerElement) {
        networkBannerElement.hidden = !offline;
    }
}

function showPwaInstallGuide() {
    if (!pwaInstallGuideElement) {
        return;
    }

    const ios = isIosDevice();
    const installed = isStandalonePwa();

    pwaInstallGuideElement.innerHTML = installed
        ? `
            <div>
                <strong>Shuffle+ est déjà installée.</strong>
                <p>
                    Ouvre-la depuis ton écran d’accueil ou ton menu d’applications.
                </p>
            </div>
            <button
                type="button"
                data-close-pwa-guide
                aria-label="Fermer"
            >×</button>
        `
        : ios
            ? `
                <div>
                    <strong>Installer Shuffle+ sur iPhone ou iPad</strong>
                    <ol>
                        <li>Ouvre cette page dans Safari.</li>
                        <li>Touche le bouton Partager.</li>
                        <li>Choisis « Sur l’écran d’accueil ».</li>
                        <li>Valide avec « Ajouter ».</li>
                    </ol>
                </div>
                <button
                    type="button"
                    data-close-pwa-guide
                    aria-label="Fermer"
                >×</button>
            `
            : `
                <div>
                    <strong>Installer Shuffle+</strong>
                    <p>
                        Ouvre le menu de ton navigateur puis choisis
                        « Installer l’application » ou
                        « Ajouter à l’écran d’accueil ».
                    </p>
                </div>
                <button
                    type="button"
                    data-close-pwa-guide
                    aria-label="Fermer"
                >×</button>
            `;

    pwaInstallGuideElement.hidden = false;
    pwaInstallGuideElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

async function requestPwaInstallation() {
    if (isStandalonePwa()) {
        showPwaInstallGuide();
        return;
    }

    if (!deferredPwaInstallPrompt) {
        showPwaInstallGuide();
        return;
    }

    try {
        deferredPwaInstallPrompt.prompt();
        const choice =
            await deferredPwaInstallPrompt.userChoice;

        deferredPwaInstallPrompt = null;
        syncPwaInstallControls();
        refreshPwaPanel();

        if (choice?.outcome === "accepted") {
            setStatus(
                "Installation de Shuffle+ lancée."
            );
        }
    } catch (error) {
        console.warn(
            "Installation PWA impossible :",
            error
        );
        showPwaInstallGuide();
    }
}

function showPwaUpdateBanner() {
    if (pwaUpdateBannerElement) {
        pwaUpdateBannerElement.hidden = false;
    }
}

function hidePwaUpdateBanner() {
    if (pwaUpdateBannerElement) {
        pwaUpdateBannerElement.hidden = true;
    }
}

async function checkForPwaUpdate() {
    if (!pwaRegistration) {
        setStatus(
            "Le service d’installation n’est pas encore prêt."
        );
        return;
    }

    try {
        setStatus(
            "Recherche d’une mise à jour…"
        );
        await pwaRegistration.update();

        if (pwaRegistration.waiting) {
            showPwaUpdateBanner();
            setStatus(
                "Une mise à jour est prête."
            );
        } else {
            setStatus(
                "Shuffle+ est à jour."
            );
        }
    } catch (error) {
        console.warn(
            "Recherche de mise à jour impossible :",
            error
        );
        setStatus(
            "Impossible de vérifier la mise à jour.",
            "error"
        );
    }
}

function watchPwaRegistration(registration) {
    if (registration.waiting &&
        navigator.serviceWorker.controller) {
        showPwaUpdateBanner();
    }

    registration.addEventListener(
        "updatefound",
        () => {
            const worker =
                registration.installing;

            if (!worker) {
                return;
            }

            worker.addEventListener(
                "statechange",
                () => {
                    if (
                        worker.state === "installed" &&
                        navigator.serviceWorker.controller
                    ) {
                        showPwaUpdateBanner();
                    }
                }
            );
        }
    );
}

async function registerPwa() {
    if (!("serviceWorker" in navigator)) {
        syncPwaInstallControls();
        return;
    }

    try {
        pwaRegistration =
            await navigator.serviceWorker.register(
                "./service-worker.js",
                { scope: "./" }
            );

        watchPwaRegistration(
            pwaRegistration
        );
        refreshPwaPanel();
    } catch (error) {
        console.warn(
            "Service worker non enregistré :",
            error
        );
    }
}

function initializePwa() {
    updateNetworkStatus();
    syncPwaInstallControls();
    registerPwa();

    window.addEventListener(
        "online",
        updateNetworkStatus
    );
    window.addEventListener(
        "offline",
        updateNetworkStatus
    );

    window.addEventListener(
        "beforeinstallprompt",
        (event) => {
            event.preventDefault();
            deferredPwaInstallPrompt = event;
            syncPwaInstallControls();
            refreshPwaPanel();
        }
    );

    window.addEventListener(
        "appinstalled",
        () => {
            deferredPwaInstallPrompt = null;
            syncPwaInstallControls();
            refreshPwaPanel();
            setStatus(
                "Shuffle+ est installée."
            );
        }
    );

    navigator.serviceWorker?.addEventListener(
        "controllerchange",
        () => {
            if (!pwaReloadRequested) {
                return;
            }

            pwaReloadRequested = false;
            window.location.reload();
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState === "visible" &&
                pwaRegistration
            ) {
                pwaRegistration.update().catch(
                    () => {}
                );
            }
        }
    );
}

function renderPwaSettingsPanel() {
    const state = getPwaInstallState();
    const serviceWorkerSupported =
        "serviceWorker" in navigator;
    const cacheAvailable =
        "caches" in window;

    return `
        <section
            id="pwaSettingsPanel"
            class="settings-panel pwa-settings-panel"
        >
            <div class="panel-heading">
                <div>
                    <h3>📲 Application installable</h3>
                    <p>
                        Installe Shuffle+ comme une application et garde
                        l’interface disponible même sans réseau.
                    </p>
                </div>
                <span class="pwa-state-badge pwa-state-${state.id}">
                    ${escapeHtml(state.label)}
                </span>
            </div>

            <p class="pwa-state-description">
                ${escapeHtml(state.description)}
            </p>

            <div class="pwa-capabilities">
                <span>
                    ${serviceWorkerSupported ? "✅" : "❌"}
                    Cache de l’interface
                </span>
                <span>
                    ${cacheAvailable ? "✅" : "❌"}
                    Ressources hors connexion
                </span>
                <span>
                    ${isStandalonePwa() ? "✅" : "ℹ️"}
                    Mode application
                </span>
            </div>

            <div class="pwa-settings-actions">
                <button
                    id="installPwaSettingsButton"
                    type="button"
                    ${state.id === "installed"
                        ? "disabled"
                        : ""}
                >
                    ${state.id === "installed"
                        ? "Application installée"
                        : "Installer Shuffle+"}
                </button>

                <button
                    id="showPwaInstructionsButton"
                    type="button"
                >
                    Instructions d’installation
                </button>

                <button
                    id="checkPwaUpdateButton"
                    type="button"
                    ${serviceWorkerSupported
                        ? ""
                        : "disabled"}
                >
                    Rechercher une mise à jour
                </button>
            </div>

            <p class="pwa-offline-note">
                Le cache permet d’ouvrir l’interface hors connexion.
                Le chargement des playlists et la lecture Spotify exigent
                toujours une connexion Internet.
            </p>
        </section>
    `;
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










function normalizeIntelligenceRanking(
    values = [],
    limit = 8
) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .filter(
            (item) =>
                item &&
                typeof item === "object" &&
                typeof item.name === "string"
        )
        .map((item) => ({
            name: item.name.trim().slice(0, 120),
            count: Math.max(
                0,
                Number(item.count || 0)
            )
        }))
        .filter(
            (item) =>
                item.name &&
                item.count > 0
        )
        .slice(0, limit);
}

function normalizeIntelligenceQuality(
    quality = null
) {
    if (!quality || typeof quality !== "object") {
        return null;
    }

    const numericKeys = [
        "consecutiveArtistRepeats",
        "consecutiveAlbumRepeats",
        "consecutiveTrackRepeats",
        "recentTracksInFirstTwenty",
        "abruptTransitions",
        "durationJumpTransitions",
        "repeatedVersionTransitions",
        "intensityJumpTransitions",
        "intensityCurveAdherence",
        "averageIntensityDeviation"
    ];
    const normalized = {};

    for (const key of numericKeys) {
        normalized[key] = Math.max(
            0,
            Number(quality[key] || 0)
        );
    }

    return normalized;
}

function normalizeIntelligenceEvent(item = {}) {
    const allowedTypes = new Set([
        "mix-generated",
        "playback",
        "adaptive",
        "schedule",
        "ios",
        "correction",
        "listening-confirmed"
    ]);
    const allowedEvidence = new Set([
        "generated",
        "sent",
        "user-confirmed"
    ]);
    const createdAt = Number(
        item.createdAt || Date.now()
    );
    const date = new Date(createdAt);
    const defaultDayType = [0, 6].includes(
        date.getDay()
    )
        ? "weekend"
        : "weekday";
    const type = allowedTypes.has(item.type)
        ? item.type
        : "mix-generated";
    const defaultEvidence =
        type === "mix-generated"
            ? "generated"
            : type === "listening-confirmed"
                ? "user-confirmed"
                : type === "correction"
                    ? "generated"
                    : "sent";

    return {
        id:
            typeof item.id === "string"
                ? item.id.slice(0, 120)
                : createIosCommandId(),
        type,
        mixId:
            typeof item.mixId === "string"
                ? item.mixId.slice(0, 120)
                : "",
        mixName:
            typeof item.mixName === "string"
                ? item.mixName.slice(0, 120)
                : "Mix Shuffle+",
        source:
            typeof item.source === "string"
                ? item.source.slice(0, 40)
                : "manual",
        slotId:
            typeof item.slotId === "string"
                ? item.slotId.slice(0, 40)
                : "",
        deviceName:
            typeof item.deviceName === "string"
                ? item.deviceName.slice(0, 120)
                : "",
        trackCount: Math.max(
            0,
            Number(item.trackCount || 0)
        ),
        durationMs: Math.max(
            0,
            Number(item.durationMs || 0)
        ),
        uniqueArtists: Math.max(
            0,
            Number(item.uniqueArtists || 0)
        ),
        uniqueAlbums: Math.max(
            0,
            Number(item.uniqueAlbums || 0)
        ),
        topArtists: normalizeIntelligenceRanking(
            item.topArtists
        ),
        topAlbums: normalizeIntelligenceRanking(
            item.topAlbums
        ),
        quality: normalizeIntelligenceQuality(
            item.quality
        ),
        evidence: allowedEvidence.has(
            item.evidence
        )
            ? item.evidence
            : defaultEvidence,
        dayType:
            item.dayType === "weekend"
                ? "weekend"
                : item.dayType === "weekday"
                    ? "weekday"
                    : defaultDayType,
        hour: Math.min(
            23,
            Math.max(
                0,
                Number.isFinite(Number(item.hour))
                    ? Number(item.hour)
                    : date.getHours()
            )
        ),
        relatedEventId:
            typeof item.relatedEventId === "string"
                ? item.relatedEventId.slice(0, 120)
                : "",
        beforeMixId:
            typeof item.beforeMixId === "string"
                ? item.beforeMixId.slice(0, 120)
                : "",
        beforeMixName:
            typeof item.beforeMixName === "string"
                ? item.beforeMixName.slice(0, 120)
                : "",
        afterMixId:
            typeof item.afterMixId === "string"
                ? item.afterMixId.slice(0, 120)
                : "",
        afterMixName:
            typeof item.afterMixName === "string"
                ? item.afterMixName.slice(0, 120)
                : "",
        reason:
            typeof item.reason === "string"
                ? item.reason.slice(0, 180)
                : "",
        createdAt
    };
}

function normalizeIntelligenceAnalytics(
    state = {}
) {
    const allowedRanges = new Set([
        0,
        7,
        30,
        180
    ]);
    const allowedTypeFilters = new Set([
        "all",
        "mix-generated",
        "sent",
        "correction",
        "listening-confirmed"
    ]);
    const allowedDayFilters = new Set([
        "all",
        "weekday",
        "weekend"
    ]);
    const requestedRange = Number(
        state.rangeDays
    );
    const events = Array.isArray(state.events)
        ? state.events
            .map((item) =>
                normalizeIntelligenceEvent(item)
            )
            .filter(
                (item) =>
                    item.createdAt > 0
            )
            .sort(
                (first, second) =>
                    second.createdAt -
                    first.createdAt
            )
            .slice(0, MAX_INTELLIGENCE_EVENTS)
        : [];

    return {
        rangeDays: allowedRanges.has(
            requestedRange
        )
            ? requestedRange
            : 30,
        eventTypeFilter:
            allowedTypeFilters.has(
                state.eventTypeFilter
            )
                ? state.eventTypeFilter
                : "all",
        dayTypeFilter:
            allowedDayFilters.has(
                state.dayTypeFilter
            )
                ? state.dayTypeFilter
                : "all",
        events,
        updatedAt: Number(
            state.updatedAt || Date.now()
        )
    };
}

function readIntelligenceAnalytics() {
    try {
        const raw = localStorage.getItem(
            INTELLIGENCE_ANALYTICS_KEY
        );

        return normalizeIntelligenceAnalytics(
            raw
                ? JSON.parse(raw)
                : DEFAULT_INTELLIGENCE_ANALYTICS
        );
    } catch (error) {
        console.warn(
            "Statistiques Intelligence illisibles :",
            error
        );
        return normalizeIntelligenceAnalytics(
            DEFAULT_INTELLIGENCE_ANALYTICS
        );
    }
}

function saveIntelligenceAnalytics() {
    intelligenceAnalytics =
        normalizeIntelligenceAnalytics({
            ...intelligenceAnalytics,
            updatedAt: Date.now()
        });

    try {
        localStorage.setItem(
            INTELLIGENCE_ANALYTICS_KEY,
            JSON.stringify(
                intelligenceAnalytics
            )
        );
    } catch (error) {
        console.warn(
            "Statistiques Intelligence non enregistrées :",
            error
        );
    }
}

function summarizeTracksForIntelligence(
    tracks = []
) {
    const validTracks = Array.isArray(tracks)
        ? tracks.filter(Boolean)
        : [];
    const artists = [];
    const albums = [];
    let durationMs = 0;

    for (const track of validTracks) {
        durationMs += Math.max(
            0,
            Number(track?.duration_ms || 0)
        );

        for (const artist of track?.artists || []) {
            if (artist?.name) {
                artists.push(artist.name);
            }
        }

        if (track?.album?.name) {
            albums.push(track.album.name);
        }
    }

    return {
        trackCount: validTracks.length,
        durationMs,
        uniqueArtists:
            new Set(artists).size,
        uniqueAlbums:
            new Set(albums).size,
        topArtists: countTopValues(
            artists,
            8
        ),
        topAlbums: countTopValues(
            albums,
            8
        )
    };
}

function recordIntelligenceEvent({
    type = "mix-generated",
    mixId = "",
    mixName = "Mix Shuffle+",
    source = "manual",
    slotId = "",
    deviceName = "",
    tracks = [],
    trackCount = 0,
    durationMs = 0,
    quality = null,
    evidence = "",
    relatedEventId = "",
    beforeMixId = "",
    beforeMixName = "",
    afterMixId = "",
    afterMixName = "",
    reason = "",
    createdAt = Date.now()
} = {}) {
    const trackSummary =
        summarizeTracksForIntelligence(
            tracks
        );
    const event = normalizeIntelligenceEvent({
        id: createIosCommandId(),
        type,
        mixId,
        mixName,
        source,
        slotId,
        deviceName,
        trackCount:
            trackSummary.trackCount ||
            trackCount,
        durationMs:
            trackSummary.durationMs ||
            durationMs,
        uniqueArtists:
            trackSummary.uniqueArtists,
        uniqueAlbums:
            trackSummary.uniqueAlbums,
        topArtists:
            trackSummary.topArtists,
        topAlbums:
            trackSummary.topAlbums,
        quality,
        evidence,
        relatedEventId,
        beforeMixId,
        beforeMixName,
        afterMixId,
        afterMixName,
        reason,
        createdAt
    });

    intelligenceAnalytics =
        normalizeIntelligenceAnalytics({
            ...intelligenceAnalytics,
            events: [
                event,
                ...intelligenceAnalytics.events
            ]
        });
    saveIntelligenceAnalytics();

    return event;
}

function normalizeLastAdaptiveProposal(
    value = null
) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const createdAt = Number(
        value.createdAt || 0
    );

    if (
        !createdAt ||
        Date.now() - createdAt >
            ADAPTIVE_CORRECTION_WINDOW
    ) {
        return null;
    }

    return {
        slotId:
            typeof value.slotId === "string"
                ? value.slotId.slice(0, 40)
                : "",
        slotLabel:
            typeof value.slotLabel === "string"
                ? value.slotLabel.slice(0, 100)
                : "Adaptive DJ",
        mixId:
            typeof value.mixId === "string"
                ? value.mixId.slice(0, 120)
                : "",
        mixName:
            typeof value.mixName === "string"
                ? value.mixName.slice(0, 120)
                : "",
        relatedEventId:
            typeof value.relatedEventId === "string"
                ? value.relatedEventId.slice(0, 120)
                : "",
        createdAt
    };
}

function readLastAdaptiveProposal() {
    try {
        const raw = localStorage.getItem(
            LAST_ADAPTIVE_PROPOSAL_KEY
        );
        const value = normalizeLastAdaptiveProposal(
            raw ? JSON.parse(raw) : null
        );

        if (!value && raw) {
            localStorage.removeItem(
                LAST_ADAPTIVE_PROPOSAL_KEY
            );
        }

        return value;
    } catch (error) {
        return null;
    }
}

function saveLastAdaptiveProposal(value) {
    lastAdaptiveProposal =
        normalizeLastAdaptiveProposal(value);

    try {
        if (lastAdaptiveProposal) {
            localStorage.setItem(
                LAST_ADAPTIVE_PROPOSAL_KEY,
                JSON.stringify(
                    lastAdaptiveProposal
                )
            );
        } else {
            localStorage.removeItem(
                LAST_ADAPTIVE_PROPOSAL_KEY
            );
        }
    } catch (error) {
        console.warn(
            "Proposition Adaptive non mémorisée :",
            error
        );
    }
}

function rememberAdaptiveProposal({
    slot,
    mix,
    relatedEventId = ""
} = {}) {
    if (!slot || !mix) {
        return;
    }

    saveLastAdaptiveProposal({
        slotId: slot.id,
        slotLabel: slot.label,
        mixId: mix.id,
        mixName: mix.name,
        relatedEventId,
        createdAt: Date.now()
    });
}

function getSavedMixName(mixId = "") {
    return savedMixes.find(
        (item) => item.id === mixId
    )?.name || "Mix inconnu";
}

function recordManualAdaptiveCorrection(
    chosenMixId = ""
) {
    const proposal =
        normalizeLastAdaptiveProposal(
            lastAdaptiveProposal
        );

    if (!proposal || !chosenMixId) {
        saveLastAdaptiveProposal(null);
        return false;
    }

    if (proposal.mixId === chosenMixId) {
        saveLastAdaptiveProposal(null);
        return false;
    }

    const chosenMixName =
        getSavedMixName(chosenMixId);

    recordIntelligenceEvent({
        type: "correction",
        mixId: chosenMixId,
        mixName: chosenMixName,
        source: "manual-after-adaptive",
        slotId: proposal.slotId,
        relatedEventId:
            proposal.relatedEventId,
        beforeMixId: proposal.mixId,
        beforeMixName: proposal.mixName,
        afterMixId: chosenMixId,
        afterMixName: chosenMixName,
        reason:
            "Un autre mix a été lancé manuellement dans les 30 minutes suivant Adaptive DJ."
    });

    recordAdaptiveLearningObservation({
        mixId: chosenMixId,
        source: "correction",
        slotId: proposal.slotId
    });

    saveLastAdaptiveProposal(null);
    return true;
}

function confirmIntelligenceListening(
    eventId = ""
) {
    const sourceEvent =
        intelligenceAnalytics.events.find(
            (item) => item.id === eventId
        );

    if (!sourceEvent) {
        return;
    }

    const alreadyConfirmed =
        intelligenceAnalytics.events.some(
            (item) =>
                item.type ===
                    "listening-confirmed" &&
                item.relatedEventId === eventId
        );

    if (alreadyConfirmed) {
        setStatus(
            "Cette lecture est déjà confirmée."
        );
        return;
    }

    recordIntelligenceEvent({
        type: "listening-confirmed",
        mixId: sourceEvent.mixId,
        mixName: sourceEvent.mixName,
        source: "user-confirmation",
        slotId: sourceEvent.slotId,
        deviceName: sourceEvent.deviceName,
        trackCount: sourceEvent.trackCount,
        durationMs: sourceEvent.durationMs,
        evidence: "user-confirmed",
        relatedEventId: sourceEvent.id,
        reason:
            "Lecture confirmée manuellement par l’utilisateur."
    });

    displayPlaylists(playlistsCache);
    setStatus(
        `Écoute de « ${sourceEvent.mixName} » confirmée.`
    );
}

function getIntelligenceEventLabel(item) {
    if (item.type === "mix-generated") {
        return "🔀 Mix généré";
    }
    if (item.type === "adaptive") {
        return "🤖 Adaptive DJ";
    }
    if (item.type === "schedule") {
        return "🗓️ Programmation";
    }
    if (item.type === "ios") {
        return "📱 Commande iOS";
    }
    if (item.type === "correction") {
        return "↪ Correction";
    }
    if (item.type === "listening-confirmed") {
        return "✅ Écoute confirmée";
    }
    return "▶ Lecture envoyée";
}

function getIntelligenceEvidenceLabel(item) {
    if (item.evidence === "user-confirmed") {
        return "confirmé par toi";
    }
    if (item.evidence === "sent") {
        return "envoyé à Spotify";
    }
    return "généré localement";
}

function getIntelligenceDayTrend(
    events = [],
    dayType = "weekday"
) {
    const matching = events.filter(
        (item) => item.dayType === dayType
    );
    const totals = new Map();

    for (const item of matching) {
        const key = item.mixName ||
            "Mix Shuffle+";
        totals.set(
            key,
            (totals.get(key) || 0) + 1
        );
    }

    const top = [...totals.entries()]
        .sort(
            (first, second) =>
                second[1] - first[1]
        )[0] || null;

    return {
        dayType,
        launchCount: matching.length,
        topMixName: top?.[0] || "",
        topMixCount: top?.[1] || 0
    };
}

function getFilteredIntelligenceActivity(
    events = []
) {
    return events.filter((item) => {
        const typeFilter =
            intelligenceAnalytics
                .eventTypeFilter;
        const dayFilter =
            intelligenceAnalytics
                .dayTypeFilter;
        const typeMatches =
            typeFilter === "all" ||
            item.type === typeFilter ||
            (
                typeFilter === "sent" &&
                [
                    "playback",
                    "adaptive",
                    "schedule",
                    "ios"
                ].includes(item.type)
            );
        const dayMatches =
            dayFilter === "all" ||
            item.dayType === dayFilter;

        return typeMatches && dayMatches;
    });
}

function getIntelligencePeriodStart() {
    const rangeDays = Number(
        intelligenceAnalytics.rangeDays || 0
    );

    if (!rangeDays) {
        return 0;
    }

    return Date.now() -
        rangeDays * 24 * 60 * 60 * 1000;
}

function getFilteredIntelligenceEvents() {
    const start =
        getIntelligencePeriodStart();

    return intelligenceAnalytics.events
        .filter(
            (item) =>
                !start ||
                item.createdAt >= start
        );
}

function mergeIntelligenceRankings(
    events = [],
    field = "topArtists",
    limit = 8
) {
    const totals = new Map();

    for (const event of events) {
        for (const item of event[field] || []) {
            totals.set(
                item.name,
                (totals.get(item.name) || 0) +
                Number(item.count || 0)
            );
        }
    }

    return [...totals.entries()]
        .sort(
            (first, second) =>
                second[1] - first[1] ||
                first[0].localeCompare(
                    second[0],
                    "fr",
                    { sensitivity: "base" }
                )
        )
        .slice(0, limit)
        .map(([name, count]) => ({
            name,
            count
        }));
}

function formatIntelligenceDuration(
    durationMs = 0
) {
    const totalMinutes = Math.round(
        Math.max(0, durationMs) /
        (60 * 1000)
    );
    const hours = Math.floor(
        totalMinutes / 60
    );
    const minutes = totalMinutes % 60;

    if (!hours) {
        return `${minutes} min`;
    }

    return `${hours} h ${String(minutes)
        .padStart(2, "0")}`;
}

function getIntelligenceQualityScore({
    stats = null,
    trackCount = 0,
    uniqueArtists = 0,
    uniqueAlbums = 0
} = {}) {
    if (!stats || trackCount < 2) {
        return null;
    }

    const transitions = Math.max(
        1,
        trackCount - 1
    );
    const firstTwentyCount = Math.min(
        20,
        trackCount
    );
    const toScore = (value, total) =>
        Math.max(
            0,
            Math.round(
                100 -
                (Math.max(0, value) /
                    Math.max(1, total)) *
                    100
            )
        );
    const artistScore = toScore(
        stats.consecutiveArtistRepeats,
        transitions
    );
    const albumScore = toScore(
        stats.consecutiveAlbumRepeats,
        transitions
    );
    const transitionScore = toScore(
        stats.abruptTransitions,
        transitions
    );
    const recentScore = toScore(
        stats.recentTracksInFirstTwenty,
        firstTwentyCount
    );
    const intensityScore = Math.min(
        100,
        Math.max(
            0,
            Math.round(
                stats.intensityCurveAdherence || 0
            )
        )
    );
    const artistDiversity = Math.min(
        100,
        Math.round(
            (uniqueArtists /
                Math.max(1, trackCount)) *
                140
        )
    );
    const albumDiversity = Math.min(
        100,
        Math.round(
            (uniqueAlbums /
                Math.max(1, trackCount)) *
                125
        )
    );
    const diversityScore = Math.round(
        (artistDiversity +
            albumDiversity) / 2
    );
    const overall = Math.round(
        (
            artistScore +
            albumScore +
            transitionScore +
            recentScore +
            intensityScore +
            diversityScore
        ) / 6
    );

    return {
        overall,
        artistScore,
        albumScore,
        transitionScore,
        recentScore,
        intensityScore,
        diversityScore
    };
}

function getIntelligenceSummary() {
    const events =
        getFilteredIntelligenceEvents();
    const playbackEvents = events.filter(
        (item) =>
            [
                "playback",
                "adaptive",
                "schedule",
                "ios"
            ].includes(item.type)
    );
    const generatedEvents = events.filter(
        (item) =>
            item.type === "mix-generated"
    );
    const correctionEvents = events.filter(
        (item) =>
            item.type === "correction"
    );
    const confirmedEvents = events.filter(
        (item) =>
            item.type ===
                "listening-confirmed"
    );
    const confirmedRelatedIds = new Set(
        confirmedEvents.map(
            (item) => item.relatedEventId
        )
    );
    const rankingEvents = playbackEvents.length
        ? playbackEvents
        : generatedEvents;
    const mixTotals = new Map();

    for (const event of rankingEvents) {
        const name =
            event.mixName ||
            "Mix Shuffle+";
        const current = mixTotals.get(name) || {
            name,
            count: 0,
            tracks: 0,
            durationMs: 0
        };
        current.count += 1;
        current.tracks += event.trackCount;
        current.durationMs += event.durationMs;
        mixTotals.set(name, current);
    }

    const topMixes = [...mixTotals.values()]
        .sort(
            (first, second) =>
                second.count - first.count ||
                second.tracks - first.tracks
        )
        .slice(0, 8);
    const patterns =
        getAdaptiveLearningPatterns();
    const confidencePatterns = patterns.filter(
        (item) =>
            item.observationCount > 0
    );
    const globalConfidence =
        confidencePatterns.length
            ? Math.round(
                confidencePatterns.reduce(
                    (sum, item) =>
                        sum + item.confidence,
                    0
                ) /
                confidencePatterns.length
            )
            : 0;
    const latestQualityEvent = events.find(
        (item) => item.quality
    );
    const liveSummary = selectedTracks.length
        ? summarizeTracksForIntelligence(
            selectedTracks
        )
        : null;
    const liveQuality = selectedTracks.length
        ? analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
        : null;
    const qualitySource = liveQuality
        ? {
            stats: liveQuality,
            trackCount: liveSummary.trackCount,
            uniqueArtists:
                liveSummary.uniqueArtists,
            uniqueAlbums:
                liveSummary.uniqueAlbums,
            label: "Ordre actuellement affiché"
        }
        : latestQualityEvent
            ? {
                stats: latestQualityEvent.quality,
                trackCount:
                    latestQualityEvent.trackCount,
                uniqueArtists:
                    latestQualityEvent.uniqueArtists,
                uniqueAlbums:
                    latestQualityEvent.uniqueAlbums,
                label:
                    latestQualityEvent.mixName ||
                    "Dernier mix analysé"
            }
            : null;
    const quality = qualitySource
        ? getIntelligenceQualityScore(
            qualitySource
        )
        : null;
    const automaticHistory =
        adaptiveLearningState.autoApplyHistory || [];

    return {
        events,
        activityEvents:
            getFilteredIntelligenceActivity(
                events
            ),
        playbackEvents,
        generatedEvents,
        correctionEvents,
        confirmedEvents,
        confirmedRelatedIds,
        weekdayTrend:
            getIntelligenceDayTrend(
                playbackEvents,
                "weekday"
            ),
        weekendTrend:
            getIntelligenceDayTrend(
                playbackEvents,
                "weekend"
            ),
        rankingSource:
            playbackEvents.length
                ? "lectures envoyées"
                : "mix générés",
        totalTracks: playbackEvents.reduce(
            (sum, item) =>
                sum + item.trackCount,
            0
        ),
        totalDurationMs: playbackEvents.reduce(
            (sum, item) =>
                sum + item.durationMs,
            0
        ),
        confirmedTracks: confirmedEvents.reduce(
            (sum, item) =>
                sum + item.trackCount,
            0
        ),
        confirmedDurationMs:
            confirmedEvents.reduce(
                (sum, item) =>
                    sum + item.durationMs,
                0
            ),
        topMixes,
        topArtists:
            mergeIntelligenceRankings(
                rankingEvents,
                "topArtists"
            ),
        topAlbums:
            mergeIntelligenceRankings(
                rankingEvents,
                "topAlbums"
            ),
        patterns,
        globalConfidence,
        qualitySource,
        quality,
        automaticApplied:
            automaticHistory.filter(
                (item) =>
                    item.status === "applied"
            ).length,
        automaticReverted:
            automaticHistory.filter(
                (item) =>
                    [
                        "reverted",
                        "rollback"
                    ].includes(item.status)
            ).length,
        acceptedSuggestions:
            adaptiveLearningState
                .acceptedSuggestions.length,
        dismissedSuggestions:
            adaptiveLearningState
                .dismissedSuggestions.length
    };
}

function renderIntelligenceRanking(
    title,
    values = [],
    emptyText = "Pas encore assez de données."
) {
    return `
        <section class="intelligence-ranking-card">
            <h4>${escapeHtml(title)}</h4>
            ${values.length
                ? `
                    <ol>
                        ${values.map(
                            (item, index) => `
                                <li>
                                    <span class="intelligence-ranking-index">
                                        ${index + 1}
                                    </span>
                                    <span class="intelligence-ranking-name">
                                        ${escapeHtml(item.name)}
                                    </span>
                                    <strong>
                                        ${Number(item.count || 0)}
                                    </strong>
                                </li>
                            `
                        ).join("")}
                    </ol>
                `
                : `
                    <p class="intelligence-empty">
                        ${escapeHtml(emptyText)}
                    </p>
                `}
        </section>
    `;
}

function renderIntelligenceDashboard() {
    const summary =
        getIntelligenceSummary();
    const rangeOptions = [
        [7, "7 jours"],
        [30, "30 jours"],
        [180, "6 mois"],
        [0, "Toutes les données"]
    ];
    const typeOptions = [
        ["all", "Tous les événements"],
        ["mix-generated", "Mix générés"],
        ["sent", "Lectures envoyées"],
        ["correction", "Corrections"],
        ["listening-confirmed", "Écoutes confirmées"]
    ];
    const dayOptions = [
        ["all", "Tous les jours"],
        ["weekday", "Semaine"],
        ["weekend", "Week-end"]
    ];
    const quality = summary.quality;
    const qualityBars = quality
        ? [
            ["Artistes séparés", quality.artistScore],
            ["Albums séparés", quality.albumScore],
            ["Transitions", quality.transitionScore],
            ["Titres récents", quality.recentScore],
            ["Courbe d’intensité", quality.intensityScore],
            ["Diversité", quality.diversityScore]
        ].map(([label, value]) => `
            <div class="intelligence-quality-row">
                <span>${escapeHtml(label)}</span>
                <div class="intelligence-quality-track">
                    <i style="width:${Math.max(0, Math.min(100, value))}%"></i>
                </div>
                <strong>${value}%</strong>
            </div>
        `).join("")
        : "";
    const patterns = summary.patterns
        .map((pattern) => `
            <article class="intelligence-pattern-card">
                <div>
                    <span>${escapeHtml(pattern.slot.label)}</span>
                    <strong>
                        ${pattern.candidateMix
                            ? escapeHtml(pattern.candidateMix.name)
                            : "Aucune habitude fiable"}
                    </strong>
                    <small>
                        ${pattern.observationCount} observation${pattern.observationCount > 1 ? "s" : ""}
                        ${pattern.dominantDayType === "weekday"
                            ? " · surtout en semaine"
                            : pattern.dominantDayType === "weekend"
                                ? " · surtout le week-end"
                                : ""}
                    </small>
                </div>
                <span class="intelligence-confidence ${pattern.confidence >= 70 ? "is-high" : pattern.confidence >= 45 ? "is-medium" : "is-low"}">
                    ${pattern.confidence}%
                </span>
            </article>
        `)
        .join("");
    const trendCard = (title, icon, trend) => `
        <article class="intelligence-trend-card">
            <span>${icon} ${title}</span>
            <strong>
                ${trend.topMixName
                    ? escapeHtml(trend.topMixName)
                    : "Pas encore de tendance"}
            </strong>
            <small>
                ${trend.launchCount} lancement${trend.launchCount > 1 ? "s" : ""}
                ${trend.topMixCount
                    ? ` · ${trend.topMixCount} pour le mix dominant`
                    : ""}
            </small>
        </article>
    `;
    const correctionRows = summary.correctionEvents
        .slice(0, 12)
        .map((item) => `
            <li>
                <span>${escapeHtml(item.beforeMixName || "Choix initial")}</span>
                <b aria-hidden="true">→</b>
                <strong>${escapeHtml(item.afterMixName || item.mixName)}</strong>
                <small>
                    ${item.dayType === "weekend" ? "week-end" : "semaine"}
                    · ${formatHistoryDate(item.createdAt)}
                </small>
            </li>
        `).join("");
    const activityRows = summary.activityEvents
        .slice(0, 40)
        .map((item) => {
            const isSent = [
                "playback",
                "adaptive",
                "schedule",
                "ios"
            ].includes(item.type);
            const canConfirm = isSent &&
                !summary.confirmedRelatedIds.has(
                    item.id
                );
            const correctionText =
                item.type === "correction"
                    ? `${escapeHtml(item.beforeMixName || "Choix initial")} → ${escapeHtml(item.afterMixName || item.mixName)}`
                    : escapeHtml(item.mixName);

            return `
                <li class="intelligence-event-row">
                    <span class="intelligence-event-type">
                        ${getIntelligenceEventLabel(item)}
                    </span>
                    <strong>${correctionText}</strong>
                    <small>
                        ${item.trackCount
                            ? `${item.trackCount} titre${item.trackCount > 1 ? "s" : ""} · `
                            : ""}
                        ${item.durationMs
                            ? `${formatIntelligenceDuration(item.durationMs)} · `
                            : ""}
                        ${item.dayType === "weekend" ? "week-end" : "semaine"}
                        · ${String(item.hour).padStart(2, "0")} h
                        · ${getIntelligenceEvidenceLabel(item)}
                        · ${formatHistoryDate(item.createdAt)}
                    </small>
                    ${canConfirm
                        ? `
                            <button
                                type="button"
                                class="intelligence-confirm-button"
                                data-confirm-intelligence-event="${escapeHtml(item.id)}"
                            >
                                ✓ Confirmer l’écoute
                            </button>
                        `
                        : ""}
                </li>
            `;
        }).join("");

    return `
        <section class="intelligence-dashboard">
            <div class="intelligence-hero">
                <div>
                    <span class="intelligence-kicker">
                        🧠 Intelligence Shuffle+
                    </span>
                    <h3>Historique enrichi</h3>
                    <p>
                        Distingue ce qui a été généré, envoyé à Spotify,
                        corrigé manuellement et réellement confirmé par toi.
                    </p>
                </div>

                <div class="intelligence-toolbar">
                    <label>
                        <span>Période</span>
                        <select id="intelligenceRangeInput">
                            ${rangeOptions.map(([value, label]) => `
                                <option value="${value}" ${Number(intelligenceAnalytics.rangeDays) === value ? "selected" : ""}>
                                    ${label}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <label>
                        <span>Événement</span>
                        <select id="intelligenceTypeInput">
                            ${typeOptions.map(([value, label]) => `
                                <option value="${value}" ${intelligenceAnalytics.eventTypeFilter === value ? "selected" : ""}>
                                    ${label}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <label>
                        <span>Jour</span>
                        <select id="intelligenceDayTypeInput">
                            ${dayOptions.map(([value, label]) => `
                                <option value="${value}" ${intelligenceAnalytics.dayTypeFilter === value ? "selected" : ""}>
                                    ${label}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <button id="exportIntelligenceButton" type="button">
                        ⬇ Exporter le rapport
                    </button>
                    <button id="clearIntelligenceButton" class="is-danger" type="button" ${intelligenceAnalytics.events.length ? "" : "disabled"}>
                        Réinitialiser
                    </button>
                </div>
            </div>

            <div class="intelligence-metrics-grid">
                <article>
                    <span>Mix générés</span>
                    <strong>${summary.generatedEvents.length}</strong>
                    <small>créés localement</small>
                </article>
                <article>
                    <span>Envoyés à Spotify</span>
                    <strong>${summary.playbackEvents.length}</strong>
                    <small>départ demandé, écoute non garantie</small>
                </article>
                <article>
                    <span>Écoutes confirmées</span>
                    <strong>${summary.confirmedEvents.length}</strong>
                    <small>validées manuellement</small>
                </article>
                <article>
                    <span>Corrections détectées</span>
                    <strong>${summary.correctionEvents.length}</strong>
                    <small>avant / après Adaptive DJ</small>
                </article>
                <article>
                    <span>Titres envoyés</span>
                    <strong>${summary.totalTracks}</strong>
                    <small>${summary.confirmedTracks} confirmés</small>
                </article>
                <article>
                    <span>Durée potentielle</span>
                    <strong>${formatIntelligenceDuration(summary.totalDurationMs)}</strong>
                    <small>${formatIntelligenceDuration(summary.confirmedDurationMs)} confirmée</small>
                </article>
                <article>
                    <span>Confiance Adaptive</span>
                    <strong>${summary.globalConfidence}%</strong>
                    <small>moyenne des créneaux observés</small>
                </article>
                <article>
                    <span>Auto-adaptations</span>
                    <strong>${summary.automaticApplied}</strong>
                    <small>${summary.automaticReverted} annulée${summary.automaticReverted > 1 ? "s" : ""}</small>
                </article>
            </div>

            <p class="intelligence-data-note">
                « Généré » signifie que Shuffle+ a créé un ordre. « Envoyé »
                signifie qu’une commande de lecture a été transmise à Spotify.
                « Confirmé » signifie que tu as indiqué avoir réellement écouté
                ce lancement. Shuffle+ ne transforme jamais une durée potentielle
                en temps d’écoute certain sans cette confirmation.
            </p>

            <section class="intelligence-trends-section">
                <div class="intelligence-section-heading">
                    <div>
                        <h4>Semaine et week-end</h4>
                        <p>Comparaison des lancements envoyés à Spotify.</p>
                    </div>
                </div>
                <div class="intelligence-trend-grid">
                    ${trendCard("Semaine", "🏙️", summary.weekdayTrend)}
                    ${trendCard("Week-end", "🌤️", summary.weekendTrend)}
                </div>
            </section>

            <div class="intelligence-rankings-grid">
                ${renderIntelligenceRanking("Mix les plus utilisés", summary.topMixes)}
                ${renderIntelligenceRanking("Artistes dominants", summary.topArtists)}
                ${renderIntelligenceRanking("Albums dominants", summary.topAlbums)}
            </div>

            <section class="intelligence-corrections-section">
                <div class="intelligence-section-heading">
                    <div>
                        <h4>Corrections utilisateur</h4>
                        <p>
                            Un changement de mix effectué dans les 30 minutes
                            après Adaptive DJ est mémorisé comme une correction.
                        </p>
                    </div>
                </div>
                <ul class="intelligence-correction-list">
                    ${correctionRows || "<li>Aucune correction détectée sur cette période.</li>"}
                </ul>
            </section>

            <section class="intelligence-adaptive-section">
                <div class="intelligence-section-heading">
                    <div>
                        <h4>Habitudes Adaptive DJ</h4>
                        <p>
                            ${adaptiveLearningState.observations.length}
                            observation${adaptiveLearningState.observations.length > 1 ? "s" : ""}
                            · ${summary.acceptedSuggestions} suggestion${summary.acceptedSuggestions > 1 ? "s" : ""} appliquée${summary.acceptedSuggestions > 1 ? "s" : ""}
                            · ${summary.dismissedSuggestions} ignorée${summary.dismissedSuggestions > 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div class="intelligence-pattern-grid">
                    ${patterns}
                </div>
            </section>

            <section class="intelligence-quality-section">
                <div class="intelligence-section-heading">
                    <div>
                        <h4>Santé du mélange</h4>
                        <p>
                            ${summary.qualitySource
                                ? escapeHtml(summary.qualitySource.label)
                                : "Génère un mix pour obtenir une analyse."}
                        </p>
                    </div>
                    ${quality ? `<strong class="intelligence-quality-score">${quality.overall}/100</strong>` : ""}
                </div>
                ${quality
                    ? `<div class="intelligence-quality-list">${qualityBars}</div>`
                    : `<p class="intelligence-empty">Aucune analyse de qualité disponible.</p>`}
            </section>

            <details class="intelligence-activity-log" open>
                <summary>
                    Activité filtrée · ${summary.activityEvents.length} événement${summary.activityEvents.length > 1 ? "s" : ""}
                </summary>
                <ul>
                    ${activityRows || "<li>Aucune activité pour ces filtres.</li>"}
                </ul>
            </details>
        </section>
    `;
}

function downloadIntelligenceReport() {
    try {
        const summary =
            getIntelligenceSummary();
        const payload = {
            format: "shuffleplus-intelligence-report",
            schemaVersion: 2,
            appVersion: APP_VERSION,
            exportedAt: new Date().toISOString(),
            filters: {
                rangeDays:
                    intelligenceAnalytics.rangeDays,
                eventType:
                    intelligenceAnalytics.eventTypeFilter,
                dayType:
                    intelligenceAnalytics.dayTypeFilter
            },
            summary: {
                generatedMixes:
                    summary.generatedEvents.length,
                sentToSpotify:
                    summary.playbackEvents.length,
                userConfirmed:
                    summary.confirmedEvents.length,
                corrections:
                    summary.correctionEvents.length,
                tracksSent:
                    summary.totalTracks,
                tracksConfirmed:
                    summary.confirmedTracks,
                potentialDurationMs:
                    summary.totalDurationMs,
                confirmedDurationMs:
                    summary.confirmedDurationMs,
                adaptiveConfidence:
                    summary.globalConfidence,
                automaticApplied:
                    summary.automaticApplied,
                automaticReverted:
                    summary.automaticReverted,
                weekdayTrend:
                    summary.weekdayTrend,
                weekendTrend:
                    summary.weekendTrend,
                topMixes: summary.topMixes,
                topArtists: summary.topArtists,
                topAlbums: summary.topAlbums,
                adaptivePatterns:
                    summary.patterns.map(
                        (pattern) => ({
                            slotId:
                                pattern.slot.id,
                            slotLabel:
                                pattern.slot.label,
                            observationCount:
                                pattern.observationCount,
                            preferenceCount:
                                pattern.preferenceCount,
                            confidence:
                                pattern.confidence,
                            mixId:
                                pattern.candidateMixId,
                            mixName:
                                pattern.candidateMix?.name || "",
                            dominantDayType:
                                pattern.dominantDayType
                        })
                    ),
                quality: summary.quality
            },
            events: summary.events
        };
        const blob = new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const date = new Date();
        const datePart = [
            date.getFullYear(),
            String(date.getMonth() + 1)
                .padStart(2, "0"),
            String(date.getDate())
                .padStart(2, "0")
        ].join("-");
        const link = document.createElement("a");
        link.href = url;
        link.download =
            `shuffleplus-intelligence-${datePart}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus(
            "Rapport Intelligence enrichi exporté."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            "Impossible d’exporter le rapport Intelligence.",
            "error"
        );
    }
}

function clearIntelligenceAnalytics() {
    const confirmed = window.confirm(
        "Supprimer les statistiques Intelligence locales ? Les réglages Adaptive Learning restent conservés."
    );

    if (!confirmed) {
        return;
    }

    intelligenceAnalytics =
        normalizeIntelligenceAnalytics({
            ...DEFAULT_INTELLIGENCE_ANALYTICS,
            rangeDays:
                intelligenceAnalytics.rangeDays,
            eventTypeFilter:
                intelligenceAnalytics.eventTypeFilter,
            dayTypeFilter:
                intelligenceAnalytics.dayTypeFilter
        });
    saveIntelligenceAnalytics();
    displayPlaylists(playlistsCache);
    setStatus(
        "Statistiques Intelligence réinitialisées."
    );
}

function normalizeActiveAppMenu(value = "") {
    return [
        "music",
        "mixes",
        "adaptive",
        "intelligence",
        "settings"
    ].includes(value)
        ? value
        : "music";
}

function readActiveAppMenu() {
    try {
        return normalizeActiveAppMenu(
            localStorage.getItem(APP_MENU_KEY) ||
            "music"
        );
    } catch (error) {
        return "music";
    }
}

function saveActiveAppMenu() {
    try {
        localStorage.setItem(
            APP_MENU_KEY,
            activeAppMenu
        );
    } catch (error) {
        console.warn(
            "Menu actif non enregistré :",
            error
        );
    }
}

function normalizeAdaptiveDjMenuSettings(
    settings = {}
) {
    const sourceSlots =
        settings?.slots &&
        typeof settings.slots === "object"
            ? settings.slots
            : {};

    const slots = {};

    for (const slot of ADAPTIVE_SLOTS) {
        slots[slot.id] =
            typeof sourceSlots[slot.id] === "string"
                ? sourceSlots[slot.id]
                    .trim()
                    .slice(0, 120)
                : "";
    }

    return {
        enabled: settings.enabled !== false,
        slots
    };
}

function readAdaptiveDjMenuSettings() {
    try {
        const raw = localStorage.getItem(
            ADAPTIVE_DJ_MENU_KEY
        );

        return normalizeAdaptiveDjMenuSettings(
            raw
                ? JSON.parse(raw)
                : DEFAULT_ADAPTIVE_DJ_MENU_SETTINGS
        );
    } catch (error) {
        console.warn(
            "Réglages Adaptive DJ illisibles :",
            error
        );
        return normalizeAdaptiveDjMenuSettings(
            DEFAULT_ADAPTIVE_DJ_MENU_SETTINGS
        );
    }
}

function saveAdaptiveDjMenuSettings() {
    try {
        localStorage.setItem(
            ADAPTIVE_DJ_MENU_KEY,
            JSON.stringify(
                adaptiveDjMenuSettings
            )
        );
    } catch (error) {
        console.warn(
            "Réglages Adaptive DJ non enregistrés :",
            error
        );
    }
}

function normalizeAdaptiveDjMenuHistory(
    values = []
) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .filter(
            (item) =>
                item &&
                typeof item === "object"
        )
        .map((item) => ({
            id:
                typeof item.id === "string"
                    ? item.id
                    : createIosCommandId(),
            slotId:
                typeof item.slotId === "string"
                    ? item.slotId
                    : "",
            slotLabel:
                typeof item.slotLabel === "string"
                    ? item.slotLabel.slice(0, 80)
                    : "Adaptive DJ",
            mixId:
                typeof item.mixId === "string"
                    ? item.mixId
                    : "",
            mixName:
                typeof item.mixName === "string"
                    ? item.mixName.slice(0, 120)
                    : "",
            deviceName:
                typeof item.deviceName === "string"
                    ? item.deviceName.slice(0, 120)
                    : "",
            status:
                item.status === "error"
                    ? "error"
                    : "success",
            message:
                typeof item.message === "string"
                    ? item.message.slice(0, 240)
                    : "",
            createdAt: Number(
                item.createdAt ||
                Date.now()
            )
        }))
        .slice(0, MAX_ADAPTIVE_DJ_HISTORY);
}

function readAdaptiveDjMenuHistory() {
    try {
        const raw = localStorage.getItem(
            ADAPTIVE_DJ_HISTORY_KEY
        );

        return normalizeAdaptiveDjMenuHistory(
            raw ? JSON.parse(raw) : []
        );
    } catch (error) {
        return [];
    }
}

function saveAdaptiveDjMenuHistory() {
    try {
        localStorage.setItem(
            ADAPTIVE_DJ_HISTORY_KEY,
            JSON.stringify(
                adaptiveDjMenuHistory
            )
        );
    } catch (error) {
        console.warn(
            "Historique Adaptive DJ non enregistré :",
            error
        );
    }
}

function addAdaptiveDjMenuHistory(entry) {
    adaptiveDjMenuHistory =
        normalizeAdaptiveDjMenuHistory([
            {
                id: createIosCommandId(),
                ...entry,
                createdAt: Date.now()
            },
            ...adaptiveDjMenuHistory
        ]);

    saveAdaptiveDjMenuHistory();
}

function normalizeAdaptiveLearningSource(
    value = ""
) {
    return [
        "manual",
        "ios",
        "configuration",
        "adaptive"
    ].includes(value)
        ? value
        : "manual";
}

function normalizeAdaptiveLearningObservation(
    item = {}
) {
    const createdAt = Number(
        item.createdAt ||
        Date.now()
    );
    const date = new Date(createdAt);
    const slot = getAdaptiveSlotById(
        typeof item.slotId === "string"
            ? item.slotId
            : ""
    );

    return {
        id:
            typeof item.id === "string"
                ? item.id.slice(0, 120)
                : createIosCommandId(),
        slotId: slot.id,
        mixId:
            typeof item.mixId === "string"
                ? item.mixId.slice(0, 120)
                : "",
        mixName:
            typeof item.mixName === "string"
                ? item.mixName.slice(0, 120)
                : "",
        source: normalizeAdaptiveLearningSource(
            item.source
        ),
        dayType:
            item.dayType === "weekend"
                ? "weekend"
                : [0, 6].includes(
                    date.getDay()
                )
                    ? "weekend"
                    : "weekday",
        weekday: Number.isInteger(
            Number(item.weekday)
        )
            ? Math.min(
                6,
                Math.max(
                    0,
                    Number(item.weekday)
                )
            )
            : date.getDay(),
        hour: Number.isFinite(
            Number(item.hour)
        )
            ? Math.min(
                23,
                Math.max(
                    0,
                    Number(item.hour)
                )
            )
            : date.getHours(),
        createdAt:
            Number.isFinite(createdAt)
                ? createdAt
                : Date.now()
    };
}

function normalizeAdaptiveLearningDecision(
    item = {}
) {
    return {
        signature:
            typeof item.signature === "string"
                ? item.signature.slice(0, 260)
                : "",
        slotId:
            typeof item.slotId === "string"
                ? item.slotId.slice(0, 40)
                : "",
        mixId:
            typeof item.mixId === "string"
                ? item.mixId.slice(0, 120)
                : "",
        evidenceCount: Math.max(
            0,
            Number(item.evidenceCount || 0)
        ),
        confidence: Math.min(
            100,
            Math.max(
                0,
                Number(item.confidence || 0)
            )
        ),
        decidedAt: Number(
            item.decidedAt ||
            Date.now()
        )
    };
}

function normalizeAdaptiveLearningAutoChange(
    item = {}
) {
    const statuses = [
        "applied",
        "reverted",
        "rollback"
    ];

    return {
        id:
            typeof item.id === "string"
                ? item.id.slice(0, 120)
                : createIosCommandId(),
        slotId:
            typeof item.slotId === "string"
                ? item.slotId.slice(0, 40)
                : "",
        previousMixId:
            typeof item.previousMixId === "string"
                ? item.previousMixId.slice(0, 120)
                : "",
        previousMixName:
            typeof item.previousMixName === "string"
                ? item.previousMixName.slice(0, 120)
                : "Aucun mix",
        nextMixId:
            typeof item.nextMixId === "string"
                ? item.nextMixId.slice(0, 120)
                : "",
        nextMixName:
            typeof item.nextMixName === "string"
                ? item.nextMixName.slice(0, 120)
                : "",
        confidence: Math.min(
            100,
            Math.max(0, Number(item.confidence || 0))
        ),
        evidenceCount: Math.max(
            0,
            Number(item.evidenceCount || 0)
        ),
        status: statuses.includes(item.status)
            ? item.status
            : "applied",
        launchSucceeded:
            item.launchSucceeded === true,
        createdAt: Number(
            item.createdAt || Date.now()
        ),
        revertedAt: Math.max(
            0,
            Number(item.revertedAt || 0)
        ),
        revertReason:
            typeof item.revertReason === "string"
                ? item.revertReason.slice(0, 120)
                : ""
    };
}

function normalizeAdaptiveLearningState(
    state = {}
) {
    const cutoff =
        Date.now() -
        ADAPTIVE_LEARNING_OBSERVATION_TTL;

    const observations = Array.isArray(
        state.observations
    )
        ? state.observations
            .map((item) =>
                normalizeAdaptiveLearningObservation(
                    item
                )
            )
            .filter(
                (item) =>
                    item.mixId &&
                    item.createdAt >= cutoff
            )
            .sort(
                (first, second) =>
                    second.createdAt -
                    first.createdAt
            )
            .slice(
                0,
                MAX_ADAPTIVE_LEARNING_OBSERVATIONS
            )
        : [];

    const normalizeDecisions = (values) =>
        Array.isArray(values)
            ? values
                .map((item) =>
                    normalizeAdaptiveLearningDecision(
                        item
                    )
                )
                .filter(
                    (item) =>
                        item.signature &&
                        item.slotId &&
                        item.mixId
                )
                .sort(
                    (first, second) =>
                        second.decidedAt -
                        first.decidedAt
                )
                .slice(
                    0,
                    MAX_ADAPTIVE_LEARNING_DECISIONS
                )
            : [];

    const autoApplyHistory = Array.isArray(
        state.autoApplyHistory
    )
        ? state.autoApplyHistory
            .map((item) =>
                normalizeAdaptiveLearningAutoChange(item)
            )
            .filter(
                (item) =>
                    item.slotId && item.nextMixId
            )
            .sort(
                (first, second) =>
                    second.createdAt - first.createdAt
            )
            .slice(0, MAX_ADAPTIVE_AUTO_CHANGES)
        : [];

    return {
        enabled: state.enabled !== false,
        autoApplyEnabled:
            state.autoApplyEnabled === true,
        autoApplyMinConfidence: Math.min(
            95,
            Math.max(
                60,
                Number(
                    state.autoApplyMinConfidence ||
                    DEFAULT_ADAPTIVE_AUTO_CONFIDENCE
                )
            )
        ),
        autoApplyMinObservations: Math.min(
            20,
            Math.max(
                3,
                Number(
                    state.autoApplyMinObservations ||
                    DEFAULT_ADAPTIVE_AUTO_OBSERVATIONS
                )
            )
        ),
        observations,
        dismissedSuggestions:
            normalizeDecisions(
                state.dismissedSuggestions
            ),
        acceptedSuggestions:
            normalizeDecisions(
                state.acceptedSuggestions
            ),
        autoApplyHistory,
        updatedAt: Number(
            state.updatedAt ||
            Date.now()
        )
    };
}

function readAdaptiveLearningState() {
    try {
        const raw = localStorage.getItem(
            ADAPTIVE_LEARNING_KEY
        );

        return normalizeAdaptiveLearningState(
            raw
                ? JSON.parse(raw)
                : DEFAULT_ADAPTIVE_LEARNING_STATE
        );
    } catch (error) {
        console.warn(
            "Apprentissage Adaptive illisible :",
            error
        );
        return normalizeAdaptiveLearningState(
            DEFAULT_ADAPTIVE_LEARNING_STATE
        );
    }
}

function saveAdaptiveLearningState() {
    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            updatedAt: Date.now()
        });

    try {
        localStorage.setItem(
            ADAPTIVE_LEARNING_KEY,
            JSON.stringify(
                adaptiveLearningState
            )
        );
    } catch (error) {
        console.warn(
            "Apprentissage Adaptive non enregistré :",
            error
        );
    }
}

function recordAdaptiveLearningObservation({
    mixId = "",
    source = "manual",
    slotId = "",
    date = new Date()
} = {}) {
    if (
        !adaptiveLearningState.enabled ||
        !mixId
    ) {
        return;
    }

    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        return;
    }

    const resolvedDate =
        date instanceof Date &&
        !Number.isNaN(date.getTime())
            ? date
            : new Date();
    const slot = getAdaptiveSlotById(
        slotId ||
        getAdaptiveSlot(resolvedDate).id
    );

    const observation =
        normalizeAdaptiveLearningObservation({
            id: createIosCommandId(),
            slotId: slot.id,
            mixId: mix.id,
            mixName: mix.name,
            source,
            dayType:
                [0, 6].includes(
                    resolvedDate.getDay()
                )
                    ? "weekend"
                    : "weekday",
            weekday:
                resolvedDate.getDay(),
            hour:
                resolvedDate.getHours(),
            createdAt:
                resolvedDate.getTime()
        });

    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            observations: [
                observation,
                ...adaptiveLearningState
                    .observations
            ]
        });

    saveAdaptiveLearningState();
}

function getAdaptiveLearningSourceWeight(
    source = "manual"
) {
    if (source === "configuration") {
        return 3;
    }

    if (source === "manual") {
        return 2;
    }

    if (source === "ios") {
        return 2;
    }

    return 0;
}

function getAdaptiveLearningSuggestionSignature(
    slotId = "",
    mixId = ""
) {
    return `${slotId}:${mixId}`;
}

function getAdaptiveLearningRecencyWeight(
    createdAt = Date.now()
) {
    const age = Math.max(
        0,
        Date.now() - Number(createdAt || 0)
    );
    const day = 24 * 60 * 60 * 1000;

    if (age <= 30 * day) {
        return 1;
    }

    if (age <= 90 * day) {
        return 0.85;
    }

    return 0.7;
}

function getAdaptiveLearningPatterns() {
    const validMixIds = new Set(
        savedMixes.map((mix) => mix.id)
    );
    const preferenceObservations =
        adaptiveLearningState.observations
            .filter(
                (item) =>
                    validMixIds.has(
                        item.mixId
                    ) &&
                    getAdaptiveLearningSourceWeight(
                        item.source
                    ) > 0
            );

    return ADAPTIVE_SLOTS.map((slot) => {
        const observations =
            preferenceObservations.filter(
                (item) =>
                    item.slotId === slot.id
            );
        const candidates = new Map();
        let totalWeight = 0;

        for (const observation of observations) {
            const weight =
                getAdaptiveLearningSourceWeight(
                    observation.source
                ) *
                getAdaptiveLearningRecencyWeight(
                    observation.createdAt
                );
            totalWeight += weight;

            const candidate =
                candidates.get(
                    observation.mixId
                ) || {
                    mixId: observation.mixId,
                    weight: 0,
                    count: 0,
                    weekdayCount: 0,
                    weekendCount: 0,
                    latestAt: 0
                };

            candidate.weight += weight;
            candidate.count += 1;
            candidate.latestAt = Math.max(
                candidate.latestAt,
                observation.createdAt
            );

            if (
                observation.dayType ===
                "weekend"
            ) {
                candidate.weekendCount += 1;
            } else {
                candidate.weekdayCount += 1;
            }

            candidates.set(
                observation.mixId,
                candidate
            );
        }

        const ranked = [...candidates.values()]
            .sort(
                (first, second) =>
                    second.weight - first.weight ||
                    second.count - first.count ||
                    second.latestAt - first.latestAt
            );
        const winner = ranked[0] || null;

        if (!winner) {
            return {
                slot,
                observationCount: 0,
                preferenceCount: 0,
                confidence: 0,
                candidateMixId: "",
                candidateMix: null,
                dominantDayType: "mixed"
            };
        }

        const share = totalWeight > 0
            ? winner.weight / totalWeight
            : 0;
        const maturity = Math.min(
            1,
            observations.length / 8
        );
        const confidence = Math.round(
            Math.min(
                0.95,
                share *
                (0.35 + 0.65 * maturity)
            ) * 100
        );
        const dayTotal =
            winner.weekdayCount +
            winner.weekendCount;
        const dominantDayType =
            dayTotal &&
            Math.max(
                winner.weekdayCount,
                winner.weekendCount
            ) / dayTotal >= 0.7
                ? winner.weekendCount >
                    winner.weekdayCount
                    ? "weekend"
                    : "weekday"
                : "mixed";

        return {
            slot,
            observationCount:
                observations.length,
            preferenceCount:
                winner.count,
            confidence,
            candidateMixId:
                winner.mixId,
            candidateMix:
                savedMixes.find(
                    (mix) =>
                        mix.id === winner.mixId
                ) || null,
            dominantDayType
        };
    });
}

function getAdaptiveLearningSummary() {
    const patterns =
        getAdaptiveLearningPatterns();
    const eligiblePatterns = patterns.filter(
        (pattern) =>
            pattern.candidateMix &&
            pattern.observationCount >=
                ADAPTIVE_LEARNING_MIN_OBSERVATIONS &&
            pattern.preferenceCount >= 2
    );
    const suggestions = eligiblePatterns
        .filter((pattern) => {
            if (
                pattern.confidence <
                ADAPTIVE_LEARNING_MIN_CONFIDENCE
            ) {
                return false;
            }

            const currentMixId =
                adaptiveDjMenuSettings
                    .slots[pattern.slot.id] ||
                "";

            if (
                currentMixId ===
                pattern.candidateMixId
            ) {
                return false;
            }

            const signature =
                getAdaptiveLearningSuggestionSignature(
                    pattern.slot.id,
                    pattern.candidateMixId
                );
            const dismissed =
                adaptiveLearningState
                    .dismissedSuggestions
                    .find(
                        (item) =>
                            item.signature ===
                            signature
                    );

            return !dismissed ||
                pattern.preferenceCount >=
                    dismissed.evidenceCount + 2 ||
                pattern.confidence >=
                    dismissed.confidence + 10;
        })
        .sort(
            (first, second) =>
                second.confidence -
                first.confidence ||
                second.preferenceCount -
                first.preferenceCount
        )
        .slice(0, 3);
    const confidenceValues =
        eligiblePatterns.map(
            (pattern) =>
                pattern.confidence
        );
    const overallConfidence =
        confidenceValues.length
            ? Math.round(
                confidenceValues.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                confidenceValues.length
            )
            : 0;
    const preferenceObservationCount =
        adaptiveLearningState.observations
            .filter(
                (item) =>
                    getAdaptiveLearningSourceWeight(
                        item.source
                    ) > 0
            ).length;

    return {
        patterns,
        suggestions,
        overallConfidence,
        totalObservationCount:
            adaptiveLearningState
                .observations.length,
        preferenceObservationCount
    };
}

function getAdaptiveLearningDayLabel(
    value = "mixed"
) {
    if (value === "weekday") {
        return "principalement en semaine";
    }

    if (value === "weekend") {
        return "principalement le week-end";
    }

    return "sur plusieurs jours";
}

function getAdaptiveLearningAutoCandidate(
    slotId = ""
) {
    if (
        !adaptiveLearningState.enabled ||
        !adaptiveLearningState.autoApplyEnabled
    ) {
        return null;
    }

    const slot = getAdaptiveSlotById(slotId);
    const pattern = getAdaptiveLearningPatterns()
        .find(
            (item) =>
                item.slot.id === slot.id
        );

    if (
        !pattern?.candidateMix ||
        pattern.confidence <
            adaptiveLearningState
                .autoApplyMinConfidence ||
        pattern.preferenceCount <
            adaptiveLearningState
                .autoApplyMinObservations
    ) {
        return null;
    }

    const currentMixId =
        adaptiveDjMenuSettings.slots[slot.id] || "";

    if (currentMixId === pattern.candidateMixId) {
        return null;
    }

    const signature =
        getAdaptiveLearningSuggestionSignature(
            slot.id,
            pattern.candidateMixId
        );
    const dismissed =
        adaptiveLearningState.dismissedSuggestions
            .find(
                (item) =>
                    item.signature === signature
            );

    if (
        dismissed &&
        pattern.preferenceCount <
            dismissed.evidenceCount + 2 &&
        pattern.confidence <
            dismissed.confidence + 10
    ) {
        return null;
    }

    return pattern;
}

function applyAdaptiveLearningAutoCandidate(
    slotId = ""
) {
    const pattern =
        getAdaptiveLearningAutoCandidate(slotId);

    if (!pattern) {
        return null;
    }

    const previousMixId =
        adaptiveDjMenuSettings
            .slots[pattern.slot.id] || "";
    const previousMix = savedMixes.find(
        (item) => item.id === previousMixId
    );
    const change =
        normalizeAdaptiveLearningAutoChange({
            id: createIosCommandId(),
            slotId: pattern.slot.id,
            previousMixId,
            previousMixName:
                previousMix?.name || "Aucun mix",
            nextMixId: pattern.candidateMixId,
            nextMixName:
                pattern.candidateMix.name,
            confidence: pattern.confidence,
            evidenceCount:
                pattern.preferenceCount,
            status: "applied",
            launchSucceeded: false,
            createdAt: Date.now()
        });

    adaptiveDjMenuSettings =
        normalizeAdaptiveDjMenuSettings({
            ...adaptiveDjMenuSettings,
            slots: {
                ...adaptiveDjMenuSettings.slots,
                [pattern.slot.id]:
                    pattern.candidateMixId
            }
        });
    saveAdaptiveDjMenuSettings();

    const signature =
        getAdaptiveLearningSuggestionSignature(
            pattern.slot.id,
            pattern.candidateMixId
        );

    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            acceptedSuggestions: [
                {
                    signature,
                    slotId: pattern.slot.id,
                    mixId: pattern.candidateMixId,
                    evidenceCount:
                        pattern.preferenceCount,
                    confidence: pattern.confidence,
                    decidedAt: Date.now()
                },
                ...adaptiveLearningState
                    .acceptedSuggestions
                    .filter(
                        (item) =>
                            item.signature !== signature
                    )
            ],
            dismissedSuggestions:
                adaptiveLearningState
                    .dismissedSuggestions
                    .filter(
                        (item) =>
                            item.signature !== signature
                    ),
            autoApplyHistory: [
                change,
                ...adaptiveLearningState
                    .autoApplyHistory
            ]
        });
    saveAdaptiveLearningState();

    return change;
}

function finalizeAdaptiveLearningAutoChange(
    changeId = ""
) {
    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            autoApplyHistory:
                adaptiveLearningState
                    .autoApplyHistory
                    .map((item) =>
                        item.id === changeId
                            ? {
                                ...item,
                                launchSucceeded: true
                            }
                            : item
                    )
        });
    saveAdaptiveLearningState();
}

function rollbackAdaptiveLearningAutoChange(
    changeId = "",
    {
        reason = "manual",
        silent = false
    } = {}
) {
    const change =
        adaptiveLearningState.autoApplyHistory
            .find((item) => item.id === changeId);

    if (!change || change.status !== "applied") {
        if (!silent) {
            setStatus(
                "Ce changement automatique n’est plus réversible.",
                "error"
            );
        }
        return false;
    }

    const currentMixId =
        adaptiveDjMenuSettings
            .slots[change.slotId] || "";

    if (currentMixId !== change.nextMixId) {
        if (!silent) {
            setStatus(
                "Le créneau a été modifié depuis. Retour arrière annulé.",
                "error"
            );
        }
        return false;
    }

    const restoredMixId =
        change.previousMixId &&
        savedMixes.some(
            (item) =>
                item.id === change.previousMixId
        )
            ? change.previousMixId
            : "";

    adaptiveDjMenuSettings =
        normalizeAdaptiveDjMenuSettings({
            ...adaptiveDjMenuSettings,
            slots: {
                ...adaptiveDjMenuSettings.slots,
                [change.slotId]: restoredMixId
            }
        });
    saveAdaptiveDjMenuSettings();

    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            autoApplyHistory:
                adaptiveLearningState
                    .autoApplyHistory
                    .map((item) =>
                        item.id === changeId
                            ? {
                                ...item,
                                status:
                                    reason === "launch-error"
                                        ? "rollback"
                                        : "reverted",
                                revertedAt: Date.now(),
                                revertReason: reason
                            }
                            : item
                    )
        });
    saveAdaptiveLearningState();

    if (!silent) {
        displayPlaylists(playlistsCache);
        setStatus(
            `Retour arrière effectué : ${change.previousMixName || "aucun mix"} restauré.`
        );
    }

    return true;
}

function renderAdaptiveAutomaticPanel() {
    const currentSlot = getAdaptiveSlot();
    const candidate =
        getAdaptiveLearningAutoCandidate(
            currentSlot.id
        );
    const history =
        adaptiveLearningState.autoApplyHistory
            .slice(0, 10)
            .map((change) => {
                const slot =
                    getAdaptiveSlotById(change.slotId);
                const canUndo =
                    change.status === "applied" &&
                    (adaptiveDjMenuSettings
                        .slots[change.slotId] || "") ===
                        change.nextMixId;
                const status =
                    change.status === "reverted"
                        ? "annulé"
                        : change.status === "rollback"
                            ? "retour arrière après échec"
                            : change.launchSucceeded
                                ? "appliqué"
                                : "en attente";

                return `
                    <li class="adaptive-auto-history-item">
                        <div>
                            <strong>${escapeHtml(slot.label)}</strong>
                            <span>
                                ${escapeHtml(change.previousMixName)}
                                →
                                ${escapeHtml(change.nextMixName)}
                            </span>
                            <small>
                                ${change.confidence}% ·
                                ${change.evidenceCount} choix ·
                                ${new Intl.DateTimeFormat(
                                    "fr-FR",
                                    {
                                        dateStyle: "short",
                                        timeStyle: "short"
                                    }
                                ).format(new Date(change.createdAt))}
                                · ${status}
                            </small>
                        </div>
                        ${canUndo
                            ? `
                                <button
                                    type="button"
                                    class="adaptive-auto-undo"
                                    data-adaptive-auto-undo-id="${escapeHtml(change.id)}"
                                >
                                    ↶ Annuler
                                </button>
                            `
                            : ""}
                    </li>
                `;
            })
            .join("");

    return `
        <section class="adaptive-auto-panel">
            <div class="adaptive-auto-heading">
                <div>
                    <strong>⚡ Adaptation automatique</strong>
                    <small>
                        Désactivée par défaut. Elle ne s’applique
                        qu’au lancement réel d’Adaptive DJ.
                    </small>
                </div>
                <span>
                    ${!adaptiveLearningState.enabled
                        ? "Apprentissage désactivé"
                        : !adaptiveLearningState.autoApplyEnabled
                            ? "Automatique désactivé"
                            : candidate
                                ? `Prêt : ${escapeHtml(candidate.candidateMix.name)}`
                                : "Actif, aucun changement prêt"}
                </span>
            </div>

            <label class="adaptive-learning-toggle">
                <input
                    id="adaptiveLearningAutoApplyInput"
                    type="checkbox"
                    ${adaptiveLearningState.autoApplyEnabled
                        ? "checked"
                        : ""}
                    ${adaptiveLearningState.enabled
                        ? ""
                        : "disabled"}
                >
                <span>
                    Autoriser les changements automatiques
                </span>
            </label>

            <div class="adaptive-auto-controls">
                <label>
                    <span>Confiance minimale</span>
                    <select
                        id="adaptiveLearningAutoConfidenceInput"
                        ${adaptiveLearningState.enabled
                            ? ""
                            : "disabled"}
                    >
                        ${[60, 65, 70, 75, 80, 85, 90, 95]
                            .map((value) => `
                                <option
                                    value="${value}"
                                    ${value === Number(
                                        adaptiveLearningState
                                            .autoApplyMinConfidence
                                    )
                                        ? "selected"
                                        : ""}
                                >
                                    ${value}%
                                </option>
                            `).join("")}
                    </select>
                </label>

                <label>
                    <span>Choix concordants minimum</span>
                    <select
                        id="adaptiveLearningAutoObservationsInput"
                        ${adaptiveLearningState.enabled
                            ? ""
                            : "disabled"}
                    >
                        ${[3, 4, 5, 6, 7, 8, 10, 12]
                            .map((value) => `
                                <option
                                    value="${value}"
                                    ${value === Number(
                                        adaptiveLearningState
                                            .autoApplyMinObservations
                                    )
                                        ? "selected"
                                        : ""}
                                >
                                    ${value}
                                </option>
                            `).join("")}
                    </select>
                </label>
            </div>

            <div class="adaptive-auto-preview ${candidate ? "is-ready" : ""}">
                ${candidate
                    ? `
                        <strong>Prochain changement possible</strong>
                        <span>
                            ${escapeHtml(candidate.slot.label)}
                            →
                            ${escapeHtml(candidate.candidateMix.name)}
                        </span>
                        <small>
                            ${candidate.confidence}% ·
                            ${candidate.preferenceCount} choix concordants
                        </small>
                    `
                    : `
                        <strong>Aucun changement automatique prêt</strong>
                        <span>
                            Le mix actuel reste utilisé tant que
                            les seuils ne sont pas atteints.
                        </span>
                    `}
            </div>

            <details class="adaptive-auto-history">
                <summary>
                    Journal automatique ·
                    ${adaptiveLearningState.autoApplyHistory.length}
                </summary>
                <ul>
                    ${history ||
                    "<li>Aucun changement automatique.</li>"}
                </ul>
            </details>
        </section>
    `;
}

function renderAdaptiveLearningPanel() {
    const summary =
        getAdaptiveLearningSummary();
    const suggestionsHtml =
        summary.suggestions.map(
            (suggestion) => `
                <article class="adaptive-learning-suggestion">
                    <div>
                        <span class="adaptive-learning-suggestion-label">
                            Suggestion ·
                            ${suggestion.confidence}%
                        </span>
                        <h5>
                            ${escapeHtml(
                                suggestion.slot.label
                            )}
                            →
                            ${escapeHtml(
                                suggestion.candidateMix.name
                            )}
                        </h5>
                        <p>
                            Choisi
                            ${suggestion.preferenceCount}
                            fois sur
                            ${suggestion.observationCount}
                            observation${
                                suggestion.observationCount > 1
                                    ? "s"
                                    : ""
                            },
                            ${getAdaptiveLearningDayLabel(
                                suggestion.dominantDayType
                            )}.
                        </p>
                    </div>

                    <div class="adaptive-learning-suggestion-actions">
                        <button
                            type="button"
                            class="adaptive-learning-apply"
                            data-adaptive-learning-action="apply"
                            data-adaptive-learning-slot-id="${escapeHtml(
                                suggestion.slot.id
                            )}"
                            data-adaptive-learning-mix-id="${escapeHtml(
                                suggestion.candidateMixId
                            )}"
                        >
                            ✓ Appliquer
                        </button>

                        <button
                            type="button"
                            class="adaptive-learning-ignore"
                            data-adaptive-learning-action="ignore"
                            data-adaptive-learning-slot-id="${escapeHtml(
                                suggestion.slot.id
                            )}"
                            data-adaptive-learning-mix-id="${escapeHtml(
                                suggestion.candidateMixId
                            )}"
                        >
                            Ignorer
                        </button>
                    </div>
                </article>
            `
        ).join("");
    const insightPatterns =
        summary.patterns
            .filter(
                (pattern) =>
                    pattern.candidateMix &&
                    pattern.observationCount > 0
            )
            .sort(
                (first, second) =>
                    second.confidence -
                    first.confidence
            )
            .slice(0, 5);
    const insightsHtml =
        insightPatterns.map(
            (pattern) => `
                <li>
                    <span>
                        ${escapeHtml(
                            pattern.slot.label
                        )}
                    </span>
                    <strong>
                        ${escapeHtml(
                            pattern.candidateMix.name
                        )}
                    </strong>
                    <small>
                        ${pattern.confidence}% ·
                        ${pattern.preferenceCount}
                        choix
                    </small>
                </li>
            `
        ).join("");
    const stateLabel =
        !adaptiveLearningState.enabled
            ? "Désactivé"
            : summary.preferenceObservationCount <
                ADAPTIVE_LEARNING_MIN_OBSERVATIONS
                ? "En observation"
                : summary.suggestions.length
                    ? "Suggestion disponible"
                    : "À jour";

    return `
        <section class="adaptive-learning-panel">
            <div class="adaptive-learning-heading">
                <div>
                    <span class="adaptive-menu-kicker">
                        🧠 Adaptive Learning
                    </span>
                    <h4>
                        Shuffle+ observe et propose
                    </h4>
                    <p>
                        Les choix de mix sont analysés
                        uniquement dans ce navigateur.
                        L’adaptation automatique reste
                        désactivée sans ton autorisation.
                    </p>
                </div>

                <span class="adaptive-learning-state">
                    ${stateLabel}
                </span>
            </div>

            <div class="adaptive-learning-metrics">
                <div>
                    <strong>
                        ${summary.preferenceObservationCount}
                    </strong>
                    <span>choix observés</span>
                </div>
                <div>
                    <strong>
                        ${summary.overallConfidence}%
                    </strong>
                    <span>confiance</span>
                </div>
                <div>
                    <strong>
                        ${summary.suggestions.length}
                    </strong>
                    <span>suggestion${
                        summary.suggestions.length > 1
                            ? "s"
                            : ""
                    }</span>
                </div>
            </div>

            <label class="adaptive-learning-toggle">
                <input
                    id="adaptiveLearningEnabledInput"
                    type="checkbox"
                    ${adaptiveLearningState.enabled
                        ? "checked"
                        : ""}
                >
                <span>
                    Activer l’apprentissage local
                </span>
            </label>

            ${renderAdaptiveAutomaticPanel()}

            <div class="adaptive-learning-suggestions">
                ${suggestionsHtml || `
                    <div class="adaptive-learning-empty">
                        ${adaptiveLearningState.enabled
                            ? summary.preferenceObservationCount <
                                ADAPTIVE_LEARNING_MIN_OBSERVATIONS
                                ? `Encore ${Math.max(
                                    0,
                                    ADAPTIVE_LEARNING_MIN_OBSERVATIONS -
                                    summary.preferenceObservationCount
                                )} choix à observer avant la première suggestion.`
                                : "Aucune nouvelle modification n’est suggérée pour le moment."
                            : "Active l’apprentissage pour enregistrer les prochains choix."}
                    </div>
                `}
            </div>

            <details class="adaptive-learning-insights">
                <summary>
                    Habitudes détectées ·
                    ${insightPatterns.length}
                </summary>
                <ul>
                    ${insightsHtml ||
                    "<li>Aucune habitude détectée.</li>"}
                </ul>
            </details>

            <div class="adaptive-learning-footer">
                <small>
                    Les lancements manuels, les commandes
                    iOS et les associations enregistrées
                    servent de préférences. Les lancements
                    automatiques sont conservés dans
                    l’historique mais ne peuvent pas, à eux
                    seuls, créer une suggestion.
                </small>
                <button
                    id="resetAdaptiveLearningButton"
                    type="button"
                    class="adaptive-learning-reset"
                    ${summary.totalObservationCount ||
                    adaptiveLearningState
                        .dismissedSuggestions.length ||
                    adaptiveLearningState
                        .acceptedSuggestions.length
                        ? ""
                        : "disabled"}
                >
                    Réinitialiser l’apprentissage
                </button>
            </div>
        </section>
    `;
}

function findAdaptiveLearningSuggestion(
    slotId = "",
    mixId = ""
) {
    return getAdaptiveLearningSummary()
        .suggestions.find(
            (item) =>
                item.slot.id === slotId &&
                item.candidateMixId === mixId
        ) || null;
}

function applyAdaptiveLearningSuggestion(
    slotId = "",
    mixId = ""
) {
    const suggestion =
        findAdaptiveLearningSuggestion(
            slotId,
            mixId
        );
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );
    const slot = ADAPTIVE_SLOTS.find(
        (item) => item.id === slotId
    );

    if (!suggestion || !mix || !slot) {
        setStatus(
            "Cette suggestion n’est plus disponible.",
            "error"
        );
        displayPlaylists(playlistsCache);
        return;
    }

    adaptiveDjMenuSettings =
        normalizeAdaptiveDjMenuSettings({
            ...adaptiveDjMenuSettings,
            slots: {
                ...adaptiveDjMenuSettings.slots,
                [slotId]: mixId
            }
        });
    saveAdaptiveDjMenuSettings();

    const signature =
        getAdaptiveLearningSuggestionSignature(
            slotId,
            mixId
        );
    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            acceptedSuggestions: [
                {
                    signature,
                    slotId,
                    mixId,
                    evidenceCount:
                        suggestion.preferenceCount,
                    confidence:
                        suggestion.confidence,
                    decidedAt: Date.now()
                },
                ...adaptiveLearningState
                    .acceptedSuggestions
            ],
            dismissedSuggestions:
                adaptiveLearningState
                    .dismissedSuggestions
                    .filter(
                        (item) =>
                            item.signature !==
                            signature
                    )
        });
    saveAdaptiveLearningState();
    recordAdaptiveLearningObservation({
        mixId,
        source: "configuration",
        slotId
    });
    displayPlaylists(playlistsCache);
    setStatus(
        `Suggestion appliquée : ${slot.label} utilisera « ${mix.name} ».`
    );
}

function ignoreAdaptiveLearningSuggestion(
    slotId = "",
    mixId = ""
) {
    const suggestion =
        findAdaptiveLearningSuggestion(
            slotId,
            mixId
        );

    if (!suggestion) {
        displayPlaylists(playlistsCache);
        return;
    }

    const signature =
        getAdaptiveLearningSuggestionSignature(
            slotId,
            mixId
        );
    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...adaptiveLearningState,
            dismissedSuggestions: [
                {
                    signature,
                    slotId,
                    mixId,
                    evidenceCount:
                        suggestion.preferenceCount,
                    confidence:
                        suggestion.confidence,
                    decidedAt: Date.now()
                },
                ...adaptiveLearningState
                    .dismissedSuggestions
                    .filter(
                        (item) =>
                            item.signature !==
                            signature
                    )
            ]
        });
    saveAdaptiveLearningState();
    displayPlaylists(playlistsCache);
    setStatus(
        "Suggestion ignorée. Elle ne reviendra qu’avec de nouveaux indices."
    );
}

function resetAdaptiveLearning() {
    const confirmed = window.confirm(
        "Réinitialiser toutes les observations et suggestions Adaptive Learning ?"
    );

    if (!confirmed) {
        return;
    }

    adaptiveLearningState =
        normalizeAdaptiveLearningState({
            ...DEFAULT_ADAPTIVE_LEARNING_STATE,
            enabled:
                adaptiveLearningState.enabled,
            autoApplyEnabled:
                adaptiveLearningState.autoApplyEnabled,
            autoApplyMinConfidence:
                adaptiveLearningState.autoApplyMinConfidence,
            autoApplyMinObservations:
                adaptiveLearningState.autoApplyMinObservations
        });
    saveAdaptiveLearningState();
    displayPlaylists(playlistsCache);
    setStatus(
        "Apprentissage Adaptive réinitialisé."
    );
}

function getAdaptiveSlotById(slotId = "") {
    return (
        ADAPTIVE_SLOTS.find(
            (slot) => slot.id === slotId
        ) ||
        getAdaptiveSlot()
    );
}

function getAdaptiveDjMix(slotId = "") {
    const resolvedSlot =
        getAdaptiveSlotById(slotId);
    const mixId =
        adaptiveDjMenuSettings
            .slots[resolvedSlot.id] || "";

    return {
        slot: resolvedSlot,
        mixId,
        mix:
            savedMixes.find(
                (item) => item.id === mixId
            ) || null
    };
}

function buildAdaptiveDjShortcutUrl() {
    const url = new URL(
        window.location.origin +
        window.location.pathname
    );

    url.searchParams.set(
        "action",
        "adaptive"
    );
    url.searchParams.set(
        "autoplay",
        "1"
    );

    return url.toString();
}

function renderAppMenu() {
    const items = [
        ["music", "🎵", "Ma musique"],
        ["mixes", "🔀", "Mix & iOS"],
        ["adaptive", "🤖", "Adaptive DJ"],
        ["intelligence", "🧠", "Intelligence"],
        ["settings", "⚙️", "Réglages"]
    ];

    return `
        <nav
            class="app-menu"
            aria-label="Navigation Shuffle+"
        >
            ${items.map(
                ([id, icon, label]) => `
                    <button
                        type="button"
                        class="app-menu-button
                        ${activeAppMenu === id
                            ? "is-active"
                            : ""}"
                        data-app-menu="${id}"
                        aria-current="${activeAppMenu === id
                            ? "page"
                            : "false"}"
                    >
                        <span aria-hidden="true">
                            ${icon}
                        </span>
                        <span>${label}</span>
                    </button>
                `
            ).join("")}
        </nav>
    `;
}

function renderAdaptiveDjMenu() {
    const current =
        getAdaptiveDjMix();
    const currentMixName =
        current.mix?.name ||
        "Aucun mix associé";

    const mixOptions = (selectedId = "") =>
        savedMixes
            .map((mix) => `
                <option
                    value="${escapeHtml(mix.id)}"
                    ${mix.id === selectedId
                        ? "selected"
                        : ""}
                >
                    ${escapeHtml(mix.name)}
                </option>
            `)
            .join("");

    const history = adaptiveDjMenuHistory
        .slice(0, 10)
        .map((item) => `
            <li>
                <span>
                    ${escapeHtml(item.slotLabel)}
                </span>
                <strong>
                    ${escapeHtml(
                        item.mixName ||
                        "Mix non défini"
                    )}
                </strong>
                <small>
                    ${new Intl.DateTimeFormat(
                        "fr-FR",
                        {
                            dateStyle: "short",
                            timeStyle: "short"
                        }
                    ).format(
                        new Date(item.createdAt)
                    )}
                    · ${item.status === "success"
                        ? "réussi"
                        : "échec"}
                    ${item.deviceName
                        ? ` · ${escapeHtml(item.deviceName)}`
                        : ""}
                </small>
            </li>
        `)
        .join("");

    return `
        <section class="adaptive-menu-page">
            <div class="adaptive-menu-hero">
                <div>
                    <span class="adaptive-menu-kicker">
                        🤖 Adaptive DJ
                    </span>
                    <h3>
                        ${escapeHtml(current.slot.label)}
                    </h3>
                    <p>
                        Il est
                        ${String(
                            new Date().getHours()
                        ).padStart(2, "0")}h${String(
                            new Date().getMinutes()
                        ).padStart(2, "0")}
                        · mix sélectionné :
                        <strong>
                            ${escapeHtml(currentMixName)}
                        </strong>
                    </p>
                </div>

                <span class="adaptive-menu-status
                    ${adaptiveDjMenuSettings.enabled
                        ? "is-enabled"
                        : "is-disabled"}"
                >
                    ${adaptiveDjMenuSettings.enabled
                        ? "Actif"
                        : "Désactivé"}
                </span>
            </div>

            <div class="adaptive-menu-actions">
                <button
                    id="runAdaptiveDjNowButton"
                    class="adaptive-menu-primary"
                    type="button"
                    ${adaptiveDjMenuSettings.enabled &&
                    current.mix
                        ? ""
                        : "disabled"}
                >
                    ▶ Lancer maintenant
                </button>

                <button
                    id="copyAdaptiveDjUrlButton"
                    class="adaptive-menu-secondary"
                    type="button"
                >
                    🔗 Copier l’URL iOS
                </button>
            </div>

            <form
                id="adaptiveDjMenuForm"
                class="adaptive-menu-form"
            >
                <label class="adaptive-menu-toggle">
                    <input
                        name="enabled"
                        type="checkbox"
                        ${adaptiveDjMenuSettings.enabled
                            ? "checked"
                            : ""}
                    >
                    <span>
                        Activer Adaptive DJ
                    </span>
                </label>

                <div class="adaptive-slot-grid">
                    ${ADAPTIVE_SLOTS.map((slot) => `
                        <label class="adaptive-slot-field">
                            <span>
                                ${escapeHtml(slot.label)}
                            </span>
                            <small>
                                ${String(slot.start)
                                    .padStart(2, "0")}h
                                →
                                ${String(slot.end)
                                    .padStart(2, "0")}h
                            </small>
                            <select
                                name="slot-${escapeHtml(slot.id)}"
                            >
                                <option value="">
                                    Aucun mix
                                </option>
                                ${mixOptions(
                                    adaptiveDjMenuSettings
                                        .slots[slot.id] ||
                                    ""
                                )}
                            </select>
                        </label>
                    `).join("")}
                </div>

                <div class="adaptive-test-row">
                    <label>
                        <span>Simuler un contexte</span>
                        <select name="testSlotId">
                            ${ADAPTIVE_SLOTS.map(
                                (slot) => `
                                    <option
                                        value="${escapeHtml(slot.id)}"
                                    >
                                        ${escapeHtml(slot.label)}
                                    </option>
                                `
                            ).join("")}
                        </select>
                    </label>

                    <button
                        id="testAdaptiveDjButton"
                        class="adaptive-menu-secondary"
                        type="button"
                    >
                        Tester ce créneau
                    </button>

                    <button
                        class="adaptive-menu-save"
                        type="submit"
                    >
                        Enregistrer
                    </button>
                </div>
            </form>

            ${renderAdaptiveLearningPanel()}

            <details class="adaptive-menu-history">
                <summary>
                    Historique Adaptive DJ ·
                    ${adaptiveDjMenuHistory.length}
                </summary>
                <ul>
                    ${history ||
                    "<li>Aucun lancement enregistré.</li>"}
                </ul>
            </details>
        </section>
    `;
}

function saveAdaptiveDjMenuFromForm(form) {
    const data = new FormData(form);
    const slots = {};
    const previousSlots = {
        ...adaptiveDjMenuSettings.slots
    };

    for (const slot of ADAPTIVE_SLOTS) {
        slots[slot.id] = String(
            data.get(`slot-${slot.id}`) ||
            ""
        );
    }

    adaptiveDjMenuSettings =
        normalizeAdaptiveDjMenuSettings({
            enabled:
                data.get("enabled") === "on",
            slots
        });

    saveAdaptiveDjMenuSettings();

    for (const slot of ADAPTIVE_SLOTS) {
        const mixId = slots[slot.id];

        if (
            mixId &&
            mixId !== previousSlots[slot.id]
        ) {
            recordAdaptiveLearningObservation({
                mixId,
                source: "configuration",
                slotId: slot.id
            });
            recordIntelligenceEvent({
                type: "correction",
                mixId,
                mixName: getSavedMixName(mixId),
                source: "adaptive-configuration",
                slotId: slot.id,
                beforeMixId:
                    previousSlots[slot.id] || "",
                beforeMixName:
                    previousSlots[slot.id]
                        ? getSavedMixName(
                            previousSlots[slot.id]
                        )
                        : "Aucun mix",
                afterMixId: mixId,
                afterMixName:
                    getSavedMixName(mixId),
                reason:
                    "Association du créneau Adaptive DJ modifiée manuellement."
            });
        }
    }

    displayPlaylists(playlistsCache);

    setStatus(
        "Configuration Adaptive DJ enregistrée."
    );
}

async function copyAdaptiveDjShortcutUrl() {
    const url =
        buildAdaptiveDjShortcutUrl();

    try {
        await navigator.clipboard.writeText(
            url
        );
        setStatus(
            "URL Adaptive DJ copiée."
        );
    } catch (error) {
        window.prompt(
            "Copie cette URL dans Raccourcis :",
            url
        );
    }
}

async function runAdaptiveDj({
    forcedSlotId = "",
    autoplay = true
} = {}) {
    if (!adaptiveDjMenuSettings.enabled) {
        throw new Error(
            "Adaptive DJ est désactivé."
        );
    }

    const requestedSlot =
        getAdaptiveSlotById(forcedSlotId);
    const automaticChange = autoplay
        ? applyAdaptiveLearningAutoCandidate(
            requestedSlot.id
        )
        : null;
    const {
        slot,
        mixId,
        mix
    } = getAdaptiveDjMix(
        requestedSlot.id
    );

    if (!mixId || !mix) {
        throw new Error(
            `Aucun mix n’est associé à ${slot.label}.`
        );
    }

    setStatus(
        `Adaptive DJ : préparation de ${slot.label}…`
    );

    try {
        const prepared =
            await launchSavedMix(mixId);

        if (!prepared) {
            throw new Error(
                "Le mix Adaptive n’a pas pu être préparé."
            );
        }

        let deviceName = "";

        if (
            autoplay &&
            selectedTracks.length
        ) {
            const command =
                getPrincipalIosCommand() ||
                normalizeIosCommand({
                    id: "adaptive",
                    name: "Adaptive DJ",
                    icon: "🤖",
                    deviceMode: "iphone",
                    fallbackDeviceMode: "active",
                    autoplay: true
                });

            const device =
                await getAutomationDeviceWithRetry(
                    command
                );

            if (!device) {
                throw new Error(
                    "Aucun appareil Spotify disponible."
                );
            }

            const uris = selectedTracks
                .slice(
                    0,
                    MAX_DIRECT_PLAYBACK_TRACKS
                )
                .map(
                    (track) => track?.uri
                )
                .filter(Boolean);

            if (!uris.length) {
                throw new Error(
                    "Le mix ne contient aucun morceau lisible."
                );
            }

            await startPlayback(
                uris,
                device.id
            );

            try {
                await setPlaybackShuffle(
                    false,
                    device.id
                );
            } catch (error) {
                console.warn(
                    "Shuffle Spotify non modifié :",
                    error
                );
            }

            rememberPlaybackOrder(
                selectedTracks.slice(
                    0,
                    uris.length
                )
            );
            addTracksSentToHistory(
                uris.length,
                selectedTracks.slice(
                    0,
                    uris.length
                ),
                "adaptive",
                device.name
            );

            deviceName = device.name;
        }

        addAdaptiveDjMenuHistory({
            slotId: slot.id,
            slotLabel: slot.label,
            mixId,
            mixName: mix.name,
            deviceName,
            status: "success",
            message:
                automaticChange
                    ? "Adaptation automatique appliquée puis mix lancé"
                    : autoplay
                        ? "Mix lancé"
                        : "Mix préparé"
        });

        if (automaticChange) {
            finalizeAdaptiveLearningAutoChange(
                automaticChange.id
            );
        }

        if (autoplay) {
            recordAdaptiveLearningObservation({
                mixId,
                source: "adaptive",
                slotId: slot.id
            });
            const latestAdaptiveEvent =
                intelligenceAnalytics.events.find(
                    (item) =>
                        item.type === "adaptive" &&
                        item.mixId === mixId
                );
            rememberAdaptiveProposal({
                slot,
                mix,
                relatedEventId:
                    latestAdaptiveEvent?.id || ""
            });
        }

        setStatus(
            `${slot.label} · « ${mix.name} »` +
            (deviceName
                ? ` lancé sur ${deviceName}.`
                : " préparé.")
        );

        return {
            slot,
            mix,
            deviceName
        };
    } catch (error) {
        if (automaticChange) {
            rollbackAdaptiveLearningAutoChange(
                automaticChange.id,
                {
                    reason: "launch-error",
                    silent: true
                }
            );
        }

        addAdaptiveDjMenuHistory({
            slotId: slot.id,
            slotLabel: slot.label,
            mixId,
            mixName: mix.name,
            deviceName: "",
            status: "error",
            message:
                error.message ||
                "Échec Adaptive DJ"
        });

        throw error;
    }
}


function normalizeIosQuickPlaySettings(
    settings = {}
) {
    const deviceModes = new Set([
        "iphone",
        "active",
        "named",
        "first"
    ]);

    return {
        playlistId:
            typeof settings.playlistId === "string"
                ? settings.playlistId
                    .replace(
                        /^spotify:playlist:/,
                        ""
                    )
                    .trim()
                    .slice(0, 120)
                : "",
        playlistName:
            typeof settings.playlistName === "string"
                ? settings.playlistName
                    .trim()
                    .slice(0, 160)
                : "",
        deviceMode:
            deviceModes.has(settings.deviceMode)
                ? settings.deviceMode
                : "iphone",
        deviceName:
            typeof settings.deviceName === "string"
                ? settings.deviceName
                    .trim()
                    .slice(0, 120)
                : "",
        shuffle: Boolean(settings.shuffle),
        startFromBeginning:
            settings.startFromBeginning !== false,
        autoRetryCount: clampInteger(
            settings.autoRetryCount,
            1,
            10,
            5
        ),
        retryDelayMs: clampInteger(
            settings.retryDelayMs,
            500,
            5000,
            1200
        )
    };
}

function readIosQuickPlaySettings() {
    try {
        const raw = localStorage.getItem(
            IOS_QUICKPLAY_KEY
        );

        return normalizeIosQuickPlaySettings(
            raw ? JSON.parse(raw) : {}
        );
    } catch (error) {
        console.warn(
            "Réglages iOS illisibles :",
            error
        );
        return {
            ...DEFAULT_IOS_QUICKPLAY_SETTINGS
        };
    }
}

function saveIosQuickPlaySettings() {
    try {
        localStorage.setItem(
            IOS_QUICKPLAY_KEY,
            JSON.stringify(iosQuickPlaySettings)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer le raccourci iOS :",
            error
        );
    }
}


function createIosCommandId() {
    if (crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        `ios-${Date.now()}-` +
        Math.random().toString(36).slice(2, 10)
    );
}

function normalizeIosCommand(command = {}) {
    const base =
        normalizeIosQuickPlaySettings(command);
    const commandType =
        command.commandType === "adaptive"
            ? "adaptive"
            : command.commandType === "smartmix"
                ? "smartmix"
                : "fixed";

    return {
        id:
            typeof command.id === "string" &&
            command.id.trim()
                ? command.id.trim().slice(0, 120)
                : createIosCommandId(),
        name:
            typeof command.name === "string" &&
            command.name.trim()
                ? command.name.trim().slice(0, 80)
                : "Lecture iOS",
        icon:
            typeof command.icon === "string" &&
            command.icon.trim()
                ? command.icon.trim().slice(0, 8)
                : "▶️",
        commandType,
        mixId:
            typeof command.mixId === "string"
                ? command.mixId.slice(0, 120)
                : "",
        profileId:
            typeof command.profileId === "string"
                ? command.profileId.slice(0, 120)
                : "",
        regenerateOnLaunch:
            command.regenerateOnLaunch !== false,
        autoplay:
            command.autoplay !== false,
        ...base,
        fallbackDeviceMode:
            ["active", "first", "iphone"].includes(
                command.fallbackDeviceMode
            )
                ? command.fallbackDeviceMode
                : "active",
        createdAt: Number(
            command.createdAt || Date.now()
        ),
        updatedAt: Number(
            command.updatedAt ||
            command.createdAt ||
            Date.now()
        )
    };
}

function migrateLegacyIosCommand() {
    const legacy =
        normalizeIosQuickPlaySettings(
            iosQuickPlaySettings
        );

    if (!legacy.playlistId) {
        return [];
    }

    return [
        normalizeIosCommand({
            id: "principal",
            name:
                legacy.playlistName ||
                "Playlist principale",
            icon: "⭐",
            ...legacy
        })
    ];
}

function readIosCommands() {
    try {
        const raw = localStorage.getItem(
            IOS_COMMANDS_KEY
        );
        const parsed = raw
            ? JSON.parse(raw)
            : null;

        if (
            !Array.isArray(parsed) ||
            !parsed.length
        ) {
            const migrated =
                migrateLegacyIosCommand();

            if (migrated.length) {
                localStorage.setItem(
                    IOS_COMMANDS_KEY,
                    JSON.stringify(migrated)
                );
            }

            return migrated;
        }

        return parsed
            .map((command) =>
                normalizeIosCommand(command)
            )
            .slice(0, MAX_IOS_COMMANDS);
    } catch (error) {
        console.warn(
            "Commandes iOS illisibles :",
            error
        );
        return migrateLegacyIosCommand();
    }
}

function saveIosCommands() {
    try {
        localStorage.setItem(
            IOS_COMMANDS_KEY,
            JSON.stringify(iosCommands)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer les commandes iOS :",
            error
        );
    }
}

function normalizeIosCommandHistory(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .filter(
            (item) =>
                item &&
                typeof item === "object"
        )
        .map((item) => ({
            id:
                typeof item.id === "string"
                    ? item.id
                    : createIosCommandId(),
            commandId:
                typeof item.commandId === "string"
                    ? item.commandId
                    : "",
            commandName:
                typeof item.commandName === "string"
                    ? item.commandName.slice(0, 80)
                    : "Lecture iOS",
            playlistName:
                typeof item.playlistName === "string"
                    ? item.playlistName.slice(0, 160)
                    : "",
            deviceName:
                typeof item.deviceName === "string"
                    ? item.deviceName.slice(0, 120)
                    : "",
            status:
                item.status === "error"
                    ? "error"
                    : "success",
            message:
                typeof item.message === "string"
                    ? item.message.slice(0, 240)
                    : "",
            createdAt: Number(
                item.createdAt || Date.now()
            )
        }))
        .slice(0, MAX_IOS_COMMAND_HISTORY);
}

function readIosCommandHistory() {
    try {
        const raw = localStorage.getItem(
            IOS_COMMAND_HISTORY_KEY
        );

        return normalizeIosCommandHistory(
            raw ? JSON.parse(raw) : []
        );
    } catch (error) {
        return [];
    }
}

function saveIosCommandHistory() {
    try {
        localStorage.setItem(
            IOS_COMMAND_HISTORY_KEY,
            JSON.stringify(iosCommandHistory)
        );
    } catch (error) {
        console.warn(
            "Historique iOS non enregistré :",
            error
        );
    }
}

function addIosCommandHistory(entry) {
    iosCommandHistory =
        normalizeIosCommandHistory([
            {
                id: createIosCommandId(),
                ...entry,
                createdAt: Date.now()
            },
            ...iosCommandHistory
        ]);
    saveIosCommandHistory();
}

function getIosCommandById(commandId) {
    return iosCommands.find(
        (command) => command.id === commandId
    ) || null;
}

function getPrincipalIosCommand() {
    return (
        getIosCommandById("principal") ||
        iosCommands[0] ||
        null
    );
}

function getEffectiveIosCommand(
    commandId = ""
) {
    return (
        getIosCommandById(commandId) ||
        getPrincipalIosCommand() ||
        normalizeIosCommand({
            id: "temporary",
            name: "Lecture iOS",
            ...iosQuickPlaySettings
        })
    );
}

function buildIosCommandUrl(command) {
    const normalized =
        normalizeIosCommand(command);
    const url = new URL(
        window.location.origin +
        window.location.pathname
    );

    url.searchParams.set(
        "action",
        normalized.commandType === "adaptive"
            ? "adaptive"
            : normalized.commandType === "smartmix"
                ? "smartmix"
                : "quickplay"
    );
    url.searchParams.set(
        "command",
        normalized.id
    );

    if (normalized.playlistId) {
        url.searchParams.set(
            "playlist",
            normalized.playlistId
        );
    }

    url.searchParams.set(
        "autoplay",
        "1"
    );

    if (normalized.commandType === "adaptive") {
        const context = getAdaptiveSlot();
        url.searchParams.set(
            "context",
            context.id
        );
    }

    return url.toString();
}

function saveIosCommandFromForm(form) {
    if (
        !editingIosCommandId &&
        iosCommands.length >= MAX_IOS_COMMANDS
    ) {
        setStatus(
            `Tu peux créer jusqu’à ${MAX_IOS_COMMANDS} commandes iOS.`,
            "error"
        );
        return;
    }

    const formData = new FormData(form);
    const playlistId =
        String(
            formData.get("playlistId") || ""
        );
    const playlist = playlistsCache.find(
        (item) => item.id === playlistId
    );
    const commandType =
        formData.get("commandType") === "smartmix"
            ? "smartmix"
            : "fixed";
    const mixId =
        String(formData.get("mixId") || "");

    if (
        commandType === "fixed" &&
        !playlistId
    ) {
        setStatus(
            "Choisis une playlist pour ce raccourci.",
            "error"
        );
        return;
    }

    if (
        commandType === "smartmix" &&
        !savedMixes.some(
            (mix) => mix.id === mixId
        )
    ) {
        setStatus(
            "Choisis un mix enregistré valide.",
            "error"
        );
        return;
    }

    const existing = getIosCommandById(
        editingIosCommandId
    );

    const command = normalizeIosCommand({
        ...existing,
        id:
            existing?.id ||
            (
                iosCommands.length
                    ? createIosCommandId()
                    : "principal"
            ),
        name:
            formData.get("name") ||
            playlist?.name ||
            "Lecture iOS",
        icon:
            formData.get("icon") ||
            "▶️",
        commandType,
        mixId,
        profileId:
            String(formData.get("profileId") || ""),
        regenerateOnLaunch:
            formData.get("regenerateOnLaunch") === "on",
        autoplay:
            formData.get("autoplay") === "on",
        playlistId,
        playlistName:
            playlist?.name || "",
        deviceMode:
            formData.get("deviceMode"),
        deviceName:
            formData.get("deviceName"),
        fallbackDeviceMode:
            formData.get(
                "fallbackDeviceMode"
            ),
        shuffle:
            formData.get("shuffle") === "on",
        startFromBeginning:
            formData.get(
                "startFromBeginning"
            ) === "on",
        autoRetryCount: 5,
        retryDelayMs: 1200,
        updatedAt: Date.now()
    });

    if (existing) {
        iosCommands = iosCommands.map(
            (item) =>
                item.id === existing.id
                    ? command
                    : item
        );
    } else {
        iosCommands = [
            command,
            ...iosCommands
        ];
    }

    saveIosCommands();

    if (
        command.id === "principal" ||
        iosCommands.length === 1
    ) {
        iosQuickPlaySettings =
            normalizeIosQuickPlaySettings(
                command
            );
        saveIosQuickPlaySettings();
    }

    editingIosCommandId = "";
    displayPlaylists(playlistsCache);
    setStatus(
        `Commande « ${command.name} » enregistrée.`
    );
}

function editIosCommand(commandId) {
    if (!getIosCommandById(commandId)) {
        return;
    }

    editingIosCommandId = commandId;
    displayPlaylists(playlistsCache);

    document
        .getElementById("iosCommandForm")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
}

function cancelIosCommandEdit() {
    editingIosCommandId = "";
    displayPlaylists(playlistsCache);
}

function duplicateIosCommand(commandId) {
    const source =
        getIosCommandById(commandId);

    if (
        !source ||
        iosCommands.length >= MAX_IOS_COMMANDS
    ) {
        return;
    }

    const duplicate =
        normalizeIosCommand({
            ...source,
            id: createIosCommandId(),
            name: `${source.name} copie`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

    iosCommands = [
        duplicate,
        ...iosCommands
    ];
    saveIosCommands();
    displayPlaylists(playlistsCache);
    setStatus(
        `Commande « ${source.name} » dupliquée.`
    );
}

function deleteIosCommand(commandId) {
    const command =
        getIosCommandById(commandId);

    if (!command) {
        return;
    }

    if (
        !window.confirm(
            `Supprimer la commande « ${command.name} » ?`
        )
    ) {
        return;
    }

    iosCommands = iosCommands.filter(
        (item) => item.id !== commandId
    );
    saveIosCommands();

    if (editingIosCommandId === commandId) {
        editingIosCommandId = "";
    }

    const principal =
        getPrincipalIosCommand();

    iosQuickPlaySettings =
        principal
            ? normalizeIosQuickPlaySettings(
                principal
            )
            : {
                ...DEFAULT_IOS_QUICKPLAY_SETTINGS
            };
    saveIosQuickPlaySettings();

    displayPlaylists(playlistsCache);
    setStatus("Commande iOS supprimée.");
}

async function copyIosCommandUrl(commandId) {
    const command =
        getIosCommandById(commandId);

    if (!command) {
        return;
    }

    const url =
        buildIosCommandUrl(command);

    try {
        await navigator.clipboard.writeText(
            url
        );
        setStatus(
            `URL de « ${command.name} » copiée.`
        );
    } catch (error) {
        window.prompt(
            "Copie cette URL dans Raccourcis :",
            url
        );
    }
}

function resolveIosCommandDevice(
    devices,
    command
) {
    const preferred =
        findAutomationDevice(
            devices,
            command
        );

    if (preferred) {
        return preferred;
    }

    const fallback = {
        ...command,
        deviceMode:
            command.fallbackDeviceMode ||
            "active"
    };

    return findAutomationDevice(
        devices,
        fallback
    );
}

function renderIosCommandsPanel() {
    const editingCommand =
        getIosCommandById(
            editingIosCommandId
        );
    const formCommand =
        editingCommand ||
        normalizeIosCommand({
            id: "",
            name: "",
            icon: "▶️",
            commandType: "fixed",
            playlistId: "",
            mixId: "",
            profileId: "",
            regenerateOnLaunch: true,
            autoplay: true,
            deviceMode: "iphone",
            fallbackDeviceMode: "active",
            shuffle: false,
            startFromBeginning: true
        });

    const mixOptions = savedMixes
        .map((mix) => `
            <option
                value="${escapeHtml(mix.id)}"
                ${mix.id === formCommand.mixId ? "selected" : ""}
            >
                ${escapeHtml(mix.name)}
            </option>
        `)
        .join("");

    const profileOptions = mixProfiles
        .map((profile) => `
            <option
                value="${escapeHtml(profile.id)}"
                ${profile.id === formCommand.profileId ? "selected" : ""}
            >
                ${escapeHtml(profile.icon)}
                ${escapeHtml(profile.name)}
            </option>
        `)
        .join("");

    const playlistOptions = playlistsCache
        .filter(
            (playlist) =>
                playlist?.id &&
                canReadPlaylist(playlist)
        )
        .map((playlist) => `
            <option
                value="${escapeHtml(playlist.id)}"
                ${playlist.id === formCommand.playlistId ? "selected" : ""}
            >
                ${escapeHtml(
                    playlist.name ||
                    "Playlist sans nom"
                )}
            </option>
        `)
        .join("");

    const cards = iosCommands
        .map((command) => {
            const lastRun =
                iosCommandHistory.find(
                    (item) =>
                        item.commandId === command.id
                );

            return `
                <article class="ios-command-card">
                    <div class="ios-command-main">
                        <span class="ios-command-icon">
                            ${escapeHtml(command.icon)}
                        </span>
                        <div>
                            <h4>
                                ${escapeHtml(command.name)}
                            </h4>
                            <p>
                                ${command.commandType === "smartmix"
                                    ? escapeHtml(
                                        savedMixes.find(
                                            (mix) => mix.id === command.mixId
                                        )?.name || "Mix indisponible"
                                    )
                                    : escapeHtml(
                                        command.playlistName ||
                                        "Playlist indisponible"
                                    )}
                            </p>
                            <small>
                                ${command.commandType === "smartmix"
                                    ? "Mix intelligent"
                                    : "Playlist fixe"}
                                · ${command.deviceMode === "iphone"
                                    ? "iPhone prioritaire"
                                    : command.deviceMode === "named"
                                        ? `Appareil : ${escapeHtml(command.deviceName || "nom à définir")}`
                                        : command.deviceMode === "active"
                                            ? "Appareil actif"
                                            : "Premier appareil"}
                                · ${command.shuffle
                                    ? "shuffle activé"
                                    : "ordre normal"}
                                ${lastRun
                                    ? ` · dernier : ${escapeHtml(lastRun.deviceName || lastRun.status)}`
                                    : ""}
                            </small>
                        </div>
                    </div>

                    <div class="ios-command-actions">
                        <button
                            type="button"
                            data-ios-command-action="run"
                            data-ios-command-id="${escapeHtml(command.id)}"
                        >
                            ▶ Tester
                        </button>
                        <button
                            type="button"
                            data-ios-command-action="copy"
                            data-ios-command-id="${escapeHtml(command.id)}"
                            title="Copier l’URL"
                        >
                            🔗
                        </button>
                        <button
                            type="button"
                            data-ios-command-action="edit"
                            data-ios-command-id="${escapeHtml(command.id)}"
                            title="Modifier"
                        >
                            ✏️
                        </button>
                        <button
                            type="button"
                            data-ios-command-action="duplicate"
                            data-ios-command-id="${escapeHtml(command.id)}"
                            title="Dupliquer"
                        >
                            📄
                        </button>
                        <button
                            type="button"
                            data-ios-command-action="delete"
                            data-ios-command-id="${escapeHtml(command.id)}"
                            title="Supprimer"
                        >
                            🗑️
                        </button>
                    </div>
                </article>
            `;
        })
        .join("");

    return `
        <section class="ios-commands-panel">
            <div class="ios-commands-heading">
                <div>
                    <h3>Centre de commandes iOS</h3>
                    <p>
                        ${iosCommands.length}/${MAX_IOS_COMMANDS}
                        raccourci(s) configuré(s)
                    </p>
                </div>
                <span>v3.2</span>
            </div>

            <form
                id="iosCommandForm"
                class="ios-command-form"
            >
                <label class="ios-command-field">
                    <span>Nom du raccourci</span>
                    <input
                        name="name"
                        type="text"
                        maxlength="80"
                        value="${escapeHtml(formCommand.name)}"
                        placeholder="Ex. Playlist voiture"
                        required
                    >
                </label>

                <label class="ios-command-field">
                    <span>Icône</span>
                    <input
                        name="icon"
                        type="text"
                        maxlength="8"
                        value="${escapeHtml(formCommand.icon)}"
                    >
                </label>

                <label class="ios-command-field">
                    <span>Type de raccourci</span>
                    <select
                        name="commandType"
                        data-ios-command-type
                    >
                        <option value="fixed" ${formCommand.commandType === "fixed" ? "selected" : ""}>
                            Playlist fixe
                        </option>
                        <option value="smartmix" ${formCommand.commandType === "smartmix" ? "selected" : ""}>
                            Mix intelligent
                        </option>
                    </select>
                </label>

                <label
                    class="ios-command-field"
                    data-ios-fixed-field
                    ${formCommand.commandType === "smartmix" ? "hidden" : ""}
                >
                    <span>Playlist</span>
                    <select
                        name="playlistId"
                        ${formCommand.commandType === "smartmix" ? "" : "required"}
                    >
                        <option value="">
                            Choisir une playlist
                        </option>
                        ${playlistOptions}
                    </select>
                </label>

                <label
                    class="ios-command-field"
                    data-ios-smartmix-field
                    ${formCommand.commandType === "smartmix" ? "" : "hidden"}
                >
                    <span>Mix enregistré</span>
                    <select
                        name="mixId"
                        ${formCommand.commandType === "smartmix" ? "required" : ""}
                    >
                        <option value="">Choisir un mix</option>
                        ${mixOptions}
                    </select>
                </label>

                <label
                    class="ios-command-field"
                    data-ios-smartmix-field
                    ${formCommand.commandType === "smartmix" ? "" : "hidden"}
                >
                    <span>Profil appliqué</span>
                    <select name="profileId">
                        <option value="">Réglages du mix</option>
                        ${profileOptions}
                    </select>
                </label>

                <label
                    class="ios-command-check"
                    data-ios-smartmix-field
                    ${formCommand.commandType === "smartmix" ? "" : "hidden"}
                >
                    <input
                        name="regenerateOnLaunch"
                        type="checkbox"
                        ${formCommand.regenerateOnLaunch ? "checked" : ""}
                    >
                    <span>Générer un nouvel ordre à chaque lancement</span>
                </label>

                <label
                    class="ios-command-check"
                    data-ios-smartmix-field
                    ${formCommand.commandType === "smartmix" ? "" : "hidden"}
                >
                    <input
                        name="autoplay"
                        type="checkbox"
                        ${formCommand.autoplay ? "checked" : ""}
                    >
                    <span>Lancer automatiquement après génération</span>
                </label>

                <label class="ios-command-field">
                    <span>Appareil prioritaire</span>
                    <select name="deviceMode">
                        <option value="iphone" ${formCommand.deviceMode === "iphone" ? "selected" : ""}>
                            iPhone ou smartphone
                        </option>
                        <option value="active" ${formCommand.deviceMode === "active" ? "selected" : ""}>
                            Appareil actif
                        </option>
                        <option value="first" ${formCommand.deviceMode === "first" ? "selected" : ""}>
                            Premier disponible
                        </option>
                        <option value="named" ${formCommand.deviceMode === "named" ? "selected" : ""}>
                            Nom précis
                        </option>
                    </select>
                </label>

                <label class="ios-command-field">
                    <span>Nom précis de l’appareil</span>
                    <input
                        name="deviceName"
                        type="text"
                        maxlength="120"
                        value="${escapeHtml(formCommand.deviceName)}"
                        placeholder="Ex. iPhone de Max"
                    >
                </label>

                <label class="ios-command-field">
                    <span>Appareil de secours</span>
                    <select name="fallbackDeviceMode">
                        <option value="active" ${formCommand.fallbackDeviceMode === "active" ? "selected" : ""}>
                            Appareil actif
                        </option>
                        <option value="iphone" ${formCommand.fallbackDeviceMode === "iphone" ? "selected" : ""}>
                            iPhone
                        </option>
                        <option value="first" ${formCommand.fallbackDeviceMode === "first" ? "selected" : ""}>
                            Premier disponible
                        </option>
                    </select>
                </label>

                <label class="ios-command-check">
                    <input
                        name="shuffle"
                        type="checkbox"
                        ${formCommand.shuffle ? "checked" : ""}
                    >
                    <span>Activer le shuffle Spotify</span>
                </label>

                <label class="ios-command-check">
                    <input
                        name="startFromBeginning"
                        type="checkbox"
                        ${formCommand.startFromBeginning ? "checked" : ""}
                    >
                    <span>Recommencer au premier morceau</span>
                </label>

                <div class="ios-command-form-actions">
                    ${editingCommand
                        ? `
                            <button
                                id="cancelIosCommandEditButton"
                                class="ios-command-secondary"
                                type="button"
                            >
                                Annuler
                            </button>
                        `
                        : ""}
                    <button
                        class="ios-command-save"
                        type="submit"
                    >
                        ${editingCommand
                            ? "Enregistrer les modifications"
                            : "+ Ajouter un raccourci"}
                    </button>
                </div>
            </form>

            <div class="ios-commands-list">
                ${cards || `
                    <div class="ios-command-empty">
                        Aucun raccourci configuré.
                    </div>
                `}
            </div>

            <details class="ios-command-history">
                <summary>
                    Historique des lancements ·
                    ${iosCommandHistory.length}
                </summary>
                <div>
                    ${iosCommandHistory
                        .slice(0, 12)
                        .map((item) => `
                            <p>
                                <strong>
                                    ${escapeHtml(item.commandName)}
                                </strong>
                                · ${escapeHtml(item.deviceName || "aucun appareil")}
                                · ${item.status === "success" ? "réussi" : "échec"}
                            </p>
                        `)
                        .join("") ||
                        "<p>Aucun lancement enregistré.</p>"}
                </div>
            </details>
        </section>
    `;
}

function normalizeAutomationCommand(command = {}) {
    const action =
        typeof command.action === "string"
            ? command.action.toLowerCase()
            : "";

    return {
        action,
        playlistId:
            typeof command.playlistId === "string"
                ? command.playlistId
                    .replace(
                        /^spotify:playlist:/,
                        ""
                    )
                    .trim()
                    .slice(0, 120)
                : "",
        commandId:
            typeof command.commandId === "string"
                ? command.commandId.slice(0, 120)
                : "",
        mixId:
            typeof command.mixId === "string"
                ? command.mixId.slice(0, 120)
                : "",
        profileId:
            typeof command.profileId === "string"
                ? command.profileId.slice(0, 120)
                : "",
        contextId:
            typeof command.contextId === "string"
                ? command.contextId.slice(0, 40)
                : "",
        autoplay:
            command.autoplay !== false,
        createdAt: Number(
            command.createdAt || Date.now()
        )
    };
}

function readPendingAutomationCommand() {
    try {
        const raw = sessionStorage.getItem(
            PENDING_AUTOMATION_KEY
        );

        return raw
            ? normalizeAutomationCommand(
                JSON.parse(raw)
            )
            : null;
    } catch (error) {
        return null;
    }
}

function savePendingAutomationCommand(command) {
    pendingAutomationCommand =
        command
            ? normalizeAutomationCommand(command)
            : null;

    try {
        if (pendingAutomationCommand) {
            sessionStorage.setItem(
                PENDING_AUTOMATION_KEY,
                JSON.stringify(
                    pendingAutomationCommand
                )
            );
        } else {
            sessionStorage.removeItem(
                PENDING_AUTOMATION_KEY
            );
        }
    } catch (error) {
        console.warn(
            "Commande d’automatisation non mémorisée :",
            error
        );
    }
}

function parseAutomationCommandFromUrl() {
    const params = new URLSearchParams(
        window.location.search
    );
    const action =
        String(params.get("action") || "")
            .toLowerCase();

    if (!action) {
        return null;
    }

    return normalizeAutomationCommand({
        action,
        playlistId:
            params.get("playlist") ||
            params.get("playlistId") ||
            "",
        commandId:
            params.get("command") ||
            params.get("commandId") ||
            "",
        mixId:
            params.get("mix") ||
            params.get("mixId") ||
            "",
        profileId:
            params.get("profile") ||
            params.get("profileId") ||
            "",
        contextId:
            params.get("context") ||
            params.get("mood") ||
            "",
        autoplay:
            params.get("autoplay") !== "0",
        createdAt: Date.now()
    });
}

function clearAutomationQueryString() {
    const url = new URL(
        window.location.href
    );

    for (const key of [
        "action",
        "playlist",
        "playlistId",
        "command",
        "commandId",
        "mix",
        "mixId",
        "profile",
        "profileId",
        "context",
        "mood",
        "autoplay"
    ]) {
        url.searchParams.delete(key);
    }

    window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}${url.hash}`
    );
}

function buildIosQuickPlayUrl() {
    return buildIosCommandUrl(
        getPrincipalIosCommand() ||
        normalizeIosCommand({
            id: "principal",
            name: "Playlist principale",
            ...iosQuickPlaySettings
        })
    );
}

function getIosQuickPlayPlaylist() {
    return playlistsCache.find(
        (playlist) =>
            playlist.id ===
            iosQuickPlaySettings.playlistId
    ) || null;
}

function findAutomationDevice(
    devices,
    settings = iosQuickPlaySettings
) {
    const controllableDevices = devices.filter(
        (device) =>
            device &&
            device.id &&
            device.is_restricted !== true
    );

    if (!controllableDevices.length) {
        return null;
    }

    if (
        settings.deviceMode === "named" &&
        settings.deviceName
    ) {
        const wanted =
            normalizeSearchText(
                settings.deviceName
            );

        const named = controllableDevices.find(
            (device) =>
                normalizeSearchText(
                    device.name
                ).includes(wanted)
        );

        if (named) {
            return named;
        }
    }

    if (settings.deviceMode === "iphone") {
        const iphone = controllableDevices.find(
            (device) => {
                const name =
                    normalizeSearchText(
                        device.name
                    );
                const type =
                    normalizeSearchText(
                        device.type
                    );

                return (
                    name.includes("iphone") ||
                    type === "smartphone"
                );
            }
        );

        if (iphone) {
            return iphone;
        }
    }

    if (
        settings.deviceMode === "active" ||
        settings.deviceMode === "iphone"
    ) {
        const active = controllableDevices.find(
            (device) => device.is_active
        );

        if (active) {
            return active;
        }
    }

    return controllableDevices[0];
}

async function getAutomationDeviceWithRetry(
    settings = iosQuickPlaySettings
) {
    let lastDevices = [];

    for (
        let attempt = 1;
        attempt <= settings.autoRetryCount;
        attempt += 1
    ) {
        try {
            lastDevices =
                await getAvailableDevices();
            availableDevices = lastDevices;

            if (
                lastDevices.length &&
                lastDevices.every(
                    (device) =>
                        device.is_restricted === true
                )
            ) {
                throw new Error(
                    "Spotify détecte l’appareil, mais interdit son contrôle à distance."
                );
            }

            const device =
                settings.fallbackDeviceMode
                    ? resolveIosCommandDevice(
                        lastDevices,
                        settings
                    )
                    : findAutomationDevice(
                        lastDevices,
                        settings
                    );

            if (device) {
                return device;
            }
        } catch (error) {
            console.warn(
                `Recherche appareil ${attempt}/${settings.autoRetryCount} :`,
                error
            );
        }

        if (
            attempt <
            settings.autoRetryCount
        ) {
            setStatus(
                `Recherche de l’iPhone… ${attempt}/${settings.autoRetryCount}`
            );
            await wait(
                settings.retryDelayMs
            );
        }
    }

    return null;
}

async function startPlaylistContextPlayback(
    playlistId,
    deviceId,
    {
        shuffle = false,
        startFromBeginning = true
    } = {}
) {
    const accessToken =
        await getValidAccessToken();

    if (!accessToken) {
        throw new Error(
            "La connexion Spotify doit être renouvelée."
        );
    }

    // Le endpoint de lecture accepte directement device_id.
    // On évite ici le transfert préalable, qui peut renvoyer 403
    // alors que la lecture directe sur le même appareil est autorisée.
    const url = new URL(
        "https://api.spotify.com/v1/me/player/play"
    );
    url.searchParams.set(
        "device_id",
        deviceId
    );

    const body = {
        context_uri:
            `spotify:playlist:${playlistId}`
    };

    if (startFromBeginning) {
        body.offset = {
            position: 0
        };
        body.position_ms = 0;
    }

    const response = await fetch(
        url.toString(),
        {
            method: "PUT",
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    if (!response.ok) {
        let spotifyReason = "";

        try {
            const payload =
                await response.json();
            spotifyReason =
                payload?.error?.reason ||
                payload?.error?.message ||
                "";
        } catch (error) {
            // Réponse sans JSON.
        }

        const message =
            `Lecture Spotify refusée par /me/player/play (${response.status})` +
            (spotifyReason ? ` : ${spotifyReason}` : ".");

        if (response.status === 403) {
            throw new Error(
                `${message} Vérifie Spotify Premium, l’autorisation user-modify-playback-state et l’accès du compte à l’application.`
            );
        }

        throw new Error(message);
    }

    await wait(500);

    try {
        await setPlaybackShuffle(
            shuffle,
            deviceId
        );
    } catch (error) {
        console.warn(
            "Réglage du shuffle non appliqué :",
            error
        );
    }
}

async function runIosQuickPlay(
    playlistId = "",
    commandId = ""
) {
    if (automationRunInProgress) {
        return;
    }

    const command =
        getEffectiveIosCommand(commandId);
    const resolvedPlaylistId =
        playlistId ||
        command.playlistId;

    if (!resolvedPlaylistId) {
        setStatus(
            "Choisis d’abord la playlist fixe du raccourci iOS.",
            "error"
        );
        displayPlaylists(playlistsCache);
        return;
    }

    automationRunInProgress = true;
    setStatus(
        "Lecture immédiate iOS : recherche de l’iPhone…"
    );

    try {
        if (isKnownNonPremiumAccount()) {
            throw new Error(
                "La lecture à distance nécessite Spotify Premium."
            );
        }

        const device =
            await getAutomationDeviceWithRetry(
                command
            );

        if (!device) {
            throw new Error(
                "Aucun iPhone ou appareil Spotify disponible. Ouvre Spotify sur l’iPhone puis relance le raccourci."
            );
        }

        setStatus(
            `Lancement sur ${device.name}…`
        );

        await startPlaylistContextPlayback(
            resolvedPlaylistId,
            device.id,
            {
                shuffle:
                    command.shuffle,
                startFromBeginning:
                    command
                        .startFromBeginning
            }
        );

        savePendingAutomationCommand(null);
        clearAutomationQueryString();

        contentElement.innerHTML = `
            <section class="ios-automation-success">
                <span>▶</span>
                <h2>Playlist lancée</h2>
                <p>
                    Lecture démarrée sur
                    <strong>
                        ${escapeHtml(device.name)}
                    </strong>.
                </p>
                <button
                    id="backToPlaylists"
                    class="primary-button"
                    type="button"
                >
                    Ouvrir Shuffle+
                </button>
            </section>
        `;

        addIosCommandHistory({
            commandId: command.id,
            commandName: command.name,
            playlistName:
                command.playlistName || "",
            deviceName: device.name,
            status: "success",
            message: "Lecture démarrée"
        });

        setStatus(
            `Playlist lancée sur ${device.name}.`
        );
    } catch (error) {
        console.error(error);
        savePendingAutomationCommand(null);

        contentElement.innerHTML = `
            <section class="ios-automation-error">
                <span>⚠️</span>
                <h2>Lecture automatique impossible</h2>
                <p>
                    ${escapeHtml(
                        error.message ||
                        "Une erreur est survenue."
                    )}
                </p>
                <button
                    id="retryIosQuickPlayButton"
                    class="primary-button"
                    type="button"
                >
                    Réessayer
                </button>
                <button
                    id="backToPlaylists"
                    class="secondary-button"
                    type="button"
                >
                    Ouvrir Shuffle+
                </button>
            </section>
        `;

        addIosCommandHistory({
            commandId: command.id,
            commandName: command.name,
            playlistName:
                command.playlistName || "",
            deviceName: "",
            status: "error",
            message:
                error.message ||
                "Lecture automatique impossible."
        });

        setStatus(
            error.message ||
            "Lecture automatique impossible.",
            "error"
        );
    } finally {
        automationRunInProgress = false;
    }
}

async function executeAutomationCommand(
    command
) {
    if (
        !command ||
        automationRunInProgress
    ) {
        return;
    }

    const normalized =
        normalizeAutomationCommand(command);

    if (
        normalized.action === "quickplay" ||
        normalized.action ===
            "play-playlist"
    ) {
        await runIosQuickPlay(
            normalized.playlistId,
            normalized.commandId
        );
        return;
    }

    if (
        normalized.action === "adaptive"
    ) {
        await runAdaptiveDj({
            forcedSlotId:
                normalized.contextId,
            autoplay:
                normalized.autoplay
        });

        savePendingAutomationCommand(null);
        clearAutomationQueryString();
        return;
    }

    if (
        normalized.action === "smartmix"
    ) {
        const command =
            getEffectiveIosCommand(
                normalized.commandId
            );

        if (
            command.commandType !== "smartmix" ||
            !command.mixId
        ) {
            throw new Error(
                "La commande de mix intelligent est incomplète."
            );
        }

        const profile =
            command.profileId
                ? getProfileById(
                    command.profileId
                )
                : null;

        if (profile) {
            applyMixProfile(
                profile.id,
                {
                    persist: false,
                    rerender: false
                }
            );
        }

        const prepared =
            await launchSavedMix(
                command.mixId
            );

        if (!prepared) {
            throw new Error(
                "Le mix intelligent n’a pas pu être préparé."
            );
        }

        recordAdaptiveLearningObservation({
            mixId: command.mixId,
            source: "ios"
        });

        if (
            command.autoplay &&
            selectedTracks.length
        ) {
            const device =
                await getAutomationDeviceWithRetry(
                    command
                );

            if (!device) {
                throw new Error(
                    "Aucun appareil Spotify disponible pour lancer le mix."
                );
            }

            const playbackUris =
                selectedTracks
                    .slice(
                        0,
                        MAX_DIRECT_PLAYBACK_TRACKS
                    )
                    .map(
                        (track) => track?.uri
                    )
                    .filter(Boolean);

            if (!playbackUris.length) {
                throw new Error(
                    "Le mix généré ne contient aucun morceau lisible."
                );
            }

            await startPlayback(
                playbackUris,
                device.id
            );

            try {
                await setPlaybackShuffle(
                    false,
                    device.id
                );
            } catch (shuffleError) {
                console.warn(
                    "Impossible de désactiver le shuffle Spotify :",
                    shuffleError
                );
            }

            rememberPlaybackOrder(
                selectedTracks.slice(
                    0,
                    playbackUris.length
                )
            );

            addIosCommandHistory({
                commandId: command.id,
                commandName: command.name,
                playlistName:
                    savedMixes.find(
                        (mix) =>
                            mix.id === command.mixId
                    )?.name || "Mix intelligent",
                deviceName: device.name,
                status: "success",
                message:
                    `${playbackUris.length} titres générés et lancés`
            });

            setStatus(
                `Mix « ${command.name} » lancé sur ${device.name}.`
            );
        } else {
            setStatus(
                `Mix « ${command.name} » généré.`
            );
        }

        savePendingAutomationCommand(null);
        clearAutomationQueryString();
        return;
    }

    if (
        normalized.action === "launch" &&
        normalized.mixId
    ) {
        const prepared =
            await launchSavedMix(
                normalized.mixId
            );

        if (!prepared) {
            throw new Error(
                "Le mix demandé n’a pas pu être préparé."
            );
        }

        recordAdaptiveLearningObservation({
            mixId: normalized.mixId,
            source: "ios"
        });

        if (normalized.autoplay) {
            const device =
                await getAutomationDeviceWithRetry(
                    iosQuickPlaySettings
                );

            if (
                device &&
                selectedTracks.length
            ) {
                await startPlayback(
                    selectedTracks
                        .slice(
                            0,
                            MAX_DIRECT_PLAYBACK_TRACKS
                        )
                        .map(
                            (track) => track?.uri
                        )
                        .filter(Boolean),
                    device.id
                );
            }
        }

        savePendingAutomationCommand(null);
        clearAutomationQueryString();
    }
}

function renderIosQuickPlayPanel() {
    const settings =
        normalizeIosQuickPlaySettings(
            iosQuickPlaySettings
        );
    const playlistOptions = playlistsCache
        .filter(
            (playlist) =>
                playlist?.id &&
                canReadPlaylist(playlist)
        )
        .map((playlist) => `
            <option
                value="${escapeHtml(playlist.id)}"
                ${playlist.id === settings.playlistId ? "selected" : ""}
            >
                ${escapeHtml(
                    playlist.name ||
                    "Playlist sans nom"
                )}
            </option>
        `)
        .join("");

    return `
        <section class="ios-quickplay-panel">
            <div class="ios-quickplay-heading">
                <div>
                    <h3>Lecture immédiate iOS</h3>
                    <p>
                        Une pression sur le raccourci lance
                        toujours la playlist choisie.
                    </p>
                </div>
                <span>v3.0</span>
            </div>

            <form
                id="iosQuickPlayForm"
                class="ios-quickplay-form"
            >
                <label class="ios-quickplay-field">
                    <span>Playlist fixe</span>
                    <select
                        name="playlistId"
                        required
                    >
                        <option value="">
                            Choisir une playlist
                        </option>
                        ${playlistOptions}
                    </select>
                </label>

                <label class="ios-quickplay-field">
                    <span>Appareil à privilégier</span>
                    <select name="deviceMode">
                        <option value="iphone" ${settings.deviceMode === "iphone" ? "selected" : ""}>
                            iPhone ou smartphone
                        </option>
                        <option value="active" ${settings.deviceMode === "active" ? "selected" : ""}>
                            Appareil Spotify actif
                        </option>
                        <option value="first" ${settings.deviceMode === "first" ? "selected" : ""}>
                            Premier appareil disponible
                        </option>
                        <option value="named" ${settings.deviceMode === "named" ? "selected" : ""}>
                            Appareil portant un nom précis
                        </option>
                    </select>
                </label>

                <label class="ios-quickplay-field">
                    <span>Nom de l’appareil, facultatif</span>
                    <input
                        name="deviceName"
                        type="text"
                        maxlength="120"
                        value="${escapeHtml(settings.deviceName)}"
                        placeholder="Ex. iPhone de Max"
                    >
                </label>

                <label class="ios-quickplay-check">
                    <input
                        name="shuffle"
                        type="checkbox"
                        ${settings.shuffle ? "checked" : ""}
                    >
                    <span>Activer le shuffle Spotify</span>
                </label>

                <label class="ios-quickplay-check">
                    <input
                        name="startFromBeginning"
                        type="checkbox"
                        ${settings.startFromBeginning ? "checked" : ""}
                    >
                    <span>
                        Recommencer au premier morceau
                    </span>
                </label>

                <div class="ios-quickplay-actions">
                    <button
                        class="ios-quickplay-save"
                        type="submit"
                    >
                        Enregistrer
                    </button>
                    <button
                        id="testIosQuickPlayButton"
                        class="ios-quickplay-test"
                        type="button"
                        ${settings.playlistId ? "" : "disabled"}
                    >
                        ▶ Tester maintenant
                    </button>
                    <button
                        id="copyIosShortcutUrlButton"
                        class="ios-quickplay-copy"
                        type="button"
                        ${settings.playlistId ? "" : "disabled"}
                    >
                        Copier l’URL du raccourci
                    </button>
                </div>
            </form>

            <div class="ios-shortcut-instructions">
                <strong>Raccourci iOS à créer</strong>
                <span>
                    1. Ouvrir l’app Spotify ·
                    2. Attendre 1 seconde ·
                    3. Ouvrir l’URL copiée
                </span>
                <code>
                    ${escapeHtml(
                        buildIosQuickPlayUrl()
                    )}
                </code>
            </div>
        </section>
    `;
}

function saveIosQuickPlayFromForm(form) {
    const formData = new FormData(form);
    const playlistId =
        String(
            formData.get("playlistId") || ""
        );
    const playlist = playlistsCache.find(
        (item) => item.id === playlistId
    );

    iosQuickPlaySettings =
        normalizeIosQuickPlaySettings({
            playlistId,
            playlistName:
                playlist?.name || "",
            deviceMode:
                formData.get("deviceMode"),
            deviceName:
                formData.get("deviceName"),
            shuffle:
                formData.get("shuffle") === "on",
            startFromBeginning:
                formData.get(
                    "startFromBeginning"
                ) === "on",
            autoRetryCount:
                iosQuickPlaySettings.autoRetryCount,
            retryDelayMs:
                iosQuickPlaySettings.retryDelayMs
        });

    saveIosQuickPlaySettings();
    displayPlaylists(playlistsCache);
    setStatus(
        `Raccourci iOS configuré pour « ${playlist?.name || "la playlist"} ».`
    );
}

async function copyIosQuickPlayUrl() {
    const url = buildIosQuickPlayUrl();

    try {
        await navigator.clipboard.writeText(
            url
        );
        setStatus(
            "URL du raccourci iOS copiée."
        );
    } catch (error) {
        window.prompt(
            "Copie cette URL dans ton raccourci iOS :",
            url
        );
    }
}

function normalizeScheduleDays(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(
        values
            .map((value) => Number(value))
            .filter((value) =>
                Number.isInteger(value) &&
                value >= 0 &&
                value <= 6
            )
    )].sort((first, second) => first - second);
}

function normalizeMixSchedule(schedule = {}) {
    const recurrence =
        schedule.recurrence === "weekly"
            ? "weekly"
            : "once";

    return {
        id:
            typeof schedule.id === "string" &&
            schedule.id.trim()
                ? schedule.id.trim().slice(0, 120)
                : createSavedMixId(),
        name:
            typeof schedule.name === "string" &&
            schedule.name.trim()
                ? schedule.name.trim().slice(0, 80)
                : "Programmation Shuffle+",
        mixId:
            typeof schedule.mixId === "string"
                ? schedule.mixId
                : "",
        profileId:
            typeof schedule.profileId === "string"
                ? schedule.profileId
                : "",
        deviceId:
            typeof schedule.deviceId === "string"
                ? schedule.deviceId
                : "",
        deviceName:
            typeof schedule.deviceName === "string"
                ? schedule.deviceName.slice(0, 100)
                : "",
        recurrence,
        dateTime:
            typeof schedule.dateTime === "string"
                ? schedule.dateTime
                : "",
        time:
            /^\d{2}:\d{2}$/.test(schedule.time || "")
                ? schedule.time
                : "18:00",
        weekdays: normalizeScheduleDays(
            schedule.weekdays
        ),
        enabled: schedule.enabled !== false,
        autoPlay: schedule.autoPlay !== false,
        createdAt: Number(
            schedule.createdAt || Date.now()
        ),
        updatedAt: Number(
            schedule.updatedAt || Date.now()
        ),
        lastRunKey:
            typeof schedule.lastRunKey === "string"
                ? schedule.lastRunKey
                : "",
        lastRunAt: Number(schedule.lastRunAt || 0),
        lastResult:
            typeof schedule.lastResult === "string"
                ? schedule.lastResult.slice(0, 240)
                : ""
    };
}

function readMixSchedules() {
    try {
        const raw = localStorage.getItem(
            MIX_SCHEDULES_KEY
        );
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((schedule) =>
                normalizeMixSchedule(schedule)
            )
            .filter((schedule) => schedule.mixId)
            .slice(0, MAX_MIX_SCHEDULES);
    } catch (error) {
        console.warn(
            "Programmations illisibles :",
            error
        );
        return [];
    }
}

function saveMixSchedules() {
    try {
        localStorage.setItem(
            MIX_SCHEDULES_KEY,
            JSON.stringify(mixSchedules)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer les programmations :",
            error
        );
    }
}

function getScheduleDayLabel(day) {
    return [
        "dimanche",
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi",
        "samedi"
    ][day] || "";
}

function formatScheduleDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date non définie";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(date);
}

function getScheduleTimingLabel(schedule) {
    if (schedule.recurrence === "weekly") {
        const days = schedule.weekdays
            .map(getScheduleDayLabel)
            .join(", ");

        return (
            `${days || "Aucun jour"} à ` +
            `${schedule.time}`
        );
    }

    return formatScheduleDateTime(
        schedule.dateTime
    );
}

function getScheduleRunKey(schedule, date = new Date()) {
    if (schedule.recurrence === "weekly") {
        const year = date.getFullYear();
        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return (
            `${schedule.id}:${year}-${month}-${day}:` +
            `${schedule.time}`
        );
    }

    return `${schedule.id}:${schedule.dateTime}`;
}

function getScheduleDueState(
    schedule,
    now = new Date()
) {
    if (!schedule.enabled) {
        return {
            due: false,
            missed: false,
            difference: 0
        };
    }

    let target = null;

    if (schedule.recurrence === "weekly") {
        if (
            !schedule.weekdays.includes(
                now.getDay()
            )
        ) {
            return {
                due: false,
                missed: false,
                difference: 0
            };
        }

        const [hours, minutes] =
            schedule.time.split(":").map(Number);

        target = new Date(now);
        target.setHours(
            hours,
            minutes,
            0,
            0
        );
    } else {
        target = new Date(schedule.dateTime);

        if (Number.isNaN(target.getTime())) {
            return {
                due: false,
                missed: false,
                difference: 0
            };
        }
    }

    const difference =
        now.getTime() - target.getTime();
    const runKey = getScheduleRunKey(
        schedule,
        target
    );

    if (schedule.lastRunKey === runKey) {
        return {
            due: false,
            missed: false,
            difference
        };
    }

    return {
        due:
            difference >= 0 &&
            difference <= SCHEDULE_GRACE_PERIOD,
        missed:
            difference > SCHEDULE_GRACE_PERIOD &&
            difference <=
                SCHEDULE_MISSED_WARNING_PERIOD,
        difference,
        runKey
    };
}

function getNextScheduleDate(schedule, now = new Date()) {
    if (!schedule.enabled) {
        return null;
    }

    if (schedule.recurrence === "once") {
        const date = new Date(schedule.dateTime);

        return (
            Number.isNaN(date.getTime()) ||
            date.getTime() < now.getTime()
        )
            ? null
            : date;
    }

    const [hours, minutes] =
        schedule.time.split(":").map(Number);

    for (let offset = 0; offset < 8; offset += 1) {
        const candidate = new Date(now);
        candidate.setDate(
            now.getDate() + offset
        );
        candidate.setHours(
            hours,
            minutes,
            0,
            0
        );

        if (
            schedule.weekdays.includes(
                candidate.getDay()
            ) &&
            candidate.getTime() >= now.getTime()
        ) {
            return candidate;
        }
    }

    return null;
}

function renderMixSchedulesSection() {
    const mixOptions = savedMixes
        .map((mix) => `
            <option value="${escapeHtml(mix.id)}">
                ${escapeHtml(mix.name)}
            </option>
        `)
        .join("");

    const profileOptions = mixProfiles
        .map((profile) => `
            <option value="${escapeHtml(profile.id)}">
                ${escapeHtml(profile.icon)}
                ${escapeHtml(profile.name)}
            </option>
        `)
        .join("");

    const deviceOptions = availableDevices
        .map((device) => `
            <option
                value="${escapeHtml(device.id)}"
                data-device-name="${escapeHtml(device.name)}"
            >
                ${getDeviceIcon(device.type)}
                ${escapeHtml(device.name)}
                ${device.is_active ? " · actif" : ""}
            </option>
        `)
        .join("");

    const scheduleCards = [...mixSchedules]
        .sort((first, second) => {
            const firstDate =
                getNextScheduleDate(first)?.getTime() ||
                Number.POSITIVE_INFINITY;
            const secondDate =
                getNextScheduleDate(second)?.getTime() ||
                Number.POSITIVE_INFINITY;

            return firstDate - secondDate;
        })
        .map((schedule) => {
            const mix = savedMixes.find(
                (item) => item.id === schedule.mixId
            );
            const profile = getProfileById(
                schedule.profileId
            );
            const nextDate =
                getNextScheduleDate(schedule);

            return `
                <article
                    class="schedule-card
                    ${schedule.enabled ? "" : "is-disabled"}"
                >
                    <div class="schedule-card-main">
                        <span class="schedule-icon">
                            ${schedule.recurrence === "weekly"
                                ? "🔁"
                                : "🗓️"}
                        </span>

                        <div>
                            <h4>
                                ${escapeHtml(schedule.name)}
                            </h4>
                            <p>
                                ${escapeHtml(
                                    mix?.name ||
                                    "Mix indisponible"
                                )}
                                ${profile
                                    ? ` · Profil ${escapeHtml(profile.name)}`
                                    : ""}
                            </p>
                            <small>
                                ${escapeHtml(
                                    getScheduleTimingLabel(
                                        schedule
                                    )
                                )}
                                ${schedule.deviceName
                                    ? ` · ${escapeHtml(schedule.deviceName)}`
                                    : " · appareil automatique"}
                                ${nextDate
                                    ? ` · prochain : ${escapeHtml(formatScheduleDateTime(nextDate))}`
                                    : ""}
                            </small>

                            ${schedule.lastResult
                                ? `
                                    <span class="schedule-last-result">
                                        ${escapeHtml(schedule.lastResult)}
                                    </span>
                                `
                                : ""}
                        </div>
                    </div>

                    <div class="schedule-actions">
                        <button
                            type="button"
                            class="schedule-run-button"
                            data-schedule-action="run"
                            data-schedule-id="${escapeHtml(schedule.id)}"
                            ${mix ? "" : "disabled"}
                        >
                            ▶ Lancer maintenant
                        </button>

                        <button
                            type="button"
                            class="schedule-secondary-button"
                            data-schedule-action="toggle"
                            data-schedule-id="${escapeHtml(schedule.id)}"
                            title="${schedule.enabled ? "Désactiver" : "Activer"}"
                        >
                            ${schedule.enabled ? "⏸" : "▶"}
                        </button>

                        <button
                            type="button"
                            class="schedule-secondary-button schedule-delete-button"
                            data-schedule-action="delete"
                            data-schedule-id="${escapeHtml(schedule.id)}"
                            title="Supprimer"
                        >
                            🗑️
                        </button>
                    </div>
                </article>
            `;
        })
        .join("");

    return `
        <section class="schedules-panel">
            <div class="schedules-heading">
                <div>
                    <h3>Programmation des mix</h3>
                    <p>
                        Les lancements automatiques nécessitent que
                        Shuffle+ soit ouvert et connecté à Spotify.
                    </p>
                </div>

                <button
                    id="refreshScheduleDevicesButton"
                    class="schedule-refresh-button"
                    type="button"
                >
                    ↻ Actualiser les appareils
                </button>
            </div>

            <form
                id="mixScheduleForm"
                class="schedule-form"
            >
                <label class="schedule-field">
                    <span>Nom de la programmation</span>
                    <input
                        name="name"
                        type="text"
                        maxlength="80"
                        placeholder="Ex. Sport du soir"
                        required
                    >
                </label>

                <label class="schedule-field">
                    <span>Mix enregistré</span>
                    <select
                        name="mixId"
                        ${savedMixes.length ? "" : "disabled"}
                        required
                    >
                        <option value="">
                            Choisir un mix
                        </option>
                        ${mixOptions}
                    </select>
                </label>

                <label class="schedule-field">
                    <span>Profil appliqué</span>
                    <select name="profileId">
                        <option value="">
                            Réglages du mix
                        </option>
                        ${profileOptions}
                    </select>
                </label>

                <label class="schedule-field">
                    <span>Appareil Spotify</span>
                    <select name="deviceId">
                        <option value="">
                            Appareil actif ou premier disponible
                        </option>
                        ${deviceOptions}
                    </select>
                </label>

                <label class="schedule-field">
                    <span>Répétition</span>
                    <select
                        name="recurrence"
                        data-schedule-recurrence
                    >
                        <option value="once">
                            Une seule fois
                        </option>
                        <option value="weekly">
                            Chaque semaine
                        </option>
                    </select>
                </label>

                <label
                    class="schedule-field"
                    data-schedule-once-field
                >
                    <span>Date et heure</span>
                    <input
                        name="dateTime"
                        type="datetime-local"
                    >
                </label>

                <label
                    class="schedule-field"
                    data-schedule-weekly-field
                    hidden
                >
                    <span>Heure</span>
                    <input
                        name="time"
                        type="time"
                        value="18:00"
                    >
                </label>

                <fieldset
                    class="schedule-weekdays"
                    data-schedule-weekly-field
                    hidden
                >
                    <legend>Jours de la semaine</legend>
                    ${[
                        [1, "Lun"],
                        [2, "Mar"],
                        [3, "Mer"],
                        [4, "Jeu"],
                        [5, "Ven"],
                        [6, "Sam"],
                        [0, "Dim"]
                    ].map(([value, label]) => `
                        <label>
                            <input
                                type="checkbox"
                                name="weekdays"
                                value="${value}"
                            >
                            <span>${label}</span>
                        </label>
                    `).join("")}
                </fieldset>

                <label class="schedule-auto-play">
                    <input
                        name="autoPlay"
                        type="checkbox"
                        checked
                    >
                    <span>
                        Lancer automatiquement le premier
                        bloc de 100 titres
                    </span>
                </label>

                <div class="schedule-form-actions">
                    <button
                        class="schedule-create-button"
                        type="submit"
                        ${savedMixes.length ? "" : "disabled"}
                    >
                        + Ajouter la programmation
                    </button>
                </div>
            </form>

            ${savedMixes.length
                ? ""
                : `
                    <p class="schedule-warning">
                        Enregistre d’abord un mix pour pouvoir
                        le programmer.
                    </p>
                `}

            <div class="schedule-list">
                ${scheduleCards || `
                    <div class="schedule-empty">
                        Aucune programmation enregistrée.
                    </div>
                `}
            </div>
        </section>
    `;
}

function createMixScheduleFromForm(form) {
    if (mixSchedules.length >= MAX_MIX_SCHEDULES) {
        setStatus(
            `Tu peux créer jusqu’à ${MAX_MIX_SCHEDULES} programmations.`,
            "error"
        );
        return;
    }

    const formData = new FormData(form);
    const mixId = String(
        formData.get("mixId") || ""
    );
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        setStatus(
            "Choisis un mix enregistré valide.",
            "error"
        );
        return;
    }

    const recurrence =
        formData.get("recurrence") === "weekly"
            ? "weekly"
            : "once";
    const weekdays = formData
        .getAll("weekdays")
        .map(Number);
    const dateTime = String(
        formData.get("dateTime") || ""
    );
    const time = String(
        formData.get("time") || "18:00"
    );

    if (
        recurrence === "once" &&
        (
            !dateTime ||
            Number.isNaN(
                new Date(dateTime).getTime()
            ) ||
            new Date(dateTime).getTime() <=
                Date.now()
        )
    ) {
        setStatus(
            "Choisis une date et une heure futures.",
            "error"
        );
        return;
    }

    if (
        recurrence === "weekly" &&
        !weekdays.length
    ) {
        setStatus(
            "Choisis au moins un jour de la semaine.",
            "error"
        );
        return;
    }

    const deviceSelect = form.elements.deviceId;
    const selectedDeviceOption =
        deviceSelect?.selectedOptions?.[0];

    const schedule = normalizeMixSchedule({
        id: createSavedMixId(),
        name:
            String(formData.get("name") || "").trim() ||
            mix.name,
        mixId,
        profileId:
            String(formData.get("profileId") || ""),
        deviceId:
            String(formData.get("deviceId") || ""),
        deviceName:
            selectedDeviceOption?.dataset.deviceName ||
            "",
        recurrence,
        dateTime,
        time,
        weekdays,
        autoPlay:
            formData.get("autoPlay") === "on",
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });

    mixSchedules = [
        schedule,
        ...mixSchedules
    ].slice(0, MAX_MIX_SCHEDULES);

    saveMixSchedules();
    displayPlaylists(playlistsCache);
    setStatus(
        `Programmation « ${schedule.name} » ajoutée.`
    );
}

function toggleMixSchedule(scheduleId) {
    const schedule = mixSchedules.find(
        (item) => item.id === scheduleId
    );

    if (!schedule) {
        return;
    }

    schedule.enabled = !schedule.enabled;
    schedule.updatedAt = Date.now();
    saveMixSchedules();
    displayPlaylists(playlistsCache);
    setStatus(
        schedule.enabled
            ? "Programmation activée."
            : "Programmation désactivée."
    );
}

function deleteMixSchedule(scheduleId) {
    const schedule = mixSchedules.find(
        (item) => item.id === scheduleId
    );

    if (!schedule) {
        return;
    }

    const confirmed = window.confirm(
        `Supprimer la programmation « ${schedule.name} » ?`
    );

    if (!confirmed) {
        return;
    }

    mixSchedules = mixSchedules.filter(
        (item) => item.id !== scheduleId
    );
    saveMixSchedules();
    displayPlaylists(playlistsCache);
    setStatus("Programmation supprimée.");
}

async function refreshScheduleDevices() {
    setStatus(
        "Recherche des appareils Spotify…"
    );

    try {
        availableDevices =
            await getAvailableDevices();
        displayPlaylists(playlistsCache);

        setStatus(
            availableDevices.length
                ? `${availableDevices.length} appareil` +
                    `${availableDevices.length > 1 ? "s" : ""}` +
                    ` Spotify disponible` +
                    `${availableDevices.length > 1 ? "s" : ""}.`
                : "Aucun appareil Spotify disponible."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            "Impossible de charger les appareils Spotify.",
            "error"
        );
    }
}

async function resolveScheduledDevice(schedule) {
    const devices = await getAvailableDevices();

    availableDevices = devices;

    if (!devices.length) {
        throw new Error(
            "Aucun appareil Spotify disponible. " +
            "Ouvre Spotify et lance ou mets en pause un morceau."
        );
    }

    const controllableDevices = devices.filter(
        (device) =>
            device.is_restricted !== true
    );

    if (!controllableDevices.length) {
        throw new Error(
            "Les appareils Spotify détectés refusent le contrôle à distance."
        );
    }

    return (
        controllableDevices.find(
            (device) =>
                device.id === schedule.deviceId
        ) ||
        controllableDevices.find(
            (device) =>
                schedule.deviceName &&
                device.name === schedule.deviceName
        ) ||
        controllableDevices.find((device) => device.is_active) ||
        controllableDevices[0]
    );
}

async function playScheduledCurrentMix(schedule) {
    if (!schedule.autoPlay) {
        return;
    }

    const device = await resolveScheduledDevice(
        schedule
    );
    const playbackUris = selectedTracks
        .slice(0, MAX_DIRECT_PLAYBACK_TRACKS)
        .map((track) => track?.uri)
        .filter(Boolean);

    if (!playbackUris.length) {
        throw new Error(
            "Le mix programmé ne contient aucun morceau lisible."
        );
    }

    await transferPlayback(device.id, false);
    await wait(800);
    await startPlayback(
        playbackUris,
        device.id
    );
    await wait(600);

    try {
        await setPlaybackShuffle(
            false,
            device.id
        );
    } catch (error) {
        console.warn(
            "Impossible de désactiver le shuffle Spotify :",
            error
        );
    }

    playbackQueueCursor =
        playbackUris.length;
    saveCurrentPlaybackQueueState();
    rememberPlaybackOrder(
        selectedTracks.slice(
            0,
            playbackUris.length
        )
    );
    addTracksSentToHistory(
        playbackUris.length,
        selectedTracks.slice(
            0,
            playbackUris.length
        ),
        "schedule",
        device.name
    );
}

async function runMixSchedule(
    scheduleId,
    {
        automatic = false,
        runKey = ""
    } = {}
) {
    if (scheduleRunInProgress) {
        return;
    }

    const schedule = mixSchedules.find(
        (item) => item.id === scheduleId
    );
    const mix = savedMixes.find(
        (item) => item.id === schedule?.mixId
    );

    if (!schedule || !mix) {
        setStatus(
            "Le mix associé à cette programmation est indisponible.",
            "error"
        );
        return;
    }

    scheduleRunInProgress = true;
    schedule.lastResult =
        automatic
            ? "Lancement automatique en cours…"
            : "Lancement manuel en cours…";
    saveMixSchedules();

    try {
        if (schedule.profileId) {
            const profile = getProfileById(
                schedule.profileId
            );

            if (profile) {
                applyMixProfile(
                    profile.id,
                    {
                        persist: false,
                        rerender: false
                    }
                );
            }
        }

        pendingScheduledPlayback = schedule;
        await launchSavedMix(mix.id);

        if (pendingScheduledPlayback) {
            await playScheduledCurrentMix(schedule);
            pendingScheduledPlayback = null;
        }

        const completedAt = Date.now();
        schedule.lastRunAt = completedAt;
        schedule.lastRunKey =
            runKey ||
            getScheduleRunKey(
                schedule,
                new Date(completedAt)
            );
        schedule.lastResult =
            schedule.autoPlay
                ? "Mix lancé automatiquement avec succès."
                : "Mix préparé avec succès.";

        if (schedule.recurrence === "once") {
            schedule.enabled = false;
        }

        saveMixSchedules();
        setStatus(
            `Programmation « ${schedule.name} » exécutée.`
        );
    } catch (error) {
        console.error(error);
        pendingScheduledPlayback = null;
        schedule.lastResult =
            error.message ||
            "Échec du lancement programmé.";
        saveMixSchedules();

        setStatus(
            `Programmation « ${schedule.name} » : ` +
            `${schedule.lastResult}`,
            "error"
        );
    } finally {
        scheduleRunInProgress = false;
    }
}

async function checkDueMixSchedules() {
    if (
        scheduleRunInProgress ||
        !currentUserId
    ) {
        return;
    }

    const now = new Date();

    for (const schedule of mixSchedules) {
        const state = getScheduleDueState(
            schedule,
            now
        );

        if (state.due) {
            await runMixSchedule(
                schedule.id,
                {
                    automatic: true,
                    runKey: state.runKey
                }
            );
            break;
        }

        if (
            state.missed &&
            !schedule.lastResult.startsWith(
                "Programmation manquée"
            )
        ) {
            schedule.lastResult =
                "Programmation manquée pendant que Shuffle+ était fermé.";
            saveMixSchedules();

            setStatus(
                `Programmation manquée : « ${schedule.name} ».`,
                "error"
            );
        }
    }
}

function startScheduleWatcher() {
    if (scheduleCheckTimer) {
        window.clearInterval(
            scheduleCheckTimer
        );
    }

    scheduleCheckTimer = window.setInterval(
        () => {
            checkDueMixSchedules().catch(
                (error) =>
                    console.error(
                        "Vérification des programmations :",
                        error
                    )
            );
        },
        SCHEDULE_CHECK_INTERVAL
    );

    checkDueMixSchedules().catch(
        (error) =>
            console.error(
                "Vérification initiale des programmations :",
                error
            )
    );
}




function normalizeCleanupSettings(settings = {}) {
    const levels = new Set([
        "prudent",
        "normal",
        "strict"
    ]);

    return {
        enabled: settings.enabled !== false,
        level: levels.has(settings.level)
            ? settings.level
            : "normal",
        keepRemix: settings.keepRemix !== false,
        keepLive: settings.keepLive !== false,
        preferOriginal:
            settings.preferOriginal !== false,
        removeUnavailable:
            settings.removeUnavailable !== false
    };
}

function readCleanupSettings() {
    try {
        const raw = localStorage.getItem(
            CLEANUP_SETTINGS_KEY
        );
        const parsed = raw ? JSON.parse(raw) : {};

        return normalizeCleanupSettings(parsed);
    } catch (error) {
        console.warn(
            "Réglages de nettoyage illisibles :",
            error
        );
        return {
            ...DEFAULT_CLEANUP_SETTINGS
        };
    }
}

function saveCleanupSettings() {
    try {
        localStorage.setItem(
            CLEANUP_SETTINGS_KEY,
            JSON.stringify(currentCleanupSettings)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer le nettoyage :",
            error
        );
    }
}

function getCleanupLevelLabel(level = "normal") {
    switch (level) {
        case "prudent":
            return "Prudent";
        case "strict":
            return "Strict";
        case "normal":
        default:
            return "Normal";
    }
}

function getTrackVariantType(track) {
    const value = normalizeSearchText([
        track?.name,
        track?.album?.name
    ].filter(Boolean).join(" "));

    if (/\blive\b|concert|en public/.test(value)) {
        return "live";
    }

    if (/\bremix\b|\brework\b|\bmix\b/.test(value)) {
        return "remix";
    }

    if (/\bradio edit\b|\bedit\b/.test(value)) {
        return "edit";
    }

    if (/\bremaster(?:ed)?\b|\banniversary\b/.test(value)) {
        return "remaster";
    }

    if (/\binstrumental\b/.test(value)) {
        return "instrumental";
    }

    return "original";
}

function getCleanupBaseTitle(track, level) {
    let value = normalizeSearchText(track?.name || "");

    if (level === "prudent") {
        return value;
    }

    value = value
        .replace(/\s*[\(\[\-–—]\s*(?:remaster(?:ed)?|radio edit|edit|deluxe|anniversary|bonus track)[^\)\]]*[\)\]]?/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (level === "strict") {
        value = value
            .replace(/\s*[\(\[\-–—]\s*(?:live|concert|remix|rework|mix|instrumental)[^\)\]]*[\)\]]?/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    return value;
}

function getCleanupTrackKey(
    track,
    settings = currentCleanupSettings
) {
    const normalized =
        normalizeCleanupSettings(settings);

    if (normalized.level === "prudent") {
        return track?.uri || track?.id || "";
    }

    const artist = normalizeSearchText(
        track?.artists?.[0]?.name || ""
    );
    const title = getCleanupBaseTitle(
        track,
        normalized.level
    );
    const variant = getTrackVariantType(track);

    let variantSuffix = "";

    if (
        variant === "remix" &&
        normalized.keepRemix
    ) {
        variantSuffix = ":remix";
    } else if (
        variant === "live" &&
        normalized.keepLive
    ) {
        variantSuffix = ":live";
    }

    return `${artist}:${title}${variantSuffix}`;
}

function getCleanupTrackScore(
    track,
    settings = currentCleanupSettings
) {
    const normalized =
        normalizeCleanupSettings(settings);
    const variant = getTrackVariantType(track);
    let score = Number(track?.popularity || 0);

    if (track?.uri) {
        score += 100;
    }

    if (
        normalized.preferOriginal &&
        variant === "original"
    ) {
        score += 80;
    }

    if (variant === "remaster") {
        score += 15;
    }

    if (track?.album?.album_type === "album") {
        score += 8;
    }

    return score;
}

function mergeCleanupSources(firstTrack, secondTrack) {
    const sources = new Set([
        ...(firstTrack?.__shufflePlusSources || []),
        ...(secondTrack?.__shufflePlusSources || [])
    ]);

    return {
        ...firstTrack,
        __shufflePlusSources: [...sources]
    };
}

function cleanTracks(
    tracks,
    settings = currentCleanupSettings
) {
    const normalized =
        normalizeCleanupSettings(settings);
    const playableTracks = normalized.removeUnavailable
        ? tracks.filter((track) => track?.uri)
        : [...tracks];
    const unavailableCount =
        tracks.length - playableTracks.length;

    if (!normalized.enabled) {
        const result = {
            tracks: playableTracks,
            summary: {
                inputCount: tracks.length,
                outputCount: playableTracks.length,
                removedCount: unavailableCount,
                unavailableCount,
                exactDuplicateCount: 0,
                similarDuplicateCount: 0,
                variantsKept: 0,
                durationSavedMs: 0,
                groups: []
            }
        };
        lastCleanupSummary = result.summary;
        lastCleanupSnapshot = [...tracks];
        return result;
    }

    const selectedByKey = new Map();
    const groups = [];
    let exactDuplicateCount = 0;
    let similarDuplicateCount = 0;
    let durationSavedMs = 0;
    let variantsKept = 0;

    for (const track of playableTracks) {
        const key = getCleanupTrackKey(
            track,
            normalized
        );

        if (!key) {
            continue;
        }

        const existing = selectedByKey.get(key);

        if (!existing) {
            selectedByKey.set(key, track);
            continue;
        }

        const exact =
            (track?.uri || track?.id) ===
            (existing?.uri || existing?.id);

        if (exact) {
            exactDuplicateCount += 1;
        } else {
            similarDuplicateCount += 1;
        }

        durationSavedMs += Number(
            track?.duration_ms || 0
        );

        const existingScore = getCleanupTrackScore(
            existing,
            normalized
        );
        const candidateScore = getCleanupTrackScore(
            track,
            normalized
        );
        const kept =
            candidateScore > existingScore
                ? track
                : existing;
        const removed =
            kept === track ? existing : track;
        const merged = mergeCleanupSources(
            kept,
            removed
        );

        selectedByKey.set(key, merged);

        groups.push({
            keptName: kept?.name || "Morceau",
            removedName:
                removed?.name || "Morceau",
            artist:
                kept?.artists?.[0]?.name || "",
            sources:
                merged.__shufflePlusSources || []
        });
    }

    const cleanedTracks = [
        ...selectedByKey.values()
    ];

    const variantKeys = new Set(
        cleanedTracks.map((track) =>
            `${normalizeSearchText(track?.artists?.[0]?.name || "")}:` +
            `${getCleanupBaseTitle(track, "strict")}`
        )
    );
    variantsKept = Math.max(
        0,
        cleanedTracks.length - variantKeys.size
    );

    const summary = {
        inputCount: tracks.length,
        outputCount: cleanedTracks.length,
        removedCount:
            tracks.length - cleanedTracks.length,
        unavailableCount,
        exactDuplicateCount,
        similarDuplicateCount,
        variantsKept,
        durationSavedMs,
        groups: groups.slice(0, 30)
    };

    lastCleanupSummary = summary;
    lastCleanupSnapshot = [...tracks];

    return {
        tracks: cleanedTracks,
        summary
    };
}

function getCleanupSummary(
    settings = currentCleanupSettings
) {
    const normalized =
        normalizeCleanupSettings(settings);

    if (!normalized.enabled) {
        return "Nettoyage désactivé";
    }

    const parts = [
        `niveau ${getCleanupLevelLabel(
            normalized.level
        ).toLowerCase()}`
    ];

    if (normalized.keepRemix) {
        parts.push("remix conservés");
    }

    if (normalized.keepLive) {
        parts.push("live conservés");
    }

    if (normalized.preferOriginal) {
        parts.push("version originale prioritaire");
    }

    return parts.join(" · ");
}

function renderCleanupPanel() {
    const settings = normalizeCleanupSettings(
        currentCleanupSettings
    );

    return `
        <section class="cleanup-panel">
            <div class="cleanup-panel-heading">
                <div>
                    <h3>Nettoyage intelligent</h3>
                    <p>
                        ${escapeHtml(
                            getCleanupSummary(settings)
                        )}
                    </p>
                </div>

                <button
                    id="resetCleanupSettingsButton"
                    class="cleanup-reset-button"
                    type="button"
                >
                    Réinitialiser
                </button>
            </div>

            <form
                id="cleanupSettingsForm"
                class="cleanup-form"
            >
                <label class="cleanup-check cleanup-check-main">
                    <input
                        name="enabled"
                        type="checkbox"
                        ${settings.enabled ? "checked" : ""}
                    >
                    <span>
                        Nettoyer automatiquement avant le mélange
                    </span>
                </label>

                <label class="cleanup-field">
                    <span>Niveau de nettoyage</span>
                    <select name="level">
                        <option value="prudent" ${settings.level === "prudent" ? "selected" : ""}>
                            Prudent · doublons exacts
                        </option>
                        <option value="normal" ${settings.level === "normal" ? "selected" : ""}>
                            Normal · même titre et artiste
                        </option>
                        <option value="strict" ${settings.level === "strict" ? "selected" : ""}>
                            Strict · variantes proches
                        </option>
                    </select>
                </label>

                <label class="cleanup-check">
                    <input
                        name="keepRemix"
                        type="checkbox"
                        ${settings.keepRemix ? "checked" : ""}
                    >
                    <span>Conserver les remix séparément</span>
                </label>

                <label class="cleanup-check">
                    <input
                        name="keepLive"
                        type="checkbox"
                        ${settings.keepLive ? "checked" : ""}
                    >
                    <span>Conserver les versions live séparément</span>
                </label>

                <label class="cleanup-check">
                    <input
                        name="preferOriginal"
                        type="checkbox"
                        ${settings.preferOriginal ? "checked" : ""}
                    >
                    <span>Préférer la version originale</span>
                </label>

                <label class="cleanup-check">
                    <input
                        name="removeUnavailable"
                        type="checkbox"
                        ${settings.removeUnavailable ? "checked" : ""}
                    >
                    <span>Retirer les morceaux indisponibles</span>
                </label>

                <div class="cleanup-actions">
                    <button
                        class="cleanup-save-button"
                        type="submit"
                    >
                        🧹 Enregistrer le nettoyage
                    </button>
                </div>
            </form>
        </section>
    `;
}

function saveCleanupSettingsFromForm(form) {
    const formData = new FormData(form);

    currentCleanupSettings =
        normalizeCleanupSettings({
            enabled:
                formData.get("enabled") === "on",
            level: formData.get("level"),
            keepRemix:
                formData.get("keepRemix") === "on",
            keepLive:
                formData.get("keepLive") === "on",
            preferOriginal:
                formData.get("preferOriginal") === "on",
            removeUnavailable:
                formData.get("removeUnavailable") === "on"
        });

    saveCleanupSettings();

    const activeProfile = getActiveProfile();

    if (activeProfile && !activeProfile.isDefault) {
        activeProfile.cleanupSettings =
            normalizeCleanupSettings(
                currentCleanupSettings
            );
        saveMixProfiles();
    }

    displayPlaylists(playlistsCache);
    setStatus("Réglages de nettoyage enregistrés.");
}

function resetCleanupSettings() {
    currentCleanupSettings = {
        ...DEFAULT_CLEANUP_SETTINGS
    };
    saveCleanupSettings();
    displayPlaylists(playlistsCache);
    setStatus("Nettoyage intelligent réinitialisé.");
}

function restoreLastCleanup() {
    if (!lastCleanupSnapshot?.length) {
        setStatus(
            "Aucun nettoyage récent à restaurer.",
            "error"
        );
        return;
    }

    sourceTracks = [...lastCleanupSnapshot];
    selectedTracks = smartShuffleTracks(
        sourceTracks,
        getShuffleEngineOptions(
            currentShuffleSettings
        )
    );
    selectedTracks = limitTracksToAdaptiveTarget(
        selectedTracks,
        currentAdaptiveSettings
    );
    originalGeneratedOrder = [...selectedTracks];
    lastCleanupSummary = null;
    renderTrackList();
    renderShuffleStats(
        analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
    );
    setStatus(
        "Dernier nettoyage restauré pour ce mix."
    );
}

function normalizeAdaptiveSettings(settings = {}) {
    const allowedDurationModes = new Set([
        "none",
        "30",
        "60",
        "120",
        "long",
        "custom"
    ]);

    return {
        enabled: Boolean(settings.enabled),
        autoProfileByTime:
            settings.autoProfileByTime !== false,
        adaptIntensityByTime:
            settings.adaptIntensityByTime !== false,
        durationMode:
            allowedDurationModes.has(settings.durationMode)
                ? settings.durationMode
                : "none",
        customDurationMinutes: clampInteger(
            settings.customDurationMinutes,
            10,
            720,
            60
        ),
        targetTrackCount: clampInteger(
            settings.targetTrackCount,
            0,
            500,
            0
        )
    };
}

function readAdaptiveSettings() {
    try {
        const raw = localStorage.getItem(
            ADAPTIVE_SETTINGS_KEY
        );
        const parsed = raw ? JSON.parse(raw) : {};

        return normalizeAdaptiveSettings(parsed);
    } catch (error) {
        console.warn(
            "Réglages adaptatifs illisibles :",
            error
        );
        return {
            ...DEFAULT_ADAPTIVE_SETTINGS
        };
    }
}

function saveAdaptiveSettings() {
    try {
        localStorage.setItem(
            ADAPTIVE_SETTINGS_KEY,
            JSON.stringify(currentAdaptiveSettings)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer le mode adaptatif :",
            error
        );
    }
}

function getTimeContext(date = new Date()) {
    const hour = date.getHours();

    if (hour >= 5 && hour < 11) {
        return {
            id: "morning",
            label: "Matin",
            icon: "🌅",
            profileId: "profile-concentration",
            intensity: {
                curve: "stable",
                startIntensity: 30,
                endIntensity: 40,
                peakIntensity: 45,
                strength: "normal",
                smoothTransitions: true
            }
        };
    }

    if (hour >= 11 && hour < 17) {
        return {
            id: "day",
            label: "Journée",
            icon: "☀️",
            profileId: "profile-decouverte",
            intensity: {
                curve: "waves",
                startIntensity: 45,
                endIntensity: 60,
                peakIntensity: 75,
                strength: "light",
                smoothTransitions: true
            }
        };
    }

    if (hour >= 17 && hour < 22) {
        return {
            id: "evening",
            label: "Soirée",
            icon: "🌆",
            profileId: "profile-sport",
            intensity: {
                curve: "rising",
                startIntensity: 45,
                endIntensity: 85,
                peakIntensity: 90,
                strength: "strong",
                smoothTransitions: true
            }
        };
    }

    return {
        id: "night",
        label: "Nuit",
        icon: "🌙",
        profileId: "profile-soiree",
        intensity: {
            curve: "waves",
            startIntensity: 50,
            endIntensity: 70,
            peakIntensity: 85,
            strength: "normal",
            smoothTransitions: true
        }
    };
}

function getAdaptiveTargetDurationMinutes(
    settings = currentAdaptiveSettings
) {
    switch (settings.durationMode) {
        case "30":
            return 30;
        case "60":
            return 60;
        case "120":
            return 120;
        case "long":
            return 240;
        case "custom":
            return settings.customDurationMinutes;
        case "none":
        default:
            return 0;
    }
}

function getAdaptiveDurationLabel(
    settings = currentAdaptiveSettings
) {
    const minutes = getAdaptiveTargetDurationMinutes(
        settings
    );

    if (!minutes) {
        return "Durée libre";
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    return remainder
        ? `${hours} h ${remainder} min`
        : `${hours} h`;
}

function estimateTracksDurationMs(tracks) {
    return tracks.reduce(
        (total, track) =>
            total + Number(track?.duration_ms || 0),
        0
    );
}

function formatLongDuration(durationMs = 0) {
    const totalMinutes = Math.round(
        durationMs / 60000
    );
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (!hours) {
        return `${minutes} min`;
    }

    return minutes
        ? `${hours} h ${minutes} min`
        : `${hours} h`;
}

function limitTracksToAdaptiveTarget(
    tracks,
    settings = currentAdaptiveSettings
) {
    let limited = [...tracks];

    if (settings.targetTrackCount > 0) {
        limited = limited.slice(
            0,
            settings.targetTrackCount
        );
    }

    const durationMinutes =
        getAdaptiveTargetDurationMinutes(settings);

    if (!durationMinutes) {
        return limited;
    }

    const targetMs = durationMinutes * 60 * 1000;
    const result = [];
    let totalMs = 0;

    for (const track of limited) {
        const durationMs = Number(
            track?.duration_ms || 0
        );

        if (
            result.length &&
            totalMs + durationMs >
                targetMs + 2 * 60 * 1000
        ) {
            break;
        }

        result.push(track);
        totalMs += durationMs;

        if (totalMs >= targetMs) {
            break;
        }
    }

    return result;
}

function applyAdaptiveContext({
    persistProfile = false
} = {}) {
    const settings = normalizeAdaptiveSettings(
        currentAdaptiveSettings
    );

    if (!settings.enabled) {
        activeAdaptiveContext = null;
        return null;
    }

    const context = getTimeContext();

    if (settings.autoProfileByTime) {
        const profile = getProfileById(
            context.profileId
        );

        if (profile) {
            applyMixProfile(
                profile.id,
                {
                    persist: persistProfile,
                    rerender: false
                }
            );
        }
    }

    if (settings.adaptIntensityByTime) {
        currentIntensitySettings =
            normalizeIntensitySettings(
                context.intensity
            );
        saveIntensitySettings();
    }

    activeAdaptiveContext = {
        ...context,
        durationMinutes:
            getAdaptiveTargetDurationMinutes(settings),
        targetTrackCount:
            settings.targetTrackCount
    };

    return activeAdaptiveContext;
}

function getAdaptiveSummary(
    settings = currentAdaptiveSettings
) {
    if (!settings.enabled) {
        return "Mode adaptatif désactivé";
    }

    const context = getTimeContext();
    const parts = [
        `${context.icon} ${context.label}`,
        getAdaptiveDurationLabel(settings)
    ];

    if (settings.targetTrackCount > 0) {
        parts.push(
            `${settings.targetTrackCount} titres maximum`
        );
    }

    if (settings.autoProfileByTime) {
        const profile = getProfileById(
            context.profileId
        );
        parts.push(
            profile
                ? `profil ${profile.name}`
                : "profil automatique"
        );
    }

    return parts.join(" · ");
}

function renderAdaptivePanel() {
    const settings = normalizeAdaptiveSettings(
        currentAdaptiveSettings
    );
    const context = getTimeContext();

    return `
        <section class="adaptive-panel">
            <div class="adaptive-panel-heading">
                <div>
                    <h3>Mix adaptatif</h3>
                    <p>
                        ${escapeHtml(
                            getAdaptiveSummary(settings)
                        )}
                    </p>
                </div>

                <button
                    id="resetAdaptiveSettingsButton"
                    class="adaptive-reset-button"
                    type="button"
                >
                    Réinitialiser
                </button>
            </div>

            <div class="adaptive-context-preview">
                <span class="adaptive-context-icon">
                    ${context.icon}
                </span>
                <div>
                    <strong>
                        Contexte actuel : ${escapeHtml(context.label)}
                    </strong>
                    <span>
                        Profil suggéré :
                        ${escapeHtml(
                            getProfileById(context.profileId)?.name ||
                            "Automatique"
                        )}
                    </span>
                </div>
            </div>

            <form
                id="adaptiveSettingsForm"
                class="adaptive-form"
            >
                <label class="adaptive-check adaptive-check-main">
                    <input
                        name="enabled"
                        type="checkbox"
                        ${settings.enabled ? "checked" : ""}
                    >
                    <span>Activer le mix adaptatif</span>
                </label>

                <label class="adaptive-check">
                    <input
                        name="autoProfileByTime"
                        type="checkbox"
                        ${settings.autoProfileByTime ? "checked" : ""}
                    >
                    <span>
                        Choisir automatiquement un profil
                        selon l’heure
                    </span>
                </label>

                <label class="adaptive-check">
                    <input
                        name="adaptIntensityByTime"
                        type="checkbox"
                        ${settings.adaptIntensityByTime ? "checked" : ""}
                    >
                    <span>
                        Adapter la courbe d’intensité
                        selon l’heure
                    </span>
                </label>

                <label class="adaptive-field">
                    <span>Durée d’écoute prévue</span>
                    <select
                        name="durationMode"
                        data-adaptive-duration-mode
                    >
                        <option value="none" ${settings.durationMode === "none" ? "selected" : ""}>
                            Durée libre
                        </option>
                        <option value="30" ${settings.durationMode === "30" ? "selected" : ""}>
                            30 minutes
                        </option>
                        <option value="60" ${settings.durationMode === "60" ? "selected" : ""}>
                            1 heure
                        </option>
                        <option value="120" ${settings.durationMode === "120" ? "selected" : ""}>
                            2 heures
                        </option>
                        <option value="long" ${settings.durationMode === "long" ? "selected" : ""}>
                            Écoute longue · 4 heures
                        </option>
                        <option value="custom" ${settings.durationMode === "custom" ? "selected" : ""}>
                            Durée personnalisée
                        </option>
                    </select>
                </label>

                <label
                    class="adaptive-field"
                    data-adaptive-custom-duration
                    ${settings.durationMode === "custom" ? "" : "hidden"}
                >
                    <span>Durée personnalisée en minutes</span>
                    <input
                        name="customDurationMinutes"
                        type="number"
                        min="10"
                        max="720"
                        value="${settings.customDurationMinutes}"
                    >
                </label>

                <label class="adaptive-field">
                    <span>
                        Nombre cible de morceaux
                        <small>0 = aucune limite</small>
                    </span>
                    <input
                        name="targetTrackCount"
                        type="number"
                        min="0"
                        max="500"
                        value="${settings.targetTrackCount}"
                    >
                </label>

                <div class="adaptive-actions">
                    <button
                        class="adaptive-save-button"
                        type="submit"
                    >
                        ⏱ Enregistrer l’adaptation
                    </button>
                </div>
            </form>
        </section>
    `;
}

function saveAdaptiveSettingsFromForm(form) {
    const formData = new FormData(form);

    currentAdaptiveSettings =
        normalizeAdaptiveSettings({
            enabled:
                formData.get("enabled") === "on",
            autoProfileByTime:
                formData.get("autoProfileByTime") === "on",
            adaptIntensityByTime:
                formData.get("adaptIntensityByTime") === "on",
            durationMode:
                formData.get("durationMode"),
            customDurationMinutes:
                formData.get("customDurationMinutes"),
            targetTrackCount:
                formData.get("targetTrackCount")
        });

    saveAdaptiveSettings();
    activeAdaptiveContext = null;
    displayPlaylists(playlistsCache);
    setStatus("Réglages adaptatifs enregistrés.");
}

function resetAdaptiveSettings() {
    currentAdaptiveSettings = {
        ...DEFAULT_ADAPTIVE_SETTINGS
    };
    activeAdaptiveContext = null;
    saveAdaptiveSettings();
    displayPlaylists(playlistsCache);
    setStatus("Mode adaptatif réinitialisé.");
}

function normalizeIntensitySettings(settings = {}) {
    const allowedCurves = new Set([
        "rising",
        "falling",
        "stable",
        "waves",
        "central-peak"
    ]);
    const allowedStrengths = new Set([
        "light",
        "normal",
        "strong"
    ]);

    return {
        curve: allowedCurves.has(settings.curve)
            ? settings.curve
            : "stable",
        startIntensity: clampInteger(
            settings.startIntensity,
            0,
            100,
            45
        ),
        endIntensity: clampInteger(
            settings.endIntensity,
            0,
            100,
            65
        ),
        peakIntensity: clampInteger(
            settings.peakIntensity,
            0,
            100,
            85
        ),
        strength: allowedStrengths.has(settings.strength)
            ? settings.strength
            : "normal",
        smoothTransitions:
            settings.smoothTransitions !== false
    };
}

function readIntensitySettings() {
    try {
        const raw = localStorage.getItem(
            INTENSITY_SETTINGS_KEY
        );
        const parsed = raw ? JSON.parse(raw) : {};

        return normalizeIntensitySettings(parsed);
    } catch (error) {
        console.warn(
            "Réglages d’intensité illisibles :",
            error
        );
        return {
            ...DEFAULT_INTENSITY_SETTINGS
        };
    }
}

function saveIntensitySettings() {
    try {
        localStorage.setItem(
            INTENSITY_SETTINGS_KEY,
            JSON.stringify(currentIntensitySettings)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer la courbe d’intensité :",
            error
        );
    }
}

function getIntensityCurveLabel(curve = "stable") {
    switch (curve) {
        case "rising":
            return "Montée progressive";
        case "falling":
            return "Descente progressive";
        case "waves":
            return "En vagues";
        case "central-peak":
            return "Pic central";
        case "stable":
        default:
            return "Stable";
    }
}

function getIntensityStrengthLabel(strength = "normal") {
    switch (strength) {
        case "light":
            return "Légère";
        case "strong":
            return "Forte";
        case "normal":
        default:
            return "Normale";
    }
}

function getIntensityTargetAtProgress(
    settings,
    progress
) {
    const normalized =
        normalizeIntensitySettings(settings);
    const x = Math.min(1, Math.max(0, progress));
    const start = normalized.startIntensity;
    const end = normalized.endIntensity;
    const peak = normalized.peakIntensity;

    switch (normalized.curve) {
        case "rising":
            return start + (end - start) * x;
        case "falling":
            return start + (end - start) * x;
        case "waves": {
            const baseline =
                start + (end - start) * x;
            const amplitude =
                Math.max(
                    8,
                    peak - Math.max(start, end)
                );

            return Math.min(
                100,
                Math.max(
                    0,
                    baseline +
                    Math.sin(x * Math.PI * 4) *
                    amplitude
                )
            );
        }
        case "central-peak":
            return x <= 0.5
                ? start + (peak - start) * (x * 2)
                : peak + (end - peak) *
                    ((x - 0.5) * 2);
        case "stable":
        default:
            return start + (end - start) * x;
    }
}

function getIntensityCurvePoints(settings) {
    return Array.from(
        { length: 21 },
        (_, index) => {
            const progress = index / 20;
            const intensity =
                getIntensityTargetAtProgress(
                    settings,
                    progress
                );

            return {
                x: progress * 100,
                y: 100 - intensity
            };
        }
    );
}

function getIntensitySummary(
    settings = currentIntensitySettings
) {
    const normalized =
        normalizeIntensitySettings(settings);

    return [
        getIntensityCurveLabel(normalized.curve),
        `${normalized.startIntensity}% → ` +
            `${normalized.endIntensity}%`,
        `pic ${normalized.peakIntensity}%`,
        `influence ${getIntensityStrengthLabel(
            normalized.strength
        ).toLowerCase()}`
    ].join(" · ");
}

function renderIntensityPreview(settings) {
    const points = getIntensityCurvePoints(settings)
        .map((point) =>
            `${point.x.toFixed(1)},${point.y.toFixed(1)}`
        )
        .join(" ");

    return `
        <div class="intensity-preview">
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="Aperçu de la courbe d’intensité"
            >
                <line x1="0" y1="25" x2="100" y2="25"></line>
                <line x1="0" y1="50" x2="100" y2="50"></line>
                <line x1="0" y1="75" x2="100" y2="75"></line>
                <polyline points="${points}"></polyline>
            </svg>
            <div class="intensity-preview-labels">
                <span>Début</span>
                <span>Milieu</span>
                <span>Fin</span>
            </div>
        </div>
    `;
}

function renderIntensityPanel() {
    const settings = normalizeIntensitySettings(
        currentIntensitySettings
    );

    return `
        <section class="intensity-panel">
            <div class="intensity-panel-heading">
                <div>
                    <h3>Courbe d’intensité</h3>
                    <p>
                        ${escapeHtml(
                            getIntensitySummary(settings)
                        )}
                    </p>
                </div>

                <button
                    id="resetIntensitySettingsButton"
                    class="intensity-reset-button"
                    type="button"
                >
                    Réinitialiser
                </button>
            </div>

            ${renderIntensityPreview(settings)}

            <form
                id="intensitySettingsForm"
                class="intensity-form"
            >
                <label class="intensity-field">
                    <span>Forme de la courbe</span>
                    <select name="curve" data-intensity-control>
                        <option value="rising" ${settings.curve === "rising" ? "selected" : ""}>
                            Montée progressive
                        </option>
                        <option value="falling" ${settings.curve === "falling" ? "selected" : ""}>
                            Descente progressive
                        </option>
                        <option value="stable" ${settings.curve === "stable" ? "selected" : ""}>
                            Stable
                        </option>
                        <option value="waves" ${settings.curve === "waves" ? "selected" : ""}>
                            En vagues
                        </option>
                        <option value="central-peak" ${settings.curve === "central-peak" ? "selected" : ""}>
                            Pic central
                        </option>
                    </select>
                </label>

                <label class="intensity-field">
                    <span>Influence sur le mélange</span>
                    <select name="strength">
                        <option value="light" ${settings.strength === "light" ? "selected" : ""}>
                            Légère
                        </option>
                        <option value="normal" ${settings.strength === "normal" ? "selected" : ""}>
                            Normale
                        </option>
                        <option value="strong" ${settings.strength === "strong" ? "selected" : ""}>
                            Forte
                        </option>
                    </select>
                </label>

                ${[
                    ["startIntensity", "Intensité de départ", settings.startIntensity],
                    ["endIntensity", "Intensité de fin", settings.endIntensity],
                    ["peakIntensity", "Intensité du pic", settings.peakIntensity]
                ].map(([name, label, value]) => `
                    <label class="intensity-field">
                        <span>
                            ${label} :
                            <strong data-intensity-value="${name}">
                                ${value}%
                            </strong>
                        </span>
                        <input
                            name="${name}"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value="${value}"
                            data-intensity-control
                        >
                    </label>
                `).join("")}

                <label class="intensity-check">
                    <input
                        name="smoothTransitions"
                        type="checkbox"
                        ${settings.smoothTransitions ? "checked" : ""}
                    >
                    <span>
                        Limiter les sauts d’intensité entre
                        deux morceaux consécutifs
                    </span>
                </label>

                <div class="intensity-actions">
                    <button
                        class="intensity-save-button"
                        type="submit"
                    >
                        〽 Enregistrer la courbe
                    </button>
                </div>
            </form>
        </section>
    `;
}

function saveIntensitySettingsFromForm(form) {
    const formData = new FormData(form);

    currentIntensitySettings =
        normalizeIntensitySettings({
            curve: formData.get("curve"),
            startIntensity:
                formData.get("startIntensity"),
            endIntensity:
                formData.get("endIntensity"),
            peakIntensity:
                formData.get("peakIntensity"),
            strength: formData.get("strength"),
            smoothTransitions:
                formData.get("smoothTransitions") === "on"
        });

    saveIntensitySettings();

    const activeProfile = getActiveProfile();

    if (activeProfile && !activeProfile.isDefault) {
        activeProfile.intensitySettings =
            normalizeIntensitySettings(
                currentIntensitySettings
            );
        saveMixProfiles();
    }

    displayPlaylists(playlistsCache);
    setStatus("Courbe d’intensité enregistrée.");
}

function resetIntensitySettings() {
    currentIntensitySettings = {
        ...DEFAULT_INTENSITY_SETTINGS
    };
    saveIntensitySettings();
    displayPlaylists(playlistsCache);
    setStatus("Courbe d’intensité réinitialisée.");
}

function updateIntensityPreviewFromForm(form) {
    if (!form) {
        return;
    }

    const formData = new FormData(form);
    const settings = normalizeIntensitySettings({
        curve: formData.get("curve"),
        startIntensity: formData.get("startIntensity"),
        endIntensity: formData.get("endIntensity"),
        peakIntensity: formData.get("peakIntensity"),
        strength: formData.get("strength"),
        smoothTransitions:
            formData.get("smoothTransitions") === "on"
    });

    for (const name of [
        "startIntensity",
        "endIntensity",
        "peakIntensity"
    ]) {
        const output = form.querySelector(
            `[data-intensity-value="${name}"]`
        );

        if (output) {
            output.textContent =
                `${settings[name]}%`;
        }
    }

    const preview = form
        .closest(".intensity-panel")
        ?.querySelector(".intensity-preview");

    if (preview) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML =
            renderIntensityPreview(settings);
        preview.replaceWith(
            wrapper.firstElementChild
        );
    }
}

function normalizeCoherenceSettings(settings = {}) {
    const allowedLevels = new Set([
        "free",
        "balanced",
        "fluid"
    ]);

    return {
        level: allowedLevels.has(settings.level)
            ? settings.level
            : "balanced",
        strengthenFirstThirty:
            settings.strengthenFirstThirty !== false,
        durationJumpSeconds: clampInteger(
            settings.durationJumpSeconds,
            60,
            600,
            150
        )
    };
}

function readCoherenceSettings() {
    try {
        const raw = localStorage.getItem(
            COHERENCE_SETTINGS_KEY
        );
        const parsed = raw ? JSON.parse(raw) : {};

        return normalizeCoherenceSettings(parsed);
    } catch (error) {
        console.warn(
            "Réglages de cohérence illisibles :",
            error
        );
        return {
            ...DEFAULT_COHERENCE_SETTINGS
        };
    }
}

function saveCoherenceSettings() {
    try {
        localStorage.setItem(
            COHERENCE_SETTINGS_KEY,
            JSON.stringify(currentCoherenceSettings)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer la cohérence :",
            error
        );
    }
}

function getCoherenceLevelLabel(level = "balanced") {
    switch (level) {
        case "free":
            return "Libre";
        case "fluid":
            return "Fluide";
        case "balanced":
        default:
            return "Équilibrée";
    }
}

function getCoherenceSummary(
    settings = currentCoherenceSettings
) {
    const normalized =
        normalizeCoherenceSettings(settings);

    const parts = [
        `cohérence ${getCoherenceLevelLabel(
            normalized.level
        ).toLowerCase()}`,
        `écart de durée sensible à partir de ` +
        `${normalized.durationJumpSeconds}s`
    ];

    if (normalized.strengthenFirstThirty) {
        parts.push("renforcée dans les 30 premiers");
    }

    return parts.join(" · ");
}

function renderCoherencePanel() {
    const settings = normalizeCoherenceSettings(
        currentCoherenceSettings
    );

    return `
        <section class="coherence-panel">
            <div class="coherence-panel-heading">
                <div>
                    <h3>Transitions intelligentes</h3>
                    <p>
                        ${escapeHtml(
                            getCoherenceSummary(settings)
                        )}
                    </p>
                </div>

                <button
                    id="resetCoherenceSettingsButton"
                    class="coherence-reset-button"
                    type="button"
                >
                    Réinitialiser
                </button>
            </div>

            <form
                id="coherenceSettingsForm"
                class="coherence-form"
            >
                <label class="coherence-field">
                    <span>Niveau de cohérence</span>
                    <select name="level">
                        <option value="free" ${settings.level === "free" ? "selected" : ""}>
                            Libre
                        </option>
                        <option value="balanced" ${settings.level === "balanced" ? "selected" : ""}>
                            Équilibrée
                        </option>
                        <option value="fluid" ${settings.level === "fluid" ? "selected" : ""}>
                            Fluide
                        </option>
                    </select>
                </label>

                <label class="coherence-field">
                    <span>
                        Écart de durée considéré comme brusque
                    </span>
                    <div class="coherence-range-row">
                        <input
                            name="durationJumpSeconds"
                            type="range"
                            min="60"
                            max="600"
                            step="15"
                            value="${settings.durationJumpSeconds}"
                            data-coherence-range
                        >
                        <strong data-coherence-value>
                            ${settings.durationJumpSeconds}s
                        </strong>
                    </div>
                </label>

                <label class="coherence-check">
                    <input
                        name="strengthenFirstThirty"
                        type="checkbox"
                        ${settings.strengthenFirstThirty ? "checked" : ""}
                    >
                    <span>
                        Renforcer la cohérence dans les
                        30 premiers morceaux
                    </span>
                </label>

                <div class="coherence-actions">
                    <button
                        class="coherence-save-button"
                        type="submit"
                    >
                        ≋ Enregistrer la cohérence
                    </button>
                </div>
            </form>
        </section>
    `;
}

function saveCoherenceSettingsFromForm(form) {
    const formData = new FormData(form);

    currentCoherenceSettings =
        normalizeCoherenceSettings({
            level: formData.get("level"),
            durationJumpSeconds:
                formData.get("durationJumpSeconds"),
            strengthenFirstThirty:
                formData.get("strengthenFirstThirty") === "on"
        });

    saveCoherenceSettings();

    const activeProfile = getActiveProfile();

    if (activeProfile && !activeProfile.isDefault) {
        activeProfile.coherenceSettings =
            normalizeCoherenceSettings(
                currentCoherenceSettings
            );
        saveMixProfiles();
    }

    displayPlaylists(playlistsCache);
    setStatus("Réglages de cohérence enregistrés.");
}

function resetCoherenceSettings() {
    currentCoherenceSettings = {
        ...DEFAULT_COHERENCE_SETTINGS
    };
    saveCoherenceSettings();
    displayPlaylists(playlistsCache);
    setStatus(
        "Les transitions intelligentes ont été réinitialisées."
    );
}

function normalizePriorityRules(rules = {}) {
    const allowedIntensities = new Set([
        "light",
        "normal",
        "strong"
    ]);

    return {
        favoredArtists: normalizeTextList(
            rules.favoredArtists
        ).slice(0, MAX_PRIORITY_TEXT_ITEMS),
        favoredAlbums: normalizeTextList(
            rules.favoredAlbums
        ).slice(0, MAX_PRIORITY_TEXT_ITEMS),
        favoredTrackUris: normalizeTextList(
            rules.favoredTrackUris
        )
            .filter((value) =>
                value.startsWith("spotify:track:")
            )
            .slice(0, MAX_PRIORITY_TEXT_ITEMS),
        intensity: allowedIntensities.has(rules.intensity)
            ? rules.intensity
            : "normal",
        boostFirstTwenty:
            rules.boostFirstTwenty !== false
    };
}

function readPriorityRules() {
    try {
        const raw = localStorage.getItem(
            PRIORITY_RULES_KEY
        );
        const parsed = raw ? JSON.parse(raw) : {};

        return normalizePriorityRules(parsed);
    } catch (error) {
        console.warn(
            "Règles de priorité illisibles :",
            error
        );
        return {
            ...DEFAULT_PRIORITY_RULES
        };
    }
}

function savePriorityRules() {
    try {
        localStorage.setItem(
            PRIORITY_RULES_KEY,
            JSON.stringify(currentPriorityRules)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer les priorités :",
            error
        );
    }
}

function getPriorityIntensityLabel(value = "normal") {
    switch (value) {
        case "light":
            return "Légère";
        case "strong":
            return "Forte";
        case "normal":
        default:
            return "Normale";
    }
}

function getPriorityRulesSummary(
    rules = currentPriorityRules
) {
    const parts = [];

    if (rules.favoredArtists.length) {
        parts.push(
            `${rules.favoredArtists.length} artiste` +
            `${rules.favoredArtists.length > 1 ? "s" : ""}`
        );
    }

    if (rules.favoredAlbums.length) {
        parts.push(
            `${rules.favoredAlbums.length} album` +
            `${rules.favoredAlbums.length > 1 ? "s" : ""}`
        );
    }

    if (rules.favoredTrackUris.length) {
        parts.push(
            `${rules.favoredTrackUris.length} morceau` +
            `${rules.favoredTrackUris.length > 1 ? "x" : ""}`
        );
    }

    if (!parts.length) {
        return "Aucune priorité active";
    }

    parts.push(
        `intensité ${getPriorityIntensityLabel(
            rules.intensity
        ).toLowerCase()}`
    );

    if (rules.boostFirstTwenty) {
        parts.push("favoris renforcés au début");
    }

    return parts.join(" · ");
}

function getTrackPriorityMatches(
    track,
    rules = currentPriorityRules
) {
    const matches = [];
    const artists = (track?.artists || [])
        .map((artist) => artist?.name)
        .filter(Boolean);
    const albumName = track?.album?.name || "";

    if (
        track?.uri &&
        rules.favoredTrackUris.includes(track.uri)
    ) {
        matches.push("morceau");
    }

    if (
        rules.favoredArtists.length &&
        artists.some((artistName) =>
            includesExcludedText(
                artistName,
                rules.favoredArtists
            )
        )
    ) {
        matches.push("artiste");
    }

    if (
        rules.favoredAlbums.length &&
        includesExcludedText(
            albumName,
            rules.favoredAlbums
        )
    ) {
        matches.push("album");
    }

    return matches;
}

function buildPrioritySummary(
    tracks,
    rules = currentPriorityRules
) {
    const favoredTracks = tracks.filter(
        (track) =>
            getTrackPriorityMatches(track, rules).length
    );

    const favoredInFirstTwenty = tracks
        .slice(0, 20)
        .filter(
            (track) =>
                getTrackPriorityMatches(track, rules).length
        );

    lastPrioritySummary = {
        favoredTotal: favoredTracks.length,
        favoredInFirstTwenty:
            favoredInFirstTwenty.length
    };

    return lastPrioritySummary;
}

function renderPriorityPanel() {
    const rules = normalizePriorityRules(
        currentPriorityRules
    );

    return `
        <section class="priority-panel">
            <div class="priority-panel-heading">
                <div>
                    <h3>Priorités intelligentes</h3>
                    <p>
                        ${escapeHtml(
                            getPriorityRulesSummary(rules)
                        )}
                    </p>
                </div>

                <button
                    id="resetPriorityRulesButton"
                    class="priority-reset-button"
                    type="button"
                >
                    Réinitialiser
                </button>
            </div>

            <form
                id="priorityRulesForm"
                class="priority-form"
            >
                <label class="priority-field">
                    <span>Artistes à favoriser</span>
                    <textarea
                        name="favoredArtists"
                        rows="3"
                        placeholder="Un artiste par ligne ou séparé par une virgule"
                    >${escapeHtml(
                        rules.favoredArtists.join("\n")
                    )}</textarea>
                </label>

                <label class="priority-field">
                    <span>Albums à favoriser</span>
                    <textarea
                        name="favoredAlbums"
                        rows="3"
                        placeholder="Un album par ligne ou séparé par une virgule"
                    >${escapeHtml(
                        rules.favoredAlbums.join("\n")
                    )}</textarea>
                </label>

                <label class="priority-field">
                    <span>Intensité de la priorité</span>
                    <select name="intensity">
                        <option value="light" ${rules.intensity === "light" ? "selected" : ""}>
                            Légère
                        </option>
                        <option value="normal" ${rules.intensity === "normal" ? "selected" : ""}>
                            Normale
                        </option>
                        <option value="strong" ${rules.intensity === "strong" ? "selected" : ""}>
                            Forte
                        </option>
                    </select>
                </label>

                <label class="priority-check">
                    <input
                        name="boostFirstTwenty"
                        type="checkbox"
                        ${rules.boostFirstTwenty ? "checked" : ""}
                    >
                    <span>
                        Renforcer la présence des favoris
                        dans les 20 premiers titres
                    </span>
                </label>

                <div class="priority-actions">
                    <button
                        class="priority-save-button"
                        type="submit"
                    >
                        ⭐ Enregistrer les priorités
                    </button>
                </div>
            </form>
        </section>
    `;
}

function savePriorityRulesFromForm(form) {
    const formData = new FormData(form);

    currentPriorityRules = normalizePriorityRules({
        ...currentPriorityRules,
        favoredArtists: splitRuleText(
            formData.get("favoredArtists")
        ),
        favoredAlbums: splitRuleText(
            formData.get("favoredAlbums")
        ),
        intensity: formData.get("intensity"),
        boostFirstTwenty:
            formData.get("boostFirstTwenty") === "on"
    });

    savePriorityRules();

    const activeProfile = getActiveProfile();

    if (activeProfile && !activeProfile.isDefault) {
        activeProfile.priorityRules =
            normalizePriorityRules(
                currentPriorityRules
            );
        saveMixProfiles();
    }

    displayPlaylists(playlistsCache);
    setStatus("Règles de priorité enregistrées.");
}

function resetPriorityRules() {
    currentPriorityRules = {
        ...DEFAULT_PRIORITY_RULES
    };
    lastPrioritySummary = null;
    savePriorityRules();
    displayPlaylists(playlistsCache);
    setStatus("Toutes les priorités ont été réinitialisées.");
}

function toggleFavoredTrackAt(index) {
    const track = selectedTracks[index];

    if (!track?.uri) {
        return;
    }

    const favored = currentPriorityRules
        .favoredTrackUris
        .includes(track.uri);

    currentPriorityRules = normalizePriorityRules({
        ...currentPriorityRules,
        favoredTrackUris: favored
            ? currentPriorityRules.favoredTrackUris
                .filter((uri) => uri !== track.uri)
            : [
                ...currentPriorityRules.favoredTrackUris,
                track.uri
            ]
    });

    savePriorityRules();
    renderTrackList();

    setStatus(
        favored
            ? `« ${track.name || "Morceau"} » retiré des priorités.`
            : `« ${track.name || "Morceau"} » ajouté aux priorités.`
    );
}

function normalizeMixProfile(profile = {}) {
    return {
        id:
            typeof profile.id === "string" && profile.id.trim()
                ? profile.id.trim().slice(0, 120)
                : createSavedMixId(),
        name:
            typeof profile.name === "string" && profile.name.trim()
                ? profile.name.trim().slice(0, 60)
                : "Profil personnalisé",
        icon:
            typeof profile.icon === "string" && profile.icon.trim()
                ? profile.icon.trim().slice(0, 8)
                : "🎛️",
        description:
            typeof profile.description === "string"
                ? profile.description.trim().slice(0, 180)
                : "",
        isDefault: Boolean(profile.isDefault),
        shuffleSettings: normalizeShuffleSettings(
            profile.shuffleSettings
        ),
        exclusionRules: normalizeExclusionRules(
            profile.exclusionRules
        ),
        priorityRules: normalizePriorityRules(
            profile.priorityRules
        ),
        coherenceSettings: normalizeCoherenceSettings(
            profile.coherenceSettings
        ),
        intensitySettings: normalizeIntensitySettings(
            profile.intensitySettings
        ),
        cleanupSettings: normalizeCleanupSettings(
            profile.cleanupSettings
        )
    };
}

function readMixProfiles() {
    try {
        const raw = localStorage.getItem(MIX_PROFILES_KEY);
        const parsed = raw ? JSON.parse(raw) : null;

        if (!Array.isArray(parsed) || !parsed.length) {
            return DEFAULT_MIX_PROFILES.map(
                (profile) => normalizeMixProfile(profile)
            );
        }

        return parsed
            .map((profile) => normalizeMixProfile(profile))
            .slice(0, MAX_MIX_PROFILES);
    } catch (error) {
        console.warn("Profils de mix illisibles :", error);
        return DEFAULT_MIX_PROFILES.map(
            (profile) => normalizeMixProfile(profile)
        );
    }
}

function saveMixProfiles() {
    try {
        localStorage.setItem(
            MIX_PROFILES_KEY,
            JSON.stringify(mixProfiles)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer les profils :",
            error
        );
    }
}

function readActiveProfileId() {
    try {
        return localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
    } catch (error) {
        return "";
    }
}

function saveActiveProfileId() {
    try {
        if (activeProfileId) {
            localStorage.setItem(
                ACTIVE_PROFILE_KEY,
                activeProfileId
            );
        } else {
            localStorage.removeItem(ACTIVE_PROFILE_KEY);
        }
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer le profil actif :",
            error
        );
    }
}

function getActiveProfile() {
    return mixProfiles.find(
        (profile) => profile.id === activeProfileId
    ) || null;
}

function getProfileById(profileId) {
    return mixProfiles.find(
        (profile) => profile.id === profileId
    ) || null;
}

function applyMixProfile(profileId, {
    persist = true,
    rerender = true
} = {}) {
    const profile = getProfileById(profileId);

    if (!profile) {
        return;
    }

    currentShuffleSettings = normalizeShuffleSettings(
        profile.shuffleSettings
    );
    currentExclusionRules = normalizeExclusionRules(
        profile.exclusionRules
    );
    currentPriorityRules = normalizePriorityRules(
        profile.priorityRules
    );
    currentCoherenceSettings =
        normalizeCoherenceSettings(
            profile.coherenceSettings
        );
    currentIntensitySettings =
        normalizeIntensitySettings(
            profile.intensitySettings
        );
    currentCleanupSettings =
        normalizeCleanupSettings(
            profile.cleanupSettings
        );
    activeProfileId = profile.id;

    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();
    saveIntensitySettings();
    saveCleanupSettings();

    if (persist) {
        saveActiveProfileId();
    }

    if (rerender) {
        displayPlaylists(playlistsCache);
    }

    setStatus(`Profil « ${profile.name} » appliqué.`);
}

function clearActiveProfile() {
    activeProfileId = "";
    saveActiveProfileId();
    currentShuffleSettings = {
        ...DEFAULT_SHUFFLE_SETTINGS
    };
    currentExclusionRules = {
        ...DEFAULT_EXCLUSION_RULES
    };
    currentPriorityRules = {
        ...DEFAULT_PRIORITY_RULES
    };
    currentCoherenceSettings = {
        ...DEFAULT_COHERENCE_SETTINGS
    };
    currentIntensitySettings = {
        ...DEFAULT_INTENSITY_SETTINGS
    };
    currentCleanupSettings = {
        ...DEFAULT_CLEANUP_SETTINGS
    };
    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();
    saveIntensitySettings();
    saveCleanupSettings();
    displayPlaylists(playlistsCache);
    setStatus("Profil actif désactivé.");
}

function createProfileFromCurrentSettings() {
    if (mixProfiles.length >= MAX_MIX_PROFILES) {
        setStatus(
            `Tu peux enregistrer jusqu’à ${MAX_MIX_PROFILES} profils.`,
            "error"
        );
        return;
    }

    const requestedName = window.prompt(
        "Nom du nouveau profil :",
        "Mon profil"
    );

    if (requestedName === null) {
        return;
    }

    const name = requestedName.trim();

    if (!name) {
        setStatus(
            "Le nom du profil ne peut pas être vide.",
            "error"
        );
        return;
    }

    const profile = normalizeMixProfile({
        id: createSavedMixId(),
        name,
        icon: "🎛️",
        description:
            "Profil personnalisé créé à partir des réglages actuels.",
        isDefault: false,
        shuffleSettings: currentShuffleSettings,
        exclusionRules: currentExclusionRules,
        priorityRules: currentPriorityRules,
        coherenceSettings: currentCoherenceSettings,
        intensitySettings: currentIntensitySettings,
        cleanupSettings: currentCleanupSettings
    });

    mixProfiles = [profile, ...mixProfiles]
        .slice(0, MAX_MIX_PROFILES);
    saveMixProfiles();
    applyMixProfile(profile.id);
}

function duplicateMixProfile(profileId) {
    const source = getProfileById(profileId);

    if (!source) {
        return;
    }

    if (mixProfiles.length >= MAX_MIX_PROFILES) {
        setStatus(
            `Tu peux enregistrer jusqu’à ${MAX_MIX_PROFILES} profils.`,
            "error"
        );
        return;
    }

    const duplicate = normalizeMixProfile({
        ...source,
        id: createSavedMixId(),
        name: `${source.name} copie`,
        isDefault: false
    });

    mixProfiles = [duplicate, ...mixProfiles];
    saveMixProfiles();
    displayPlaylists(playlistsCache);
    setStatus(`Profil « ${source.name} » dupliqué.`);
}

function renameMixProfile(profileId) {
    const profile = getProfileById(profileId);

    if (!profile || profile.isDefault) {
        return;
    }

    const requestedName = window.prompt(
        "Nouveau nom du profil :",
        profile.name
    );

    if (requestedName === null) {
        return;
    }

    const name = requestedName.trim();

    if (!name) {
        setStatus(
            "Le nom du profil ne peut pas être vide.",
            "error"
        );
        return;
    }

    profile.name = name.slice(0, 60);
    saveMixProfiles();
    displayPlaylists(playlistsCache);
    setStatus(`Profil renommé « ${profile.name} ».`);
}

function deleteMixProfile(profileId) {
    const profile = getProfileById(profileId);

    if (!profile || profile.isDefault) {
        return;
    }

    const confirmed = window.confirm(
        `Supprimer le profil « ${profile.name} » ?`
    );

    if (!confirmed) {
        return;
    }

    mixProfiles = mixProfiles.filter(
        (item) => item.id !== profileId
    );

    if (activeProfileId === profileId) {
        activeProfileId = "";
        saveActiveProfileId();
    }

    for (const mix of savedMixes) {
        if (mix.profileId === profileId) {
            mix.profileId = "";
        }
    }

    saveMixProfiles();
    saveSavedMixes();
    displayPlaylists(playlistsCache);
    setStatus("Profil supprimé.");
}

function restoreDefaultMixProfiles() {
    const customProfiles = mixProfiles.filter(
        (profile) => !profile.isDefault
    );

    mixProfiles = [
        ...DEFAULT_MIX_PROFILES.map(
            (profile) => normalizeMixProfile(profile)
        ),
        ...customProfiles
    ].slice(0, MAX_MIX_PROFILES);

    saveMixProfiles();
    displayPlaylists(playlistsCache);
    setStatus("Profils par défaut restaurés.");
}

function assignProfileToSavedMix(mixId, profileId) {
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        return;
    }

    const profile = getProfileById(profileId);

    mix.profileId = profile?.id || "";

    if (profile) {
        mix.shuffleSettings = normalizeShuffleSettings(
            profile.shuffleSettings
        );
        mix.exclusionRules = normalizeExclusionRules(
            profile.exclusionRules
        );
        mix.priorityRules = normalizePriorityRules(
            profile.priorityRules
        );
        mix.coherenceSettings =
            normalizeCoherenceSettings(
                profile.coherenceSettings
            );
        mix.intensitySettings =
            normalizeIntensitySettings(
                profile.intensitySettings
            );
        mix.cleanupSettings =
            normalizeCleanupSettings(
                profile.cleanupSettings
            );
    }

    mix.updatedAt = Date.now();
    saveSavedMixes();
    displayPlaylists(playlistsCache);

    setStatus(
        profile
            ? `Profil « ${profile.name} » associé au mix « ${mix.name} ».`
            : `Profil retiré du mix « ${mix.name} ».`
    );
}

function getMixProfileSummary(profile) {
    return [
        getShufflePresetLabel(profile.shuffleSettings),
        getExclusionRulesSummary(profile.exclusionRules),
        getPriorityRulesSummary(profile.priorityRules),
        getCoherenceSummary(profile.coherenceSettings),
        getIntensitySummary(profile.intensitySettings),
        getCleanupSummary(profile.cleanupSettings)
    ].join(" · ");
}

function renderMixProfilesSection() {
    const activeProfile = getActiveProfile();

    const cards = mixProfiles.map((profile) => `
        <article class="mix-profile-card ${profile.id === activeProfileId ? "is-active" : ""}">
            <div class="mix-profile-card-main">
                <span class="mix-profile-icon">${escapeHtml(profile.icon)}</span>
                <div>
                    <h4>${escapeHtml(profile.name)}</h4>
                    <p>${escapeHtml(profile.description || "Profil Shuffle+")}</p>
                    <small>${escapeHtml(getMixProfileSummary(profile))}</small>
                </div>
            </div>

            <div class="mix-profile-actions">
                <button
                    class="mix-profile-apply"
                    type="button"
                    data-profile-action="apply"
                    data-profile-id="${escapeHtml(profile.id)}"
                >
                    ${profile.id === activeProfileId ? "✓ Actif" : "Appliquer"}
                </button>

                <button
                    class="mix-profile-secondary"
                    type="button"
                    data-profile-action="duplicate"
                    data-profile-id="${escapeHtml(profile.id)}"
                    title="Dupliquer"
                >
                    📄
                </button>

                ${profile.isDefault ? "" : `
                    <button
                        class="mix-profile-secondary"
                        type="button"
                        data-profile-action="rename"
                        data-profile-id="${escapeHtml(profile.id)}"
                        title="Renommer"
                    >
                        ✏️
                    </button>

                    <button
                        class="mix-profile-secondary mix-profile-delete"
                        type="button"
                        data-profile-action="delete"
                        data-profile-id="${escapeHtml(profile.id)}"
                        title="Supprimer"
                    >
                        🗑️
                    </button>
                `}
            </div>
        </article>
    `).join("");

    return `
        <section class="mix-profiles-panel">
            <div class="mix-profiles-heading">
                <div>
                    <h3>Profils de mix intelligents</h3>
                    <p>
                        ${activeProfile
                            ? `Profil actif : ${escapeHtml(activeProfile.name)}`
                            : "Aucun profil actif"}
                        · ${mixProfiles.length}/${MAX_MIX_PROFILES}
                    </p>
                </div>

                <div class="mix-profiles-heading-actions">
                    <button
                        id="createProfileFromCurrentButton"
                        class="mix-profile-create"
                        type="button"
                    >
                        + Créer depuis les réglages actuels
                    </button>

                    <button
                        id="restoreDefaultProfilesButton"
                        class="mix-profile-restore"
                        type="button"
                    >
                        Restaurer les profils par défaut
                    </button>

                    ${activeProfile ? `
                        <button
                            id="clearActiveProfileButton"
                            class="mix-profile-restore"
                            type="button"
                        >
                            Désactiver
                        </button>
                    ` : ""}
                </div>
            </div>

            <div class="mix-profiles-list">
                ${cards}
            </div>
        </section>
    `;
}

function normalizeTextList(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(
        values
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .slice(0, MAX_EXCLUDED_TEXT_ITEMS)
    )];
}

function normalizeExclusionRules(rules = {}) {
    return {
        excludedArtists: normalizeTextList(
            rules.excludedArtists
        ),
        excludedAlbums: normalizeTextList(
            rules.excludedAlbums
        ),
        excludedTrackUris: normalizeTextList(
            rules.excludedTrackUris
        ).filter((value) => value.startsWith("spotify:track:")),
        hideExplicit: Boolean(rules.hideExplicit),
        minDurationSeconds: clampInteger(
            rules.minDurationSeconds,
            0,
            3600,
            0
        ),
        maxDurationSeconds: clampInteger(
            rules.maxDurationSeconds,
            0,
            7200,
            0
        ),
        excludeLive: Boolean(rules.excludeLive),
        excludeRemix: Boolean(rules.excludeRemix),
        excludeInstrumental: Boolean(rules.excludeInstrumental),
        excludeKaraoke: Boolean(rules.excludeKaraoke)
    };
}

function readExclusionRules() {
    try {
        const raw = localStorage.getItem(EXCLUSION_RULES_KEY);
        const parsed = raw ? JSON.parse(raw) : {};

        return normalizeExclusionRules(parsed);
    } catch (error) {
        console.warn("Règles d’exclusion illisibles :", error);
        return { ...DEFAULT_EXCLUSION_RULES };
    }
}

function saveExclusionRules() {
    try {
        localStorage.setItem(
            EXCLUSION_RULES_KEY,
            JSON.stringify(currentExclusionRules)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer les exclusions :",
            error
        );
    }
}

function splitRuleText(value = "") {
    return normalizeTextList(
        String(value)
            .split(/\n|,/)
            .map((item) => item.trim())
    );
}

function includesExcludedText(value, exclusions) {
    const normalizedValue = normalizeSearchText(value);

    return exclusions.some((exclusion) =>
        normalizedValue.includes(
            normalizeSearchText(exclusion)
        )
    );
}

function getTrackExclusionReason(track, rules) {
    const trackName = track?.name || "";
    const albumName = track?.album?.name || "";
    const artistNames = (track?.artists || [])
        .map((artist) => artist?.name)
        .filter(Boolean);
    const durationSeconds = Math.floor(
        Number(track?.duration_ms || 0) / 1000
    );
    const normalizedName = normalizeSearchText(trackName);

    if (
        track?.uri &&
        rules.excludedTrackUris.includes(track.uri)
    ) {
        return "morceau";
    }

    if (
        rules.excludedArtists.length &&
        artistNames.some((artistName) =>
            includesExcludedText(
                artistName,
                rules.excludedArtists
            )
        )
    ) {
        return "artiste";
    }

    if (
        rules.excludedAlbums.length &&
        includesExcludedText(
            albumName,
            rules.excludedAlbums
        )
    ) {
        return "album";
    }

    if (rules.hideExplicit && track?.explicit === true) {
        return "explicite";
    }

    if (
        rules.minDurationSeconds > 0 &&
        durationSeconds > 0 &&
        durationSeconds < rules.minDurationSeconds
    ) {
        return "trop court";
    }

    if (
        rules.maxDurationSeconds > 0 &&
        durationSeconds > rules.maxDurationSeconds
    ) {
        return "trop long";
    }

    if (
        rules.excludeLive &&
        /\blive\b|en concert|concert\b/.test(normalizedName)
    ) {
        return "live";
    }

    if (
        rules.excludeRemix &&
        /\bremix\b|\brework\b|\bedit\b/.test(normalizedName)
    ) {
        return "remix";
    }

    if (
        rules.excludeInstrumental &&
        /\binstrumental\b/.test(normalizedName)
    ) {
        return "instrumental";
    }

    if (
        rules.excludeKaraoke &&
        /\bkaraoke\b/.test(normalizedName)
    ) {
        return "karaoké";
    }

    return "";
}

function applyExclusionRules(tracks, rules = currentExclusionRules) {
    const summary = {
        inputCount: tracks.length,
        outputCount: 0,
        excludedCount: 0,
        reasons: {}
    };

    const filteredTracks = tracks.filter((track) => {
        const reason = getTrackExclusionReason(track, rules);

        if (!reason) {
            return true;
        }

        summary.excludedCount += 1;
        summary.reasons[reason] =
            (summary.reasons[reason] || 0) + 1;

        return false;
    });

    summary.outputCount = filteredTracks.length;
    lastExclusionSummary = summary;

    return {
        tracks: filteredTracks,
        summary
    };
}

function getExclusionRulesSummary(rules = currentExclusionRules) {
    const parts = [];

    if (rules.excludedArtists.length) {
        parts.push(
            `${rules.excludedArtists.length} artiste` +
            `${rules.excludedArtists.length > 1 ? "s" : ""}`
        );
    }

    if (rules.excludedAlbums.length) {
        parts.push(
            `${rules.excludedAlbums.length} album` +
            `${rules.excludedAlbums.length > 1 ? "s" : ""}`
        );
    }

    if (rules.excludedTrackUris.length) {
        parts.push(
            `${rules.excludedTrackUris.length} morceau` +
            `${rules.excludedTrackUris.length > 1 ? "x" : ""}`
        );
    }

    if (rules.hideExplicit) {
        parts.push("titres explicites");
    }

    if (rules.minDurationSeconds > 0) {
        parts.push(
            `moins de ${rules.minDurationSeconds}s`
        );
    }

    if (rules.maxDurationSeconds > 0) {
        parts.push(
            `plus de ${rules.maxDurationSeconds}s`
        );
    }

    for (const [enabled, label] of [
        [rules.excludeLive, "live"],
        [rules.excludeRemix, "remix"],
        [rules.excludeInstrumental, "instrumentaux"],
        [rules.excludeKaraoke, "karaoké"]
    ]) {
        if (enabled) {
            parts.push(label);
        }
    }

    return parts.length
        ? parts.join(" · ")
        : "Aucune exclusion active";
}

function renderExclusionPanel() {
    const rules = normalizeExclusionRules(
        currentExclusionRules
    );

    return `
        <section class="exclusion-panel">
            <div class="exclusion-panel-heading">
                <div>
                    <h3>Règles d’exclusion</h3>
                    <p>
                        ${escapeHtml(getExclusionRulesSummary(rules))}
                    </p>
                </div>

                <button
                    id="resetExclusionRulesButton"
                    class="exclusion-reset-button"
                    type="button"
                >
                    Réinitialiser
                </button>
            </div>

            <form id="exclusionRulesForm" class="exclusion-form">
                <label class="exclusion-field exclusion-field-wide">
                    <span>Artistes à exclure</span>
                    <textarea
                        name="excludedArtists"
                        rows="3"
                        placeholder="Un artiste par ligne ou séparé par une virgule"
                    >${escapeHtml(rules.excludedArtists.join("\n"))}</textarea>
                </label>

                <label class="exclusion-field exclusion-field-wide">
                    <span>Albums à exclure</span>
                    <textarea
                        name="excludedAlbums"
                        rows="3"
                        placeholder="Un album par ligne ou séparé par une virgule"
                    >${escapeHtml(rules.excludedAlbums.join("\n"))}</textarea>
                </label>

                <label class="exclusion-field">
                    <span>Durée minimale en secondes</span>
                    <input
                        name="minDurationSeconds"
                        type="number"
                        min="0"
                        max="3600"
                        value="${rules.minDurationSeconds}"
                    >
                </label>

                <label class="exclusion-field">
                    <span>Durée maximale en secondes</span>
                    <input
                        name="maxDurationSeconds"
                        type="number"
                        min="0"
                        max="7200"
                        value="${rules.maxDurationSeconds}"
                    >
                </label>

                <label class="exclusion-check">
                    <input
                        name="hideExplicit"
                        type="checkbox"
                        ${rules.hideExplicit ? "checked" : ""}
                    >
                    <span>Masquer les titres explicites</span>
                </label>

                <label class="exclusion-check">
                    <input
                        name="excludeLive"
                        type="checkbox"
                        ${rules.excludeLive ? "checked" : ""}
                    >
                    <span>Éviter les versions live</span>
                </label>

                <label class="exclusion-check">
                    <input
                        name="excludeRemix"
                        type="checkbox"
                        ${rules.excludeRemix ? "checked" : ""}
                    >
                    <span>Éviter les remix</span>
                </label>

                <label class="exclusion-check">
                    <input
                        name="excludeInstrumental"
                        type="checkbox"
                        ${rules.excludeInstrumental ? "checked" : ""}
                    >
                    <span>Éviter les instrumentaux</span>
                </label>

                <label class="exclusion-check">
                    <input
                        name="excludeKaraoke"
                        type="checkbox"
                        ${rules.excludeKaraoke ? "checked" : ""}
                    >
                    <span>Éviter les versions karaoké</span>
                </label>

                <div class="exclusion-actions">
                    <button
                        class="exclusion-save-button"
                        type="submit"
                    >
                        ✓ Enregistrer les exclusions
                    </button>
                </div>
            </form>
        </section>
    `;
}

function saveExclusionRulesFromForm(form) {
    const formData = new FormData(form);

    currentExclusionRules = normalizeExclusionRules({
        ...currentExclusionRules,
        excludedArtists: splitRuleText(
            formData.get("excludedArtists")
        ),
        excludedAlbums: splitRuleText(
            formData.get("excludedAlbums")
        ),
        minDurationSeconds:
            formData.get("minDurationSeconds"),
        maxDurationSeconds:
            formData.get("maxDurationSeconds"),
        hideExplicit: formData.get("hideExplicit") === "on",
        excludeLive: formData.get("excludeLive") === "on",
        excludeRemix: formData.get("excludeRemix") === "on",
        excludeInstrumental:
            formData.get("excludeInstrumental") === "on",
        excludeKaraoke:
            formData.get("excludeKaraoke") === "on"
    });

    saveExclusionRules();
    displayPlaylists(playlistsCache);
    setStatus("Règles d’exclusion enregistrées.");
}

function resetExclusionRules() {
    currentExclusionRules = {
        ...DEFAULT_EXCLUSION_RULES
    };
    saveExclusionRules();
    displayPlaylists(playlistsCache);
    setStatus("Toutes les exclusions ont été réinitialisées.");
}

function readFavoriteSources() {
    try {
        const raw = localStorage.getItem(FAVORITE_SOURCES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((value) => typeof value === "string")
            : [];
    } catch (error) {
        console.warn("Favoris illisibles :", error);
        return [];
    }
}

function saveFavoriteSources() {
    try {
        localStorage.setItem(
            FAVORITE_SOURCES_KEY,
            JSON.stringify([...favoriteSourceKeys])
        );
    } catch (error) {
        console.warn("Impossible d’enregistrer les favoris :", error);
    }
}

function toggleFavoriteSource(sourceKey) {
    if (!sourceKey) {
        return;
    }

    if (favoriteSourceKeys.has(sourceKey)) {
        favoriteSourceKeys.delete(sourceKey);
    } else {
        favoriteSourceKeys.add(sourceKey);
    }

    saveFavoriteSources();
}



function clampInteger(value, minimum, maximum, fallback) {
    const normalizedValue = Number.parseInt(value, 10);

    if (!Number.isFinite(normalizedValue)) {
        return fallback;
    }

    return Math.min(
        maximum,
        Math.max(minimum, normalizedValue)
    );
}

function normalizeShuffleSettings(settings = {}) {
    const preset = Object.hasOwn(
        SHUFFLE_PRESETS,
        settings.preset
    )
        ? settings.preset
        : "balanced";

    const presetSettings =
        SHUFFLE_PRESETS[preset] ||
        SHUFFLE_PRESETS.balanced;

    return {
        preset,
        artistGap: clampInteger(
            settings.artistGap,
            0,
            10,
            presetSettings.artistGap
        ),
        albumGap: clampInteger(
            settings.albumGap,
            0,
            8,
            presetSettings.albumGap
        ),
        recentAvoidance: clampInteger(
            settings.recentAvoidance,
            0,
            3,
            presetSettings.recentAvoidance
        )
    };
}

function getShuffleEngineOptions(settings = DEFAULT_SHUFFLE_SETTINGS) {
    const normalized = normalizeShuffleSettings(settings);

    const recentProfiles = {
        0: {
            recentStartWindow: 0,
            recentTrackPenalty: 0
        },
        1: {
            recentStartWindow: 12,
            recentTrackPenalty: 45
        },
        2: {
            recentStartWindow: 25,
            recentTrackPenalty: 90
        },
        3: {
            recentStartWindow: 40,
            recentTrackPenalty: 160
        }
    };

    const recentOptions =
        recentProfiles[normalized.recentAvoidance] ||
        recentProfiles[2];

    return {
        artistGap: normalized.artistGap,
        albumGap: normalized.albumGap,
        artistPenalty:
            normalized.preset === "strict" ? 210 :
            normalized.preset === "soft" ? 90 : 140,
        albumPenalty:
            normalized.preset === "strict" ? 110 :
            normalized.preset === "soft" ? 45 : 70,
        priorityRules: normalizePriorityRules(
            currentPriorityRules
        ),
        coherenceSettings:
            normalizeCoherenceSettings(
                currentCoherenceSettings
            ),
        intensitySettings:
            normalizeIntensitySettings(
                currentIntensitySettings
            ),
        ...recentOptions
    };
}

function getShufflePresetLabel(settings = DEFAULT_SHUFFLE_SETTINGS) {
    const normalized = normalizeShuffleSettings(settings);

    switch (normalized.preset) {
        case "soft":
            return "Souple";
        case "strict":
            return "Strict";
        case "custom":
            return "Personnalisé";
        case "balanced":
        default:
            return "Équilibré";
    }
}

function getRecentAvoidanceLabel(level = 2) {
    switch (Number(level)) {
        case 0:
            return "Désactivée";
        case 1:
            return "Légère";
        case 3:
            return "Forte";
        case 2:
        default:
            return "Normale";
    }
}

function readSavedMixes() {
    try {
        const raw = localStorage.getItem(SAVED_MIXES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((mix) =>
                mix &&
                typeof mix.id === "string" &&
                typeof mix.name === "string" &&
                Array.isArray(mix.sourceKeys)
            )
            .map((mix) => ({
                id: mix.id,
                name: mix.name.trim() || "Mix sans nom",
                sourceKeys: mix.sourceKeys
                    .filter((key) => typeof key === "string")
                    .slice(0, MAX_MIX_SOURCES),
                createdAt: Number(mix.createdAt || Date.now()),
                updatedAt: Number(mix.updatedAt || mix.createdAt || Date.now()),
                shuffleSettings: normalizeShuffleSettings(
                    mix.shuffleSettings
                ),
                exclusionRules: normalizeExclusionRules(
                    mix.exclusionRules
                ),
                profileId:
                    typeof mix.profileId === "string"
                        ? mix.profileId
                        : "",
                priorityRules: normalizePriorityRules(
                    mix.priorityRules
                ),
                coherenceSettings:
                    normalizeCoherenceSettings(
                        mix.coherenceSettings
                    ),
                intensitySettings:
                    normalizeIntensitySettings(
                        mix.intensitySettings
                    ),
                cleanupSettings:
                    normalizeCleanupSettings(
                        mix.cleanupSettings
                    )
            }))
            .slice(0, MAX_SAVED_MIXES);
    } catch (error) {
        console.warn("Mix enregistrés illisibles :", error);
        return [];
    }
}

function saveSavedMixes() {
    try {
        localStorage.setItem(
            SAVED_MIXES_KEY,
            JSON.stringify(savedMixes)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer les mix locaux :",
            error
        );
    }
}

function createSavedMixId() {
    if (crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        `mix-${Date.now()}-` +
        Math.random().toString(36).slice(2, 10)
    );
}

function getSourceDisplayName(sourceKey) {
    if (sourceKey === "liked") {
        return "Morceaux aimés";
    }

    const playlistId = sourceKey.replace(/^playlist:/, "");
    const playlist = playlistsCache.find(
        (item) => item.id === playlistId
    );

    return playlist?.name || "Playlist indisponible";
}

function getValidSavedMixSourceKeys(mix) {
    return mix.sourceKeys.filter((sourceKey) => {
        if (sourceKey === "liked") {
            return true;
        }

        const playlistId =
            sourceKey.replace(/^playlist:/, "");

        const playlist = playlistsCache.find(
            (item) => item.id === playlistId
        );

        return Boolean(
            playlist &&
            canReadPlaylist(playlist)
        );
    });
}

function saveCurrentSourceSelection() {
    const sourceKeys = [...selectedSourceKeys];

    if (!sourceKeys.length) {
        setStatus(
            "Sélectionne au moins une source avant d’enregistrer le mix.",
            "error"
        );
        return;
    }

    if (savedMixes.length >= MAX_SAVED_MIXES) {
        setStatus(
            `Tu peux enregistrer jusqu’à ${MAX_SAVED_MIXES} mix.`,
            "error"
        );
        return;
    }

    const defaultName =
        `Mix ${savedMixes.length + 1}`;

    const requestedName = window.prompt(
        "Nom du mix enregistré :",
        defaultName
    );

    if (requestedName === null) {
        return;
    }

    const name = requestedName.trim();

    if (!name) {
        setStatus(
            "Le nom du mix ne peut pas être vide.",
            "error"
        );
        return;
    }

    savedMixes = [
        {
            id: createSavedMixId(),
            name: name.slice(0, 60),
            sourceKeys: sourceKeys.slice(
                0,
                MAX_MIX_SOURCES
            ),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            shuffleSettings: {
                ...DEFAULT_SHUFFLE_SETTINGS
            },
            exclusionRules: normalizeExclusionRules(
                currentExclusionRules
            ),
            profileId: activeProfileId,
            priorityRules: normalizePriorityRules(
                currentPriorityRules
            ),
            coherenceSettings:
                normalizeCoherenceSettings(
                    currentCoherenceSettings
                ),
            intensitySettings:
                normalizeIntensitySettings(
                    currentIntensitySettings
                ),
            cleanupSettings:
                normalizeCleanupSettings(
                    currentCleanupSettings
                )
        },
        ...savedMixes
    ];

    saveSavedMixes();
    displayPlaylists(playlistsCache);
    setStatus(`Mix « ${name} » enregistré.`);
}

async function launchSavedMix(mixId) {
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        return false;
    }

    const validSourceKeys =
        getValidSavedMixSourceKeys(mix);

    if (!validSourceKeys.length) {
        setStatus(
            "Les sources de ce mix ne sont plus accessibles.",
            "error"
        );
        return false;
    }

    editingSavedMixId = "";
    configuringSavedMixId = "";
    const assignedProfile = getProfileById(
        mix.profileId
    );

    if (assignedProfile) {
        currentShuffleSettings = normalizeShuffleSettings(
            assignedProfile.shuffleSettings
        );
        currentExclusionRules = normalizeExclusionRules(
            assignedProfile.exclusionRules
        );
        currentPriorityRules = normalizePriorityRules(
            assignedProfile.priorityRules
        );
        currentCoherenceSettings =
            normalizeCoherenceSettings(
                assignedProfile.coherenceSettings
            );
        currentIntensitySettings =
            normalizeIntensitySettings(
                assignedProfile.intensitySettings
            );
        currentCleanupSettings =
            normalizeCleanupSettings(
                assignedProfile.cleanupSettings
            );
        activeProfileId = assignedProfile.id;
        saveActiveProfileId();
    } else {
        currentShuffleSettings = normalizeShuffleSettings(
            mix.shuffleSettings
        );
        currentExclusionRules = normalizeExclusionRules(
            mix.exclusionRules
        );
        currentPriorityRules = normalizePriorityRules(
            mix.priorityRules
        );
        currentCoherenceSettings =
            normalizeCoherenceSettings(
                mix.coherenceSettings
            );
        currentIntensitySettings =
            normalizeIntensitySettings(
                mix.intensitySettings
            );
        currentCleanupSettings =
            normalizeCleanupSettings(
                mix.cleanupSettings
            );
    }
    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();
    saveIntensitySettings();
    saveCleanupSettings();
    pendingSavedMixResumeKey = `saved-mix:${mix.id}`;
    selectedSourceKeys.clear();

    for (const sourceKey of validSourceKeys) {
        selectedSourceKeys.add(sourceKey);
    }

    if (
        validSourceKeys.length <
        mix.sourceKeys.length
    ) {
        setStatus(
            "Certaines sources ne sont plus accessibles et ont été ignorées."
        );
    }

    await createSelectedMix();
    return true;
}


function startEditingSavedMix(mixId) {
    const mix = savedMixes.find((item) => item.id === mixId);

    if (!mix) {
        return;
    }

    editingSavedMixId = mixId;
    selectedSourceKeys.clear();

    for (const sourceKey of getValidSavedMixSourceKeys(mix)) {
        selectedSourceKeys.add(sourceKey);
    }

    librarySearchTerm = "";
    libraryFilter = "all";
    displayPlaylists(playlistsCache);
    setStatus(`Modification du mix « ${mix.name} ». Ajoute ou retire des sources, puis enregistre.`);

    document.getElementById("mixBuilder")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function cancelEditingSavedMix() {
    editingSavedMixId = "";
    selectedSourceKeys.clear();
    displayPlaylists(playlistsCache);
    setStatus("Modification annulée.");
}

function saveEditedMix() {
    const mix = savedMixes.find((item) => item.id === editingSavedMixId);

    if (!mix) {
        editingSavedMixId = "";
        return;
    }

    const sourceKeys = [...selectedSourceKeys].slice(0, MAX_MIX_SOURCES);

    if (!sourceKeys.length) {
        setStatus("Le mix doit contenir au moins une source.", "error");
        return;
    }

    mix.sourceKeys = sourceKeys;
    mix.exclusionRules = normalizeExclusionRules(
        currentExclusionRules
    );
    mix.priorityRules = normalizePriorityRules(
        currentPriorityRules
    );
    mix.coherenceSettings =
        normalizeCoherenceSettings(
            currentCoherenceSettings
        );
    mix.intensitySettings =
        normalizeIntensitySettings(
            currentIntensitySettings
        );
    mix.cleanupSettings =
        normalizeCleanupSettings(
            currentCleanupSettings
        );
    mix.updatedAt = Date.now();
    saveSavedMixes();

    const name = mix.name;
    editingSavedMixId = "";
    selectedSourceKeys.clear();
    displayPlaylists(playlistsCache);
    setStatus(`Mix « ${name} » mis à jour.`);
}


function startConfiguringSavedMix(mixId) {
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        return;
    }

    configuringSavedMixId =
        configuringSavedMixId === mixId ? "" : mixId;

    displayPlaylists(playlistsCache);

    if (configuringSavedMixId) {
        document
            .getElementById(`savedMixSettings-${mixId}`)
            ?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
    }
}

function cancelSavedMixSettings() {
    configuringSavedMixId = "";
    displayPlaylists(playlistsCache);
}

function saveSavedMixSettings(mixId) {
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    const form = document.getElementById(
        `savedMixSettings-${mixId}`
    );

    if (!mix || !form) {
        return;
    }

    const formData = new FormData(form);

    mix.profileId =
        typeof formData.get("profileId") === "string"
            ? formData.get("profileId")
            : "";

    const selectedProfile = getProfileById(mix.profileId);

    mix.shuffleSettings = normalizeShuffleSettings(
        selectedProfile?.shuffleSettings || {
        preset: formData.get("preset"),
        artistGap: formData.get("artistGap"),
        albumGap: formData.get("albumGap"),
        recentAvoidance: formData.get("recentAvoidance")
    });

    mix.exclusionRules = normalizeExclusionRules(
        selectedProfile?.exclusionRules ||
        currentExclusionRules
    );
    mix.priorityRules = normalizePriorityRules(
        selectedProfile?.priorityRules ||
        currentPriorityRules
    );
    mix.coherenceSettings =
        normalizeCoherenceSettings(
            selectedProfile?.coherenceSettings ||
            {
                level: formData.get("coherenceLevel"),
                strengthenFirstThirty:
                    formData.get(
                        "strengthenFirstThirty"
                    ) === "on",
                durationJumpSeconds:
                    formData.get(
                        "durationJumpSeconds"
                    )
            }
        );
    mix.intensitySettings =
        normalizeIntensitySettings(
            selectedProfile?.intensitySettings ||
            {
                curve: formData.get("intensityCurve"),
                startIntensity:
                    formData.get("startIntensity"),
                endIntensity:
                    formData.get("endIntensity"),
                peakIntensity:
                    formData.get("peakIntensity"),
                strength:
                    formData.get("intensityStrength"),
                smoothTransitions:
                    formData.get(
                        "smoothIntensityTransitions"
                    ) === "on"
            }
        );
    mix.updatedAt = Date.now();

    saveSavedMixes();
    configuringSavedMixId = "";
    displayPlaylists(playlistsCache);

    setStatus(
        `Réglages du mix « ${mix.name} » enregistrés.`
    );
}

function renderSavedMixSettings(mix) {
    if (configuringSavedMixId !== mix.id) {
        return "";
    }

    const settings = normalizeShuffleSettings(
        mix.shuffleSettings
    );
    const coherence = normalizeCoherenceSettings(
        mix.coherenceSettings
    );
    const intensity = normalizeIntensitySettings(
        mix.intensitySettings
    );

    return `
        <form
            id="savedMixSettings-${escapeHtml(mix.id)}"
            class="saved-mix-settings"
            data-saved-mix-settings-id="${escapeHtml(mix.id)}"
        >
            <div class="saved-mix-settings-heading">
                <div>
                    <h5>Réglages du mélange</h5>
                    <p>
                        Ces paramètres seront réutilisés
                        à chaque lancement de ce mix.
                    </p>
                </div>
            </div>

            <label class="saved-mix-setting-field">
                <span>Profil associé</span>
                <select name="profileId">
                    <option value="">Aucun profil</option>
                    ${mixProfiles.map((profile) => `
                        <option
                            value="${escapeHtml(profile.id)}"
                            ${mix.profileId === profile.id ? "selected" : ""}
                        >
                            ${escapeHtml(profile.icon)} ${escapeHtml(profile.name)}
                        </option>
                    `).join("")}
                </select>
            </label>

            <label class="saved-mix-setting-field">
                <span>Mode</span>
                <select
                    name="preset"
                    data-shuffle-preset
                >
                    <option value="soft" ${settings.preset === "soft" ? "selected" : ""}>
                        Souple
                    </option>
                    <option value="balanced" ${settings.preset === "balanced" ? "selected" : ""}>
                        Équilibré
                    </option>
                    <option value="strict" ${settings.preset === "strict" ? "selected" : ""}>
                        Strict
                    </option>
                    <option value="custom" ${settings.preset === "custom" ? "selected" : ""}>
                        Personnalisé
                    </option>
                </select>
            </label>

            <label class="saved-mix-setting-field">
                <span>
                    Écart artiste :
                    <strong data-setting-value="artistGap">
                        ${settings.artistGap}
                    </strong>
                    morceau${settings.artistGap > 1 ? "x" : ""}
                </span>
                <input
                    name="artistGap"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value="${settings.artistGap}"
                    data-shuffle-setting="artistGap"
                >
            </label>

            <label class="saved-mix-setting-field">
                <span>
                    Écart album :
                    <strong data-setting-value="albumGap">
                        ${settings.albumGap}
                    </strong>
                    morceau${settings.albumGap > 1 ? "x" : ""}
                </span>
                <input
                    name="albumGap"
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value="${settings.albumGap}"
                    data-shuffle-setting="albumGap"
                >
            </label>

            <label class="saved-mix-setting-field">
                <span>
                    Éviter les morceaux récents :
                    <strong data-setting-value="recentAvoidance">
                        ${getRecentAvoidanceLabel(settings.recentAvoidance)}
                    </strong>
                </span>
                <input
                    name="recentAvoidance"
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value="${settings.recentAvoidance}"
                    data-shuffle-setting="recentAvoidance"
                >
            </label>

            <label class="saved-mix-setting-field">
                <span>Cohérence des transitions</span>
                <select name="coherenceLevel">
                    <option value="free" ${coherence.level === "free" ? "selected" : ""}>
                        Libre
                    </option>
                    <option value="balanced" ${coherence.level === "balanced" ? "selected" : ""}>
                        Équilibrée
                    </option>
                    <option value="fluid" ${coherence.level === "fluid" ? "selected" : ""}>
                        Fluide
                    </option>
                </select>
            </label>

            <label class="saved-mix-setting-field">
                <span>
                    Écart de durée brusque :
                    <strong>
                        ${coherence.durationJumpSeconds}s
                    </strong>
                </span>
                <input
                    name="durationJumpSeconds"
                    type="range"
                    min="60"
                    max="600"
                    step="15"
                    value="${coherence.durationJumpSeconds}"
                >
            </label>

            <label class="saved-mix-setting-field saved-mix-coherence-check">
                <span>
                    <input
                        name="strengthenFirstThirty"
                        type="checkbox"
                        ${coherence.strengthenFirstThirty ? "checked" : ""}
                    >
                    Renforcer dans les 30 premiers
                </span>
            </label>

            <label class="saved-mix-setting-field">
                <span>Courbe d’intensité</span>
                <select name="intensityCurve">
                    <option value="rising" ${intensity.curve === "rising" ? "selected" : ""}>
                        Montée progressive
                    </option>
                    <option value="falling" ${intensity.curve === "falling" ? "selected" : ""}>
                        Descente progressive
                    </option>
                    <option value="stable" ${intensity.curve === "stable" ? "selected" : ""}>
                        Stable
                    </option>
                    <option value="waves" ${intensity.curve === "waves" ? "selected" : ""}>
                        En vagues
                    </option>
                    <option value="central-peak" ${intensity.curve === "central-peak" ? "selected" : ""}>
                        Pic central
                    </option>
                </select>
            </label>

            <label class="saved-mix-setting-field">
                <span>Influence de la courbe</span>
                <select name="intensityStrength">
                    <option value="light" ${intensity.strength === "light" ? "selected" : ""}>
                        Légère
                    </option>
                    <option value="normal" ${intensity.strength === "normal" ? "selected" : ""}>
                        Normale
                    </option>
                    <option value="strong" ${intensity.strength === "strong" ? "selected" : ""}>
                        Forte
                    </option>
                </select>
            </label>

            ${[
                ["startIntensity", "Départ", intensity.startIntensity],
                ["endIntensity", "Fin", intensity.endIntensity],
                ["peakIntensity", "Pic", intensity.peakIntensity]
            ].map(([name, label, value]) => `
                <label class="saved-mix-setting-field">
                    <span>
                        Intensité ${label.toLowerCase()} :
                        <strong>${value}%</strong>
                    </span>
                    <input
                        name="${name}"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value="${value}"
                    >
                </label>
            `).join("")}

            <label class="saved-mix-setting-field saved-mix-coherence-check">
                <span>
                    <input
                        name="smoothIntensityTransitions"
                        type="checkbox"
                        ${intensity.smoothTransitions ? "checked" : ""}
                    >
                    Lisser les changements d’intensité
                </span>
            </label>

            <div class="saved-mix-settings-actions">
                <button
                    class="saved-mix-settings-cancel"
                    type="button"
                    data-saved-mix-settings-action="cancel"
                >
                    Annuler
                </button>

                <button
                    class="saved-mix-settings-save"
                    type="submit"
                >
                    ✓ Enregistrer les réglages
                </button>
            </div>
        </form>
    `;
}

function renameSavedMix(mixId) {
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        return;
    }

    const requestedName = window.prompt(
        "Nouveau nom du mix :",
        mix.name
    );

    if (requestedName === null) {
        return;
    }

    const name = requestedName.trim();

    if (!name) {
        setStatus(
            "Le nom du mix ne peut pas être vide.",
            "error"
        );
        return;
    }

    mix.name = name.slice(0, 60);
    saveSavedMixes();
    displayPlaylists(playlistsCache);
    setStatus(`Mix renommé « ${mix.name} ».`);
}

function deleteSavedMix(mixId) {
    const mix = savedMixes.find(
        (item) => item.id === mixId
    );

    if (!mix) {
        return;
    }

    const confirmed = window.confirm(
        `Supprimer le mix « ${mix.name} » ?`
    );

    if (!confirmed) {
        return;
    }

    savedMixes = savedMixes.filter(
        (item) => item.id !== mixId
    );
    mixSchedules = mixSchedules.filter(
        (schedule) =>
            schedule.mixId !== mixId
    );

    saveSavedMixes();
    saveMixSchedules();
    displayPlaylists(playlistsCache);
    setStatus("Mix enregistré supprimé.");
}

function renderSavedMixesSection() {
    if (!savedMixes.length) {
        return `
            <section class="saved-mixes-panel">
                <div class="saved-mixes-heading">
                    <div>
                        <h3>Mes mix enregistrés</h3>
                        <p>
                            Enregistre une sélection de sources pour
                            la relancer plus tard en un clic.
                        </p>
                    </div>
                    <span>0/${MAX_SAVED_MIXES}</span>
                </div>

                <div class="saved-mixes-empty">
                    Aucun mix enregistré pour le moment.
                </div>
            </section>
        `;
    }

    const cards = savedMixes.map((mix) => {
        const validCount =
            getValidSavedMixSourceKeys(mix).length;
        const totalCount = mix.sourceKeys.length;
        const sourcePreview = mix.sourceKeys
            .slice(0, 3)
            .map(getSourceDisplayName)
            .join(" · ");
        const shuffleSettings =
            normalizeShuffleSettings(
                mix.shuffleSettings
            );
        const assignedProfile = getProfileById(
            mix.profileId
        );

        return `
            <article class="saved-mix-card">
                <div class="saved-mix-card-main">
                    <span class="saved-mix-icon" aria-hidden="true">
                        ✨
                    </span>

                    <div>
                        <h4>${escapeHtml(mix.name)}</h4>
                        <p>
                            ${totalCount} source${totalCount > 1 ? "s" : ""}
                            ${validCount < totalCount
                                ? ` · ${totalCount - validCount} indisponible${totalCount - validCount > 1 ? "s" : ""}`
                                : ""}
                            ${assignedProfile
                                ? ` · Profil ${escapeHtml(assignedProfile.name)}`
                                : ""}
                            · ${getShufflePresetLabel(shuffleSettings)}
                            · ${escapeHtml(
                                getExclusionRulesSummary(
                                    normalizeExclusionRules(
                                        mix.exclusionRules
                                    )
                                )
                            )}
                            · ${escapeHtml(
                                getPriorityRulesSummary(
                                    normalizePriorityRules(
                                        mix.priorityRules
                                    )
                                )
                            )}
                            · ${escapeHtml(
                                getCoherenceSummary(
                                    normalizeCoherenceSettings(
                                        mix.coherenceSettings
                                    )
                                )
                            )}
                            · ${escapeHtml(
                                getIntensitySummary(
                                    normalizeIntensitySettings(
                                        mix.intensitySettings
                                    )
                                )
                            )}
                        </p>
                        <small title="${escapeHtml(
                            mix.sourceKeys
                                .map(getSourceDisplayName)
                                .join(" · ")
                        )}">
                            ${escapeHtml(sourcePreview)}
                            ${totalCount > 3 ? "…" : ""}
                        </small>
                    </div>
                </div>

                <div class="saved-mix-actions">
                    <button
                        class="saved-mix-launch"
                        type="button"
                        data-saved-mix-action="launch"
                        data-saved-mix-id="${escapeHtml(mix.id)}"
                        ${validCount ? "" : "disabled"}
                    >
                        ▶ Lancer
                    </button>

                    <button
                        class="saved-mix-secondary saved-mix-tune"
                        type="button"
                        data-saved-mix-action="settings"
                        data-saved-mix-id="${escapeHtml(mix.id)}"
                        title="Régler le mélange"
                        aria-label="Régler le mélange de ${escapeHtml(mix.name)}"
                    >
                        🎚️
                    </button>

                    <button
                        class="saved-mix-secondary saved-mix-edit"
                        type="button"
                        data-saved-mix-action="edit"
                        data-saved-mix-id="${escapeHtml(mix.id)}"
                        title="Modifier les sources"
                        aria-label="Modifier les sources de ${escapeHtml(mix.name)}"
                    >
                        ⚙️
                    </button>

                    <button
                        class="saved-mix-secondary"
                        type="button"
                        data-saved-mix-action="rename"
                        data-saved-mix-id="${escapeHtml(mix.id)}"
                        title="Renommer"
                        aria-label="Renommer ${escapeHtml(mix.name)}"
                    >
                        ✏️
                    </button>

                    <button
                        class="saved-mix-secondary saved-mix-delete"
                        type="button"
                        data-saved-mix-action="delete"
                        data-saved-mix-id="${escapeHtml(mix.id)}"
                        title="Supprimer"
                        aria-label="Supprimer ${escapeHtml(mix.name)}"
                    >
                        🗑️
                    </button>
                </div>

                ${renderSavedMixSettings(mix)}
            </article>
        `;
    }).join("");

    return `
        <section class="saved-mixes-panel">
            <div class="saved-mixes-heading">
                <div>
                    <h3>Mes mix enregistrés</h3>
                    <p>
                        Relance une combinaison de playlists et de
                        morceaux aimés sans refaire la sélection.
                    </p>
                </div>
                <span>${savedMixes.length}/${MAX_SAVED_MIXES}</span>
            </div>

            <div class="saved-mixes-list">
                ${cards}
            </div>
        </section>
    `;
}



function readMixHistory() {
    try {
        const raw = localStorage.getItem(MIX_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                Array.isArray(item.sourceKeys)
            )
            .map((item) => ({
                id: item.id,
                name: item.name.slice(0, 80),
                sourceKeys: item.sourceKeys
                    .filter((value) => typeof value === "string")
                    .slice(0, MAX_MIX_SOURCES),
                shuffleSettings: normalizeShuffleSettings(
                    item.shuffleSettings
                ),
                createdAt: Number(item.createdAt || Date.now()),
                lastLaunchedAt: Number(
                    item.lastLaunchedAt || item.createdAt || Date.now()
                ),
                launchCount: Math.max(
                    1,
                    Number(item.launchCount || 1)
                ),
                totalTracks: Math.max(
                    0,
                    Number(item.totalTracks || 0)
                ),
                totalTracksSent: Math.max(
                    0,
                    Number(item.totalTracksSent || 0)
                ),
                topArtists: Array.isArray(item.topArtists)
                    ? item.topArtists.slice(0, 5)
                    : [],
                topAlbums: Array.isArray(item.topAlbums)
                    ? item.topAlbums.slice(0, 5)
                    : [],
                topFirstTwentyTracks:
                    Array.isArray(item.topFirstTwentyTracks)
                        ? item.topFirstTwentyTracks.slice(0, 5)
                        : []
            }))
            .slice(0, MAX_MIX_HISTORY_ITEMS);
    } catch (error) {
        console.warn("Historique des mix illisible :", error);
        return [];
    }
}

function saveMixHistory() {
    try {
        localStorage.setItem(
            MIX_HISTORY_KEY,
            JSON.stringify(mixHistory)
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer l’historique des mix :",
            error
        );
    }
}

function countTopValues(values, limit = 5) {
    const counts = new Map();

    for (const value of values) {
        const normalized = String(value || "").trim();

        if (!normalized) {
            continue;
        }

        counts.set(
            normalized,
            (counts.get(normalized) || 0) + 1
        );
    }

    return [...counts.entries()]
        .sort((first, second) =>
            second[1] - first[1] ||
            first[0].localeCompare(second[0], "fr", {
                sensitivity: "base"
            })
        )
        .slice(0, limit)
        .map(([name, count]) => ({
            name,
            count
        }));
}

function buildHistoryStatistics(tracks = selectedTracks) {
    const artists = [];
    const albums = [];
    const firstTwenty = tracks.slice(0, 20);

    for (const track of tracks) {
        for (const artist of track?.artists || []) {
            if (artist?.name) {
                artists.push(artist.name);
            }
        }

        if (track?.album?.name) {
            albums.push(track.album.name);
        }
    }

    return {
        topArtists: countTopValues(artists),
        topAlbums: countTopValues(albums),
        topFirstTwentyTracks: countTopValues(
            firstTwenty.map((track) => track?.name)
        )
    };
}

function registerMixHistoryLaunch({
    name,
    sourceKeys,
    shuffleSettings,
    tracks,
    mixId = "",
    source = "manual",
    slotId = ""
}) {
    const normalizedSourceKeys = [...new Set(
        sourceKeys.filter(
            (value) => typeof value === "string"
        )
    )].slice(0, MAX_MIX_SOURCES);

    const existing = mixHistory.find((item) =>
        item.sourceKeys.length === normalizedSourceKeys.length &&
        item.sourceKeys.every((value) =>
            normalizedSourceKeys.includes(value)
        )
    );

    const now = Date.now();
    const statistics = buildHistoryStatistics(tracks);

    if (existing) {
        existing.name = name || existing.name;
        existing.lastLaunchedAt = now;
        existing.launchCount += 1;
        existing.totalTracks = tracks.length;
        existing.shuffleSettings =
            normalizeShuffleSettings(shuffleSettings);
        existing.topArtists = statistics.topArtists;
        existing.topAlbums = statistics.topAlbums;
        existing.topFirstTwentyTracks =
            statistics.topFirstTwentyTracks;
        activeHistoryId = existing.id;
    } else {
        const item = {
            id: createSavedMixId(),
            name: (name || "Mix Shuffle+").slice(0, 80),
            sourceKeys: normalizedSourceKeys,
            shuffleSettings:
                normalizeShuffleSettings(shuffleSettings),
            createdAt: now,
            lastLaunchedAt: now,
            launchCount: 1,
            totalTracks: tracks.length,
            totalTracksSent: 0,
            ...statistics
        };

        mixHistory = [
            item,
            ...mixHistory
        ].slice(0, MAX_MIX_HISTORY_ITEMS);
        activeHistoryId = item.id;
    }

    mixHistory.sort(
        (first, second) =>
            second.lastLaunchedAt - first.lastLaunchedAt
    );

    saveMixHistory();

    const trackSummary =
        summarizeTracksForIntelligence(
            tracks
        );
    recordIntelligenceEvent({
        type: "mix-generated",
        mixId: mixId || activeHistoryId,
        mixName: name || "Mix Shuffle+",
        source,
        slotId,
        tracks,
        quality: analyzeShuffleOrder(
            tracks,
            getShuffleEngineOptions(
                shuffleSettings
            )
        ),
        durationMs:
            trackSummary.durationMs
    });
}

function addTracksSentToHistory(
    count,
    tracks = [],
    source = "manual",
    deviceName = ""
) {
    if (!activeHistoryId || count <= 0) {
        return;
    }

    const item = mixHistory.find(
        (entry) => entry.id === activeHistoryId
    );

    if (!item) {
        return;
    }

    item.totalTracksSent += count;
    item.lastLaunchedAt = Date.now();
    saveMixHistory();

    const eventTracks = Array.isArray(tracks) &&
        tracks.length
            ? tracks.slice(0, count)
            : selectedTracks.slice(0, count);
    const type = source === "adaptive"
        ? "adaptive"
        : source === "schedule"
            ? "schedule"
            : source === "ios"
                ? "ios"
                : "playback";

    recordIntelligenceEvent({
        type,
        mixId: item.id,
        mixName: item.name,
        source,
        slotId:
            source === "adaptive"
                ? getAdaptiveSlot().id
                : "",
        deviceName,
        tracks: eventTracks,
        trackCount: count
    });
}

function formatHistoryDate(timestamp) {
    if (!timestamp) {
        return "Date inconnue";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(new Date(timestamp));
}

function renderHistoryRanking(title, values = []) {
    if (!values.length) {
        return "";
    }

    return `
        <div class="history-ranking">
            <strong>${escapeHtml(title)}</strong>
            <ol>
                ${values.map((item) => `
                    <li>
                        <span>${escapeHtml(item.name)}</span>
                        <b>${Number(item.count || 0)}</b>
                    </li>
                `).join("")}
            </ol>
        </div>
    `;
}

function renderMixHistorySection() {
    const totalLaunches = mixHistory.reduce(
        (sum, item) => sum + item.launchCount,
        0
    );

    const totalTracksSent = mixHistory.reduce(
        (sum, item) => sum + item.totalTracksSent,
        0
    );

    if (!mixHistory.length) {
        return `
            <section class="mix-history-panel">
                <div class="mix-history-heading">
                    <div>
                        <h3>Historique et statistiques</h3>
                        <p>
                            Les mix lancés et les morceaux envoyés
                            à Spotify apparaîtront ici.
                        </p>
                    </div>
                </div>

                <div class="mix-history-empty">
                    Aucun mix lancé pour le moment.
                </div>
            </section>
        `;
    }

    const items = mixHistory.map((item) => {
        const validSourceCount =
            item.sourceKeys.filter((sourceKey) => {
                if (sourceKey === "liked") {
                    return true;
                }

                const playlistId =
                    sourceKey.replace(/^playlist:/, "");

                return playlistsCache.some(
                    (playlist) =>
                        playlist.id === playlistId &&
                        canReadPlaylist(playlist)
                );
            }).length;

        return `
            <article class="mix-history-card">
                <div class="mix-history-card-heading">
                    <div>
                        <h4>${escapeHtml(item.name)}</h4>
                        <p>
                            Dernier lancement :
                            ${escapeHtml(formatHistoryDate(item.lastLaunchedAt))}
                        </p>
                    </div>

                    <button
                        class="mix-history-delete"
                        type="button"
                        data-history-action="delete"
                        data-history-id="${escapeHtml(item.id)}"
                        title="Supprimer cette entrée"
                    >
                        🗑️
                    </button>
                </div>

                <div class="mix-history-metrics">
                    <span>
                        <strong>${item.launchCount}</strong>
                        lancement${item.launchCount > 1 ? "s" : ""}
                    </span>
                    <span>
                        <strong>${item.totalTracks}</strong>
                        morceaux dans le dernier ordre
                    </span>
                    <span>
                        <strong>${item.totalTracksSent}</strong>
                        morceaux envoyés
                    </span>
                </div>

                <div class="mix-history-rankings">
                    ${renderHistoryRanking(
                        "Artistes les plus présents",
                        item.topArtists
                    )}
                    ${renderHistoryRanking(
                        "Albums les plus présents",
                        item.topAlbums
                    )}
                    ${renderHistoryRanking(
                        "Titres souvent dans les 20 premiers",
                        item.topFirstTwentyTracks
                    )}
                </div>

                <div class="mix-history-actions">
                    <button
                        class="mix-history-relaunch"
                        type="button"
                        data-history-action="relaunch"
                        data-history-id="${escapeHtml(item.id)}"
                        ${validSourceCount ? "" : "disabled"}
                    >
                        ▶ Relancer ce mix
                    </button>
                </div>
            </article>
        `;
    }).join("");

    return `
        <section class="mix-history-panel">
            <div class="mix-history-heading">
                <div>
                    <h3>Historique et statistiques</h3>
                    <p>
                        ${totalLaunches} lancement${totalLaunches > 1 ? "s" : ""}
                        · ${totalTracksSent} morceau${totalTracksSent > 1 ? "x" : ""}
                        envoyé${totalTracksSent > 1 ? "s" : ""}
                    </p>
                </div>

                <button
                    id="clearMixHistoryButton"
                    class="mix-history-clear"
                    type="button"
                >
                    Vider l’historique
                </button>
            </div>

            <div class="mix-history-list">
                ${items}
            </div>
        </section>
    `;
}

async function relaunchHistoryItem(historyId) {
    const item = mixHistory.find(
        (entry) => entry.id === historyId
    );

    if (!item) {
        return;
    }

    const validSourceKeys = item.sourceKeys.filter(
        (sourceKey) => {
            if (sourceKey === "liked") {
                return true;
            }

            const playlistId =
                sourceKey.replace(/^playlist:/, "");

            const playlist = playlistsCache.find(
                (entry) => entry.id === playlistId
            );

            return Boolean(
                playlist &&
                canReadPlaylist(playlist)
            );
        }
    );

    if (!validSourceKeys.length) {
        setStatus(
            "Les sources de ce mix ne sont plus accessibles.",
            "error"
        );
        return;
    }

    selectedSourceKeys.clear();

    for (const sourceKey of validSourceKeys) {
        selectedSourceKeys.add(sourceKey);
    }

    currentShuffleSettings =
        normalizeShuffleSettings(item.shuffleSettings);
    pendingSavedMixResumeKey =
        `history:${item.id}`;

    await createSelectedMix();
}

function deleteHistoryItem(historyId) {
    mixHistory = mixHistory.filter(
        (item) => item.id !== historyId
    );
    saveMixHistory();
    displayPlaylists(playlistsCache);
    setStatus("Entrée d’historique supprimée.");
}

function clearMixHistory() {
    if (!mixHistory.length) {
        return;
    }

    const confirmed = window.confirm(
        "Vider tout l’historique des mix et toutes les statistiques ?"
    );

    if (!confirmed) {
        return;
    }

    mixHistory = [];
    activeHistoryId = "";
    saveMixHistory();
    displayPlaylists(playlistsCache);
    setStatus("Historique des mix vidé.");
}

function readTrackHistoryForBackup() {
    try {
        const raw = localStorage.getItem(TRACK_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed)
            ? parsed
                .filter((value) => typeof value === "string")
                .slice(0, MAX_IMPORTED_HISTORY)
            : [];
    } catch (error) {
        console.warn("Historique local illisible :", error);
        return [];
    }
}

function normalizeImportedFavorites(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(
        values
            .filter((value) =>
                typeof value === "string" &&
                (
                    value === "liked" ||
                    /^playlist:[A-Za-z0-9]+$/.test(value)
                )
            )
            .slice(0, MAX_IMPORTED_FAVORITES)
    )];
}

function normalizeImportedHistory(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(
        values
            .filter((value) =>
                typeof value === "string" &&
                value.startsWith("spotify:track:")
            )
            .slice(0, MAX_IMPORTED_HISTORY)
    )];
}

function normalizeImportedMixes(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    const seenIds = new Set();

    return values
        .filter((mix) =>
            mix &&
            typeof mix === "object" &&
            typeof mix.name === "string" &&
            Array.isArray(mix.sourceKeys)
        )
        .map((mix) => {
            let id =
                typeof mix.id === "string" && mix.id.trim()
                    ? mix.id.trim().slice(0, 120)
                    : createSavedMixId();

            if (seenIds.has(id)) {
                id = createSavedMixId();
            }

            seenIds.add(id);

            const sourceKeys = [...new Set(
                mix.sourceKeys.filter((sourceKey) =>
                    typeof sourceKey === "string" &&
                    (
                        sourceKey === "liked" ||
                        /^playlist:[A-Za-z0-9]+$/.test(sourceKey)
                    )
                )
            )].slice(0, MAX_MIX_SOURCES);

            return {
                id,
                name:
                    mix.name.trim().slice(0, 60) ||
                    "Mix sans nom",
                sourceKeys,
                createdAt: Number.isFinite(Number(mix.createdAt))
                    ? Number(mix.createdAt)
                    : Date.now(),
                updatedAt: Number.isFinite(Number(mix.updatedAt))
                    ? Number(mix.updatedAt)
                    : Date.now(),
                shuffleSettings: normalizeShuffleSettings(
                    mix.shuffleSettings
                ),
                exclusionRules: normalizeExclusionRules(
                    mix.exclusionRules
                ),
                profileId:
                    typeof mix.profileId === "string"
                        ? mix.profileId
                        : "",
                priorityRules: normalizePriorityRules(
                    mix.priorityRules
                ),
                coherenceSettings:
                    normalizeCoherenceSettings(
                        mix.coherenceSettings
                    ),
                intensitySettings:
                    normalizeIntensitySettings(
                        mix.intensitySettings
                    )
            };
        })
        .filter((mix) => mix.sourceKeys.length)
        .slice(0, MAX_SAVED_MIXES);
}

function normalizeImportedPreferences(preferences = {}) {
    const allowedFilters = new Set([
        "all",
        "favorites",
        "personal",
        "collaborative",
        "followed"
    ]);

    const allowedSorts = new Set([
        "name-asc",
        "name-desc",
        "tracks-desc",
        "tracks-asc",
        "modified-desc",
        "modified-asc",
        "recent-desc",
        "recent-none"
    ]);

    return {
        searchTerm:
            typeof preferences.searchTerm === "string"
                ? preferences.searchTerm.slice(0, 160)
                : "",
        filter: allowedFilters.has(preferences.filter)
            ? preferences.filter
            : "all",
        sort: allowedSorts.has(preferences.sort)
            ? preferences.sort
            : "name-asc"
    };
}

function buildBackupPayload() {
    return {
        format: BACKUP_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        spotifyUserId: currentUserId || "",
        data: {
            favoriteSourceKeys: [...favoriteSourceKeys],
            savedMixes,
            preferences: {
                searchTerm: librarySearchTerm,
                filter: libraryFilter,
                sort: librarySort
            },
            recentTrackUris: readTrackHistoryForBackup(),
            playbackQueueStates: readPlaybackQueueStates(),
            mixHistory,
            exclusionRules: currentExclusionRules,
            mixProfiles,
            activeProfileId,
            priorityRules: currentPriorityRules,
            coherenceSettings: currentCoherenceSettings,
            intensitySettings: currentIntensitySettings,
            adaptiveSettings: currentAdaptiveSettings,
            cleanupSettings: currentCleanupSettings,
            iosQuickPlaySettings,
            iosCommands,
            iosCommandHistory,
            adaptiveDjMenuSettings,
            adaptiveDjMenuHistory,
            adaptiveLearningState,
            intelligenceAnalytics,
            mixSchedules
        }
    };
}

function downloadBackupFile() {
    try {
        const payload = buildBackupPayload();
        const blob = new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const date = new Date();
        const datePart = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        const link = document.createElement("a");
        link.href = url;
        link.download = `shuffleplus-sauvegarde-${datePart}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setStatus(
            `Sauvegarde exportée : ${savedMixes.length} mix et ` +
            `${favoriteSourceKeys.size} favori${favoriteSourceKeys.size > 1 ? "s" : ""}.`
        );
    } catch (error) {
        console.error(error);
        setStatus(
            "Impossible de créer le fichier de sauvegarde.",
            "error"
        );
    }
}

function validateBackupPayload(payload) {
    if (
        !payload ||
        typeof payload !== "object" ||
        payload.format !== BACKUP_FORMAT ||
        Number(payload.schemaVersion) !== BACKUP_SCHEMA_VERSION ||
        !payload.data ||
        typeof payload.data !== "object"
    ) {
        throw new Error(
            "Ce fichier n’est pas une sauvegarde Shuffle+ compatible."
        );
    }

    return {
        favoriteSourceKeys: normalizeImportedFavorites(
            payload.data.favoriteSourceKeys
        ),
        savedMixes: normalizeImportedMixes(
            payload.data.savedMixes
        ),
        preferences: normalizeImportedPreferences(
            payload.data.preferences
        ),
        recentTrackUris: normalizeImportedHistory(
            payload.data.recentTrackUris
        ),
        playbackQueueStates:
            payload.data.playbackQueueStates &&
            typeof payload.data.playbackQueueStates === "object"
                ? payload.data.playbackQueueStates
                : {},
        mixHistory:
            Array.isArray(payload.data.mixHistory)
                ? payload.data.mixHistory
                : [],
        exclusionRules: normalizeExclusionRules(
            payload.data.exclusionRules
        ),
        mixProfiles:
            Array.isArray(payload.data.mixProfiles)
                ? payload.data.mixProfiles
                    .map((profile) =>
                        normalizeMixProfile(profile)
                    )
                    .slice(0, MAX_MIX_PROFILES)
                : DEFAULT_MIX_PROFILES.map(
                    (profile) => normalizeMixProfile(profile)
                ),
        activeProfileId:
            typeof payload.data.activeProfileId === "string"
                ? payload.data.activeProfileId
                : "",
        priorityRules: normalizePriorityRules(
            payload.data.priorityRules
        ),
        coherenceSettings:
            normalizeCoherenceSettings(
                payload.data.coherenceSettings
            ),
        intensitySettings:
            normalizeIntensitySettings(
                payload.data.intensitySettings
            ),
        adaptiveSettings:
            normalizeAdaptiveSettings(
                payload.data.adaptiveSettings
            ),
        cleanupSettings:
            normalizeCleanupSettings(
                payload.data.cleanupSettings
            ),
        iosQuickPlaySettings:
            normalizeIosQuickPlaySettings(
                payload.data.iosQuickPlaySettings
            ),
        iosCommands:
            Array.isArray(
                payload.data.iosCommands
            )
                ? payload.data.iosCommands
                    .map((command) =>
                        normalizeIosCommand(command)
                    )
                    .slice(0, MAX_IOS_COMMANDS)
                : [],
        iosCommandHistory:
            normalizeIosCommandHistory(
                payload.data.iosCommandHistory
            ),
        adaptiveDjMenuSettings:
            normalizeAdaptiveDjMenuSettings(
                payload.data.adaptiveDjMenuSettings
            ),
        adaptiveDjMenuHistory:
            normalizeAdaptiveDjMenuHistory(
                payload.data.adaptiveDjMenuHistory
            ),
        adaptiveLearningState:
            normalizeAdaptiveLearningState(
                payload.data.adaptiveLearningState ||
                DEFAULT_ADAPTIVE_LEARNING_STATE
            ),
        intelligenceAnalytics:
            normalizeIntelligenceAnalytics(
                payload.data.intelligenceAnalytics ||
                DEFAULT_INTELLIGENCE_ANALYTICS
            ),
        mixSchedules:
            Array.isArray(payload.data.mixSchedules)
                ? payload.data.mixSchedules
                    .map((schedule) =>
                        normalizeMixSchedule(schedule)
                    )
                    .filter((schedule) =>
                        schedule.mixId
                    )
                    .slice(0, MAX_MIX_SCHEDULES)
                : [],
        spotifyUserId:
            typeof payload.spotifyUserId === "string"
                ? payload.spotifyUserId
                : ""
    };
}

async function importBackupFile(file) {
    if (!file) {
        return;
    }

    if (
        file.size > 2 * 1024 * 1024 ||
        !file.name.toLowerCase().endsWith(".json")
    ) {
        setStatus(
            "Sélectionne un fichier JSON Shuffle+ de moins de 2 Mo.",
            "error"
        );
        return;
    }

    try {
        const text = await file.text();
        const imported = validateBackupPayload(
            JSON.parse(text)
        );

        const accountWarning =
            imported.spotifyUserId &&
            currentUserId &&
            imported.spotifyUserId !== currentUserId
                ? "\n\nAttention : cette sauvegarde vient d’un autre compte Spotify."
                : "";

        const confirmed = window.confirm(
            `Importer ${imported.savedMixes.length} mix, ` +
            `${imported.favoriteSourceKeys.length} favori` +
            `${imported.favoriteSourceKeys.length > 1 ? "s" : ""} ` +
            `et les préférences de l’interface ?\n\n` +
            `Les données locales actuelles seront remplacées.` +
            accountWarning
        );

        if (!confirmed) {
            setStatus("Importation annulée.");
            return;
        }

        favoriteSourceKeys.clear();

        for (const sourceKey of imported.favoriteSourceKeys) {
            favoriteSourceKeys.add(sourceKey);
        }

        savedMixes = imported.savedMixes;
        librarySearchTerm = imported.preferences.searchTerm;
        libraryFilter = imported.preferences.filter;
        librarySort = imported.preferences.sort;
        editingSavedMixId = "";
        configuringSavedMixId = "";
        selectedSourceKeys.clear();

        saveFavoriteSources();
        saveSavedMixes();
        localStorage.setItem(
            TRACK_HISTORY_KEY,
            JSON.stringify(imported.recentTrackUris)
        );
        writePlaybackQueueStates(imported.playbackQueueStates);
        mixHistory = imported.mixHistory
            .filter((item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                Array.isArray(item.sourceKeys)
            )
            .slice(0, MAX_MIX_HISTORY_ITEMS);
        saveMixHistory();
        currentExclusionRules =
            imported.exclusionRules;
        saveExclusionRules();
        mixProfiles = imported.mixProfiles;
        activeProfileId = mixProfiles.some(
            (profile) =>
                profile.id === imported.activeProfileId
        )
            ? imported.activeProfileId
            : "";
        saveMixProfiles();
        saveActiveProfileId();
        currentPriorityRules =
            imported.priorityRules;
        savePriorityRules();
        currentCoherenceSettings =
            imported.coherenceSettings;
        saveCoherenceSettings();
        currentIntensitySettings =
            imported.intensitySettings;
        saveIntensitySettings();
        currentAdaptiveSettings =
            imported.adaptiveSettings;
        saveAdaptiveSettings();
        currentCleanupSettings =
            imported.cleanupSettings;
        saveCleanupSettings();
        iosQuickPlaySettings =
            imported.iosQuickPlaySettings;
        saveIosQuickPlaySettings();
        iosCommands =
            imported.iosCommands.length
                ? imported.iosCommands
                : migrateLegacyIosCommand();
        saveIosCommands();
        iosCommandHistory =
            imported.iosCommandHistory;
        saveIosCommandHistory();
        adaptiveDjMenuSettings =
            imported.adaptiveDjMenuSettings;
        saveAdaptiveDjMenuSettings();
        adaptiveDjMenuHistory =
            imported.adaptiveDjMenuHistory;
        saveAdaptiveDjMenuHistory();
        adaptiveLearningState =
            imported.adaptiveLearningState;
        saveAdaptiveLearningState();
        intelligenceAnalytics =
            imported.intelligenceAnalytics;
        saveIntelligenceAnalytics();
        mixSchedules =
            imported.mixSchedules;
        saveMixSchedules();

        displayPlaylists(playlistsCache);
        setStatus(
            `Sauvegarde importée : ${savedMixes.length} mix, ` +
            `${favoriteSourceKeys.size} favori` +
            `${favoriteSourceKeys.size > 1 ? "s" : ""} et ` +
            `${imported.recentTrackUris.length} titre` +
            `${imported.recentTrackUris.length > 1 ? "s" : ""} dans l’historique local.`
        );
    } catch (error) {
        console.error(error);
        setStatus(
            error.message ||
            "Impossible d’importer cette sauvegarde.",
            "error"
        );
    }
}

function renderBackupPanel() {
    return `
        <section class="backup-panel" aria-label="Sauvegarde des données">
            <div class="backup-panel-copy">
                <h3>Sauvegarde et restauration</h3>
                <p>
                    Exporte tes mix, leurs réglages, tes favoris,
                    les filtres et l’historique local de Shuffle+.
                </p>
            </div>

            <div class="backup-panel-actions">
                <button
                    id="exportBackupButton"
                    class="backup-export-button"
                    type="button"
                >
                    ⬇ Exporter mes données
                </button>

                <button
                    id="importBackupButton"
                    class="backup-import-button"
                    type="button"
                >
                    ⬆ Importer une sauvegarde
                </button>

                <input
                    id="backupFileInput"
                    class="backup-file-input"
                    type="file"
                    accept="application/json,.json"
                    aria-label="Choisir une sauvegarde Shuffle+"
                >
            </div>
        </section>
    `;
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


function readRecentActivityCache() {
    try {
        const rawCache = localStorage.getItem(
            RECENT_ACTIVITY_CACHE_KEY
        );

        if (!rawCache) {
            return null;
        }

        const parsedCache = JSON.parse(rawCache);
        const age = Date.now() - Number(parsedCache.savedAt || 0);

        if (
            age < 0 ||
            age >= RECENT_ACTIVITY_CACHE_TTL ||
            !parsedCache.activity ||
            typeof parsedCache.activity !== "object"
        ) {
            return null;
        }

        return parsedCache.activity;
    } catch (error) {
        console.warn(
            "Cache des écoutes récentes illisible :",
            error
        );
        return null;
    }
}

function writeRecentActivityCache(activity) {
    try {
        localStorage.setItem(
            RECENT_ACTIVITY_CACHE_KEY,
            JSON.stringify({
                savedAt: Date.now(),
                activity
            })
        );
    } catch (error) {
        console.warn(
            "Impossible d’enregistrer le cache des écoutes :",
            error
        );
    }
}

function applyRecentActivity(activity = {}) {
    playlistRecentActivity.clear();

    for (const [playlistId, timestamp] of Object.entries(activity)) {
        const normalizedTimestamp = Number(timestamp || 0);

        if (playlistId && normalizedTimestamp > 0) {
            playlistRecentActivity.set(
                playlistId,
                normalizedTimestamp
            );
        }
    }
}

function formatRecentActivity(timestamp) {
    if (!timestamp) {
        return "Aucune écoute récente détectée";
    }

    const elapsed = Math.max(0, Date.now() - timestamp);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsed < minute) {
        return "Écoutée à l’instant";
    }

    if (elapsed < hour) {
        const minutes = Math.floor(elapsed / minute);
        return `Écoutée il y a ${minutes} min`;
    }

    if (elapsed < day) {
        const hours = Math.floor(elapsed / hour);
        return `Écoutée il y a ${hours} h`;
    }

    const days = Math.floor(elapsed / day);

    if (days === 1) {
        return "Écoutée hier";
    }

    return `Écoutée il y a ${days} jours`;
}

async function ensureRecentActivityLoaded() {
    if (recentActivityLoading) {
        return;
    }

    const cachedActivity = readRecentActivityCache();

    if (cachedActivity) {
        applyRecentActivity(cachedActivity);
        return;
    }

    recentActivityLoading = true;
    setStatus("Analyse des écoutes récentes…");

    try {
        const activity =
            await getRecentlyPlayedPlaylistActivity(4);

        applyRecentActivity(activity);
        writeRecentActivityCache(activity);
    } catch (error) {
        console.error(error);

        if (error.status === 403) {
            throw new Error(
                "Spotify refuse l’accès aux écoutes récentes. " +
                "Ajoute le scope user-read-recently-played, " +
                "puis déconnecte-toi et reconnecte-toi."
            );
        }

        throw error;
    } finally {
        recentActivityLoading = false;
        setStatus("");
    }
}

function getFilteredAndSortedPlaylists(playlists) {
    const normalizedQuery = normalizeSearchText(librarySearchTerm);

    const filtered = playlists.filter((playlist) => {
        const category = getPlaylistCategory(playlist);
        const sourceKey = getPlaylistSourceKey(playlist.id);
        const matchesFilter =
            libraryFilter === "all" ||
            category === libraryFilter ||
            (libraryFilter === "favorites" &&
                favoriteSourceKeys.has(sourceKey));

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
        const firstRecentAt =
            playlistRecentActivity.get(first.id) || 0;
        const secondRecentAt =
            playlistRecentActivity.get(second.id) || 0;

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
            case "recent-desc":
                return (
                    secondRecentAt - firstRecentAt ||
                    firstName.localeCompare(secondName, "fr", {
                        sensitivity: "base"
                    })
                );
            case "recent-none": {
                const firstWasRecent = firstRecentAt > 0;
                const secondWasRecent = secondRecentAt > 0;

                if (firstWasRecent !== secondWasRecent) {
                    return firstWasRecent ? 1 : -1;
                }

                return firstName.localeCompare(secondName, "fr", {
                    sensitivity: "base"
                });
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
    if (
        libraryFilter !== "all" &&
        !(libraryFilter === "favorites" &&
            favoriteSourceKeys.has("liked"))
    ) {
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
    const saveSelectionButton = document.getElementById(
        "saveSourceSelectionButton"
    );
    const saveEditedMixButton = document.getElementById(
        "saveEditedMixButton"
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

    if (saveSelectionButton) {
        saveSelectionButton.disabled =
            selectedCount < 1 ||
            savedMixes.length >= MAX_SAVED_MIXES;
    }

    if (saveEditedMixButton) {
        saveEditedMixButton.disabled = selectedCount < 1;
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
    playbackQueueCursor = 0;
    playbackQueueResumeKey = "";
    pendingSavedMixResumeKey = "";

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
            const favorite = favoriteSourceKeys.has(sourceKey);

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

            const recentAt =
                playlistRecentActivity.get(
                    playlist.id
                ) || null;

            const recentText =
                librarySort.startsWith("recent")
                    ? ` · ${formatRecentActivity(recentAt)}`
                    : "";

            const availabilityText = readable
                ? `${total} morceau${total > 1 ? "x" : ""}${modificationText}${recentText}`
                : "Playlist suivie · accès limité";

            return `
                <article
                    class="playlist-card source-card ${selected ? "is-selected" : ""} ${favorite ? "is-favorite" : ""} ${readable ? "" : "is-disabled"}"
                    data-source-key="${escapeHtml(sourceKey)}"
                >
                    <button
                        class="source-favorite-button"
                        type="button"
                        data-favorite-source-key="${escapeHtml(sourceKey)}"
                        aria-label="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                        title="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                    >
                        ${favorite ? "★" : "☆"}
                    </button>

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
    const likedFavorite = favoriteSourceKeys.has("liked");

    const likedTracksCard = likedVisible
        ? `
            <article
                class="playlist-card source-card liked-tracks-card ${likedSelected ? "is-selected" : ""} ${likedFavorite ? "is-favorite" : ""}"
                data-source-key="liked"
            >
                <button
                    class="source-favorite-button"
                    type="button"
                    data-favorite-source-key="liked"
                    aria-label="${likedFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                    title="${likedFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                >
                    ${likedFavorite ? "★" : "☆"}
                </button>

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

            ${renderAppMenu()}

            <div
                class="app-menu-page
                ${activeAppMenu === "music"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="music"
            >
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
    <option value="all" ${libraryFilter === "all" ? "selected" : ""}>
        Toutes les sources
    </option>

    <option value="favorites" ${libraryFilter === "favorites" ? "selected" : ""}>
        ⭐ Mes favoris
    </option>

    <option value="personal" ${libraryFilter === "personal" ? "selected" : ""}>
        Mes playlists
    </option>

    <option value="collaborative" ${libraryFilter === "collaborative" ? "selected" : ""}>
        Collaboratives
    </option>

    <option value="followed" ${libraryFilter === "followed" ? "selected" : ""}>
        Playlists suivies
    </option>
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
                        <option value="recent-desc" ${librarySort === "recent-desc" ? "selected" : ""}>Écoutées récemment</option>
                        <option value="recent-none" ${librarySort === "recent-none" ? "selected" : ""}>Jamais retrouvées récemment</option>
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
                ${modificationDatesLoading
            ? `Analyse des playlists : ${modificationDatesProgress.completed}/${modificationDatesProgress.total}`
            : ""
        }
            </p>

            <section id="mixBuilder" class="mix-builder ${editingSavedMixId ? "is-editing" : ""}" aria-label="Créateur de mix">
                <div class="mix-builder-copy">
                    <strong>${editingSavedMixId ? "Modifier le mix enregistré" : "Créer un mix multi-sources"}</strong>
                    <small>${editingSavedMixId ? "Ajoute ou retire des sources, puis sauvegarde" : `Jusqu’à ${MAX_MIX_SOURCES} sources`}</small>
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

                    ${editingSavedMixId ? `
                    <button
                        id="cancelEditSavedMixButton"
                        class="mix-secondary-button"
                        type="button"
                    >
                        Annuler
                    </button>

                    <button
                        id="saveEditedMixButton"
                        class="mix-create-button"
                        type="button"
                        ${selectedSourceKeys.size ? "" : "disabled"}
                    >
                        ✓ Enregistrer les modifications
                    </button>
                    ` : `
                    <button
                        id="saveSourceSelectionButton"
                        class="mix-secondary-button"
                        type="button"
                        ${selectedSourceKeys.size ? "" : "disabled"}
                    >
                        💾 Enregistrer la sélection
                    </button>

                    <button
                        id="createMixButton"
                        class="mix-create-button"
                        type="button"
                        ${selectedSourceKeys.size ? "" : "disabled"}
                    >
                        🧠 Créer le mix
                    </button>
                    `}

                    ${editingSavedMixId ? "" : ""}
                </div>
            </section>

            <p class="access-note">
                Recherche, filtre et trie tes sources. Les playlists grisées
                restent visibles, mais leur contenu n’est pas lisible par Shuffle+.
            </p>

            ${emptyState}
            </div>

            <div
                class="app-menu-page
                ${activeAppMenu === "mixes"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="mixes"
            >
                ${renderIosCommandsPanel()}
                ${renderSavedMixesSection()}
                ${renderMixSchedulesSection()}
                ${renderMixHistorySection()}
            </div>

            <div
                class="app-menu-page
                ${activeAppMenu === "adaptive"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="adaptive"
            >
                ${renderAdaptiveDjMenu()}
                ${renderAdaptivePanel()}
            </div>

            <div
                class="app-menu-page
                ${activeAppMenu === "intelligence"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="intelligence"
            >
                ${renderIntelligenceDashboard()}
            </div>

            <div
                class="app-menu-page
                ${activeAppMenu === "settings"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="settings"
            >
                ${renderPwaSettingsPanel()}
                ${renderBackupPanel()}
                ${renderCleanupPanel()}
                ${renderMixProfilesSection()}
                ${renderPriorityPanel()}
                ${renderCoherencePanel()}
                ${renderIntensityPanel()}
                ${renderExclusionPanel()}
            </div>
        </section>
    `;

    updateMixSelectionControls();
}


function getTrackStableKey(track, fallbackIndex = 0) {
    return (
        track?.uri ||
        track?.id ||
        `${track?.name || "track"}-${fallbackIndex}`
    );
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
    const trackKey = escapeHtml(
        getTrackStableKey(track, index)
    );

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
        <li
            class="track-row"
            draggable="true"
            data-track-index="${index}"
            data-track-key="${trackKey}"
        >
            <span
                class="track-drag-handle"
                title="Faire glisser pour déplacer"
                aria-hidden="true"
            >
                ⋮⋮
            </span>

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

            <div class="track-editor-actions">
                <button
                    class="track-move-button"
                    type="button"
                    data-track-action="up"
                    data-track-index="${index}"
                    title="Monter"
                    aria-label="Monter ${trackName}"
                    ${index === 0 ? "disabled" : ""}
                >
                    ↑
                </button>

                <button
                    class="track-move-button"
                    type="button"
                    data-track-action="down"
                    data-track-index="${index}"
                    title="Descendre"
                    aria-label="Descendre ${trackName}"
                    ${index === selectedTracks.length - 1 ? "disabled" : ""}
                >
                    ↓
                </button>

                <button
                    class="track-priority-button ${currentPriorityRules.favoredTrackUris.includes(track.uri) ? "is-favored" : ""}"
                    type="button"
                    data-track-action="favorite"
                    data-track-index="${index}"
                    title="${currentPriorityRules.favoredTrackUris.includes(track.uri) ? "Retirer des priorités" : "Favoriser ce morceau"}"
                    aria-label="${currentPriorityRules.favoredTrackUris.includes(track.uri) ? "Retirer" : "Favoriser"} ${trackName}"
                >
                    ${currentPriorityRules.favoredTrackUris.includes(track.uri) ? "★" : "☆"}
                </button>

                <button
                    class="track-exclude-button"
                    type="button"
                    data-track-action="exclude"
                    data-track-index="${index}"
                    title="Exclure définitivement ce morceau"
                    aria-label="Exclure ${trackName}"
                >
                    🚫
                </button>

                <button
                    class="track-remove-button"
                    type="button"
                    data-track-action="remove"
                    data-track-index="${index}"
                    title="Retirer de cet ordre"
                    aria-label="Retirer ${trackName}"
                >
                    ✕
                </button>
            </div>
        </li>
    `;
}

function getVisibleTrackEntries() {
    const normalizedQuery =
        normalizeSearchText(trackSearchTerm);

    return selectedTracks
        .map((track, index) => ({
            track,
            index
        }))
        .filter(({ track }) => {
            if (!normalizedQuery) {
                return true;
            }

            const searchableText = normalizeSearchText([
                track?.name,
                ...(track?.artists || []).map(
                    (artist) => artist?.name
                ),
                track?.album?.name
            ].filter(Boolean).join(" "));

            return searchableText.includes(normalizedQuery);
        });
}

function renderTrackList() {
    const trackListElement = document.getElementById("trackList");
    const trackCountElement = document.getElementById(
        "trackEditorCount"
    );
    const resetButton = document.getElementById(
        "resetGeneratedOrderButton"
    );

    if (!trackListElement) {
        return;
    }

    const visibleEntries = getVisibleTrackEntries();

    trackListElement.innerHTML = visibleEntries.length
        ? visibleEntries
            .map(({ track, index }) =>
                createTrackRow(track, index)
            )
            .join("")
        : `
            <li class="track-editor-empty">
                Aucun morceau ne correspond à cette recherche.
            </li>
        `;

    if (trackCountElement) {
        trackCountElement.textContent =
            `${visibleEntries.length} affiché${visibleEntries.length > 1 ? "s" : ""} ` +
            `sur ${selectedTracks.length}`;
    }

    if (resetButton) {
        resetButton.disabled =
            !originalGeneratedOrder.length;
    }
}

function moveTrack(fromIndex, toIndex) {
    if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= selectedTracks.length ||
        toIndex >= selectedTracks.length ||
        fromIndex === toIndex
    ) {
        return;
    }

    const [movedTrack] = selectedTracks.splice(
        fromIndex,
        1
    );

    selectedTracks.splice(toIndex, 0, movedTrack);
    markQueueChanged();
    renderTrackList();
    renderShuffleStats(
        analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
    );
}


function excludeTrackAt(index) {
    const track = selectedTracks[index];

    if (!track?.uri) {
        return;
    }

    const confirmed = window.confirm(
        `Exclure définitivement « ${track.name || "ce morceau"} » des prochains mix ?`
    );

    if (!confirmed) {
        return;
    }

    currentExclusionRules = normalizeExclusionRules({
        ...currentExclusionRules,
        excludedTrackUris: [
            ...currentExclusionRules.excludedTrackUris,
            track.uri
        ]
    });

    saveExclusionRules();
    removeTrackAt(index);
    setStatus(
        `« ${track.name || "Morceau"} » ajouté aux exclusions.`
    );
}

function removeTrackAt(index) {
    if (
        index < 0 ||
        index >= selectedTracks.length
    ) {
        return;
    }

    const [removedTrack] = selectedTracks.splice(index, 1);
    markQueueChanged();

    renderTrackList();
    renderShuffleStats(
        analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
    );

    const playButton = document.getElementById(
        "playSpotifyButton"
    );
    const saveButton = document.getElementById(
        "showSavePlaylistButton"
    );

    if (playButton) {
        playButton.disabled =
            !selectedTracks.length ||
            !availableDevices.length ||
            isKnownNonPremiumAccount();
    }

    if (saveButton) {
        saveButton.disabled = !selectedTracks.length;
    }

    setStatus(
        `« ${removedTrack?.name || "Morceau"} » retiré de l’ordre actuel.`
    );
}

function resetGeneratedOrder() {
    if (!originalGeneratedOrder.length) {
        return;
    }

    selectedTracks = [...originalGeneratedOrder];
    trackSearchTerm = "";
    markQueueChanged();

    const searchInput = document.getElementById(
        "trackOrderSearchInput"
    );

    if (searchInput) {
        searchInput.value = "";
    }

    renderTrackList();
    renderShuffleStats(
        analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
    );
    setStatus("Ordre intelligent initial restauré.");
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
            <strong>${stats.recentTracksInFirstTwenty}</strong>
            &nbsp;–&nbsp;
            <em>Transitions brusques</em> :
            <strong>${stats.abruptTransitions ?? 0}</strong>
            &nbsp;–&nbsp;
            <em>Écarts importants de durée</em> :
            <strong>${stats.durationJumpTransitions ?? 0}</strong>
            &nbsp;–&nbsp;
            <em>Versions spéciales consécutives</em> :
            <strong>${stats.repeatedVersionTransitions ?? 0}</strong>
            &nbsp;–&nbsp;
            <em>Adhérence à la courbe</em> :
            <strong>${stats.intensityCurveAdherence ?? 0}%</strong>
            &nbsp;–&nbsp;
            <em>Sauts d’intensité</em> :
            <strong>${stats.intensityJumpTransitions ?? 0}</strong>.
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

    updatePlaybackQueueUI();
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
            <div class="playlist-detail-cover detail-placeholder ${isLikedTracks
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
                        ${isMultiSourceMix
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
                        ${availableDevices.length &&
            tracks.length &&
            !isKnownNonPremiumAccount()
            ? ""
            : "disabled"
        }
                    >
                        ▶ Lire cet ordre dans Spotify
                    </button>
                </div>

                <div class="playback-queue-panel">
                    <div class="playback-queue-heading">
                        <strong>File d’attente Shuffle+</strong>
                        <button id="resetPlaybackQueueButton" class="playback-queue-reset" type="button" ${playbackQueueCursor ? "" : "disabled"}>
                            ↺ Revenir au début
                        </button>
                    </div>
                    <div class="playback-queue-track" aria-hidden="true">
                        <span id="playbackQueueProgressBar" class="playback-queue-progress-bar"></span>
                    </div>
                    <p id="playbackQueueProgress" class="playback-queue-progress" aria-live="polite"></p>
                </div>

                <p id="playbackMessage" class="playback-message">
                    ${isKnownNonPremiumAccount()
            ? "La commande de lecture nécessite un compte Spotify Premium."
            : availableDevices.length
                ? "Un appareil Spotify est prêt."
                : "Ouvre Spotify sur ton téléphone ou ton ordinateur, lance ou mets en pause un morceau, puis clique sur Actualiser."
        }
                </p>
            </section>

            <section class="track-editor-panel" aria-label="Édition de l’ordre">
                <div class="track-editor-heading">
                    <div>
                        <h3>Modifier l’ordre</h3>
                        <p>
                            Fais glisser les morceaux sur ordinateur,
                            ou utilise les flèches sur mobile.
                        </p>
                    </div>

                    <span id="trackEditorCount">
                        ${tracks.length} affiché${tracks.length > 1 ? "s" : ""}
                        sur ${tracks.length}
                    </span>
                </div>

                <div class="track-editor-toolbar">
                    <label
                        class="track-editor-search"
                        for="trackOrderSearchInput"
                    >
                        <span>Rechercher dans l’ordre</span>
                        <input
                            id="trackOrderSearchInput"
                            type="search"
                            placeholder="Titre, artiste ou album…"
                            value="${escapeHtml(trackSearchTerm)}"
                            autocomplete="off"
                        >
                    </label>

                    <button
                        id="resetGeneratedOrderButton"
                        class="track-editor-reset"
                        type="button"
                        ${originalGeneratedOrder.length ? "" : "disabled"}
                    >
                        ↺ Rétablir l’ordre intelligent
                    </button>
                </div>
            </section>

            ${activeAdaptiveContext
                ? `
                    <div class="adaptive-result-banner">
                        <span>
                            ${activeAdaptiveContext.icon}
                        </span>
                        <div>
                            <strong>
                                Contexte ${escapeHtml(
                                    activeAdaptiveContext.label
                                )}
                            </strong>
                            <small>
                                ${escapeHtml(
                                    getAdaptiveDurationLabel(
                                        currentAdaptiveSettings
                                    )
                                )}
                                · ${selectedTracks.length}
                                morceau${selectedTracks.length > 1 ? "x" : ""}
                                · ${escapeHtml(
                                    formatLongDuration(
                                        estimateTracksDurationMs(
                                            selectedTracks
                                        )
                                    )
                                )}
                            </small>
                        </div>
                    </div>
                `
                : ""}

            ${getActiveProfile()
                ? `
                    <div class="active-profile-banner">
                        <span class="active-profile-banner-icon">
                            ${escapeHtml(getActiveProfile().icon)}
                        </span>
                        <div>
                            <strong>
                                Profil actif : ${escapeHtml(getActiveProfile().name)}
                            </strong>
                            <span>
                                ${escapeHtml(getActiveProfile().description)}
                            </span>
                        </div>
                    </div>
                `
                : ""}

            ${lastCleanupSummary?.removedCount
                ? `
                    <div class="cleanup-result-banner">
                        <div>
                            <strong>
                                🧹 ${lastCleanupSummary.removedCount}
                                doublon${lastCleanupSummary.removedCount > 1 ? "s" : ""}
                                ou titre${lastCleanupSummary.removedCount > 1 ? "s" : ""}
                                retiré${lastCleanupSummary.removedCount > 1 ? "s" : ""}
                            </strong>
                            <span>
                                ${lastCleanupSummary.inputCount}
                                chargés → ${lastCleanupSummary.outputCount}
                                conservés ·
                                ${escapeHtml(
                                    formatLongDuration(
                                        lastCleanupSummary.durationSavedMs
                                    )
                                )}
                                économisées
                            </span>
                        </div>
                        <button
                            id="restoreLastCleanupButton"
                            class="cleanup-restore-button"
                            type="button"
                        >
                            Restaurer
                        </button>
                    </div>
                `
                : ""}

            ${lastPrioritySummary?.favoredTotal
                ? `
                    <div class="priority-result-banner">
                        <strong>
                            ${lastPrioritySummary.favoredInFirstTwenty}
                            favori${lastPrioritySummary.favoredInFirstTwenty > 1 ? "s" : ""}
                            dans les 20 premiers
                        </strong>
                        <span>
                            ${lastPrioritySummary.favoredTotal}
                            morceau${lastPrioritySummary.favoredTotal > 1 ? "x" : ""}
                            prioritaire${lastPrioritySummary.favoredTotal > 1 ? "s" : ""}
                            dans ce mix
                        </span>
                    </div>
                `
                : ""}

            ${lastExclusionSummary?.excludedCount
                ? `
                    <div class="exclusion-result-banner">
                        <strong>
                            ${lastExclusionSummary.excludedCount}
                            morceau${lastExclusionSummary.excludedCount > 1 ? "x" : ""}
                            exclu${lastExclusionSummary.excludedCount > 1 ? "s" : ""}
                        </strong>
                        <span>
                            ${escapeHtml(
                                Object.entries(
                                    lastExclusionSummary.reasons
                                )
                                    .map(([reason, count]) =>
                                        `${count} ${reason}`
                                    )
                                    .join(" · ")
                            )}
                        </span>
                    </div>
                `
                : ""}

            <p class="shuffle-explanation">
                Mode <strong>${getShufflePresetLabel(currentShuffleSettings)}</strong> :
                au moins ${currentShuffleSettings.artistGap} morceau${currentShuffleSettings.artistGap > 1 ? "x" : ""}
                entre deux titres du même artiste, ${currentShuffleSettings.albumGap}
                entre deux titres du même album, avec une éviction
                ${getRecentAvoidanceLabel(currentShuffleSettings.recentAvoidance).toLowerCase()}
                des morceaux récemment lus.
                Transitions
                <strong>
                    ${getCoherenceLevelLabel(
                        currentCoherenceSettings.level
                    ).toLowerCase()}
                </strong>
                avec un écart de durée surveillé à partir de
                ${currentCoherenceSettings.durationJumpSeconds}s.
                Courbe d’intensité
                <strong>
                    ${getIntensityCurveLabel(
                        currentIntensitySettings.curve
                    ).toLowerCase()}
                </strong>
                de ${currentIntensitySettings.startIntensity}%
                à ${currentIntensitySettings.endIntensity}%.
                ${currentAdaptiveSettings.enabled
                    ? `Mode adaptatif ${getTimeContext().label.toLowerCase()} actif, durée cible ${getAdaptiveDurationLabel(currentAdaptiveSettings)}.`
                    : ""}
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


function getTrackUris(tracks = selectedTracks) {
    return tracks.map((track) => track?.uri).filter(Boolean);
}

function getPlaybackResumeKey(playlist = selectedPlaylist) {
    if (playbackQueueResumeKey) return playbackQueueResumeKey;
    if (!playlist) return "";
    if (playlist.sourceType === "liked") return "liked";
    if (playlist.sourceType === "mix") {
        if (pendingSavedMixResumeKey) return pendingSavedMixResumeKey;
        const sourceNames = Array.isArray(playlist.sourceNames)
            ? playlist.sourceNames.join("|") : "";
        return `mix:${sourceNames || playlist.id || "temporary"}`;
    }
    return `playlist:${playlist.id || "unknown"}`;
}

function readPlaybackQueueStates() {
    try {
        const raw = localStorage.getItem(PLAYBACK_QUEUE_STATE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== "object") return {};
        const now = Date.now();
        const validStates = {};
        for (const [key, state] of Object.entries(parsed)) {
            const savedAt = Number(state?.savedAt || 0);
            if (key && state && Array.isArray(state.orderUris) && savedAt > 0 && now - savedAt < PLAYBACK_QUEUE_STATE_TTL) {
                validStates[key] = state;
            }
        }
        return validStates;
    } catch (error) {
        console.warn("Progression de lecture illisible :", error);
        return {};
    }
}

function writePlaybackQueueStates(states) {
    try {
        localStorage.setItem(PLAYBACK_QUEUE_STATE_KEY, JSON.stringify(states));
    } catch (error) {
        console.warn("Impossible d’enregistrer la progression :", error);
    }
}

function saveCurrentPlaybackQueueState() {
    const resumeKey = getPlaybackResumeKey();
    const orderUris = getTrackUris();
    if (!resumeKey || !orderUris.length) return;
    const states = readPlaybackQueueStates();
    states[resumeKey] = {
        cursor: Math.min(Math.max(0, playbackQueueCursor), orderUris.length),
        orderUris,
        playlistName: selectedPlaylist?.name || "Sélection",
        savedAt: Date.now()
    };
    writePlaybackQueueStates(states);
}

function clearCurrentPlaybackQueueState() {
    const resumeKey = getPlaybackResumeKey();
    if (!resumeKey) return;
    const states = readPlaybackQueueStates();
    if (Object.hasOwn(states, resumeKey)) {
        delete states[resumeKey];
        writePlaybackQueueStates(states);
    }
}

function restorePlaybackQueueState(tracks) {
    const resumeKey = getPlaybackResumeKey();
    const state = readPlaybackQueueStates()[resumeKey];
    playbackQueueCursor = 0;
    if (!resumeKey || !state || !Array.isArray(state.orderUris) || !state.orderUris.length) return [...tracks];
    const trackByUri = new Map(tracks.filter((track) => track?.uri).map((track) => [track.uri, track]));
    const restoredTracks = [];
    const seenUris = new Set();
    for (const uri of state.orderUris) {
        const track = trackByUri.get(uri);
        if (track && !seenUris.has(uri)) {
            seenUris.add(uri);
            restoredTracks.push(track);
        }
    }
    for (const track of tracks) {
        if (track?.uri && !seenUris.has(track.uri)) {
            seenUris.add(track.uri);
            restoredTracks.push(track);
        }
    }
    if (!restoredTracks.length) return [...tracks];
    playbackQueueCursor = Math.min(Math.max(0, Number(state.cursor || 0)), restoredTracks.length);
    return restoredTracks;
}

function resetPlaybackQueueProgress({ keepSavedState = false } = {}) {
    playbackQueueCursor = 0;
    if (!keepSavedState) clearCurrentPlaybackQueueState();
    updatePlaybackQueueUI();
}

function getPlaybackQueueBlock() {
    const allPlayableTracks = selectedTracks.filter((track) => track?.uri);
    const start = Math.min(playbackQueueCursor, allPlayableTracks.length);
    const end = Math.min(start + MAX_DIRECT_PLAYBACK_TRACKS, allPlayableTracks.length);
    return { allPlayableTracks, start, end, tracks: allPlayableTracks.slice(start, end) };
}

function updatePlaybackQueueUI() {
    const progressElement = document.getElementById("playbackQueueProgress");
    const progressBar = document.getElementById("playbackQueueProgressBar");
    const playButton = document.getElementById("playSpotifyButton");
    const resetButton = document.getElementById("resetPlaybackQueueButton");
    const total = getTrackUris().length;
    const sent = Math.min(playbackQueueCursor, total);
    const nextEnd = Math.min(sent + MAX_DIRECT_PLAYBACK_TRACKS, total);
    const percent = total ? Math.round((sent / total) * 100) : 0;
    if (progressElement) {
        progressElement.textContent = !total ? "Aucun morceau disponible."
            : sent >= total ? `${sent}/${total} morceaux envoyés · file terminée`
            : sent > 0 ? `${sent}/${total} morceaux envoyés · prochain bloc : ${sent + 1} à ${nextEnd}`
            : `0/${total} morceaux envoyés · premier bloc : 1 à ${nextEnd}`;
    }
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute("aria-valuenow", String(percent));
    }
    if (playButton) {
        playButton.disabled = !availableDevices.length || !total || sent >= total || isKnownNonPremiumAccount();
        playButton.textContent = sent === 0 ? "▶ Lire le premier bloc" : sent < total ? "⏭ Continuer la lecture" : "✓ File entièrement envoyée";
    }
    if (resetButton) resetButton.disabled = sent === 0;
}

function markQueueChanged() {
    playbackQueueCursor = 0;
    clearCurrentPlaybackQueueState();
    updatePlaybackQueueUI();
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
            ? `${availableDevices.length} appareil${availableDevices.length > 1 ? "s" : ""
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
    const playButton = document.getElementById("playSpotifyButton");
    const playbackMessage = document.getElementById("playbackMessage");
    if (!deviceSelect || !playButton || !playbackMessage) return;
    const deviceId = deviceSelect.value;
    if (!deviceId) {
        playbackMessage.textContent = "Sélectionne d’abord un appareil Spotify.";
        playbackMessage.className = "playback-message error";
        return;
    }
    if (isKnownNonPremiumAccount()) {
        playbackMessage.textContent = "La lecture à distance nécessite un compte Spotify Premium.";
        playbackMessage.className = "playback-message error";
        return;
    }
    const queueBlock = getPlaybackQueueBlock();
    const playbackUris = queueBlock.tracks.map((track) => track.uri).filter(Boolean);
    if (!playbackUris.length) {
        playbackMessage.textContent = queueBlock.allPlayableTracks.length
            ? "Tous les morceaux de cette file ont déjà été envoyés."
            : "Aucun morceau lisible dans cette playlist.";
        playbackMessage.className = "playback-message error";
        updatePlaybackQueueUI();
        return;
    }
    playButton.disabled = true;
    playButton.textContent = "Envoi du bloc…";
    playbackMessage.textContent = `Préparation des morceaux ${queueBlock.start + 1} à ${queueBlock.end}…`;
    playbackMessage.className = "playback-message";
    try {
        await transferPlayback(deviceId, false);
        await wait(800);
        await startPlayback(playbackUris, deviceId);
        await wait(600);
        try { await setPlaybackShuffle(false, deviceId); }
        catch (shuffleError) { console.warn("Impossible de désactiver le shuffle Spotify :", shuffleError); }
        playbackQueueCursor = queueBlock.end;
        saveCurrentPlaybackQueueState();
        rememberPlaybackOrder(queueBlock.tracks);
        addTracksSentToHistory(
            queueBlock.tracks.length,
            queueBlock.tracks,
            "manual",
            availableDevices.find(
                (device) =>
                    device.id === deviceId
            )?.name || ""
        );
        const remaining = queueBlock.allPlayableTracks.length - playbackQueueCursor;
        playbackMessage.textContent = remaining > 0
            ? `Bloc ${queueBlock.start + 1}–${queueBlock.end} lancé. ${remaining} morceau${remaining > 1 ? "x" : ""} reste${remaining > 1 ? "nt" : ""} à envoyer.`
            : `Dernier bloc lancé : les ${queueBlock.allPlayableTracks.length} morceaux ont été envoyés.`;
        playbackMessage.className = "playback-message success";
        updatePlaybackQueueUI();
    } catch (error) {
        console.error(error);
        playbackMessage.textContent = getPlaybackErrorMessage(error);
        playbackMessage.className = "playback-message error";
        updatePlaybackQueueUI();
    }
}

function deduplicateTracks(tracks) {
    return cleanTracks(
        tracks,
        currentCleanupSettings
    ).tracks;
}


async function createSelectedMix() {
    applyAdaptiveContext();

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
                collectedTracks.push(
                    ...tracks.map((track) => ({
                        ...track,
                        __shufflePlusSources: [
                            ...new Set([
                                ...(track?.__shufflePlusSources || []),
                                source.name
                            ])
                        ]
                    }))
                );
                loadedSourceNames.push(source.name);
            } catch (error) {
                console.warn(
                    `Source ignorée : ${source.name}`,
                    error
                );
                failedSourceNames.push(source.name);
            }
        }

        const cleanupResult = cleanTracks(
            collectedTracks,
            currentCleanupSettings
        );
        const uniqueTracks = cleanupResult.tracks;
        const exclusionResult = applyExclusionRules(
            uniqueTracks,
            currentExclusionRules
        );
        const filteredTracks = exclusionResult.tracks;

        if (!filteredTracks.length) {
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
            shuffleSettings: {
                ...currentShuffleSettings
            },
            owner: {
                display_name: "Shuffle+"
            },
            images: [],
            external_urls: {}
        };

        sourceTracks = filteredTracks;
        selectedTracks = smartShuffleTracks(
            sourceTracks,
            getShuffleEngineOptions(currentShuffleSettings)
        );
        selectedTracks = limitTracksToAdaptiveTarget(
            selectedTracks,
            currentAdaptiveSettings
        );
        buildPrioritySummary(
            selectedTracks,
            currentPriorityRules
        );
        playbackQueueResumeKey =
            pendingSavedMixResumeKey ||
            `mix:${selectedKeys.slice().sort().join("|")}`;
        selectedTracks = restorePlaybackQueueState(selectedTracks);
        originalGeneratedOrder = [...selectedTracks];
        trackSearchTerm = "";

        const generatedSavedMixId =
            pendingSavedMixResumeKey.startsWith(
                "saved-mix:"
            )
                ? pendingSavedMixResumeKey.replace(
                    /^saved-mix:/,
                    ""
                )
                : "";
        const generatedSavedMix =
            savedMixes.find(
                (item) =>
                    item.id === generatedSavedMixId
            );

        registerMixHistoryLaunch({
            name:
                generatedSavedMix?.name ||
                selectedPlaylist.name,
            sourceKeys: selectedKeys,
            shuffleSettings: currentShuffleSettings,
            tracks: selectedTracks,
            mixId: generatedSavedMixId,
            source:
                generatedSavedMixId
                    ? "saved-mix"
                    : "manual"
        });

        pendingSavedMixResumeKey = "";

        displayPlaylistDetails(
            selectedPlaylist,
            selectedTracks
        );
        renderShuffleStats(
            analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
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
            `${filteredTracks.length} morceau${filteredTracks.length > 1 ? "x" : ""} conservé${filteredTracks.length > 1 ? "s" : ""}`,
            `${loadedSourceNames.length} source${loadedSourceNames.length > 1 ? "s" : ""}`
        ];

        if (exclusionResult.summary.excludedCount > 0) {
            const details = Object.entries(
                exclusionResult.summary.reasons
            )
                .map(([reason, count]) => `${count} ${reason}`)
                .join(", ");

            summaryParts.push(
                `${exclusionResult.summary.excludedCount} exclusion` +
                `${exclusionResult.summary.excludedCount > 1 ? "s" : ""}` +
                ` (${details})`
            );
        }

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
    currentShuffleSettings = {
        ...DEFAULT_SHUFFLE_SETTINGS
    };

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

        const cleanupResult = cleanTracks(
            [...tracks],
            currentCleanupSettings
        );
        const exclusionResult = applyExclusionRules(
            cleanupResult.tracks,
            currentExclusionRules
        );
        sourceTracks = exclusionResult.tracks;
        playbackQueueResumeKey =
            playlist.sourceType === "liked"
                ? "liked"
                : `playlist:${playlist.id}`;
        selectedTracks = restorePlaybackQueueState(
            [...sourceTracks]
        );
        buildPrioritySummary(
            selectedTracks,
            currentPriorityRules
        );
        originalGeneratedOrder = [...selectedTracks];
        trackSearchTerm = "";
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
    const urlAutomationCommand =
        parseAutomationCommandFromUrl();

    if (urlAutomationCommand) {
        savePendingAutomationCommand(
            urlAutomationCommand
        );
    }

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Initialisation…";
    }

    if (logoutButton) {
        logoutButton.hidden = true;
    }

    setStatus("Initialisation de Shuffle+…");

    try {
        await handleSpotifyCallback();

        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            setDisconnectedInterface();

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent =
                    "Se connecter à Spotify";
            }

            setStatus("");
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

        try {
            availableDevices =
                await getAvailableDevices();
        } catch (deviceError) {
            console.warn(
                "Appareils Spotify indisponibles au démarrage :",
                deviceError
            );
            availableDevices = [];
        }

        const displayName =
            profile?.display_name ||
            profile?.id ||
            "utilisateur";

        welcomeElement.textContent =
            `Bienvenue ${displayName} 👋`;

        displayPlaylists(playlistsCache);
        startScheduleWatcher();

        if (pendingAutomationCommand) {
            try {
                await executeAutomationCommand(
                    pendingAutomationCommand
                );
            } catch (automationError) {
                console.error(
                    "Échec de l’automatisation :",
                    automationError
                );
                savePendingAutomationCommand(null);
                setStatus(
                    automationError.message ||
                    "La lecture automatique a échoué.",
                    "error"
                );
            }
        } else {
            setStatus("");
        }
    } catch (error) {
        console.error("Initialisation échouée :", error);

        // Une erreur Adaptive DJ ou API ne doit jamais bloquer la connexion Spotify.
        setDisconnectedInterface();

        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent =
                "Se connecter à Spotify";
        }

        setStatus(
            error?.message ||
            "Une erreur est survenue pendant l'initialisation.",
            "error"
        );
    }
}

if (installAppButton) {
installAppButton.addEventListener(
    "click",
    requestPwaInstallation
);
}

if (pwaInstallGuideElement) {
pwaInstallGuideElement.addEventListener(
    "click",
    (event) => {
        if (
            event.target.closest(
                "[data-close-pwa-guide]"
            )
        ) {
            pwaInstallGuideElement.hidden = true;
        }
    }
);
}

if (applyPwaUpdateButton) {
applyPwaUpdateButton.addEventListener(
    "click",
    () => {
        const waitingWorker =
            pwaRegistration?.waiting;

        if (!waitingWorker) {
            hidePwaUpdateBanner();
            return;
        }

        pwaReloadRequested = true;
        waitingWorker.postMessage({
            type: "SKIP_WAITING"
        });
    }
);
}

if (dismissPwaUpdateButton) {
dismissPwaUpdateButton.addEventListener(
    "click",
    hidePwaUpdateBanner
);
}

if (loginButton) {
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
}

if (logoutButton) {
logoutButton.addEventListener("click", () => {
    if (scheduleCheckTimer) {
        window.clearInterval(
            scheduleCheckTimer
        );
        scheduleCheckTimer = 0;
    }

    logoutSpotify();

    currentUserId = "";
    currentUserProduct = "";
    welcomeElement.textContent = "Bienvenue 👋";

    setDisconnectedInterface();
});
}

if (contentElement) {
contentElement.addEventListener(
    "click",
    async (event) => {
        if (
            event.target.closest(
                "#installPwaSettingsButton"
            )
        ) {
            await requestPwaInstallation();
            return;
        }

        if (
            event.target.closest(
                "#showPwaInstructionsButton"
            )
        ) {
            showPwaInstallGuide();
            return;
        }

        if (
            event.target.closest(
                "#checkPwaUpdateButton"
            )
        ) {
            await checkForPwaUpdate();
            return;
        }

        const appMenuButton =
            event.target.closest(
                "[data-app-menu]"
            );

        if (appMenuButton) {
            activeAppMenu =
                normalizeActiveAppMenu(
                    appMenuButton.dataset.appMenu
                );
            saveActiveAppMenu();
            displayPlaylists(
                playlistsCache
            );
            return;
        }

        if (
            event.target.closest(
                "#exportIntelligenceButton"
            )
        ) {
            downloadIntelligenceReport();
            return;
        }

        const confirmIntelligenceButton =
            event.target.closest(
                "[data-confirm-intelligence-event]"
            );

        if (confirmIntelligenceButton) {
            confirmIntelligenceListening(
                confirmIntelligenceButton.dataset
                    .confirmIntelligenceEvent || ""
            );
            return;
        }

        if (
            event.target.closest(
                "#clearIntelligenceButton"
            )
        ) {
            clearIntelligenceAnalytics();
            return;
        }

        if (
            event.target.closest(
                "#runAdaptiveDjNowButton"
            )
        ) {
            try {
                await runAdaptiveDj();
            } catch (error) {
                console.error(error);
                setStatus(
                    error.message ||
                    "Adaptive DJ n’a pas pu démarrer.",
                    "error"
                );
            }
            return;
        }

        if (
            event.target.closest(
                "#testAdaptiveDjButton"
            )
        ) {
            const form =
                event.target.closest(
                    "#adaptiveDjMenuForm"
                );
            const slotId =
                form?.elements?.testSlotId
                    ?.value || "";

            try {
                await runAdaptiveDj({
                    forcedSlotId: slotId,
                    autoplay: false
                });
            } catch (error) {
                console.error(error);
                setStatus(
                    error.message ||
                    "Test Adaptive DJ impossible.",
                    "error"
                );
            }
            return;
        }

        if (
            event.target.closest(
                "#copyAdaptiveDjUrlButton"
            )
        ) {
            await copyAdaptiveDjShortcutUrl();
            return;
        }

        const adaptiveLearningActionButton =
            event.target.closest(
                "[data-adaptive-learning-action]"
            );

        if (adaptiveLearningActionButton) {
            const action =
                adaptiveLearningActionButton.dataset
                    .adaptiveLearningAction || "";
            const slotId =
                adaptiveLearningActionButton.dataset
                    .adaptiveLearningSlotId || "";
            const mixId =
                adaptiveLearningActionButton.dataset
                    .adaptiveLearningMixId || "";

            if (action === "apply") {
                applyAdaptiveLearningSuggestion(
                    slotId,
                    mixId
                );
            } else if (action === "ignore") {
                ignoreAdaptiveLearningSuggestion(
                    slotId,
                    mixId
                );
            }

            return;
        }

        if (
            event.target.closest(
                "#resetAdaptiveLearningButton"
            )
        ) {
            resetAdaptiveLearning();
            return;
        }

        const adaptiveAutoUndoButton =
            event.target.closest(
                "[data-adaptive-auto-undo-id]"
            );

        if (adaptiveAutoUndoButton) {
            rollbackAdaptiveLearningAutoChange(
                adaptiveAutoUndoButton.dataset
                    .adaptiveAutoUndoId || ""
            );
            return;
        }

        const iosCommandActionButton =
            event.target.closest(
                "[data-ios-command-action]"
            );

        if (iosCommandActionButton) {
            const action =
                iosCommandActionButton.dataset
                    .iosCommandAction || "";
            const commandId =
                iosCommandActionButton.dataset
                    .iosCommandId || "";

            if (action === "run") {
                const command =
                    getIosCommandById(commandId);
                await runIosQuickPlay(
                    command?.playlistId || "",
                    commandId
                );
            } else if (action === "copy") {
                await copyIosCommandUrl(
                    commandId
                );
            } else if (action === "edit") {
                editIosCommand(commandId);
            } else if (
                action === "duplicate"
            ) {
                duplicateIosCommand(commandId);
            } else if (
                action === "delete"
            ) {
                deleteIosCommand(commandId);
            }

            return;
        }

        if (
            event.target.closest(
                "#cancelIosCommandEditButton"
            )
        ) {
            cancelIosCommandEdit();
            return;
        }

        if (
            event.target.closest(
                "#testIosQuickPlayButton"
            )
        ) {
            await runIosQuickPlay(
                "",
                getPrincipalIosCommand()?.id || ""
            );
            return;
        }

        if (
            event.target.closest(
                "#copyIosShortcutUrlButton"
            )
        ) {
            await copyIosQuickPlayUrl();
            return;
        }

        if (
            event.target.closest(
                "#retryIosQuickPlayButton"
            )
        ) {
            await runIosQuickPlay();
            return;
        }

        const scheduleActionButton =
            event.target.closest(
                "[data-schedule-action]"
            );

        if (scheduleActionButton) {
            const scheduleId =
                scheduleActionButton.dataset.scheduleId || "";
            const action =
                scheduleActionButton.dataset.scheduleAction || "";

            if (action === "run") {
                await runMixSchedule(
                    scheduleId
                );
            } else if (action === "toggle") {
                toggleMixSchedule(
                    scheduleId
                );
            } else if (action === "delete") {
                deleteMixSchedule(
                    scheduleId
                );
            }

            return;
        }

        if (
            event.target.closest(
                "#refreshScheduleDevicesButton"
            )
        ) {
            await refreshScheduleDevices();
            return;
        }

        const profileActionButton =
            event.target.closest("[data-profile-action]");

        if (profileActionButton) {
            const profileId =
                profileActionButton.dataset.profileId || "";
            const action =
                profileActionButton.dataset.profileAction || "";

            if (action === "apply") {
                applyMixProfile(profileId);
            } else if (action === "duplicate") {
                duplicateMixProfile(profileId);
            } else if (action === "rename") {
                renameMixProfile(profileId);
            } else if (action === "delete") {
                deleteMixProfile(profileId);
            }

            return;
        }

        if (
            event.target.closest(
                "#createProfileFromCurrentButton"
            )
        ) {
            createProfileFromCurrentSettings();
            return;
        }

        if (
            event.target.closest(
                "#restoreDefaultProfilesButton"
            )
        ) {
            restoreDefaultMixProfiles();
            return;
        }

        if (
            event.target.closest(
                "#clearActiveProfileButton"
            )
        ) {
            clearActiveProfile();
            return;
        }

        if (
            event.target.closest(
                "#restoreLastCleanupButton"
            )
        ) {
            restoreLastCleanup();
            return;
        }

        const resetCleanupSettingsButton =
            event.target.closest(
                "#resetCleanupSettingsButton"
            );

        if (resetCleanupSettingsButton) {
            resetCleanupSettings();
            return;
        }

        const resetAdaptiveSettingsButton =
            event.target.closest(
                "#resetAdaptiveSettingsButton"
            );

        if (resetAdaptiveSettingsButton) {
            resetAdaptiveSettings();
            return;
        }

        const resetIntensitySettingsButton =
            event.target.closest(
                "#resetIntensitySettingsButton"
            );

        if (resetIntensitySettingsButton) {
            resetIntensitySettings();
            return;
        }

        const resetCoherenceSettingsButton =
            event.target.closest(
                "#resetCoherenceSettingsButton"
            );

        if (resetCoherenceSettingsButton) {
            resetCoherenceSettings();
            return;
        }

        const resetPriorityRulesButton =
            event.target.closest("#resetPriorityRulesButton");

        if (resetPriorityRulesButton) {
            resetPriorityRules();
            return;
        }

        const resetExclusionRulesButton =
            event.target.closest("#resetExclusionRulesButton");

        if (resetExclusionRulesButton) {
            resetExclusionRules();
            return;
        }

        const historyActionButton =
            event.target.closest("[data-history-action]");

        if (historyActionButton) {
            const historyId =
                historyActionButton.dataset.historyId || "";
            const action =
                historyActionButton.dataset.historyAction || "";

            if (action === "relaunch") {
                await relaunchHistoryItem(historyId);
            } else if (action === "delete") {
                deleteHistoryItem(historyId);
            }

            return;
        }

        const clearMixHistoryButton =
            event.target.closest("#clearMixHistoryButton");

        if (clearMixHistoryButton) {
            clearMixHistory();
            return;
        }

        const exportBackupButton =
            event.target.closest("#exportBackupButton");

        if (exportBackupButton) {
            downloadBackupFile();
            return;
        }

        const importBackupButton =
            event.target.closest("#importBackupButton");

        if (importBackupButton) {
            document.getElementById("backupFileInput")?.click();
            return;
        }

        const trackActionButton =
            event.target.closest("[data-track-action]");

        if (trackActionButton) {
            const action =
                trackActionButton.dataset.trackAction || "";
            const index = Number(
                trackActionButton.dataset.trackIndex
            );

            if (action === "up") {
                moveTrack(index, index - 1);
            } else if (action === "down") {
                moveTrack(index, index + 1);
            } else if (action === "remove") {
                removeTrackAt(index);
            } else if (action === "exclude") {
                excludeTrackAt(index);
            } else if (action === "favorite") {
                toggleFavoredTrackAt(index);
            }

            return;
        }

        const resetGeneratedOrderButton =
            event.target.closest("#resetGeneratedOrderButton");

        if (resetGeneratedOrderButton) {
            resetGeneratedOrder();
            return;
        }

        const favoriteButton = event.target.closest(
            ".source-favorite-button"
        );

        if (favoriteButton) {
            const sourceKey =
                favoriteButton.dataset.favoriteSourceKey || "";
            toggleFavoriteSource(sourceKey);
            displayPlaylists(playlistsCache);
            setStatus(
                favoriteSourceKeys.has(sourceKey)
                    ? "Source ajoutée aux favoris."
                    : "Source retirée des favoris."
            );
            return;
        }

        const savedMixActionButton =
            event.target.closest("[data-saved-mix-action]");

        if (savedMixActionButton) {
            const mixId =
                savedMixActionButton.dataset.savedMixId || "";
            const action =
                savedMixActionButton.dataset.savedMixAction || "";

            if (action === "launch") {
                const prepared =
                    await launchSavedMix(mixId);

                if (prepared) {
                    recordManualAdaptiveCorrection(
                        mixId
                    );
                    recordAdaptiveLearningObservation({
                        mixId,
                        source: "manual"
                    });
                }
            } else if (action === "settings") {
                startConfiguringSavedMix(mixId);
            } else if (action === "edit") {
                startEditingSavedMix(mixId);
            } else if (action === "rename") {
                renameSavedMix(mixId);
            } else if (action === "delete") {
                deleteSavedMix(mixId);
            }

            return;
        }

        const savedMixSettingsAction =
            event.target.closest(
                "[data-saved-mix-settings-action]"
            );

        if (savedMixSettingsAction) {
            if (
                savedMixSettingsAction.dataset
                    .savedMixSettingsAction === "cancel"
            ) {
                cancelSavedMixSettings();
            }

            return;
        }

        const saveSourceSelectionButton =
            event.target.closest("#saveSourceSelectionButton");

        if (saveSourceSelectionButton) {
            saveCurrentSourceSelection();
            return;
        }

        const saveEditedMixButton =
            event.target.closest("#saveEditedMixButton");

        if (saveEditedMixButton) {
            saveEditedMix();
            return;
        }

        const cancelEditSavedMixButton =
            event.target.closest("#cancelEditSavedMixButton");

        if (cancelEditSavedMixButton) {
            cancelEditingSavedMix();
            return;
        }

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
            const activeProfile = getActiveProfile();

            if (activeProfile) {
                currentShuffleSettings =
                    normalizeShuffleSettings(
                        activeProfile.shuffleSettings
                    );
                currentExclusionRules =
                    normalizeExclusionRules(
                        activeProfile.exclusionRules
                    );
                currentPriorityRules =
                    normalizePriorityRules(
                        activeProfile.priorityRules
                    );
                currentCoherenceSettings =
                    normalizeCoherenceSettings(
                        activeProfile.coherenceSettings
                    );
                currentIntensitySettings =
                    normalizeIntensitySettings(
                        activeProfile.intensitySettings
                    );
            } else {
                currentShuffleSettings = {
                    ...DEFAULT_SHUFFLE_SETTINGS
                };
            }

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

        const resetPlaybackQueueButton =
            event.target.closest("#resetPlaybackQueueButton");

        if (resetPlaybackQueueButton) {
            resetPlaybackQueueProgress();
            setStatus("File d’attente replacée au début.");
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
            selectedTracks = smartShuffleTracks(
                sourceTracks,
                getShuffleEngineOptions(currentShuffleSettings)
            );
            selectedTracks = limitTracksToAdaptiveTarget(
                selectedTracks,
                currentAdaptiveSettings
            );
            buildPrioritySummary(
                selectedTracks,
                currentPriorityRules
            );
            originalGeneratedOrder = [...selectedTracks];
            trackSearchTerm = "";
            markQueueChanged();

            const trackSearchInput = document.getElementById(
                "trackOrderSearchInput"
            );

            if (trackSearchInput) {
                trackSearchInput.value = "";
            }

            renderTrackList();
            renderShuffleStats(
                analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
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
    "change",
    (event) => {
        if (
            event.target.id ===
            "intelligenceRangeInput"
        ) {
            intelligenceAnalytics =
                normalizeIntelligenceAnalytics({
                    ...intelligenceAnalytics,
                    rangeDays:
                        Number(event.target.value)
                });
            saveIntelligenceAnalytics();
            displayPlaylists(playlistsCache);
            setStatus(
                "Période du tableau Intelligence mise à jour."
            );
            return;
        }

        if (
            event.target.id ===
            "intelligenceTypeInput"
        ) {
            intelligenceAnalytics =
                normalizeIntelligenceAnalytics({
                    ...intelligenceAnalytics,
                    eventTypeFilter:
                        event.target.value
                });
            saveIntelligenceAnalytics();
            displayPlaylists(playlistsCache);
            setStatus(
                "Filtre d’événements mis à jour."
            );
            return;
        }

        if (
            event.target.id ===
            "intelligenceDayTypeInput"
        ) {
            intelligenceAnalytics =
                normalizeIntelligenceAnalytics({
                    ...intelligenceAnalytics,
                    dayTypeFilter:
                        event.target.value
                });
            saveIntelligenceAnalytics();
            displayPlaylists(playlistsCache);
            setStatus(
                "Filtre semaine / week-end mis à jour."
            );
            return;
        }

        if (
            event.target.id ===
            "adaptiveLearningEnabledInput"
        ) {
            adaptiveLearningState =
                normalizeAdaptiveLearningState({
                    ...adaptiveLearningState,
                    enabled:
                        event.target.checked
                });
            saveAdaptiveLearningState();
            displayPlaylists(playlistsCache);
            setStatus(
                event.target.checked
                    ? "Adaptive Learning activé."
                    : "Adaptive Learning désactivé."
            );
            return;
        }

        if (
            event.target.id ===
            "adaptiveLearningAutoApplyInput"
        ) {
            adaptiveLearningState =
                normalizeAdaptiveLearningState({
                    ...adaptiveLearningState,
                    autoApplyEnabled:
                        event.target.checked
                });
            saveAdaptiveLearningState();
            displayPlaylists(playlistsCache);
            setStatus(
                event.target.checked
                    ? "Adaptation automatique autorisée."
                    : "Adaptation automatique désactivée."
            );
            return;
        }

        if (
            event.target.id ===
            "adaptiveLearningAutoConfidenceInput"
        ) {
            adaptiveLearningState =
                normalizeAdaptiveLearningState({
                    ...adaptiveLearningState,
                    autoApplyMinConfidence:
                        Number(event.target.value)
                });
            saveAdaptiveLearningState();
            displayPlaylists(playlistsCache);
            setStatus(
                `Seuil automatique réglé à ${adaptiveLearningState.autoApplyMinConfidence}%.`
            );
            return;
        }

        if (
            event.target.id ===
            "adaptiveLearningAutoObservationsInput"
        ) {
            adaptiveLearningState =
                normalizeAdaptiveLearningState({
                    ...adaptiveLearningState,
                    autoApplyMinObservations:
                        Number(event.target.value)
                });
            saveAdaptiveLearningState();
            displayPlaylists(playlistsCache);
            setStatus(
                `Minimum automatique : ${adaptiveLearningState.autoApplyMinObservations} choix concordants.`
            );
            return;
        }

        if (
            !event.target.matches(
                "[data-ios-command-type]"
            )
        ) {
            return;
        }

        const form =
            event.target.closest(
                "#iosCommandForm"
            );
        const isSmartMix =
            event.target.value === "smartmix";

        form
            ?.querySelectorAll(
                "[data-ios-fixed-field]"
            )
            .forEach((element) => {
                element.hidden = isSmartMix;
            });

        form
            ?.querySelectorAll(
                "[data-ios-smartmix-field]"
            )
            .forEach((element) => {
                element.hidden = !isSmartMix;
            });

        const playlistSelect =
            form?.elements?.playlistId;
        const mixSelect =
            form?.elements?.mixId;

        if (playlistSelect) {
            playlistSelect.required =
                !isSmartMix;
        }

        if (mixSelect) {
            mixSelect.required =
                isSmartMix;
        }
    }
);

contentElement.addEventListener(
    "submit",
    async (event) => {
        if (
            event.target.id === "adaptiveDjMenuForm"
        ) {
            event.preventDefault();
            saveAdaptiveDjMenuFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "iosCommandForm"
        ) {
            event.preventDefault();
            saveIosCommandFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "iosQuickPlayForm"
        ) {
            event.preventDefault();
            saveIosQuickPlayFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "mixScheduleForm"
        ) {
            event.preventDefault();
            createMixScheduleFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "cleanupSettingsForm"
        ) {
            event.preventDefault();
            saveCleanupSettingsFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "adaptiveSettingsForm"
        ) {
            event.preventDefault();
            saveAdaptiveSettingsFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "intensitySettingsForm"
        ) {
            event.preventDefault();
            saveIntensitySettingsFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "coherenceSettingsForm"
        ) {
            event.preventDefault();
            saveCoherenceSettingsFromForm(
                event.target
            );
            return;
        }

        if (event.target.id === "priorityRulesForm") {
            event.preventDefault();
            savePriorityRulesFromForm(event.target);
            return;
        }

        if (event.target.id === "exclusionRulesForm") {
            event.preventDefault();
            saveExclusionRulesFromForm(event.target);
            return;
        }

        if (
            event.target.matches(
                "[data-saved-mix-settings-id]"
            )
        ) {
            event.preventDefault();
            saveSavedMixSettings(
                event.target.dataset.savedMixSettingsId || ""
            );
            return;
        }

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
        if (
            event.target.matches(
                "[data-adaptive-duration-mode]"
            )
        ) {
            const form = event.target.closest(
                "#adaptiveSettingsForm"
            );
            const customField = form?.querySelector(
                "[data-adaptive-custom-duration]"
            );

            if (customField) {
                customField.hidden =
                    event.target.value !== "custom";
            }

            return;
        }

        if (
            event.target.matches(
                "[data-schedule-recurrence]"
            )
        ) {
            const form = event.target.closest(
                "#mixScheduleForm"
            );
            const weekly =
                event.target.value === "weekly";

            form?.querySelectorAll(
                "[data-schedule-weekly-field]"
            ).forEach((element) => {
                element.hidden = !weekly;
            });

            form?.querySelectorAll(
                "[data-schedule-once-field]"
            ).forEach((element) => {
                element.hidden = weekly;
            });

            return;
        }

        if (event.target.id === "backupFileInput") {
            const [file] = event.target.files || [];
            await importBackupFile(file);
            event.target.value = "";
            return;
        }

        if (
            event.target.name === "profileId" &&
            event.target.closest(
                "[data-saved-mix-settings-id]"
            )
        ) {
            const form = event.target.closest(
                "[data-saved-mix-settings-id]"
            );
            const profile = getProfileById(
                event.target.value
            );

            if (form && profile) {
                const settings =
                    normalizeShuffleSettings(
                        profile.shuffleSettings
                    );

                form.elements.preset.value =
                    settings.preset;
                form.elements.artistGap.value =
                    settings.artistGap;
                form.elements.albumGap.value =
                    settings.albumGap;
                form.elements.recentAvoidance.value =
                    settings.recentAvoidance;

                for (const input of [
                    form.elements.artistGap,
                    form.elements.albumGap,
                    form.elements.recentAvoidance
                ]) {
                    input.dispatchEvent(
                        new Event("input", {
                            bubbles: true
                        })
                    );
                }
            }

            return;
        }

        if (event.target.matches("[data-shuffle-preset]")) {
            const form = event.target.closest(
                "[data-saved-mix-settings-id]"
            );
            const preset =
                SHUFFLE_PRESETS[event.target.value] ||
                SHUFFLE_PRESETS.balanced;

            if (form && event.target.value !== "custom") {
                const artistInput = form.elements.artistGap;
                const albumInput = form.elements.albumGap;
                const recentInput = form.elements.recentAvoidance;

                artistInput.value = preset.artistGap;
                albumInput.value = preset.albumGap;
                recentInput.value = preset.recentAvoidance;

                artistInput.dispatchEvent(
                    new Event("input", { bubbles: true })
                );
                albumInput.dispatchEvent(
                    new Event("input", { bubbles: true })
                );
                recentInput.dispatchEvent(
                    new Event("input", { bubbles: true })
                );
            }

            return;
        }

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

            if (librarySort.startsWith("recent")) {
                try {
                    await ensureRecentActivityLoaded();
                    displayPlaylists(playlistsCache);
                } catch (error) {
                    console.error(error);
                    setStatus(
                        error.message ||
                        "Impossible d’analyser les écoutes récentes.",
                        "error"
                    );
                }
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
        if (
            event.target.matches(
                "[data-intensity-control]"
            )
        ) {
            updateIntensityPreviewFromForm(
                event.target.closest(
                    "#intensitySettingsForm"
                )
            );
            return;
        }

        if (event.target.matches("[data-shuffle-setting]")) {
            const form = event.target.closest(
                "[data-saved-mix-settings-id]"
            );
            const settingName =
                event.target.dataset.shuffleSetting;
            const valueElement = form?.querySelector(
                `[data-setting-value="${settingName}"]`
            );

            if (valueElement) {
                valueElement.textContent =
                    settingName === "recentAvoidance"
                        ? getRecentAvoidanceLabel(
                            event.target.value
                        )
                        : event.target.value;
            }

            const presetSelect =
                form?.querySelector("[data-shuffle-preset]");

            if (
                presetSelect &&
                presetSelect.value !== "custom"
            ) {
                const preset =
                    SHUFFLE_PRESETS[presetSelect.value];

                const stillMatchesPreset =
                    Number(form.elements.artistGap.value) ===
                        preset.artistGap &&
                    Number(form.elements.albumGap.value) ===
                        preset.albumGap &&
                    Number(form.elements.recentAvoidance.value) ===
                        preset.recentAvoidance;

                if (!stillMatchesPreset) {
                    presetSelect.value = "custom";
                }
            }

            return;
        }

        if (event.target.id === "trackOrderSearchInput") {
            trackSearchTerm = event.target.value;
            renderTrackList();

            const searchInput = document.getElementById(
                "trackOrderSearchInput"
            );

            if (searchInput) {
                const cursorPosition =
                    event.target.selectionStart ??
                    trackSearchTerm.length;

                searchInput.focus();
                searchInput.setSelectionRange(
                    cursorPosition,
                    cursorPosition
                );
            }

            return;
        }

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


contentElement.addEventListener(
    "dragstart",
    (event) => {
        const row = event.target.closest(
            ".track-row[data-track-index]"
        );

        if (!row) {
            return;
        }

        draggedTrackIndex = Number(
            row.dataset.trackIndex
        );

        row.classList.add("is-dragging");

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(
                "text/plain",
                String(draggedTrackIndex)
            );
        }
    }
);

contentElement.addEventListener(
    "dragover",
    (event) => {
        const row = event.target.closest(
            ".track-row[data-track-index]"
        );

        if (!row || draggedTrackIndex < 0) {
            return;
        }

        event.preventDefault();

        document
            .querySelectorAll(".track-row.is-drag-target")
            .forEach((item) =>
                item.classList.remove("is-drag-target")
            );

        row.classList.add("is-drag-target");

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }
);

contentElement.addEventListener(
    "drop",
    (event) => {
        const row = event.target.closest(
            ".track-row[data-track-index]"
        );

        if (!row || draggedTrackIndex < 0) {
            return;
        }

        event.preventDefault();

        const targetIndex = Number(
            row.dataset.trackIndex
        );

        moveTrack(
            draggedTrackIndex,
            targetIndex
        );

        draggedTrackIndex = -1;
    }
);

contentElement.addEventListener(
    "dragend",
    () => {
        draggedTrackIndex = -1;

        document
            .querySelectorAll(
                ".track-row.is-dragging, .track-row.is-drag-target"
            )
            .forEach((row) => {
                row.classList.remove(
                    "is-dragging",
                    "is-drag-target"
                );
            });
    }
);

}

initializePwa();
initializeApp();
