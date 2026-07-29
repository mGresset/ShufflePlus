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
    getCurrentPlayback,
    transferPlayback,
    setPlaybackShuffle,
    startPlayback,
    resumePlayback,
    pausePlayback,
    skipToNext,
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

const APP_VERSION = "5.4.0";

const UI_THEME_KEY =
    "shuffleplus_ui_theme_v1";
const UI_ACCENT_PRESETS = {
    violet: {
        id: "violet",
        label: "Violet",
        primary: "#8b5cf6",
        secondary: "#2563eb",
        rgb: "139 92 246"
    },
    blue: {
        id: "blue",
        label: "Bleu",
        primary: "#3b82f6",
        secondary: "#06b6d4",
        rgb: "59 130 246"
    },
    pink: {
        id: "pink",
        label: "Rose",
        primary: "#ec4899",
        secondary: "#8b5cf6",
        rgb: "236 72 153"
    },
    emerald: {
        id: "emerald",
        label: "Émeraude",
        primary: "#10b981",
        secondary: "#2563eb",
        rgb: "16 185 129"
    },
    orange: {
        id: "orange",
        label: "Orange",
        primary: "#f59e0b",
        secondary: "#ef4444",
        rgb: "245 158 11"
    }
};
const DEFAULT_UI_THEME_SETTINGS = {
    accent: "violet",
    motionEnabled: true,
    highContrast: false,
    updatedAt: 0
};
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
const MIX_STUDIO_TEMPLATES_KEY =
    "shuffleplus_mix_studio_templates_v1";
const MAX_MIX_STUDIO_TEMPLATES = 12;
const TRACK_HISTORY_KEY = "shuffleplus_recent_track_uris_v1";
const BACKUP_FORMAT = "shuffleplus-backup";
const BACKUP_SCHEMA_VERSION = 1;
const MAX_IMPORTED_FAVORITES = 500;
const MAX_IMPORTED_HISTORY = 50;
const PLAYBACK_QUEUE_STATE_KEY = "shuffleplus_playback_queue_state_v1";
const PLAYBACK_QUEUE_STATE_TTL = 30 * 24 * 60 * 60 * 1000;
const SMART_QUEUE_SESSION_KEY =
    "shuffleplus_smart_queue_session_v1";
const SMART_QUEUE_PREVIEW_COUNT = 6;
const MAX_SMART_QUEUE_AVOIDS = 40;
const MUSIC_FEEDBACK_KEY =
    "shuffleplus_music_feedback_v1";
const MAX_MUSIC_FEEDBACK_TRACKS = 500;
const MAX_MUSIC_FEEDBACK_EVENTS = 400;
const MUSIC_FEEDBACK_NOT_NOW_TTL =
    7 * 24 * 60 * 60 * 1000;
const MUSIC_FEEDBACK_REPETITIVE_TTL =
    30 * 24 * 60 * 60 * 1000;
const DEFAULT_MUSIC_FEEDBACK_STATE = {
    records: {},
    events: [],
    updatedAt: 0
};
const DRIVING_MODE_SETTINGS_KEY =
    "shuffleplus_driving_mode_settings_v1";
const DRIVING_MODE_REFRESH_MS = 8000;
const DRIVING_MODE_ACTION_COOLDOWN_MS = 900;
const DEFAULT_DRIVING_MODE_SETTINGS = {
    keepScreenAwake: true,
    autoRefresh: true,
    showFeedback: true
};
const QUICK_CONTROL_LANGUAGE = "fr-FR";
const QUICK_CONTROL_ACTIONS = [
    {
        id: "adaptive",
        icon: "🤖",
        label: "Lancer Adaptive DJ",
        description: "Choisit le mix correspondant au contexte actuel."
    },
    {
        id: "playpause",
        icon: "⏯️",
        label: "Pause / reprise",
        description: "Bascule l’état de la lecture Spotify."
    },
    {
        id: "next",
        icon: "⏭️",
        label: "Titre suivant",
        description: "Passe immédiatement au morceau suivant."
    },
    {
        id: "like-current",
        icon: "💚",
        label: "J’aime le titre",
        description: "Favorise le morceau actif dans les prochains mix."
    },
    {
        id: "not-now-current",
        icon: "⏳",
        label: "Pas maintenant",
        description: "Écarte temporairement le morceau actif."
    },
    {
        id: "driving",
        icon: "🚗",
        label: "Mode conduite",
        description: "Ouvre l’interface simplifiée pour les trajets."
    }
];
const QUICK_CONTEXTS_KEY =
    "shuffleplus_quick_contexts_v1";
const QUICK_EXTERNAL_RESULT_KEY =
    "shuffleplus_quick_external_result_v1";
const QUICK_EXTERNAL_RESULT_TTL =
    24 * 60 * 60 * 1000;
const SYNC_INSTALLATION_KEY =
    "shuffleplus_sync_installation_v1";
const SYNC_SETTINGS_KEY =
    "shuffleplus_sync_settings_v1";
const SYNC_PACKAGE_FORMAT =
    "shuffleplus-sync-package";
const SYNC_PACKAGE_SCHEMA_VERSION = 1;
const SYNC_MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_SYNC_SETTINGS = {
    conflictPolicy: "manual"
};
const SYNC_PAIRED_DEVICES_KEY =
    "shuffleplus_sync_paired_devices_v1";
const SYNC_PAIRING_INVITES_KEY =
    "shuffleplus_sync_pairing_invites_v1";
const SYNC_SESSION_HISTORY_KEY =
    "shuffleplus_sync_session_history_v1";
const SYNC_PAIRING_INVITE_FORMAT =
    "shuffleplus-pairing-invitation";
const SYNC_PAIRING_ACCEPT_FORMAT =
    "shuffleplus-pairing-acceptance";
const SYNC_PAIRING_SCHEMA_VERSION = 1;
const SYNC_PAIRING_TTL = 15 * 60 * 1000;
const MAX_SYNC_PAIRED_DEVICES = 12;
const MAX_SYNC_PAIRING_INVITES = 8;
const MAX_SYNC_SESSION_HISTORY = 40;
const SYNC_SELECTIVE_CATEGORY_IDS = [
    "library",
    "profiles",
    "automation",
    "feedback",
    "learning",
    "history"
];
const SYNC_LAST_MERGE_UNDO_KEY =
    "shuffleplus_sync_last_merge_undo_v1";
const SYNC_LAST_MERGE_UNDO_TTL =
    30 * 24 * 60 * 60 * 1000;
const SYNC_ENCRYPTED_PACKAGE_FORMAT =
    "shuffleplus-encrypted-sync-package";
const SYNC_ENCRYPTION_SCHEMA_VERSION = 1;
const SYNC_ENCRYPTION_ITERATIONS = 210000;
const SYNC_DIFF_MAX_ITEMS_PER_CATEGORY = 250;
const SERVER_SYNC_STORAGE_KEY =
    "shuffleplus_server_sync_v1";
const SERVER_SYNC_LINK_FORMAT =
    "shuffleplus-server-link";
const SERVER_SYNC_SCHEMA_VERSION = 1;
const SERVER_SYNC_DEFAULT_INTERVAL_MINUTES = 5;
const SERVER_SYNC_MAX_INTERVAL_MINUTES = 60;
const SERVER_SYNC_REQUEST_TIMEOUT = 15000;
const DEFAULT_QUICK_CONTEXTS = [
    {
        id: "drive",
        name: "Trajet",
        icon: "🚗",
        mixId: "",
        profileId: "",
        autoplay: true
    },
    {
        id: "work",
        name: "Travail",
        icon: "💼",
        mixId: "",
        profileId: "profile-concentration",
        autoplay: true
    },
    {
        id: "party",
        name: "Soirée",
        icon: "🎉",
        mixId: "",
        profileId: "profile-soiree",
        autoplay: true
    },
    {
        id: "night",
        name: "Nuit",
        icon: "🌙",
        mixId: "",
        profileId: "",
        autoplay: true
    }
];
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
const ADAPTIVE_DJ_SCENES_KEY =
    "shuffleplus_adaptive_dj_scenes_v1";
const DEFAULT_ADAPTIVE_DJ_SCENES = [
    {
        id: "morning",
        icon: "☀️",
        label: "Matin",
        description: "Réveil progressif et positif.",
        mixId: "",
        profileId: "profile-concentration",
        energyTarget: 48,
        varietyTarget: 52,
        discoveryTarget: 18,
        durationMinutes: 35,
        autoplay: true
    },
    {
        id: "focus",
        icon: "🎯",
        label: "Focus",
        description: "Concentration stable et transitions fluides.",
        mixId: "",
        profileId: "profile-concentration",
        energyTarget: 42,
        varietyTarget: 38,
        discoveryTarget: 15,
        durationMinutes: 90,
        autoplay: true
    },
    {
        id: "chill",
        icon: "🌙",
        label: "Chill",
        description: "Ambiance douce pour se poser.",
        mixId: "",
        profileId: "profile-concentration",
        energyTarget: 32,
        varietyTarget: 40,
        discoveryTarget: 12,
        durationMinutes: 75,
        autoplay: true
    },
    {
        id: "drive",
        icon: "🚗",
        label: "Conduite",
        description: "Rythme dynamique pour la route.",
        mixId: "",
        profileId: "profile-decouverte",
        energyTarget: 72,
        varietyTarget: 85,
        discoveryTarget: 25,
        durationMinutes: 90,
        autoplay: true
    },
    {
        id: "sport",
        icon: "🔥",
        label: "Sport",
        description: "Énergie élevée et impulsion régulière.",
        mixId: "",
        profileId: "profile-sport",
        energyTarget: 88,
        varietyTarget: 68,
        discoveryTarget: 22,
        durationMinutes: 60,
        autoplay: true
    },
    {
        id: "party",
        icon: "🎉",
        label: "Party",
        description: "Mix festif pour lancer la soirée.",
        mixId: "",
        profileId: "profile-soiree",
        energyTarget: 82,
        varietyTarget: 78,
        discoveryTarget: 28,
        durationMinutes: 120,
        autoplay: true
    }
];
const DEFAULT_ADAPTIVE_DJ_SCENES_STATE = {
    activeSceneId: "drive",
    scenes: DEFAULT_ADAPTIVE_DJ_SCENES,
    updatedAt: 0
};
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


const MIX_STUDIO_MOODS = [
    {
        id: "balanced",
        icon: "🎧",
        label: "Équilibré",
        description: "Un mix polyvalent et varié.",
        profileId: "",
        preset: "balanced"
    },
    {
        id: "drive",
        icon: "🚗",
        label: "Drive",
        description: "Variété forte et énergie progressive.",
        profileId: "profile-decouverte",
        preset: "strict"
    },
    {
        id: "focus",
        icon: "🎯",
        label: "Focus",
        description: "Transitions régulières et énergie stable.",
        profileId: "profile-concentration",
        preset: "soft"
    },
    {
        id: "sport",
        icon: "🔥",
        label: "Sport",
        description: "Montée en énergie et rythme soutenu.",
        profileId: "profile-sport",
        preset: "strict"
    },
    {
        id: "party",
        icon: "🎉",
        label: "Party",
        description: "Énergie élevée et vagues de titres forts.",
        profileId: "profile-soiree",
        preset: "balanced"
    },
    {
        id: "chill",
        icon: "🌙",
        label: "Chill",
        description: "Écoute douce avec transitions fluides.",
        profileId: "profile-concentration",
        preset: "soft"
    }
];

const DEFAULT_MIX_STUDIO_SETTINGS = {
    enabled: false,
    mood: "balanced",
    durationMinutes: 60,
    artistDiversity: 6,
    albumDiversity: 6,
    adaptiveSlot: "",
    sourceWeights: {},
    templateId: "",
    preview: false
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
let mixStudioTemplates =
    readMixStudioTemplates();
let mixStudioVariantOptions = [];
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
let pendingMixStudioRuntime = null;
let pendingMixStudioDisplayName = "";
let smartQueueSession = readSmartQueueSession();
let musicFeedbackState = readMusicFeedbackState();
let drivingModeSettings = readDrivingModeSettings();
let drivingPlaybackState = null;
let drivingRefreshTimer = 0;
let drivingWakeLock = null;
let drivingActionBusy = false;
let drivingExitArmedUntil = 0;
let drivingMessage = {
    text: "",
    type: ""
};
let quickPlaybackState = null;
let quickControlBusy = false;
let quickVoiceRecognition = null;
let quickVoiceListening = false;
let quickControlMessage = {
    text: "",
    type: ""
};
let quickContextsState = readQuickContextsState();
let quickExternalResult = readQuickExternalResult();
let quickShortcutWizardContextId =
    quickContextsState[0]?.id || "drive";
let syncInstallation = readSyncInstallation();
let syncSettings = readSyncSettings();
let pendingSyncPackage = null;
let syncPairedDevices = readSyncPairedDevices();
let syncPairingInvites = readSyncPairingInvites();
let syncSessionHistory = readSyncSessionHistory();
let syncSimulationResult = null;
let lastSyncMergeUndo = readLastSyncMergeUndo();
let serverSyncState = readServerSyncState();
let serverSyncTimer = 0;
let serverSyncBusy = false;
let serverSyncDevices = [];
let serverSyncMessage = {
    text: "",
    type: ""
};
let smartQueueUndoSnapshot = null;
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
let uiThemeSettings = readUiThemeSettings();
let adaptiveDjMenuSettings =
    readAdaptiveDjMenuSettings();
let adaptiveDjMenuHistory =
    readAdaptiveDjMenuHistory();
let adaptiveDjScenesState =
    readAdaptiveDjScenesState();
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

applyUiThemeSettings();
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
    statusElement.setAttribute(
        "role",
        type === "error"
            ? "alert"
            : "status"
    );
    statusElement.setAttribute(
        "aria-live",
        type === "error"
            ? "assertive"
            : "polite"
    );
    statusElement.textContent = message;
    statusElement.className = "status";

    if (type) {
        statusElement.classList.add(type);
    }
}


function showToast(
    message = "",
    type = "success"
) {
    let toast = document.getElementById(
        "shuffleplusToast"
    );

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "shuffleplusToast";
        toast.className = "app-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute(
            "aria-live",
            "polite"
        );
        toast.setAttribute(
            "aria-atomic",
            "true"
        );
        document.body.appendChild(toast);
    }

    window.clearTimeout(
        showToast.hideTimer
    );
    window.clearTimeout(
        showToast.removeTimer
    );

    toast.textContent = message;
    toast.className =
        `app-toast is-${type}`;
    toast.hidden = false;

    window.requestAnimationFrame(() => {
        toast.classList.add("is-visible");
    });

    showToast.hideTimer =
        window.setTimeout(() => {
            toast.classList.remove(
                "is-visible"
            );

            showToast.removeTimer =
                window.setTimeout(() => {
                    toast.hidden = true;
                }, 240);
        }, 2200);
}

async function copyTextToClipboard(
    text = ""
) {
    if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
            "function"
    ) {
        await navigator.clipboard.writeText(
            text
        );
        return;
    }

    const textarea =
        document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute(
        "readonly",
        ""
    );
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(
        0,
        textarea.value.length
    );

    const copied =
        document.execCommand("copy");

    textarea.remove();

    if (!copied) {
        throw new Error(
            "Copie dans le presse-papiers impossible."
        );
    }
}


function normalizeUiThemeSettings(value = {}) {
    const accent =
        typeof value.accent === "string" &&
        Object.hasOwn(
            UI_ACCENT_PRESETS,
            value.accent
        )
            ? value.accent
            : DEFAULT_UI_THEME_SETTINGS.accent;

    return {
        accent,
        motionEnabled:
            value.motionEnabled !== false,
        highContrast:
            value.highContrast === true,
        updatedAt: Number(
            value.updatedAt || 0
        )
    };
}

function readUiThemeSettings() {
    try {
        const raw = localStorage.getItem(
            UI_THEME_KEY
        );

        return normalizeUiThemeSettings(
            raw
                ? JSON.parse(raw)
                : DEFAULT_UI_THEME_SETTINGS
        );
    } catch (error) {
        console.warn(
            "Thème Shuffle+ illisible :",
            error
        );

        return normalizeUiThemeSettings(
            DEFAULT_UI_THEME_SETTINGS
        );
    }
}

function saveUiThemeSettings() {
    uiThemeSettings =
        normalizeUiThemeSettings({
            ...uiThemeSettings,
            updatedAt: Date.now()
        });

    try {
        localStorage.setItem(
            UI_THEME_KEY,
            JSON.stringify(uiThemeSettings)
        );
    } catch (error) {
        console.warn(
            "Thème Shuffle+ non enregistré :",
            error
        );
    }
}

function applyUiThemeSettings() {
    const preset =
        UI_ACCENT_PRESETS[
            uiThemeSettings.accent
        ] ||
        UI_ACCENT_PRESETS.violet;

    document.documentElement.dataset.accent =
        preset.id;
    document.documentElement.classList.toggle(
        "reduce-motion",
        !uiThemeSettings.motionEnabled
    );
    document.documentElement.classList.toggle(
        "high-contrast",
        uiThemeSettings.highContrast
    );

    document.documentElement.style.setProperty(
        "--accent",
        preset.primary
    );
    document.documentElement.style.setProperty(
        "--accent-secondary",
        preset.secondary
    );
    document.documentElement.style.setProperty(
        "--accent-rgb",
        preset.rgb
    );

    const themeColorMeta =
        document.querySelector(
            'meta[name="theme-color"]'
        );

    if (themeColorMeta) {
        themeColorMeta.setAttribute(
            "content",
            preset.primary
        );
    }
}

function updateUiThemeAccent(accent = "") {
    if (
        !Object.hasOwn(
            UI_ACCENT_PRESETS,
            accent
        )
    ) {
        return;
    }

    uiThemeSettings =
        normalizeUiThemeSettings({
            ...uiThemeSettings,
            accent
        });

    saveUiThemeSettings();
    applyUiThemeSettings();

    document
        .querySelectorAll("[data-ui-accent]")
        .forEach((button) => {
            const selected =
                button.dataset.uiAccent ===
                uiThemeSettings.accent;

            button.classList.toggle(
                "is-selected",
                selected
            );
            button.setAttribute(
                "aria-pressed",
                String(selected)
            );
        });

    const preset =
        UI_ACCENT_PRESETS[accent];

    const activeBadge =
        document.querySelector(
            ".ui-theme-active-badge"
        );

    if (activeBadge) {
        activeBadge.textContent =
            preset.label;
    }

    showToast(
        `🎨 Couleur ${preset.label} appliquée.`,
        "success"
    );
}

function renderUiThemeSettingsPanel() {
    const accentButtons =
        Object.values(UI_ACCENT_PRESETS)
            .map((preset) => {
                const selected =
                    preset.id ===
                    uiThemeSettings.accent;

                return `
                    <button
                        class="ui-theme-swatch
                        ${selected
                            ? "is-selected"
                            : ""}"
                        type="button"
                        data-ui-accent="${escapeHtml(
                            preset.id
                        )}"
                        aria-pressed="${String(
                            selected
                        )}"
                        title="Utiliser le thème ${escapeHtml(
                            preset.label
                        )}"
                        style="
                            --swatch-primary:
                                ${escapeHtml(
                                    preset.primary
                                )};
                            --swatch-secondary:
                                ${escapeHtml(
                                    preset.secondary
                                )};
                        "
                    >
                        <span
                            class="ui-theme-swatch-color"
                            aria-hidden="true"
                        ></span>
                        <span>
                            ${escapeHtml(
                                preset.label
                            )}
                        </span>
                    </button>
                `;
            })
            .join("");

    return `
        <section
            id="uiThemeSettingsPanel"
            class="settings-panel ui-theme-panel"
        >
            <div class="panel-heading">
                <div>
                    <span class="ui-theme-kicker">
                        ✨ Apparence v5.3
                    </span>
                    <h3>
                        Dynamique & musicale
                    </h3>
                    <p>
                        Une interface sombre, immersive et
                        moins flashy, avec le violet comme
                        couleur par défaut.
                    </p>
                </div>

                <span class="ui-theme-active-badge">
                    ${escapeHtml(
                        UI_ACCENT_PRESETS[
                            uiThemeSettings.accent
                        ]?.label || "Violet"
                    )}
                </span>
            </div>

            <div class="ui-theme-preview">
                <article>
                    <span>Adaptive DJ</span>
                    <strong>Énergie · 72 %</strong>
                    <div class="ui-theme-preview-meter">
                        <i></i>
                    </div>
                </article>

                <article>
                    <span>Mix en cours</span>
                    <strong>Conduite dynamique</strong>
                    <small>
                        Fluide · Varié · Personnalisé
                    </small>
                </article>

                <article>
                    <span>Ambiance</span>
                    <strong>Couleur personnalisable</strong>
                    <small>
                        Le contenu reste identique.
                    </small>
                </article>
            </div>

            <fieldset class="ui-theme-accent-picker">
                <legend>Couleur d’accent</legend>
                <div class="ui-theme-swatches">
                    ${accentButtons}
                </div>
            </fieldset>

            <div class="ui-theme-accessibility-options">
                <label class="ui-theme-motion-toggle">
                    <input
                        id="uiThemeMotionInput"
                        type="checkbox"
                        ${uiThemeSettings.motionEnabled
                            ? "checked"
                            : ""}
                    >
                    <span>
                        <strong>
                            Animations fluides
                        </strong>
                        <small>
                            Désactive-les pour une interface
                            plus calme ou pour économiser la batterie.
                        </small>
                    </span>
                </label>

                <label class="ui-theme-motion-toggle">
                    <input
                        id="uiThemeContrastInput"
                        type="checkbox"
                        ${uiThemeSettings.highContrast
                            ? "checked"
                            : ""}
                    >
                    <span>
                        <strong>
                            Contraste renforcé
                        </strong>
                        <small>
                            Accentue les textes, bordures et états actifs
                            pour une lecture plus confortable.
                        </small>
                    </span>
                </label>
            </div>
        </section>
    `;
}

function setDisconnectedInterface() {
    document.body.classList.remove(
        "is-connected"
    );
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
    pendingMixStudioRuntime = null;
    pendingMixStudioDisplayName = "";
    smartQueueUndoSnapshot = null;
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
    document.body.classList.add(
        "is-connected"
    );
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


function normalizeMusicFeedbackAction(value = "") {
    return [
        "like",
        "not-now",
        "repetitive",
        "neutral"
    ].includes(value)
        ? value
        : "neutral";
}

function normalizeMusicFeedbackRecord(
    record = {},
    fallbackKey = ""
) {
    const key =
        typeof record.key === "string" &&
        record.key.trim()
            ? record.key.trim().slice(0, 180)
            : String(fallbackKey || "")
                .trim()
                .slice(0, 180);

    if (!key) {
        return null;
    }

    return {
        key,
        uri:
            typeof record.uri === "string"
                ? record.uri.slice(0, 180)
                : key.startsWith("spotify:track:")
                    ? key
                    : "",
        trackName:
            typeof record.trackName === "string"
                ? record.trackName.slice(0, 160)
                : "Morceau",
        artists:
            typeof record.artists === "string"
                ? record.artists.slice(0, 220)
                : "",
        albumName:
            typeof record.albumName === "string"
                ? record.albumName.slice(0, 180)
                : "",
        action: normalizeMusicFeedbackAction(
            record.action
        ),
        activeUntil: Math.max(
            0,
            Number(record.activeUntil || 0)
        ),
        likeCount: Math.max(
            0,
            Number(record.likeCount || 0)
        ),
        notNowCount: Math.max(
            0,
            Number(record.notNowCount || 0)
        ),
        repetitiveCount: Math.max(
            0,
            Number(record.repetitiveCount || 0)
        ),
        updatedAt: Math.max(
            0,
            Number(record.updatedAt || Date.now())
        )
    };
}

function normalizeMusicFeedbackEvent(item = {}) {
    const action = normalizeMusicFeedbackAction(
        item.action
    );

    return {
        id:
            typeof item.id === "string"
                ? item.id.slice(0, 120)
                : createIosCommandId(),
        trackKey:
            typeof item.trackKey === "string"
                ? item.trackKey.slice(0, 180)
                : "",
        trackName:
            typeof item.trackName === "string"
                ? item.trackName.slice(0, 160)
                : "Morceau",
        artists:
            typeof item.artists === "string"
                ? item.artists.slice(0, 220)
                : "",
        action,
        source:
            typeof item.source === "string"
                ? item.source.slice(0, 60)
                : "track-menu",
        createdAt: Math.max(
            0,
            Number(item.createdAt || Date.now())
        )
    };
}

function normalizeMusicFeedbackState(state = {}) {
    const records = {};
    const inputRecords =
        state.records &&
        typeof state.records === "object"
            ? Object.entries(state.records)
            : [];

    inputRecords
        .sort(
            (first, second) =>
                Number(second[1]?.updatedAt || 0) -
                Number(first[1]?.updatedAt || 0)
        )
        .slice(0, MAX_MUSIC_FEEDBACK_TRACKS)
        .forEach(([key, value]) => {
            const record =
                normalizeMusicFeedbackRecord(
                    value,
                    key
                );

            if (record) {
                records[record.key] = record;
            }
        });

    const events = Array.isArray(state.events)
        ? state.events
            .map((item) =>
                normalizeMusicFeedbackEvent(item)
            )
            .filter((item) => item.trackKey)
            .sort(
                (first, second) =>
                    second.createdAt -
                    first.createdAt
            )
            .slice(0, MAX_MUSIC_FEEDBACK_EVENTS)
        : [];

    return {
        records,
        events,
        updatedAt: Math.max(
            0,
            Number(state.updatedAt || Date.now())
        )
    };
}

function readMusicFeedbackState() {
    try {
        const raw = localStorage.getItem(
            MUSIC_FEEDBACK_KEY
        );

        return normalizeMusicFeedbackState(
            raw
                ? JSON.parse(raw)
                : DEFAULT_MUSIC_FEEDBACK_STATE
        );
    } catch (error) {
        console.warn(
            "Feedback musical illisible :",
            error
        );
        return normalizeMusicFeedbackState(
            DEFAULT_MUSIC_FEEDBACK_STATE
        );
    }
}

function saveMusicFeedbackState() {
    musicFeedbackState =
        normalizeMusicFeedbackState({
            ...musicFeedbackState,
            updatedAt: Date.now()
        });

    try {
        localStorage.setItem(
            MUSIC_FEEDBACK_KEY,
            JSON.stringify(musicFeedbackState)
        );
    } catch (error) {
        console.warn(
            "Feedback musical non enregistré :",
            error
        );
    }
}

function getMusicFeedbackTrackKey(track) {
    const uri =
        typeof track?.uri === "string"
            ? track.uri.trim()
            : "";

    if (uri) {
        return uri;
    }

    const id =
        typeof track?.id === "string"
            ? track.id.trim()
            : "";

    return id
        ? `spotify:track:${id}`
        : "";
}

function getMusicFeedbackRecord(track) {
    const key = getMusicFeedbackTrackKey(track);

    if (!key) {
        return null;
    }

    return musicFeedbackState.records[key] || null;
}

function getActiveMusicFeedbackAction(
    record = null,
    now = Date.now()
) {
    if (!record) {
        return "neutral";
    }

    if (record.action === "like") {
        return "like";
    }

    if (
        ["not-now", "repetitive"].includes(
            record.action
        ) &&
        record.activeUntil > now
    ) {
        return record.action;
    }

    return "neutral";
}

function getMusicFeedbackLabel(action = "neutral") {
    if (action === "like") {
        return "J’aime";
    }
    if (action === "not-now") {
        return "Pas maintenant";
    }
    if (action === "repetitive") {
        return "Trop répétitif";
    }
    return "Neutre";
}

function getMusicFeedbackIcon(action = "neutral") {
    if (action === "like") {
        return "💚";
    }
    if (action === "not-now") {
        return "⏳";
    }
    if (action === "repetitive") {
        return "🔁";
    }
    return "○";
}

function getMusicFeedbackExpiryLabel(record = null) {
    const action = getActiveMusicFeedbackAction(record);

    if (
        !record ||
        !["not-now", "repetitive"].includes(action)
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "medium"
        }
    ).format(
        new Date(record.activeUntil)
    );
}

function getLikedMusicFeedbackTrackUris() {
    return Object.values(
        musicFeedbackState.records
    )
        .filter(
            (record) =>
                getActiveMusicFeedbackAction(
                    record
                ) === "like" &&
                record.uri
        )
        .map((record) => record.uri)
        .slice(0, MAX_PRIORITY_TEXT_ITEMS);
}

function getMusicFeedbackScore(track) {
    const record = getMusicFeedbackRecord(track);
    const action = getActiveMusicFeedbackAction(
        record
    );

    if (action === "like") {
        return Math.min(
            240,
            130 +
            Math.max(0, record.likeCount - 1) * 20
        );
    }

    return 0;
}

function getMusicFeedbackExclusionReason(track) {
    const action = getActiveMusicFeedbackAction(
        getMusicFeedbackRecord(track)
    );

    if (action === "not-now") {
        return "pas maintenant";
    }

    if (action === "repetitive") {
        return "trop répétitif";
    }

    return "";
}

function buildMusicFeedbackRecord(
    track,
    action,
    previous = null
) {
    const key = getMusicFeedbackTrackKey(track);
    const now = Date.now();
    const normalizedAction =
        normalizeMusicFeedbackAction(action);
    const artists = (track?.artists || [])
        .map((artist) => artist?.name)
        .filter(Boolean)
        .join(", ");
    const sameActiveAction =
        getActiveMusicFeedbackAction(previous) ===
        normalizedAction;
    const finalAction =
        sameActiveAction &&
        normalizedAction !== "neutral"
            ? "neutral"
            : normalizedAction;
    let activeUntil = 0;

    if (finalAction === "not-now") {
        activeUntil =
            now + MUSIC_FEEDBACK_NOT_NOW_TTL;
    } else if (finalAction === "repetitive") {
        activeUntil =
            now + MUSIC_FEEDBACK_REPETITIVE_TTL;
    }

    return {
        record: normalizeMusicFeedbackRecord({
            ...(previous || {}),
            key,
            uri: track?.uri || previous?.uri || "",
            trackName:
                track?.name ||
                previous?.trackName ||
                "Morceau",
            artists:
                artists || previous?.artists || "",
            albumName:
                track?.album?.name ||
                previous?.albumName ||
                "",
            action: finalAction,
            activeUntil,
            likeCount:
                Number(previous?.likeCount || 0) +
                (finalAction === "like" ? 1 : 0),
            notNowCount:
                Number(previous?.notNowCount || 0) +
                (finalAction === "not-now" ? 1 : 0),
            repetitiveCount:
                Number(previous?.repetitiveCount || 0) +
                (finalAction === "repetitive" ? 1 : 0),
            updatedAt: now
        }, key),
        finalAction
    };
}

function applyMusicFeedbackToTrack(
    track,
    action,
    source = "track-menu",
    renderTarget = "track-list"
) {
    const key = getMusicFeedbackTrackKey(track);

    if (!track || !key) {
        const message =
            "Ce morceau ne peut pas recevoir de feedback.";
        setStatus(message, "error");
        return null;
    }

    const previous =
        musicFeedbackState.records[key] || null;
    const { record, finalAction } =
        buildMusicFeedbackRecord(
            track,
            action,
            previous
        );

    if (!record) {
        return null;
    }

    const feedbackEvent = normalizeMusicFeedbackEvent({
        id: createIosCommandId(),
        trackKey: key,
        trackName: record.trackName,
        artists: record.artists,
        action: finalAction,
        source,
        createdAt: Date.now()
    });

    musicFeedbackState =
        normalizeMusicFeedbackState({
            ...musicFeedbackState,
            records: {
                ...musicFeedbackState.records,
                [key]: record
            },
            events: [
                feedbackEvent,
                ...musicFeedbackState.events
            ],
            updatedAt: Date.now()
        });
    saveMusicFeedbackState();

    recordIntelligenceEvent({
        type: "feedback",
        mixId: key,
        mixName: record.trackName,
        source: "music-feedback",
        tracks: [track],
        evidence: "user-feedback",
        reason:
            finalAction === "neutral"
                ? "Feedback retiré"
                : getMusicFeedbackLabel(finalAction)
    });

    const expiry =
        getMusicFeedbackExpiryLabel(record);
    const message =
        finalAction === "neutral"
            ? `Feedback retiré pour « ${record.trackName} ».`
            : finalAction === "like"
                ? `« ${record.trackName} » sera davantage favorisé dans les prochains mix.`
                : `« ${record.trackName} » sera écarté jusqu’au ${expiry}.`;

    if (renderTarget === "driving") {
        setDrivingMessage(message, "success");
        renderDrivingModePage();
    } else if (renderTarget === "quick") {
        setQuickControlMessage(message, "success");
        if (activeAppMenu === "quick") {
            renderQuickControlPage();
        }
    } else {
        renderTrackList();
        setStatus(message);
    }

    return {
        record,
        finalAction,
        message
    };
}

function applyMusicFeedbackAt(
    index,
    action,
    source = "track-menu"
) {
    return applyMusicFeedbackToTrack(
        selectedTracks[index],
        action,
        source,
        "track-list"
    );
}

function getMusicFeedbackSummary() {
    const records = Object.values(
        musicFeedbackState.records
    );
    const liked = records.filter(
        (record) =>
            getActiveMusicFeedbackAction(record) ===
            "like"
    );
    const notNow = records.filter(
        (record) =>
            getActiveMusicFeedbackAction(record) ===
            "not-now"
    );
    const repetitive = records.filter(
        (record) =>
            getActiveMusicFeedbackAction(record) ===
            "repetitive"
    );

    return {
        liked,
        notNow,
        repetitive,
        recentEvents:
            musicFeedbackState.events.slice(0, 12)
    };
}

function clearMusicFeedback() {
    const count = Object.keys(
        musicFeedbackState.records
    ).length;

    if (!count) {
        setStatus(
            "Aucun feedback musical à effacer."
        );
        return;
    }

    const confirmed = window.confirm(
        "Effacer tous les retours musicaux et recommencer l’apprentissage titre par titre ?"
    );

    if (!confirmed) {
        return;
    }

    musicFeedbackState =
        normalizeMusicFeedbackState(
            DEFAULT_MUSIC_FEEDBACK_STATE
        );
    saveMusicFeedbackState();
    displayPlaylists(playlistsCache);
    setStatus(
        "Feedback musical réinitialisé."
    );
}

