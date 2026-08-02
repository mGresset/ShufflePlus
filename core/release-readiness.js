export const FINALIZATION_CHECKS = [
    {
        id: "spotify-playback",
        label: "Lecture Spotify réelle",
        description: "Un profil a été lancé et la lecture a été confirmée sur un appareil Spotify Connect."
    },
    {
        id: "iphone-pwa",
        label: "PWA sur iPhone",
        description: "L’installation, la réouverture et la mise à jour ont été vérifiées sur Safari iOS."
    },
    {
        id: "railway-sync",
        label: "Synchronisation Railway",
        description: "Un envoi puis une récupération ont été réalisés sur deux sessions ou appareils."
    },
    {
        id: "backup-restore",
        label: "Sauvegarde et restauration",
        description: "Une sauvegarde JSON a été exportée puis restaurée sans perte de réglages."
    },
    {
        id: "driving-mode",
        label: "Mode conduite réel",
        description: "Les commandes, le verrouillage, la file et le maintien d’écran ont été testés sur mobile."
    }
];

export const DEFAULT_FINALIZATION_STATE = {
    schemaVersion: 1,
    confirmations: {},
    updatedAt: 0
};

function normalizeTimestamp(value = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0
        ? numeric
        : 0;
}

export function normalizeFinalizationState(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    const confirmations = source.confirmations && typeof source.confirmations === "object"
        ? source.confirmations
        : {};

    return {
        schemaVersion: 1,
        confirmations: Object.fromEntries(
            FINALIZATION_CHECKS.map((check) => {
                const raw = confirmations[check.id];
                const entry = raw && typeof raw === "object" ? raw : {};
                return [
                    check.id,
                    {
                        confirmed: entry.confirmed === true,
                        confirmedAt: entry.confirmed === true
                            ? normalizeTimestamp(entry.confirmedAt)
                            : 0
                    }
                ];
            })
        ),
        updatedAt: normalizeTimestamp(source.updatedAt)
    };
}

export function updateFinalizationConfirmation(
    state,
    checkId,
    confirmed,
    now = Date.now()
) {
    const normalized = normalizeFinalizationState(state);
    const known = FINALIZATION_CHECKS.some((check) => check.id === checkId);

    if (!known) return normalized;

    return {
        ...normalized,
        confirmations: {
            ...normalized.confirmations,
            [checkId]: {
                confirmed: confirmed === true,
                confirmedAt: confirmed === true ? now : 0
            }
        },
        updatedAt: now
    };
}

function automaticCheck(snapshot, id, fallback = false) {
    const check = snapshot?.checks?.find((item) => item.id === id);
    return check ? check.available === true : fallback;
}

export function buildReleaseReadiness({
    appVersion = "",
    healthSnapshot = null,
    finalizationState = DEFAULT_FINALIZATION_STATE,
    buildValidated = true,
    serverTestsValidated = true
} = {}) {
    const state = normalizeFinalizationState(finalizationState);
    const automaticChecks = [
        {
            id: "secure-context",
            label: "Connexion HTTPS",
            passed: automaticCheck(healthSnapshot, "secure-context"),
            required: true
        },
        {
            id: "local-storage",
            label: "Stockage local",
            passed: automaticCheck(healthSnapshot, "local-storage"),
            required: true
        },
        {
            id: "storage-schema",
            label: "Migrations des données",
            passed: automaticCheck(healthSnapshot, "storage-schema"),
            required: true
        },
        {
            id: "feature-loader",
            label: "Modules sans erreur",
            passed: automaticCheck(healthSnapshot, "feature-loader"),
            required: true
        },
        {
            id: "build-validation",
            label: "Build de production",
            passed: buildValidated === true,
            required: true
        },
        {
            id: "server-tests",
            label: "Tests du serveur",
            passed: serverTestsValidated === true,
            required: true
        }
    ];
    const fieldChecks = FINALIZATION_CHECKS.map((check) => ({
        ...check,
        confirmed: state.confirmations[check.id]?.confirmed === true,
        confirmedAt: state.confirmations[check.id]?.confirmedAt || 0
    }));
    const automaticPassed = automaticChecks.filter((check) => check.passed).length;
    const fieldPassed = fieldChecks.filter((check) => check.confirmed).length;
    const automaticScore = automaticChecks.length
        ? automaticPassed / automaticChecks.length
        : 1;
    const fieldScore = fieldChecks.length
        ? fieldPassed / fieldChecks.length
        : 1;
    const score = Math.round((automaticScore * 0.6 + fieldScore * 0.4) * 100);
    const blockingChecks = automaticChecks.filter((check) => check.required && !check.passed);
    const status = blockingChecks.length
        ? {
            id: "blocked",
            label: "Préparation bloquée",
            icon: "⛔",
            message: `${blockingChecks.length} contrôle(s) automatique(s) doivent être corrigés.`
        }
        : fieldPassed < fieldChecks.length
            ? {
                id: "candidate",
                label: "Candidate v10",
                icon: "🧪",
                message: `${fieldChecks.length - fieldPassed} validation(s) terrain restent à confirmer.`
            }
            : {
                id: "ready",
                label: "Prête pour v10",
                icon: "✅",
                message: "Tous les contrôles automatiques et terrain sont confirmés."
            };

    return {
        schemaVersion: 1,
        appVersion: String(appVersion || ""),
        score,
        status,
        automaticChecks,
        fieldChecks,
        automaticPassed,
        automaticTotal: automaticChecks.length,
        fieldPassed,
        fieldTotal: fieldChecks.length,
        blockingCount: blockingChecks.length,
        updatedAt: state.updatedAt
    };
}

export function buildReleaseReadinessExport(readiness = {}, finalizationState = {}) {
    return {
        format: "shuffleplus-release-readiness",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        privacy: "Le rapport ne contient aucun jeton Spotify, titre, playlist, nom d’appareil ou secret Railway.",
        readiness,
        finalizationState: normalizeFinalizationState(finalizationState)
    };
}
