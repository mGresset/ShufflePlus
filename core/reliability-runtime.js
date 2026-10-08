import { normalizeReliabilityEvents } from "./reliability-center.js";

function safeStorage(storage) {
    return storage && typeof storage.getItem === "function"
        ? storage
        : null;
}

export function readReliabilityEventJournal(
    storage,
    key,
    { onError = null } = {}
) {
    const target = safeStorage(storage);
    if (!target || !key) return [];

    try {
        const parsed = JSON.parse(target.getItem(key) || "[]");
        return normalizeReliabilityEvents(parsed);
    } catch (error) {
        onError?.(error);
        return [];
    }
}

export function writeReliabilityEventJournal(
    storage,
    key,
    events,
    { onError = null } = {}
) {
    const target = safeStorage(storage);
    if (!target || !key) return false;

    try {
        target.setItem(
            key,
            JSON.stringify(normalizeReliabilityEvents(events))
        );
        return true;
    } catch (error) {
        onError?.(error);
        return false;
    }
}

export function buildReliabilityQueueState(
    drivingQueueState = {},
    now = Date.now()
) {
    const queue = Array.isArray(drivingQueueState?.queue)
        ? drivingQueueState.queue
        : [];
    const updatedAt = Math.max(
        0,
        Number(drivingQueueState?.updatedAt) || 0
    );

    return {
        count: queue.length,
        updatedAt,
        ageMs: updatedAt
            ? Math.max(0, Number(now) - updatedAt)
            : Number.POSITIVE_INFINITY
    };
}

export function selectReliabilityActiveDevice({
    spotifyConnectDiagnostic = null,
    activePlaybackDevice = null,
    lastWorkingSpotifyDevice = null,
    preferredSpotifyDevice = null
} = {}) {
    const candidate =
        spotifyConnectDiagnostic?.resolvedDevice ||
        activePlaybackDevice ||
        lastWorkingSpotifyDevice ||
        preferredSpotifyDevice ||
        {};

    return {
        name: String(candidate?.name || ""),
        type: String(candidate?.type || ""),
        id: String(candidate?.id || "")
    };
}

export function buildReliabilityDiagnosticText({
    appVersion = "",
    online = true,
    spotifyConnected = false,
    serverStatus = "",
    pwaControlled = false,
    spotifyDiagnosticText = "",
    services = [],
    events = []
} = {}) {
    const lines = [
        `Shuffle+ ${String(appVersion || "")} — diagnostic de fiabilité`,
        `Réseau : ${online ? "en ligne" : "hors connexion"}`,
        `Spotify : ${spotifyConnected ? "connecté" : "déconnecté"}`,
        `Railway : ${String(serverStatus || "non vérifié")}`,
        `PWA : ${pwaControlled ? "active" : "non contrôlée"}`,
        "",
        String(spotifyDiagnosticText || ""),
        "",
        "Services :",
        ...(Array.isArray(services) ? services : []).map((service) =>
            `${service?.level === "healthy" ? "✅" : service?.level === "critical" ? "❌" : "⚠️"} ${String(service?.label || "Service")} — ${String(service?.value || "—")}`
        ),
        "",
        "Derniers événements :",
        ...normalizeReliabilityEvents(events).slice(0, 12).map((event) =>
            `• ${event.label}${event.detail ? ` — ${event.detail}` : ""}`
        ),
        "",
        "Confidentialité : aucun token OAuth, ResultToken, requestId, device_id, titre ou playlist n’est inclus."
    ];

    return lines.join("\n");
}
