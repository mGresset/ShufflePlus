import {
    AUTH_STORAGE_KEYS,
    clearSpotifyAuthentication,
    repairSpotifyAuthState,
    safeStorageGet,
    safeStorageRemove,
    safeStorageSet
} from "./core/session-recovery.js";

export function saveTemporaryAuth(codeVerifier, state) {
    const saved = [
        safeStorageSet(
            sessionStorage,
            AUTH_STORAGE_KEYS.codeVerifier,
            codeVerifier
        ),
        safeStorageSet(
            sessionStorage,
            AUTH_STORAGE_KEYS.oauthState,
            state
        ),
        safeStorageSet(
            sessionStorage,
            AUTH_STORAGE_KEYS.authStartedAt,
            Date.now()
        )
    ];

    return saved.every(Boolean);
}

export function getTemporaryAuth() {
    return {
        codeVerifier: safeStorageGet(
            sessionStorage,
            AUTH_STORAGE_KEYS.codeVerifier
        ),
        state: safeStorageGet(
            sessionStorage,
            AUTH_STORAGE_KEYS.oauthState
        ),
        startedAt: Number(
            safeStorageGet(
                sessionStorage,
                AUTH_STORAGE_KEYS.authStartedAt
            ) || 0
        )
    };
}

export function clearTemporaryAuth() {
    safeStorageRemove(
        sessionStorage,
        AUTH_STORAGE_KEYS.codeVerifier
    );
    safeStorageRemove(
        sessionStorage,
        AUTH_STORAGE_KEYS.oauthState
    );
    safeStorageRemove(
        sessionStorage,
        AUTH_STORAGE_KEYS.authStartedAt
    );
}

export function saveTokens(
    tokenData,
    { markAuthorization = false } = {}
) {
    if (tokenData.access_token) {
        safeStorageSet(
            localStorage,
            AUTH_STORAGE_KEYS.accessToken,
            tokenData.access_token
        );
    }

    if (tokenData.refresh_token) {
        safeStorageSet(
            localStorage,
            AUTH_STORAGE_KEYS.refreshToken,
            tokenData.refresh_token
        );
    }

    if (tokenData.expires_in) {
        const expiresAt = Date.now() + tokenData.expires_in * 1000;

        safeStorageSet(
            localStorage,
            AUTH_STORAGE_KEYS.expiresAt,
            expiresAt
        );
    }

    if (markAuthorization) {
        safeStorageSet(
            localStorage,
            AUTH_STORAGE_KEYS.authorizedAt,
            Date.now()
        );
    }
}

export function getStoredTokens() {
    return {
        accessToken: safeStorageGet(
            localStorage,
            AUTH_STORAGE_KEYS.accessToken
        ),
        refreshToken: safeStorageGet(
            localStorage,
            AUTH_STORAGE_KEYS.refreshToken
        ),
        expiresAt: Number(
            safeStorageGet(
                localStorage,
                AUTH_STORAGE_KEYS.expiresAt
            ) || 0
        ),
        authorizedAt: Number(
            safeStorageGet(
                localStorage,
                AUTH_STORAGE_KEYS.authorizedAt
            ) || 0
        )
    };
}

export function repairStoredSpotifySession(options = {}) {
    return repairSpotifyAuthState({
        local: globalThis.localStorage,
        session: globalThis.sessionStorage,
        ...options
    });
}

export function clearTokens() {
    safeStorageRemove(
        localStorage,
        AUTH_STORAGE_KEYS.accessToken
    );
    safeStorageRemove(
        localStorage,
        AUTH_STORAGE_KEYS.refreshToken
    );
    safeStorageRemove(
        localStorage,
        AUTH_STORAGE_KEYS.expiresAt
    );
    safeStorageRemove(
        localStorage,
        AUTH_STORAGE_KEYS.authorizedAt
    );
}

export function clearAllSpotifyAuthentication() {
    return clearSpotifyAuthentication({
        local: globalThis.localStorage,
        session: globalThis.sessionStorage
    });
}
