import { CONFIG } from "./config.js";

import {
    saveTemporaryAuth,
    getTemporaryAuth,
    clearTemporaryAuth,
    saveTokens,
    getStoredTokens,
    clearTokens
} from "./storage.js";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

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

export async function loginWithSpotify() {
    if (!CONFIG.clientId || CONFIG.clientId === "TON_CLIENT_ID_SPOTIFY") {
        throw new Error(
            "Le Client ID Spotify n'est pas configuré dans config.js."
        );
    }

    const codeVerifier = generateRandomString(64);
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    saveTemporaryAuth(codeVerifier, state);

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

        throw new Error(
            `Spotify a refusé la connexion : ${error}`
        );
    }

    if (!code) {
        return false;
    }

    const { codeVerifier, state } = getTemporaryAuth();

    if (!codeVerifier) {
        throw new Error(
            "Le code PKCE est introuvable. Recommence la connexion."
        );
    }

    if (!state || returnedState !== state) {
        clearTemporaryAuth();

        throw new Error(
            "La vérification de sécurité OAuth a échoué."
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

    const tokenData = await response.json();

    if (!response.ok) {
        console.error("Erreur token Spotify :", tokenData);

        throw new Error(
            tokenData.error_description ||
            tokenData.error ||
            "Impossible de terminer la connexion Spotify."
        );
    }

    saveTokens(tokenData);
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

    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body
    });

    const tokenData = await response.json();

    if (!response.ok) {
        console.error("Erreur de renouvellement Spotify :", tokenData);

        clearTokens();

        throw new Error(
            "La session Spotify a expiré. Reconnecte-toi."
        );
    }

    saveTokens(tokenData);

    return tokenData.access_token;
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

    return refreshAccessToken(tokens.refreshToken);
}

export function logoutSpotify() {
    clearTokens();
    clearTemporaryAuth();
}