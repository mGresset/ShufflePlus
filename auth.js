import { CONFIG } from "./config.js";

import {
    saveTemporaryAuth,
    getTemporaryAuth,
    clearTemporaryAuth,
    saveTokens,
    getStoredTokens,
    clearTokens,
    repairStoredSpotifySession
} from "./storage.js";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

let refreshPromise = null;

export class SpotifyAuthError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = "SpotifyAuthError";
        this.code = code;
        this.details = details;
    }
}

export function isSpotifyReauthorizationRequired(error) {
    return error?.code === "SPOTIFY_REAUTH_REQUIRED";
}

function generateRandomString(length = 64) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    return Array.from(randomValues)
        .map((value) => characters[value % characters.length])
        .join("");
}

function base64UrlEncode(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

async function createCodeChallenge(codeVerifier) {
    const encodedVerifier = new TextEncoder().encode(codeVerifier);

    const digest = await crypto.subtle.digest(
        "SHA-256",
        encodedVerifier
    );

    return base64UrlEncode(digest);
}

async function readJsonResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return { error_description: text };
    }
}

export async function loginWithSpotify() {
    if (!CONFIG.clientId || CONFIG.clientId === "TON_CLIENT_ID_SPOTIFY") {
        throw new Error(
            "Aucun Client ID Spotify personnel n’est configuré. Termine d’abord l’assistant Shuffle+."
        );
    }

    const codeVerifier = generateRandomString(64);
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    const temporaryAuthSaved = saveTemporaryAuth(codeVerifier, state);

    if (!temporaryAuthSaved) {
        throw new SpotifyAuthError(
            "Le navigateur empêche Shuffle+ de préparer la connexion Spotify. Autorise le stockage du site ou utilise « Réparer Shuffle+ ».",
            "SPOTIFY_AUTH_STORAGE_BLOCKED"
        );
    }

    const parameters = new URLSearchParams({
        client_id: CONFIG.clientId,
        response_type: "code",
        redirect_uri: CONFIG.redirectUri,
        scope: CONFIG.scopes.join(" "),
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state
    });

    window.location.assign(
        `${AUTHORIZE_URL}?${parameters.toString()}`
    );
}

export async function handleSpotifyCallback() {
    const parameters = new URLSearchParams(window.location.search);

    const code = parameters.get("code");
    const returnedState = parameters.get("state");
    const error = parameters.get("error");

    if (error) {
        clearTemporaryAuth();

        throw new SpotifyAuthError(
            `Spotify a refusé la connexion : ${error}`,
            "SPOTIFY_AUTH_DENIED",
            { error }
        );
    }

    if (!code) {
        return false;
    }

    const { codeVerifier, state } = getTemporaryAuth();

    if (!codeVerifier) {
        throw new SpotifyAuthError(
            "Le code PKCE est introuvable. Recommence la connexion.",
            "SPOTIFY_PKCE_MISSING"
        );
    }

    if (!state || returnedState !== state) {
        clearTemporaryAuth();

        throw new SpotifyAuthError(
            "La vérification de sécurité OAuth a échoué.",
            "SPOTIFY_STATE_MISMATCH"
        );
    }

    const body = new URLSearchParams({
        client_id: CONFIG.clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: CONFIG.redirectUri,
        code_verifier: codeVerifier
    });

    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body
    });

    const tokenData = await readJsonResponse(response);

    if (!response.ok) {
        clearTemporaryAuth();
        console.error("Erreur token Spotify :", tokenData);

        throw new SpotifyAuthError(
            tokenData.error_description ||
            tokenData.error ||
            "Impossible de terminer la connexion Spotify.",
            "SPOTIFY_TOKEN_EXCHANGE_FAILED",
            tokenData
        );
    }

    saveTokens(tokenData, { markAuthorization: true });
    clearTemporaryAuth();

    window.history.replaceState(
        {},
        document.title,
        CONFIG.redirectUri
    );

    return true;
}

const REAUTH_MESSAGE =
    "Spotify demande une nouvelle autorisation. Tes profils, ton iPhone préféré et tes réglages sont conservés.";
const ACCESS_TOKEN_SAFETY_MARGIN_MS = 60_000;

const sessionDiagnostics = {
    lastRefreshAt: 0,
    lastRefreshOutcome: "",
    lastRefreshErrorCode: "",
    refreshCount: 0,
    refreshFailureCount: 0,
    forcedRefreshCount: 0,
    rotatedRefreshTokenCount: 0,
    reauthRequiredAt: 0
};

function createReauthError(details = null) {
    sessionDiagnostics.reauthRequiredAt = Date.now();
    return new SpotifyAuthError(
        REAUTH_MESSAGE,
        "SPOTIFY_REAUTH_REQUIRED",
        details
    );
}

function notifySessionEvent(type, detail = {}) {
    try {
        globalThis.dispatchEvent?.(
            new CustomEvent("shuffleplus:spotify-session", {
                detail: { type, at: Date.now(), ...detail }
            })
        );
    } catch {
        // Les diagnostics de session ne doivent jamais bloquer Spotify.
    }
}

