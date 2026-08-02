const DEVICE_PATTERNS = {
    drive: [
        /car\b/i,
        /auto/i,
        /voiture/i,
        /vehicle/i,
        /android auto/i,
        /carplay/i,
        /renault/i,
        /peugeot/i,
        /citro[eë]n/i,
        /tesla/i
    ],
    headphones: [
        /airpods?/i,
        /casque/i,
        /headphones?/i,
        /earphones?/i,
        /earbuds?/i,
        /buds?\b/i,
        /beats/i,
        /sony wh/i,
        /bose qc/i
    ],
    home: [
        /sonos/i,
        /enceinte/i,
        /speaker/i,
        /homepod/i,
        /google home/i,
        /nest/i,
        /alexa/i,
        /echo\b/i,
        /t[eé]l[eé]vision/i,
        /smart ?tv/i,
        /chromecast/i
    ]
};

export const DEFAULT_CONTEXTUAL_PROFILE_STATE = Object.freeze({
    enabled: true,
    dismissedUntil: 0,
    lastAcceptedContextId: "",
    lastSuggestedContextId: "",
    updatedAt: 0
});

export function normalizeContextualProfileState(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    return {
        enabled: source.enabled !== false,
        dismissedUntil: Math.max(0, Number(source.dismissedUntil) || 0),
        lastAcceptedContextId:
            typeof source.lastAcceptedContextId === "string"
                ? source.lastAcceptedContextId.slice(0, 40)
                : "",
        lastSuggestedContextId:
            typeof source.lastSuggestedContextId === "string"
                ? source.lastSuggestedContextId.slice(0, 40)
                : "",
        updatedAt: Math.max(0, Number(source.updatedAt) || 0)
    };
}

export function classifySpotifyDevice(deviceName = "") {
    const name = String(deviceName || "").trim();
    if (!name) {
        return { id: "unknown", label: "Appareil non identifié", score: 0 };
    }

    for (const [id, patterns] of Object.entries(DEVICE_PATTERNS)) {
        if (patterns.some((pattern) => pattern.test(name))) {
            return {
                id,
                label:
                    id === "drive"
                        ? "appareil de voiture"
                        : id === "headphones"
                            ? "écouteurs ou casque"
                            : "enceinte de la maison",
                score: 100
            };
        }
    }

    return { id: "unknown", label: name, score: 0 };
}

export function getContextualTimeBand(date = new Date()) {
    const safeDate = date instanceof Date && !Number.isNaN(date.getTime())
        ? date
        : new Date();
    const hour = safeDate.getHours();
    const day = safeDate.getDay();
    const weekend = day === 0 || day === 6;

    if (hour >= 5 && hour < 10) {
        return { id: "morning", label: "ce matin", score: 72 };
    }
    if (!weekend && hour >= 9 && hour < 18) {
        return { id: "work", label: "pendant la journée de travail", score: 58 };
    }
    if ((day === 5 || day === 6) && (hour >= 20 || hour < 2)) {
        return { id: "party", label: "pour la soirée", score: 74 };
    }
    if (hour >= 22 || hour < 5) {
        return { id: "night", label: "à cette heure tardive", score: 66 };
    }
    if (!weekend && hour >= 17 && hour < 21) {
        return { id: "sport", label: "en fin de journée", score: 48 };
    }

    return { id: "home", label: "pour une écoute à la maison", score: 38 };
}

function getContextMap(contexts = []) {
    return new Map(
        (Array.isArray(contexts) ? contexts : [])
            .filter((context) => context && typeof context === "object" && context.id)
            .map((context) => [String(context.id), context])
    );
}

function buildCandidate({
    id,
    score,
    reason,
    source,
    contextMap,
    lastAcceptedContextId
}) {
    const context = contextMap.get(id);
    if (!context) return null;

    const acceptedBonus = lastAcceptedContextId === id ? 8 : 0;
    return {
        contextId: id,
        name: context.name || "Profil contextuel",
        icon: context.icon || "🎧",
        ready: Boolean(context.mixId),
        mixId: context.mixId || "",
        profileId: context.profileId || "",
        autoplay: context.autoplay !== false,
        score: score + acceptedBonus,
        reason,
        source
    };
}

export function buildContextualProfileSuggestion({
    contexts = [],
    deviceName = "",
    now = new Date(),
    state = DEFAULT_CONTEXTUAL_PROFILE_STATE,
    minimumScore = 50
} = {}) {
    const normalizedState = normalizeContextualProfileState(state);
    const timestamp = now instanceof Date && !Number.isNaN(now.getTime())
        ? now.getTime()
        : Date.now();

    if (!normalizedState.enabled || normalizedState.dismissedUntil > timestamp) {
        return null;
    }

    const contextMap = getContextMap(contexts);
    if (!contextMap.size) return null;

    const device = classifySpotifyDevice(deviceName);
    const timeBand = getContextualTimeBand(now);
    const candidates = [];

    if (device.id !== "unknown") {
        const candidate = buildCandidate({
            id: device.id,
            score: device.score,
            reason: `Shuffle+ a reconnu un ${device.label}.`,
            source: "device",
            contextMap,
            lastAcceptedContextId: normalizedState.lastAcceptedContextId
        });
        if (candidate) candidates.push(candidate);
    }

    const timeCandidate = buildCandidate({
        id: timeBand.id,
        score: timeBand.score,
        reason: `Ce profil correspond ${timeBand.label}.`,
        source: "time",
        contextMap,
        lastAcceptedContextId: normalizedState.lastAcceptedContextId
    });
    if (timeCandidate) candidates.push(timeCandidate);

    const acceptedContext = contextMap.get(normalizedState.lastAcceptedContextId);
    if (acceptedContext) {
        candidates.push(buildCandidate({
            id: acceptedContext.id,
            score: 44,
            reason: "Tu as récemment choisi ce profil dans une situation similaire.",
            source: "history",
            contextMap,
            lastAcceptedContextId: normalizedState.lastAcceptedContextId
        }));
    }

    const best = candidates
        .filter(Boolean)
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            if (left.ready !== right.ready) return left.ready ? -1 : 1;
            return left.contextId.localeCompare(right.contextId);
        })[0];

    if (!best || best.score < Number(minimumScore || 0)) {
        return null;
    }

    return {
        ...best,
        confidence:
            best.score >= 90
                ? "forte"
                : best.score >= 65
                    ? "bonne"
                    : "modérée",
        label: best.ready ? "Suggestion prête" : "Suggestion à configurer"
    };
}

export function acceptContextualProfileSuggestion(
    state,
    contextId,
    now = Date.now()
) {
    const normalized = normalizeContextualProfileState(state);
    return {
        ...normalized,
        dismissedUntil: 0,
        lastAcceptedContextId: String(contextId || "").slice(0, 40),
        lastSuggestedContextId: String(contextId || "").slice(0, 40),
        updatedAt: Number(now) || Date.now()
    };
}

export function dismissContextualProfileSuggestion(
    state,
    {
        now = Date.now(),
        durationMs = 4 * 60 * 60 * 1000,
        contextId = ""
    } = {}
) {
    const normalized = normalizeContextualProfileState(state);
    const timestamp = Number(now) || Date.now();
    return {
        ...normalized,
        dismissedUntil: timestamp + Math.max(0, Number(durationMs) || 0),
        lastSuggestedContextId: String(contextId || "").slice(0, 40),
        updatedAt: timestamp
    };
}
