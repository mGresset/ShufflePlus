export const RELIABILITY_EVENT_LIMIT = 50;

function normalizeTimestamp(value, fallback = Date.now()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0
        ? numeric
        : fallback;
}

function normalizeLevel(value = "info") {
    return ["success", "info", "warning", "error"].includes(value)
        ? value
        : "info";
}

export function normalizeReliabilityEvent(event = {}, now = Date.now()) {
    const createdAt = normalizeTimestamp(event.createdAt, now);
    const category = String(event.category || "system").trim() || "system";
    const label = String(event.label || "Événement Shuffle+").trim();

    return {
        id: String(event.id || `${createdAt}-${category}-${label}`),
        category,
        level: normalizeLevel(event.level),
        label: label.slice(0, 120),
        detail: String(event.detail || "").trim().slice(0, 180),
        createdAt,
        count: Math.max(1, Number(event.count) || 1)
    };
}

export function normalizeReliabilityEvents(value, now = Date.now()) {
    const events = Array.isArray(value) ? value : [];

    return events
        .map((event) => normalizeReliabilityEvent(event, now))
        .filter((event) => event.label)
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, RELIABILITY_EVENT_LIMIT);
}

export function appendReliabilityEvent(
    events,
    event,
    {
        now = Date.now(),
        limit = RELIABILITY_EVENT_LIMIT,
        dedupeWindowMs = 30_000
    } = {}
) {
    const nextEvent = normalizeReliabilityEvent(event, now);
    const normalized = normalizeReliabilityEvents(events, now);
    const duplicateIndex = normalized.findIndex((item) => (
        item.category === nextEvent.category &&
        item.label === nextEvent.label &&
        Math.abs(item.createdAt - nextEvent.createdAt) <= dedupeWindowMs
    ));

    if (duplicateIndex >= 0) {
        const duplicate = normalized[duplicateIndex];
        normalized.splice(duplicateIndex, 1);
        normalized.unshift({
            ...duplicate,
            id: nextEvent.id,
            level: nextEvent.level,
            detail: nextEvent.detail || duplicate.detail,
            createdAt: nextEvent.createdAt,
            count: duplicate.count + 1
        });
    } else {
        normalized.unshift(nextEvent);
    }

    return normalized.slice(0, Math.max(1, Number(limit) || RELIABILITY_EVENT_LIMIT));
}

function includesAny(text, patterns = []) {
    return patterns.some((pattern) => text.includes(pattern));
}

