const APP_VERSION = "7.3.1";
const PRODUCTION_REDIRECT_URI =
    "https://mgresset.github.io/ShufflePlus/";
const LOCAL_REDIRECT_URI =
    "http://127.0.0.1:5500/";

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

    clientId: "efcbf6e43e6346678cfceb44d0dc2422",

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
