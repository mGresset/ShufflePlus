export const GUIDED_SETUP_KEY =
    "shuffleplus_guided_setup_v1";

export const GUIDED_SETUP_SCHEMA_VERSION = 1;

export const DEFAULT_GUIDED_SETUP_STATE = Object.freeze({
    schemaVersion: GUIDED_SETUP_SCHEMA_VERSION,
    primaryCommandId: "",
    shortcutConfirmed: false,
    installationConfirmed: false,
    lastLaunchTestAt: 0,
    completedAt: 0,
    dismissedAt: 0,
    updatedAt: 0
});

function cleanText(value = "", maxLength = 120) {
    return String(value || "")
        .trim()
        .slice(0, maxLength);
}

function safeGet(storage, key) {
    try {
        return storage?.getItem?.(key) ?? null;
    } catch {
        return null;
    }
}

function safeSet(storage, key, value) {
    try {
        storage?.setItem?.(key, value);
        return true;
    } catch {
        return false;
    }
}

export function normalizeGuidedSetupState(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};

    return {
        schemaVersion: GUIDED_SETUP_SCHEMA_VERSION,
        primaryCommandId: cleanText(source.primaryCommandId),
        shortcutConfirmed: source.shortcutConfirmed === true,
        installationConfirmed: source.installationConfirmed === true,
        lastLaunchTestAt: Math.max(0, Number(source.lastLaunchTestAt || 0)),
        completedAt: Math.max(0, Number(source.completedAt || 0)),
        dismissedAt: Math.max(0, Number(source.dismissedAt || 0)),
        updatedAt: Math.max(0, Number(source.updatedAt || 0))
    };
}

export function readGuidedSetupState(
    storage = globalThis.localStorage,
    key = GUIDED_SETUP_KEY
) {
    const raw = safeGet(storage, key);

    if (!raw) {
        return normalizeGuidedSetupState();
    }

    try {
        return normalizeGuidedSetupState(JSON.parse(raw));
    } catch {
        return normalizeGuidedSetupState();
    }
}

export function saveGuidedSetupState(
    storage = globalThis.localStorage,
    value = {},
    key = GUIDED_SETUP_KEY
) {
    const normalized = normalizeGuidedSetupState({
        ...value,
        updatedAt: Date.now()
    });

    return {
        state: normalized,
        saved: safeSet(storage, key, JSON.stringify(normalized))
    };
}

export function resolvePrimaryCommand(
    commands = [],
    state = DEFAULT_GUIDED_SETUP_STATE
) {
    const normalizedState = normalizeGuidedSetupState(state);
    const list = Array.isArray(commands) ? commands : [];

    return (
        list.find((command) =>
            command?.id === normalizedState.primaryCommandId
        ) ||
        list.find((command) => command?.id === "principal") ||
        list[0] ||
        null
    );
}

export function buildGuidedSetupChecklist({
    spotifyConfigured = false,
    spotifyConnected = false,
    commands = [],
    preferredDevice = null,
    successfulLaunches = [],
    state = DEFAULT_GUIDED_SETUP_STATE,
    standalone = false
} = {}) {
    const normalizedState = normalizeGuidedSetupState(state);
    const primaryCommand = resolvePrimaryCommand(
        commands,
        normalizedState
    );
    const launchHistory = Array.isArray(successfulLaunches)
        ? successfulLaunches
        : [];
    const launchTested = Boolean(
        normalizedState.lastLaunchTestAt ||
        launchHistory.some((entry) =>
            entry?.status === "success" &&
            (!primaryCommand || entry.commandId === primaryCommand.id)
        )
    );
    const playlistReady = Boolean(
        primaryCommand &&
        (
            primaryCommand.playlistId ||
            primaryCommand.mixId ||
            primaryCommand.commandType === "adaptive"
        )
    );
    const deviceReady = Boolean(
        preferredDevice?.id ||
        primaryCommand?.deviceMode === "active" ||
        primaryCommand?.deviceMode === "first"
    );
    const installationReady = Boolean(
        standalone || normalizedState.installationConfirmed
    );

    const steps = [
        {
            id: "spotify-app",
            label: "Application Spotify configurée",
            ready: Boolean(spotifyConfigured),
            menuId: "settings"
        },
        {
            id: "spotify-login",
            label: "Compte Spotify connecté",
            ready: Boolean(spotifyConnected),
            menuId: "settings"
        },
        {
            id: "primary-playlist",
            label: "Playlist principale choisie",
            ready: playlistReady,
            menuId: "mixes"
        },
        {
            id: "iphone-device",
            label: "Appareil de lecture prêt",
            ready: deviceReady,
            menuId: "mixes"
        },
        {
            id: "launch-test",
            label: "Lancement testé",
            ready: launchTested,
            menuId: "dashboard"
        },
        {
            id: "ios-shortcut",
            label: "Raccourci iPhone créé",
            ready: normalizedState.shortcutConfirmed,
            menuId: "quick"
        },
        {
            id: "pwa-install",
            label: "Shuffle+ installé",
            ready: installationReady,
            menuId: "settings"
        }
    ];
    const readyCount = steps.filter((step) => step.ready).length;

    return {
        steps,
        readyCount,
        totalCount: steps.length,
        progress: Math.round(readyCount / steps.length * 100),
        complete: readyCount === steps.length,
        primaryCommand,
        launchTested,
        installationReady
    };
}

export function updateGuidedSetupState(
    state = DEFAULT_GUIDED_SETUP_STATE,
    patch = {}
) {
    return normalizeGuidedSetupState({
        ...normalizeGuidedSetupState(state),
        ...patch,
        updatedAt: Date.now()
    });
}
