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
    featureRuntime = [],
    prefetchRuntime = [],
    networkProfile = {},
    performanceBudget = {},
    runtimeStateDiagnostics = {},
    storageMigration = {},
    experienceMode = "essential",
    serverSyncConnected = false,
    serverSyncRecovery = {},
    serverSyncHealth = {},
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
    const featureModules = Array.isArray(featureRuntime)
        ? featureRuntime.map((item) => ({
            name: String(item?.name || "module"),
            status: String(item?.status || "idle"),
            durationMs: Math.max(0, normalizeNumber(item?.durationMs)),
            error: String(item?.error || "")
        }))
        : [];
    const loadedFeatureCount = featureModules.filter((item) => item.status === "loaded").length;
    const failedFeatureCount = featureModules.filter((item) => item.status === "error").length;
    const prefetchRules = Array.isArray(prefetchRuntime)
        ? prefetchRuntime.map((item) => ({
            id: String(item?.id || "feature"),
            status: String(item?.status || "idle"),
            durationMs: Math.max(0, normalizeNumber(item?.durationMs)),
            reason: String(item?.reason || ""),
            trigger: String(item?.trigger || "")
        }))
        : [];
    const failedPrefetchCount = prefetchRules.filter((item) => item.status === "error").length;
    const normalizedNetworkProfile = {
        id: String(networkProfile?.id || (online ? "fast" : "offline")),
        label: String(networkProfile?.label || (online ? "Connexion disponible" : "Hors connexion")),
        saveData: normalizeBoolean(networkProfile?.saveData),
        effectiveType: String(networkProfile?.effectiveType || ""),
        downlink: Math.max(0, normalizeNumber(networkProfile?.downlink)),
        rtt: Math.max(0, normalizeNumber(networkProfile?.rtt)),
        allowBackgroundWarmup: normalizeBoolean(networkProfile?.allowBackgroundWarmup)
    };
    const normalizedPerformanceBudget = {
        status: String(performanceBudget?.status || "healthy"),
        score: Math.max(0, Math.min(100, normalizeNumber(performanceBudget?.score, 100))),
        criticalCount: Math.max(0, normalizeNumber(performanceBudget?.criticalCount)),
        warningCount: Math.max(0, normalizeNumber(performanceBudget?.warningCount)),
        measurableCount: Math.max(0, normalizeNumber(performanceBudget?.measurableCount)),
        profileId: String(performanceBudget?.profileId || normalizedNetworkProfile.id)
    };
    const storage = {
        schemaVersion: Math.max(0, normalizeNumber(storageMigration?.schemaVersion)),
        recoveryCount: Math.max(0, normalizeNumber(storageMigration?.recoveryCount)),
        repairedKeyCount: Math.max(0, normalizeNumber(storageMigration?.repairedKeyCount)),
        lastRunAt: Math.max(0, normalizeNumber(storageMigration?.lastRunAt))
    };
    const syncRecovery = {
        connected: normalizeBoolean(serverSyncConnected),
        recoveryAvailable: normalizeBoolean(serverSyncRecovery?.recoveryAvailable),
        addressAvailable: normalizeBoolean(serverSyncRecovery?.addressAvailable),
        serverHost: String(serverSyncRecovery?.serverHost || ""),
        recoverySavedAt: Math.max(0, normalizeNumber(serverSyncRecovery?.recoverySavedAt))
    };
    const normalizedServerHealth = {
        status: String(serverSyncHealth?.status || "unknown"),
        version: String(serverSyncHealth?.version || ""),
        latencyMs: Math.max(0, normalizeNumber(serverSyncHealth?.latencyMs)),
        checkedAt: Math.max(0, normalizeNumber(serverSyncHealth?.checkedAt)),
        configured: normalizeBoolean(
            serverSyncHealth?.configured ||
            syncRecovery.connected ||
            syncRecovery.addressAvailable
        )
    };
    const normalizedExperienceMode =
        experienceMode === "expert" ? "expert" : "essential";
    const runtimeState = {
        revision: Math.max(0, normalizeNumber(runtimeStateDiagnostics?.revision)),
        uptimeMs: Math.max(0, normalizeNumber(runtimeStateDiagnostics?.uptimeMs)),
        subscriberCount: Math.max(0, normalizeNumber(runtimeStateDiagnostics?.subscriberCount)),
        snapshot: runtimeStateDiagnostics?.snapshot && typeof runtimeStateDiagnostics.snapshot === "object"
            ? runtimeStateDiagnostics.snapshot
            : {}
    };

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
            id: "storage-schema",
            label: "Structure des données locales",
            description: "Vérifie les données JSON, sauvegarde les entrées corrompues et applique les migrations sans toucher aux jetons Spotify.",
            category: "storage",
            available: storage.schemaVersion >= 2,
            warningWhenMissing: true,
            value: storage.schemaVersion
                ? `Schéma ${storage.schemaVersion} · ${storage.repairedKeyCount} réparation(s)`
                : "Migration non initialisée"
        }),
        buildCheck({
            id: "feature-loader",
            label: "Chargement progressif",
            description: "Les fonctions secondaires sont chargées uniquement lorsqu’elles sont nécessaires.",
            category: "performance",
            available: failedFeatureCount === 0,
            warningWhenMissing: true,
            value: `${loadedFeatureCount} chargé(s) · ${failedFeatureCount} erreur(s)`
        }),
        buildCheck({
            id: "adaptive-prefetch",
            label: "Préchargement adaptatif",
            description: "Anticipe une ouverture seulement après une intention utilisateur et respecte l’économie de données.",
            category: "performance",
            available: failedPrefetchCount === 0,
            warningWhenMissing: true,
            value: `${prefetchRules.filter((item) => item.status === "loaded").length} prêt(s) · ${failedPrefetchCount} erreur(s)`
        }),
        buildCheck({
            id: "network-profile",
            label: "Profil réseau",
            description: "Ajuste les préchargements à la vitesse de connexion et au mode économie de données.",
            category: "performance",
            available: true,
            value: normalizedNetworkProfile.saveData
                ? `${normalizedNetworkProfile.label} · économie de données`
                : normalizedNetworkProfile.label
        }),
        buildCheck({
            id: "performance-budget",
            label: "Budget de démarrage",
            description: "Compare le chargement réel à un budget adapté au réseau de cet appareil.",
            category: "performance",
            available: normalizedPerformanceBudget.status !== "critical",
            warningWhenMissing: true,
            value: normalizedPerformanceBudget.measurableCount
                ? `Score ${normalizedPerformanceBudget.score}/100 · profil ${normalizedPerformanceBudget.profileId}`
                : "Mesure disponible après le chargement complet"
        }),
        buildCheck({
            id: "experience-mode",
            label: "Niveau d’interface",
            description: "Le mode Essentiel allège les menus, tandis que le mode Expert affiche tous les outils.",
            category: "experience",
            available: true,
            value: normalizedExperienceMode === "expert"
                ? "Mode Expert"
                : "Mode Essentiel"
        }),
        buildCheck({
            id: "server-sync-health",
            label: "Serveur Railway",
            description: "Vérifie que le serveur de synchronisation répond sans exposer les secrets de liaison.",
            category: "sync",
            available: !normalizedServerHealth.configured ||
                normalizedServerHealth.status === "healthy",
            warningWhenMissing: normalizedServerHealth.configured,
            value: !normalizedServerHealth.configured
                ? "Non configuré"
                : normalizedServerHealth.status === "healthy"
                    ? `${normalizedServerHealth.latencyMs} ms · ${normalizedServerHealth.version || "version active"}`
                    : normalizedServerHealth.status === "checking"
                        ? "Vérification en cours"
                        : "Inaccessible"
        }),
        buildCheck({
            id: "server-sync-recovery",
            label: "Sauvegarde de la liaison serveur",
            description: "Conserve une copie locale de la liaison chiffrée et la dernière adresse connue du serveur.",
            category: "storage",
            available: !syncRecovery.connected || syncRecovery.recoveryAvailable,
            warningWhenMissing: syncRecovery.connected,
            value: syncRecovery.connected
                ? syncRecovery.recoveryAvailable
                    ? `Protégée · ${syncRecovery.serverHost || "serveur enregistré"}`
                    : "Connexion active sans copie de secours"
                : syncRecovery.addressAvailable
                    ? `Adresse mémorisée · ${syncRecovery.serverHost}`
                    : "Aucun serveur configuré"
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
            spotifyApi,
            featureModules,
            prefetchRules,
            networkProfile: normalizedNetworkProfile,
            performanceBudget: normalizedPerformanceBudget,
            runtimeState,
            storage,
            experienceMode: normalizedExperienceMode,
            serverSyncRecovery: syncRecovery,
            serverSyncHealth: normalizedServerHealth,
            staleCacheCount: Math.max(0, normalizeNumber(staleCacheCount))
        }
    };
}

export function buildAppHealthExport(snapshot = {}, extras = {}) {
    return {
        format: "shuffleplus-app-health",
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        privacy: "Aucun titre, playlist, jeton Spotify, Client ID complet ou identifiant personnel n’est inclus.",
        snapshot,
        architecture: {
            loadedModules: Array.isArray(extras.loadedModules)
                ? extras.loadedModules
                : snapshot?.runtime?.featureModules || [],
            prefetchRules: Array.isArray(extras.prefetchRules)
                ? extras.prefetchRules
                : snapshot?.runtime?.prefetchRules || [],
            networkProfile: extras.networkProfile || snapshot?.runtime?.networkProfile || {},
            performanceBudget: extras.performanceBudget || snapshot?.runtime?.performanceBudget || {},
            storageMigration: extras.storageMigration || snapshot?.runtime?.storage || {},
            runtimeState: extras.runtimeState || snapshot?.runtime?.runtimeState || {},
            serverSyncHealth: extras.serverSyncHealth || snapshot?.runtime?.serverSyncHealth || {}
        }
    };
}