async function refreshAccessToken(
    refreshToken,
    { allowRotatedRetry = true } = {}
) {
    const body = new URLSearchParams({
        client_id: CONFIG.clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken
    });

    let response;

    try {
        response = await fetch(TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body
        });
    } catch (error) {
        // Une erreur réseau ne supprime JAMAIS le refresh token, l’iPhone
        // préféré, les profils ni les réglages.
        sessionDiagnostics.lastRefreshOutcome = "network-error";
        sessionDiagnostics.lastRefreshErrorCode = "SPOTIFY_REFRESH_NETWORK_ERROR";
        sessionDiagnostics.refreshFailureCount += 1;
        notifySessionEvent("SPOTIFY_REFRESH_FAILED", {
            code: "SPOTIFY_REFRESH_NETWORK_ERROR"
        });
        throw new SpotifyAuthError(
            "Impossible de joindre Spotify pour renouveler la session.",
            "SPOTIFY_REFRESH_NETWORK_ERROR",
            error
        );
    }

    const tokenData = await readJsonResponse(response);

    if (!response.ok) {
        console.error(
            "Erreur de renouvellement Spotify :",
            response.status,
            tokenData?.error || ""
        );
        sessionDiagnostics.refreshFailureCount += 1;

        if (tokenData.error === "invalid_grant") {
            // Un autre onglet a peut-être déjà fait tourner le refresh token :
            // on réessaie une seule fois avec la valeur la plus récente au
            // lieu d’effacer un jeton valide.
            const latest = getStoredTokens().refreshToken;

            if (allowRotatedRetry && latest && latest !== refreshToken) {
                return refreshAccessToken(latest, { allowRotatedRetry: false });
            }

            sessionDiagnostics.lastRefreshOutcome = "reauth-required";
            sessionDiagnostics.lastRefreshErrorCode = "SPOTIFY_REAUTH_REQUIRED";
            notifySessionEvent("SPOTIFY_REFRESH_FAILED", {
                code: "SPOTIFY_REAUTH_REQUIRED"
            });
            // Seuls les jetons Spotify devenus invalides sont retirés.
            clearTokens();

            throw createReauthError({ error: tokenData.error });
        }

        sessionDiagnostics.lastRefreshOutcome = "failed";
        sessionDiagnostics.lastRefreshErrorCode = "SPOTIFY_REFRESH_FAILED";
        notifySessionEvent("SPOTIFY_REFRESH_FAILED", {
            code: "SPOTIFY_REFRESH_FAILED",
            status: response.status
        });

        throw new SpotifyAuthError(
            tokenData.error_description ||
            tokenData.error ||
            "Le renouvellement de la session Spotify a échoué.",
            "SPOTIFY_REFRESH_FAILED",
            { error: tokenData.error || "", status: response.status }
        );
    }

    // Rotation : un nouveau refresh_token est enregistré ; s’il est absent,
    // saveTokens() conserve l’ancien (jamais effacé).
    if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
        sessionDiagnostics.rotatedRefreshTokenCount += 1;
    }
    saveTokens(tokenData);
    sessionDiagnostics.lastRefreshAt = Date.now();
    sessionDiagnostics.lastRefreshOutcome = "ok";
    sessionDiagnostics.lastRefreshErrorCode = "";
    sessionDiagnostics.refreshCount += 1;
    sessionDiagnostics.reauthRequiredAt = 0;
    notifySessionEvent("SPOTIFY_REFRESH_OK");

    return tokenData.access_token;
}

// Single-flight : plusieurs appels simultanés partagent UNE seule requête.
async function refreshAccessTokenOnce(refreshToken) {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken(refreshToken)
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

export async function getValidAccessToken() {
    const tokens = getStoredTokens();
    const safetyMargin = ACCESS_TOKEN_SAFETY_MARGIN_MS;

    if (
        tokens.accessToken &&
        Date.now() < tokens.expiresAt - safetyMargin
    ) {
        return tokens.accessToken;
    }

    if (!tokens.refreshToken) {
        return null;
    }

    return refreshAccessTokenOnce(tokens.refreshToken);
}

// Utilisé après un HTTP 401 : force UN renouvellement (partagé), même si
// l’access token semble encore valide localement.
export async function forceRefreshAccessToken() {
    const tokens = getStoredTokens();

    if (!tokens.refreshToken) {
        throw createReauthError();
    }

    sessionDiagnostics.forcedRefreshCount += 1;
    return refreshAccessTokenOnce(tokens.refreshToken);
}

export function requireReauthorization(details = null) {
    return createReauthError(details);
}

export function getSpotifySessionDiagnostics() {
    const tokens = getStoredTokens();
    return {
        connected: Boolean(tokens.accessToken || tokens.refreshToken),
        hasRefreshToken: Boolean(tokens.refreshToken),
        accessTokenExpiresAt: tokens.expiresAt || 0,
        accessTokenValid: Boolean(
            tokens.accessToken &&
            Date.now() < tokens.expiresAt - ACCESS_TOKEN_SAFETY_MARGIN_MS
        ),
        authorizedAt: tokens.authorizedAt || 0,
        refreshInFlight: Boolean(refreshPromise),
        ...sessionDiagnostics
    };
}

export const spotifySessionManager = Object.freeze({
    getValidAccessToken,
    refreshAccessToken: forceRefreshAccessToken,
    forceRefresh: forceRefreshAccessToken,
    requireReauthorization,
    getDiagnostics: getSpotifySessionDiagnostics
});

export function repairSpotifyAuthState(options = {}) {
    return repairStoredSpotifySession(options);
}

export function logoutSpotify() {
    clearTokens();
    clearTemporaryAuth();
}
