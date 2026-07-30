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
            status: ["success", "error", "pending", "skipped"].includes(step.status)
                ? step.status
                : "success",
            message: cleanText(step.message, 240)
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
