import {
    AUTH_STORAGE_KEYS,
    safeStorageGet,
    safeStorageRemove,
    safeStorageSet
} from "./session-recovery.js";

export const SPOTIFY_APP_CONFIG_KEY =
    "shuffleplus_spotify_app_config_v1";

const CLIENT_ID_PATTERN = /^[A-Za-z0-9]{20,64}$/;

export function normalizeSpotifyClientId(value = "") {
    return String(value || "")
        .trim()
        .replaceAll(/\s+/g, "")
        .slice(0, 64);
}

export function isValidSpotifyClientId(value = "") {
    return CLIENT_ID_PATTERN.test(
        normalizeSpotifyClientId(value)
    );
}

export function normalizeSpotifyAppConfiguration(value = {}) {
    const clientId = normalizeSpotifyClientId(value.clientId);

    return {
        clientId: isValidSpotifyClientId(clientId)
            ? clientId
            : "",
        redirectUri:
            typeof value.redirectUri === "string"
                ? value.redirectUri.trim().slice(0, 500)
                : "",
        source:
            value.source === "legacy-migration"
                ? "legacy-migration"
                : "user",
        configuredAt: Math.max(
            0,
            Number(value.configuredAt || 0)
        ),
        updatedAt: Math.max(
            0,
            Number(value.updatedAt || value.configuredAt || 0)
        )
    };
}

export function readSpotifyAppConfiguration(
    storage = globalThis.localStorage
) {
    try {
        const raw = safeStorageGet(
            storage,
            SPOTIFY_APP_CONFIG_KEY
        );

        if (!raw) {
            return normalizeSpotifyAppConfiguration();
        }

        return normalizeSpotifyAppConfiguration(
            JSON.parse(raw)
        );
    } catch {
        return normalizeSpotifyAppConfiguration();
    }
}

export function saveSpotifyAppConfiguration(
    storage = globalThis.localStorage,
    configuration = {}
) {
    const normalized = normalizeSpotifyAppConfiguration({
        ...configuration,
        configuredAt:
            Number(configuration.configuredAt || 0) ||
            Date.now(),
        updatedAt: Date.now()
    });

    if (!normalized.clientId) {
        return {
            saved: false,
            configuration: normalized,
            error: "INVALID_CLIENT_ID"
        };
    }

    const saved = safeStorageSet(
        storage,
        SPOTIFY_APP_CONFIG_KEY,
        JSON.stringify(normalized)
    );

    return {
        saved,
        configuration: normalized,
        error: saved ? "" : "STORAGE_BLOCKED"
    };
}

export function clearSpotifyAppConfiguration(
    storage = globalThis.localStorage
) {
    return safeStorageRemove(
        storage,
        SPOTIFY_APP_CONFIG_KEY
    );
}

export function getConfiguredSpotifyClientId(
    storage = globalThis.localStorage
) {
    return readSpotifyAppConfiguration(storage).clientId;
}

export function maskSpotifyClientId(value = "") {
    const normalized = normalizeSpotifyClientId(value);

    if (!normalized) {
        return "Non configuré";
    }

    if (normalized.length <= 10) {
        return `${normalized.slice(0, 3)}•••`;
    }

    return `${normalized.slice(0, 6)}••••••${normalized.slice(-4)}`;
}

export function hasLegacySpotifyAuthEvidence({
    local = globalThis.localStorage,
    session = globalThis.sessionStorage
} = {}) {
    return Boolean(
        safeStorageGet(local, AUTH_STORAGE_KEYS.accessToken) ||
        safeStorageGet(local, AUTH_STORAGE_KEYS.refreshToken) ||
        safeStorageGet(local, AUTH_STORAGE_KEYS.authorizedAt) ||
        safeStorageGet(session, AUTH_STORAGE_KEYS.codeVerifier) ||
        safeStorageGet(session, AUTH_STORAGE_KEYS.oauthState)
    );
}

export function migrateLegacySpotifyClientId({
    local = globalThis.localStorage,
    session = globalThis.sessionStorage,
    legacyClientId = "",
    redirectUri = ""
} = {}) {
    const existing = readSpotifyAppConfiguration(local);

    if (existing.clientId) {
        return {
            migrated: false,
            configuration: existing,
            reason: "already-configured"
        };
    }

    if (!hasLegacySpotifyAuthEvidence({ local, session })) {
        return {
            migrated: false,
            configuration: existing,
            reason: "new-installation"
        };
    }

    const normalizedLegacy = normalizeSpotifyClientId(
        legacyClientId
    );

    if (!isValidSpotifyClientId(normalizedLegacy)) {
        return {
            migrated: false,
            configuration: existing,
            reason: "invalid-legacy-client-id"
        };
    }

    const result = saveSpotifyAppConfiguration(local, {
        clientId: normalizedLegacy,
        redirectUri,
        source: "legacy-migration"
    });

    return {
        migrated: result.saved,
        configuration: result.configuration,
        reason: result.saved
            ? "legacy-session"
            : result.error
    };
}
