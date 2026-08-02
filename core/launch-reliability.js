const VALID_STEP_STATUSES = new Set([
    "waiting",
    "pending",
    "success",
    "error",
    "skipped"
]);

function cleanText(value, maxLength = 240) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

function normalizeDevice(device = {}) {
    return {
        id: cleanText(device.id, 160),
        name: cleanText(device.name, 120),
        type: cleanText(device.type, 80),
        is_active: device.is_active === true,
        is_restricted: device.is_restricted === true,
        volume_percent: Number.isFinite(Number(device.volume_percent))
            ? Number(device.volume_percent)
            : null,
        lastSeenAt: Number.isFinite(Number(device.lastSeenAt))
            ? Math.max(0, Number(device.lastSeenAt))
            : 0,
        lastSuccessfulAt: Number.isFinite(Number(device.lastSuccessfulAt))
            ? Math.max(0, Number(device.lastSuccessfulAt))
            : 0
    };
}

export function normalizeLastWorkingSpotifyDevice(device = {}) {
    const normalized = normalizeDevice(device);
    return normalized.id ? normalized : {
        id: "",
        name: "",
        type: "",
        is_active: false,
        is_restricted: false,
        volume_percent: null,
        lastSeenAt: 0,
        lastSuccessfulAt: 0
    };
}

function getDeviceIdentity(device = {}) {
    const normalized = normalizeDevice(device);
    if (normalized.id) return `id:${normalized.id}`;
    if (normalized.name || normalized.type) {
        return `name:${normalized.name.toLowerCase()}|type:${normalized.type.toLowerCase()}`;
    }
    return "";
}

function isPhoneLike(device = {}) {
    const value = `${device.name || ""} ${device.type || ""}`.toLowerCase();
    return /iphone|ipad|phone|smartphone|mobile/.test(value);
}

function matchesStoredDevice(device, stored) {
    if (!device || !stored) return false;
    if (stored.id && device.id === stored.id) return true;
    const wantedName = cleanText(stored.name, 120).toLowerCase();
    const wantedType = cleanText(stored.type, 80).toLowerCase();
    const actualName = cleanText(device.name, 120).toLowerCase();
    const actualType = cleanText(device.type, 80).toLowerCase();
    return Boolean(
        wantedName && actualName &&
        actualName === wantedName &&
        (!wantedType || actualType === wantedType)
    );
}

export function prioritizeLaunchDevices(
    devices = [],
    {
        preferredDevice = null,
        lastWorkingDevice = null,
        mode = "preferred",
        deviceName = ""
    } = {}
) {
    const usable = Array.isArray(devices)
        ? devices
            .map(normalizeDevice)
            .filter((device) => device.id && !device.is_restricted)
        : [];
    const result = [];
    const seen = new Set();
    const push = (device, reason) => {
        if (!device?.id) return;
        const identity = getDeviceIdentity(device);
        if (!identity || seen.has(identity)) return;
        seen.add(identity);
        result.push({ ...device, selectionReason: reason });
    };
    const pushMatching = (stored, reason, predicate = () => true) => {
        usable
            .filter((device) => matchesStoredDevice(device, stored) && predicate(device))
            .forEach((device) => push(device, reason));
    };
    const pushPhones = () => usable
        .filter(isPhoneLike)
        .forEach((device) => push(device, "appareil mobile"));
    const pushActive = () => usable
        .filter((device) => device.is_active)
        .forEach((device) => push(device, "appareil actif"));
    const wantedName = cleanText(deviceName, 120).toLowerCase();

    if (mode === "named") {
        usable
            .filter((device) => wantedName && device.name.toLowerCase().includes(wantedName))
            .forEach((device) => push(device, "nom configuré"));
        pushActive();
        pushMatching(lastWorkingDevice, "dernier appareil opérationnel");
        usable.forEach((device) => push(device, "appareil de secours"));
        return result;
    }

    if (mode === "active") {
        pushActive();
        pushMatching(lastWorkingDevice, "dernier appareil opérationnel");
        pushMatching(preferredDevice, "appareil préféré");
        pushPhones();
        usable.forEach((device) => push(device, "appareil de secours"));
        return result;
    }

    if (mode === "first") {
        usable.forEach((device) => push(device, "premier appareil disponible"));
        return result;
    }

    if (mode === "iphone") {
        pushMatching(lastWorkingDevice, "dernier appareil opérationnel", isPhoneLike);
        pushMatching(preferredDevice, "appareil préféré", isPhoneLike);
        pushPhones();
        pushActive();
        usable.forEach((device) => push(device, "appareil de secours"));
        return result;
    }

    // Mode préféré : priorité au dernier appareil ayant réellement réussi,
    // puis à la préférence manuelle, avant les secours Spotify Connect.
    pushMatching(lastWorkingDevice, "dernier appareil opérationnel");
    pushMatching(preferredDevice, "appareil préféré");
    pushPhones();
    pushActive();
    usable.forEach((device) => push(device, "premier appareil disponible"));
    return result;
}

