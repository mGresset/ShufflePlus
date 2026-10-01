export const SHORTCUT_LAUNCH_GUARD_WINDOW_MS = 8000;

function cleanText(value, maxLength = 160) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

export function getShortcutProfileLastRun(
    history = [],
    commandId = ""
) {
    if (!Array.isArray(history) || !commandId) {
        return null;
    }

    return history.find(
        (entry) => entry?.commandId === commandId
    ) || null;
}

export function getShortcutProfileReadiness(
    command = {},
    {
        playlistIds = [],
        mixIds = [],
        preferredDevice = null
    } = {}
) {
    const type = command.commandType === "smartmix"
        ? "smartmix"
        : command.commandType === "adaptive"
            ? "adaptive"
            : "fixed";
    const playlistSet = new Set(playlistIds);
    const mixSet = new Set(mixIds);
    const sourceReady = type === "fixed"
        ? Boolean(command.playlistId) && playlistSet.has(command.playlistId)
        : type === "smartmix"
            ? Boolean(command.mixId) && mixSet.has(command.mixId)
            : true;
    const preferredRequired = command.deviceMode === "preferred";
    const deviceReady = preferredRequired
        ? Boolean(preferredDevice?.id || preferredDevice?.name)
        : command.deviceMode === "named"
            ? Boolean(cleanText(command.deviceName, 120))
            : true;
    const checks = [
        {
            id: "source",
            label: type === "fixed" ? "Playlist" : type === "smartmix" ? "Mix" : "Adaptive DJ",
            ready: sourceReady,
            value: sourceReady ? "configuré" : "à configurer"
        },
        {
            id: "device",
            label: "Appareil",
            ready: deviceReady,
            value: deviceReady ? "prêt" : "iPhone préféré absent"
        },
        {
            id: "autoplay",
            label: "Lecture automatique",
            ready: command.autoplay !== false,
            value: command.autoplay === false ? "désactivée" : "activée"
        }
    ];

    return {
        ready: checks.every((check) => check.ready),
        checks,
        missing: checks.filter((check) => !check.ready).map((check) => check.id)
    };
}

export function buildShortcutProfileDiagnostic(
    command = {},
    history = [],
    context = {}
) {
    const readiness = getShortcutProfileReadiness(command, context);
    const lastRun = getShortcutProfileLastRun(history, command.id);
    const lastStatus = lastRun?.status === "error"
        ? "error"
        : lastRun?.status === "success"
            ? "success"
            : "never";

    return {
        readiness,
        lastRun,
        status: !readiness.ready
            ? "warning"
            : lastStatus,
        label: !readiness.ready
            ? "À configurer"
            : lastStatus === "success"
                ? "Opérationnel"
                : lastStatus === "error"
                    ? "Dernier essai en erreur"
                    : "Prêt à tester"
    };
}

export function claimShortcutLaunch(
    storage,
    storageKey,
    commandId,
    {
        now = Date.now(),
        windowMs = SHORTCUT_LAUNCH_GUARD_WINDOW_MS
    } = {}
) {
    const normalizedId = cleanText(commandId, 120) || "principal";
    const normalizedWindow = Math.max(1000, Number(windowMs) || SHORTCUT_LAUNCH_GUARD_WINDOW_MS);
    let previous = null;

    try {
        previous = JSON.parse(storage?.getItem?.(storageKey) || "null");
    } catch {
        previous = null;
    }

    const previousAt = Number(previous?.createdAt || 0);
    const duplicate = previous?.commandId === normalizedId &&
        now - previousAt >= 0 &&
        now - previousAt < normalizedWindow;

    if (duplicate) {
        return {
            accepted: false,
            retryAfterMs: Math.max(0, normalizedWindow - (now - previousAt))
        };
    }

    try {
        storage?.setItem?.(
            storageKey,
            JSON.stringify({
                commandId: normalizedId,
                createdAt: now
            })
        );
    } catch {
        // La protection reste optionnelle si le stockage est bloqué.
    }

    return {
        accepted: true,
        retryAfterMs: 0
    };
}

