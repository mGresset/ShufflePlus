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

async function refreshAccessToken(refreshToken) {
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
        throw new SpotifyAuthError(
            "Impossible de joindre Spotify pour renouveler la session.",
            "SPOTIFY_REFRESH_NETWORK_ERROR",
            error
        );
    }

    const tokenData = await readJsonResponse(response);

    if (!response.ok) {
        console.error("Erreur de renouvellement Spotify :", tokenData);

        if (tokenData.error === "invalid_grant") {
            clearTokens();

            throw new SpotifyAuthError(
                "Spotify demande une nouvelle autorisation. Appuie sur « Se reconnecter à Spotify ».",
                "SPOTIFY_REAUTH_REQUIRED",
                tokenData
            );
        }

        throw new SpotifyAuthError(
            tokenData.error_description ||
            tokenData.error ||
            "Le renouvellement de la session Spotify a échoué.",
            "SPOTIFY_REFRESH_FAILED",
            tokenData
        );
    }

    saveTokens(tokenData);

    return tokenData.access_token;
}

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
    const safetyMargin = 60_000;

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

export function repairSpotifyAuthState(options = {}) {
    return repairStoredSpotifySession(options);
}

export function logoutSpotify() {
    clearTokens();
    clearTemporaryAuth();
}