export function buildLaunchPreflight({
    online = true,
    spotifyConfigured = false,
    spotifyConnected = false,
    command = null,
    playlistIds = [],
    mixIds = [],
    preferredDevice = null,
    lastWorkingDevice = null
} = {}) {
    const playlistSet = new Set(Array.isArray(playlistIds) ? playlistIds : []);
    const mixSet = new Set(Array.isArray(mixIds) ? mixIds : []);
    const type = command?.commandType === "smartmix"
        ? "smartmix"
        : command?.commandType === "adaptive"
            ? "adaptive"
            : "fixed";
    const sourceReady = type === "fixed"
        ? Boolean(command?.playlistId && playlistSet.has(command.playlistId))
        : type === "smartmix"
            ? Boolean(command?.mixId && mixSet.has(command.mixId))
            : Boolean(command);
    const preferredRequired = command?.deviceMode === "preferred";
    const storedDeviceReady = Boolean(
        preferredDevice?.id ||
        lastWorkingDevice?.id ||
        !preferredRequired
    );

    const checks = [
        {
            id: "network",
            label: "Connexion Internet",
            ready: online === true,
            blocking: true,
            message: online
                ? "Connexion disponible"
                : "Shuffle+ est hors connexion"
        },
        {
            id: "spotify-app",
            label: "Application Spotify",
            ready: spotifyConfigured === true,
            blocking: true,
            message: spotifyConfigured
                ? "Client ID configuré"
                : "Client ID Spotify manquant"
        },
        {
            id: "spotify-session",
            label: "Session Spotify",
            ready: spotifyConnected === true,
            blocking: false,
            message: spotifyConnected
                ? "Compte connecté"
                : "La session sera vérifiée avant le lancement"
        },
        {
            id: "profile",
            label: type === "fixed" ? "Playlist" : type === "smartmix" ? "Mix" : "Profil",
            ready: sourceReady,
            blocking: true,
            message: sourceReady
                ? "Source disponible"
                : "Source absente ou supprimée"
        },
        {
            id: "device-memory",
            label: "Appareil mémorisé",
            ready: storedDeviceReady,
            blocking: false,
            message: storedDeviceReady
                ? (lastWorkingDevice?.name || preferredDevice?.name || "Détection automatique")
                : "Aucun iPhone mémorisé ; détection automatique prévue"
        }
    ];
    const blocking = checks.filter((check) => check.blocking && !check.ready);
    const warnings = checks.filter((check) => !check.blocking && !check.ready);

    return {
        ready: blocking.length === 0,
        checks,
        blocking,
        warnings,
        type
    };
}

export function upsertLaunchStep(
    steps = [],
    {
        id = "",
        label = "Étape",
        status = "pending",
        message = "",
        attempt = 0,
        updatedAt = Date.now()
    } = {}
) {
    const normalizedId = cleanText(id, 60);
    if (!normalizedId) return Array.isArray(steps) ? [...steps] : [];
    const normalized = {
        id: normalizedId,
        label: cleanText(label, 120) || "Étape",
        status: VALID_STEP_STATUSES.has(status) ? status : "pending",
        message: cleanText(message, 240),
        attempt: Math.max(0, Number(attempt) || 0),
        updatedAt: Math.max(0, Number(updatedAt) || Date.now())
    };
    const source = Array.isArray(steps) ? steps : [];
    const index = source.findIndex((step) => step?.id === normalizedId);
    if (index < 0) return [...source, normalized].slice(-16);
    return source.map((step, currentIndex) => currentIndex === index
        ? { ...step, ...normalized }
        : step
    );
}

function hasMessage(error, pattern) {
    return pattern.test(String(error?.message || error || ""));
}

