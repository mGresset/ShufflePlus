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

const versionElement = document.querySelector(".version");
const welcomeElement = document.getElementById("welcome");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const contentElement = document.getElementById("content");
const statusElement = document.getElementById("status");

const APP_VERSION = "2.5.0";
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
        description: "Rythme soutenu, peu de répétitions et titres très courts évités.",
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
        }
    },
    {
        id: "profile-soiree",
        name: "Soirée",
        icon: "🎉",
        description: "Mélange énergique et varié, avec des répétitions limitées.",
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
        ,
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        }
    }
    },
    {
        id: "profile-famille",
        name: "Famille",
        icon: "👨‍👩‍👧‍👦",
        description: "Titres explicites, live, remix et karaoké masqués.",
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
        ,
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        }
    }
    },
    {
        id: "profile-decouverte",
        name: "Découverte",
        icon: "🔭",
        description: "Espacement fort des artistes et éviction renforcée des titres récents.",
        isDefault: true,
        shuffleSettings: {
            preset: "strict",
            artistGap: 7,
            albumGap: 4,
            recentAvoidance: 3
        },
        exclusionRules: {
            ...DEFAULT_EXCLUSION_RULES
        ,
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        }
    }
    },
    {
        id: "profile-concentration",
        name: "Concentration",
        icon: "🧠",
        description: "Titres courts, live, remix et karaoké écartés pour une écoute régulière.",
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
        ,
        priorityRules: {
            ...DEFAULT_PRIORITY_RULES
        }
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
let mixSchedules = readMixSchedules();
let scheduleCheckTimer = 0;
let scheduleRunInProgress = false;
let pendingScheduledPlayback = null;

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
    activeHistoryId = "";
    lastExclusionSummary = null;
    lastPrioritySummary = null;
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

    return (
        devices.find(
            (device) =>
                device.id === schedule.deviceId
        ) ||
        devices.find(
            (device) =>
                schedule.deviceName &&
                device.name === schedule.deviceName
        ) ||
        devices.find((device) => device.is_active) ||
        devices[0]
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
        playbackUris.length
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
    activeProfileId = profile.id;

    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();

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
    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();
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
        coherenceSettings: currentCoherenceSettings
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
        getCoherenceSummary(profile.coherenceSettings)
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
        return;
    }

    const validSourceKeys =
        getValidSavedMixSourceKeys(mix);

    if (!validSourceKeys.length) {
        setStatus(
            "Les sources de ce mix ne sont plus accessibles.",
            "error"
        );
        return;
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
    }
    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();
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
    tracks
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
}

function addTracksSentToHistory(count) {
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

            ${renderBackupPanel()}

            ${renderMixSchedulesSection()}

            ${renderMixProfilesSection()}

            ${renderPriorityPanel()}

            ${renderCoherencePanel()}

            ${renderExclusionPanel()}

            ${renderSavedMixesSection()}

            ${renderMixHistorySection()}

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
        analyzeShuffleOrder(selectedTracks)
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
        analyzeShuffleOrder(selectedTracks)
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
        analyzeShuffleOrder(selectedTracks)
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
            <strong>${stats.repeatedVersionTransitions ?? 0}</strong>.
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
        addTracksSentToHistory(queueBlock.tracks.length);
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

        registerMixHistoryLaunch({
            name: selectedPlaylist.name,
            sourceKeys: selectedKeys,
            shuffleSettings: currentShuffleSettings,
            tracks: selectedTracks
        });

        pendingSavedMixResumeKey = "";

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

        const exclusionResult = applyExclusionRules(
            [...tracks],
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

contentElement.addEventListener(
    "click",
    async (event) => {
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
                await launchSavedMix(mixId);
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

initializeApp();
