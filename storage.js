const STORAGE_KEYS = {
    accessToken: "shuffleplus_access_token",
    refreshToken: "shuffleplus_refresh_token",
    expiresAt: "shuffleplus_expires_at",
    authorizedAt: "shuffleplus_authorized_at",
    codeVerifier: "shuffleplus_code_verifier",
    oauthState: "shuffleplus_oauth_state"
};

export function saveTemporaryAuth(codeVerifier, state) {
    sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
    sessionStorage.setItem(STORAGE_KEYS.oauthState, state);
}

export function getTemporaryAuth() {
    return {
        codeVerifier: sessionStorage.getItem(STORAGE_KEYS.codeVerifier),
        state: sessionStorage.getItem(STORAGE_KEYS.oauthState)
    };
}

export function clearTemporaryAuth() {
    sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
    sessionStorage.removeItem(STORAGE_KEYS.oauthState);
}

export function saveTokens(
    tokenData,
    { markAuthorization = false } = {}
) {
    if (tokenData.access_token) {
        localStorage.setItem(
            STORAGE_KEYS.accessToken,
            tokenData.access_token
        );
    }

    if (tokenData.refresh_token) {
        localStorage.setItem(
            STORAGE_KEYS.refreshToken,
            tokenData.refresh_token
        );
    }

    if (tokenData.expires_in) {
        const expiresAt = Date.now() + tokenData.expires_in * 1000;

        localStorage.setItem(
            STORAGE_KEYS.expiresAt,
            String(expiresAt)
        );
    }

    if (markAuthorization) {
        localStorage.setItem(
            STORAGE_KEYS.authorizedAt,
            String(Date.now())
        );
    }
}

export function getStoredTokens() {
    return {
        accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
        refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
        expiresAt: Number(
            localStorage.getItem(STORAGE_KEYS.expiresAt) || 0
        ),
        authorizedAt: Number(
            localStorage.getItem(STORAGE_KEYS.authorizedAt) || 0
        )
    };
}

export function clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.expiresAt);
    localStorage.removeItem(STORAGE_KEYS.authorizedAt);
}
