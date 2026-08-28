export const PWA_UPDATE_APPLIED_VERSION_KEY =
    "shuffleplus_pwa_applied_version_v1";


export const PWA_UPDATE_TRANSACTION_KEY =
    "shuffleplus_pwa_update_transaction_v1";

export function beginPwaUpdateTransaction(
    storage,
    {
        fromVersion = "",
        toVersion = "",
        fromBuild = "",
        toBuild = "",
        now = Date.now()
    } = {},
    key = PWA_UPDATE_TRANSACTION_KEY
) {
    const source = normalizePwaVersion(fromVersion);
    const target = normalizePwaVersion(toVersion);
    if (!storage || !source || !target || source === target) {
        return null;
    }

    const transaction = {
        format: "shuffleplus-pwa-update-transaction",
        schemaVersion: 1,
        status: "activating",
        fromVersion: source,
        toVersion: target,
        fromBuild: String(fromBuild || `${source}-pwa-reset-1`),
        toBuild: String(toBuild || `${target}-pwa-reset-1`),
        startedAt: Number(now) || Date.now(),
        updatedAt: Number(now) || Date.now()
    };

    try {
        storage.setItem(key, JSON.stringify(transaction));
        return transaction;
    } catch {
        return null;
    }
}

export function readPwaUpdateTransaction(
    storage,
    key = PWA_UPDATE_TRANSACTION_KEY
) {
    try {
        const parsed = JSON.parse(storage?.getItem?.(key) || "null");
        if (
            !parsed ||
            parsed.format !== "shuffleplus-pwa-update-transaction" ||
            !normalizePwaVersion(parsed.fromVersion) ||
            !normalizePwaVersion(parsed.toVersion)
        ) {
            return null;
        }
        return {
            ...parsed,
            fromVersion: normalizePwaVersion(parsed.fromVersion),
            toVersion: normalizePwaVersion(parsed.toVersion),
            startedAt: Math.max(0, Number(parsed.startedAt) || 0),
            updatedAt: Math.max(0, Number(parsed.updatedAt) || 0)
        };
    } catch {
        return null;
    }
}

export function clearPwaUpdateTransaction(
    storage,
    key = PWA_UPDATE_TRANSACTION_KEY
) {
    try {
        storage?.removeItem?.(key);
        return true;
    } catch {
        return false;
    }
}

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
