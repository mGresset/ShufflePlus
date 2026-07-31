export const PWA_UPDATE_APPLIED_VERSION_KEY =
    "shuffleplus_pwa_applied_version_v1";

export function normalizePwaVersion(value = "") {
    const version = String(value || "").trim();
    return /^\d+\.\d+\.\d+$/.test(version)
        ? version
        : "";
}

export function getPwaVersionFromScriptUrl(scriptUrl = "") {
    try {
        const url = new URL(
            String(scriptUrl || ""),
            "https://shuffleplus.local/"
        );
        return normalizePwaVersion(
            url.searchParams.get("v") || ""
        );
    } catch {
        return "";
    }
}

export function shouldDisplayPwaUpdate({
    currentVersion = "",
    availableVersion = "",
    appliedVersion = "",
    applying = false
} = {}) {
    if (applying) {
        return false;
    }

    const current = normalizePwaVersion(currentVersion);
    const available = normalizePwaVersion(availableVersion);
    const applied = normalizePwaVersion(appliedVersion);

    if (available && current && available === current) {
        return false;
    }

    if (available && applied && available === applied) {
        return false;
    }

    return true;
}

export function readAppliedPwaVersion(
    storage,
    key = PWA_UPDATE_APPLIED_VERSION_KEY
) {
    try {
        return normalizePwaVersion(
            storage?.getItem?.(key) || ""
        );
    } catch {
        return "";
    }
}

export function rememberAppliedPwaVersion(
    storage,
    version,
    key = PWA_UPDATE_APPLIED_VERSION_KEY
) {
    const normalized = normalizePwaVersion(version);
    if (!normalized) {
        return false;
    }

    try {
        storage?.setItem?.(key, normalized);
        return true;
    } catch {
        return false;
    }
}

export function clearAppliedPwaVersion(
    storage,
    key = PWA_UPDATE_APPLIED_VERSION_KEY
) {
    try {
        storage?.removeItem?.(key);
        return true;
    } catch {
        return false;
    }
}
