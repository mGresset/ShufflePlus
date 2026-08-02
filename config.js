import {
    getConfiguredSpotifyClientId
} from "./core/spotify-app-config.js";

const APP_VERSION = "9.7.2";
const PRODUCTION_REDIRECT_URI =
    "https://mgresset.github.io/ShufflePlus/";
const LOCAL_REDIRECT_URI =
    "http://127.0.0.1:5500/";

// Utilisé uniquement pour migrer les installations déjà connectées avant
// la configuration publique par Client ID personnel. Les nouveaux utilisateurs doivent saisir leur propre Client ID.
const LEGACY_CLIENT_ID =
    "efcbf6e43e6346678cfceb44d0dc2422";

function getRedirectUri() {
    const hostname = globalThis.location?.hostname || "";
    const isLoopback =
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname === "[::1]";

    return isLoopback
        ? LOCAL_REDIRECT_URI
        : PRODUCTION_REDIRECT_URI;
}

export const CONFIG = {
    appName: "Shuffle+",
    version: APP_VERSION,

    get clientId() {
        return getConfiguredSpotifyClientId();
    },

    legacyClientId: LEGACY_CLIENT_ID,

    redirectUri: getRedirectUri(),
    productionRedirectUri: PRODUCTION_REDIRECT_URI,
    localRedirectUri: LOCAL_REDIRECT_URI,

    scopes: [
        "playlist-read-private",
        "playlist-read-collaborative",
        "playlist-modify-private",
        "user-library-read",
        "user-read-private",
        "user-read-playback-state",
        "user-read-recently-played",
        "user-modify-playback-state"
    ]
};