export function deriveReliabilityEventFromStatus(
    message = "",
    type = "",
    now = Date.now()
) {
    const raw = String(message || "").trim();
    if (!raw) return null;

    const text = raw.toLocaleLowerCase("fr-FR");
    const error = type === "error";
    const warning = type === "warning";
    const level = error ? "error" : warning ? "warning" : "success";

    if (includesAny(text, ["connexion revenue", "de nouveau en ligne", "réseau rétabli"])) {
        return normalizeReliabilityEvent({
            category: "network",
            level: "success",
            label: "Connexion Internet rétablie",
            detail: "Shuffle+ peut reprendre les opérations en ligne.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["hors connexion", "connexion perdue", "réseau indisponible"])) {
        return normalizeReliabilityEvent({
            category: "network",
            level: "warning",
            label: "Connexion Internet indisponible",
            detail: "Les commandes Spotify attendent le retour du réseau.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["playlist lancée", "lecture démarrée", "lecture confirmée"])) {
        return normalizeReliabilityEvent({
            category: "spotify",
            level: "success",
            label: "Lecture Spotify confirmée",
            detail: "Le lancement a été accepté par Spotify Connect.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["file d’attente actualisée", "file d'attente actualisée", "file spotify actualisée"])) {
        return normalizeReliabilityEvent({
            category: "spotify",
            level: "success",
            label: "File d’attente Spotify actualisée",
            detail: "Les prochains titres affichés ont été renouvelés.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["appareil(s) spotify détecté", "appareil spotify détecté"])) {
        return normalizeReliabilityEvent({
            category: "device",
            level: "success",
            label: "Appareils Spotify détectés",
            detail: "La liste Spotify Connect a été actualisée.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["aucun appareil spotify", "appareil n’est plus disponible", "appareil n'est plus disponible"])) {
        return normalizeReliabilityEvent({
            category: "device",
            level: error ? "error" : "warning",
            label: "Appareil Spotify à réveiller",
            detail: "Ouvre Spotify sur l’appareil puis relance sa détection.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["serveur disponible", "synchronisation terminée", "synchronisation serveur terminée"])) {
        return normalizeReliabilityEvent({
            category: "sync",
            level: "success",
            label: text.includes("serveur disponible")
                ? "Serveur Railway disponible"
                : "Synchronisation terminée",
            detail: "La liaison de synchronisation répond correctement.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["serveur inaccessible", "impossible de joindre le serveur", "synchronisation impossible"])) {
        return normalizeReliabilityEvent({
            category: "sync",
            level: "error",
            label: "Serveur Railway inaccessible",
            detail: "La synchronisation sera retentée après vérification du serveur.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["cache pwa", "mise à jour installée", "nouvelle version", "réparation du cache"])) {
        return normalizeReliabilityEvent({
            category: "pwa",
            level,
            label: error ? "Intervention PWA nécessaire" : "Maintenance PWA effectuée",
            detail: error
                ? "Le cache ou la mise à jour de l’application doit être vérifié."
                : "Le cache et la version installée ont été actualisés.",
            createdAt: now
        }, now);
    }

    if (includesAny(text, ["mode essentiel", "mode expert"])) {
        return normalizeReliabilityEvent({
            category: "experience",
            level: "info",
            label: text.includes("essentiel")
                ? "Mode Essentiel activé"
                : "Mode Expert activé",
            detail: "Le niveau d’interface a été modifié.",
            createdAt: now
        }, now);
    }

    if (error && includesAny(text, ["spotify", "lecture", "lancement", "appareil"])) {
        return normalizeReliabilityEvent({
            category: "spotify",
            level: "error",
            label: "Incident Spotify signalé",
            detail: "Le Centre de fiabilité peut proposer une action de récupération.",
            createdAt: now
        }, now);
    }

    return null;
}

function getCheck(snapshot, id) {
    return snapshot?.checks?.find((check) => check.id === id) || null;
}

function serviceState(id, label, icon, level, value, detail) {
    return { id, label, icon, level, value, detail };
}

export function buildReliabilityServices(
    snapshot = {},
    {
        serverHealth = {},
        queueState = {},
        activeDevice = {},
        shortcutState = {}
    } = {}
) {
    const spotifyApi = snapshot?.runtime?.spotifyApi || {};
    const spotifyConnected = snapshot?.runtime?.spotifyConnected === true;
    const serviceWorker = getCheck(snapshot, "service-worker");
    const cache = getCheck(snapshot, "cache");
    const syncRecovery = snapshot?.runtime?.serverSyncRecovery || {};
    const serverConfigured = Boolean(syncRecovery.connected || syncRecovery.addressAvailable);
    const serverOk = serverHealth.status === "healthy";
    const queueAgeMs = Math.max(0, Number(queueState.ageMs) || 0);
    const queueCount = Math.max(0, Number(queueState.count) || 0);
    const queueFresh = queueCount > 0 && queueAgeMs <= 120_000;
    const deviceName = String(activeDevice.name || "").trim();

    return [
        serviceState(
            "spotify",
            "Spotify",
            "🎵",
            !spotifyConnected
                ? "critical"
                : spotifyApi.cooldownActive
                    ? "attention"
                    : "healthy",
            !spotifyConnected
                ? "Déconnecté"
                : spotifyApi.cooldownActive
                    ? "Pause API temporaire"
                    : "Opérationnel",
            !spotifyConnected
                ? "Une reconnexion est nécessaire pour piloter la lecture."
                : spotifyApi.cooldownActive
                    ? "Shuffle+ respecte automatiquement le délai imposé par Spotify."
                    : `${spotifyApi.networkRequests || 0} appel(s) réseau · ${spotifyApi.cacheHits || 0} réponse(s) en cache.`
        ),
        serviceState(
            "railway",
            "Railway",
            "☁️",
            !serverConfigured
                ? "neutral"
                : serverOk
                    ? "healthy"
                    : serverHealth.status === "checking"
                        ? "attention"
                        : "critical",
            !serverConfigured
                ? "Non configuré"
                : serverOk
                    ? `${serverHealth.latencyMs || 0} ms`
                    : serverHealth.status === "checking"
                        ? "Vérification…"
                        : "Inaccessible",
            !serverConfigured
                ? "La synchronisation en ligne est facultative."
                : serverOk
                    ? `Serveur ${serverHealth.version || "actif"} contrôlé récemment.`
                    : "La liaison de synchronisation doit être retestée."
        ),
        serviceState(
            "pwa",
            "PWA",
            "📲",
            serviceWorker?.available && cache?.available
                ? "healthy"
                : "attention",
            serviceWorker?.available && cache?.available
                ? "À jour"
                : "À vérifier",
            serviceWorker?.available && cache?.available
                ? "Le moteur PWA et le cache sont actifs."
                : "Une réparation du cache peut être utile."
        ),
        serviceState(
            "device",
            "Appareil et file",
            "📱",
            deviceName && queueFresh
                ? "healthy"
                : deviceName || queueCount
                    ? "attention"
                    : "neutral",
            deviceName || (queueCount ? `${queueCount} titre(s)` : "En attente"),
            queueFresh
                ? `${queueCount} titre(s) visibles dans une file récente.`
                : deviceName
                    ? "L’appareil est connu, mais la file mérite une actualisation."
                    : "Lance Spotify sur un appareil pour compléter ce diagnostic."
        ),
        serviceState(
            "shortcuts",
            "Raccourcis iOS",
            "⚡",
            ["healthy", "attention", "critical", "neutral"].includes(shortcutState.level)
                ? shortcutState.level
                : "neutral",
            String(shortcutState.value || "Non vérifié"),
            String(shortcutState.detail || "Le Centre de commandes iOS peut vérifier la compatibilité V10.1.")
        )
    ];
}

export function buildReliabilityRecoveryPlan(
    snapshot = {},
    {
        serverHealth = {},
        queueState = {},
        activeDevice = {},
        pendingLaunch = false
    } = {}
) {
    const actions = [];
    const online = snapshot?.runtime?.online === true;
    const spotifyConnected = snapshot?.runtime?.spotifyConnected === true;
    const spotifyApi = snapshot?.runtime?.spotifyApi || {};
    const syncRecovery = snapshot?.runtime?.serverSyncRecovery || {};
    const serviceWorker = getCheck(snapshot, "service-worker");
    const cache = getCheck(snapshot, "cache");
    const serverConfigured = Boolean(syncRecovery.connected || syncRecovery.addressAvailable);
    const queueAgeMs = Math.max(0, Number(queueState.ageMs) || 0);
    const queueCount = Math.max(0, Number(queueState.count) || 0);

    if (!online) {
        actions.push({
            id: "network-info",
            level: "critical",
            label: "Rétablir Internet",
            description: "Spotify et Railway nécessitent une connexion active.",
            automatic: false
        });
    }

    if (online && !spotifyConnected) {
        actions.push({
            id: "reconnect-spotify",
            level: "critical",
            label: "Reconnecter Spotify",
            description: "Renouvelle la session Spotify sans toucher aux réglages.",
            automatic: true
        });
    }

    if (spotifyApi.cooldownActive) {
        actions.push({
            id: "run-diagnostic",
            level: "attention",
            label: "Revérifier après la pause Spotify",
            description: "Le délai Retry-After est respecté automatiquement.",
            automatic: true
        });
    }

    if (online && spotifyConnected && !String(activeDevice.name || "").trim()) {
        actions.push({
            id: "refresh-devices",
            level: "attention",
            label: "Rechercher les appareils Spotify",
            description: "Actualise Spotify Connect et retrouve le dernier appareil disponible.",
            automatic: true
        });
    }

    if (
        online &&
        spotifyConnected &&
        (queueCount === 0 || queueAgeMs > 120_000)
    ) {
        actions.push({
            id: "refresh-queue",
            level: "attention",
            label: "Actualiser la file d’attente",
            description: "Recharge les prochains titres sans changer leur ordre.",
            automatic: true
        });
    }

    if (
        online &&
        (!serviceWorker?.available || !cache?.available || Number(snapshot?.runtime?.staleCacheCount || 0) > 0)
    ) {
        actions.push({
            id: "repair-cache",
            level: "attention",
            label: "Réparer le cache PWA",
            description: "Réinstalle les fichiers de l’interface sans supprimer tes données.",
            automatic: true
        });
    }

    if (online && serverConfigured && serverHealth.status !== "healthy") {
        actions.push({
            id: "retry-server",
            level: "attention",
            label: "Retester Railway",
            description: "Vérifie l’endpoint de santé du serveur de synchronisation.",
            automatic: true
        });
    }

    if (online && pendingLaunch) {
        actions.push({
            id: "resume-launch",
            level: "attention",
            label: "Reprendre le dernier lancement",
            description: "Relance la commande Spotify conservée après l’interruption.",
            automatic: true
        });
    }

    if (!actions.length) {
        actions.push({
            id: "run-diagnostic",
            level: "healthy",
            label: "Relancer le diagnostic",
            description: "Tous les services principaux sont disponibles.",
            automatic: true
        });
    }

    const rank = { critical: 0, attention: 1, healthy: 2 };
    return actions
        .sort((left, right) => (rank[left.level] ?? 3) - (rank[right.level] ?? 3))
        .slice(0, 5);
}

export function formatReliabilityAge(timestamp, now = Date.now()) {
    const ageMs = Math.max(0, now - normalizeTimestamp(timestamp, now));
    if (ageMs < 10_000) return "à l’instant";
    if (ageMs < 60_000) return `il y a ${Math.max(1, Math.round(ageMs / 1000))} s`;
    if (ageMs < 3_600_000) return `il y a ${Math.max(1, Math.round(ageMs / 60_000))} min`;
    if (ageMs < 86_400_000) return `il y a ${Math.max(1, Math.round(ageMs / 3_600_000))} h`;
    return `il y a ${Math.max(1, Math.round(ageMs / 86_400_000))} j`;
}

export function buildReliabilityExport({
    snapshot = {},
    events = [],
    services = [],
    recovery = [],
    serverHealth = {},
    queueState = {},
    activeDevice = {}
} = {}) {
    return {
        format: "shuffleplus-reliability-center",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        privacy: "Aucun jeton Spotify, titre, playlist, identifiant d’espace ou secret de synchronisation n’est inclus.",
        snapshot,
        services,
        recovery,
        serverHealth: {
            status: String(serverHealth.status || "unknown"),
            version: String(serverHealth.version || ""),
            latencyMs: Math.max(0, Number(serverHealth.latencyMs) || 0),
            checkedAt: Math.max(0, Number(serverHealth.checkedAt) || 0)
        },
        queue: {
            count: Math.max(0, Number(queueState.count) || 0),
            ageMs: Math.max(0, Number(queueState.ageMs) || 0)
        },
        device: {
            available: Boolean(activeDevice?.name),
            type: String(activeDevice?.type || "")
        },
        events: normalizeReliabilityEvents(events).map((event) => ({
            category: event.category,
            level: event.level,
            label: event.label,
            detail: event.detail,
            createdAt: event.createdAt,
            count: event.count
        }))
    };
}
