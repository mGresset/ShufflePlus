// Taxonomie centralisée des erreurs Spotify / lancement de Shuffle+.
//
// Chaque erreur expose un code stable, un message destiné à l’utilisateur,
// un message de diagnostic (sans secret), l’indication « retryable » et une
// action conseillée. Les anciens codes restent reconnus pour ne casser aucun
// diagnostic ni aucun raccourci existant.

export const SPOTIFY_ERROR_CODES = Object.freeze({
    SPOTIFY_REAUTH_REQUIRED: "SPOTIFY_REAUTH_REQUIRED",
    SPOTIFY_RATE_LIMITED: "SPOTIFY_RATE_LIMITED",
    SPOTIFY_PREMIUM_REQUIRED: "SPOTIFY_PREMIUM_REQUIRED",
    SPOTIFY_DEVICE_RESTRICTED: "SPOTIFY_DEVICE_RESTRICTED",
    PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE: "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE",
    PREFERRED_DEVICE_AMBIGUOUS: "PREFERRED_DEVICE_AMBIGUOUS",
    PREFERRED_DEVICE_NOT_CONFIGURED: "PREFERRED_DEVICE_NOT_CONFIGURED",
    SPOTIFY_CONNECT_NOT_READY: "SPOTIFY_CONNECT_NOT_READY",
    PLAYBACK_NOT_CONFIRMED: "PLAYBACK_NOT_CONFIRMED",
    OFFLINE: "OFFLINE",
    LAUNCH_CANCELLED: "LAUNCH_CANCELLED",
    LAUNCH_TIMEOUT: "LAUNCH_TIMEOUT"
});

const DEFINITIONS = Object.freeze({
    SPOTIFY_REAUTH_REQUIRED: {
        userMessage:
            "Spotify demande une nouvelle autorisation. Tes profils, ton iPhone préféré et tes réglages sont conservés.",
        retryable: false,
        suggestedAction: "reconnect"
    },
    SPOTIFY_RATE_LIMITED: {
        userMessage:
            "Spotify demande de patienter quelques instants avant la prochaine commande.",
        retryable: true,
        suggestedAction: "retry-later"
    },
    SPOTIFY_PREMIUM_REQUIRED: {
        userMessage:
            "La commande à distance de la lecture nécessite un compte Spotify Premium.",
        retryable: false,
        suggestedAction: "premium"
    },
    SPOTIFY_DEVICE_RESTRICTED: {
        userMessage:
            "Spotify détecte l’appareil, mais interdit son contrôle à distance.",
        retryable: false,
        suggestedAction: "open-spotify"
    },
    PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE: {
        userMessage:
            "Ton iPhone préféré n’est pas encore annoncé par Spotify Connect. Aucun autre appareil n’a été utilisé et ta préférence est conservée.",
        retryable: true,
        suggestedAction: "open-spotify"
    },
    PREFERRED_DEVICE_AMBIGUOUS: {
        userMessage:
            "Plusieurs appareils ressemblent à ton iPhone préféré. Confirme le bon appareil dans Réglages > Appareil Spotify préféré.",
        retryable: false,
        suggestedAction: "confirm-device"
    },
    PREFERRED_DEVICE_NOT_CONFIGURED: {
        userMessage:
            "Aucun iPhone préféré n’est encore enregistré. Choisis-le une fois dans Réglages > Appareil Spotify préféré.",
        retryable: false,
        suggestedAction: "settings"
    },
    SPOTIFY_CONNECT_NOT_READY: {
        userMessage:
            "Spotify Connect démarre encore. Shuffle+ réessaie automatiquement.",
        retryable: true,
        suggestedAction: "wait"
    },
    PLAYBACK_NOT_CONFIRMED: {
        userMessage:
            "Spotify a reçu la commande, mais la lecture n’a pas été confirmée sur le bon appareil.",
        retryable: true,
        suggestedAction: "open-spotify"
    },
    OFFLINE: {
        userMessage:
            "Connexion Internet indisponible. Tes données sont conservées ; réessaie quand le réseau revient.",
        retryable: true,
        suggestedAction: "wait-online"
    },
    LAUNCH_CANCELLED: {
        userMessage: "Le lancement a été annulé.",
        retryable: true,
        suggestedAction: "retry"
    },
    LAUNCH_TIMEOUT: {
        userMessage:
            "Le lancement a dépassé le délai prévu. Aucune lecture n’a été envoyée vers un autre appareil.",
        retryable: true,
        suggestedAction: "retry"
    }
});