function renderMusicFeedbackIntelligenceSection() {
    const summary = getMusicFeedbackSummary();
    const rows = summary.recentEvents
        .map((item) => {
            const record =
                musicFeedbackState.records[
                    item.trackKey
                ] || null;
            const activeAction =
                getActiveMusicFeedbackAction(record);
            const expiry =
                getMusicFeedbackExpiryLabel(record);

            return `
                <li>
                    <span>
                        ${getMusicFeedbackIcon(item.action)}
                    </span>
                    <div>
                        <strong>
                            ${escapeHtml(item.trackName)}
                        </strong>
                        <small>
                            ${escapeHtml(item.artists || "Artiste inconnu")}
                            · ${getMusicFeedbackLabel(item.action)}
                            ${activeAction === item.action && expiry
                                ? ` · jusqu’au ${escapeHtml(expiry)}`
                                : ""}
                        </small>
                    </div>
                    <time>
                        ${formatHistoryDate(item.createdAt)}
                    </time>
                </li>
            `;
        })
        .join("");

    return `
        <section class="music-feedback-dashboard">
            <div class="intelligence-section-heading">
                <div>
                    <h4>Feedback musical 4.2</h4>
                    <p>
                        Tes retours influencent les prochains mix et les remplacements Smart Queue.
                    </p>
                </div>
                <button
                    id="clearMusicFeedbackButton"
                    class="is-danger"
                    type="button"
                    ${Object.keys(musicFeedbackState.records).length
                        ? ""
                        : "disabled"}
                >
                    Réinitialiser
                </button>
            </div>

            <div class="music-feedback-metrics">
                <article>
                    <span>💚 J’aime</span>
                    <strong>${summary.liked.length}</strong>
                    <small>favorisés durablement</small>
                </article>
                <article>
                    <span>⏳ Pas maintenant</span>
                    <strong>${summary.notNow.length}</strong>
                    <small>écartés pendant 7 jours</small>
                </article>
                <article>
                    <span>🔁 Trop répétitif</span>
                    <strong>${summary.repetitive.length}</strong>
                    <small>écartés pendant 30 jours</small>
                </article>
                <article>
                    <span>Historique</span>
                    <strong>${musicFeedbackState.events.length}</strong>
                    <small>retours conservés localement</small>
                </article>
            </div>

            <details class="music-feedback-history" ${rows ? "open" : ""}>
                <summary>
                    Derniers retours titre par titre
                </summary>
                <ul>
                    ${rows || "<li>Aucun feedback musical enregistré.</li>"}
                </ul>
            </details>
        </section>
    `;
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
        "listening-confirmed",
        "feedback"
    ]);
    const allowedEvidence = new Set([
        "generated",
        "sent",
        "user-confirmed",
        "user-feedback"
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
                : type === "feedback"
                    ? "user-feedback"
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
        "listening-confirmed",
        "feedback"
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
    if (item.type === "feedback") {
        if (item.reason === "J’aime") {
            return "💚 J’aime";
        }
        if (item.reason === "Pas maintenant") {
            return "⏳ Pas maintenant";
        }
        if (item.reason === "Trop répétitif") {
            return "🔁 Trop répétitif";
        }
        return "○ Feedback retiré";
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
    if (item.evidence === "user-feedback") {
        return "retour donné par toi";
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
        ["listening-confirmed", "Écoutes confirmées"],
        ["feedback", "Feedback musical"]
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

            ${renderMusicFeedbackIntelligenceSection()}

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


function normalizeDrivingModeSettings(settings = {}) {
    return {
        keepScreenAwake:
            settings.keepScreenAwake !== false,
        autoRefresh:
            settings.autoRefresh !== false,
        showFeedback:
            settings.showFeedback !== false
    };
}

function readDrivingModeSettings() {
    try {
        const raw = localStorage.getItem(
            DRIVING_MODE_SETTINGS_KEY
        );

        return normalizeDrivingModeSettings(
            raw
                ? JSON.parse(raw)
                : DEFAULT_DRIVING_MODE_SETTINGS
        );
    } catch (error) {
        return normalizeDrivingModeSettings(
            DEFAULT_DRIVING_MODE_SETTINGS
        );
    }
}

function saveDrivingModeSettings() {
    drivingModeSettings =
        normalizeDrivingModeSettings(
            drivingModeSettings
        );

    try {
        localStorage.setItem(
            DRIVING_MODE_SETTINGS_KEY,
            JSON.stringify(drivingModeSettings)
        );
    } catch (error) {
        console.warn(
            "Réglages du mode conduite non enregistrés :",
            error
        );
    }
}

function setDrivingMessage(text = "", type = "") {
    drivingMessage = {
        text: String(text || "").slice(0, 260),
        type: ["success", "error", "warning"].includes(type)
            ? type
            : ""
    };
}

function getDrivingCurrentTrack() {
    const item = drivingPlaybackState?.item;

    return item?.type === "track" && item?.uri
        ? item
        : null;
}

function getDrivingDeviceId() {
    return drivingPlaybackState?.device?.id || "";
}

function getDrivingTrackArtists(track) {
    return (track?.artists || [])
        .map((artist) => artist?.name)
        .filter(Boolean)
        .join(", ");
}

function getDrivingCurrentFeedbackAction(track) {
    return getActiveMusicFeedbackAction(
        getMusicFeedbackRecord(track)
    );
}

function renderDrivingModePage() {
    const adaptive = getAdaptiveDjMix();
    const track = getDrivingCurrentTrack();
    const isPlaying = Boolean(
        drivingPlaybackState?.is_playing
    );
    const deviceName =
        drivingPlaybackState?.device?.name ||
        "Aucun appareil actif";
    const feedbackAction =
        getDrivingCurrentFeedbackAction(track);
    const imageUrl =
        track?.album?.images?.[0]?.url || "";
    const exitArmed =
        drivingExitArmedUntil > Date.now();
    const wakeLockAvailable =
        "wakeLock" in navigator;

    contentElement.innerHTML = `
        <section class="driving-mode-page" aria-label="Mode conduite">
            <header class="driving-mode-header">
                <div>
                    <span>🚗 Mode conduite</span>
                    <h2>Commandes essentielles</h2>
                </div>

                <button
                    id="exitDrivingModeButton"
                    class="driving-exit-button ${exitArmed ? "is-armed" : ""}"
                    type="button"
                >
                    ${exitArmed ? "Confirmer la sortie" : "Quitter"}
                </button>
            </header>

            <p class="driving-safety-note">
                Utilise ces commandes uniquement lorsque la situation permet de le faire sans danger.
            </p>

            <section class="driving-context-card">
                <span>Contexte actuel</span>
                <strong>${escapeHtml(adaptive.slot.label)}</strong>
                <small>
                    ${adaptive.mix
                        ? `Mix : ${escapeHtml(adaptive.mix.name)}`
                        : "Aucun mix associé à ce créneau"}
                </small>
            </section>

            <section class="driving-now-playing ${track ? "has-track" : "is-empty"}">
                ${imageUrl
                    ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="eager">`
                    : `<div class="driving-cover-placeholder" aria-hidden="true">🎵</div>`}

                <div>
                    <span>${isPlaying ? "Lecture en cours" : "Lecture en pause"}</span>
                    <h3>${escapeHtml(track?.name || "Aucun titre actif")}</h3>
                    <p>${escapeHtml(getDrivingTrackArtists(track) || deviceName)}</p>
                    <small>${escapeHtml(deviceName)}</small>
                </div>
            </section>

            <div class="driving-main-controls">
                <button
                    id="drivingAdaptiveButton"
                    class="driving-control driving-control-primary"
                    type="button"
                    ${drivingActionBusy || !adaptive.mix ? "disabled" : ""}
                >
                    <span aria-hidden="true">🤖</span>
                    <strong>Lancer Adaptive DJ</strong>
                    <small>${escapeHtml(adaptive.slot.label)}</small>
                </button>

                <button
                    id="drivingPlayPauseButton"
                    class="driving-control"
                    type="button"
                    ${drivingActionBusy || !drivingPlaybackState?.device ? "disabled" : ""}
                >
                    <span aria-hidden="true">${isPlaying ? "⏸" : "▶"}</span>
                    <strong>${isPlaying ? "Pause" : "Reprendre"}</strong>
                </button>

                <button
                    id="drivingNextButton"
                    class="driving-control"
                    type="button"
                    ${drivingActionBusy || !drivingPlaybackState?.device ? "disabled" : ""}
                >
                    <span aria-hidden="true">⏭</span>
                    <strong>Titre suivant</strong>
                </button>
            </div>

            ${drivingModeSettings.showFeedback ? `
                <section class="driving-feedback-controls">
                    <button
                        type="button"
                        data-driving-feedback="like"
                        class="${feedbackAction === "like" ? "is-active" : ""}"
                        ${drivingActionBusy || !track ? "disabled" : ""}
                    >
                        💚 J’aime
                    </button>

                    <button
                        type="button"
                        data-driving-feedback="not-now"
                        class="${feedbackAction === "not-now" ? "is-active" : ""}"
                        ${drivingActionBusy || !track ? "disabled" : ""}
                    >
                        ⏳ Pas maintenant
                    </button>
                </section>
            ` : ""}

            <div class="driving-secondary-controls">
                <button
                    id="drivingRefreshButton"
                    type="button"
                    ${drivingActionBusy ? "disabled" : ""}
                >
                    ↻ Actualiser le titre
                </button>

                <label>
                    <input
                        id="drivingWakeLockInput"
                        type="checkbox"
                        ${drivingModeSettings.keepScreenAwake ? "checked" : ""}
                        ${wakeLockAvailable ? "" : "disabled"}
                    >
                    Garder l’écran allumé
                </label>

                <label>
                    <input
                        id="drivingAutoRefreshInput"
                        type="checkbox"
                        ${drivingModeSettings.autoRefresh ? "checked" : ""}
                    >
                    Actualisation automatique
                </label>
            </div>

            <p
                class="driving-message ${escapeHtml(drivingMessage.type)}"
                aria-live="polite"
            >
                ${escapeHtml(
                    drivingMessage.text ||
                    (drivingActionBusy
                        ? "Commande en cours…"
                        : "Prêt.")
                )}
            </p>
        </section>
    `;

    document.body.classList.add("is-driving-mode");
}

function stopDrivingRefreshTimer() {
    if (drivingRefreshTimer) {
        window.clearInterval(drivingRefreshTimer);
        drivingRefreshTimer = 0;
    }
}

function startDrivingRefreshTimer() {
    stopDrivingRefreshTimer();

    if (!drivingModeSettings.autoRefresh) {
        return;
    }

    drivingRefreshTimer = window.setInterval(
        () => {
            if (
                activeAppMenu === "driving" &&
                document.visibilityState === "visible" &&
                !drivingActionBusy
            ) {
                refreshDrivingPlayback({
                    silent: true
                });
            }
        },
        DRIVING_MODE_REFRESH_MS
    );
}

async function requestDrivingWakeLock() {
    if (
        !drivingModeSettings.keepScreenAwake ||
        !("wakeLock" in navigator) ||
        document.visibilityState !== "visible"
    ) {
        return;
    }

    try {
        if (!drivingWakeLock) {
            drivingWakeLock =
                await navigator.wakeLock.request(
                    "screen"
                );
            drivingWakeLock.addEventListener(
                "release",
                () => {
                    drivingWakeLock = null;
                },
                { once: true }
            );
        }
    } catch (error) {
        console.warn(
            "Verrouillage de l’écran indisponible :",
            error
        );
    }
}

async function releaseDrivingWakeLock() {
    try {
        await drivingWakeLock?.release();
    } catch (error) {
        console.warn(error);
    } finally {
        drivingWakeLock = null;
    }
}

async function refreshDrivingPlayback({
    silent = false,
    render = true
} = {}) {
    try {
        drivingPlaybackState =
            await getCurrentPlayback();

        if (!silent) {
            setDrivingMessage(
                drivingPlaybackState?.item
                    ? "Lecture Spotify actualisée."
                    : "Aucune lecture Spotify active.",
                drivingPlaybackState?.item
                    ? "success"
                    : "warning"
            );
        }
    } catch (error) {
        console.error(error);
        if (!silent) {
            setDrivingMessage(
                getPlaybackErrorMessage(error),
                "error"
            );
        }
    }

    if (
        render &&
        activeAppMenu === "driving"
    ) {
        renderDrivingModePage();
    }

    return drivingPlaybackState;
}

async function enterDrivingMode({
    refresh = true
} = {}) {
    activeAppMenu = "driving";
    saveActiveAppMenu();
    drivingExitArmedUntil = 0;
    setDrivingMessage(
        "Mode conduite prêt.",
        "success"
    );
    renderDrivingModePage();
    startDrivingRefreshTimer();
    await requestDrivingWakeLock();

    if (refresh) {
        await refreshDrivingPlayback({
            silent: true
        });
    }
}

async function exitDrivingMode() {
    if (drivingExitArmedUntil <= Date.now()) {
        drivingExitArmedUntil =
            Date.now() + 5000;
        setDrivingMessage(
            "Appuie une seconde fois sur « Confirmer la sortie ».",
            "warning"
        );
        renderDrivingModePage();
        return;
    }

    stopDrivingRefreshTimer();
    await releaseDrivingWakeLock();
    document.body.classList.remove(
        "is-driving-mode"
    );
    drivingExitArmedUntil = 0;
    activeAppMenu = "music";
    saveActiveAppMenu();
    displayPlaylists(playlistsCache);
    setStatus("Mode conduite fermé.");
}

async function runDrivingAction(action) {
    if (drivingActionBusy) {
        return;
    }

    drivingActionBusy = true;
    setDrivingMessage(
        "Commande en cours…"
    );
    renderDrivingModePage();

    try {
        await action();
        await new Promise((resolve) => {
            window.setTimeout(
                resolve,
                DRIVING_MODE_ACTION_COOLDOWN_MS
            );
        });
    } catch (error) {
        console.error(error);
        setDrivingMessage(
            getPlaybackErrorMessage(error),
            "error"
        );
    } finally {
        drivingActionBusy = false;
        if (activeAppMenu === "driving") {
            renderDrivingModePage();
        }
    }
}

async function launchDrivingAdaptiveDj() {
    await runDrivingAction(async () => {
        const result = await runAdaptiveDj({
            autoplay: true
        });
        activeAppMenu = "driving";
        saveActiveAppMenu();
        drivingPlaybackState =
            await getCurrentPlayback().catch(
                () => null
            );
        setDrivingMessage(
            result?.mix?.name
                ? `« ${result.mix.name} » lancé.`
                : "Adaptive DJ lancé.",
            "success"
        );
        startDrivingRefreshTimer();
        await requestDrivingWakeLock();
    });
}

async function toggleDrivingPlayback() {
    await runDrivingAction(async () => {
        const state =
            drivingPlaybackState ||
            await getCurrentPlayback();
        const deviceId = state?.device?.id || "";

        if (!deviceId) {
            throw new Error(
                "Aucun appareil Spotify actif."
            );
        }

        if (state.is_playing) {
            await pausePlayback(deviceId);
            setDrivingMessage(
                "Lecture mise en pause.",
                "success"
            );
        } else {
            await resumePlayback(deviceId);
            setDrivingMessage(
                "Lecture reprise.",
                "success"
            );
        }

        await new Promise((resolve) =>
            window.setTimeout(resolve, 550)
        );
        drivingPlaybackState =
            await getCurrentPlayback();
    });
}

async function skipDrivingTrack() {
    await runDrivingAction(async () => {
        const state =
            drivingPlaybackState ||
            await getCurrentPlayback();
        const deviceId = state?.device?.id || "";

        if (!deviceId) {
            throw new Error(
                "Aucun appareil Spotify actif."
            );
        }

        await skipToNext(deviceId);
        setDrivingMessage(
            "Passage au titre suivant.",
            "success"
        );
        await new Promise((resolve) =>
            window.setTimeout(resolve, 700)
        );
        drivingPlaybackState =
            await getCurrentPlayback();
    });
}

function applyDrivingFeedback(action) {
    const track = getDrivingCurrentTrack();

    if (!track) {
        setDrivingMessage(
            "Aucun titre actif pour ce feedback.",
            "error"
        );
        renderDrivingModePage();
        return;
    }

    applyMusicFeedbackToTrack(
        track,
        action,
        "driving-mode",
        "driving"
    );
}

function normalizeQuickContext(context = {}, fallback = {}) {
    const allowedIds = new Set([
        "drive",
        "work",
        "party",
        "night"
    ]);
    const fallbackId = allowedIds.has(fallback.id)
        ? fallback.id
        : "drive";
    const id = allowedIds.has(context.id)
        ? context.id
        : fallbackId;

    return {
        id,
        name:
            typeof context.name === "string" &&
            context.name.trim()
                ? context.name.trim().slice(0, 40)
                : fallback.name || "Contexte",
        icon:
            typeof context.icon === "string" &&
            context.icon.trim()
                ? context.icon.trim().slice(0, 8)
                : fallback.icon || "🎧",
        mixId:
            typeof context.mixId === "string"
                ? context.mixId.trim().slice(0, 120)
                : "",
        profileId:
            typeof context.profileId === "string"
                ? context.profileId.trim().slice(0, 120)
                : "",
        autoplay: context.autoplay !== false
    };
}

function normalizeQuickContextsState(values = []) {
    const source = Array.isArray(values)
        ? values
        : [];
    const byId = new Map(
        source
            .filter((item) => item && typeof item === "object")
            .map((item) => [item.id, item])
    );

    return DEFAULT_QUICK_CONTEXTS.map(
        (fallback) => normalizeQuickContext(
            byId.get(fallback.id) || fallback,
            fallback
        )
    );
}

function readQuickContextsState() {
    try {
        const raw = localStorage.getItem(
            QUICK_CONTEXTS_KEY
        );
        return normalizeQuickContextsState(
            raw ? JSON.parse(raw) : DEFAULT_QUICK_CONTEXTS
        );
    } catch (error) {
        console.warn(
            "Contextes rapides illisibles :",
            error
        );
        return normalizeQuickContextsState(
            DEFAULT_QUICK_CONTEXTS
        );
    }
}

function saveQuickContextsState() {
    try {
        localStorage.setItem(
            QUICK_CONTEXTS_KEY,
            JSON.stringify(quickContextsState)
        );
    } catch (error) {
        console.warn(
            "Contextes rapides non enregistrés :",
            error
        );
    }
}


function normalizeAdaptiveDjScene(
    value = {},
    fallback = DEFAULT_ADAPTIVE_DJ_SCENES[0]
) {
    const profileId =
        typeof value.profileId === "string"
            ? value.profileId.slice(0, 120)
            : fallback.profileId || "";

    return {
        id:
            typeof value.id === "string"
                ? value.id.slice(0, 40)
                : fallback.id,
        icon:
            typeof value.icon === "string" && value.icon.trim()
                ? value.icon.trim().slice(0, 8)
                : fallback.icon,
        label:
            typeof value.label === "string" && value.label.trim()
                ? value.label.trim().slice(0, 40)
                : fallback.label,
        description:
            typeof value.description === "string" && value.description.trim()
                ? value.description.trim().slice(0, 180)
                : fallback.description,
        mixId:
            typeof value.mixId === "string"
                ? value.mixId.slice(0, 120)
                : fallback.mixId || "",
        profileId,
        energyTarget: Math.max(0, Math.min(100, Number(value.energyTarget ?? fallback.energyTarget) || fallback.energyTarget || 50)),
        varietyTarget: Math.max(0, Math.min(100, Number(value.varietyTarget ?? fallback.varietyTarget) || fallback.varietyTarget || 50)),
        discoveryTarget: Math.max(0, Math.min(100, Number(value.discoveryTarget ?? fallback.discoveryTarget) || fallback.discoveryTarget || 20)),
        durationMinutes: Math.max(15, Math.min(360, Number(value.durationMinutes ?? fallback.durationMinutes) || fallback.durationMinutes || 60)),
        autoplay: value.autoplay !== false
    };
}

function normalizeAdaptiveDjScenesState(
    value = DEFAULT_ADAPTIVE_DJ_SCENES_STATE
) {
    const source =
        value && typeof value === "object"
            ? value
            : DEFAULT_ADAPTIVE_DJ_SCENES_STATE;
    const inputScenes = Array.isArray(source.scenes)
        ? source.scenes
        : [];
    const byId = new Map(
        inputScenes
            .filter((item) => item && typeof item === "object")
            .map((item) => [item.id, item])
    );
    const scenes = DEFAULT_ADAPTIVE_DJ_SCENES.map((fallback) =>
        normalizeAdaptiveDjScene(
            byId.get(fallback.id) || fallback,
            fallback
        )
    );
    const activeSceneId = scenes.some(
        (scene) => scene.id === source.activeSceneId
    )
        ? source.activeSceneId
        : scenes[0]?.id || "";

    return {
        activeSceneId,
        scenes,
        updatedAt: Number(source.updatedAt || 0)
    };
}

function readAdaptiveDjScenesState() {
    try {
        const raw = localStorage.getItem(
            ADAPTIVE_DJ_SCENES_KEY
        );
        return normalizeAdaptiveDjScenesState(
            raw
                ? JSON.parse(raw)
                : DEFAULT_ADAPTIVE_DJ_SCENES_STATE
        );
    } catch (error) {
        console.warn(
            "Scènes Adaptive DJ illisibles :",
            error
        );
        return normalizeAdaptiveDjScenesState(
            DEFAULT_ADAPTIVE_DJ_SCENES_STATE
        );
    }
}

function saveAdaptiveDjScenesState() {
    adaptiveDjScenesState =
        normalizeAdaptiveDjScenesState({
            ...adaptiveDjScenesState,
            updatedAt: Date.now()
        });

    try {
        localStorage.setItem(
            ADAPTIVE_DJ_SCENES_KEY,
            JSON.stringify(adaptiveDjScenesState)
        );
    } catch (error) {
        console.warn(
            "Scènes Adaptive DJ non enregistrées :",
            error
        );
    }
}

function getAdaptiveDjSceneById(sceneId = "") {
    const normalized =
        normalizeAdaptiveDjScenesState(
            adaptiveDjScenesState
        );
    const wantedId = sceneId || normalized.activeSceneId;
    return normalized.scenes.find(
        (scene) => scene.id === wantedId
    ) || normalized.scenes[0] || null;
}

function setActiveAdaptiveDjScene(sceneId = "") {
    const scene = getAdaptiveDjSceneById(sceneId);

    if (!scene) {
        return;
    }

    adaptiveDjScenesState =
        normalizeAdaptiveDjScenesState({
            ...adaptiveDjScenesState,
            activeSceneId: scene.id,
            updatedAt: Date.now()
        });
    saveAdaptiveDjScenesState();
    displayPlaylists(playlistsCache);
    setStatus(
        `Scène active : ${scene.icon} ${scene.label}.`
    );
}

function formatAdaptiveDjSceneDuration(
    minutes = 0
) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (!hours) {
        return `${remainingMinutes} min`;
    }

    if (!remainingMinutes) {
        return `${hours} h`;
    }

    return `${hours} h ${String(remainingMinutes).padStart(2, "0")}`;
}

function getAdaptiveDjSceneMixName(
    scene = {}
) {
    if (!scene.mixId) {
        return "Aucun mix associé";
    }

    return getSavedMixName(scene.mixId) ||
        "Mix introuvable";
}

function getAdaptiveDjSceneProfileName(
    scene = {}
) {
    if (!scene.profileId) {
        return "Aucun profil";
    }

    return getProfileById(scene.profileId)?.name ||
        "Profil introuvable";
}

function buildAdaptiveDjSceneUrl(sceneOrId) {
    const scene = typeof sceneOrId === "string"
        ? getAdaptiveDjSceneById(sceneOrId)
        : sceneOrId;

    if (!scene) {
        return window.location.href;
    }

    const url = new URL(
        window.location.origin +
        window.location.pathname
    );
    url.searchParams.set("action", "scene");
    url.searchParams.set("context", scene.id);
    url.searchParams.set(
        "autoplay",
        scene.autoplay === false ? "0" : "1"
    );
    return url.toString();
}

async function copyAdaptiveDjSceneUrl(sceneId) {
    const scene = getAdaptiveDjSceneById(sceneId);

    if (!scene) {
        setStatus(
            "Scène Adaptive DJ introuvable.",
            "error"
        );
        return;
    }

    const url = buildAdaptiveDjSceneUrl(scene);

    try {
        await navigator.clipboard.writeText(url);
        showToast(
            `Lien « ${scene.label} » copié dans le presse-papiers.`,
            "success"
        );
    } catch (error) {
        window.prompt(
            `Copie le lien « ${scene.label} » :`,
            url
        );
    }

    if (activeAppMenu === "adaptive-dj") {
        displayPlaylists(playlistsCache);
    }
}

async function runAdaptiveDjScene(
    sceneId,
    { autoplay } = {}
) {
    const scene = getAdaptiveDjSceneById(sceneId);

    if (!scene) {
        throw new Error(
            "Scène Adaptive DJ introuvable."
        );
    }

    if (!scene.mixId) {
        throw new Error(
            `Aucun mix n’est associé à la scène ${scene.label}.`
        );
    }

    const profile = scene.profileId
        ? getProfileById(scene.profileId)
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

    const prepared = await launchSavedMix(scene.mixId);

    if (!prepared) {
        throw new Error(
            "Le mix de la scène n’a pas pu être préparé."
        );
    }

    const shouldAutoplay =
        autoplay ?? scene.autoplay;
    let deviceName = "";

    if (shouldAutoplay && selectedTracks.length) {
        const command =
            getPrincipalIosCommand() ||
            normalizeIosCommand({
                id: `scene-${scene.id}`,
                name: scene.label,
                icon: scene.icon,
                deviceMode: "iphone",
                fallbackDeviceMode: "active",
                autoplay: true
            });
        const device =
            await getAutomationDeviceWithRetry(command);

        if (!device) {
            throw new Error(
                "Aucun appareil Spotify disponible pour lancer cette scène."
            );
        }

        const playbackUris = selectedTracks
            .slice(0, MAX_DIRECT_PLAYBACK_TRACKS)
            .map((track) => track?.uri)
            .filter(Boolean);

        if (!playbackUris.length) {
            throw new Error(
                "La scène ne contient aucun morceau lisible."
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
        } catch (error) {
            console.warn(
                "Shuffle Spotify non modifié :",
                error
            );
        }

        rememberPlaybackOrder(
            selectedTracks.slice(0, playbackUris.length)
        );
        addTracksSentToHistory(
            playbackUris.length,
            selectedTracks.slice(0, playbackUris.length),
            "scene",
            device.name
        );
        deviceName = device.name;
    }

    setActiveAdaptiveDjScene(scene.id);
    recordAdaptiveLearningObservation({
        mixId: scene.mixId,
        source: "scene"
    });
    setStatus(
        `${scene.icon} ${scene.label} · « ${getAdaptiveDjSceneMixName(scene)} »` +
        (deviceName
            ? ` lancé sur ${deviceName}.`
            : " préparé.")
    );

    return {
        scene,
        deviceName
    };
}

function saveAdaptiveDjScenesFromForm(form) {
    const data = new FormData(form);
    const nextScenes = DEFAULT_ADAPTIVE_DJ_SCENES.map((fallback) =>
        normalizeAdaptiveDjScene(
            {
                id: fallback.id,
                icon: fallback.icon,
                label: fallback.label,
                description: fallback.description,
                mixId: String(
                    data.get(`scene-${fallback.id}-mixId`) || ""
                ),
                profileId: String(
                    data.get(`scene-${fallback.id}-profileId`) || ""
                ),
                energyTarget: Number(
                    data.get(`scene-${fallback.id}-energy`) || fallback.energyTarget
                ),
                varietyTarget: Number(
                    data.get(`scene-${fallback.id}-variety`) || fallback.varietyTarget
                ),
                discoveryTarget: Number(
                    data.get(`scene-${fallback.id}-discovery`) || fallback.discoveryTarget
                ),
                durationMinutes: Number(
                    data.get(`scene-${fallback.id}-duration`) || fallback.durationMinutes
                ),
                autoplay:
                    data.get(`scene-${fallback.id}-autoplay`) === "on"
            },
            fallback
        )
    );

    adaptiveDjScenesState =
        normalizeAdaptiveDjScenesState({
            ...adaptiveDjScenesState,
            activeSceneId: String(
                data.get("activeSceneId") ||
                adaptiveDjScenesState.activeSceneId ||
                nextScenes[0]?.id || ""
            ),
            scenes: nextScenes,
            updatedAt: Date.now()
        });
    saveAdaptiveDjScenesState();
    displayPlaylists(playlistsCache);
    setStatus(
        "Scènes Adaptive DJ enregistrées."
    );
}

function renderAdaptiveDjSceneStudioPanel() {
    const state = normalizeAdaptiveDjScenesState(
        adaptiveDjScenesState
    );
    const mixOptions = (selectedId = "") =>
        savedMixes
            .map((mix) => `
                <option
                    value="${escapeHtml(mix.id)}"
                    ${mix.id === selectedId ? "selected" : ""}
                >
                    ${escapeHtml(mix.name)}
                </option>
            `)
            .join("");
    const profileOptions = (selectedId = "") =>
        [`
            <option value="" ${!selectedId ? "selected" : ""}>
                Aucun profil
            </option>
        `]
            .concat(
                mixProfiles.map((profile) => `
                    <option
                        value="${escapeHtml(profile.id)}"
                        ${profile.id === selectedId ? "selected" : ""}
                    >
                        ${escapeHtml(profile.name)}
                    </option>
                `)
            )
            .join("");

    return `
        <section class="adaptive-scene-studio">
            <div class="adaptive-scene-studio__header">
                <div>
                    <span class="adaptive-menu-kicker">🎛️ Adaptive DJ 2.0</span>
                    <h4>Scènes musicales</h4>
                    <p>Crée tes scènes personnalisées avec mix, profil, énergie et lien iOS en un clic.</p>
                </div>
                <div class="adaptive-scene-studio__active">
                    <span>Scène active</span>
                    <strong>${escapeHtml(getAdaptiveDjSceneById()?.icon || "🎵")} ${escapeHtml(getAdaptiveDjSceneById()?.label || "Aucune")}</strong>
                </div>
            </div>

            <form id="adaptiveDjSceneStudioForm" class="adaptive-scene-studio__form">
                <input type="hidden" name="activeSceneId" value="${escapeHtml(state.activeSceneId)}">
                <div class="adaptive-scene-grid">
                    ${state.scenes.map((scene) => `
                        <article class="adaptive-scene-card ${scene.id === state.activeSceneId ? "is-active" : ""}">
                            <div class="adaptive-scene-card__top">
                                <div>
                                    <strong>${escapeHtml(scene.icon)} ${escapeHtml(scene.label)}</strong>
                                    <p>${escapeHtml(scene.description)}</p>
                                </div>
                                <span class="adaptive-scene-card__badge">${scene.id === state.activeSceneId ? "Active" : "Prêt"}</span>
                            </div>

                            <div class="adaptive-scene-card__stats">
                                <span><strong>Énergie</strong> ${scene.energyTarget}%</span>
                                <span><strong>Variété</strong> ${scene.varietyTarget}%</span>
                                <span><strong>Découverte</strong> ${scene.discoveryTarget}%</span>
                                <span><strong>Durée</strong> ${escapeHtml(formatAdaptiveDjSceneDuration(scene.durationMinutes))}</span>
                            </div>

                            <div class="adaptive-scene-card__preview">
                                <p><strong>Mix</strong> · ${escapeHtml(getAdaptiveDjSceneMixName(scene))}</p>
                                <p><strong>Profil</strong> · ${escapeHtml(getAdaptiveDjSceneProfileName(scene))}</p>
                            </div>

                            <div class="adaptive-scene-card__actions">
                                <button
                                    type="button"
                                    class="adaptive-menu-primary adaptive-scene-card__action"
                                    data-run-adaptive-scene="${escapeHtml(scene.id)}"
                                    ${scene.mixId ? "" : "disabled"}
                                >
                                    ▶ Lancer
                                </button>
                                <button
                                    type="button"
                                    class="adaptive-menu-secondary adaptive-scene-card__action"
                                    data-copy-adaptive-scene-url="${escapeHtml(scene.id)}"
                                >
                                    🔗 URL iOS
                                </button>
                                <button
                                    type="button"
                                    class="adaptive-menu-secondary adaptive-scene-card__action"
                                    data-activate-adaptive-scene="${escapeHtml(scene.id)}"
                                >
                                    ⭐ Définir active
                                </button>
                            </div>

                            <div class="adaptive-scene-fields">
                                <label>
                                    <span>Mix favori</span>
                                    <select name="scene-${escapeHtml(scene.id)}-mixId">
                                        <option value="">Aucun mix</option>
                                        ${mixOptions(scene.mixId)}
                                    </select>
                                </label>

                                <label>
                                    <span>Profil</span>
                                    <select name="scene-${escapeHtml(scene.id)}-profileId">
                                        ${profileOptions(scene.profileId)}
                                    </select>
                                </label>

                                <div class="adaptive-scene-fields__grid">
                                    <label>
                                        <span>Énergie</span>
                                        <input name="scene-${escapeHtml(scene.id)}-energy" type="number" min="0" max="100" value="${scene.energyTarget}">
                                    </label>
                                    <label>
                                        <span>Variété</span>
                                        <input name="scene-${escapeHtml(scene.id)}-variety" type="number" min="0" max="100" value="${scene.varietyTarget}">
                                    </label>
                                    <label>
                                        <span>Découverte</span>
                                        <input name="scene-${escapeHtml(scene.id)}-discovery" type="number" min="0" max="100" value="${scene.discoveryTarget}">
                                    </label>
                                    <label>
                                        <span>Durée (min)</span>
                                        <input name="scene-${escapeHtml(scene.id)}-duration" type="number" min="15" max="360" value="${scene.durationMinutes}">
                                    </label>
                                </div>

                                <label class="adaptive-scene-autoplay">
                                    <input name="scene-${escapeHtml(scene.id)}-autoplay" type="checkbox" ${scene.autoplay ? "checked" : ""}>
                                    <span>Lecture automatique via iPhone / appareil principal</span>
                                </label>
                            </div>
                        </article>
                    `).join("")}
                </div>

                <div class="adaptive-scene-studio__footer">
                    <p>Astuce iOS : utilise le bouton « URL iOS » pour lancer directement une scène depuis l’app Raccourcis.</p>
                    <button class="adaptive-menu-save" type="submit">Enregistrer les scènes</button>
                </div>
            </form>
        </section>
    `;
}

function getQuickContextById(contextId = "") {
    return quickContextsState.find(
        (context) => context.id === contextId
    ) || null;
}

function normalizeQuickExternalResult(result = {}) {
    const status = ["success", "error", "info"]
        .includes(result.status)
        ? result.status
        : "info";

    return {
        status,
        contextId:
            typeof result.contextId === "string"
                ? result.contextId.slice(0, 40)
                : "",
        contextName:
            typeof result.contextName === "string"
                ? result.contextName.slice(0, 80)
                : "Commande externe",
        mixName:
            typeof result.mixName === "string"
                ? result.mixName.slice(0, 120)
                : "",
        deviceName:
            typeof result.deviceName === "string"
                ? result.deviceName.slice(0, 120)
                : "",
        message:
            typeof result.message === "string"
                ? result.message.slice(0, 240)
                : "",
        createdAt: Number(
            result.createdAt || Date.now()
        )
    };
}

function readQuickExternalResult() {
    try {
        const raw = localStorage.getItem(
            QUICK_EXTERNAL_RESULT_KEY
        );
        if (!raw) {
            return null;
        }
        const result = normalizeQuickExternalResult(
            JSON.parse(raw)
        );
        if (
            Date.now() - result.createdAt >
            QUICK_EXTERNAL_RESULT_TTL
        ) {
            localStorage.removeItem(
                QUICK_EXTERNAL_RESULT_KEY
            );
            return null;
        }
        return result;
    } catch (error) {
        return null;
    }
}

function saveQuickExternalResult(result = null) {
    quickExternalResult = result
        ? normalizeQuickExternalResult(result)
        : null;
    try {
        if (quickExternalResult) {
            localStorage.setItem(
                QUICK_EXTERNAL_RESULT_KEY,
                JSON.stringify(quickExternalResult)
            );
        } else {
            localStorage.removeItem(
                QUICK_EXTERNAL_RESULT_KEY
            );
        }
    } catch (error) {
        console.warn(
            "Résultat de commande externe non enregistré :",
            error
        );
    }
}

function buildQuickContextUrl(contextOrId) {
    const context = typeof contextOrId === "string"
        ? getQuickContextById(contextOrId)
        : contextOrId;
    const url = new URL(
        window.location.origin +
        window.location.pathname
    );
    url.searchParams.set(
        "action",
        "quick-context"
    );
    url.searchParams.set(
        "context",
        context?.id || "drive"
    );
    url.searchParams.set(
        "autoplay",
        context?.autoplay === false ? "0" : "1"
    );
    return url.toString();
}

async function copyQuickContextUrl(contextId) {
    const context = getQuickContextById(contextId);
    if (!context) {
        setQuickControlMessage(
            "Contexte rapide introuvable.",
            "error"
        );
        renderQuickControlPage();
        return;
    }
    const url = buildQuickContextUrl(context);
    try {
        await navigator.clipboard.writeText(url);
        setQuickControlMessage(
            `Lien « ${context.name} » copié pour Raccourcis iOS.`,
            "success"
        );
    } catch (error) {
        window.prompt(
            `Copie le lien « ${context.name} » :`,
            url
        );
    }
    renderQuickControlPage();
}

function saveQuickContextsFromForm(form) {
    const data = new FormData(form);
    quickContextsState = normalizeQuickContextsState(
        DEFAULT_QUICK_CONTEXTS.map((fallback) => ({
            id: fallback.id,
            name: String(
                data.get(`${fallback.id}-name`) ||
                fallback.name
            ),
            icon: String(
                data.get(`${fallback.id}-icon`) ||
                fallback.icon
            ),
            mixId: String(
                data.get(`${fallback.id}-mixId`) || ""
            ),
            profileId: String(
                data.get(`${fallback.id}-profileId`) || ""
            ),
            autoplay:
                data.get(`${fallback.id}-autoplay`) === "on"
        }))
    );
    saveQuickContextsState();
    setQuickControlMessage(
        "Profils rapides enregistrés.",
        "success"
    );
    renderQuickControlPage();
    setStatus("Profils rapides enregistrés.");
}

function resetQuickContexts() {
    const confirmed = window.confirm(
        "Restaurer les quatre profils rapides par défaut ?"
    );
    if (!confirmed) {
        return;
    }
    quickContextsState = normalizeQuickContextsState(
        DEFAULT_QUICK_CONTEXTS
    );
    quickShortcutWizardContextId =
        quickContextsState[0]?.id || "drive";
    saveQuickContextsState();
    setQuickControlMessage(
        "Profils rapides restaurés.",
        "success"
    );
    renderQuickControlPage();
}

function renderQuickExternalResult() {
    if (!quickExternalResult) {
        return "";
    }
    const result = quickExternalResult;
    return `
        <aside class="quick-external-result ${escapeHtml(result.status)}">
            <div>
                <span>Commande externe</span>
                <strong>
                    ${result.status === "success" ? "✓" : result.status === "error" ? "!" : "i"}
                    ${escapeHtml(result.contextName)}
                </strong>
                <small>
                    ${escapeHtml(
                        result.message ||
                        (result.mixName
                            ? `Mix « ${result.mixName} » traité.`
                            : "Commande traitée.")
                    )}
                    ${result.deviceName
                        ? ` · ${escapeHtml(result.deviceName)}`
                        : ""}
                </small>
            </div>
            <button
                id="dismissQuickExternalResultButton"
                type="button"
                aria-label="Masquer le résultat"
            >
                ×
            </button>
        </aside>
    `;
}

async function runQuickContext(
    contextId,
    {
        autoplay,
        source = "quick-context"
    } = {}
) {
    const context = getQuickContextById(contextId);
    if (!context) {
        throw new Error(
            "Ce profil rapide n’existe pas."
        );
    }
    const mix = savedMixes.find(
        (item) => item.id === context.mixId
    );
    if (!mix) {
        throw new Error(
            `Associe d’abord un mix au profil « ${context.name} ».`
        );
    }

    const shouldAutoplay =
        typeof autoplay === "boolean"
            ? autoplay
            : context.autoplay;
    let deviceName = "";

    try {
        if (context.profileId) {
            const profile = getProfileById(
                context.profileId
            );
            if (profile) {
                applyMixProfile(profile.id, {
                    persist: true,
                    rerender: false
                });
            }
        }

        setStatus(
            `${context.icon} ${context.name} : préparation de « ${mix.name} »…`
        );
        const prepared = await launchSavedMix(
            mix.id
        );
        if (!prepared) {
            throw new Error(
                "Le mix du profil rapide n’a pas pu être préparé."
            );
        }

        if (shouldAutoplay && selectedTracks.length) {
            const command =
                getPrincipalIosCommand() ||
                normalizeIosCommand({
                    id: `quick-${context.id}`,
                    name: context.name,
                    icon: context.icon,
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
                .slice(0, MAX_DIRECT_PLAYBACK_TRACKS)
                .map((track) => track?.uri)
                .filter(Boolean);
            if (!uris.length) {
                throw new Error(
                    "Le mix ne contient aucun morceau lisible."
                );
            }
            await startPlayback(uris, device.id);
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
                selectedTracks.slice(0, uris.length)
            );
            addTracksSentToHistory(
                uris.length,
                selectedTracks.slice(0, uris.length),
                `quick-context-${context.id}`,
                device.name
            );
            deviceName = device.name;
        }

        recordAdaptiveLearningObservation({
            mixId: mix.id,
            source: "quick-context"
        });

        const message = shouldAutoplay
            ? `« ${mix.name} » lancé${deviceName ? ` sur ${deviceName}` : ""}.`
            : `« ${mix.name} » préparé.`;
        setQuickControlMessage(message, "success");
        setStatus(`${context.icon} ${context.name} · ${message}`);

        if (source === "shortcut-url") {
            saveQuickExternalResult({
                status: "success",
                contextId: context.id,
                contextName: `${context.icon} ${context.name}`,
                mixName: mix.name,
                deviceName,
                message,
                createdAt: Date.now()
            });
            activeAppMenu = "quick";
            saveActiveAppMenu();
            displayPlaylists(playlistsCache);
        }

        return {
            context,
            mix,
            deviceName
        };
    } catch (error) {
        if (source === "shortcut-url") {
            saveQuickExternalResult({
                status: "error",
                contextId: context.id,
                contextName: `${context.icon} ${context.name}`,
                mixName: mix.name,
                message:
                    error.message ||
                    "Commande externe impossible.",
                createdAt: Date.now()
            });
            activeAppMenu = "quick";
            saveActiveAppMenu();
            displayPlaylists(playlistsCache);
        }
        throw error;
    }
}

function setQuickControlMessage(
    text = "",
    type = ""
) {
    quickControlMessage = {
        text: String(text || ""),
        type: ["success", "error", "info"]
            .includes(type)
            ? type
            : ""
    };
}

function getQuickCurrentTrack() {
    const item = quickPlaybackState?.item;

    return item?.type === "track"
        ? item
        : null;
}

function getQuickTrackArtists(track) {
    return (track?.artists || [])
        .map((artist) => artist?.name)
        .filter(Boolean)
        .join(", ");
}

function buildQuickControlUrl(
    action,
    options = {}
) {
    const url = new URL(
        window.location.origin +
        window.location.pathname
    );

    if (action === "quick") {
        url.searchParams.set("view", "quick");
        return url.toString();
    }

    if (action === "driving") {
        url.searchParams.set("view", "driving");
        return url.toString();
    }

    url.searchParams.set("action", action);

    if (options.contextId) {
        url.searchParams.set(
            "context",
            options.contextId
        );
    }

    if (action === "adaptive") {
        url.searchParams.set("autoplay", "1");
    }

    return url.toString();
}

async function copyQuickControlUrl(action) {
    const url = buildQuickControlUrl(action);

    try {
        await navigator.clipboard.writeText(url);
        setQuickControlMessage(
            "Lien copié. Tu peux le coller dans Raccourcis iOS.",
            "success"
        );
    } catch (error) {
        window.prompt(
            "Copie cette URL dans Raccourcis :",
            url
        );
    }

    if (activeAppMenu === "quick") {
        renderQuickControlPage();
    }
}

function renderQuickControlPage() {
    const track = getQuickCurrentTrack();
    const isPlaying = Boolean(
        quickPlaybackState?.is_playing
    );
    const deviceName =
        quickPlaybackState?.device?.name ||
        "Aucun appareil actif";
    const voiceSupported = Boolean(
        window.SpeechRecognition ||
        window.webkitSpeechRecognition
    );

    const quickMixOptions = (selectedId = "") =>
        savedMixes.map((mix) => `
            <option
                value="${escapeHtml(mix.id)}"
                ${mix.id === selectedId ? "selected" : ""}
            >
                ${escapeHtml(mix.name)}
            </option>
        `).join("");
    const quickProfileOptions = (selectedId = "") =>
        mixProfiles.map((profile) => `
            <option
                value="${escapeHtml(profile.id)}"
                ${profile.id === selectedId ? "selected" : ""}
            >
                ${escapeHtml(profile.icon)}
                ${escapeHtml(profile.name)}
            </option>
        `).join("");
    const wizardContext =
        getQuickContextById(
            quickShortcutWizardContextId
        ) || quickContextsState[0];
    const shortcutActions = [
        ["quick", "⚡ Ouvrir les commandes rapides"],
        ["adaptive", "🤖 Lancer Adaptive DJ"],
        ["playpause", "⏯️ Pause / reprise"],
        ["next", "⏭️ Titre suivant"],
        ["like-current", "💚 J’aime le titre actif"],
        ["not-now-current", "⏳ Pas maintenant"],
        ["driving", "🚗 Ouvrir le mode conduite"]
    ];

    const html = `
        <section
            class="quick-control-page"
            aria-label="Commandes rapides"
        >
            <div class="quick-control-hero">
                <div>
                    <span class="quick-control-kicker">
                        🎙️ Voice & Quick Control
                    </span>
                    <h3>Une action, sans chercher dans les menus</h3>
                    <p>
                        Utilise les gros boutons, une commande vocale
                        ou une URL dans Raccourcis iOS.
                    </p>
                </div>

                <button
                    id="quickRefreshButton"
                    class="quick-refresh-button"
                    type="button"
                    ${quickControlBusy ? "disabled" : ""}
                >
                    ↻ Actualiser
                </button>
            </div>

            ${renderQuickExternalResult()}

            <section class="quick-contexts-section">
                <div class="quick-contexts-heading">
                    <div>
                        <span class="quick-control-kicker">
                            ⚡ Profils rapides
                        </span>
                        <h4>Trajet, travail, soirée et nuit</h4>
                        <p>
                            Chaque profil peut appliquer un réglage de mix,
                            générer un mix enregistré et lancer Spotify.
                        </p>
                    </div>
                </div>

                <div class="quick-context-grid">
                    ${quickContextsState.map((context) => {
                        const mix = savedMixes.find(
                            (item) => item.id === context.mixId
                        );
                        const profile = getProfileById(
                            context.profileId
                        );
                        return `
                            <article class="quick-context-card">
                                <span class="quick-context-icon">
                                    ${escapeHtml(context.icon)}
                                </span>
                                <div>
                                    <strong>${escapeHtml(context.name)}</strong>
                                    <small>
                                        ${mix
                                            ? escapeHtml(mix.name)
                                            : "Aucun mix associé"}
                                        ${profile
                                            ? ` · ${escapeHtml(profile.name)}`
                                            : ""}
                                    </small>
                                </div>
                                <button
                                    type="button"
                                    data-launch-quick-context="${escapeHtml(context.id)}"
                                    ${mix && !quickControlBusy ? "" : "disabled"}
                                >
                                    ${context.autoplay ? "▶ Lancer" : "Préparer"}
                                </button>
                            </article>
                        `;
                    }).join("")}
                </div>
            </section>

            <section class="quick-now-playing">
                <div class="quick-now-playing-cover">
                    ${track?.album?.images?.[0]?.url
                        ? `<img
                            src="${escapeHtml(track.album.images[0].url)}"
                            alt=""
                        >`
                        : "🎵"}
                </div>
                <div>
                    <span>
                        ${isPlaying ? "Lecture en cours" : "Lecture en pause"}
                    </span>
                    <strong>
                        ${escapeHtml(
                            track?.name ||
                            "Aucun morceau actif"
                        )}
                    </strong>
                    <small>
                        ${escapeHtml(
                            track
                                ? getQuickTrackArtists(track)
                                : deviceName
                        )}
                    </small>
                </div>
                <span class="quick-device-pill">
                    ${escapeHtml(deviceName)}
                </span>
            </section>

            <div class="quick-action-grid">
                ${QUICK_CONTROL_ACTIONS.map(
                    (action) => `
                        <button
                            type="button"
                            class="quick-action-button"
                            data-quick-action="${escapeHtml(action.id)}"
                            ${quickControlBusy ? "disabled" : ""}
                        >
                            <span aria-hidden="true">
                                ${action.icon}
                            </span>
                            <strong>
                                ${escapeHtml(action.label)}
                            </strong>
                            <small>
                                ${escapeHtml(action.description)}
                            </small>
                        </button>
                    `
                ).join("")}
            </div>

            <section class="voice-control-card">
                <div>
                    <span class="quick-control-kicker">
                        🎙️ Commande vocale locale
                    </span>
                    <h4>
                        ${voiceSupported
                            ? "Parle à Shuffle+"
                            : "Reconnaissance vocale indisponible"}
                    </h4>
                    <p>
                        Exemples : « lance le trajet », « pause »,
                        « reprends », « suivant », « j’aime ce titre »,
                        « pas maintenant » ou « mode conduite ».
                    </p>
                </div>

                <button
                    id="quickVoiceButton"
                    class="voice-control-button
                    ${quickVoiceListening ? "is-listening" : ""}"
                    type="button"
                    ${!voiceSupported || quickControlBusy
                        ? "disabled"
                        : ""}
                >
                    ${quickVoiceListening
                        ? "■ Arrêter"
                        : "🎙️ Écouter"}
                </button>
            </section>

            <p
                class="quick-control-message
                ${escapeHtml(quickControlMessage.type)}"
                aria-live="polite"
            >
                ${escapeHtml(
                    quickControlMessage.text ||
                    (quickControlBusy
                        ? "Commande en cours…"
                        : "Prêt.")
                )}
            </p>

            <details class="quick-context-config-panel" open>
                <summary>
                    Configurer les profils rapides
                </summary>
                <form id="quickContextsForm">
                    <div class="quick-context-config-grid">
                        ${quickContextsState.map((context) => `
                            <fieldset>
                                <legend>
                                    ${escapeHtml(context.icon)}
                                    ${escapeHtml(context.name)}
                                </legend>
                                <label>
                                    <span>Icône</span>
                                    <input
                                        name="${escapeHtml(context.id)}-icon"
                                        value="${escapeHtml(context.icon)}"
                                        maxlength="8"
                                    >
                                </label>
                                <label>
                                    <span>Nom</span>
                                    <input
                                        name="${escapeHtml(context.id)}-name"
                                        value="${escapeHtml(context.name)}"
                                        maxlength="40"
                                    >
                                </label>
                                <label>
                                    <span>Mix enregistré</span>
                                    <select name="${escapeHtml(context.id)}-mixId">
                                        <option value="">Aucun mix</option>
                                        ${quickMixOptions(context.mixId)}
                                    </select>
                                </label>
                                <label>
                                    <span>Profil de réglages</span>
                                    <select name="${escapeHtml(context.id)}-profileId">
                                        <option value="">Aucun profil</option>
                                        ${quickProfileOptions(context.profileId)}
                                    </select>
                                </label>
                                <label class="quick-context-autoplay">
                                    <input
                                        type="checkbox"
                                        name="${escapeHtml(context.id)}-autoplay"
                                        ${context.autoplay ? "checked" : ""}
                                    >
                                    <span>Lancer Spotify automatiquement</span>
                                </label>
                            </fieldset>
                        `).join("")}
                    </div>
                    <div class="quick-context-form-actions">
                        <button
                            id="resetQuickContextsButton"
                            type="button"
                        >
                            Restaurer les valeurs par défaut
                        </button>
                        <button type="submit">
                            Enregistrer les profils rapides
                        </button>
                    </div>
                </form>
            </details>

            <section class="quick-shortcut-wizard">
                <div>
                    <span class="quick-control-kicker">
                        📱 Assistant Raccourcis iOS
                    </span>
                    <h4>Créer un déclencheur en trois étapes</h4>
                </div>
                <div class="quick-shortcut-wizard-grid">
                    <label>
                        <span>1. Choisis le profil</span>
                        <select id="quickShortcutContextSelect">
                            ${quickContextsState.map((context) => `
                                <option
                                    value="${escapeHtml(context.id)}"
                                    ${wizardContext?.id === context.id ? "selected" : ""}
                                >
                                    ${escapeHtml(context.icon)}
                                    ${escapeHtml(context.name)}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <div>
                        <span>2. Copie son URL</span>
                        <code>
                            ${escapeHtml(buildQuickContextUrl(wizardContext))}
                        </code>
                        <button
                            type="button"
                            data-copy-quick-context-url="${escapeHtml(wizardContext?.id || "drive")}"
                        >
                            Copier l’URL
                        </button>
                    </div>
                    <div>
                        <span>3. Dans Raccourcis</span>
                        <ol>
                            <li>Crée un nouveau raccourci.</li>
                            <li>Ajoute l’action « Ouvrir les URL ».</li>
                            <li>Colle l’URL et donne-lui un nom Siri.</li>
                        </ol>
                    </div>
                </div>
            </section>

            <details class="quick-shortcuts-panel">
                <summary>
                    Toutes les URLs de contrôle
                </summary>
                <div class="quick-shortcut-list">
                    ${shortcutActions.map(
                        ([action, label]) => `
                            <div class="quick-shortcut-row">
                                <div>
                                    <strong>
                                        ${escapeHtml(label)}
                                    </strong>
                                    <code>
                                        ${escapeHtml(
                                            buildQuickControlUrl(action)
                                        )}
                                    </code>
                                </div>
                                <button
                                    type="button"
                                    data-copy-quick-url="${escapeHtml(action)}"
                                >
                                    Copier
                                </button>
                            </div>
                        `
                    ).join("")}
                </div>
            </details>
        </section>
    `;

    if (activeAppMenu === "quick") {
        const page = contentElement.querySelector(
            '[data-app-menu-page="quick"]'
        );

        if (page) {
            page.innerHTML = html;
        }
    }

    return html;
}

async function refreshQuickControlPlayback({
    silent = false
} = {}) {
    try {
        quickPlaybackState =
            await getCurrentPlayback();

        if (!silent) {
            setQuickControlMessage(
                quickPlaybackState?.item
                    ? "Lecture Spotify actualisée."
                    : "Aucune lecture Spotify active.",
                "info"
            );
        }
    } catch (error) {
        quickPlaybackState = null;
        setQuickControlMessage(
            getPlaybackErrorMessage(error),
            "error"
        );
    }

    if (activeAppMenu === "quick") {
        renderQuickControlPage();
    }

    return quickPlaybackState;
}

async function runQuickControlAction(
    action,
    options = {}
) {
    const normalizedAction = String(
        action || ""
    ).toLowerCase();

    if (quickControlBusy) {
        return;
    }

    quickControlBusy = true;
    setQuickControlMessage(
        "Commande en cours…",
        "info"
    );

    if (activeAppMenu === "quick") {
        renderQuickControlPage();
    }

    try {
        if (normalizedAction === "quick-context") {
            const result = await runQuickContext(
                options.contextId || "",
                {
                    autoplay:
                        typeof options.autoplay === "boolean"
                            ? options.autoplay
                            : undefined,
                    source:
                        options.source ||
                        "quick-control"
                }
            );
            quickPlaybackState =
                await getCurrentPlayback().catch(
                    () => null
                );
            setQuickControlMessage(
                result?.mix?.name
                    ? `« ${result.mix.name} » lancé.`
                    : "Profil rapide lancé.",
                "success"
            );
        } else if (normalizedAction === "adaptive") {
            const result = await runAdaptiveDj({
                forcedSlotId:
                    options.contextId || "",
                autoplay: true
            });
            quickPlaybackState =
                await getCurrentPlayback().catch(
                    () => null
                );
            setQuickControlMessage(
                result?.mix?.name
                    ? `« ${result.mix.name} » lancé.`
                    : "Adaptive DJ lancé.",
                "success"
            );
        } else if (
            [
                "playpause",
                "pause",
                "resume",
                "next",
                "like-current",
                "not-now-current",
                "repetitive-current"
            ].includes(normalizedAction)
        ) {
            const state =
                await getCurrentPlayback();
            const deviceId = state?.device?.id || "";
            const track =
                state?.item?.type === "track"
                    ? state.item
                    : null;

            if (
                ["playpause", "pause", "resume", "next"]
                    .includes(normalizedAction) &&
                !deviceId
            ) {
                throw new Error(
                    "Aucun appareil Spotify actif."
                );
            }

            if (normalizedAction === "playpause") {
                if (state?.is_playing) {
                    await pausePlayback(deviceId);
                    setQuickControlMessage(
                        "Lecture mise en pause.",
                        "success"
                    );
                } else {
                    await resumePlayback(deviceId);
                    setQuickControlMessage(
                        "Lecture reprise.",
                        "success"
                    );
                }
            } else if (normalizedAction === "pause") {
                await pausePlayback(deviceId);
                setQuickControlMessage(
                    "Lecture mise en pause.",
                    "success"
                );
            } else if (normalizedAction === "resume") {
                await resumePlayback(deviceId);
                setQuickControlMessage(
                    "Lecture reprise.",
                    "success"
                );
            } else if (normalizedAction === "next") {
                await skipToNext(deviceId);
                setQuickControlMessage(
                    "Passage au titre suivant.",
                    "success"
                );
            } else {
                if (!track) {
                    throw new Error(
                        "Aucun titre actif pour ce feedback."
                    );
                }

                const feedbackAction =
                    normalizedAction === "like-current"
                        ? "like"
                        : normalizedAction === "not-now-current"
                            ? "not-now"
                            : "repetitive";
                const result = applyMusicFeedbackToTrack(
                    track,
                    feedbackAction,
                    options.source || "quick-control",
                    "quick"
                );

                if (result?.message) {
                    setQuickControlMessage(
                        result.message,
                        "success"
                    );
                }
            }

            await new Promise((resolve) =>
                window.setTimeout(resolve, 500)
            );
            quickPlaybackState =
                await getCurrentPlayback().catch(
                    () => state
                );
        } else if (normalizedAction === "driving") {
            await enterDrivingMode();
            return;
        } else if (normalizedAction === "quick") {
            activeAppMenu = "quick";
            saveActiveAppMenu();
            displayPlaylists(playlistsCache);
            await refreshQuickControlPlayback({
                silent: true
            });
        } else {
            throw new Error(
                "Commande rapide inconnue."
            );
        }
    } catch (error) {
        console.error(error);
        setQuickControlMessage(
            getPlaybackErrorMessage(error),
            "error"
        );
        throw error;
    } finally {
        quickControlBusy = false;
        if (activeAppMenu === "quick") {
            renderQuickControlPage();
        }
    }
}

function normalizeVoiceCommandText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseVoiceQuickCommand(transcript = "") {
    const text = normalizeVoiceCommandText(
        transcript
    );

    if (!text) {
        return null;
    }

    if (
        text.includes("pas maintenant") ||
        text.includes("plus tard")
    ) {
        return {
            action: "not-now-current"
        };
    }

    if (
        text.includes("trop repetitif") ||
        text.includes("trop entendu")
    ) {
        return {
            action: "repetitive-current"
        };
    }

    if (
        text.includes("j aime") ||
        text.includes("jaime") ||
        text.includes("aime ce titre")
    ) {
        return {
            action: "like-current"
        };
    }

    if (
        text.includes("suivant") ||
        text.includes("prochain") ||
        text.includes("change de musique")
    ) {
        return {
            action: "next"
        };
    }

    if (
        text.includes("pause") ||
        text.includes("arrete la musique")
    ) {
        return {
            action: "pause"
        };
    }

    if (
        text.includes("reprends") ||
        text.includes("reprendre") ||
        text.includes("relance la musique")
    ) {
        return {
            action: "resume"
        };
    }

    if (
        text.includes("conduite") ||
        text.includes("voiture")
    ) {
        return {
            action: "driving"
        };
    }

    const quickContextAliases = {
        drive: ["trajet", "route", "voiture"],
        work: ["travail", "focus", "bureau"],
        party: ["soiree", "fete", "party"],
        night: ["nuit", "calme", "dormir"]
    };

    for (const context of quickContextsState) {
        if (!context.mixId) {
            continue;
        }
        const normalizedName =
            normalizeVoiceCommandText(context.name);
        const aliases = [
            normalizedName,
            ...(quickContextAliases[context.id] || [])
        ].filter(Boolean);
        if (
            aliases.some((word) => text.includes(word))
        ) {
            return {
                action: "quick-context",
                contextId: context.id
            };
        }
    }

    const contexts = [
        ["morning", ["matin", "reveil"]],
        ["focus", ["focus", "travail", "journee"]],
        ["drive", ["trajet", "route"]],
        ["evening", ["soiree", "soir", "party"]],
        ["night", ["nuit", "dormir", "calme"]]
    ];

    for (const [contextId, words] of contexts) {
        if (
            words.some((word) =>
                text.includes(word)
            )
        ) {
            return {
                action: "adaptive",
                contextId
            };
        }
    }

    if (
        text.includes("adaptive") ||
        text.includes("lance shuffle") ||
        text.includes("mets de la musique")
    ) {
        return {
            action: "adaptive"
        };
    }

    return null;
}

function stopQuickVoiceRecognition() {
    try {
        quickVoiceRecognition?.stop();
    } catch (error) {
        console.warn(
            "Arrêt vocal impossible :",
            error
        );
    }
}

function startQuickVoiceRecognition() {
    const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!Recognition) {
        setQuickControlMessage(
            "La reconnaissance vocale n’est pas disponible dans ce navigateur.",
            "error"
        );
        renderQuickControlPage();
        return;
    }

    if (quickVoiceListening) {
        stopQuickVoiceRecognition();
        return;
    }

    const recognition = new Recognition();
    quickVoiceRecognition = recognition;
    quickVoiceListening = true;
    recognition.lang = QUICK_CONTROL_LANGUAGE;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setQuickControlMessage(
        "Je t’écoute…",
        "info"
    );
    renderQuickControlPage();

    recognition.addEventListener(
        "result",
        async (event) => {
            const transcript =
                event.results?.[0]?.[0]
                    ?.transcript || "";
            const command =
                parseVoiceQuickCommand(transcript);

            if (!command) {
                setQuickControlMessage(
                    `Commande non reconnue : « ${transcript} »`,
                    "error"
                );
                return;
            }

            setQuickControlMessage(
                `Commande reconnue : « ${transcript} »`,
                "info"
            );

            try {
                await runQuickControlAction(
                    command.action,
                    {
                        contextId:
                            command.contextId || "",
                        source: "voice-control"
                    }
                );
            } catch (error) {
                // Le message utilisateur est déjà géré.
            }
        }
    );

    recognition.addEventListener(
        "error",
        (event) => {
            const message =
                event.error === "not-allowed"
                    ? "Autorise l’accès au microphone pour utiliser les commandes vocales."
                    : `Reconnaissance vocale interrompue : ${event.error}.`;
            setQuickControlMessage(
                message,
                "error"
            );
        }
    );

    recognition.addEventListener(
        "end",
        () => {
            quickVoiceListening = false;
            quickVoiceRecognition = null;
            if (activeAppMenu === "quick") {
                renderQuickControlPage();
            }
        }
    );

    try {
        recognition.start();
    } catch (error) {
        quickVoiceListening = false;
        quickVoiceRecognition = null;
        setQuickControlMessage(
            "Le microphone n’a pas pu démarrer.",
            "error"
        );
        renderQuickControlPage();
    }
}

function applyDrivingViewFromUrl() {
    const url = new URL(
        window.location.href
    );

    const requestedView = String(
        url.searchParams.get("view") || ""
    ).toLowerCase();

    if ([
        "music",
        "mixes",
        "adaptive",
        "intelligence",
        "quick",
        "driving",
        "settings"
    ].includes(requestedView)) {
        activeAppMenu = requestedView;
        saveActiveAppMenu();
        url.searchParams.delete("view");
        window.history.replaceState(
            {},
            document.title,
            `${url.pathname}${url.search}${url.hash}`
        );
    }
}

function normalizeActiveAppMenu(value = "") {
    return [
        "music",
        "mixes",
        "adaptive",
        "intelligence",
        "quick",
        "driving",
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


function revealActiveAppMenuButton(
    behavior = "auto"
) {
    const activeButton =
        document.querySelector(
            ".app-menu-button.is-active"
        );

    if (!activeButton) {
        return;
    }

    activeButton.scrollIntoView({
        behavior:
            uiThemeSettings.motionEnabled
                ? behavior
                : "auto",
        block: "nearest",
        inline: "center"
    });
}

function renderAppMenu() {
    const items = [
        ["music", "🎵", "Ma musique"],
        ["mixes", "🔀", "Mix & iOS"],
        ["adaptive", "🤖", "Adaptive DJ"],
        ["intelligence", "🧠", "Intelligence"],
        ["quick", "⚡", "Rapide"],
        ["driving", "🚗", "Conduite"],
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
                        aria-label="${escapeHtml(label)}"
                        title="${escapeHtml(label)}"
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

            ${renderAdaptiveDjSceneStudioPanel()}

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
        await copyTextToClipboard(url);

        const message =
            `Lien « ${command.name} » copié ` +
            "dans le presse-papiers.";

        setStatus(message);
        showToast(
            `✅ ${message}`,
            "success"
        );
    } catch (error) {
        console.error(error);

        showToast(
            "⚠️ Copie automatique impossible. " +
            "La copie manuelle va s’ouvrir.",
            "warning"
        );

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
        normalized.action === "quick-context"
    ) {
        await runQuickContext(
            normalized.contextId,
            {
                autoplay:
                    normalized.autoplay,
                source: "shortcut-url"
            }
        );

        savePendingAutomationCommand(null);
        clearAutomationQueryString();
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
        normalized.action === "scene"
    ) {
        await runAdaptiveDjScene(
            normalized.contextId,
            {
                autoplay: normalized.autoplay
            }
        );

        savePendingAutomationCommand(null);
        clearAutomationQueryString();
        return;
    }

    if (
        [
            "playpause",
            "pause",
            "resume",
            "next",
            "like-current",
            "not-now-current",
            "repetitive-current",
            "driving",
            "quick"
        ].includes(normalized.action)
    ) {
        await runQuickControlAction(
            normalized.action,
            {
                contextId:
                    normalized.contextId,
                source: "shortcut-url"
            }
        );

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
    const feedbackReason =
        getMusicFeedbackExclusionReason(track);

    if (feedbackReason) {
        return feedbackReason;
    }

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
    const feedbackFavoredTrackUris =
        getLikedMusicFeedbackTrackUris();
    const effectivePriorityRules =
        normalizePriorityRules({
            ...currentPriorityRules,
            favoredTrackUris: [
                ...new Set([
                    ...currentPriorityRules.favoredTrackUris,
                    ...feedbackFavoredTrackUris
                ])
            ].slice(0, MAX_PRIORITY_TEXT_ITEMS)
        });

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
        priorityRules: effectivePriorityRules,
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

function getMixStudioMood(moodId = "balanced") {
    return (
        MIX_STUDIO_MOODS.find(
            (mood) => mood.id === moodId
        ) || MIX_STUDIO_MOODS[0]
    );
}


function createMixStudioTemplateId() {
    if (crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        `studio-template-${Date.now()}-` +
        Math.random().toString(36).slice(2, 10)
    );
}

function normalizeMixStudioSourceWeights(
    weights = {},
    sourceKeys = []
) {
    const allowedKeys = new Set(
        (Array.isArray(sourceKeys) ? sourceKeys : [])
            .filter((key) =>
                key === "liked" ||
                /^playlist:[A-Za-z0-9]+$/.test(key)
            )
    );
    const result = {};

    Object.entries(
        weights && typeof weights === "object"
            ? weights
            : {}
    ).forEach(([key, value]) => {
        if (
            (allowedKeys.size && !allowedKeys.has(key)) ||
            (
                key !== "liked" &&
                !/^playlist:[A-Za-z0-9]+$/.test(key)
            )
        ) {
            return;
        }

        result[key] = clampInteger(
            value,
            1,
            5,
            3
        );
    });

    allowedKeys.forEach((key) => {
        if (!Object.hasOwn(result, key)) {
            result[key] = 3;
        }
    });

    return result;
}

function normalizeMixStudioTemplate(template = {}) {
    const sourceKeys = [...new Set(
        (Array.isArray(template.sourceKeys)
            ? template.sourceKeys
            : [])
            .filter((key) =>
                key === "liked" ||
                /^playlist:[A-Za-z0-9]+$/.test(key)
            )
    )].slice(0, MAX_MIX_SOURCES);
    const settings = normalizeMixStudioSettings({
        ...template,
        sourceWeights:
            normalizeMixStudioSourceWeights(
                template.sourceWeights,
                sourceKeys
            )
    });

    return {
        id:
            typeof template.id === "string" &&
            template.id.trim()
                ? template.id.trim().slice(0, 120)
                : createMixStudioTemplateId(),
        name:
            typeof template.name === "string" &&
            template.name.trim()
                ? template.name.trim().slice(0, 60)
                : "Modèle Mix Studio",
        defaultMixName:
            typeof template.defaultMixName === "string"
                ? template.defaultMixName.trim().slice(0, 60)
                : "",
        sourceKeys,
        mood: settings.mood,
        durationMinutes: settings.durationMinutes,
        artistDiversity: settings.artistDiversity,
        albumDiversity: settings.albumDiversity,
        adaptiveSlot: settings.adaptiveSlot,
        sourceWeights:
            normalizeMixStudioSourceWeights(
                settings.sourceWeights,
                sourceKeys
            ),
        createdAt: Number(
            template.createdAt || Date.now()
        ),
        updatedAt: Number(
            template.updatedAt ||
            template.createdAt ||
            Date.now()
        )
    };
}

function readMixStudioTemplates() {
    try {
        const raw = localStorage.getItem(
            MIX_STUDIO_TEMPLATES_KEY
        );
        const parsed = raw ? JSON.parse(raw) : [];

        return (Array.isArray(parsed) ? parsed : [])
            .map((template) =>
                normalizeMixStudioTemplate(template)
            )
            .slice(0, MAX_MIX_STUDIO_TEMPLATES);
    } catch (error) {
        console.warn(
            "Modèles Mix Studio illisibles :",
            error
        );
        return [];
    }
}

function saveMixStudioTemplates() {
    try {
        localStorage.setItem(
            MIX_STUDIO_TEMPLATES_KEY,
            JSON.stringify(mixStudioTemplates)
        );
    } catch (error) {
        console.warn(
            "Modèles Mix Studio non enregistrés :",
            error
        );
    }
}

function randomizeMixStudioTracks(items = []) {
    const copy = [...items];

    for (
        let index = copy.length - 1;
        index > 0;
        index -= 1
    ) {
        const swapIndex = Math.floor(
            Math.random() * (index + 1)
        );
        [copy[index], copy[swapIndex]] = [
            copy[swapIndex],
            copy[index]
        ];
    }

    return copy;
}

function getMixStudioTrackIdentity(track) {
    return (
        track?.uri ||
        track?.id ||
        `${track?.name || "track"}-` +
        `${track?.album?.id || "album"}`
    );
}

function buildMixStudioWeightedTrackPool(
    tracks = [],
    settings = DEFAULT_MIX_STUDIO_SETTINGS
) {
    const normalized = normalizeMixStudioSettings(
        settings
    );
    const entries = Object.entries(
        normalized.sourceWeights || {}
    ).filter(([, weight]) => Number(weight) > 0);

    if (entries.length < 2 || tracks.length < 2) {
        return [...tracks];
    }

    const averageDuration = tracks.reduce(
        (total, track) =>
            total + Math.max(
                1,
                Number(track?.duration_ms || 0)
            ),
        0
    ) / tracks.length;
    const targetMs = Math.max(
        0,
        Number(normalized.durationMinutes || 0)
    ) * 60 * 1000;
    const desiredCount = targetMs
        ? Math.min(
            tracks.length,
            Math.max(
                12,
                Math.ceil(
                    targetMs /
                    Math.max(averageDuration, 1) *
                    1.35
                )
            )
        )
        : tracks.length;
    const queues = new Map();
    const selectedCounts = new Map();

    entries.forEach(([sourceKey]) => {
        queues.set(
            sourceKey,
            randomizeMixStudioTracks(
                tracks.filter((track) =>
                    Array.isArray(
                        track?.__shufflePlusSourceKeys
                    ) &&
                    track.__shufflePlusSourceKeys.includes(
                        sourceKey
                    )
                )
            )
        );
        selectedCounts.set(sourceKey, 0);
    });

    const used = new Set();
    const result = [];

    while (result.length < desiredCount) {
        const availableKeys = entries
            .map(([sourceKey, weight]) => ({
                sourceKey,
                weight,
                queue: queues.get(sourceKey) || [],
                ratio:
                    (selectedCounts.get(sourceKey) || 0) /
                    Math.max(Number(weight), 1)
            }))
            .filter((entry) =>
                entry.queue.some((track) =>
                    !used.has(
                        getMixStudioTrackIdentity(track)
                    )
                )
            )
            .sort((first, second) =>
                first.ratio - second.ratio ||
                second.weight - first.weight
            );

        if (!availableKeys.length) {
            break;
        }

        const selectedSource = availableKeys[0];
        const queue = selectedSource.queue;
        let track = null;

        while (queue.length && !track) {
            const candidate = queue.shift();
            const identity =
                getMixStudioTrackIdentity(candidate);

            if (!used.has(identity)) {
                track = candidate;
                used.add(identity);
            }
        }

        if (!track) {
            continue;
        }

        result.push(track);
        selectedCounts.set(
            selectedSource.sourceKey,
            (selectedCounts.get(
                selectedSource.sourceKey
            ) || 0) + 1
        );
    }

    if (result.length < desiredCount) {
        const remaining = randomizeMixStudioTracks(
            tracks.filter((track) =>
                !used.has(
                    getMixStudioTrackIdentity(track)
                )
            )
        );
        result.push(
            ...remaining.slice(
                0,
                desiredCount - result.length
            )
        );
    }

    return result.length ? result : [...tracks];
}

function normalizeMixStudioSettings(settings = {}) {
    const mood = getMixStudioMood(
        typeof settings.mood === "string"
            ? settings.mood
            : "balanced"
    );

    const allowedDurations = new Set([
        0,
        30,
        45,
        60,
        90,
        120,
        180
    ]);
    const requestedDuration = Number(
        settings.durationMinutes
    );

    return {
        enabled: settings.enabled === true,
        mood: mood.id,
        durationMinutes:
            allowedDurations.has(requestedDuration)
                ? requestedDuration
                : 60,
        artistDiversity: clampInteger(
            settings.artistDiversity,
            1,
            10,
            6
        ),
        albumDiversity: clampInteger(
            settings.albumDiversity,
            1,
            10,
            6
        ),
        adaptiveSlot:
            ADAPTIVE_SLOTS.some(
                (slot) => slot.id === settings.adaptiveSlot
            )
                ? settings.adaptiveSlot
                : "",
        sourceWeights:
            normalizeMixStudioSourceWeights(
                settings.sourceWeights,
                settings.sourceKeys ||
                Object.keys(
                    settings.sourceWeights || {}
                )
            ),
        templateId:
            typeof settings.templateId === "string"
                ? settings.templateId.slice(0, 120)
                : "",
        preview: settings.preview === true
    };
}

function formatMixStudioDuration(minutes = 0) {
    const normalized = Number(minutes || 0);

    if (!normalized) {
        return "Durée complète";
    }

    const hours = Math.floor(normalized / 60);
    const rest = normalized % 60;

    if (!hours) {
        return `${rest} min`;
    }

    return rest
        ? `${hours} h ${rest}`
        : `${hours} h`;
}

function limitTracksToMixStudioDuration(
    tracks = [],
    targetMinutes = 0
) {
    const targetMs = Math.max(
        0,
        Number(targetMinutes || 0)
    ) * 60 * 1000;

    if (!targetMs || !tracks.length) {
        return [...tracks];
    }

    const result = [];
    let duration = 0;

    for (const track of tracks) {
        const trackDuration = Math.max(
            0,
            Number(track?.duration_ms || 0)
        );

        if (
            result.length &&
            duration >= targetMs
        ) {
            break;
        }

        result.push(track);
        duration += trackDuration;
    }

    return result.length
        ? result
        : tracks.slice(0, 1);
}

function getMixStudioSourceOptions() {
    const options = [
        {
            key: "liked",
            name: "Morceaux aimés",
            detail: "Bibliothèque Spotify",
            available: true
        }
    ];

    playlistsCache.forEach((playlist) => {
        if (!canReadPlaylist(playlist)) {
            return;
        }

        options.push({
            key: getPlaylistSourceKey(playlist.id),
            name: playlist.name || "Playlist sans nom",
            detail: `${getPlaylistTotal(playlist)} morceau${getPlaylistTotal(playlist) > 1 ? "x" : ""}`,
            available: true
        });
    });

    return options;
}

function renderMixStudioSection() {
    const sources = getMixStudioSourceOptions();
    const checkedKeys = selectedSourceKeys.size
        ? selectedSourceKeys
        : new Set();

    const sourceRows = sources.map((source) => `
        <div class="mix-studio-source-row">
            <label class="mix-studio-source-main">
                <input
                    class="mix-studio-source-checkbox"
                    type="checkbox"
                    name="sourceKeys"
                    value="${escapeHtml(source.key)}"
                    ${checkedKeys.has(source.key) ? "checked" : ""}
                >
                <span class="mix-studio-source-copy">
                    <strong>${escapeHtml(source.name)}</strong>
                    <small>${escapeHtml(source.detail)}</small>
                </span>
            </label>
            <label class="mix-studio-source-weight">
                <span>
                    Poids
                    <output
                        data-mix-studio-weight-output="${escapeHtml(source.key)}"
                    >3/5</output>
                </span>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value="3"
                    name="sourceWeight:${escapeHtml(source.key)}"
                    data-mix-studio-source-weight="${escapeHtml(source.key)}"
                    ${checkedKeys.has(source.key) ? "" : "disabled"}
                >
            </label>
        </div>
    `).join("");

    return `
        <section class="mix-studio-panel" id="mixStudioPanel">
            <div class="mix-studio-heading">
                <div>
                    <span class="mix-studio-kicker">🎛️ Mix Studio</span>
                    <h3>Créer un mix</h3>
                    <p>
                        Choisis tes sources, une ambiance et une durée.
                        Shuffle+ génère ensuite l’ordre complet des morceaux.
                    </p>
                </div>
                <span class="mix-studio-version">v5.2</span>
            </div>

            <form id="mixStudioForm" class="mix-studio-form">
                <div class="mix-studio-template-toolbar">
                    <label class="mix-studio-field">
                        <span>Modèle réutilisable</span>
                        <select id="mixStudioTemplateSelect" name="templateId">
                            <option value="">Configuration libre</option>
                            ${mixStudioTemplates.map((template) => `
                                <option value="${escapeHtml(template.id)}">
                                    ${escapeHtml(template.name)}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <div class="mix-studio-template-actions">
                        <button
                            type="button"
                            data-mix-studio-template-action="save"
                        >
                            💾 Enregistrer comme modèle
                        </button>
                        <button
                            type="button"
                            data-mix-studio-template-action="delete"
                            ${mixStudioTemplates.length ? "" : "disabled"}
                        >
                            🗑️ Supprimer le modèle
                        </button>
                    </div>
                </div>

                <div class="mix-studio-grid">
                    <label class="mix-studio-field mix-studio-name-field">
                        <span>Nom du mix</span>
                        <input
                            name="name"
                            type="text"
                            maxlength="60"
                            value="Mix Studio ${savedMixes.length + 1}"
                            required
                        >
                    </label>

                    <label class="mix-studio-field">
                        <span>Ambiance</span>
                        <select name="mood">
                            ${MIX_STUDIO_MOODS.map((mood) => `
                                <option value="${escapeHtml(mood.id)}">
                                    ${escapeHtml(mood.icon)} ${escapeHtml(mood.label)}
                                </option>
                            `).join("")}
                        </select>
                    </label>

                    <label class="mix-studio-field">
                        <span>Durée cible</span>
                        <select name="durationMinutes">
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60" selected>1 h</option>
                            <option value="90">1 h 30</option>
                            <option value="120">2 h</option>
                            <option value="180">3 h</option>
                            <option value="0">Toute la sélection</option>
                        </select>
                    </label>

                    <label class="mix-studio-field">
                        <span>Associer à Adaptive DJ</span>
                        <select name="adaptiveSlot">
                            <option value="">Ne pas associer</option>
                            ${ADAPTIVE_SLOTS.map((slot) => `
                                <option value="${escapeHtml(slot.id)}">
                                    ${escapeHtml(slot.label)}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                </div>

                <div class="mix-studio-diversity-grid">
                    <label class="mix-studio-range-field">
                        <span>
                            Diversité artistes
                            <output data-mix-studio-output="artist">6/10</output>
                        </span>
                        <input
                            name="artistDiversity"
                            type="range"
                            min="1"
                            max="10"
                            value="6"
                            data-mix-studio-range="artist"
                        >
                    </label>

                    <label class="mix-studio-range-field">
                        <span>
                            Diversité albums
                            <output data-mix-studio-output="album">6/10</output>
                        </span>
                        <input
                            name="albumDiversity"
                            type="range"
                            min="1"
                            max="10"
                            value="6"
                            data-mix-studio-range="album"
                        >
                    </label>
                </div>

                <div class="mix-studio-sources-heading">
                    <div>
                        <strong>Sources Spotify</strong>
                        <small>
                            <span id="mixStudioSourceCount">0</span>
                            sélectionnée(s) · maximum ${MAX_MIX_SOURCES}
                        </small>
                    </div>
                    <button
                        id="mixStudioClearSources"
                        class="mix-studio-link-button"
                        type="button"
                    >
                        Effacer
                    </button>
                </div>

                <div class="mix-studio-source-list">
                    ${sourceRows || `
                        <p class="mix-studio-empty">
                            Aucune source lisible disponible.
                        </p>
                    `}
                </div>

                <div class="mix-studio-summary" id="mixStudioSummary">
                    <span>🎧 Sélectionne au moins une source.</span>
                </div>

                <div class="mix-studio-compare-actions">
                    <button
                        id="mixStudioCompareVariants"
                        class="mix-studio-compare-button"
                        type="button"
                    >
                        ⚖️ Comparer 3 variantes
                    </button>
                    <small>
                        Compare fidélité aux sources, équilibre et découverte.
                    </small>
                </div>

                <div
                    id="mixStudioVariantComparison"
                    class="mix-studio-variant-comparison"
                    hidden
                ></div>

                <div class="mix-studio-actions">
                    <button
                        class="mix-studio-preview-button"
                        type="submit"
                        name="mixStudioAction"
                        value="preview"
                    >
                        👀 Générer un aperçu
                    </button>
                    <button
                        class="mix-studio-save-button"
                        type="submit"
                        name="mixStudioAction"
                        value="save"
                        ${savedMixes.length >= MAX_SAVED_MIXES ? "disabled" : ""}
                    >
                        💾 Enregistrer et générer
                    </button>
                </div>
            </form>
        </section>
    `;
}

function readMixStudioDraftFromForm(form) {
    const data = new FormData(form);
    const sourceKeys = [...new Set(
        data.getAll("sourceKeys")
            .map((value) => String(value || ""))
            .filter((value) =>
                value === "liked" ||
                /^playlist:[A-Za-z0-9]+$/.test(value)
            )
    )].slice(0, MAX_MIX_SOURCES);

    const name = String(
        data.get("name") || ""
    ).trim().slice(0, 60);
    const mood = getMixStudioMood(
        String(data.get("mood") || "balanced")
    );
    const sourceWeights = Object.fromEntries(
        sourceKeys.map((sourceKey) => [
            sourceKey,
            clampInteger(
                data.get(`sourceWeight:${sourceKey}`),
                1,
                5,
                3
            )
        ])
    );
    const studioSettings = normalizeMixStudioSettings({
        enabled: true,
        mood: mood.id,
        durationMinutes:
            data.get("durationMinutes"),
        artistDiversity:
            data.get("artistDiversity"),
        albumDiversity:
            data.get("albumDiversity"),
        adaptiveSlot:
            data.get("adaptiveSlot"),
        sourceKeys,
        sourceWeights,
        templateId:
            data.get("templateId")
    });
    const profile = getProfileById(
        mood.profileId
    );
    const baseShuffle = normalizeShuffleSettings(
        profile?.shuffleSettings ||
        SHUFFLE_PRESETS[mood.preset]
    );

    const shuffleSettings = normalizeShuffleSettings({
        ...baseShuffle,
        preset: mood.preset,
        artistGap: Math.max(
            baseShuffle.artistGap,
            Math.round(
                studioSettings.artistDiversity * 0.8
            )
        ),
        albumGap: Math.max(
            baseShuffle.albumGap,
            Math.round(
                studioSettings.albumDiversity * 0.5
            )
        )
    });

    return {
        id: createSavedMixId(),
        name: name || `Mix Studio ${savedMixes.length + 1}`,
        sourceKeys,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        shuffleSettings,
        exclusionRules: normalizeExclusionRules(
            profile?.exclusionRules ||
            currentExclusionRules
        ),
        profileId: profile?.id || "",
        priorityRules: normalizePriorityRules(
            profile?.priorityRules ||
            currentPriorityRules
        ),
        coherenceSettings:
            normalizeCoherenceSettings(
                profile?.coherenceSettings ||
                currentCoherenceSettings
            ),
        intensitySettings:
            normalizeIntensitySettings(
                profile?.intensitySettings ||
                currentIntensitySettings
            ),
        cleanupSettings:
            normalizeCleanupSettings(
                currentCleanupSettings
            ),
        studioSettings
    };
}


function buildMixStudioTemplateFromForm(
    form,
    templateName = ""
) {
    const draft = readMixStudioDraftFromForm(form);

    return normalizeMixStudioTemplate({
        id: createMixStudioTemplateId(),
        name:
            templateName ||
            draft.name ||
            "Modèle Mix Studio",
        defaultMixName: draft.name,
        sourceKeys: draft.sourceKeys,
        mood: draft.studioSettings.mood,
        durationMinutes:
            draft.studioSettings.durationMinutes,
        artistDiversity:
            draft.studioSettings.artistDiversity,
        albumDiversity:
            draft.studioSettings.albumDiversity,
        adaptiveSlot:
            draft.studioSettings.adaptiveSlot,
        sourceWeights:
            draft.studioSettings.sourceWeights,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
}

function applyMixStudioTemplateToForm(
    templateId,
    form
) {
    const template = mixStudioTemplates.find(
        (item) => item.id === templateId
    );

    if (!template || !form) {
        return false;
    }

    if (form.elements.templateId) {
        form.elements.templateId.value =
            template.id;
    }
    if (form.elements.name) {
        form.elements.name.value =
            template.defaultMixName ||
            template.name;
    }
    if (form.elements.mood) {
        form.elements.mood.value =
            template.mood;
    }
    if (form.elements.durationMinutes) {
        form.elements.durationMinutes.value =
            String(template.durationMinutes);
    }
    if (form.elements.artistDiversity) {
        form.elements.artistDiversity.value =
            String(template.artistDiversity);
    }
    if (form.elements.albumDiversity) {
        form.elements.albumDiversity.value =
            String(template.albumDiversity);
    }
    if (form.elements.adaptiveSlot) {
        form.elements.adaptiveSlot.value =
            template.adaptiveSlot;
    }

    const selected = new Set(
        template.sourceKeys
    );

    form.querySelectorAll(
        ".mix-studio-source-checkbox"
    ).forEach((checkbox) => {
        checkbox.checked = selected.has(
            checkbox.value
        );
    });

    form.querySelectorAll(
        "[data-mix-studio-source-weight]"
    ).forEach((input) => {
        const sourceKey =
            input.dataset.mixStudioSourceWeight;
        input.value = String(
            template.sourceWeights[sourceKey] || 3
        );
    });

    updateMixStudioFormPreview(form);
    showToast(
        `✅ Modèle « ${template.name} » appliqué.`,
        "success"
    );
    return true;
}

function saveMixStudioTemplateFromForm(form) {
    if (!form) {
        return;
    }

    if (
        mixStudioTemplates.length >=
        MAX_MIX_STUDIO_TEMPLATES
    ) {
        setStatus(
            `Tu peux enregistrer jusqu’à ${MAX_MIX_STUDIO_TEMPLATES} modèles.`,
            "error"
        );
        return;
    }

    const suggestedName = String(
        form.elements.name?.value ||
        `Modèle ${mixStudioTemplates.length + 1}`
    ).trim();
    const requestedName = window.prompt(
        "Nom du modèle Mix Studio :",
        suggestedName
    );

    if (requestedName === null) {
        return;
    }

    const name = requestedName.trim();

    if (!name) {
        setStatus(
            "Le nom du modèle ne peut pas être vide.",
            "error"
        );
        return;
    }

    const template =
        buildMixStudioTemplateFromForm(
            form,
            name
        );

    if (!template.sourceKeys.length) {
        setStatus(
            "Sélectionne au moins une source avant d’enregistrer un modèle.",
            "error"
        );
        return;
    }

    mixStudioTemplates = [
        template,
        ...mixStudioTemplates
    ].slice(0, MAX_MIX_STUDIO_TEMPLATES);
    saveMixStudioTemplates();
    displayPlaylists(playlistsCache);
    setStatus(
        `Modèle « ${template.name} » enregistré.`
    );
    showToast(
        `✅ Modèle « ${template.name} » enregistré.`,
        "success"
    );
}

function deleteMixStudioTemplate(
    templateId,
    form
) {
    const template = mixStudioTemplates.find(
        (item) => item.id === templateId
    );

    if (!template) {
        setStatus(
            "Choisis d’abord un modèle à supprimer.",
            "error"
        );
        return;
    }

    if (!window.confirm(
        `Supprimer le modèle « ${template.name} » ?`
    )) {
        return;
    }

    mixStudioTemplates = mixStudioTemplates.filter(
        (item) => item.id !== template.id
    );
    saveMixStudioTemplates();

    if (form?.elements?.templateId) {
        form.elements.templateId.value = "";
    }

    displayPlaylists(playlistsCache);
    setStatus(
        `Modèle « ${template.name} » supprimé.`
    );
}

function getMixStudioVariantSourceWeights(
    sourceWeights,
    mode
) {
    const entries = Object.entries(
        sourceWeights || {}
    );

    if (mode === "explore") {
        return Object.fromEntries(
            entries.map(([key]) => [key, 3])
        );
    }

    if (mode === "faithful") {
        return Object.fromEntries(
            entries.map(([key, value]) => [
                key,
                clampInteger(
                    Number(value) +
                    (Number(value) >= 4 ? 1 : 0),
                    1,
                    5,
                    3
                )
            ])
        );
    }

    return Object.fromEntries(entries);
}

function buildMixStudioVariantOptions(form) {
    const draft = readMixStudioDraftFromForm(form);
    const base = draft.studioSettings;

    return [
        {
            id: "faithful",
            icon: "🎚️",
            label: "Fidèle aux sources",
            description:
                "Respecte davantage les poids choisis et limite l’exploration.",
            artistDiversity: Math.max(
                1,
                base.artistDiversity - 2
            ),
            albumDiversity: Math.max(
                1,
                base.albumDiversity - 2
            ),
            sourceWeights:
                getMixStudioVariantSourceWeights(
                    base.sourceWeights,
                    "faithful"
                )
        },
        {
            id: "balanced",
            icon: "⚖️",
            label: "Équilibre actuel",
            description:
                "Conserve exactement les réglages du formulaire.",
            artistDiversity:
                base.artistDiversity,
            albumDiversity:
                base.albumDiversity,
            sourceWeights: {
                ...base.sourceWeights
            }
        },
        {
            id: "explore",
            icon: "🧭",
            label: "Découverte",
            description:
                "Aplanit les poids et augmente la variété artistes/albums.",
            artistDiversity: Math.min(
                10,
                base.artistDiversity + 2
            ),
            albumDiversity: Math.min(
                10,
                base.albumDiversity + 2
            ),
            sourceWeights:
                getMixStudioVariantSourceWeights(
                    base.sourceWeights,
                    "explore"
                )
        }
    ];
}

function getMixStudioWeightSummary(weights = {}) {
    const values = Object.entries(weights)
        .sort((first, second) =>
            Number(second[1]) - Number(first[1])
        )
        .slice(0, 3)
        .map(([sourceKey, weight]) =>
            `${getSourceDisplayName(sourceKey)} ${weight}/5`
        );

    return values.join(" · ") ||
        "Poids équilibrés";
}

function renderMixStudioVariantComparison(form) {
    const container = form?.querySelector(
        "#mixStudioVariantComparison"
    );

    if (!container) {
        return;
    }

    const draft = readMixStudioDraftFromForm(form);

    if (!draft.sourceKeys.length) {
        setStatus(
            "Sélectionne au moins une source avant de comparer les variantes.",
            "error"
        );
        return;
    }

    mixStudioVariantOptions =
        buildMixStudioVariantOptions(form);
    container.hidden = false;
    container.innerHTML = `
        ${mixStudioVariantOptions.map(
            (variant, index) => `
                <article class="mix-studio-variant-card">
                    <span class="mix-studio-variant-icon">
                        ${escapeHtml(variant.icon)}
                    </span>
                    <h4>${escapeHtml(variant.label)}</h4>
                    <p>${escapeHtml(variant.description)}</p>
                    <dl>
                        <div>
                            <dt>Artistes</dt>
                            <dd>${variant.artistDiversity}/10</dd>
                        </div>
                        <div>
                            <dt>Albums</dt>
                            <dd>${variant.albumDiversity}/10</dd>
                        </div>
                    </dl>
                    <small>
                        ${escapeHtml(
                            getMixStudioWeightSummary(
                                variant.sourceWeights
                            )
                        )}
                    </small>
                    <div class="mix-studio-variant-actions">
                        <button
                            type="button"
                            data-mix-studio-variant-index="${index}"
                            data-mix-studio-variant-action="apply"
                        >
                            Utiliser
                        </button>
                        <button
                            type="button"
                            data-mix-studio-variant-index="${index}"
                            data-mix-studio-variant-action="preview"
                        >
                            👀 Aperçu
                        </button>
                    </div>
                </article>
            `
        ).join("")}
    `;
    container.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function applyMixStudioVariantToForm(
    variantIndex,
    form
) {
    const variant =
        mixStudioVariantOptions[
            Number(variantIndex)
        ];

    if (!variant || !form) {
        return false;
    }

    form.elements.artistDiversity.value =
        String(variant.artistDiversity);
    form.elements.albumDiversity.value =
        String(variant.albumDiversity);

    form.querySelectorAll(
        "[data-mix-studio-source-weight]"
    ).forEach((input) => {
        const sourceKey =
            input.dataset.mixStudioSourceWeight;
        input.value = String(
            variant.sourceWeights[sourceKey] || 3
        );
    });

    updateMixStudioFormPreview(form);
    showToast(
        `✅ Variante « ${variant.label} » appliquée.`,
        "success"
    );
    return true;
}

async function submitMixStudioForm(
    form,
    action = "preview"
) {
    const mix = readMixStudioDraftFromForm(
        form
    );

    if (!mix.sourceKeys.length) {
        setStatus(
            "Sélectionne au moins une source dans Mix Studio.",
            "error"
        );
        return;
    }

    selectedSourceKeys.clear();
    mix.sourceKeys.forEach((sourceKey) => {
        selectedSourceKeys.add(sourceKey);
    });

    if (action === "save") {
        if (savedMixes.length >= MAX_SAVED_MIXES) {
            setStatus(
                `Tu peux enregistrer jusqu’à ${MAX_SAVED_MIXES} mix.`,
                "error"
            );
            return;
        }

        savedMixes = [
            mix,
            ...savedMixes
        ];
        saveSavedMixes();

        if (mix.studioSettings.adaptiveSlot) {
            adaptiveDjMenuSettings =
                normalizeAdaptiveDjMenuSettings({
                    ...adaptiveDjMenuSettings,
                    slots: {
                        ...adaptiveDjMenuSettings.slots,
                        [mix.studioSettings.adaptiveSlot]:
                            mix.id
                    }
                });
            saveAdaptiveDjMenuSettings();
        }

        setStatus(
            `Mix « ${mix.name} » enregistré. Génération en cours…`
        );
        await launchSavedMix(mix.id);
        return;
    }

    const previewMix = {
        ...mix,
        studioSettings: {
            ...mix.studioSettings,
            preview: true
        }
    };

    savedMixes = [
        previewMix,
        ...savedMixes
    ];

    try {
        setStatus(
            `Aperçu de « ${previewMix.name} » en cours…`
        );
        await launchSavedMix(
            previewMix.id
        );
    } finally {
        savedMixes = savedMixes.filter(
            (item) => item.id !== previewMix.id
        );
    }
}

function updateMixStudioFormPreview(form) {
    if (!form) {
        return;
    }

    const selectedCount = form.querySelectorAll(
        '.mix-studio-source-checkbox:checked'
    ).length;
    const countElement = form.querySelector(
        '#mixStudioSourceCount'
    );
    const summaryElement = form.querySelector(
        '#mixStudioSummary'
    );
    const mood = getMixStudioMood(
        form.elements.mood?.value
    );
    const duration = formatMixStudioDuration(
        form.elements.durationMinutes?.value
    );
    const selectedWeights = [
        ...form.querySelectorAll(
            ".mix-studio-source-checkbox:checked"
        )
    ].map((checkbox) => {
        const weightInput = form.querySelector(
            `[data-mix-studio-source-weight="${CSS.escape(checkbox.value)}"]`
        );
        return Number(weightInput?.value || 3);
    });
    const totalWeight = selectedWeights.reduce(
        (total, value) => total + value,
        0
    );

    if (countElement) {
        countElement.textContent = String(
            selectedCount
        );
    }

    if (summaryElement) {
        summaryElement.innerHTML = selectedCount
            ? `
                <span>
                    ${escapeHtml(mood.icon)}
                    <strong>${escapeHtml(mood.label)}</strong>
                    · ${escapeHtml(duration)}
                    · ${selectedCount} source${selectedCount > 1 ? "s" : ""}
                    · poids total ${totalWeight}
                </span>
            `
            : '<span>🎧 Sélectionne au moins une source.</span>';
    }

    form.querySelectorAll(
        ".mix-studio-source-checkbox"
    ).forEach((checkbox) => {
        const sourceKey = checkbox.value;
        const weightInput = form.querySelector(
            `[data-mix-studio-source-weight="${CSS.escape(sourceKey)}"]`
        );

        if (weightInput) {
            weightInput.disabled = !checkbox.checked;
        }
    });

    form.querySelectorAll(
        "[data-mix-studio-source-weight]"
    ).forEach((input) => {
        const sourceKey =
            input.dataset.mixStudioSourceWeight;
        const output = form.querySelector(
            `[data-mix-studio-weight-output="${CSS.escape(sourceKey)}"]`
        );

        if (output) {
            output.textContent = `${input.value}/5`;
        }
    });

    form.querySelectorAll(
        '[data-mix-studio-range]'
    ).forEach((input) => {
        const key = input.dataset.mixStudioRange;
        const output = form.querySelector(
            `[data-mix-studio-output="${key}"]`
        );

        if (output) {
            output.textContent =
                `${input.value}/10`;
        }
    });
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
                    ),
                studioSettings:
                    normalizeMixStudioSettings(
                        mix.studioSettings
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
                ),
            studioSettings:
                normalizeMixStudioSettings()
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
    pendingMixStudioRuntime =
        normalizeMixStudioSettings(
            mix.studioSettings
        );
    pendingMixStudioDisplayName =
        mix.name || "Mix Shuffle+";
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
        const studioSettings =
            normalizeMixStudioSettings(
                mix.studioSettings
            );
        const studioMood = getMixStudioMood(
            studioSettings.mood
        );
        const studioSummary =
            studioSettings.enabled
                ? ` · ${studioMood.icon} ${studioMood.label}` +
                  ` · ${formatMixStudioDuration(studioSettings.durationMinutes)}`
                : "";

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
                            ${escapeHtml(studioSummary)}
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
                    ),
                cleanupSettings:
                    normalizeCleanupSettings(
                        mix.cleanupSettings
                    ),
                studioSettings:
                    normalizeMixStudioSettings(
                        mix.studioSettings
                    )
            };
        })
        .filter((mix) => mix.sourceKeys.length)
        .slice(0, MAX_SAVED_MIXES);
}


function normalizeImportedMixStudioTemplates(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    const seenIds = new Set();

    return values
        .map((template) =>
            normalizeMixStudioTemplate(template)
        )
        .map((template) => {
            if (seenIds.has(template.id)) {
                return {
                    ...template,
                    id: createMixStudioTemplateId()
                };
            }
            seenIds.add(template.id);
            return template;
        })
        .filter((template) =>
            template.sourceKeys.length
        )
        .slice(0, MAX_MIX_STUDIO_TEMPLATES);
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
    const data = {
        favoriteSourceKeys: [...favoriteSourceKeys],
        savedMixes,
        mixStudioTemplates,
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
        musicFeedbackState,
        drivingModeSettings,
        quickContextsState,
        adaptiveDjScenesState,
        uiThemeSettings,
        mixSchedules
    };

    const updatedAt =
        getSyncDataUpdatedAt(data);

    return {
        format: BACKUP_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        dataUpdatedAt: new Date(
            updatedAt || Date.now()
        ).toISOString(),
        spotifyUserId: currentUserId || "",
        data
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
        mixStudioTemplates:
            normalizeImportedMixStudioTemplates(
                payload.data.mixStudioTemplates
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
        musicFeedbackState:
            normalizeMusicFeedbackState(
                payload.data.musicFeedbackState ||
                DEFAULT_MUSIC_FEEDBACK_STATE
            ),
        drivingModeSettings:
            normalizeDrivingModeSettings(
                payload.data.drivingModeSettings ||
                DEFAULT_DRIVING_MODE_SETTINGS
            ),
        quickContextsState:
            normalizeQuickContextsState(
                payload.data.quickContextsState ||
                DEFAULT_QUICK_CONTEXTS
            ),
        adaptiveDjScenesState:
            normalizeAdaptiveDjScenesState(
                payload.data.adaptiveDjScenesState ||
                DEFAULT_ADAPTIVE_DJ_SCENES_STATE
            ),
        uiThemeSettings:
            normalizeUiThemeSettings(
                payload.data.uiThemeSettings ||
                DEFAULT_UI_THEME_SETTINGS
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

function applyValidatedBackupState(imported) {
    favoriteSourceKeys.clear();

    for (const sourceKey of imported.favoriteSourceKeys) {
        favoriteSourceKeys.add(sourceKey);
    }

    savedMixes = imported.savedMixes;
    mixStudioTemplates =
        imported.mixStudioTemplates;
    saveMixStudioTemplates();
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
    musicFeedbackState =
        imported.musicFeedbackState;
    saveMusicFeedbackState();
    drivingModeSettings =
        imported.drivingModeSettings;
    saveDrivingModeSettings();
    quickContextsState =
        imported.quickContextsState;
    saveQuickContextsState();
    adaptiveDjScenesState =
        imported.adaptiveDjScenesState;
    saveAdaptiveDjScenesState();
    uiThemeSettings =
        imported.uiThemeSettings;
    saveUiThemeSettings();
    applyUiThemeSettings();
    mixSchedules =
        imported.mixSchedules;
    saveMixSchedules();
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

        applyValidatedBackupState(imported);

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


function createSyncIdentifier() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return [
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 12),
        Math.random().toString(36).slice(2, 12)
    ].join("-");
}

function getDefaultInstallationLabel() {
    const userAgent = navigator.userAgent || "";

    if (/iPhone/i.test(userAgent)) {
        return "iPhone";
    }

    if (/iPad/i.test(userAgent)) {
        return "iPad";
    }

    if (/Android/i.test(userAgent)) {
        return "Android";
    }

    if (/Windows/i.test(userAgent)) {
        return "PC Windows";
    }

    if (/Macintosh|Mac OS X/i.test(userAgent)) {
        return "Mac";
    }

    return "Navigateur Shuffle+";
}

function normalizeSyncInstallation(value = {}) {
    const now = Date.now();
    const id =
        typeof value.id === "string" && value.id.trim()
            ? value.id.trim().slice(0, 120)
            : createSyncIdentifier();
    const label =
        typeof value.label === "string" && value.label.trim()
            ? value.label.trim().slice(0, 80)
            : getDefaultInstallationLabel();

    return {
        id,
        label,
        createdAt: Number(value.createdAt || now),
        updatedAt: Number(value.updatedAt || now)
    };
}

function readSyncInstallation() {
    try {
        const raw = localStorage.getItem(
            SYNC_INSTALLATION_KEY
        );
        const installation = normalizeSyncInstallation(
            raw ? JSON.parse(raw) : {}
        );
        localStorage.setItem(
            SYNC_INSTALLATION_KEY,
            JSON.stringify(installation)
        );
        return installation;
    } catch (error) {
        const installation = normalizeSyncInstallation();
        try {
            localStorage.setItem(
                SYNC_INSTALLATION_KEY,
                JSON.stringify(installation)
            );
        } catch (storageError) {
            console.warn(
                "Identifiant d’installation non enregistré :",
                storageError
            );
        }
        return installation;
    }
}

function saveSyncInstallation() {
    syncInstallation = normalizeSyncInstallation({
        ...syncInstallation,
        updatedAt: Date.now()
    });

    try {
        localStorage.setItem(
            SYNC_INSTALLATION_KEY,
            JSON.stringify(syncInstallation)
        );
    } catch (error) {
        console.warn(
            "Installation Shuffle+ non enregistrée :",
            error
        );
    }
}

function normalizeSyncSettings(value = {}) {
    const allowedPolicies = [
        "manual",
        "newest",
        "prefer-local",
        "prefer-remote"
    ];

    return {
        conflictPolicy: allowedPolicies.includes(
            value.conflictPolicy
        )
            ? value.conflictPolicy
            : DEFAULT_SYNC_SETTINGS.conflictPolicy
    };
}

function readSyncSettings() {
    try {
        const raw = localStorage.getItem(
            SYNC_SETTINGS_KEY
        );
        return normalizeSyncSettings(
            raw ? JSON.parse(raw) : DEFAULT_SYNC_SETTINGS
        );
    } catch (error) {
        return normalizeSyncSettings(
            DEFAULT_SYNC_SETTINGS
        );
    }
}

function saveSyncSettings() {
    try {
        localStorage.setItem(
            SYNC_SETTINGS_KEY,
            JSON.stringify(syncSettings)
        );
    } catch (error) {
        console.warn(
            "Politique de synchronisation non enregistrée :",
            error
        );
    }
}

function hashSyncContent(value = "") {
    let hash = 2166136261;
    const text = String(value);

    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0)
        .toString(16)
        .padStart(8, "0");
}

function getSyncDataSummary(data = {}) {
    const feedbackRecords =
        data.musicFeedbackState?.records &&
        typeof data.musicFeedbackState.records === "object"
            ? Object.keys(
                data.musicFeedbackState.records
            ).length
            : 0;

    return {
        mixes: Array.isArray(data.savedMixes)
            ? data.savedMixes.length
            : 0,
        mixStudioTemplates:
            Array.isArray(data.mixStudioTemplates)
                ? data.mixStudioTemplates.length
                : 0,
        favorites: Array.isArray(data.favoriteSourceKeys)
            ? data.favoriteSourceKeys.length
            : 0,
        profiles: Array.isArray(data.mixProfiles)
            ? data.mixProfiles.length
            : 0,
        iosCommands: Array.isArray(data.iosCommands)
            ? data.iosCommands.length
            : 0,
        quickContexts: Array.isArray(data.quickContextsState)
            ? data.quickContextsState.length
            : 0,
        schedules: Array.isArray(data.mixSchedules)
            ? data.mixSchedules.length
            : 0,
        learningObservations: Array.isArray(
            data.adaptiveLearningState?.observations
        )
            ? data.adaptiveLearningState.observations.length
            : 0,
        feedbackRecords,
        intelligenceEvents: Array.isArray(
            data.intelligenceAnalytics?.events
        )
            ? data.intelligenceAnalytics.events.length
            : 0
    };
}

function getSyncDataUpdatedAt(data = {}) {
    const timestamps = [
        Number(syncInstallation.updatedAt || 0),
        Number(data.adaptiveLearningState?.updatedAt || 0),
        Number(data.intelligenceAnalytics?.updatedAt || 0),
        Number(data.musicFeedbackState?.updatedAt || 0)
    ];

    for (const collection of [
        data.savedMixes,
        data.mixStudioTemplates,
        data.mixHistory,
        data.iosCommandHistory,
        data.adaptiveDjMenuHistory,
        data.mixSchedules
    ]) {
        if (!Array.isArray(collection)) {
            continue;
        }

        for (const item of collection) {
            timestamps.push(
                Number(
                    item?.updatedAt ||
                    item?.createdAt ||
                    item?.lastRunAt ||
                    0
                )
            );
        }
    }

    return Math.max(
        ...timestamps.filter(Number.isFinite),
        0
    );
}

function buildSyncPackage(targetPeer = null) {
    const backup = buildBackupPayload();
    const serializedData = JSON.stringify(backup.data);
    const dataUpdatedAt = getSyncDataUpdatedAt(
        backup.data
    );

    return {
        format: SYNC_PACKAGE_FORMAT,
        schemaVersion: SYNC_PACKAGE_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        spotifyUserId: currentUserId || "",
        sourceInstallation: {
            ...syncInstallation
        },
        targetInstallationId:
            targetPeer?.id || "",
        syncSessionId:
            targetPeer
                ? createSyncIdentifier()
                : "",
        dataUpdatedAt:
            new Date(
                dataUpdatedAt || Date.now()
            ).toISOString(),
        conflictPolicy: syncSettings.conflictPolicy,
        fingerprint: hashSyncContent(serializedData),
        byteSize: new TextEncoder().encode(
            serializedData
        ).length,
        summary: getSyncDataSummary(backup.data),
        backup
    };
}

function downloadJsonPayload(payload, filename) {
    const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function getSyncDatePart() {
    const date = new Date();
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function downloadSyncPackage() {
    try {
        const payload = buildSyncPackage();
        downloadJsonPayload(
            payload,
            `shuffleplus-sync-${getSyncDatePart()}.json`
        );
        setStatus(
            "Paquet de synchronisation exporté."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            "Impossible de créer le paquet de synchronisation.",
            "error"
        );
    }
}

async function downloadSyncDiagnostic() {
    try {
        const payload = buildSyncPackage();
        let cacheNames = [];

        if ("caches" in window) {
            try {
                cacheNames = await caches.keys();
            } catch (error) {
                cacheNames = [];
            }
        }

        const diagnostic = {
            format: "shuffleplus-sync-diagnostic",
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            appVersion: APP_VERSION,
            installation: {
                ...syncInstallation
            },
            policy: syncSettings.conflictPolicy,
            account: {
                spotifyUserId: currentUserId || "",
                product: currentUserProduct || ""
            },
            environment: {
                online: navigator.onLine,
                standalone: isStandalonePwa(),
                serviceWorkerSupported:
                    "serviceWorker" in navigator,
                serviceWorkerControlled:
                    Boolean(navigator.serviceWorker?.controller),
                cacheNames,
                language: navigator.language || "",
                platform: navigator.platform || "",
                userAgent: navigator.userAgent || ""
            },
            data: {
                fingerprint: payload.fingerprint,
                byteSize: payload.byteSize,
                summary: payload.summary
            },
            note:
                "Ce diagnostic ne contient aucun jeton Spotify."
        };

        downloadJsonPayload(
            diagnostic,
            `shuffleplus-sync-diagnostic-${getSyncDatePart()}.json`
        );
        setStatus(
            "Diagnostic de synchronisation exporté."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            "Impossible d’exporter le diagnostic.",
            "error"
        );
    }
}

function validateSyncPackage(payload) {
    if (
        !payload ||
        typeof payload !== "object" ||
        payload.format !== SYNC_PACKAGE_FORMAT ||
        Number(payload.schemaVersion) !==
            SYNC_PACKAGE_SCHEMA_VERSION ||
        !payload.backup ||
        typeof payload.backup !== "object"
    ) {
        throw new Error(
            "Ce fichier n’est pas un paquet de synchronisation Shuffle+ compatible."
        );
    }

    const importedBackup = validateBackupPayload(
        payload.backup
    );
    const sourceInstallation = normalizeSyncInstallation(
        payload.sourceInstallation || {}
    );
    const summary = payload.summary &&
        typeof payload.summary === "object"
            ? payload.summary
            : getSyncDataSummary(
                payload.backup.data || {}
            );

    return {
        raw: payload,
        importedBackup,
        sourceInstallation,
        summary,
        exportedAt: Number.isNaN(
            Date.parse(payload.exportedAt)
        )
            ? new Date(0).toISOString()
            : new Date(payload.exportedAt).toISOString(),
        dataUpdatedAt: Number.isNaN(
            Date.parse(
                payload.dataUpdatedAt ||
                payload.exportedAt
            )
        )
            ? new Date(0).toISOString()
            : new Date(
                payload.dataUpdatedAt ||
                payload.exportedAt
            ).toISOString(),
        fingerprint:
            typeof payload.fingerprint === "string"
                ? payload.fingerprint
                : hashSyncContent(
                    JSON.stringify(
                        payload.backup.data || {}
                    )
                )
    };
}

async function analyzeSyncPackageFile(file) {
    if (!file) {
        return;
    }

    if (
        file.size > SYNC_MAX_FILE_SIZE ||
        !file.name.toLowerCase().endsWith(".json")
    ) {
        setStatus(
            "Sélectionne un paquet JSON Shuffle+ de moins de 5 Mo.",
            "error"
        );
        return;
    }

    try {
        const text = await file.text();
        let payload = JSON.parse(text);

        if (
            payload?.format ===
                SYNC_ENCRYPTED_PACKAGE_FORMAT
        ) {
            const passphrase = window.prompt(
                "Ce paquet est chiffré. Saisis son mot de passe."
            );

            if (passphrase === null) {
                setStatus(
                    "Analyse du paquet chiffré annulée."
                );
                return;
            }

            payload = await decryptSyncPackagePayload(
                payload,
                passphrase
            );
        }

        pendingSyncPackage = validateSyncPackage(
            payload
        );
        registerSyncPackageSource(
            pendingSyncPackage
        );
        refreshSyncPreparationPanel();
        setStatus(
            "Paquet analysé : choisis comment résoudre le conflit."
        );
    } catch (error) {
        console.error(error);
        pendingSyncPackage = null;
        refreshSyncPreparationPanel();
        setStatus(
            error.message ||
            "Impossible d’analyser ce paquet.",
            "error"
        );
    }
}

function getSyncPolicyLabel(policy) {
    return {
        manual: "Toujours demander",
        newest: "Conserver l’export le plus récent",
        "prefer-local": "Préférer cet appareil",
        "prefer-remote": "Préférer le paquet reçu"
    }[policy] || "Toujours demander";
}

function getSyncRecommendation(remotePackage) {
    const policy = syncSettings.conflictPolicy;

    if (policy === "prefer-local") {
        return {
            action: "local",
            label: "Conserver les données de cet appareil"
        };
    }

    if (policy === "prefer-remote") {
        return {
            action: "remote",
            label: "Utiliser le paquet reçu"
        };
    }

    if (policy === "newest") {
        const localTimestamp = Date.parse(
            buildSyncPackage().dataUpdatedAt
        );
        const remoteTimestamp = Date.parse(
            remotePackage.dataUpdatedAt
        );
        return remoteTimestamp > localTimestamp
            ? {
                action: "remote",
                label: "Utiliser le paquet reçu, plus récent"
            }
            : {
                action: "local",
                label: "Conserver cet appareil, plus récent"
            };
    }

    return {
        action: "manual",
        label: "Choix manuel requis"
    };
}

function renderSyncSummaryGrid(summary = {}) {
    const entries = [
        ["Mix", summary.mixes || 0],
        ["Favoris", summary.favorites || 0],
        ["Profils", summary.profiles || 0],
        ["Commandes iOS", summary.iosCommands || 0],
        ["Contextes rapides", summary.quickContexts || 0],
        ["Programmations", summary.schedules || 0],
        ["Observations", summary.learningObservations || 0],
        ["Feedbacks", summary.feedbackRecords || 0]
    ];

    return `
        <div class="sync-summary-grid">
            ${entries.map(([label, value]) => `
                <div class="sync-summary-card">
                    <strong>${Number(value) || 0}</strong>
                    <span>${escapeHtml(label)}</span>
                </div>
            `).join("")}
        </div>
    `;
}


function getSyncMergeItemTimestamp(item = {}) {
    return Math.max(
        0,
        Number(
            item?.updatedAt ||
            item?.createdAt ||
            item?.decidedAt ||
            item?.lastRunAt ||
            item?.revertedAt ||
            0
        )
    );
}

function mergeSyncArrays(
    localValues = [],
    remoteValues = [],
    getKey = (item) => item?.id || "",
    maxItems = 500
) {
    const merged = new Map();

    for (const item of [
        ...(Array.isArray(localValues) ? localValues : []),
        ...(Array.isArray(remoteValues) ? remoteValues : [])
    ]) {
        if (!item || typeof item !== "object") {
            continue;
        }

        const key = String(getKey(item) || "").trim();

        if (!key) {
            continue;
        }

        const previous = merged.get(key);

        if (
            !previous ||
            getSyncMergeItemTimestamp(item) >=
                getSyncMergeItemTimestamp(previous)
        ) {
            merged.set(key, item);
        }
    }

    return [...merged.values()]
        .sort(
            (first, second) =>
                getSyncMergeItemTimestamp(second) -
                getSyncMergeItemTimestamp(first)
        )
        .slice(0, maxItems);
}

function mergeSyncUniqueStrings(
    localValues = [],
    remoteValues = [],
    maxItems = 500
) {
    return [...new Set([
        ...(Array.isArray(localValues) ? localValues : []),
        ...(Array.isArray(remoteValues) ? remoteValues : [])
    ].filter((value) => typeof value === "string" && value))]
        .slice(0, maxItems);
}

function mergeSyncRecordMaps(
    localRecords = {},
    remoteRecords = {}
) {
    const output = {
        ...(localRecords && typeof localRecords === "object"
            ? localRecords
            : {})
    };

    for (const [key, remoteRecord] of Object.entries(
        remoteRecords && typeof remoteRecords === "object"
            ? remoteRecords
            : {}
    )) {
        const localRecord = output[key];

        if (
            !localRecord ||
            getSyncMergeItemTimestamp(remoteRecord) >=
                getSyncMergeItemTimestamp(localRecord)
        ) {
            output[key] = remoteRecord;
        }
    }

    return output;
}

function mergeQuickContextsForSync(
    localValues = [],
    remoteValues = []
) {
    const remoteById = new Map(
        (Array.isArray(remoteValues) ? remoteValues : [])
            .map((item) => [item?.id, item])
    );

    return normalizeQuickContextsState(
        (Array.isArray(localValues) ? localValues : [])
            .map((localItem) => {
                const remoteItem = remoteById.get(
                    localItem?.id
                );

                if (!remoteItem) {
                    return localItem;
                }

                return {
                    ...remoteItem,
                    ...localItem,
                    mixId:
                        localItem.mixId ||
                        remoteItem.mixId ||
                        "",
                    profileId:
                        localItem.profileId ||
                        remoteItem.profileId ||
                        ""
                };
            })
    );
}


function normalizeLastSyncMergeUndo(value = null) {
    if (
        !value ||
        typeof value !== "object" ||
        !value.backup ||
        typeof value.backup !== "object"
    ) {
        return null;
    }

    const createdAt = Number(value.createdAt || 0);

    if (
        !createdAt ||
        Date.now() - createdAt >
            SYNC_LAST_MERGE_UNDO_TTL
    ) {
        return null;
    }

    return {
        createdAt,
        sourceLabel:
            typeof value.sourceLabel === "string"
                ? value.sourceLabel.slice(0, 120)
                : "Appareil distant",
        choices:
            value.choices &&
            typeof value.choices === "object"
                ? value.choices
                : {},
        backup: value.backup
    };
}

function readLastSyncMergeUndo() {
    try {
        const raw = localStorage.getItem(
            SYNC_LAST_MERGE_UNDO_KEY
        );
        const snapshot = normalizeLastSyncMergeUndo(
            raw ? JSON.parse(raw) : null
        );

        if (!snapshot && raw) {
            localStorage.removeItem(
                SYNC_LAST_MERGE_UNDO_KEY
            );
        }

        return snapshot;
    } catch (error) {
        return null;
    }
}

function saveLastSyncMergeUndo(
    backup,
    sourceLabel = "Appareil distant",
    choices = {}
) {
    const snapshot = normalizeLastSyncMergeUndo({
        createdAt: Date.now(),
        sourceLabel,
        choices,
        backup
    });

    if (!snapshot) {
        return;
    }

    lastSyncMergeUndo = snapshot;

    try {
        localStorage.setItem(
            SYNC_LAST_MERGE_UNDO_KEY,
            JSON.stringify(snapshot)
        );
    } catch (error) {
        console.warn(
            "Sauvegarde d’annulation non enregistrée :",
            error
        );
    }
}

function clearLastSyncMergeUndo() {
    lastSyncMergeUndo = null;

    try {
        localStorage.removeItem(
            SYNC_LAST_MERGE_UNDO_KEY
        );
    } catch (error) {
        console.warn(
            "Sauvegarde d’annulation non supprimée :",
            error
        );
    }
}

function renderLastSyncMergeUndo() {
    if (!lastSyncMergeUndo) {
        return "";
    }

    const date = new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(
        new Date(lastSyncMergeUndo.createdAt)
    );

    return `
        <section class="sync-undo-card">
            <div>
                <span class="sync-eyebrow">Filet de sécurité v4.9</span>
                <h4>Dernière fusion annulable</h4>
                <p>
                    État local conservé avant la fusion avec
                    <strong>${escapeHtml(lastSyncMergeUndo.sourceLabel)}</strong>,
                    le ${escapeHtml(date)}.
                </p>
            </div>
            <button
                id="undoLastSyncMergeButton"
                class="sync-secondary-button"
                type="button"
            >
                ↩ Annuler la dernière fusion
            </button>
        </section>
    `;
}

async function undoLastSelectiveSyncMerge() {
    if (!lastSyncMergeUndo) {
        setStatus(
            "Aucune fusion récente à annuler.",
            "error"
        );
        return;
    }

    const confirmed = window.confirm(
        "Restaurer intégralement l’état enregistré avant la dernière fusion ?\n\n" +
        "Les modifications effectuées depuis cette fusion seront remplacées."
    );

    if (!confirmed) {
        setStatus("Restauration annulée.");
        return;
    }

    try {
        const imported = validateBackupPayload(
            lastSyncMergeUndo.backup
        );
        applyValidatedBackupState(imported);
        clearLastSyncMergeUndo();
        pendingSyncPackage = null;
        displayPlaylists(playlistsCache);
        setStatus(
            "État antérieur restauré : la dernière fusion a été annulée."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            error.message ||
            "Impossible d’annuler cette fusion.",
            "error"
        );
    }
}

function getSyncDiffComparableValue(value) {
    if (value === undefined) {
        return "";
    }

    try {
        return JSON.stringify(value);
    } catch (error) {
        return String(value);
    }
}

function buildSyncDiffItem(
    kind,
    key,
    label,
    value,
    detail = ""
) {
    return {
        id: `${kind}:${String(key || label)}`,
        kind,
        label:
            String(label || key || "Élément")
                .slice(0, 180),
        detail:
            String(detail || "")
                .slice(0, 240),
        value,
        timestamp:
            getSyncMergeItemTimestamp(
                value && typeof value === "object"
                    ? value
                    : {}
            )
    };
}

function getSyncCategoryItems(
    imported = {},
    categoryId = ""
) {
    const items = [];
    const pushArray = (
        kind,
        values,
        getKey,
        getLabel,
        getDetail = () => ""
    ) => {
        (Array.isArray(values) ? values : [])
            .forEach((value, index) => {
                const key = getKey(value, index);
                items.push(
                    buildSyncDiffItem(
                        kind,
                        key,
                        getLabel(value, index),
                        value,
                        getDetail(value, index)
                    )
                );
            });
    };

    if (categoryId === "library") {
        pushArray(
            "Mix",
            imported.savedMixes,
            (item, index) => item?.id || index,
            (item) => item?.name || "Mix sans nom",
            (item) =>
                `${item?.sourceKeys?.length || 0} source(s)`
        );
        pushArray(
            "Modèle Mix Studio",
            imported.mixStudioTemplates,
            (item, index) => item?.id || index,
            (item) => item?.name || "Modèle sans nom",
            (item) =>
                `${item?.sourceKeys?.length || 0} source(s)`
        );
        pushArray(
            "Favori",
            imported.favoriteSourceKeys,
            (item) => item,
            (item) => item,
            () => "Source favorite"
        );
        Object.entries(
            imported.playbackQueueStates || {}
        ).forEach(([key, value]) => {
            items.push(
                buildSyncDiffItem(
                    "File",
                    key,
                    key,
                    value,
                    "État de reprise"
                )
            );
        });
    }

    if (categoryId === "profiles") {
        pushArray(
            "Profil",
            imported.mixProfiles,
            (item, index) => item?.id || index,
            (item) => item?.name || "Profil sans nom",
            (item) => item?.description || ""
        );
        [
            ["Règles d’exclusion", imported.exclusionRules],
            ["Priorités", imported.priorityRules],
            ["Cohérence", imported.coherenceSettings],
            ["Intensité", imported.intensitySettings],
            ["Nettoyage", imported.cleanupSettings],
            ["Apparence", imported.uiThemeSettings]
        ].forEach(([label, value]) => {
            items.push(
                buildSyncDiffItem(
                    "Réglage",
                    label,
                    label,
                    value,
                    "Configuration globale"
                )
            );
        });
    }

    if (categoryId === "automation") {
        pushArray(
            "Commande iOS",
            imported.iosCommands,
            (item, index) => item?.id || index,
            (item) => item?.name || "Commande iOS",
            (item) => item?.deviceName || ""
        );
        pushArray(
            "Programmation",
            imported.mixSchedules,
            (item, index) => item?.id || index,
            (item) => item?.name || "Programmation",
            (item) => item?.time || item?.dateTime || ""
        );
        pushArray(
            "Contexte rapide",
            imported.quickContextsState,
            (item, index) => item?.id || index,
            (item) =>
                `${item?.icon || "⚡"} ${item?.name || "Contexte"}`,
            (item) => item?.mixId || "Mix non associé"
        );
        [
            ["Adaptive DJ", imported.adaptiveDjMenuSettings],
            ["Réglages Adaptive", imported.adaptiveSettings],
            ["Lecture iOS", imported.iosQuickPlaySettings],
            ["Mode conduite", imported.drivingModeSettings]
        ].forEach(([label, value]) => {
            items.push(
                buildSyncDiffItem(
                    "Réglage",
                    label,
                    label,
                    value,
                    "Automatisation"
                )
            );
        });
    }

    if (categoryId === "feedback") {
        Object.entries(
            imported.musicFeedbackState?.records || {}
        ).forEach(([key, record]) => {
            items.push(
                buildSyncDiffItem(
                    "Feedback",
                    key,
                    record?.trackName || key,
                    record,
                    [record?.artists, record?.action]
                        .filter(Boolean)
                        .join(" · ")
                )
            );
        });
    }

    if (categoryId === "learning") {
        const learning =
            imported.adaptiveLearningState || {};
        pushArray(
            "Observation",
            learning.observations,
            (item, index) => item?.id || index,
            (item) => item?.mixName || "Observation Adaptive",
            (item) =>
                `${item?.slotId || "contexte"} · ${item?.source || "source"}`
        );
        pushArray(
            "Suggestion acceptée",
            learning.acceptedSuggestions,
            (item, index) => item?.id || index,
            (item) => item?.mixName || item?.label || "Suggestion acceptée"
        );
        pushArray(
            "Suggestion ignorée",
            learning.dismissedSuggestions,
            (item, index) => item?.id || index,
            (item) => item?.mixName || item?.label || "Suggestion ignorée"
        );
        pushArray(
            "Adaptation automatique",
            learning.autoApplyHistory,
            (item, index) => item?.id || index,
            (item) => item?.mixName || item?.label || "Adaptation automatique"
        );
    }

    if (categoryId === "history") {
        pushArray(
            "Historique de mix",
            imported.mixHistory,
            (item, index) => item?.id || index,
            (item) => item?.name || "Mix",
            (item) => `${item?.trackCount || 0} titre(s)`
        );
        pushArray(
            "Commande exécutée",
            imported.iosCommandHistory,
            (item, index) => item?.id || index,
            (item) => item?.name || item?.commandName || "Commande iOS"
        );
        pushArray(
            "Adaptive DJ",
            imported.adaptiveDjMenuHistory,
            (item, index) => item?.id || index,
            (item) => item?.mixName || item?.slotLabel || "Adaptive DJ"
        );
        pushArray(
            "Intelligence",
            imported.intelligenceAnalytics?.events,
            (item, index) => item?.id || index,
            (item) => item?.mixName || item?.type || "Événement Intelligence"
        );
        pushArray(
            "Titre récent",
            imported.recentTrackUris,
            (item, index) => item?.uri || item || index,
            (item) => item?.name || item?.uri || item || "Titre récent"
        );
    }

    return items.slice(
        0,
        SYNC_DIFF_MAX_ITEMS_PER_CATEGORY
    );
}

function compareSyncCategoryItems(
    localImported,
    remoteImported,
    categoryId
) {
    const localMap = new Map(
        getSyncCategoryItems(
            localImported,
            categoryId
        ).map((item) => [item.id, item])
    );
    const remoteMap = new Map(
        getSyncCategoryItems(
            remoteImported,
            categoryId
        ).map((item) => [item.id, item])
    );
    const allIds = new Set([
        ...localMap.keys(),
        ...remoteMap.keys()
    ]);

    return [...allIds]
        .map((id) => {
            const local = localMap.get(id) || null;
            const remote = remoteMap.get(id) || null;
            let status = "same";

            if (local && !remote) {
                status = "local-only";
            } else if (!local && remote) {
                status = "remote-only";
            } else if (
                getSyncDiffComparableValue(local?.value) !==
                getSyncDiffComparableValue(remote?.value)
            ) {
                status = "changed";
            }

            return {
                id,
                local,
                remote,
                status,
                label:
                    local?.label ||
                    remote?.label ||
                    "Élément",
                kind:
                    local?.kind ||
                    remote?.kind ||
                    "Élément",
                detail:
                    local?.detail ||
                    remote?.detail ||
                    ""
            };
        })
        .sort((first, second) => {
            const priority = {
                changed: 0,
                "remote-only": 1,
                "local-only": 2,
                same: 3
            };
            return (
                priority[first.status] -
                    priority[second.status] ||
                first.label.localeCompare(
                    second.label,
                    "fr",
                    { sensitivity: "base" }
                )
            );
        });
}

function getSyncDiffStatusLabel(status) {
    return {
        changed: "Modifié",
        "remote-only": "Nouveau distant",
        "local-only": "Local uniquement",
        same: "Identique"
    }[status] || "Différence";
}

function renderSyncDetailedDiff(rows = []) {
    if (!rows.length) {
        return `
            <p class="sync-diff-empty">
                Aucun élément détaillé dans cette catégorie.
            </p>
        `;
    }

    return `
        <div class="sync-diff-list">
            ${rows.map((row) => `
                <div
                    class="sync-diff-item is-${escapeHtml(row.status)}"
                >
                    <div class="sync-diff-main">
                        <strong>${escapeHtml(row.label)}</strong>
                        <small>
                            ${escapeHtml(row.kind)}
                            ${row.detail
                                ? ` · ${escapeHtml(row.detail)}`
                                : ""}
                        </small>
                    </div>
                    <span class="sync-diff-status">
                        ${escapeHtml(
                            getSyncDiffStatusLabel(row.status)
                        )}
                    </span>
                    <div class="sync-diff-presence">
                        <span class="${row.local ? "is-present" : "is-missing"}">
                            Local ${row.local ? "✓" : "—"}
                        </span>
                        <span class="${row.remote ? "is-present" : "is-missing"}">
                            Distant ${row.remote ? "✓" : "—"}
                        </span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function filterSyncDetailedDiff(searchValue = "") {
    const query = String(searchValue || "")
        .trim()
        .toLocaleLowerCase("fr");

    document
        .querySelectorAll(".sync-diff-details")
        .forEach((details) => {
            let visibleCount = 0;

            details
                .querySelectorAll(".sync-diff-item")
                .forEach((row) => {
                    const visible =
                        !query ||
                        row.textContent
                            .toLocaleLowerCase("fr")
                            .includes(query);
                    row.hidden = !visible;
                    if (visible) {
                        visibleCount += 1;
                    }
                });

            details.hidden =
                Boolean(query) && visibleCount === 0;
            if (query && visibleCount > 0) {
                details.open = true;
            }
        });
}

function bytesToSyncBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (
        let offset = 0;
        offset < bytes.length;
        offset += chunkSize
    ) {
        binary += String.fromCharCode(
            ...bytes.subarray(
                offset,
                offset + chunkSize
            )
        );
    }

    return btoa(binary);
}

function syncBase64ToBytes(value = "") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

async function deriveSyncEncryptionKey(
    passphrase,
    salt,
    usage
) {
    if (!globalThis.crypto?.subtle) {
        throw new Error(
            "Le chiffrement n’est pas disponible dans ce navigateur."
        );
    }

    const baseKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: SYNC_ENCRYPTION_ITERATIONS,
            hash: "SHA-256"
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        [usage]
    );
}

async function encryptSyncPackagePayload(
    payload,
    passphrase
) {
    const salt = crypto.getRandomValues(
        new Uint8Array(16)
    );
    const iv = crypto.getRandomValues(
        new Uint8Array(12)
    );
    const key = await deriveSyncEncryptionKey(
        passphrase,
        salt,
        "encrypt"
    );
    const plaintext = new TextEncoder().encode(
        JSON.stringify(payload)
    );
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            plaintext
        )
    );

    return {
        format: SYNC_ENCRYPTED_PACKAGE_FORMAT,
        schemaVersion:
            SYNC_ENCRYPTION_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        encryptedAt: new Date().toISOString(),
        encryption: {
            algorithm: "AES-GCM",
            keyDerivation: "PBKDF2-SHA-256",
            iterations:
                SYNC_ENCRYPTION_ITERATIONS,
            salt: bytesToSyncBase64(salt),
            iv: bytesToSyncBase64(iv)
        },
        ciphertext:
            bytesToSyncBase64(ciphertext)
    };
}

async function decryptSyncPackagePayload(
    envelope,
    passphrase
) {
    if (
        !envelope ||
        envelope.format !==
            SYNC_ENCRYPTED_PACKAGE_FORMAT ||
        Number(envelope.schemaVersion) !==
            SYNC_ENCRYPTION_SCHEMA_VERSION ||
        !envelope.encryption ||
        typeof envelope.ciphertext !== "string"
    ) {
        throw new Error(
            "Ce paquet chiffré Shuffle+ n’est pas compatible."
        );
    }

    const salt = syncBase64ToBytes(
        envelope.encryption.salt || ""
    );
    const iv = syncBase64ToBytes(
        envelope.encryption.iv || ""
    );
    const ciphertext = syncBase64ToBytes(
        envelope.ciphertext
    );
    const key = await deriveSyncEncryptionKey(
        passphrase,
        salt,
        "decrypt"
    );

    try {
        const plaintext = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            ciphertext
        );
        return JSON.parse(
            new TextDecoder().decode(plaintext)
        );
    } catch (error) {
        throw new Error(
            "Mot de passe incorrect ou paquet chiffré endommagé."
        );
    }
}

async function downloadEncryptedSyncPackage() {
    const passphrase = window.prompt(
        "Choisis un mot de passe d’au moins 8 caractères pour chiffrer ce paquet.\n\nIl ne sera pas enregistré par Shuffle+."
    );

    if (passphrase === null) {
        setStatus("Export chiffré annulé.");
        return;
    }

    if (passphrase.length < 8) {
        setStatus(
            "Le mot de passe doit contenir au moins 8 caractères.",
            "error"
        );
        return;
    }

    const confirmation = window.prompt(
        "Confirme le mot de passe du paquet chiffré."
    );

    if (confirmation !== passphrase) {
        setStatus(
            "Les deux mots de passe ne correspondent pas.",
            "error"
        );
        return;
    }

    try {
        setStatus("Chiffrement du paquet en cours…");
        const encrypted =
            await encryptSyncPackagePayload(
                buildSyncPackage(),
                passphrase
            );
        downloadJsonPayload(
            encrypted,
            `shuffleplus-sync-chiffre-${getSyncDatePart()}.json`
        );
        setStatus(
            "Paquet chiffré exporté. Garde le mot de passe séparément."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            error.message ||
            "Impossible de chiffrer le paquet.",
            "error"
        );
    }
}

function getSelectiveSyncMetrics(imported = {}) {
    const feedbackCount = Object.keys(
        imported.musicFeedbackState?.records || {}
    ).length;
    const learningDecisionCount = [
        ...(imported.adaptiveLearningState?.dismissedSuggestions || []),
        ...(imported.adaptiveLearningState?.acceptedSuggestions || []),
        ...(imported.adaptiveLearningState?.autoApplyHistory || [])
    ].length;
    const historyCount = [
        ...(imported.mixHistory || []),
        ...(imported.iosCommandHistory || []),
        ...(imported.adaptiveDjMenuHistory || []),
        ...(imported.intelligenceAnalytics?.events || []),
        ...(imported.recentTrackUris || [])
    ].length;

    return {
        library: {
            total:
                (imported.savedMixes?.length || 0) +
                (imported.mixStudioTemplates?.length || 0) +
                (imported.favoriteSourceKeys?.length || 0),
            detail:
                `${imported.savedMixes?.length || 0} mix · ` +
                `${imported.mixStudioTemplates?.length || 0} modèles · ` +
                `${imported.favoriteSourceKeys?.length || 0} favoris`
        },
        profiles: {
            total: imported.mixProfiles?.length || 0,
            detail:
                `${imported.mixProfiles?.length || 0} profils · règles et réglages`
        },
        automation: {
            total:
                (imported.iosCommands?.length || 0) +
                (imported.mixSchedules?.length || 0) +
                (imported.quickContextsState?.length || 0),
            detail:
                `${imported.iosCommands?.length || 0} commandes · ` +
                `${imported.mixSchedules?.length || 0} programmations · ` +
                `${imported.quickContextsState?.length || 0} contextes`
        },
        feedback: {
            total: feedbackCount,
            detail: `${feedbackCount} morceaux évalués`
        },
        learning: {
            total:
                (imported.adaptiveLearningState?.observations?.length || 0) +
                learningDecisionCount,
            detail:
                `${imported.adaptiveLearningState?.observations?.length || 0} observations · ` +
                `${learningDecisionCount} décisions`
        },
        history: {
            total: historyCount,
            detail: `${historyCount} éléments historiques`
        }
    };
}

function getSelectiveSyncCategoryDefinitions() {
    return [
        {
            id: "library",
            icon: "🎵",
            label: "Mix & bibliothèque",
            description:
                "Mix enregistrés, favoris et état des files de lecture."
        },
        {
            id: "profiles",
            icon: "🎛️",
            label: "Profils & règles",
            description:
                "Profils de mix, exclusions, priorités et réglages du moteur."
        },
        {
            id: "automation",
            icon: "⚡",
            label: "Automatisation",
            description:
                "Commandes iOS, contextes rapides, Adaptive DJ et programmations."
        },
        {
            id: "feedback",
            icon: "💚",
            label: "Feedback musical",
            description:
                "J’aime, Pas maintenant et Trop répétitif."
        },
        {
            id: "learning",
            icon: "🧠",
            label: "Apprentissage",
            description:
                "Observations, suggestions et adaptations automatiques."
        },
        {
            id: "history",
            icon: "🕘",
            label: "Historiques",
            description:
                "Mix récents, commandes, événements Intelligence et titres récents."
        }
    ];
}

function renderSelectiveSyncMerge() {
    if (!pendingSyncPackage) {
        return "";
    }

    const localImported = validateBackupPayload(
        buildBackupPayload()
    );
    const remoteImported =
        pendingSyncPackage.importedBackup;
    const localMetrics =
        getSelectiveSyncMetrics(localImported);
    const remoteMetrics =
        getSelectiveSyncMetrics(remoteImported);
    const detailedDiffs = Object.fromEntries(
        SYNC_SELECTIVE_CATEGORY_IDS.map(
            (categoryId) => [
                categoryId,
                compareSyncCategoryItems(
                    localImported,
                    remoteImported,
                    categoryId
                )
            ]
        )
    );
    const detailedCount = Object.values(
        detailedDiffs
    ).reduce(
        (total, rows) =>
            total + rows.filter(
                (row) => row.status !== "same"
            ).length,
        0
    );

    return `
        <form
            id="selectiveSyncMergeForm"
            class="sync-selective-merge"
        >
            <div class="sync-selective-heading">
                <div>
                    <span class="sync-eyebrow">v4.9 · Comparaison détaillée</span>
                    <h4>Vérifier puis choisir catégorie par catégorie</h4>
                    <p>
                        ${detailedCount} différence${detailedCount > 1 ? "s" : ""}
                        détectée${detailedCount > 1 ? "s" : ""}.
                        Ouvre une catégorie pour examiner chaque élément avant validation.
                    </p>
                </div>
                <div class="sync-merge-presets">
                    <button
                        type="button"
                        data-sync-merge-preset="local"
                    >
                        Tout local
                    </button>
                    <button
                        type="button"
                        data-sync-merge-preset="merge"
                    >
                        Fusionner tout
                    </button>
                    <button
                        type="button"
                        data-sync-merge-preset="remote"
                    >
                        Tout distant
                    </button>
                </div>
            </div>

            <label class="sync-diff-search">
                <span>Rechercher dans les différences</span>
                <input
                    id="syncDiffSearchInput"
                    type="search"
                    placeholder="Nom d’un mix, profil, morceau, commande…"
                    autocomplete="off"
                >
            </label>

            <div class="sync-category-comparison">
                ${getSelectiveSyncCategoryDefinitions()
                    .map((category) => {
                        const rows =
                            detailedDiffs[category.id] || [];
                        const changedCount = rows.filter(
                            (row) => row.status !== "same"
                        ).length;

                        return `
                        <article class="sync-category-row">
                            <div class="sync-category-title">
                                <span>${category.icon}</span>
                                <div>
                                    <strong>${escapeHtml(category.label)}</strong>
                                    <small>${escapeHtml(category.description)}</small>
                                </div>
                            </div>

                            <div class="sync-category-side">
                                <span>Sur cet appareil</span>
                                <strong>${localMetrics[category.id].total}</strong>
                                <small>${escapeHtml(localMetrics[category.id].detail)}</small>
                            </div>

                            <label class="sync-category-choice">
                                <span>Décision</span>
                                <select name="category-${category.id}">
                                    <option value="local">
                                        Conserver local
                                    </option>
                                    <option value="merge" selected>
                                        Fusionner
                                    </option>
                                    <option value="remote">
                                        Utiliser distant
                                    </option>
                                </select>
                            </label>

                            <div class="sync-category-side is-remote">
                                <span>Paquet reçu</span>
                                <strong>${remoteMetrics[category.id].total}</strong>
                                <small>${escapeHtml(remoteMetrics[category.id].detail)}</small>
                            </div>

                            <details class="sync-diff-details">
                                <summary>
                                    Voir ${rows.length} élément${rows.length > 1 ? "s" : ""}
                                    · ${changedCount} différence${changedCount > 1 ? "s" : ""}
                                </summary>
                                ${renderSyncDetailedDiff(rows)}
                            </details>
                        </article>
                    `;
                    })
                    .join("")}
            </div>

            <div class="sync-selective-footer">
                <p>
                    Une sauvegarde locale est téléchargée et conservée dans
                    l’application avant la fusion. Elle pourra être restaurée
                    pendant 30 jours.
                </p>
                <button
                    class="sync-primary-button"
                    type="submit"
                >
                    Appliquer la fusion sélectionnée
                </button>
            </div>
        </form>
    `;
}

function setSelectiveSyncMergePreset(mode = "merge") {
    if (!["local", "merge", "remote"].includes(mode)) {
        return;
    }

    document
        .querySelectorAll(
            "#selectiveSyncMergeForm select[name^='category-']"
        )
        .forEach((select) => {
            select.value = mode;
        });
}

function applySelectiveLibraryCategory(
    localImported,
    remoteImported,
    mode
) {
    if (mode === "local") {
        return false;
    }

    const imported = mode === "remote"
        ? remoteImported
        : {
            ...localImported,
            favoriteSourceKeys:
                mergeSyncUniqueStrings(
                    localImported.favoriteSourceKeys,
                    remoteImported.favoriteSourceKeys,
                    MAX_IMPORTED_FAVORITES
                ),
            savedMixes:
                mergeSyncArrays(
                    localImported.savedMixes,
                    remoteImported.savedMixes,
                    (item) => item.id,
                    MAX_SAVED_MIXES
                ),
            mixStudioTemplates:
                mergeSyncArrays(
                    localImported.mixStudioTemplates,
                    remoteImported.mixStudioTemplates,
                    (item) => item.id,
                    MAX_MIX_STUDIO_TEMPLATES
                ),
            playbackQueueStates: {
                ...(localImported.playbackQueueStates || {}),
                ...(remoteImported.playbackQueueStates || {})
            }
        };

    favoriteSourceKeys.clear();
    imported.favoriteSourceKeys.forEach(
        (key) => favoriteSourceKeys.add(key)
    );
    savedMixes = imported.savedMixes;
    mixStudioTemplates =
        imported.mixStudioTemplates;
    saveMixStudioTemplates();
    writePlaybackQueueStates(
        imported.playbackQueueStates
    );

    if (mode === "remote") {
        librarySearchTerm =
            imported.preferences.searchTerm;
        libraryFilter = imported.preferences.filter;
        librarySort = imported.preferences.sort;
    }

    editingSavedMixId = "";
    configuringSavedMixId = "";
    selectedSourceKeys.clear();
    saveFavoriteSources();
    saveSavedMixes();
    return true;
}

function applySelectiveProfilesCategory(
    localImported,
    remoteImported,
    mode
) {
    if (mode === "local") {
        return false;
    }

    if (mode === "remote") {
        mixProfiles = remoteImported.mixProfiles;
        activeProfileId = remoteImported.activeProfileId;
        currentExclusionRules = remoteImported.exclusionRules;
        currentPriorityRules = remoteImported.priorityRules;
        currentCoherenceSettings = remoteImported.coherenceSettings;
        currentIntensitySettings = remoteImported.intensitySettings;
        currentAdaptiveSettings = remoteImported.adaptiveSettings;
        currentCleanupSettings = remoteImported.cleanupSettings;
    } else {
        mixProfiles = mergeSyncArrays(
            localImported.mixProfiles,
            remoteImported.mixProfiles,
            (item) => item.id,
            MAX_MIX_PROFILES
        ).map((profile) => normalizeMixProfile(profile));

        if (!mixProfiles.some(
            (profile) => profile.id === activeProfileId
        )) {
            activeProfileId = remoteImported.activeProfileId;
        }
    }

    if (!mixProfiles.some(
        (profile) => profile.id === activeProfileId
    )) {
        activeProfileId = "";
    }

    saveMixProfiles();
    saveActiveProfileId();
    saveExclusionRules();
    savePriorityRules();
    saveCoherenceSettings();
    saveIntensitySettings();
    saveAdaptiveSettings();
    saveCleanupSettings();
    return true;
}

function applySelectiveAutomationCategory(
    localImported,
    remoteImported,
    mode
) {
    if (mode === "local") {
        return false;
    }

    if (mode === "remote") {
        iosQuickPlaySettings = remoteImported.iosQuickPlaySettings;
        iosCommands = remoteImported.iosCommands;
        adaptiveDjMenuSettings = remoteImported.adaptiveDjMenuSettings;
        drivingModeSettings = remoteImported.drivingModeSettings;
        quickContextsState = remoteImported.quickContextsState;
        mixSchedules = remoteImported.mixSchedules;
    } else {
        iosCommands = mergeSyncArrays(
            localImported.iosCommands,
            remoteImported.iosCommands,
            (item) => item.id,
            MAX_IOS_COMMANDS
        ).map((command) => normalizeIosCommand(command));
        mixSchedules = mergeSyncArrays(
            localImported.mixSchedules,
            remoteImported.mixSchedules,
            (item) => item.id,
            MAX_MIX_SCHEDULES
        ).map((schedule) => normalizeMixSchedule(schedule));
        quickContextsState = mergeQuickContextsForSync(
            localImported.quickContextsState,
            remoteImported.quickContextsState
        );
    }

    if (!iosCommands.length) {
        iosCommands = migrateLegacyIosCommand();
    }

    saveIosQuickPlaySettings();
    saveIosCommands();
    saveAdaptiveDjMenuSettings();
    saveDrivingModeSettings();
    saveQuickContextsState();
    saveMixSchedules();
    return true;
}

function applySelectiveFeedbackCategory(
    localImported,
    remoteImported,
    mode
) {
    if (mode === "local") {
        return false;
    }

    musicFeedbackState = mode === "remote"
        ? remoteImported.musicFeedbackState
        : normalizeMusicFeedbackState({
            records: mergeSyncRecordMaps(
                localImported.musicFeedbackState?.records,
                remoteImported.musicFeedbackState?.records
            ),
            events: mergeSyncArrays(
                localImported.musicFeedbackState?.events,
                remoteImported.musicFeedbackState?.events,
                (item) => item.id,
                MAX_MUSIC_FEEDBACK_EVENTS
            ),
            updatedAt: Date.now()
        });

    saveMusicFeedbackState();
    return true;
}

function applySelectiveLearningCategory(
    localImported,
    remoteImported,
    mode
) {
    if (mode === "local") {
        return false;
    }

    adaptiveLearningState = mode === "remote"
        ? remoteImported.adaptiveLearningState
        : normalizeAdaptiveLearningState({
            ...localImported.adaptiveLearningState,
            observations: mergeSyncArrays(
                localImported.adaptiveLearningState?.observations,
                remoteImported.adaptiveLearningState?.observations,
                (item) => item.id,
                MAX_ADAPTIVE_LEARNING_OBSERVATIONS
            ),
            dismissedSuggestions: mergeSyncArrays(
                localImported.adaptiveLearningState?.dismissedSuggestions,
                remoteImported.adaptiveLearningState?.dismissedSuggestions,
                (item) => item.signature,
                MAX_ADAPTIVE_LEARNING_DECISIONS
            ),
            acceptedSuggestions: mergeSyncArrays(
                localImported.adaptiveLearningState?.acceptedSuggestions,
                remoteImported.adaptiveLearningState?.acceptedSuggestions,
                (item) => item.signature,
                MAX_ADAPTIVE_LEARNING_DECISIONS
            ),
            autoApplyHistory: mergeSyncArrays(
                localImported.adaptiveLearningState?.autoApplyHistory,
                remoteImported.adaptiveLearningState?.autoApplyHistory,
                (item) => item.id,
                MAX_ADAPTIVE_AUTO_CHANGES
            ),
            updatedAt: Date.now()
        });

    saveAdaptiveLearningState();
    return true;
}

function applySelectiveHistoryCategory(
    localImported,
    remoteImported,
    mode
) {
    if (mode === "local") {
        return false;
    }

    if (mode === "remote") {
        localStorage.setItem(
            TRACK_HISTORY_KEY,
            JSON.stringify(remoteImported.recentTrackUris)
        );
        mixHistory = remoteImported.mixHistory;
        iosCommandHistory = remoteImported.iosCommandHistory;
        adaptiveDjMenuHistory = remoteImported.adaptiveDjMenuHistory;
        intelligenceAnalytics = remoteImported.intelligenceAnalytics;
    } else {
        localStorage.setItem(
            TRACK_HISTORY_KEY,
            JSON.stringify(
                mergeSyncUniqueStrings(
                    localImported.recentTrackUris,
                    remoteImported.recentTrackUris,
                    MAX_IMPORTED_HISTORY
                )
            )
        );
        mixHistory = mergeSyncArrays(
            localImported.mixHistory,
            remoteImported.mixHistory,
            (item) => item.id,
            MAX_MIX_HISTORY_ITEMS
        );
        iosCommandHistory = mergeSyncArrays(
            localImported.iosCommandHistory,
            remoteImported.iosCommandHistory,
            (item) => item.id,
            MAX_IOS_COMMAND_HISTORY
        );
        adaptiveDjMenuHistory = mergeSyncArrays(
            localImported.adaptiveDjMenuHistory,
            remoteImported.adaptiveDjMenuHistory,
            (item) => item.id,
            MAX_ADAPTIVE_DJ_HISTORY
        );
        intelligenceAnalytics = normalizeIntelligenceAnalytics({
            ...localImported.intelligenceAnalytics,
            events: mergeSyncArrays(
                localImported.intelligenceAnalytics?.events,
                remoteImported.intelligenceAnalytics?.events,
                (item) => item.id,
                MAX_INTELLIGENCE_EVENTS
            ),
            updatedAt: Date.now()
        });
    }

    saveMixHistory();
    saveIosCommandHistory();
    saveAdaptiveDjMenuHistory();
    saveIntelligenceAnalytics();
    return true;
}

async function applySelectiveSyncPackage(form) {
    if (!pendingSyncPackage) {
        setStatus(
            "Analyse d’abord un paquet de synchronisation.",
            "error"
        );
        return;
    }

    const data = new FormData(form);
    const choices = {};

    for (const categoryId of SYNC_SELECTIVE_CATEGORY_IDS) {
        const value = String(
            data.get(`category-${categoryId}`) ||
            "local"
        );
        choices[categoryId] = [
            "local",
            "merge",
            "remote"
        ].includes(value)
            ? value
            : "local";
    }

    const changed = Object.values(choices)
        .some((value) => value !== "local");

    if (!changed) {
        setStatus(
            "Toutes les catégories sont réglées sur local : aucune modification."
        );
        return;
    }

    const source =
        pendingSyncPackage.sourceInstallation;
    const accountMismatch = Boolean(
        pendingSyncPackage.raw.spotifyUserId &&
        currentUserId &&
        pendingSyncPackage.raw.spotifyUserId !== currentUserId
    );
    const confirmed = window.confirm(
        "Appliquer la fusion sélective ?\n\n" +
        "Une sauvegarde de cet appareil sera téléchargée avant modification." +
        (accountMismatch
            ? "\n\nAttention : le paquet provient d’un autre compte Spotify."
            : "")
    );

    if (!confirmed) {
        setStatus("Fusion sélective annulée.");
        return;
    }

    const localBackupBeforeMerge =
        buildBackupPayload();
    saveLastSyncMergeUndo(
        localBackupBeforeMerge,
        source?.label || "Appareil distant",
        choices
    );
    downloadBackupFile();

    const localImported = validateBackupPayload(
        localBackupBeforeMerge
    );
    const remoteImported =
        pendingSyncPackage.importedBackup;
    const appliedCategories = [];

    if (applySelectiveLibraryCategory(
        localImported,
        remoteImported,
        choices.library
    )) {
        appliedCategories.push("bibliothèque");
    }

    if (applySelectiveProfilesCategory(
        localImported,
        remoteImported,
        choices.profiles
    )) {
        appliedCategories.push("profils");
    }

    if (applySelectiveAutomationCategory(
        localImported,
        remoteImported,
        choices.automation
    )) {
        appliedCategories.push("automatisation");
    }

    if (applySelectiveFeedbackCategory(
        localImported,
        remoteImported,
        choices.feedback
    )) {
        appliedCategories.push("feedback");
    }

    if (applySelectiveLearningCategory(
        localImported,
        remoteImported,
        choices.learning
    )) {
        appliedCategories.push("apprentissage");
    }

    if (applySelectiveHistoryCategory(
        localImported,
        remoteImported,
        choices.history
    )) {
        appliedCategories.push("historiques");
    }

    syncPairedDevices = syncPairedDevices.map(
        (peer) =>
            peer.id === source?.id
                ? {
                    ...peer,
                    lastSyncAt: Date.now(),
                    lastSeenAt: Date.now(),
                    lastFingerprint:
                        pendingSyncPackage.fingerprint,
                    lastDataUpdatedAt:
                        pendingSyncPackage.dataUpdatedAt,
                    lastSummary:
                        pendingSyncPackage.summary
                }
                : peer
    );
    saveSyncPairedDevices();

    addSyncSessionHistory({
        type: "selective-merge",
        peerId: source?.id || "",
        peerLabel:
            source?.label || "Appareil distant",
        status: "success",
        message:
            `Fusion sélective appliquée : ${appliedCategories.join(", ")}.`
    });

    pendingSyncPackage = null;
    displayPlaylists(playlistsCache);
    setStatus(
        `Fusion terminée : ${appliedCategories.join(", ")}.`
    );
}

function renderSyncConflictAnalysis() {
    if (!pendingSyncPackage) {
        return "";
    }

    const localPackage = buildSyncPackage();
    const remote = pendingSyncPackage;
    const sameFingerprint =
        localPackage.fingerprint === remote.fingerprint;
    const accountMismatch =
        Boolean(
            remote.raw.spotifyUserId &&
            currentUserId &&
            remote.raw.spotifyUserId !== currentUserId
        );
    const recommendation = getSyncRecommendation(remote);

    return `
        <div class="sync-conflict-card">
            <div class="sync-conflict-heading">
                <div>
                    <span class="sync-eyebrow">Paquet analysé</span>
                    <h4>
                        ${escapeHtml(remote.sourceInstallation.label)}
                    </h4>
                    <p>
                        Exporté le
                        ${new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short"
                        }).format(new Date(remote.exportedAt))}
                    </p>
                </div>
                <span class="sync-state-badge ${sameFingerprint ? "is-same" : "is-conflict"}">
                    ${sameFingerprint
                        ? "Données identiques"
                        : "Différences détectées"}
                </span>
            </div>

            ${accountMismatch ? `
                <p class="sync-warning">
                    ⚠ Ce paquet provient d’un autre compte Spotify.
                </p>
            ` : ""}

            ${renderSyncSummaryGrid(remote.summary)}

            ${renderSelectiveSyncMerge()}

            <p class="sync-recommendation">
                Politique active :
                <strong>${escapeHtml(
                    getSyncPolicyLabel(
                        syncSettings.conflictPolicy
                    )
                )}</strong><br>
                Recommandation :
                <strong>${escapeHtml(recommendation.label)}</strong>
            </p>

            <div class="sync-conflict-actions">
                <button
                    id="keepLocalSyncButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    Conserver cet appareil
                </button>

                <button
                    id="applyRemoteSyncButton"
                    class="sync-danger-button"
                    type="button"
                    ${sameFingerprint ? "disabled" : ""}
                >
                    Utiliser le paquet reçu
                </button>

                <button
                    id="applySyncPolicyButton"
                    class="sync-primary-button"
                    type="button"
                    ${sameFingerprint || recommendation.action === "manual"
                        ? "disabled"
                        : ""}
                >
                    Appliquer la politique
                </button>
            </div>
        </div>
    `;
}


function normalizeSyncPairedDevice(value = {}) {
    const id =
        typeof value.id === "string"
            ? value.id.trim().slice(0, 120)
            : "";

    if (!id || id === syncInstallation.id) {
        return null;
    }

    return {
        id,
        label:
            typeof value.label === "string" &&
            value.label.trim()
                ? value.label.trim().slice(0, 80)
                : "Appareil Shuffle+",
        spotifyUserId:
            typeof value.spotifyUserId === "string"
                ? value.spotifyUserId.slice(0, 160)
                : "",
        pairedAt: Number(
            value.pairedAt || Date.now()
        ),
        lastSeenAt: Number(
            value.lastSeenAt ||
            value.pairedAt ||
            Date.now()
        ),
        lastSyncAt: Number(
            value.lastSyncAt || 0
        ),
        lastSentAt: Number(
            value.lastSentAt || 0
        ),
        lastFingerprint:
            typeof value.lastFingerprint === "string"
                ? value.lastFingerprint.slice(0, 80)
                : "",
        lastDataUpdatedAt:
            typeof value.lastDataUpdatedAt === "string"
                ? value.lastDataUpdatedAt
                : "",
        lastSummary:
            value.lastSummary &&
            typeof value.lastSummary === "object"
                ? value.lastSummary
                : {},
        trustKey:
            typeof value.trustKey === "string"
                ? value.trustKey.slice(0, 120)
                : "",
        status:
            value.status === "pending"
                ? "pending"
                : "paired"
    };
}

function normalizeSyncPairedDevices(values = []) {
    if (!Array.isArray(values)) {
        return [];
    }

    const unique = new Map();

    for (const value of values) {
        const device = normalizeSyncPairedDevice(
            value
        );

        if (!device) {
            continue;
        }

        const previous = unique.get(device.id);
        if (
            !previous ||
            device.lastSeenAt >= previous.lastSeenAt
        ) {
            unique.set(device.id, device);
        }
    }

    return [...unique.values()]
        .sort(
            (left, right) =>
                right.lastSeenAt - left.lastSeenAt
        )
        .slice(0, MAX_SYNC_PAIRED_DEVICES);
}

function readSyncPairedDevices() {
    try {
        const raw = localStorage.getItem(
            SYNC_PAIRED_DEVICES_KEY
        );
        return normalizeSyncPairedDevices(
            raw ? JSON.parse(raw) : []
        );
    } catch (error) {
        return [];
    }
}

function saveSyncPairedDevices() {
    syncPairedDevices =
        normalizeSyncPairedDevices(
            syncPairedDevices
        );

    try {
        localStorage.setItem(
            SYNC_PAIRED_DEVICES_KEY,
            JSON.stringify(syncPairedDevices)
        );
    } catch (error) {
        console.warn(
            "Appareils appairés non enregistrés :",
            error
        );
    }
}

function normalizeSyncPairingInvite(value = {}) {
    const invitationId =
        typeof value.invitationId === "string"
            ? value.invitationId.slice(0, 120)
            : "";
    const code = String(value.code || "")
        .replace(/\D/g, "")
        .slice(0, 6);
    const secret =
        typeof value.secret === "string"
            ? value.secret.slice(0, 180)
            : "";

    if (!invitationId || code.length !== 6 || !secret) {
        return null;
    }

    return {
        invitationId,
        code,
        secret,
        createdAt: Number(value.createdAt || Date.now()),
        expiresAt: Number(
            value.expiresAt ||
            Date.now() + SYNC_PAIRING_TTL
        ),
        acceptedAt: Number(value.acceptedAt || 0),
        acceptedInstallationId:
            typeof value.acceptedInstallationId === "string"
                ? value.acceptedInstallationId.slice(0, 120)
                : ""
    };
}

function normalizeSyncPairingInvites(values = []) {
    if (!Array.isArray(values)) {
        return [];
    }

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    return values
        .map(normalizeSyncPairingInvite)
        .filter(Boolean)
        .filter(
            (invite) =>
                invite.expiresAt >= cutoff
        )
        .sort(
            (left, right) =>
                right.createdAt - left.createdAt
        )
        .slice(0, MAX_SYNC_PAIRING_INVITES);
}

function readSyncPairingInvites() {
    try {
        const raw = localStorage.getItem(
            SYNC_PAIRING_INVITES_KEY
        );
        return normalizeSyncPairingInvites(
            raw ? JSON.parse(raw) : []
        );
    } catch (error) {
        return [];
    }
}

function saveSyncPairingInvites() {
    syncPairingInvites =
        normalizeSyncPairingInvites(
            syncPairingInvites
        );

    try {
        localStorage.setItem(
            SYNC_PAIRING_INVITES_KEY,
            JSON.stringify(syncPairingInvites)
        );
    } catch (error) {
        console.warn(
            "Invitations d’appairage non enregistrées :",
            error
        );
    }
}

function normalizeSyncSessionHistory(values = []) {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .filter(
            (item) =>
                item && typeof item === "object"
        )
        .map((item) => ({
            id:
                typeof item.id === "string"
                    ? item.id
                    : createSyncIdentifier(),
            type:
                typeof item.type === "string"
                    ? item.type.slice(0, 40)
                    : "sync",
            peerId:
                typeof item.peerId === "string"
                    ? item.peerId.slice(0, 120)
                    : "",
            peerLabel:
                typeof item.peerLabel === "string"
                    ? item.peerLabel.slice(0, 80)
                    : "Appareil Shuffle+",
            status:
                item.status === "error"
                    ? "error"
                    : item.status === "warning"
                        ? "warning"
                        : "success",
            message:
                typeof item.message === "string"
                    ? item.message.slice(0, 240)
                    : "",
            createdAt: Number(
                item.createdAt || Date.now()
            )
        }))
        .sort(
            (left, right) =>
                right.createdAt - left.createdAt
        )
        .slice(0, MAX_SYNC_SESSION_HISTORY);
}

function readSyncSessionHistory() {
    try {
        const raw = localStorage.getItem(
            SYNC_SESSION_HISTORY_KEY
        );
        return normalizeSyncSessionHistory(
            raw ? JSON.parse(raw) : []
        );
    } catch (error) {
        return [];
    }
}

function saveSyncSessionHistory() {
    syncSessionHistory =
        normalizeSyncSessionHistory(
            syncSessionHistory
        );

    try {
        localStorage.setItem(
            SYNC_SESSION_HISTORY_KEY,
            JSON.stringify(syncSessionHistory)
        );
    } catch (error) {
        console.warn(
            "Historique de synchronisation non enregistré :",
            error
        );
    }
}

function addSyncSessionHistory(entry = {}) {
    syncSessionHistory =
        normalizeSyncSessionHistory([
            {
                id: createSyncIdentifier(),
                ...entry,
                createdAt: Date.now()
            },
            ...syncSessionHistory
        ]);
    saveSyncSessionHistory();
}

function encodeSyncPairingToken(payload) {
    const bytes = new TextEncoder().encode(
        JSON.stringify(payload)
    );
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function decodeSyncPairingToken(token = "") {
    const normalized = String(token)
        .trim()
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const padded = normalized.padEnd(
        Math.ceil(normalized.length / 4) * 4,
        "="
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(
        binary,
        (character) => character.charCodeAt(0)
    );
    return JSON.parse(
        new TextDecoder().decode(bytes)
    );
}

function createPairingCode() {
    const values = new Uint32Array(1);

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
    ) {
        crypto.getRandomValues(values);
        return String(
            100000 + (values[0] % 900000)
        );
    }

    return String(
        Math.floor(100000 + Math.random() * 900000)
    );
}

function buildSyncPairingInvitation(invite) {
    const localPackage = buildSyncPackage();

    return {
        format: SYNC_PAIRING_INVITE_FORMAT,
        schemaVersion: SYNC_PAIRING_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        invitationId: invite.invitationId,
        code: invite.code,
        secret: invite.secret,
        createdAt: new Date(invite.createdAt).toISOString(),
        expiresAt: new Date(invite.expiresAt).toISOString(),
        sourceInstallation: {
            ...syncInstallation
        },
        spotifyUserId: currentUserId || "",
        fingerprint: localPackage.fingerprint,
        dataUpdatedAt: localPackage.dataUpdatedAt,
        summary: localPackage.summary
    };
}

function createSyncPairingInvitation() {
    const invite = normalizeSyncPairingInvite({
        invitationId: createSyncIdentifier(),
        code: createPairingCode(),
        secret: createSyncIdentifier() + createSyncIdentifier(),
        createdAt: Date.now(),
        expiresAt: Date.now() + SYNC_PAIRING_TTL
    });

    syncPairingInvites = [
        invite,
        ...syncPairingInvites.filter(
            (item) => !item.acceptedAt
        )
    ];
    saveSyncPairingInvites();
    refreshSyncPreparationPanel();
    setStatus(
        `Invitation créée : code ${invite.code}, valable 15 minutes.`
    );
    return invite;
}

function getActiveSyncPairingInvite() {
    return syncPairingInvites.find(
        (invite) =>
            !invite.acceptedAt &&
            invite.expiresAt > Date.now()
    ) || null;
}

async function copySyncPairingInvitation() {
    const invite =
        getActiveSyncPairingInvite() ||
        createSyncPairingInvitation();
    const token = encodeSyncPairingToken(
        buildSyncPairingInvitation(invite)
    );

    try {
        await navigator.clipboard.writeText(token);
        setStatus(
            `Invitation copiée. Code de contrôle : ${invite.code}.`
        );
    } catch (error) {
        window.prompt(
            "Copie ce jeton d’appairage :",
            token
        );
    }
}

function exportSyncPairingInvitation() {
    const invite =
        getActiveSyncPairingInvite() ||
        createSyncPairingInvitation();
    downloadJsonPayload(
        buildSyncPairingInvitation(invite),
        `shuffleplus-pairing-${invite.code}.json`
    );
    setStatus(
        `Invitation d’appairage ${invite.code} exportée.`
    );
}

function validateSyncPairingInvitation(payload) {
    if (
        !payload ||
        payload.format !== SYNC_PAIRING_INVITE_FORMAT ||
        Number(payload.schemaVersion) !==
            SYNC_PAIRING_SCHEMA_VERSION
    ) {
        throw new Error(
            "Invitation d’appairage Shuffle+ invalide."
        );
    }

    const expiresAt = Date.parse(payload.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error(
            "Cette invitation d’appairage a expiré."
        );
    }

    const sourceInstallation =
        normalizeSyncInstallation(
            payload.sourceInstallation || {}
        );

    if (sourceInstallation.id === syncInstallation.id) {
        throw new Error(
            "Impossible d’appairer cette installation avec elle-même."
        );
    }

    const code = String(payload.code || "")
        .replace(/\D/g, "")
        .slice(0, 6);
    const secret = String(payload.secret || "");
    const invitationId = String(
        payload.invitationId || ""
    );

    if (
        code.length !== 6 ||
        !secret ||
        !invitationId
    ) {
        throw new Error(
            "Invitation d’appairage incomplète."
        );
    }

    return {
        ...payload,
        code,
        secret,
        invitationId,
        sourceInstallation,
        expiresAt
    };
}

function buildSyncPairingAcceptance(invitation) {
    const localPackage = buildSyncPackage();

    return {
        format: SYNC_PAIRING_ACCEPT_FORMAT,
        schemaVersion: SYNC_PAIRING_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        invitationId: invitation.invitationId,
        code: invitation.code,
        trustProof: hashSyncContent(
            invitation.secret +
            invitation.code +
            invitation.sourceInstallation.id
        ),
        acceptedAt: new Date().toISOString(),
        invitationSourceInstallationId:
            invitation.sourceInstallation.id,
        acceptingInstallation: {
            ...syncInstallation
        },
        spotifyUserId: currentUserId || "",
        fingerprint: localPackage.fingerprint,
        dataUpdatedAt: localPackage.dataUpdatedAt,
        summary: localPackage.summary
    };
}

function upsertSyncPairedDevice(device) {
    const normalized = normalizeSyncPairedDevice(
        device
    );

    if (!normalized) {
        return null;
    }

    const existing = syncPairedDevices.find(
        (item) => item.id === normalized.id
    );

    syncPairedDevices = [
        {
            ...existing,
            ...normalized,
            pairedAt:
                existing?.pairedAt ||
                normalized.pairedAt,
            lastSeenAt: Math.max(
                existing?.lastSeenAt || 0,
                normalized.lastSeenAt || 0
            )
        },
        ...syncPairedDevices.filter(
            (item) => item.id !== normalized.id
        )
    ];
    saveSyncPairedDevices();
    return normalized;
}

function acceptSyncPairingInvitationPayload(payload) {
    const invitation =
        validateSyncPairingInvitation(payload);
    const source = invitation.sourceInstallation;

    upsertSyncPairedDevice({
        id: source.id,
        label: source.label,
        spotifyUserId:
            invitation.spotifyUserId || "",
        pairedAt: Date.now(),
        lastSeenAt: Date.now(),
        lastFingerprint:
            invitation.fingerprint || "",
        lastDataUpdatedAt:
            invitation.dataUpdatedAt || "",
        lastSummary:
            invitation.summary || {},
        trustKey: hashSyncContent(
            invitation.secret +
            invitation.code +
            source.id
        ),
        status: "paired"
    });

    const acceptance =
        buildSyncPairingAcceptance(invitation);
    downloadJsonPayload(
        acceptance,
        `shuffleplus-pairing-acceptance-${invitation.code}.json`
    );

    addSyncSessionHistory({
        type: "pairing-accepted",
        peerId: source.id,
        peerLabel: source.label,
        status: "success",
        message:
            "Invitation acceptée ; confirmation exportée."
    });

    refreshSyncPreparationPanel();
    setStatus(
        `Appairage avec ${source.label} accepté. Envoie le fichier de confirmation à l’appareil d’origine.`
    );
}

function validateSyncPairingAcceptance(payload) {
    if (
        !payload ||
        payload.format !== SYNC_PAIRING_ACCEPT_FORMAT ||
        Number(payload.schemaVersion) !==
            SYNC_PAIRING_SCHEMA_VERSION
    ) {
        throw new Error(
            "Confirmation d’appairage Shuffle+ invalide."
        );
    }

    if (
        payload.invitationSourceInstallationId !==
        syncInstallation.id
    ) {
        throw new Error(
            "Cette confirmation ne cible pas cette installation."
        );
    }

    const invite = syncPairingInvites.find(
        (item) =>
            item.invitationId === payload.invitationId &&
            item.code === String(payload.code || "")
    );

    if (!invite) {
        throw new Error(
            "Invitation d’origine introuvable ou supprimée."
        );
    }

    const expectedProof = hashSyncContent(
        invite.secret +
        invite.code +
        syncInstallation.id
    );

    if (payload.trustProof !== expectedProof) {
        throw new Error(
            "La preuve d’appairage ne correspond pas."
        );
    }

    const acceptingInstallation =
        normalizeSyncInstallation(
            payload.acceptingInstallation || {}
        );

    if (acceptingInstallation.id === syncInstallation.id) {
        throw new Error(
            "Confirmation d’appairage invalide."
        );
    }

    return {
        ...payload,
        invite,
        acceptingInstallation
    };
}

function applySyncPairingAcceptancePayload(payload) {
    const acceptance =
        validateSyncPairingAcceptance(payload);
    const peer = acceptance.acceptingInstallation;

    upsertSyncPairedDevice({
        id: peer.id,
        label: peer.label,
        spotifyUserId:
            acceptance.spotifyUserId || "",
        pairedAt: Date.now(),
        lastSeenAt: Date.now(),
        lastFingerprint:
            acceptance.fingerprint || "",
        lastDataUpdatedAt:
            acceptance.dataUpdatedAt || "",
        lastSummary:
            acceptance.summary || {},
        trustKey: acceptance.trustProof,
        status: "paired"
    });

    syncPairingInvites = syncPairingInvites.map(
        (invite) =>
            invite.invitationId ===
            acceptance.invite.invitationId
                ? {
                    ...invite,
                    acceptedAt: Date.now(),
                    acceptedInstallationId: peer.id
                }
                : invite
    );
    saveSyncPairingInvites();

    addSyncSessionHistory({
        type: "pairing-complete",
        peerId: peer.id,
        peerLabel: peer.label,
        status: "success",
        message: "Appairage confirmé sur les deux appareils."
    });

    refreshSyncPreparationPanel();
    setStatus(
        `${peer.label} est maintenant appairé à cette installation.`
    );
}

function acceptSyncPairingToken(token = "") {
    if (!String(token).trim()) {
        setStatus(
            "Colle d’abord un jeton d’appairage.",
            "error"
        );
        return;
    }

    try {
        acceptSyncPairingInvitationPayload(
            decodeSyncPairingToken(token)
        );
    } catch (error) {
        console.error(error);
        setStatus(
            error.message ||
            "Jeton d’appairage invalide.",
            "error"
        );
    }
}

async function analyzeSyncPairingFile(file) {
    if (!file) {
        return;
    }

    if (
        file.size > SYNC_MAX_FILE_SIZE ||
        !file.name.toLowerCase().endsWith(".json")
    ) {
        setStatus(
            "Sélectionne un fichier d’appairage JSON de moins de 5 Mo.",
            "error"
        );
        return;
    }

    try {
        const payload = JSON.parse(
            await file.text()
        );

        if (
            payload.format ===
            SYNC_PAIRING_INVITE_FORMAT
        ) {
            acceptSyncPairingInvitationPayload(
                payload
            );
            return;
        }

        if (
            payload.format ===
            SYNC_PAIRING_ACCEPT_FORMAT
        ) {
            applySyncPairingAcceptancePayload(
                payload
            );
            return;
        }

        throw new Error(
            "Ce fichier n’est ni une invitation ni une confirmation d’appairage Shuffle+."
        );
    } catch (error) {
        console.error(error);
        setStatus(
            error.message ||
            "Impossible d’analyser ce fichier d’appairage.",
            "error"
        );
    }
}

function removeSyncPairedDevice(peerId) {
    const peer = syncPairedDevices.find(
        (item) => item.id === peerId
    );

    if (!peer) {
        return;
    }

    const confirmed = window.confirm(
        `Retirer « ${peer.label} » des appareils appairés ?`
    );

    if (!confirmed) {
        return;
    }

    syncPairedDevices = syncPairedDevices.filter(
        (item) => item.id !== peerId
    );
    saveSyncPairedDevices();
    syncSimulationResult = null;
    addSyncSessionHistory({
        type: "pairing-removed",
        peerId,
        peerLabel: peer.label,
        status: "warning",
        message: "Appairage supprimé localement."
    });
    refreshSyncPreparationPanel();
    setStatus(`${peer.label} a été retiré.`);
}

function getSyncPeerDate(peer) {
    const parsed = Date.parse(
        peer.lastDataUpdatedAt || ""
    );
    return Number.isFinite(parsed) ? parsed : 0;
}

function simulateSyncWithPeer(peerId) {
    const peer = syncPairedDevices.find(
        (item) => item.id === peerId
    );

    if (!peer) {
        setStatus(
            "Appareil appairé introuvable.",
            "error"
        );
        return;
    }

    const localPackage = buildSyncPackage(peer);
    const localDate = Date.parse(
        localPackage.dataUpdatedAt
    ) || 0;
    const peerDate = getSyncPeerDate(peer);
    const sameFingerprint = Boolean(
        peer.lastFingerprint &&
        peer.lastFingerprint ===
            localPackage.fingerprint
    );

    let recommendation = "Échange requis";
    let direction = "manual";
    let explanation =
        "Les deux appareils possèdent des empreintes différentes.";

    if (sameFingerprint) {
        recommendation = "Déjà synchronisés";
        direction = "same";
        explanation =
            "Les empreintes locales et distantes correspondent.";
    } else if (!peer.lastFingerprint) {
        recommendation = "Premier échange conseillé";
        direction = "export";
        explanation =
            "Aucun état distant n’est encore connu pour cet appareil.";
    } else if (localDate > peerDate) {
        recommendation =
            "Envoyer les données de cet appareil";
        direction = "export";
        explanation =
            "Les données locales semblent plus récentes.";
    } else if (peerDate > localDate) {
        recommendation =
            "Demander un paquet à l’autre appareil";
        direction = "import";
        explanation =
            "Le dernier état connu de l’autre appareil semble plus récent.";
    }

    syncSimulationResult = {
        peerId: peer.id,
        peerLabel: peer.label,
        localFingerprint:
            localPackage.fingerprint,
        remoteFingerprint:
            peer.lastFingerprint || "inconnue",
        recommendation,
        direction,
        explanation,
        simulatedAt: Date.now()
    };

    addSyncSessionHistory({
        type: "simulation",
        peerId: peer.id,
        peerLabel: peer.label,
        status:
            sameFingerprint
                ? "success"
                : "warning",
        message: recommendation
    });
    refreshSyncPreparationPanel();
    setStatus(
        `Simulation terminée avec ${peer.label}.`
    );
}

function exportSyncPackageForPeer(peerId) {
    const peer = syncPairedDevices.find(
        (item) => item.id === peerId
    );

    if (!peer) {
        setStatus(
            "Appareil appairé introuvable.",
            "error"
        );
        return;
    }

    const payload = buildSyncPackage(peer);
    downloadJsonPayload(
        payload,
        `shuffleplus-sync-to-${peer.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "device"}-${getSyncDatePart()}.json`
    );

    syncPairedDevices = syncPairedDevices.map(
        (item) =>
            item.id === peerId
                ? {
                    ...item,
                    lastSentAt: Date.now()
                }
                : item
    );
    saveSyncPairedDevices();
    addSyncSessionHistory({
        type: "package-export",
        peerId: peer.id,
        peerLabel: peer.label,
        status: "success",
        message:
            "Paquet ciblé exporté pour cet appareil."
    });
    refreshSyncPreparationPanel();
    setStatus(
        `Paquet de synchronisation préparé pour ${peer.label}.`
    );
}

function registerSyncPackageSource(analyzedPackage) {
    const source =
        analyzedPackage?.sourceInstallation;

    if (
        !source ||
        source.id === syncInstallation.id
    ) {
        return;
    }

    const raw = analyzedPackage.raw || {};
    const peer = upsertSyncPairedDevice({
        id: source.id,
        label: source.label,
        spotifyUserId:
            raw.spotifyUserId || "",
        pairedAt: Date.now(),
        lastSeenAt: Date.now(),
        lastFingerprint:
            analyzedPackage.fingerprint || "",
        lastDataUpdatedAt:
            analyzedPackage.dataUpdatedAt ||
            raw.dataUpdatedAt ||
            raw.exportedAt || "",
        lastSummary:
            analyzedPackage.summary || {},
        status: "paired"
    });

    if (peer) {
        addSyncSessionHistory({
            type: "package-import",
            peerId: peer.id,
            peerLabel: peer.label,
            status: "success",
            message:
                "Paquet reçu et état distant actualisé."
        });
    }
}

function renderSyncSimulationResult() {
    if (!syncSimulationResult) {
        return "";
    }

    return `
        <div class="sync-simulation-result
            is-${escapeHtml(syncSimulationResult.direction)}">
            <div>
                <span class="sync-eyebrow">Simulation locale</span>
                <h4>${escapeHtml(syncSimulationResult.peerLabel)}</h4>
                <p>${escapeHtml(syncSimulationResult.explanation)}</p>
            </div>
            <strong>${escapeHtml(syncSimulationResult.recommendation)}</strong>
            <dl>
                <div>
                    <dt>Empreinte locale</dt>
                    <dd><code>${escapeHtml(syncSimulationResult.localFingerprint)}</code></dd>
                </div>
                <div>
                    <dt>Dernière empreinte distante</dt>
                    <dd><code>${escapeHtml(syncSimulationResult.remoteFingerprint)}</code></dd>
                </div>
            </dl>
        </div>
    `;
}

function renderSyncSessionHistory() {
    const items = syncSessionHistory
        .slice(0, 12)
        .map((item) => `
            <li class="is-${escapeHtml(item.status)}">
                <div>
                    <strong>${escapeHtml(item.peerLabel)}</strong>
                    <span>${escapeHtml(item.message)}</span>
                </div>
                <time datetime="${new Date(item.createdAt).toISOString()}">
                    ${new Intl.DateTimeFormat(
                        "fr-FR",
                        {
                            dateStyle: "short",
                            timeStyle: "short"
                        }
                    ).format(new Date(item.createdAt))}
                </time>
            </li>
        `)
        .join("");

    return `
        <details class="sync-session-history">
            <summary>
                Historique d’appairage et de simulation ·
                ${syncSessionHistory.length}
            </summary>
            <ul>
                ${items || "<li>Aucune session enregistrée.</li>"}
            </ul>
        </details>
    `;
}

function renderSyncPairingPanel() {
    const invite = getActiveSyncPairingInvite();
    const remainingMinutes = invite
        ? Math.max(
            1,
            Math.ceil(
                (invite.expiresAt - Date.now()) /
                60000
            )
        )
        : 0;
    const devices = syncPairedDevices
        .map((peer) => `
            <article class="sync-peer-card">
                <div class="sync-peer-heading">
                    <div>
                        <span class="sync-peer-icon">📱</span>
                        <div>
                            <h4>${escapeHtml(peer.label)}</h4>
                            <code>${escapeHtml(peer.id)}</code>
                        </div>
                    </div>
                    <span class="sync-state-badge is-same">Appairé</span>
                </div>
                <div class="sync-peer-meta">
                    <span>
                        Dernier contact :
                        ${new Intl.DateTimeFormat(
                            "fr-FR",
                            {
                                dateStyle: "short",
                                timeStyle: "short"
                            }
                        ).format(new Date(peer.lastSeenAt))}
                    </span>
                    <span>
                        Empreinte :
                        <code>${escapeHtml(peer.lastFingerprint || "inconnue")}</code>
                    </span>
                </div>
                <div class="sync-peer-actions">
                    <button
                        type="button"
                        class="sync-primary-button"
                        data-simulate-sync-peer="${escapeHtml(peer.id)}"
                    >
                        🧪 Simuler
                    </button>
                    <button
                        type="button"
                        class="sync-secondary-button"
                        data-export-sync-peer="${escapeHtml(peer.id)}"
                    >
                        ⬇ Préparer le paquet
                    </button>
                    <button
                        type="button"
                        class="sync-danger-button"
                        data-remove-sync-peer="${escapeHtml(peer.id)}"
                    >
                        Retirer
                    </button>
                </div>
            </article>
        `)
        .join("");

    return `
        <section class="sync-pairing-panel" aria-label="Appairage local">
            <div class="sync-pairing-heading">
                <div>
                    <span class="sync-eyebrow">v4.7 · Appairage local</span>
                    <h4>Relier deux installations Shuffle+</h4>
                    <p>
                        L’échange reste manuel et chiffré uniquement par un jeton
                        temporaire. Aucun serveur n’est contacté dans cette version.
                    </p>
                </div>
                <span class="sync-local-badge">
                    ${syncPairedDevices.length} appareil${syncPairedDevices.length > 1 ? "s" : ""}
                </span>
            </div>

            <div class="sync-pairing-steps">
                <div>
                    <span>1</span>
                    <strong>Créer une invitation</strong>
                    <small>Sur le premier appareil.</small>
                </div>
                <div>
                    <span>2</span>
                    <strong>Accepter le jeton</strong>
                    <small>Sur le second appareil.</small>
                </div>
                <div>
                    <span>3</span>
                    <strong>Importer la confirmation</strong>
                    <small>De retour sur le premier appareil.</small>
                </div>
            </div>

            <div class="sync-pairing-actions">
                <button
                    id="createSyncPairingInvitationButton"
                    class="sync-primary-button"
                    type="button"
                >
                    ＋ Créer une invitation
                </button>
                <button
                    id="copySyncPairingInvitationButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    Copier le jeton
                </button>
                <button
                    id="exportSyncPairingInvitationButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    Exporter l’invitation
                </button>
                <button
                    id="importSyncPairingFileButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    Importer invitation / confirmation
                </button>
            </div>

            ${invite ? `
                <div class="sync-active-invite">
                    <div>
                        <span>Code de contrôle</span>
                        <strong>${escapeHtml(invite.code)}</strong>
                    </div>
                    <p>
                        Invitation valable encore environ
                        ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}.
                    </p>
                </div>
            ` : ""}

            <form id="syncPairingTokenForm" class="sync-pairing-token-form">
                <label>
                    <span>Jeton reçu sur l’autre appareil</span>
                    <textarea
                        name="pairingToken"
                        rows="3"
                        maxlength="12000"
                        placeholder="Colle ici le jeton d’appairage…"
                    ></textarea>
                </label>
                <button class="sync-primary-button" type="submit">
                    Accepter et générer la confirmation
                </button>
            </form>

            <input
                id="syncPairingFileInput"
                class="backup-file-input"
                type="file"
                accept="application/json,.json"
                aria-label="Choisir une invitation ou une confirmation d’appairage"
            >

            <div class="sync-peer-list">
                ${devices || `
                    <div class="sync-empty-peers">
                        Aucun appareil appairé pour le moment.
                    </div>
                `}
            </div>

            ${renderSyncSimulationResult()}
            ${renderSyncSessionHistory()}
        </section>
    `;
}


function normalizeServerSyncUrl(value = "") {
    const raw = String(value || "").trim().replace(/\/+$/, "");

    if (!raw) {
        return "";
    }

    try {
        const url = new URL(raw);
        const localHost = [
            "localhost",
            "127.0.0.1",
            "::1"
        ].includes(url.hostname);

        if (url.protocol !== "https:" && !(
            localHost && url.protocol === "http:"
        )) {
            return "";
        }

        return url.origin + url.pathname.replace(/\/$/, "");
    } catch (error) {
        return "";
    }
}

function normalizeServerSyncState(value = {}) {
    const interval = Math.min(
        SERVER_SYNC_MAX_INTERVAL_MINUTES,
        Math.max(
            1,
            Number(
                value.intervalMinutes ||
                SERVER_SYNC_DEFAULT_INTERVAL_MINUTES
            )
        )
    );

    return {
        enabled: value.enabled === true,
        autoSync: value.autoSync !== false,
        serverUrl: normalizeServerSyncUrl(
            value.serverUrl || ""
        ),
        spaceId:
            typeof value.spaceId === "string"
                ? value.spaceId.slice(0, 120)
                : "",
        deviceToken:
            typeof value.deviceToken === "string"
                ? value.deviceToken.slice(0, 240)
                : "",
        rootSecret:
            typeof value.rootSecret === "string"
                ? value.rootSecret.slice(0, 240)
                : "",
        revision: Math.max(
            0,
            Number(value.revision || 0)
        ),
        lastSyncedFingerprint:
            typeof value.lastSyncedFingerprint === "string"
                ? value.lastSyncedFingerprint.slice(0, 120)
                : "",
        lastPushAt: Math.max(
            0,
            Number(value.lastPushAt || 0)
        ),
        lastPullAt: Math.max(
            0,
            Number(value.lastPullAt || 0)
        ),
        connectedAt: Math.max(
            0,
            Number(value.connectedAt || 0)
        ),
        intervalMinutes: interval,
        lastError:
            typeof value.lastError === "string"
                ? value.lastError.slice(0, 300)
                : ""
    };
}

function readServerSyncState() {
    try {
        const raw = localStorage.getItem(
            SERVER_SYNC_STORAGE_KEY
        );
        return normalizeServerSyncState(
            raw ? JSON.parse(raw) : {}
        );
    } catch (error) {
        return normalizeServerSyncState();
    }
}

function saveServerSyncState() {
    serverSyncState = normalizeServerSyncState(
        serverSyncState
    );

    try {
        localStorage.setItem(
            SERVER_SYNC_STORAGE_KEY,
            JSON.stringify(serverSyncState)
        );
    } catch (error) {
        console.warn(
            "Configuration serveur non enregistrée :",
            error
        );
    }
}

function isServerSyncConnected() {
    return Boolean(
        serverSyncState.enabled &&
        serverSyncState.serverUrl &&
        serverSyncState.spaceId &&
        serverSyncState.deviceToken &&
        serverSyncState.rootSecret
    );
}

function setServerSyncMessage(
    text = "",
    type = ""
) {
    serverSyncMessage = {
        text: String(text || "").slice(0, 400),
        type: type === "error"
            ? "error"
            : type === "success"
                ? "success"
                : ""
    };
}

function serverSyncBytesToBase64Url(bytes) {
    return bytesToSyncBase64(bytes)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function serverSyncTextToBase64Url(text) {
    return serverSyncBytesToBase64Url(
        new TextEncoder().encode(text)
    );
}

function serverSyncBase64UrlToText(value = "") {
    const normalized = String(value || "")
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const padding = "=".repeat(
        (4 - normalized.length % 4) % 4
    );
    return new TextDecoder().decode(
        syncBase64ToBytes(normalized + padding)
    );
}

function createServerSyncSecret() {
    return serverSyncBytesToBase64Url(
        crypto.getRandomValues(
            new Uint8Array(32)
        )
    );
}

async function hashServerSyncSecret(secret) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(secret)
    );

    return [...new Uint8Array(digest)]
        .map((byte) =>
            byte.toString(16).padStart(2, "0")
        )
        .join("");
}

function buildServerSyncLinkCode() {
    if (!isServerSyncConnected()) {
        throw new Error(
            "Connecte d’abord Shuffle+ à un espace serveur."
        );
    }

    const payload = {
        format: SERVER_SYNC_LINK_FORMAT,
        schemaVersion: SERVER_SYNC_SCHEMA_VERSION,
        serverUrl: serverSyncState.serverUrl,
        spaceId: serverSyncState.spaceId,
        rootSecret: serverSyncState.rootSecret,
        createdAt: new Date().toISOString()
    };

    return "SP5." + serverSyncTextToBase64Url(
        JSON.stringify(payload)
    );
}

function parseServerSyncLinkCode(value = "") {
    const input = String(value || "").trim();
    const encoded = input.startsWith("SP5.")
        ? input.slice(4)
        : input;

    try {
        const payload = JSON.parse(
            serverSyncBase64UrlToText(encoded)
        );

        if (
            payload?.format !== SERVER_SYNC_LINK_FORMAT ||
            Number(payload.schemaVersion) !==
                SERVER_SYNC_SCHEMA_VERSION ||
            !normalizeServerSyncUrl(payload.serverUrl) ||
            !payload.spaceId ||
            !payload.rootSecret
        ) {
            throw new Error();
        }

        return {
            serverUrl: normalizeServerSyncUrl(
                payload.serverUrl
            ),
            spaceId: String(payload.spaceId),
            rootSecret: String(payload.rootSecret)
        };
    } catch (error) {
        throw new Error(
            "Code de liaison serveur Shuffle+ invalide."
        );
    }
}

async function serverSyncRequest(
    path,
    {
        method = "GET",
        body = null,
        authenticated = true,
        rootAuthHash = ""
    } = {}
) {
    const baseUrl = normalizeServerSyncUrl(
        serverSyncState.serverUrl
    );

    if (!baseUrl) {
        throw new Error(
            "Adresse du serveur Shuffle+ invalide."
        );
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
        () => controller.abort(),
        SERVER_SYNC_REQUEST_TIMEOUT
    );
    const headers = {
        Accept: "application/json"
    };

    if (body !== null) {
        headers["Content-Type"] = "application/json";
    }

    if (authenticated && serverSyncState.deviceToken) {
        headers.Authorization =
            `Bearer ${serverSyncState.deviceToken}`;
        headers["X-ShufflePlus-Installation"] =
            syncInstallation.id;
    }

    if (rootAuthHash) {
        headers["X-ShufflePlus-Root-Auth"] =
            rootAuthHash;
    }

    try {
        const response = await fetch(
            baseUrl + path,
            {
                method,
                headers,
                body: body === null
                    ? undefined
                    : JSON.stringify(body),
                signal: controller.signal,
                cache: "no-store"
            }
        );

        if (response.status === 204) {
            return {
                response,
                data: null
            };
        }

        let data = null;
        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = text ? { message: text } : null;
        }

        if (!response.ok) {
            const error = new Error(
                data?.message ||
                data?.error ||
                `Erreur serveur ${response.status}.`
            );
            error.status = response.status;
            error.payload = data;
            throw error;
        }

        return {
            response,
            data
        };
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "Le serveur Shuffle+ ne répond pas assez vite."
            );
        }
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

async function createServerSyncSpace(form) {
    if (serverSyncBusy) {
        return;
    }

    const data = new FormData(form);
    const serverUrl = normalizeServerSyncUrl(
        data.get("serverUrl") || ""
    );

    if (!serverUrl) {
        setServerSyncMessage(
            "Utilise une adresse HTTPS valide. HTTP est accepté uniquement en local.",
            "error"
        );
        refreshSyncPreparationPanel();
        return;
    }

    serverSyncBusy = true;
    serverSyncState = normalizeServerSyncState({
        ...serverSyncState,
        serverUrl
    });
    saveServerSyncState();
    setServerSyncMessage(
        "Création de l’espace chiffré…"
    );
    refreshSyncPreparationPanel();

    try {
        const rootSecret = createServerSyncSecret();
        const rootAuthHash =
            await hashServerSyncSecret(rootSecret);
        const { data: response } =
            await serverSyncRequest(
                "/v1/spaces",
                {
                    method: "POST",
                    authenticated: false,
                    body: {
                        rootAuthHash,
                        installation: {
                            ...syncInstallation
                        },
                        appVersion: APP_VERSION
                    }
                }
            );

        serverSyncState = normalizeServerSyncState({
            enabled: true,
            autoSync: true,
            intervalMinutes:
                SERVER_SYNC_DEFAULT_INTERVAL_MINUTES,
            serverUrl,
            spaceId: response.spaceId,
            deviceToken: response.deviceToken,
            rootSecret,
            revision: Number(response.revision || 0),
            connectedAt: Date.now()
        });
        saveServerSyncState();
        startServerSyncWatcher();
        await pushServerSync({
            force: true,
            silent: true
        });
        await refreshServerSyncDevices({
            silent: true
        });
        setServerSyncMessage(
            "Espace serveur créé. Les données sont chiffrées avant l’envoi.",
            "success"
        );
        setStatus(
            "Synchronisation serveur Shuffle+ activée."
        );
    } catch (error) {
        console.error(error);
        serverSyncState = normalizeServerSyncState({
            serverUrl
        });
        saveServerSyncState();
        setServerSyncMessage(
            error.message ||
            "Impossible de créer l’espace serveur.",
            "error"
        );
    } finally {
        serverSyncBusy = false;
        refreshSyncPreparationPanel();
    }
}

async function joinServerSyncSpace(form) {
    if (serverSyncBusy) {
        return;
    }

    const data = new FormData(form);
    let link;

    try {
        link = parseServerSyncLinkCode(
            data.get("linkCode") || ""
        );
    } catch (error) {
        setServerSyncMessage(error.message, "error");
        refreshSyncPreparationPanel();
        return;
    }

    serverSyncBusy = true;
    serverSyncState = normalizeServerSyncState({
        ...serverSyncState,
        serverUrl: link.serverUrl
    });
    saveServerSyncState();
    setServerSyncMessage(
        "Connexion à l’espace distant…"
    );
    refreshSyncPreparationPanel();

    try {
        const rootAuthHash =
            await hashServerSyncSecret(
                link.rootSecret
            );
        const { data: response } =
            await serverSyncRequest(
                `/v1/spaces/${encodeURIComponent(link.spaceId)}/join`,
                {
                    method: "POST",
                    authenticated: false,
                    body: {
                        rootAuthHash,
                        installation: {
                            ...syncInstallation
                        },
                        appVersion: APP_VERSION
                    }
                }
            );

        serverSyncState = normalizeServerSyncState({
            enabled: true,
            autoSync: true,
            intervalMinutes:
                SERVER_SYNC_DEFAULT_INTERVAL_MINUTES,
            serverUrl: link.serverUrl,
            spaceId: link.spaceId,
            deviceToken: response.deviceToken,
            rootSecret: link.rootSecret,
            revision: 0,
            connectedAt: Date.now()
        });
        saveServerSyncState();
        startServerSyncWatcher();
        await pullServerSync({
            force: true,
            silent: true,
            firstJoin: true
        });
        await refreshServerSyncDevices({
            silent: true
        });
        if (!pendingSyncPackage) {
            setServerSyncMessage(
                "Appareil relié. Les données sont déjà synchronisées.",
                "success"
            );
        }
        setStatus(
            "Appareil relié au serveur Shuffle+."
        );
    } catch (error) {
        console.error(error);
        serverSyncState = normalizeServerSyncState({
            serverUrl: link.serverUrl
        });
        saveServerSyncState();
        setServerSyncMessage(
            error.message ||
            "Impossible de rejoindre cet espace.",
            "error"
        );
    } finally {
        serverSyncBusy = false;
        refreshSyncPreparationPanel();
    }
}

async function copyServerSyncLinkCode() {
    try {
        const code = buildServerSyncLinkCode();
        await navigator.clipboard.writeText(code);
        setServerSyncMessage(
            "Code de liaison copié. Il donne accès aux données chiffrées : conserve-le comme un mot de passe.",
            "success"
        );
    } catch (error) {
        if (isServerSyncConnected()) {
            window.prompt(
                "Copie ce code de liaison privé :",
                buildServerSyncLinkCode()
            );
        } else {
            setServerSyncMessage(
                error.message,
                "error"
            );
        }
    }
    refreshSyncPreparationPanel();
}

async function testServerSyncConnection() {
    if (!serverSyncState.serverUrl) {
        setServerSyncMessage(
            "Renseigne d’abord l’adresse du serveur.",
            "error"
        );
        refreshSyncPreparationPanel();
        return;
    }

    try {
        const { data } = await serverSyncRequest(
            "/health",
            {
                authenticated: false
            }
        );
        setServerSyncMessage(
            `Serveur disponible · ${data?.version || "version inconnue"}.`,
            "success"
        );
    } catch (error) {
        setServerSyncMessage(
            error.message ||
            "Serveur inaccessible.",
            "error"
        );
    }
    refreshSyncPreparationPanel();
}

async function pushServerSync({
    force = false,
    silent = false
} = {}) {
    if (!isServerSyncConnected()) {
        if (!silent) {
            setServerSyncMessage(
                "Aucun espace serveur n’est connecté.",
                "error"
            );
            refreshSyncPreparationPanel();
        }
        return false;
    }

    if (serverSyncBusy && !force) {
        return false;
    }

    const previousBusy = serverSyncBusy;
    serverSyncBusy = true;

    try {
        const localPackage = buildSyncPackage();

        if (
            !force &&
            localPackage.fingerprint ===
                serverSyncState.lastSyncedFingerprint
        ) {
            return false;
        }

        if (!silent) {
            setServerSyncMessage(
                "Chiffrement et envoi en cours…"
            );
            refreshSyncPreparationPanel();
        }

        const envelope =
            await encryptSyncPackagePayload(
                localPackage,
                serverSyncState.rootSecret
            );
        const { data: response } =
            await serverSyncRequest(
                `/v1/spaces/${encodeURIComponent(serverSyncState.spaceId)}/state`,
                {
                    method: "PUT",
                    body: {
                        baseRevision:
                            serverSyncState.revision,
                        envelope,
                        fingerprint:
                            localPackage.fingerprint,
                        dataUpdatedAt:
                            localPackage.dataUpdatedAt,
                        sourceInstallation: {
                            ...syncInstallation
                        },
                        appVersion: APP_VERSION
                    }
                }
            );

        serverSyncState = normalizeServerSyncState({
            ...serverSyncState,
            revision: response.revision,
            lastSyncedFingerprint:
                localPackage.fingerprint,
            lastPushAt: Date.now(),
            lastError: ""
        });
        saveServerSyncState();
        addSyncSessionHistory({
            type: "server-push",
            peerId: serverSyncState.spaceId,
            peerLabel: "Serveur Shuffle+",
            status: "success",
            message:
                `Révision ${response.revision} envoyée avec chiffrement de bout en bout.`
        });
        if (!silent) {
            setServerSyncMessage(
                `Données envoyées · révision ${response.revision}.`,
                "success"
            );
            setStatus(
                "Synchronisation serveur terminée."
            );
        }
        return true;
    } catch (error) {
        if (error.status === 409) {
            serverSyncState = normalizeServerSyncState({
                ...serverSyncState,
                revision: Number(
                    error.payload?.revision ||
                    serverSyncState.revision
                )
            });
            saveServerSyncState();
            await pullServerSync({
                force: true,
                silent
            });
            return false;
        }

        console.error(error);
        serverSyncState = normalizeServerSyncState({
            ...serverSyncState,
            lastError: error.message ||
                "Échec de l’envoi"
        });
        saveServerSyncState();
        addSyncSessionHistory({
            type: "server-push",
            peerId: serverSyncState.spaceId,
            peerLabel: "Serveur Shuffle+",
            status: "error",
            message:
                error.message || "Échec de l’envoi serveur."
        });
        if (!silent) {
            setServerSyncMessage(
                error.message ||
                "Impossible d’envoyer les données.",
                "error"
            );
        }
        return false;
    } finally {
        serverSyncBusy = previousBusy;
        if (!silent) {
            refreshSyncPreparationPanel();
        }
    }
}

async function pullServerSync({
    force = false,
    silent = false,
    firstJoin = false
} = {}) {
    if (!isServerSyncConnected()) {
        if (!silent) {
            setServerSyncMessage(
                "Aucun espace serveur n’est connecté.",
                "error"
            );
            refreshSyncPreparationPanel();
        }
        return false;
    }

    const previousBusy = serverSyncBusy;
    serverSyncBusy = true;

    try {
        if (!silent) {
            setServerSyncMessage(
                "Recherche d’une révision distante…"
            );
            refreshSyncPreparationPanel();
        }

        const afterRevision = force
            ? 0
            : serverSyncState.revision;
        const { response, data } =
            await serverSyncRequest(
                `/v1/spaces/${encodeURIComponent(serverSyncState.spaceId)}/state?afterRevision=${encodeURIComponent(afterRevision)}`
            );

        serverSyncState = normalizeServerSyncState({
            ...serverSyncState,
            lastPullAt: Date.now(),
            lastError: ""
        });

        if (response.status === 204 || !data) {
            saveServerSyncState();
            if (!silent) {
                setServerSyncMessage(
                    "Aucune nouvelle révision distante.",
                    "success"
                );
            }
            return false;
        }

        const decrypted =
            await decryptSyncPackagePayload(
                data.envelope,
                serverSyncState.rootSecret
            );
        const remote = validateSyncPackage(
            decrypted
        );
        const local = buildSyncPackage();
        const previousFingerprint =
            serverSyncState.lastSyncedFingerprint;

        serverSyncState = normalizeServerSyncState({
            ...serverSyncState,
            revision: Number(data.revision || 0)
        });
        saveServerSyncState();

        if (remote.fingerprint === local.fingerprint) {
            serverSyncState = normalizeServerSyncState({
                ...serverSyncState,
                lastSyncedFingerprint:
                    remote.fingerprint
            });
            saveServerSyncState();
            if (!silent) {
                setServerSyncMessage(
                    `Déjà synchronisé · révision ${data.revision}.`,
                    "success"
                );
            }
            return true;
        }

        if (
            !firstJoin &&
            previousFingerprint &&
            local.fingerprint === previousFingerprint
        ) {
            saveLastSyncMergeUndo(
                buildBackupPayload(),
                "Serveur Shuffle+",
                { server: "remote" }
            );
            applyValidatedBackupState(
                remote.importedBackup
            );
            serverSyncState = normalizeServerSyncState({
                ...serverSyncState,
                revision: Number(data.revision || 0),
                lastSyncedFingerprint:
                    remote.fingerprint,
                lastPullAt: Date.now()
            });
            saveServerSyncState();
            displayPlaylists(playlistsCache);
            addSyncSessionHistory({
                type: "server-pull",
                peerId: serverSyncState.spaceId,
                peerLabel: "Serveur Shuffle+",
                status: "success",
                message:
                    `Révision ${data.revision} appliquée automatiquement.`
            });
            if (!silent) {
                setServerSyncMessage(
                    `Révision ${data.revision} appliquée automatiquement.`,
                    "success"
                );
            }
            return true;
        }

        if (
            previousFingerprint &&
            remote.fingerprint === previousFingerprint
        ) {
            if (!silent) {
                setServerSyncMessage(
                    "Le serveur est inchangé, les données locales vont être envoyées.",
                    "success"
                );
            }
            await pushServerSync({
                force: true,
                silent
            });
            return true;
        }

        pendingSyncPackage = remote;
        registerSyncPackageSource(remote);
        addSyncSessionHistory({
            type: "server-conflict",
            peerId: serverSyncState.spaceId,
            peerLabel: "Serveur Shuffle+",
            status: "warning",
            message:
                `Conflit à résoudre avec la révision ${data.revision}.`
        });
        setServerSyncMessage(
            "Les deux appareils ont changé les données. Choisis la fusion dans la comparaison ci-dessous.",
            "error"
        );
        setStatus(
            "Conflit de synchronisation serveur à résoudre.",
            "error"
        );
        return true;
    } catch (error) {
        console.error(error);
        serverSyncState = normalizeServerSyncState({
            ...serverSyncState,
            lastError:
                error.message || "Échec de réception"
        });
        saveServerSyncState();
        addSyncSessionHistory({
            type: "server-pull",
            peerId: serverSyncState.spaceId,
            peerLabel: "Serveur Shuffle+",
            status: "error",
            message:
                error.message || "Échec de réception serveur."
        });
        if (!silent) {
            setServerSyncMessage(
                error.message ||
                "Impossible de recevoir les données.",
                "error"
            );
        }
        return false;
    } finally {
        serverSyncBusy = previousBusy;
        if (!silent) {
            refreshSyncPreparationPanel();
        }
    }
}

async function refreshServerSyncDevices({
    silent = false
} = {}) {
    if (!isServerSyncConnected()) {
        serverSyncDevices = [];
        return;
    }

    try {
        const { data } = await serverSyncRequest(
            `/v1/spaces/${encodeURIComponent(serverSyncState.spaceId)}/devices`
        );
        serverSyncDevices = Array.isArray(data?.devices)
            ? data.devices
            : [];
        if (!silent) {
            setServerSyncMessage(
                `${serverSyncDevices.length} appareil${serverSyncDevices.length > 1 ? "s" : ""} autorisé${serverSyncDevices.length > 1 ? "s" : ""}.`,
                "success"
            );
            refreshSyncPreparationPanel();
        }
    } catch (error) {
        if (!silent) {
            setServerSyncMessage(
                error.message ||
                "Impossible de charger les appareils.",
                "error"
            );
            refreshSyncPreparationPanel();
        }
    }
}

async function revokeServerSyncDevice(
    installationId
) {
    const device = serverSyncDevices.find(
        (item) => item.installationId === installationId
    );

    if (!device) {
        return;
    }

    if (installationId === syncInstallation.id) {
        setServerSyncMessage(
            "Utilise Déconnecter cet appareil pour retirer l’installation actuelle.",
            "error"
        );
        refreshSyncPreparationPanel();
        return;
    }

    if (!window.confirm(
        `Révoquer « ${device.label} » ?`
    )) {
        return;
    }

    try {
        await serverSyncRequest(
            `/v1/spaces/${encodeURIComponent(serverSyncState.spaceId)}/devices/${encodeURIComponent(installationId)}`,
            { method: "DELETE" }
        );
        await refreshServerSyncDevices({
            silent: true
        });
        setServerSyncMessage(
            `${device.label} a été révoqué.`,
            "success"
        );
    } catch (error) {
        setServerSyncMessage(
            error.message ||
            "Révocation impossible.",
            "error"
        );
    }
    refreshSyncPreparationPanel();
}

function disconnectServerSync() {
    if (!window.confirm(
        "Déconnecter cet appareil de l’espace serveur ?\n\nLes données locales ne seront pas supprimées."
    )) {
        return;
    }

    stopServerSyncWatcher();
    serverSyncState = normalizeServerSyncState();
    serverSyncDevices = [];
    pendingSyncPackage = null;
    saveServerSyncState();
    setServerSyncMessage(
        "Cet appareil est déconnecté du serveur.",
        "success"
    );
    refreshSyncPreparationPanel();
}

async function deleteServerSyncSpace() {
    if (!isServerSyncConnected()) {
        return;
    }

    const confirmation = window.prompt(
        "Cette action supprime définitivement l’espace distant.\n\nÉcris SUPPRIMER pour confirmer."
    );

    if (confirmation !== "SUPPRIMER") {
        setServerSyncMessage(
            "Suppression annulée."
        );
        refreshSyncPreparationPanel();
        return;
    }

    try {
        const rootAuthHash =
            await hashServerSyncSecret(
                serverSyncState.rootSecret
            );
        await serverSyncRequest(
            `/v1/spaces/${encodeURIComponent(serverSyncState.spaceId)}`,
            {
                method: "DELETE",
                rootAuthHash
            }
        );
        stopServerSyncWatcher();
        serverSyncState = normalizeServerSyncState();
        serverSyncDevices = [];
        saveServerSyncState();
        setServerSyncMessage(
            "Espace distant supprimé.",
            "success"
        );
        refreshSyncPreparationPanel();
    } catch (error) {
        setServerSyncMessage(
            error.message ||
            "Suppression impossible.",
            "error"
        );
        refreshSyncPreparationPanel();
    }
}

function saveServerSyncOptions(form) {
    const data = new FormData(form);
    serverSyncState = normalizeServerSyncState({
        ...serverSyncState,
        autoSync: data.get("autoSync") === "on",
        intervalMinutes: Number(
            data.get("intervalMinutes") ||
            SERVER_SYNC_DEFAULT_INTERVAL_MINUTES
        )
    });
    saveServerSyncState();
    startServerSyncWatcher();
    setServerSyncMessage(
        "Réglages de synchronisation automatique enregistrés.",
        "success"
    );
    refreshSyncPreparationPanel();
}

async function runServerAutoSync(
    reason = "timer"
) {
    if (
        !isServerSyncConnected() ||
        !serverSyncState.autoSync ||
        serverSyncBusy ||
        !navigator.onLine ||
        pendingSyncPackage
    ) {
        return;
    }

    await pullServerSync({
        silent: true
    });

    if (!pendingSyncPackage) {
        const local = buildSyncPackage();
        if (
            local.fingerprint !==
                serverSyncState.lastSyncedFingerprint
        ) {
            await pushServerSync({
                silent: true
            });
        }
    }

    if (reason !== "timer") {
        refreshSyncPreparationPanel();
    }
}

function stopServerSyncWatcher() {
    if (serverSyncTimer) {
        window.clearInterval(
            serverSyncTimer
        );
        serverSyncTimer = 0;
    }
}

function startServerSyncWatcher() {
    stopServerSyncWatcher();

    if (
        !isServerSyncConnected() ||
        !serverSyncState.autoSync
    ) {
        return;
    }

    const delay = Math.max(
        60 * 1000,
        serverSyncState.intervalMinutes *
            60 * 1000
    );

    serverSyncTimer = window.setInterval(
        () => runServerAutoSync("timer"),
        delay
    );
}

function formatServerSyncDate(timestamp) {
    if (!timestamp) {
        return "Jamais";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    ).format(new Date(timestamp));
}

function renderServerSyncPanel() {
    const connected = isServerSyncConnected();
    const message = serverSyncMessage.text
        ? `
            <p class="server-sync-message ${escapeHtml(serverSyncMessage.type)}">
                ${escapeHtml(serverSyncMessage.text)}
            </p>
        `
        : "";

    if (!connected) {
        return `
            <section class="server-sync-panel">
                <div class="server-sync-heading">
                    <div>
                        <span class="sync-eyebrow">v5.0 · Serveur réel</span>
                        <h4>Synchronisation automatique chiffrée</h4>
                        <p>
                            Shuffle+ chiffre le paquet dans ce navigateur.
                            Le serveur ne reçoit qu’une enveloppe illisible.
                        </p>
                    </div>
                    <span class="server-sync-badge is-offline">
                        Non connecté
                    </span>
                </div>

                <form id="serverSyncCreateForm" class="server-sync-form">
                    <label>
                        <span>Adresse du serveur Shuffle+</span>
                        <input
                            name="serverUrl"
                            type="url"
                            placeholder="https://sync.exemple.fr"
                            value="${escapeHtml(serverSyncState.serverUrl)}"
                            required
                        >
                    </label>
                    <div class="server-sync-inline-actions">
                        <button
                            class="sync-primary-button"
                            type="submit"
                            ${serverSyncBusy ? "disabled" : ""}
                        >
                            ☁ Créer mon espace
                        </button>
                        <button
                            id="testServerSyncButton"
                            class="sync-secondary-button"
                            type="button"
                            ${serverSyncBusy ? "disabled" : ""}
                        >
                            Tester le serveur
                        </button>
                    </div>
                </form>

                <form id="serverSyncJoinForm" class="server-sync-form">
                    <label>
                        <span>Code de liaison reçu d’un autre appareil</span>
                        <textarea
                            name="linkCode"
                            rows="3"
                            placeholder="SP5.…"
                            required
                        ></textarea>
                    </label>
                    <button
                        class="sync-secondary-button"
                        type="submit"
                        ${serverSyncBusy ? "disabled" : ""}
                    >
                        Relier cet appareil
                    </button>
                </form>

                ${message}

                <p class="server-sync-security-note">
                    Le code de liaison contient la clé de chiffrement.
                    Ne le partage qu’avec tes propres appareils.
                </p>
            </section>
        `;
    }

    const devices = serverSyncDevices
        .map((device) => `
            <div class="server-sync-device">
                <div>
                    <strong>${escapeHtml(device.label || "Appareil Shuffle+")}</strong>
                    <small>
                        ${device.installationId === syncInstallation.id
                            ? "Cet appareil · "
                            : ""}
                        vu ${escapeHtml(formatServerSyncDate(device.lastSeenAt))}
                    </small>
                </div>
                ${device.installationId !== syncInstallation.id
                    ? `
                        <button
                            class="sync-danger-button"
                            type="button"
                            data-revoke-server-device="${escapeHtml(device.installationId)}"
                        >
                            Révoquer
                        </button>
                    `
                    : ""}
            </div>
        `)
        .join("");

    return `
        <section class="server-sync-panel is-connected">
            <div class="server-sync-heading">
                <div>
                    <span class="sync-eyebrow">v5.0 · Synchronisation active</span>
                    <h4>Serveur Shuffle+</h4>
                    <p>
                        Espace <code>${escapeHtml(serverSyncState.spaceId)}</code>
                        · révision ${serverSyncState.revision}
                    </p>
                </div>
                <span class="server-sync-badge is-online">
                    Chiffré E2E
                </span>
            </div>

            <div class="server-sync-metrics">
                <div>
                    <span>Dernier envoi</span>
                    <strong>${escapeHtml(formatServerSyncDate(serverSyncState.lastPushAt))}</strong>
                </div>
                <div>
                    <span>Dernière réception</span>
                    <strong>${escapeHtml(formatServerSyncDate(serverSyncState.lastPullAt))}</strong>
                </div>
                <div>
                    <span>Serveur</span>
                    <strong>${escapeHtml(serverSyncState.serverUrl)}</strong>
                </div>
            </div>

            <form id="serverSyncOptionsForm" class="server-sync-options-form">
                <label class="server-sync-checkbox">
                    <input
                        name="autoSync"
                        type="checkbox"
                        ${serverSyncState.autoSync ? "checked" : ""}
                    >
                    <span>Synchroniser automatiquement quand l’application est ouverte</span>
                </label>
                <label>
                    <span>Fréquence</span>
                    <select name="intervalMinutes">
                        ${[1, 5, 15, 30, 60].map((value) => `
                            <option
                                value="${value}"
                                ${serverSyncState.intervalMinutes === value
                                    ? "selected"
                                    : ""}
                            >
                                ${value === 1 ? "1 minute" : `${value} minutes`}
                            </option>
                        `).join("")}
                    </select>
                </label>
                <button class="sync-secondary-button" type="submit">
                    Enregistrer
                </button>
            </form>

            <div class="server-sync-inline-actions">
                <button
                    id="pushServerSyncButton"
                    class="sync-primary-button"
                    type="button"
                    ${serverSyncBusy ? "disabled" : ""}
                >
                    ↑ Envoyer maintenant
                </button>
                <button
                    id="pullServerSyncButton"
                    class="sync-secondary-button"
                    type="button"
                    ${serverSyncBusy ? "disabled" : ""}
                >
                    ↓ Recevoir maintenant
                </button>
                <button
                    id="copyServerSyncLinkButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    🔗 Copier le code de liaison
                </button>
                <button
                    id="refreshServerDevicesButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    Actualiser les appareils
                </button>
            </div>

            ${message}

            <details class="server-sync-devices" ${serverSyncDevices.length ? "" : "open"}>
                <summary>
                    Appareils autorisés · ${serverSyncDevices.length}
                </summary>
                <div>
                    ${devices || "Aucun appareil chargé. Clique sur Actualiser."}
                </div>
            </details>

            <div class="server-sync-danger-zone">
                <button
                    id="disconnectServerSyncButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    Déconnecter cet appareil
                </button>
                <button
                    id="deleteServerSyncSpaceButton"
                    class="sync-danger-button"
                    type="button"
                >
                    Supprimer l’espace distant
                </button>
            </div>
        </section>
    `;
}

function renderSyncPreparationPanel() {
    const localPackage = buildSyncPackage();

    return `
        <section
            id="syncPreparationPanel"
            class="sync-preparation-panel"
            aria-label="Préparation à la synchronisation"
        >
            <div class="sync-panel-heading">
                <div>
                    <span class="sync-eyebrow">v5.0 · Serveur & fusion chiffrée</span>
                    <h3>Synchronisation multi-appareils</h3>
                    <p>
                        Synchronise automatiquement tes appareils, tout en gardant la comparaison,
                        la fusion sélective et le chiffrement de bout en bout.
                    </p>
                </div>
                <span class="sync-local-badge">Local + serveur</span>
            </div>

            ${renderServerSyncPanel()}

            <form id="syncPreparationForm" class="sync-settings-form">
                <label>
                    <span>Nom de cette installation</span>
                    <input
                        name="installationLabel"
                        type="text"
                        maxlength="80"
                        value="${escapeHtml(syncInstallation.label)}"
                        required
                    >
                </label>

                <label>
                    <span>Politique de conflit</span>
                    <select name="conflictPolicy">
                        ${[
                            ["manual", "Toujours demander"],
                            ["newest", "Conserver l’export le plus récent"],
                            ["prefer-local", "Préférer cet appareil"],
                            ["prefer-remote", "Préférer le paquet reçu"]
                        ].map(([value, label]) => `
                            <option
                                value="${value}"
                                ${syncSettings.conflictPolicy === value
                                    ? "selected"
                                    : ""}
                            >
                                ${escapeHtml(label)}
                            </option>
                        `).join("")}
                    </select>
                </label>

                <button class="sync-primary-button" type="submit">
                    Enregistrer
                </button>
            </form>

            <div class="sync-installation-id">
                <div>
                    <span>Identifiant local d’installation</span>
                    <code>${escapeHtml(syncInstallation.id)}</code>
                </div>
                <div class="sync-inline-actions">
                    <button
                        id="copySyncInstallationIdButton"
                        class="sync-secondary-button"
                        type="button"
                    >
                        Copier
                    </button>
                    <button
                        id="resetSyncInstallationIdButton"
                        class="sync-secondary-button"
                        type="button"
                    >
                        Régénérer
                    </button>
                </div>
            </div>

            ${renderSyncPairingPanel()}

            ${renderLastSyncMergeUndo()}

            <div class="sync-preview-block">
                <div>
                    <h4>Aperçu synchronisable</h4>
                    <p>
                        Empreinte : <code>${escapeHtml(localPackage.fingerprint)}</code>
                        · ${(localPackage.byteSize / 1024).toFixed(1)} Ko
                    </p>
                </div>
                ${renderSyncSummaryGrid(localPackage.summary)}
            </div>

            <div class="sync-panel-actions">
                <button
                    id="exportSyncPackageButton"
                    class="sync-primary-button"
                    type="button"
                >
                    ⬇ Exporter un paquet
                </button>

                <button
                    id="exportEncryptedSyncPackageButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    🔒 Exporter chiffré
                </button>

                <button
                    id="analyzeSyncPackageButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    🔎 Analyser un paquet
                </button>

                <button
                    id="exportSyncDiagnosticButton"
                    class="sync-secondary-button"
                    type="button"
                >
                    🩺 Exporter le diagnostic
                </button>

                <a
                    class="sync-contract-link"
                    href="./SYNC_API_CONTRACT.md"
                    target="_blank"
                    rel="noopener"
                >
                    Contrat API v5
                </a>

                <input
                    id="syncPackageFileInput"
                    class="backup-file-input"
                    type="file"
                    accept="application/json,.json"
                    aria-label="Choisir un paquet de synchronisation Shuffle+"
                >
            </div>

            ${renderSyncConflictAnalysis()}
        </section>
    `;
}

function refreshSyncPreparationPanel() {
    const panel = document.getElementById(
        "syncPreparationPanel"
    );

    if (panel) {
        panel.outerHTML = renderSyncPreparationPanel();
    }
}

function saveSyncPreparationFromForm(form) {
    const data = new FormData(form);
    syncInstallation = normalizeSyncInstallation({
        ...syncInstallation,
        label: String(
            data.get("installationLabel") || ""
        ),
        updatedAt: Date.now()
    });
    syncSettings = normalizeSyncSettings({
        conflictPolicy: String(
            data.get("conflictPolicy") || "manual"
        )
    });
    saveSyncInstallation();
    saveSyncSettings();
    refreshSyncPreparationPanel();
    setStatus(
        "Préférences de synchronisation enregistrées."
    );
}

async function copySyncInstallationId() {
    try {
        await navigator.clipboard.writeText(
            syncInstallation.id
        );
        setStatus(
            "Identifiant d’installation copié."
        );
    } catch (error) {
        window.prompt(
            "Copie cet identifiant :",
            syncInstallation.id
        );
    }
}

function resetSyncInstallationId() {
    const confirmed = window.confirm(
        "Régénérer l’identifiant de cette installation ?\n\n" +
        "Les futurs paquets considéreront ce navigateur comme un nouvel appareil."
    );

    if (!confirmed) {
        return;
    }

    syncInstallation = normalizeSyncInstallation({
        id: createSyncIdentifier(),
        label: syncInstallation.label,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    saveSyncInstallation();
    pendingSyncPackage = null;
    syncPairedDevices = [];
    syncPairingInvites = [];
    syncSimulationResult = null;
    saveSyncPairedDevices();
    saveSyncPairingInvites();
    refreshSyncPreparationPanel();
    setStatus(
        "Nouvel identifiant d’installation créé."
    );
}

async function applyPendingSyncPackage(action) {
    if (!pendingSyncPackage) {
        setStatus(
            "Analyse d’abord un paquet de synchronisation.",
            "error"
        );
        return;
    }

    if (action === "policy") {
        const recommendation = getSyncRecommendation(
            pendingSyncPackage
        );

        if (recommendation.action === "manual") {
            setStatus(
                "La politique active demande un choix manuel.",
                "error"
            );
            return;
        }

        action = recommendation.action;
    }

    if (action === "local") {
        const source = pendingSyncPackage.sourceInstallation;
        addSyncSessionHistory({
            type: "conflict-local",
            peerId: source?.id || "",
            peerLabel: source?.label || "Appareil distant",
            status: "warning",
            message: "Conflit résolu en conservant les données locales."
        });
        pendingSyncPackage = null;
        refreshSyncPreparationPanel();
        setStatus(
            "Les données de cet appareil sont conservées."
        );
        return;
    }

    if (action !== "remote") {
        return;
    }

    const remoteBackup = pendingSyncPackage.raw.backup;
    const file = new File(
        [JSON.stringify(remoteBackup)],
        "shuffleplus-sync-import.json",
        { type: "application/json" }
    );

    const source = pendingSyncPackage.sourceInstallation;
    await importBackupFile(file);
    addSyncSessionHistory({
        type: "conflict-remote",
        peerId: source?.id || "",
        peerLabel: source?.label || "Appareil distant",
        status: "success",
        message: "Données distantes appliquées sur cet appareil."
    });
    pendingSyncPackage = null;
    refreshSyncPreparationPanel();
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
    if (activeAppMenu === "driving") {
        renderDrivingModePage();
        startDrivingRefreshTimer();
        return;
    }

    document.body.classList.remove(
        "is-driving-mode"
    );
    stopDrivingRefreshTimer();
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
                ${renderMixStudioSection()}
                ${renderSavedMixesSection()}
                ${renderIosCommandsPanel()}
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
                ${activeAppMenu === "quick"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="quick"
            >
                ${renderQuickControlPage()}
            </div>

            <div
                class="app-menu-page
                ${activeAppMenu === "settings"
                    ? "is-active"
                    : ""}"
                data-app-menu-page="settings"
            >
                ${renderUiThemeSettingsPanel()}
                ${renderPwaSettingsPanel()}
                ${renderBackupPanel()}
                ${renderSyncPreparationPanel()}
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
    updateMixStudioFormPreview(
        document.getElementById(
            "mixStudioForm"
        )
    );
}


function getTrackStableKey(track, fallbackIndex = 0) {
    return (
        track?.uri ||
        track?.id ||
        `${track?.name || "track"}-${fallbackIndex}`
    );
}


function normalizeSmartQueueAvoidEntry(entry = {}) {
    const key = typeof entry.key === "string"
        ? entry.key.trim().slice(0, 180)
        : "";
    const label = typeof entry.label === "string"
        ? entry.label.trim().slice(0, 120)
        : "";

    return key && label
        ? { key, label }
        : null;
}

function normalizeSmartQueueAvoidList(values = []) {
    if (!Array.isArray(values)) {
        return [];
    }

    const unique = new Map();

    for (const value of values) {
        const normalized = normalizeSmartQueueAvoidEntry(value);
        if (normalized && !unique.has(normalized.key)) {
            unique.set(normalized.key, normalized);
        }
    }

    return [...unique.values()].slice(0, MAX_SMART_QUEUE_AVOIDS);
}

function normalizeSmartQueueSession(session = {}) {
    return {
        avoidedArtists: normalizeSmartQueueAvoidList(
            session.avoidedArtists
        ),
        avoidedAlbums: normalizeSmartQueueAvoidList(
            session.avoidedAlbums
        )
    };
}

function readSmartQueueSession() {
    try {
        const raw = sessionStorage.getItem(
            SMART_QUEUE_SESSION_KEY
        );

        return normalizeSmartQueueSession(
            raw ? JSON.parse(raw) : {}
        );
    } catch (error) {
        console.warn(
            "Réglages temporaires Smart Queue illisibles :",
            error
        );
        return normalizeSmartQueueSession();
    }
}

function saveSmartQueueSession() {
    try {
        sessionStorage.setItem(
            SMART_QUEUE_SESSION_KEY,
            JSON.stringify(smartQueueSession)
        );
    } catch (error) {
        console.warn(
            "Réglages temporaires Smart Queue non enregistrés :",
            error
        );
    }
}

function cloneSmartQueueSession(
    session = smartQueueSession
) {
    return normalizeSmartQueueSession({
        avoidedArtists: session.avoidedArtists,
        avoidedAlbums: session.avoidedAlbums
    });
}

function getTrackArtistEntries(track) {
    return (track?.artists || [])
        .map((artist) => {
            const label = artist?.name?.trim() || "";
            const key = normalizeSearchText(label);
            return key && label ? { key, label } : null;
        })
        .filter(Boolean);
}

function getTrackAlbumEntry(track) {
    const label = track?.album?.name?.trim() || "";
    const id = track?.album?.id?.trim() || "";
    const normalizedName = normalizeSearchText(label);
    const key = id
        ? `id:${id}`
        : normalizedName
            ? `name:${normalizedName}`
            : "";

    return key && label ? { key, label } : null;
}

function getSmartQueueAvoidedArtistKeys() {
    return new Set(
        smartQueueSession.avoidedArtists.map(
            (entry) => entry.key
        )
    );
}

function getSmartQueueAvoidedAlbumKeys() {
    return new Set(
        smartQueueSession.avoidedAlbums.map(
            (entry) => entry.key
        )
    );
}

function isTrackTemporarilyAvoided(track) {
    const artistKeys = getSmartQueueAvoidedArtistKeys();
    const albumKeys = getSmartQueueAvoidedAlbumKeys();

    if (
        getTrackArtistEntries(track).some(
            (entry) => artistKeys.has(entry.key)
        )
    ) {
        return true;
    }

    const album = getTrackAlbumEntry(track);
    return Boolean(album && albumKeys.has(album.key));
}

function tracksShareArtist(first, second) {
    const firstKeys = new Set(
        getTrackArtistEntries(first).map(
            (entry) => entry.key
        )
    );

    return getTrackArtistEntries(second).some(
        (entry) => firstKeys.has(entry.key)
    );
}

function tracksShareAlbum(first, second) {
    const firstAlbum = getTrackAlbumEntry(first);
    const secondAlbum = getTrackAlbumEntry(second);

    return Boolean(
        firstAlbum &&
        secondAlbum &&
        firstAlbum.key === secondAlbum.key
    );
}

function captureSmartQueueSnapshot(label = "Modification") {
    smartQueueUndoSnapshot = {
        label,
        tracks: [...selectedTracks],
        cursor: playbackQueueCursor,
        session: cloneSmartQueueSession()
    };
}

function refreshSmartQueueView(message = "") {
    saveCurrentPlaybackQueueState();
    renderTrackList();
    renderShuffleStats(
        analyzeShuffleOrder(
            selectedTracks,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
    );
    updatePlaybackQueueUI();

    if (message) {
        setStatus(message);
    }
}

function undoLastSmartQueueAction() {
    if (!smartQueueUndoSnapshot) {
        setStatus(
            "Aucune modification Smart Queue à annuler.",
            "error"
        );
        return;
    }

    const snapshot = smartQueueUndoSnapshot;
    selectedTracks = [...snapshot.tracks];
    playbackQueueCursor = Math.min(
        Math.max(0, snapshot.cursor),
        selectedTracks.length
    );
    smartQueueSession = cloneSmartQueueSession(
        snapshot.session
    );
    smartQueueUndoSnapshot = null;
    saveSmartQueueSession();
    refreshSmartQueueView(
        `${snapshot.label} annulée.`
    );
}

function getSmartQueueCandidatePool() {
    const selectedUris = new Set(
        selectedTracks
            .map((track) => track?.uri)
            .filter(Boolean)
    );
    const seen = new Set();
    const pool = [];

    for (const track of [
        ...sourceTracks,
        ...originalGeneratedOrder
    ]) {
        const uri = track?.uri || "";

        if (
            !uri ||
            seen.has(uri) ||
            selectedUris.has(uri) ||
            isTrackTemporarilyAvoided(track) ||
            getTrackExclusionReason(
                track,
                currentExclusionRules
            )
        ) {
            continue;
        }

        seen.add(uri);
        pool.push(track);
    }

    return pool;
}

function scoreSmartQueueCandidate(
    candidate,
    targetTrack,
    index
) {
    const previous = selectedTracks[index - 1] || null;
    const next = selectedTracks[index + 1] || null;
    let score = 100;

    if (tracksShareArtist(candidate, targetTrack)) {
        score -= 70;
    }
    if (tracksShareAlbum(candidate, targetTrack)) {
        score -= 50;
    }
    if (previous && tracksShareArtist(candidate, previous)) {
        score -= 85;
    }
    if (next && tracksShareArtist(candidate, next)) {
        score -= 70;
    }
    if (previous && tracksShareAlbum(candidate, previous)) {
        score -= 55;
    }
    if (next && tracksShareAlbum(candidate, next)) {
        score -= 45;
    }

    const targetDuration = Number(
        targetTrack?.duration_ms || 0
    );
    const candidateDuration = Number(
        candidate?.duration_ms || 0
    );

    if (targetDuration && candidateDuration) {
        score -= Math.min(
            25,
            Math.abs(
                targetDuration - candidateDuration
            ) / 30000
        );
    }

    score += Math.min(
        25,
        getTrackPriorityMatches(
            candidate,
            currentPriorityRules
        ).length * 9
    );
    score += getMusicFeedbackScore(candidate);

    return score + Math.random() * 3;
}

function findSmartQueueReplacement(index) {
    const targetTrack = selectedTracks[index];

    if (!targetTrack) {
        return null;
    }

    return getSmartQueueCandidatePool()
        .map((candidate) => ({
            candidate,
            score: scoreSmartQueueCandidate(
                candidate,
                targetTrack,
                index
            )
        }))
        .sort(
            (first, second) =>
                second.score - first.score
        )[0]?.candidate || null;
}

function replaceSmartQueueTrackAt(index) {
    if (
        index < playbackQueueCursor ||
        index >= selectedTracks.length
    ) {
        setStatus(
            "Les morceaux déjà envoyés à Spotify sont verrouillés.",
            "error"
        );
        return;
    }

    const currentTrack = selectedTracks[index];
    const replacement = findSmartQueueReplacement(index);

    if (!replacement) {
        setStatus(
            "Aucun remplacement compatible n’est disponible dans les sources chargées.",
            "error"
        );
        return;
    }

    captureSmartQueueSnapshot("Remplacement intelligent");
    selectedTracks[index] = replacement;
    markQueueChanged({ preserveCursor: true });
    refreshSmartQueueView(
        `« ${currentTrack?.name || "Morceau"} » remplacé par « ${replacement.name || "Morceau"} ».`
    );
}

function addSmartQueueAvoidEntry(type, entry) {
    const normalized = normalizeSmartQueueAvoidEntry(entry);

    if (!normalized) {
        return false;
    }

    const property = type === "album"
        ? "avoidedAlbums"
        : "avoidedArtists";
    const values = smartQueueSession[property];

    if (values.some((item) => item.key === normalized.key)) {
        return false;
    }

    smartQueueSession = normalizeSmartQueueSession({
        ...smartQueueSession,
        [property]: [normalized, ...values]
    });
    saveSmartQueueSession();
    return true;
}

function rebuildSmartQueueRemaining(
    targetRemainingCount
) {
    const prefix = selectedTracks.slice(
        0,
        playbackQueueCursor
    );
    const keptRemaining = selectedTracks
        .slice(playbackQueueCursor)
        .filter(
            (track) =>
                !isTrackTemporarilyAvoided(track)
        );
    const missing = Math.max(
        0,
        targetRemainingCount - keptRemaining.length
    );
    const replacements = smartShuffleTracks(
        getSmartQueueCandidatePool(),
        getShuffleEngineOptions(
            currentShuffleSettings
        )
    ).slice(0, missing);
    const rebuilt = smartShuffleTracks(
        [...keptRemaining, ...replacements],
        getShuffleEngineOptions(
            currentShuffleSettings
        )
    ).slice(0, targetRemainingCount);

    selectedTracks = [
        ...prefix,
        ...rebuilt
    ];

    return {
        removedCount:
            targetRemainingCount - keptRemaining.length,
        replacementCount: replacements.length
    };
}

function avoidSmartQueueArtistAt(index) {
    const track = selectedTracks[index];
    const artist = getTrackArtistEntries(track)[0];

    if (!artist) {
        setStatus(
            "Artiste indisponible pour ce morceau.",
            "error"
        );
        return;
    }

    const confirmed = window.confirm(
        `Éviter temporairement ${artist.label} dans le reste de cette file ?`
    );

    if (!confirmed) {
        return;
    }

    captureSmartQueueSnapshot("Évitement temporaire");
    const added = addSmartQueueAvoidEntry(
        "artist",
        artist
    );

    if (!added) {
        smartQueueUndoSnapshot = null;
        setStatus(
            `${artist.label} est déjà évité dans cette session.`
        );
        return;
    }

    const targetCount = Math.max(
        0,
        selectedTracks.length - playbackQueueCursor
    );
    const result = rebuildSmartQueueRemaining(
        targetCount
    );
    markQueueChanged({ preserveCursor: true });
    refreshSmartQueueView(
        `${artist.label} évité temporairement · ${result.removedCount} morceau${result.removedCount > 1 ? "x" : ""} retiré${result.removedCount > 1 ? "s" : ""}, ${result.replacementCount} remplacé${result.replacementCount > 1 ? "s" : ""}.`
    );
}

function avoidSmartQueueAlbumAt(index) {
    const track = selectedTracks[index];
    const album = getTrackAlbumEntry(track);

    if (!album) {
        setStatus(
            "Album indisponible pour ce morceau.",
            "error"
        );
        return;
    }

    const confirmed = window.confirm(
        `Éviter temporairement l’album « ${album.label} » dans le reste de cette file ?`
    );

    if (!confirmed) {
        return;
    }

    captureSmartQueueSnapshot("Évitement temporaire");
    const added = addSmartQueueAvoidEntry(
        "album",
        album
    );

    if (!added) {
        smartQueueUndoSnapshot = null;
        setStatus(
            `L’album « ${album.label} » est déjà évité dans cette session.`
        );
        return;
    }

    const targetCount = Math.max(
        0,
        selectedTracks.length - playbackQueueCursor
    );
    const result = rebuildSmartQueueRemaining(
        targetCount
    );
    markQueueChanged({ preserveCursor: true });
    refreshSmartQueueView(
        `Album « ${album.label} » évité temporairement · ${result.removedCount} morceau${result.removedCount > 1 ? "x" : ""} retiré${result.removedCount > 1 ? "s" : ""}.`
    );
}

function reshuffleSmartQueueRemaining() {
    const remaining = selectedTracks.slice(
        playbackQueueCursor
    );

    if (remaining.length < 2) {
        setStatus(
            "Il n’y a pas assez de morceaux restants à remélanger.",
            "error"
        );
        return;
    }

    captureSmartQueueSnapshot("Remélange de la suite");
    const prefix = selectedTracks.slice(
        0,
        playbackQueueCursor
    );
    const eligibleRemaining = remaining.filter(
        (track) => !isTrackTemporarilyAvoided(track)
    );

    selectedTracks = [
        ...prefix,
        ...smartShuffleTracks(
            eligibleRemaining,
            getShuffleEngineOptions(
                currentShuffleSettings
            )
        )
    ];
    markQueueChanged({ preserveCursor: true });
    refreshSmartQueueView(
        `${eligibleRemaining.length} morceau${eligibleRemaining.length > 1 ? "x" : ""} restant${eligibleRemaining.length > 1 ? "s" : ""} remélangé${eligibleRemaining.length > 1 ? "s" : ""}, sans toucher à la partie déjà envoyée.`
    );
}

function clearSmartQueueAvoids() {
    const count =
        smartQueueSession.avoidedArtists.length +
        smartQueueSession.avoidedAlbums.length;

    if (!count) {
        setStatus(
            "Aucun artiste ou album n’est évité temporairement."
        );
        return;
    }

    captureSmartQueueSnapshot("Réinitialisation des évitements");
    smartQueueSession = normalizeSmartQueueSession();
    saveSmartQueueSession();
    renderSmartQueuePanel();
    setStatus(
        "Les évitements temporaires ont été effacés. L’ordre actuel est conservé."
    );
}

function renderSmartQueuePanel() {
    const panel = document.getElementById(
        "smartQueuePanel"
    );

    if (!panel) {
        return;
    }

    const total = selectedTracks.length;
    const cursor = Math.min(
        playbackQueueCursor,
        total
    );
    const remaining = selectedTracks.slice(cursor);
    const preview = remaining.slice(
        0,
        SMART_QUEUE_PREVIEW_COUNT
    );
    const avoids = [
        ...smartQueueSession.avoidedArtists.map(
            (entry) => ({ ...entry, icon: "👤" })
        ),
        ...smartQueueSession.avoidedAlbums.map(
            (entry) => ({ ...entry, icon: "💿" })
        )
    ];

    panel.innerHTML = `
        <div class="smart-queue-heading">
            <div>
                <span class="smart-queue-kicker">
                    ⚡ Smart Queue 4.2
                </span>
                <h3>Gérer uniquement la suite</h3>
                <p>
                    ${cursor} morceau${cursor > 1 ? "x" : ""}
                    déjà envoyé${cursor > 1 ? "s" : ""} ·
                    ${remaining.length} restant${remaining.length > 1 ? "s" : ""}
                </p>
            </div>

            <span class="smart-queue-lock-badge">
                🔒 partie envoyée verrouillée
            </span>
        </div>

        <div class="smart-queue-actions">
            <button
                id="replaceNextSmartQueueButton"
                type="button"
                ${remaining.length ? "" : "disabled"}
            >
                ↻ Remplacer le prochain
            </button>

            <button
                id="reshuffleSmartQueueButton"
                type="button"
                ${remaining.length > 1 ? "" : "disabled"}
            >
                🔀 Remélanger la suite
            </button>

            <button
                id="undoSmartQueueButton"
                type="button"
                ${smartQueueUndoSnapshot ? "" : "disabled"}
            >
                ↶ Annuler la dernière action
            </button>
        </div>

        <div class="smart-queue-preview">
            <strong>Prochains morceaux</strong>
            <ol>
                ${preview.length
                    ? preview.map((track, offset) => `
                        <li>
                            <span>${cursor + offset + 1}</span>
                            <div>
                                <strong>
                                    ${escapeHtml(track?.name || "Morceau")}
                                </strong>
                                <small>
                                    ${escapeHtml(
                                        (track?.artists || [])
                                            .map((artist) => artist?.name)
                                            .filter(Boolean)
                                            .join(", ") || "Artiste inconnu"
                                    )}
                                </small>
                            </div>
                            <button
                                type="button"
                                data-smart-queue-replace-index="${cursor + offset}"
                                title="Remplacer ce morceau"
                                aria-label="Remplacer ${escapeHtml(track?.name || "ce morceau")}" 
                            >
                                ↻
                            </button>
                        </li>
                    `).join("")
                    : `
                        <li class="smart-queue-empty">
                            Aucun morceau restant dans la file.
                        </li>
                    `}
            </ol>
        </div>

        <div class="smart-queue-avoids">
            <div>
                <strong>Évitements temporaires</strong>
                <small>
                    Valables jusqu’à la fermeture de cette session.
                </small>
            </div>

            <div class="smart-queue-chips">
                ${avoids.length
                    ? avoids.map((entry) => `
                        <span>
                            ${entry.icon}
                            ${escapeHtml(entry.label)}
                        </span>
                    `).join("")
                    : "<em>Aucun</em>"}
            </div>

            <button
                id="clearSmartQueueAvoidsButton"
                type="button"
                ${avoids.length ? "" : "disabled"}
            >
                Effacer
            </button>
        </div>
    `;
}

function createTrackRow(track, index) {
    const queueLocked = index < playbackQueueCursor;
    const feedbackRecord =
        getMusicFeedbackRecord(track);
    const feedbackAction =
        getActiveMusicFeedbackAction(
            feedbackRecord
        );
    const feedbackExpiry =
        getMusicFeedbackExpiryLabel(
            feedbackRecord
        );
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
            class="track-row ${queueLocked ? "is-queue-sent" : ""} ${feedbackAction !== "neutral" ? `has-music-feedback feedback-${feedbackAction}` : ""}"
            draggable="${queueLocked ? "false" : "true"}"
            data-track-index="${index}"
            data-track-key="${trackKey}"
            data-queue-locked="${queueLocked ? "true" : "false"}"
        >
            <span
                class="track-drag-handle"
                title="${queueLocked ? "Déjà envoyé à Spotify" : "Faire glisser pour déplacer"}"
                aria-hidden="true"
            >
                ${queueLocked ? "🔒" : "⋮⋮"}
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

                ${feedbackAction !== "neutral"
                    ? `
                        <span class="track-feedback-badge feedback-${feedbackAction}">
                            ${getMusicFeedbackIcon(feedbackAction)}
                            ${getMusicFeedbackLabel(feedbackAction)}
                            ${feedbackExpiry
                                ? ` · jusqu’au ${escapeHtml(feedbackExpiry)}`
                                : ""}
                        </span>
                    `
                    : ""}
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
                    ${index <= playbackQueueCursor ? "disabled" : ""}
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
                    ${queueLocked || index === selectedTracks.length - 1 ? "disabled" : ""}
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

                <details class="track-smart-menu">
                    <summary
                        title="Actions Smart Queue"
                        aria-label="Actions Smart Queue pour ${trackName}"
                    >
                        ⚡
                    </summary>
                    <div>
                        <span class="track-smart-menu-label">
                            Ton feedback
                        </span>
                        <button
                            type="button"
                            class="track-feedback-button ${feedbackAction === "like" ? "is-active" : ""}"
                            data-music-feedback-action="like"
                            data-track-index="${index}"
                        >
                            💚 J’aime
                        </button>
                        <button
                            type="button"
                            class="track-feedback-button ${feedbackAction === "not-now" ? "is-active" : ""}"
                            data-music-feedback-action="not-now"
                            data-track-index="${index}"
                        >
                            ⏳ Pas maintenant
                        </button>
                        <button
                            type="button"
                            class="track-feedback-button ${feedbackAction === "repetitive" ? "is-active" : ""}"
                            data-music-feedback-action="repetitive"
                            data-track-index="${index}"
                        >
                            🔁 Trop répétitif
                        </button>
                        ${feedbackAction !== "neutral"
                            ? `
                                <button
                                    type="button"
                                    class="track-feedback-button is-neutral"
                                    data-music-feedback-action="neutral"
                                    data-track-index="${index}"
                                >
                                    ○ Retirer le feedback
                                </button>
                            `
                            : ""}
                        <span class="track-smart-menu-label">
                            Smart Queue
                        </span>
                        <button
                            type="button"
                            data-track-action="replace"
                            data-track-index="${index}"
                            ${queueLocked ? "disabled" : ""}
                        >
                            ↻ Remplacer
                        </button>
                        <button
                            type="button"
                            data-track-action="avoid-artist"
                            data-track-index="${index}"
                        >
                            👤 Éviter l’artiste
                        </button>
                        <button
                            type="button"
                            data-track-action="avoid-album"
                            data-track-index="${index}"
                        >
                            💿 Éviter l’album
                        </button>
                    </div>
                </details>

                <button
                    class="track-exclude-button"
                    type="button"
                    data-track-action="exclude"
                    data-track-index="${index}"
                    title="Exclure définitivement ce morceau"
                    aria-label="Exclure ${trackName}"
                    ${queueLocked ? "disabled" : ""}
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
                    ${queueLocked ? "disabled" : ""}
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

    renderSmartQueuePanel();
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

    if (
        fromIndex < playbackQueueCursor ||
        toIndex < playbackQueueCursor
    ) {
        setStatus(
            "La partie déjà envoyée à Spotify est verrouillée.",
            "error"
        );
        return;
    }

    captureSmartQueueSnapshot("Déplacement");
    const [movedTrack] = selectedTracks.splice(
        fromIndex,
        1
    );

    selectedTracks.splice(toIndex, 0, movedTrack);
    markQueueChanged({ preserveCursor: true });
    refreshSmartQueueView(
        `« ${movedTrack?.name || "Morceau"} » déplacé dans la suite de la file.`
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
    removeTrackAt(index, { captureUndo: false });
    smartQueueUndoSnapshot = null;
    renderSmartQueuePanel();
    setStatus(
        `« ${track.name || "Morceau"} » ajouté aux exclusions.`
    );
}

function removeTrackAt(
    index,
    { captureUndo = true } = {}
) {
    if (
        index < 0 ||
        index >= selectedTracks.length
    ) {
        return;
    }

    if (index < playbackQueueCursor) {
        setStatus(
            "Ce morceau a déjà été envoyé à Spotify et ne peut plus être retiré de cette file.",
            "error"
        );
        return;
    }

    if (captureUndo) {
        captureSmartQueueSnapshot("Suppression");
    }
    const [removedTrack] = selectedTracks.splice(index, 1);
    markQueueChanged({ preserveCursor: true });

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

    captureSmartQueueSnapshot("Restauration de l’ordre");
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

                <section
                    id="smartQueuePanel"
                    class="smart-queue-panel"
                    aria-label="Smart Queue"
                ></section>

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
    updatePlaybackQueueUI();
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

    if (document.getElementById("trackList")) {
        renderTrackList();
    } else {
        renderSmartQueuePanel();
    }
}

function markQueueChanged({ preserveCursor = false } = {}) {
    if (preserveCursor) {
        playbackQueueCursor = Math.min(
            playbackQueueCursor,
            selectedTracks.length
        );
        saveCurrentPlaybackQueueState();
    } else {
        playbackQueueCursor = 0;
        clearCurrentPlaybackQueueState();
    }

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
                        ],
                        __shufflePlusSourceKeys: [
                            ...new Set([
                                ...(track?.__shufflePlusSourceKeys || []),
                                source.key
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
            name:
                pendingMixStudioDisplayName ||
                "Mix Shuffle+",
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

        sourceTracks = pendingMixStudioRuntime?.enabled
            ? buildMixStudioWeightedTrackPool(
                filteredTracks,
                pendingMixStudioRuntime
            )
            : filteredTracks;
        selectedTracks = smartShuffleTracks(
            sourceTracks,
            getShuffleEngineOptions(currentShuffleSettings)
        );

        if (pendingMixStudioRuntime?.enabled) {
            selectedTracks =
                limitTracksToMixStudioDuration(
                    selectedTracks,
                    pendingMixStudioRuntime.durationMinutes
                );
        } else {
            selectedTracks = limitTracksToAdaptiveTarget(
                selectedTracks,
                currentAdaptiveSettings
            );
        }
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

        if (
            !generatedSavedMix?.studioSettings?.preview
        ) {
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
        }

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

        pendingMixStudioRuntime = null;
        pendingMixStudioDisplayName = "";
    } catch (error) {
        console.error(error);
        pendingMixStudioRuntime = null;
        pendingMixStudioDisplayName = "";
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
    applyDrivingViewFromUrl();

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
        startServerSyncWatcher();

        if (isServerSyncConnected()) {
            window.setTimeout(
                () => runServerAutoSync("startup"),
                1200
            );
            window.setTimeout(
                () => refreshServerSyncDevices({ silent: true }),
                1800
            );
        }

        if (activeAppMenu === "driving") {
            await refreshDrivingPlayback({
                silent: true
            });
            await requestDrivingWakeLock();
        } else if (activeAppMenu === "quick") {
            await refreshQuickControlPlayback({
                silent: true
            });
        }

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
    stopServerSyncWatcher();

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
        const uiAccentButton =
            event.target.closest(
                "[data-ui-accent]"
            );

        if (uiAccentButton) {
            updateUiThemeAccent(
                uiAccentButton.dataset.uiAccent ||
                ""
            );
            return;
        }

        const quickContextButton =
            event.target.closest(
                "[data-launch-quick-context]"
            );

        if (quickContextButton) {
            try {
                await runQuickControlAction(
                    "quick-context",
                    {
                        contextId:
                            quickContextButton.dataset
                                .launchQuickContext || "",
                        source: "quick-context-card"
                    }
                );
            } catch (error) {
                // Message déjà affiché.
            }
            return;
        }

        const copyQuickContextButton =
            event.target.closest(
                "[data-copy-quick-context-url]"
            );

        if (copyQuickContextButton) {
            await copyQuickContextUrl(
                copyQuickContextButton.dataset
                    .copyQuickContextUrl || ""
            );
            return;
        }

        if (
            event.target.closest(
                "#dismissQuickExternalResultButton"
            )
        ) {
            saveQuickExternalResult(null);
            renderQuickControlPage();
            return;
        }

        if (
            event.target.closest(
                "#resetQuickContextsButton"
            )
        ) {
            resetQuickContexts();
            return;
        }

        const quickActionButton =
            event.target.closest(
                "[data-quick-action]"
            );

        if (quickActionButton) {
            try {
                await runQuickControlAction(
                    quickActionButton.dataset
                        .quickAction || ""
                );
            } catch (error) {
                // Message déjà affiché dans l’interface rapide.
            }
            return;
        }

        const copyQuickUrlButton =
            event.target.closest(
                "[data-copy-quick-url]"
            );

        if (copyQuickUrlButton) {
            await copyQuickControlUrl(
                copyQuickUrlButton.dataset
                    .copyQuickUrl || ""
            );
            return;
        }

        if (
            event.target.closest(
                "#quickRefreshButton"
            )
        ) {
            await refreshQuickControlPlayback();
            return;
        }

        if (
            event.target.closest(
                "#quickVoiceButton"
            )
        ) {
            startQuickVoiceRecognition();
            return;
        }

        if (
            event.target.closest(
                "#drivingAdaptiveButton"
            )
        ) {
            await launchDrivingAdaptiveDj();
            return;
        }

        if (
            event.target.closest(
                "#drivingPlayPauseButton"
            )
        ) {
            await toggleDrivingPlayback();
            return;
        }

        if (
            event.target.closest(
                "#drivingNextButton"
            )
        ) {
            await skipDrivingTrack();
            return;
        }

        if (
            event.target.closest(
                "#drivingRefreshButton"
            )
        ) {
            await refreshDrivingPlayback();
            return;
        }

        if (
            event.target.closest(
                "#exitDrivingModeButton"
            )
        ) {
            await exitDrivingMode();
            return;
        }

        const drivingFeedbackButton =
            event.target.closest(
                "[data-driving-feedback]"
            );

        if (drivingFeedbackButton) {
            applyDrivingFeedback(
                drivingFeedbackButton.dataset
                    .drivingFeedback ||
                "neutral"
            );
            return;
        }

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

        if (
            event.target.closest(
                "#replaceNextSmartQueueButton"
            )
        ) {
            replaceSmartQueueTrackAt(
                playbackQueueCursor
            );
            return;
        }

        const smartQueuePreviewReplace =
            event.target.closest(
                "[data-smart-queue-replace-index]"
            );

        if (smartQueuePreviewReplace) {
            replaceSmartQueueTrackAt(
                Number(
                    smartQueuePreviewReplace.dataset
                        .smartQueueReplaceIndex
                )
            );
            return;
        }

        if (
            event.target.closest(
                "#reshuffleSmartQueueButton"
            )
        ) {
            reshuffleSmartQueueRemaining();
            return;
        }

        if (
            event.target.closest(
                "#undoSmartQueueButton"
            )
        ) {
            undoLastSmartQueueAction();
            return;
        }

        if (
            event.target.closest(
                "#clearSmartQueueAvoidsButton"
            )
        ) {
            clearSmartQueueAvoids();
            return;
        }

        const appMenuButton =
            event.target.closest(
                "[data-app-menu]"
            );

        if (appMenuButton) {
            const requestedMenu =
                normalizeActiveAppMenu(
                    appMenuButton.dataset.appMenu
                );

            if (requestedMenu === "driving") {
                await enterDrivingMode();
                return;
            }

            stopDrivingRefreshTimer();
            await releaseDrivingWakeLock();
            document.body.classList.remove(
                "is-driving-mode"
            );
            activeAppMenu = requestedMenu;
            saveActiveAppMenu();
            displayPlaylists(
                playlistsCache
            );

            window.requestAnimationFrame(
                () => {
                    revealActiveAppMenuButton(
                        "smooth"
                    );
                }
            );

            if (requestedMenu === "quick") {
                await refreshQuickControlPlayback({
                    silent: true
                });
            }
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


        const runAdaptiveSceneButton =
            event.target.closest(
                "[data-run-adaptive-scene]"
            );

        if (runAdaptiveSceneButton) {
            try {
                await runAdaptiveDjScene(
                    runAdaptiveSceneButton.dataset
                        .runAdaptiveScene || ""
                );
            } catch (error) {
                console.error(error);
                setStatus(
                    error.message ||
                    "La scène Adaptive DJ n’a pas pu démarrer.",
                    "error"
                );
            }
            return;
        }

        const copyAdaptiveSceneUrlButton =
            event.target.closest(
                "[data-copy-adaptive-scene-url]"
            );

        if (copyAdaptiveSceneUrlButton) {
            await copyAdaptiveDjSceneUrl(
                copyAdaptiveSceneUrlButton.dataset
                    .copyAdaptiveSceneUrl || ""
            );
            return;
        }

        const activateAdaptiveSceneButton =
            event.target.closest(
                "[data-activate-adaptive-scene]"
            );

        if (activateAdaptiveSceneButton) {
            const form = event.target.closest(
                "#adaptiveDjSceneStudioForm"
            );
            const activeInput = form?.elements?.activeSceneId;
            const sceneId = activateAdaptiveSceneButton.dataset
                .activateAdaptiveScene || "";

            if (activeInput) {
                activeInput.value = sceneId;
            }

            setActiveAdaptiveDjScene(sceneId);
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

        if (
            event.target.closest(
                "#testServerSyncButton"
            )
        ) {
            await testServerSyncConnection();
            return;
        }

        if (
            event.target.closest(
                "#pushServerSyncButton"
            )
        ) {
            await pushServerSync({ force: true });
            return;
        }

        if (
            event.target.closest(
                "#pullServerSyncButton"
            )
        ) {
            await pullServerSync({ force: true });
            return;
        }

        if (
            event.target.closest(
                "#copyServerSyncLinkButton"
            )
        ) {
            await copyServerSyncLinkCode();
            return;
        }

        if (
            event.target.closest(
                "#refreshServerDevicesButton"
            )
        ) {
            await refreshServerSyncDevices();
            return;
        }

        if (
            event.target.closest(
                "#disconnectServerSyncButton"
            )
        ) {
            disconnectServerSync();
            return;
        }

        if (
            event.target.closest(
                "#deleteServerSyncSpaceButton"
            )
        ) {
            await deleteServerSyncSpace();
            return;
        }

        const revokeServerDeviceButton =
            event.target.closest(
                "[data-revoke-server-device]"
            );
        if (revokeServerDeviceButton) {
            await revokeServerSyncDevice(
                revokeServerDeviceButton.dataset
                    .revokeServerDevice || ""
            );
            return;
        }

        if (
            event.target.closest(
                "#createSyncPairingInvitationButton"
            )
        ) {
            createSyncPairingInvitation();
            return;
        }

        if (
            event.target.closest(
                "#copySyncPairingInvitationButton"
            )
        ) {
            await copySyncPairingInvitation();
            return;
        }

        if (
            event.target.closest(
                "#exportSyncPairingInvitationButton"
            )
        ) {
            exportSyncPairingInvitation();
            return;
        }

        if (
            event.target.closest(
                "#importSyncPairingFileButton"
            )
        ) {
            document.getElementById(
                "syncPairingFileInput"
            )?.click();
            return;
        }

        const simulateSyncPeerButton =
            event.target.closest(
                "[data-simulate-sync-peer]"
            );
        if (simulateSyncPeerButton) {
            simulateSyncWithPeer(
                simulateSyncPeerButton.dataset
                    .simulateSyncPeer || ""
            );
            return;
        }

        const exportSyncPeerButton =
            event.target.closest(
                "[data-export-sync-peer]"
            );
        if (exportSyncPeerButton) {
            exportSyncPackageForPeer(
                exportSyncPeerButton.dataset
                    .exportSyncPeer || ""
            );
            return;
        }

        const removeSyncPeerButton =
            event.target.closest(
                "[data-remove-sync-peer]"
            );
        if (removeSyncPeerButton) {
            removeSyncPairedDevice(
                removeSyncPeerButton.dataset
                    .removeSyncPeer || ""
            );
            return;
        }

        const syncMergePresetButton =
            event.target.closest(
                "[data-sync-merge-preset]"
            );

        if (syncMergePresetButton) {
            setSelectiveSyncMergePreset(
                syncMergePresetButton.dataset
                    .syncMergePreset || "merge"
            );
            return;
        }

        if (
            event.target.closest(
                "#undoLastSyncMergeButton"
            )
        ) {
            await undoLastSelectiveSyncMerge();
            return;
        }

        if (
            event.target.closest(
                "#exportSyncPackageButton"
            )
        ) {
            downloadSyncPackage();
            return;
        }

        if (
            event.target.closest(
                "#exportEncryptedSyncPackageButton"
            )
        ) {
            await downloadEncryptedSyncPackage();
            return;
        }

        if (
            event.target.closest(
                "#analyzeSyncPackageButton"
            )
        ) {
            document.getElementById(
                "syncPackageFileInput"
            )?.click();
            return;
        }

        if (
            event.target.closest(
                "#exportSyncDiagnosticButton"
            )
        ) {
            await downloadSyncDiagnostic();
            return;
        }

        if (
            event.target.closest(
                "#copySyncInstallationIdButton"
            )
        ) {
            await copySyncInstallationId();
            return;
        }

        if (
            event.target.closest(
                "#resetSyncInstallationIdButton"
            )
        ) {
            resetSyncInstallationId();
            return;
        }

        if (
            event.target.closest(
                "#keepLocalSyncButton"
            )
        ) {
            await applyPendingSyncPackage("local");
            return;
        }

        if (
            event.target.closest(
                "#applyRemoteSyncButton"
            )
        ) {
            await applyPendingSyncPackage("remote");
            return;
        }

        if (
            event.target.closest(
                "#applySyncPolicyButton"
            )
        ) {
            await applyPendingSyncPackage("policy");
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

        const musicFeedbackButton =
            event.target.closest(
                "[data-music-feedback-action]"
            );

        if (musicFeedbackButton) {
            applyMusicFeedbackAt(
                Number(
                    musicFeedbackButton.dataset
                        .trackIndex
                ),
                musicFeedbackButton.dataset
                    .musicFeedbackAction ||
                    "neutral"
            );
            return;
        }

        if (
            event.target.closest(
                "#clearMusicFeedbackButton"
            )
        ) {
            clearMusicFeedback();
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
            } else if (action === "replace") {
                replaceSmartQueueTrackAt(index);
            } else if (action === "avoid-artist") {
                avoidSmartQueueArtistAt(index);
            } else if (action === "avoid-album") {
                avoidSmartQueueAlbumAt(index);
            }

            return;
        }

        const resetGeneratedOrderButton =
            event.target.closest("#resetGeneratedOrderButton");

        if (resetGeneratedOrderButton) {
            resetGeneratedOrder();
            return;
        }

        const mixStudioTemplateButton =
            event.target.closest(
                "[data-mix-studio-template-action]"
            );

        if (mixStudioTemplateButton) {
            const form = mixStudioTemplateButton.closest(
                "#mixStudioForm"
            );
            const action =
                mixStudioTemplateButton.dataset
                    .mixStudioTemplateAction;

            if (action === "save") {
                saveMixStudioTemplateFromForm(form);
            } else if (action === "delete") {
                deleteMixStudioTemplate(
                    form?.elements?.templateId?.value || "",
                    form
                );
            }
            return;
        }

        const mixStudioCompareButton =
            event.target.closest(
                "#mixStudioCompareVariants"
            );

        if (mixStudioCompareButton) {
            renderMixStudioVariantComparison(
                mixStudioCompareButton.closest(
                    "#mixStudioForm"
                )
            );
            return;
        }

        const mixStudioVariantButton =
            event.target.closest(
                "[data-mix-studio-variant-action]"
            );

        if (mixStudioVariantButton) {
            const form = mixStudioVariantButton.closest(
                "#mixStudioForm"
            );
            const applied =
                applyMixStudioVariantToForm(
                    mixStudioVariantButton.dataset
                        .mixStudioVariantIndex,
                    form
                );

            if (
                applied &&
                mixStudioVariantButton.dataset
                    .mixStudioVariantAction === "preview"
            ) {
                await submitMixStudioForm(
                    form,
                    "preview"
                );
            }
            return;
        }

        const mixStudioClearButton =
            event.target.closest(
                "#mixStudioClearSources"
            );

        if (mixStudioClearButton) {
            const form = mixStudioClearButton.closest(
                "#mixStudioForm"
            );
            form?.querySelectorAll(
                ".mix-studio-source-checkbox"
            ).forEach((checkbox) => {
                checkbox.checked = false;
            });
            selectedSourceKeys.clear();
            updateMixStudioFormPreview(form);
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
            "uiThemeContrastInput"
        ) {
            uiThemeSettings =
                normalizeUiThemeSettings({
                    ...uiThemeSettings,
                    highContrast:
                        event.target.checked
                });

            saveUiThemeSettings();
            applyUiThemeSettings();

            showToast(
                event.target.checked
                    ? "◐ Contraste renforcé activé."
                    : "◑ Contraste standard restauré.",
                "success"
            );
            return;
        }

        if (
            event.target.id ===
            "uiThemeMotionInput"
        ) {
            uiThemeSettings =
                normalizeUiThemeSettings({
                    ...uiThemeSettings,
                    motionEnabled:
                        event.target.checked
                });

            saveUiThemeSettings();
            applyUiThemeSettings();

            showToast(
                event.target.checked
                    ? "✨ Animations fluides activées."
                    : "🌙 Animations réduites.",
                "success"
            );
            return;
        }

        if (
            event.target.closest(
                "#mixStudioForm"
            )
        ) {
            if (
                event.target.id ===
                "mixStudioTemplateSelect" &&
                event.target.value
            ) {
                applyMixStudioTemplateToForm(
                    event.target.value,
                    event.target.closest(
                        "#mixStudioForm"
                    )
                );
                return;
            }

            if (
                event.target.matches(
                    ".mix-studio-source-checkbox"
                )
            ) {
                const checked = [
                    ...event.target
                        .closest("#mixStudioForm")
                        .querySelectorAll(
                            ".mix-studio-source-checkbox:checked"
                        )
                ];

                if (checked.length > MAX_MIX_SOURCES) {
                    event.target.checked = false;
                    setStatus(
                        `Mix Studio accepte jusqu’à ${MAX_MIX_SOURCES} sources.`,
                        "error"
                    );
                }
            }

            updateMixStudioFormPreview(
                event.target.closest(
                    "#mixStudioForm"
                )
            );
        }

        if (
            event.target.id ===
            "drivingWakeLockInput"
        ) {
            drivingModeSettings =
                normalizeDrivingModeSettings({
                    ...drivingModeSettings,
                    keepScreenAwake:
                        event.target.checked
                });
            saveDrivingModeSettings();

            if (event.target.checked) {
                requestDrivingWakeLock();
            } else {
                releaseDrivingWakeLock();
            }

            renderDrivingModePage();
            return;
        }

        if (
            event.target.id ===
            "drivingAutoRefreshInput"
        ) {
            drivingModeSettings =
                normalizeDrivingModeSettings({
                    ...drivingModeSettings,
                    autoRefresh:
                        event.target.checked
                });
            saveDrivingModeSettings();
            startDrivingRefreshTimer();
            renderDrivingModePage();
            return;
        }

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
            event.target.id === "mixStudioForm"
        ) {
            event.preventDefault();
            const action =
                event.submitter?.value === "save"
                    ? "save"
                    : "preview";
            await submitMixStudioForm(
                event.target,
                action
            );
            return;
        }

        if (
            event.target.id === "serverSyncCreateForm"
        ) {
            event.preventDefault();
            await createServerSyncSpace(
                event.target
            );
            return;
        }

        if (
            event.target.id === "serverSyncJoinForm"
        ) {
            event.preventDefault();
            await joinServerSyncSpace(
                event.target
            );
            return;
        }

        if (
            event.target.id === "serverSyncOptionsForm"
        ) {
            event.preventDefault();
            saveServerSyncOptions(
                event.target
            );
            return;
        }

        if (
            event.target.id === "syncPairingTokenForm"
        ) {
            event.preventDefault();
            const data = new FormData(event.target);
            acceptSyncPairingToken(
                String(data.get("pairingToken") || "")
            );
            return;
        }

        if (
            event.target.id === "selectiveSyncMergeForm"
        ) {
            event.preventDefault();
            await applySelectiveSyncPackage(
                event.target
            );
            return;
        }

        if (
            event.target.id === "syncPreparationForm"
        ) {
            event.preventDefault();
            saveSyncPreparationFromForm(
                event.target
            );
            return;
        }

        if (
            event.target.id === "quickContextsForm"
        ) {
            event.preventDefault();
            saveQuickContextsFromForm(
                event.target
            );
            return;
        }

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
            event.target.id === "adaptiveDjSceneStudioForm"
        ) {
            event.preventDefault();
            saveAdaptiveDjScenesFromForm(
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
            event.target.id ===
            "quickShortcutContextSelect"
        ) {
            quickShortcutWizardContextId =
                event.target.value;
            renderQuickControlPage();
            return;
        }

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

        if (
            event.target.id === "syncPairingFileInput"
        ) {
            const [file] = event.target.files || [];
            await analyzeSyncPairingFile(file);
            event.target.value = "";
            return;
        }

        if (
            event.target.id === "syncPackageFileInput"
        ) {
            const [file] = event.target.files || [];
            await analyzeSyncPackageFile(file);
            event.target.value = "";
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
            event.target.closest(
                "#mixStudioForm"
            )
        ) {
            updateMixStudioFormPreview(
                event.target.closest(
                    "#mixStudioForm"
                )
            );
        }

        if (
            event.target.id ===
                "syncDiffSearchInput"
        ) {
            filterSyncDetailedDiff(
                event.target.value
            );
            return;
        }

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

        if (
            !row ||
            row.dataset.queueLocked === "true"
        ) {
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

        if (
            !row ||
            draggedTrackIndex < 0 ||
            Number(row.dataset.trackIndex) <
                playbackQueueCursor
        ) {
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

        if (
            !row ||
            draggedTrackIndex < 0 ||
            Number(row.dataset.trackIndex) <
                playbackQueueCursor
        ) {
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

document.addEventListener(
    "visibilitychange",
    () => {
        if (
            activeAppMenu === "driving" &&
            document.visibilityState === "visible"
        ) {
            requestDrivingWakeLock();
            refreshDrivingPlayback({
                silent: true
            });
        }
    }
);

initializePwa();

window.addEventListener(
    "online",
    () => runServerAutoSync("online")
);

document.addEventListener(
    "visibilitychange",
    () => {
        if (document.visibilityState === "visible") {
            runServerAutoSync("visible");
        }
    }
);

initializeApp();
