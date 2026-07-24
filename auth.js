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
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => possible[value % possible.length])
    .join("");
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function createCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64UrlEncode(digest);
}

export async function loginWithSpotify() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  saveTemporaryAuth(codeVerifier, state);

  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    response_type: "code",
    redirect_uri: CONFIG.redirectUri,
    scope: CONFIG.scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
    show_dialog: "true"
  });

  window.location.href = `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);

  const code = params.get("code");
  const returnedState = params.get("state");
  const error = params.get("error");

  if (error) {
    throw new Error(`Spotify a refusé la connexion : ${error}`);
  }

  if (!code) {
    return false;
  }

  const { codeVerifier, state } = getTemporaryAuth();

  if (!codeVerifier) {
    throw new Error("Le code verifier PKCE est introuvable.");
  }

  if (!state || returnedState !== state) {
    throw new Error("La vérification de sécurité OAuth a échoué.");
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
    throw new Error(
      tokenData.error_description ||
      tokenData.error ||
      "Échec de récupération des tokens Spotify."
    );
  }

  saveTokens(tokenData);
  clearTemporaryAuth();

  window.history.replaceState({}, document.title, CONFIG.redirectUri);

  return true;
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

  const body = new URLSearchParams({
    client_id: CONFIG.clientId,
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken
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
    clearTokens();
    return null;
  }

  saveTokens(tokenData);

  return tokenData.access_token;
}

export function logoutSpotify() {
  clearTokens();
}