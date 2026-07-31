export const SERVER_SYNC_RECOVERY_KEY =
    "shuffleplus_server_sync_recovery_v1";
export const SERVER_SYNC_ADDRESS_KEY =
    "shuffleplus_server_sync_address_v1";

const RECOVERY_FORMAT = "shuffleplus-server-sync-recovery";
const RECOVERY_SCHEMA_VERSION = 1;

function safeParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function safeGet(storage, key) {
    try {
        return storage?.getItem?.(key) ?? null;
    } catch {
        return null;
    }
}

function safeSet(storage, key, value) {
    try {
        storage?.setItem?.(key, value);
        return true;
    } catch {
        return false;
    }
}

function safeRemove(storage, key) {
    try {
        storage?.removeItem?.(key);
        return true;
    } catch {
        return false;
    }
}

export function normalizeRecoveryServerUrl(value = "") {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    if (!raw) return "";

    try {
        const url = new URL(raw);
        const localHost = [
            "localhost",
            "127.0.0.1",
            "::1"
        ].includes(url.hostname);

        if (
            url.protocol !== "https:" &&
            !(localHost && url.protocol === "http:")
        ) {
            return "";
        }

        return url.origin + url.pathname.replace(/\/$/, "");
    } catch {
        return "";
    }
}

export function hasCompleteServerSyncCredentials(value = {}) {
    return Boolean(
        normalizeRecoveryServerUrl(value.serverUrl) &&
        String(value.spaceId || "").trim() &&
        String(value.deviceToken || "").trim() &&
        String(value.rootSecret || "").trim()
    );
}

function normalizeRecoverableState(value = {}) {
    return {
        ...value,
        serverUrl: normalizeRecoveryServerUrl(value.serverUrl),
        spaceId: String(value.spaceId || "").slice(0, 120),
        deviceToken: String(value.deviceToken || "").slice(0, 240),
        rootSecret: String(value.rootSecret || "").slice(0, 240)
    };
}

export function rememberServerSyncState(
    storage = globalThis.localStorage,
    state = {},
    now = Date.now()
) {
    const normalized = normalizeRecoverableState(state);
    let addressSaved = false;
    let recoverySaved = false;

    if (normalized.serverUrl) {
        addressSaved = safeSet(
            storage,
            SERVER_SYNC_ADDRESS_KEY,
            JSON.stringify({
                serverUrl: normalized.serverUrl,
                savedAt: Number(now) || Date.now()
            })
        );
    }

    if (hasCompleteServerSyncCredentials(normalized)) {
        recoverySaved = safeSet(
            storage,
            SERVER_SYNC_RECOVERY_KEY,
            JSON.stringify({
                format: RECOVERY_FORMAT,
                schemaVersion: RECOVERY_SCHEMA_VERSION,
                savedAt: Number(now) || Date.now(),
                state: normalized
            })
        );
    }

    return {
        addressSaved,
        recoverySaved,
        complete: hasCompleteServerSyncCredentials(normalized)
    };
}

export function readServerSyncRecovery(
    storage = globalThis.localStorage
) {
    const payload = safeParse(
        safeGet(storage, SERVER_SYNC_RECOVERY_KEY),
        null
    );

    if (
        payload?.format !== RECOVERY_FORMAT ||
        Number(payload.schemaVersion) !== RECOVERY_SCHEMA_VERSION ||
        !hasCompleteServerSyncCredentials(payload.state)
    ) {
        return null;
    }

    return {
        savedAt: Math.max(0, Number(payload.savedAt) || 0),
        state: normalizeRecoverableState(payload.state)
    };
}

export function readLastServerSyncAddress(
    storage = globalThis.localStorage
) {
    const payload = safeParse(
        safeGet(storage, SERVER_SYNC_ADDRESS_KEY),
        null
    );

    return {
        serverUrl: normalizeRecoveryServerUrl(payload?.serverUrl),
        savedAt: Math.max(0, Number(payload?.savedAt) || 0)
    };
}

export function recoverServerSyncState(
    storage = globalThis.localStorage,
    primaryState = {}
) {
    const primary = normalizeRecoverableState(primaryState);

    if (hasCompleteServerSyncCredentials(primary)) {
        rememberServerSyncState(storage, primary);
        return {
            state: primary,
            recovered: false,
            source: "primary",
            recoveryAvailable: true,
            addressRestored: false
        };
    }

    const recovery = readServerSyncRecovery(storage);
    if (recovery) {
        const state = normalizeRecoverableState({
            ...recovery.state,
            ...primary,
            serverUrl: primary.serverUrl || recovery.state.serverUrl,
            spaceId: primary.spaceId || recovery.state.spaceId,
            deviceToken: primary.deviceToken || recovery.state.deviceToken,
            rootSecret: primary.rootSecret || recovery.state.rootSecret
        });

        return {
            state,
            recovered: true,
            source: "recovery",
            recoveryAvailable: true,
            addressRestored: !primary.serverUrl && Boolean(state.serverUrl)
        };
    }

    const lastAddress = readLastServerSyncAddress(storage);
    if (!primary.serverUrl && lastAddress.serverUrl) {
        return {
            state: {
                ...primary,
                serverUrl: lastAddress.serverUrl
            },
            recovered: true,
            source: "address",
            recoveryAvailable: false,
            addressRestored: true
        };
    }

    return {
        state: primary,
        recovered: false,
        source: "none",
        recoveryAvailable: false,
        addressRestored: false
    };
}

export function clearServerSyncRecovery(
    storage = globalThis.localStorage,
    { preserveAddress = true } = {}
) {
    const credentialsCleared = safeRemove(
        storage,
        SERVER_SYNC_RECOVERY_KEY
    );
    const addressCleared = preserveAddress
        ? false
        : safeRemove(storage, SERVER_SYNC_ADDRESS_KEY);

    return {
        credentialsCleared,
        addressCleared
    };
}

export function getServerSyncRecoveryDiagnostics(
    storage = globalThis.localStorage
) {
    const recovery = readServerSyncRecovery(storage);
    const address = readLastServerSyncAddress(storage);

    return {
        recoveryAvailable: Boolean(recovery),
        recoverySavedAt: recovery?.savedAt || 0,
        addressAvailable: Boolean(address.serverUrl),
        addressSavedAt: address.savedAt || 0,
        serverHost: address.serverUrl
            ? new URL(address.serverUrl).host
            : ""
    };
}