export function classifyLaunchError(error) {
    const status = Number(error?.status || 0);
    const reason = cleanText(error?.reason, 120).toUpperCase();
    const code = cleanText(error?.code, 120).toUpperCase();
    const message = cleanText(error?.message || String(error || ""), 400);

    if (typeof navigator !== "undefined" && navigator.onLine === false || hasMessage(error, /hors connexion|internet|network|failed to fetch/i)) {
        return {
            code: "OFFLINE",
            title: "Connexion Internet indisponible",
            message: "Reconnecte l’iPhone ou l’ordinateur, puis relance le raccourci.",
            action: "wait-online",
            actionLabel: "Réessayer quand Internet revient",
            recoverable: true,
            keepPending: true
        };
    }
    if (code === "SPOTIFY_REAUTH_REQUIRED" || hasMessage(error, /renouvelée|reconnecter spotify|invalid_grant|session spotify/i)) {
        return {
            code: "SPOTIFY_REAUTH_REQUIRED",
            title: "Connexion Spotify expirée",
            message: "Reconnecte Spotify pour renouveler l’autorisation de lecture.",
            action: "reconnect",
            actionLabel: "Reconnecter Spotify",
            recoverable: true,
            keepPending: true
        };
    }
    if (status === 429 || reason === "QUOTA_EXCEEDED" || hasMessage(error, /quota|rate limit|trop de requêtes/i)) {
        return {
            code: reason === "QUOTA_EXCEEDED" ? "SPOTIFY_QUOTA" : "SPOTIFY_RATE_LIMIT",
            title: "Spotify demande de patienter",
            message: reason === "QUOTA_EXCEEDED"
                ? "Le quota Spotify de l’application est atteint. Réessaie plus tard."
                : "Trop de commandes ont été envoyées. Attends quelques instants avant de réessayer.",
            action: "retry-later",
            actionLabel: "Réessayer",
            recoverable: true,
            keepPending: false
        };
    }
    if (status === 403 || hasMessage(error, /premium|user-modify-playback-state|interdit son contrôle|contrôle à distance/i)) {
        return {
            code: "SPOTIFY_PERMISSION",
            title: "Commande Spotify refusée",
            message: "Vérifie Spotify Premium, les autorisations de l’application et que le compte utilisé est bien autorisé.",
            action: "reconnect",
            actionLabel: "Reconnecter Spotify",
            recoverable: true,
            keepPending: false
        };
    }
    if (hasMessage(error, /aucun .*appareil|aucun iphone|appareil spotify disponible|ouvre spotify/i)) {
        return {
            code: "NO_DEVICE",
            title: "Aucun appareil Spotify détecté",
            message: "Ouvre Spotify sur l’iPhone, lance brièvement un morceau, puis reviens dans Shuffle+.",
            action: "open-spotify",
            actionLabel: "Ouvrir Spotify",
            recoverable: true,
            keepPending: true
        };
    }
    if (hasMessage(error, /n’a pas démarré|commande.*reçue|relancer la playlist|lecture.*vérifi/i)) {
        return {
            code: "PLAYBACK_NOT_CONFIRMED",
            title: "Lecture non confirmée",
            message: "Spotify a reçu la commande, mais la lecture n’a pas été confirmée sur l’appareil ciblé.",
            action: "open-spotify",
            actionLabel: "Ouvrir Spotify puis réessayer",
            recoverable: true,
            keepPending: true
        };
    }
    if (hasMessage(error, /playlist|mix.*introuvable|source absente|configure|choisis d’abord/i)) {
        return {
            code: "INVALID_PROFILE",
            title: "Profil de lancement incomplet",
            message: message || "La playlist ou le mix associé au profil n’est plus disponible.",
            action: "settings",
            actionLabel: "Modifier le profil",
            recoverable: true,
            keepPending: false
        };
    }

    return {
        code: code || (status ? `SPOTIFY_${status}` : "LAUNCH_FAILED"),
        title: "Lancement interrompu",
        message: message || "Une erreur inattendue a empêché le lancement.",
        action: "retry",
        actionLabel: "Réessayer",
        recoverable: true,
        keepPending: false
    };
}

export function buildLaunchRecoveryActions(classification = {}) {
    const primary = classification.action || "retry";
    const actions = [];
    const push = (id, label, primaryAction = false) => {
        if (!actions.some((item) => item.id === id)) {
            actions.push({ id, label, primary: primaryAction });
        }
    };

    if (primary === "open-spotify") push("open-spotify", classification.actionLabel || "Ouvrir Spotify", true);
    if (primary === "reconnect") push("reconnect", classification.actionLabel || "Reconnecter Spotify", true);
    if (primary === "settings") push("settings", classification.actionLabel || "Modifier le profil", true);
    if (["retry", "retry-later", "wait-online"].includes(primary)) push("retry", classification.actionLabel || "Réessayer", true);

    if (primary !== "retry") push("retry", "Réessayer");
    if (primary !== "open-spotify") push("open-spotify", "Ouvrir Spotify");
    if (primary !== "settings") push("settings", "Changer d’appareil ou de profil");
    push("copy-diagnostic", "Copier le diagnostic");

    return actions.slice(0, 5);
}
