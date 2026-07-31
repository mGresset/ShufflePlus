function readLocationLike(locationLike = globalThis.location) {
    return {
        hostname: String(locationLike?.hostname || "").toLowerCase(),
        search: String(locationLike?.search || "")
    };
}

export function isAppleMobileDevice({
    userAgent = globalThis.navigator?.userAgent || "",
    platform = globalThis.navigator?.platform || "",
    maxTouchPoints = globalThis.navigator?.maxTouchPoints || 0
} = {}) {
    return (
        /iPhone|iPad|iPod/i.test(String(userAgent)) ||
        (
            String(platform) === "MacIntel" &&
            Number(maxTouchPoints) > 1
        )
    );
}

export function isLocalDevelopment(
    locationLike = globalThis.location
) {
    const { hostname } = readLocationLike(locationLike);
    return [
        "127.0.0.1",
        "::1",
        "[::1]"
    ].includes(hostname);
}

export function hasLocalIosDebugOverride(
    locationLike = globalThis.location
) {
    if (!isLocalDevelopment(locationLike)) {
        return false;
    }

    try {
        const { search } = readLocationLike(locationLike);
        return new URLSearchParams(search).get("debug_ios") === "1";
    } catch {
        return false;
    }
}

export function canUseDrivingMode(options = {}) {
    return (
        isAppleMobileDevice(options) ||
        hasLocalIosDebugOverride(options.location)
    );
}
