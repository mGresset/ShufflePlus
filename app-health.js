export const APP_HEALTH_LEVELS = {
    healthy: {
        id: "healthy",
        label: "Opérationnel",
        icon: "✅"
    },
    attention: {
        id: "attention",
        label: "À vérifier",
        icon: "⚠️"
    },
    critical: {
        id: "critical",
        label: "Action nécessaire",
        icon: "❌"
    }
};

function normalizeBoolean(value) {
    return value === true;
}

function normalizeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? numeric
        : fallback;
}

function buildCheck({
    id,
    label,
    description,
    available,
    category = "core",
    required = false,
    warningWhenMissing = false,
    value = ""
}) {
    const ok = normalizeBoolean(available);
    let level = "healthy";

    if (!ok && required) {
        level = "critical";
    } else if (!ok && warningWhenMissing) {
        level = "attention";
    }

    return {
        id: String(id || "check"),
        label: String(label || "Vérification"),
        description: String(description || ""),
        category,
        required,
        available: ok,
        level,
        value: String(value || "")
    };
}

export function buildAppHealthSnapshot({
    appVersion = "",
    online = true,
    secureContext = false,
    localStorageAvailable = false,
    serviceWorkerSupported = false,
    serviceWorkerControlled = false,
    serviceWorkerState = "",
    cacheSupported = false,
    cacheCount = 0,
    staleCacheCount = 0,
    wakeLockSupported = false,
    speechRecognitionSupported = false,
    clipboardSupported = false,
    shareSupported = false,
    standalone = false,
    spotifyConnected = false,
    spotifyApiDiagnostics = {},
    viewportWidth = 0,
    viewportHeight = 0,
    currentMenu = "",
    userAgent = "",
    generatedAt = Date.now()
} = {}) {
    const spotifyApi = {
        logicalRequests: Math.max(0, normalizeNumber(spotifyApiDiagnostics.logicalRequests)),
        networkRequests: Math.max(0, normalizeNumber(spotifyApiDiagnostics.networkRequests)),
        cacheHits: Math.max(0, normalizeNumber(spotifyApiDiagnostics.cacheHits)),
        deduplicatedRequests: Math.max(0, normalizeNumber(spotifyApiDiagnostics.deduplicatedRequests)),
        blockedByCooldown: Math.max(0, normalizeNumber(spotifyApiDiagnostics.blockedByCooldown)),
        quotaEvents: Math.max(0, normalizeNumber(spotifyApiDiagnostics.quotaEvents)),
        rateLimitEvents: Math.max(0, normalizeNumber(spotifyApiDiagnostics.rateLimitEvents)),
        cacheEntries: Math.max(0, normalizeNumber(spotifyApiDiagnostics.cacheEntries)),
        pendingRequests: Math.max(0, normalizeNumber(spotifyApiDiagnostics.pendingRequests)),
        cooldownActive: normalizeBoolean(spotifyApiDiagnostics.cooldownActive),
        cooldownReason: String(spotifyApiDiagnostics.cooldownReason || ""),
        cooldownUntil: Math.max(0, normalizeNumber(spotifyApiDiagnostics.cooldownUntil)),
        cooldownRemainingMs: Math.max(0, normalizeNumber(spotifyApiDiagnostics.cooldownRemainingMs))
    };
    const spotifyCooldownLabel = spotifyApi.cooldownActive
        ? `${spotifyApi.cooldownReason || "PAUSE"} · ${Math.max(1, Math.ceil(spotifyApi.cooldownRemainingMs / 1000))} s restantes`
        : `${spotifyApi.networkRequests} appel(s) réseau · ${spotifyApi.cacheHits} cache`;

    const checks = [
        buildCheck({
            id: "secure-context",
            label: "Connexion sécurisée",
            description: "Nécessaire pour les fonctions modernes du navigateur.",
            available: secureContext,
            required: true,
            value: secureContext ? "HTTPS actif" : "Contexte non sécurisé"
        }),
        buildCheck({
            id: "local-storage",
            label: "Stockage local",
            description: "Conserve les réglages, mix et préférences sur cet appareil.",
            available: localStorageAvailable,
            required: true,
            value: localStorageAvailable ? "Disponible" : "Indisponible"
        }),
        buildCheck({
            id: "network",
            label: "Connexion Internet",
            description: "Spotify exige une connexion pour charger et lire la musique.",
            available: online,
            warningWhenMissing: true,
            value: online ? "En ligne" : "Hors connexion"
        }),
        buildCheck({
            id: "service-worker",
            label: "Moteur PWA",
            description: "Gère le cache, les mises à jour et l’ouverture hors connexion.",
            category: "pwa",
            available: serviceWorkerSupported && serviceWorkerControlled,
            warningWhenMissing: true,
            value: serviceWorkerControlled
                ? (serviceWorkerState || "Contrôlé")
                : serviceWorkerSupported
                    ? "Supporté mais non actif"
                    : "Non supporté"
        }),
        buildCheck({
            id: "cache",
            label: "Cache de l’application",
            description: "Conserve les fichiers nécessaires à l’interface.",
            category: "pwa",
            available: cacheSupported && normalizeNumber(cacheCount) > 0,
            warningWhenMissing: true,
            value: cacheSupported
                ? `${normalizeNumber(cacheCount)} cache(s) · ${normalizeNumber(staleCacheCount)} ancien(s)`
                : "API Cache indisponible"
        }),
        buildCheck({
            id: "spotify-api",
            label: "Quota et cache Spotify",
            description: "Centralise les appels, réutilise les réponses récentes et met l’API en pause après une erreur 429.",
            category: "spotify",
            available: !spotifyApi.cooldownActive,
            warningWhenMissing: true,
            value: spotifyCooldownLabel
        }),
        buildCheck({
            id: "standalone",
            label: "Mode application",
            description: "Indique si Shuffle+ est ouvert comme PWA installée.",
            category: "pwa",
            available: standalone,
            value: standalone ? "Installée" : "Ouverte dans le navigateur"
        }),
        buildCheck({
            id: "wake-lock",
            label: "Maintien de l’écran",
            description: "Utilisé par le mode Conduite lorsque le navigateur l’autorise.",
            category: "optional",
            available: wakeLockSupported,
            value: wakeLockSupported ? "API disponible" : "Non disponible"
        }),
        buildCheck({
            id: "voice",
            label: "Commande vocale",
            description: "Permet d’utiliser le microphone avec l’assistant.",
            category: "optional",
            available: speechRecognitionSupported,
            value: speechRecognitionSupported ? "Reconnaissance disponible" : "Non disponible"
        }),
        buildCheck({
            id: "clipboard",
            label: "Copie rapide",
            description: "Utilisée pour les URL iOS et les commandes à partager.",
            category: "optional",
            available: clipboardSupported,
            value: clipboardSupported ? "Presse-papiers disponible" : "Copie avec solution de secours"
        }),
        buildCheck({
            id: "share",
            label: "Partage système",
            description: "Permet d’ouvrir la feuille de partage de l’appareil.",
            category: "optional",
            available: shareSupported,
            value: shareSupported ? "Disponible" : "Non disponible"
        })
    ];

    const criticalCount = checks.filter((item) => item.level === "critical").length;
    const warningCount = checks.filter((item) => item.level === "attention").length;
    const coreChecks = checks.filter((item) => item.category === "core");
    const coreScore = coreChecks.length
        ? Math.round(coreChecks.filter((item) => item.available).length / coreChecks.length * 100)
        : 100;
    const overallLevel = criticalCount
        ? "critical"
        : warningCount
            ? "attention"
            : "healthy";

    return {
        schemaVersion: 1,
        appVersion: String(appVersion || ""),
        generatedAt: normalizeNumber(generatedAt, Date.now()),
        generatedAtIso: new Date(normalizeNumber(generatedAt, Date.now())).toISOString(),
        overall: APP_HEALTH_LEVELS[overallLevel],
        criticalCount,
        warningCount,
        coreScore,
        checks,
        runtime: {
            online: normalizeBoolean(online),
            standalone: normalizeBoolean(standalone),
            spotifyConnected: normalizeBoolean(spotifyConnected),
            viewportWidth: Math.max(0, normalizeNumber(viewportWidth)),
            viewportHeight: Math.max(0, normalizeNumber(viewportHeight)),
            currentMenu: String(currentMenu || ""),
            userAgent: String(userAgent || ""),
            spotifyApi
        }
    };
}

export function buildAppHealthExport(snapshot = {}) {
    return {
        format: "shuffleplus-app-health",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        privacy: "Aucun titre, playlist, jeton Spotify ou identifiant personnel n’est inclus.",
        snapshot
    };
}