// Anciens codes conservés pour la compatibilité des diagnostics existants.
const LEGACY_ALIASES = Object.freeze({
    PREFERRED_DEVICE_UNAVAILABLE: "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE",
    SPOTIFY_RATE_LIMIT: "SPOTIFY_RATE_LIMITED",
    SPOTIFY_QUOTA: "SPOTIFY_RATE_LIMITED"
});

function cleanText(value, maxLength = 400) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

export function getSpotifyErrorDefinition(code = "") {
    const normalized = cleanText(String(code || ""), 120).toUpperCase();
    const canonical = LEGACY_ALIASES[normalized] || normalized;
    const definition = DEFINITIONS[canonical];

    return definition
        ? { code: canonical, ...definition }
        : null;
}

export class ShufflePlusSpotifyError extends Error {
    constructor(code, {
        message = "",
        diagnosticMessage = "",
        status = 0,
        retryAfter = "",
        cause = null,
        details = null
    } = {}) {
        const definition = getSpotifyErrorDefinition(code) || {
            code: cleanText(String(code || "LAUNCH_FAILED"), 120) || "LAUNCH_FAILED",
            userMessage: "Une erreur inattendue a empêché l’opération.",
            retryable: true,
            suggestedAction: "retry"
        };

        super(message || definition.userMessage);
        this.name = "ShufflePlusSpotifyError";
        this.code = definition.code;
        this.userMessage = message || definition.userMessage;
        this.diagnosticMessage = cleanText(diagnosticMessage, 400);
        this.retryable = definition.retryable;
        this.suggestedAction = definition.suggestedAction;
        if (status) this.status = Number(status) || 0;
        if (retryAfter) this.retryAfter = String(retryAfter);
        if (details) this.details = details;
        if (cause) this.cause = cause;
    }
}

export function createSpotifyError(code, options = {}) {
    return new ShufflePlusSpotifyError(code, options);
}

export function isAbortError(error) {
    return Boolean(
        error &&
        (error.name === "AbortError" ||
            error.code === "LAUNCH_CANCELLED" ||
            error.code === "LAUNCH_TIMEOUT")
    );
}

// Convertit n’importe quelle erreur (Spotify, réseau, OAuth, lancement) en
// code canonique. Ne lève jamais.
export function normalizeSpotifyErrorCode(error, { online = true } = {}) {
    if (!error) return "";
    const code = cleanText(String(error.code || ""), 120).toUpperCase();
    const reason = cleanText(String(error.reason || ""), 120).toUpperCase();
    const status = Number(error.status || 0);
    const message = String(error.message || "");

    if (DEFINITIONS[code]) return code;
    if (LEGACY_ALIASES[code]) return LEGACY_ALIASES[code];
    if (online === false || /failed to fetch|networkerror|load failed|hors connexion/i.test(message) ||
        code === "SPOTIFY_REFRESH_NETWORK_ERROR") {
        return "OFFLINE";
    }
    if (status === 401) return "SPOTIFY_REAUTH_REQUIRED";
    if (status === 429 || reason === "QUOTA_EXCEEDED") return "SPOTIFY_RATE_LIMITED";
    if (status === 403 && (reason === "PREMIUM_REQUIRED" || /premium/i.test(message))) {
        return "SPOTIFY_PREMIUM_REQUIRED";
    }
    return code || (status ? `SPOTIFY_${status}` : "");
}

export function describeSpotifyError(error, options = {}) {
    const code = normalizeSpotifyErrorCode(error, options) || "LAUNCH_FAILED";
    const definition = getSpotifyErrorDefinition(code);

    return {
        code,
        userMessage: cleanText(error?.userMessage, 500) ||
            definition?.userMessage ||
            cleanText(error?.message, 500) ||
            "Une erreur inattendue a empêché l’opération.",
        diagnosticMessage: cleanText(error?.diagnosticMessage || error?.message, 400),
        retryable: definition ? definition.retryable : true,
        suggestedAction: definition?.suggestedAction || "retry"
    };
}
