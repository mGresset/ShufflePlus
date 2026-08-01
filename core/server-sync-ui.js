export const SIMPLE_SYNC_MERGE_CHOICES = Object.freeze({
    library: "merge",
    profiles: "merge",
    automation: "merge",
    feedback: "merge",
    learning: "merge",
    history: "merge"
});

export function getServerSyncLastActivity(state = {}) {
    return Math.max(
        0,
        Number(state.lastPushAt || 0),
        Number(state.lastPullAt || 0),
        Number(state.connectedAt || 0)
    );
}

export function getSimpleServerSyncStatus({
    connected = false,
    busy = false,
    pendingConflict = false,
    lastError = ""
} = {}) {
    if (busy) {
        return {
            key: "syncing",
            label: "Synchronisation en cours",
            tone: "working"
        };
    }

    if (pendingConflict) {
        return {
            key: "choice-required",
            label: "Choix nécessaire",
            tone: "warning"
        };
    }

    if (lastError) {
        return {
            key: "error",
            label: "Attention requise",
            tone: "error"
        };
    }

    if (connected) {
        return {
            key: "connected",
            label: "Connecté",
            tone: "success"
        };
    }

    return {
        key: "not-connected",
        label: "Non connecté",
        tone: "neutral"
    };
}

export function normalizeServerSetupStep(value) {
    const step = Number(value || 1);
    return [1, 2].includes(step) ? step : 1;
}

export function buildSimpleSyncSummary({
    before = {},
    after = {},
    merged = false
} = {}) {
    const difference = (key) =>
        Math.max(0, Number(after[key] || 0) - Number(before[key] || 0));

    const entries = [
        ["mix", difference("mixes")],
        ["profil", difference("profiles")],
        ["raccourci", difference("iosCommands")],
        ["favori", difference("favorites")]
    ].filter(([, count]) => count > 0);

    if (!entries.length) {
        return merged
            ? "Les deux versions ont été combinées. Aucune donnée n’a été supprimée."
            : "Tes données sont à jour sur cet appareil et sur le serveur.";
    }

    const details = entries
        .map(([label, count]) =>
            `${count} ${label}${count > 1 ? "s" : ""}`
        )
        .join(" · ");

    return merged
        ? `Fusion terminée · ${details}.`
        : `Synchronisation terminée · ${details}.`;
}
