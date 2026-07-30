export const AUTH_STORAGE_KEYS = Object.freeze({
    accessToken: "shuffleplus_access_token",
    refreshToken: "shuffleplus_refresh_token",
    expiresAt: "shuffleplus_expires_at",
    authorizedAt: "shuffleplus_authorized_at",
    codeVerifier: "shuffleplus_code_verifier",
    oauthState: "shuffleplus_oauth_state",
    authStartedAt: "shuffleplus_auth_started_at"
});

export const TEMP_AUTH_MAX_AGE_MS = 30 * 60 * 1000;

function safeCall(callback, fallback = null) {
    try {
        return callback();
    } catch {
        return fallback;
    }
}

export function safeStorageGet(storage, key) {
    return safeCall(() => storage?.getItem(key), null);
}

export function safeStorageSet(storage, key, value) {
    if (typeof storage?.setItem !== "function") {
        return false;
    }

    return safeCall(() => {
        storage.setItem(key, String(value));
        return true;
    }, false);
}

export function safeStorageRemove(storage, key) {
    if (typeof storage?.removeItem !== "function") {
        return false;
    }

    return safeCall(() => {
        storage.removeItem(key);
        return true;
    }, false);
}

function readPositiveTimestamp(storage, key) {
    const raw = safeStorageGet(storage, key);
    if (raw === null || raw === "") {
        return { raw: null, value: 0, valid: true };
    }

    const value = Number(raw);
    return {
        raw,
        value,
        valid: Number.isFinite(value) && value > 0
    };
}

function removeMany(storage, keys, repairedKeys) {
    for (const key of keys) {
        if (safeStorageRemove(storage, key)) {
            repairedKeys.push(key);
        }
    }
}

export function inspectSpotifyAuthState({
    local = globalThis.localStorage,
    session = globalThis.sessionStorage,
    now = Date.now(),
    hasOAuthCallback = false
} = {}) {
    const accessToken = safeStorageGet(local, AUTH_STORAGE_KEYS.accessToken);
    const refreshToken = safeStorageGet(local, AUTH_STORAGE_KEYS.refreshToken);
    const expiresAt = readPositiveTimestamp(local, AUTH_STORAGE_KEYS.expiresAt);
    const authorizedAt = readPositiveTimestamp(local, AUTH_STORAGE_KEYS.authorizedAt);

    const codeVerifier = safeStorageGet(session, AUTH_STORAGE_KEYS.codeVerifier);
    const oauthState = safeStorageGet(session, AUTH_STORAGE_KEYS.oauthState);
    const authStartedAt = readPositiveTimestamp(session, AUTH_STORAGE_KEYS.authStartedAt);

    const temporaryValues = [codeVerifier, oauthState].filter(Boolean).length;
    const temporaryComplete = temporaryValues === 2;
    const temporaryPartial = temporaryValues === 1;
    const temporaryExpired = Boolean(
        temporaryComplete &&
        authStartedAt.valid &&
        authStartedAt.value > 0 &&
        now - authStartedAt.value > TEMP_AUTH_MAX_AGE_MS
    );

    const issues = [];

    if (accessToken && (expiresAt.raw === null || !expiresAt.valid)) {
        issues.push("invalid_access_expiry");
    }
    if (!accessToken && expiresAt.raw !== null) {
        issues.push("orphan_access_expiry");
    }
    if (!authorizedAt.valid) {
        issues.push("invalid_authorization_date");
    }
    if (!accessToken && !refreshToken && authorizedAt.raw !== null) {
        issues.push("orphan_authorization_date");
    }
    if (temporaryPartial) {
        issues.push("partial_pkce_state");
    }
    if (temporaryComplete && authStartedAt.raw === null) {
        issues.push("missing_pkce_date");
    }
    if (temporaryComplete && !authStartedAt.valid) {
        issues.push("invalid_pkce_date");
    }
    if (!temporaryComplete && authStartedAt.raw !== null) {
        issues.push("orphan_pkce_date");
    }
    if (temporaryExpired) {
        issues.push("expired_pkce_state");
    }

    return {
        accessToken: Boolean(accessToken),
        refreshToken: Boolean(refreshToken),
        expiresAt: expiresAt.value,
        authorizedAt: authorizedAt.value,
        temporaryComplete,
        temporaryPartial,
        temporaryExpired,
        hasOAuthCallback: Boolean(hasOAuthCallback),
        hasUsableSession: Boolean(
            refreshToken ||
            (accessToken && expiresAt.valid && expiresAt.value > now)
        ),
        issues
    };
}

export function repairSpotifyAuthState({
    local = globalThis.localStorage,
    session = globalThis.sessionStorage,
    now = Date.now(),
    hasOAuthCallback = false
} = {}) {
    const before = inspectSpotifyAuthState({
        local,
        session,
        now,
        hasOAuthCallback
    });
    const repairedKeys = [];

    if (before.issues.includes("invalid_access_expiry")) {
        removeMany(
            local,
            [AUTH_STORAGE_KEYS.accessToken, AUTH_STORAGE_KEYS.expiresAt],
            repairedKeys
        );
    }

    if (before.issues.includes("orphan_access_expiry")) {
        removeMany(local, [AUTH_STORAGE_KEYS.expiresAt], repairedKeys);
    }

    if (
        before.issues.includes("invalid_authorization_date") ||
        before.issues.includes("orphan_authorization_date")
    ) {
        removeMany(local, [AUTH_STORAGE_KEYS.authorizedAt], repairedKeys);
    }

    const brokenTemporaryState =
        before.temporaryPartial ||
        before.temporaryExpired ||
        before.issues.includes("missing_pkce_date") ||
        before.issues.includes("invalid_pkce_date") ||
        before.issues.includes("orphan_pkce_date");

    // Pendant un retour OAuth, on laisse handleSpotifyCallback produire le
    // message précis si l’état PKCE est incomplet. Hors callback, on nettoie
    // automatiquement les restes d’une ancienne tentative de connexion.
    if (brokenTemporaryState && !hasOAuthCallback) {
        removeMany(
            session,
            [
                AUTH_STORAGE_KEYS.codeVerifier,
                AUTH_STORAGE_KEYS.oauthState,
                AUTH_STORAGE_KEYS.authStartedAt
            ],
            repairedKeys
        );
    }

    return {
        before,
        after: inspectSpotifyAuthState({
            local,
            session,
            now,
            hasOAuthCallback
        }),
        repaired: repairedKeys.length > 0,
        repairedKeys: [...new Set(repairedKeys)]
    };
}

export function clearSpotifyAuthentication({
    local = globalThis.localStorage,
    session = globalThis.sessionStorage
} = {}) {
    const removedKeys = [];
    removeMany(
        local,
        [
            AUTH_STORAGE_KEYS.accessToken,
            AUTH_STORAGE_KEYS.refreshToken,
            AUTH_STORAGE_KEYS.expiresAt,
            AUTH_STORAGE_KEYS.authorizedAt
        ],
        removedKeys
    );
    removeMany(
        session,
        [
            AUTH_STORAGE_KEYS.codeVerifier,
            AUTH_STORAGE_KEYS.oauthState,
            AUTH_STORAGE_KEYS.authStartedAt
        ],
        removedKeys
    );

    return [...new Set(removedKeys)];
}