export function normalizeShortcutHistorySteps(steps = []) {
    if (!Array.isArray(steps)) {
        return [];
    }

    return steps
        .filter((step) => step && typeof step === "object")
        .map((step) => ({
            id: cleanText(step.id, 60),
            label: cleanText(step.label, 120) || "Étape",
            status: ["success", "error", "pending", "waiting", "skipped"].includes(step.status)
                ? step.status
                : "success",
            message: cleanText(step.message, 240),
            ...(Math.max(0, Number(step.attempt) || 0) > 0
                ? { attempt: Math.max(0, Number(step.attempt) || 0) }
                : {}),
            ...(Math.max(0, Number(step.updatedAt) || 0) > 0
                ? { updatedAt: Math.max(0, Number(step.updatedAt) || 0) }
                : {})
        }))
        .slice(0, 12);
}

export function formatShortcutRunDuration(durationMs = 0) {
    const value = Math.max(0, Number(durationMs) || 0);
    if (value < 1000) {
        return `${Math.round(value)} ms`;
    }
    return `${(value / 1000).toFixed(value < 10000 ? 1 : 0).replace(".", ",")} s`;
}


export function normalizeShortcutProfileOrder(order = [], commands = []) {
    const availableIds = (Array.isArray(commands) ? commands : [])
        .map((command) => cleanText(command?.id, 120))
        .filter(Boolean);
    const availableSet = new Set(availableIds);
    const result = [];
    const seen = new Set();

    for (const id of Array.isArray(order) ? order : []) {
        const cleanId = cleanText(id, 120);
        if (!cleanId || !availableSet.has(cleanId) || seen.has(cleanId)) continue;
        seen.add(cleanId);
        result.push(cleanId);
    }

    for (const id of availableIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(id);
    }

    return result;
}

export function sortShortcutProfiles(commands = [], {
    order = [],
    pinnedIds = []
} = {}) {
    const list = Array.isArray(commands) ? [...commands] : [];
    const normalizedOrder = normalizeShortcutProfileOrder(order, list);
    const orderMap = new Map(normalizedOrder.map((id, index) => [id, index]));
    const pinnedOrder = (Array.isArray(pinnedIds) ? pinnedIds : [])
        .map((id) => cleanText(id, 120))
        .filter(Boolean);
    const pinnedMap = new Map(pinnedOrder.map((id, index) => [id, index]));

    return list.sort((left, right) => {
        const leftPinned = pinnedMap.has(left?.id);
        const rightPinned = pinnedMap.has(right?.id);
        if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
        if (leftPinned && rightPinned) {
            const delta = pinnedMap.get(left.id) - pinnedMap.get(right.id);
            if (delta) return delta;
        }
        return (orderMap.get(left?.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderMap.get(right?.id) ?? Number.MAX_SAFE_INTEGER);
    });
}

export function moveShortcutProfileOrder(order = [], commands = [], commandId = "", direction = "up") {
    const normalized = normalizeShortcutProfileOrder(order, commands);
    const id = cleanText(commandId, 120);
    const index = normalized.indexOf(id);
    const delta = direction === "down" ? 1 : -1;
    const target = index + delta;

    if (index < 0 || target < 0 || target >= normalized.length) {
        return normalized;
    }

    const next = [...normalized];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

export function buildShortcutProfilePreview(command = {}, {
    sourceLabel = "Source non définie",
    deviceLabel = "Appareil Spotify actif"
} = {}) {
    return {
        sourceLabel: cleanText(sourceLabel, 180) || "Source non définie",
        deviceLabel: cleanText(deviceLabel, 180) || "Appareil Spotify actif",
        shuffleLabel: command.shuffle === false ? "Ordre normal" : "Aléatoire activé",
        startLabel: command.startFromBeginning ? "Depuis le début" : "Départ intelligent",
        drivingLabel: command.openDrivingMode ? "Mode conduite après lancement" : "Mode conduite désactivé",
        dynamicLyricsLabel: command.openDynamicLyrics
            ? "Dynamic Lyrics proposé manuellement après lancement"
            : "Dynamic Lyrics non demandé"
    };
}
