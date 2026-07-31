export const STORAGE_SCHEMA_KEY = "shuffleplus_storage_schema_v1";
export const STORAGE_RECOVERY_KEY = "shuffleplus_storage_recovery_v1";
export const CURRENT_STORAGE_SCHEMA_VERSION = 2;

const DEFAULT_PREFIX = "shuffleplus_";
const MAX_RECOVERY_RECORDS = 5;
const MAX_RECOVERY_BYTES = 220000;

function safeParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function safeStringify(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return "";
    }
}

function listStorageKeys(storage) {
    const keys = [];
    const length = Number(storage?.length) || 0;

    for (let index = 0; index < length; index += 1) {
        try {
            const key = storage.key(index);
            if (key) keys.push(key);
        } catch {
            break;
        }
    }

    return keys;
}

function looksLikeJson(value = "") {
    const normalized = String(value || "").trim();
    return normalized.startsWith("{") || normalized.startsWith("[");
}

function readMeta(storage) {
    try {
        return safeParse(storage.getItem(STORAGE_SCHEMA_KEY), {}) || {};
    } catch {
        return {};
    }
}

function writeRecoveryRecord(storage, record) {
    let records = [];

    try {
        const current = safeParse(storage.getItem(STORAGE_RECOVERY_KEY), []);
        records = Array.isArray(current) ? current : [];
    } catch {
        records = [];
    }

    const next = [record, ...records]
        .slice(0, MAX_RECOVERY_RECORDS);
    const serialized = safeStringify(next);

    if (!serialized || serialized.length > MAX_RECOVERY_BYTES) {
        return false;
    }

    try {
        storage.setItem(STORAGE_RECOVERY_KEY, serialized);
        return true;
    } catch {
        return false;
    }
}

export function runStorageMigrations({
    storage = globalThis.localStorage,
    appVersion = "",
    now = Date.now(),
    prefix = DEFAULT_PREFIX
} = {}) {
    const report = {
        schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
        previousSchemaVersion: 0,
        appVersion: String(appVersion || ""),
        available: false,
        scannedKeys: 0,
        repairedKeys: [],
        preservedKeys: [],
        skippedKeys: [],
        recoveryCreated: false,
        migrated: false,
        ranAt: Number(now) || Date.now()
    };

    if (!storage) {
        return report;
    }

    try {
        const previousMeta = readMeta(storage);
        report.previousSchemaVersion = Number(previousMeta.schemaVersion) || 0;
        report.available = true;

        const corrupted = [];
        const keys = listStorageKeys(storage)
            .filter((key) =>
                key.startsWith(prefix) &&
                ![STORAGE_SCHEMA_KEY, STORAGE_RECOVERY_KEY].includes(key)
            );

        report.scannedKeys = keys.length;

        for (const key of keys) {
            let rawValue = "";
            try {
                rawValue = storage.getItem(key) ?? "";
            } catch {
                report.skippedKeys.push(key);
                continue;
            }

            if (!looksLikeJson(rawValue)) {
                continue;
            }

            try {
                JSON.parse(rawValue);
            } catch {
                corrupted.push({ key, rawValue });
            }
        }

        if (corrupted.length) {
            const recoveryRecord = {
                format: "shuffleplus-storage-recovery",
                schemaVersion: 1,
                appVersion: report.appVersion,
                createdAt: report.ranAt,
                entries: corrupted
            };

            report.recoveryCreated = writeRecoveryRecord(
                storage,
                recoveryRecord
            );

            for (const item of corrupted) {
                if (!report.recoveryCreated) {
                    report.preservedKeys.push(item.key);
                    continue;
                }

                try {
                    storage.removeItem(item.key);
                    report.repairedKeys.push(item.key);
                } catch {
                    report.preservedKeys.push(item.key);
                }
            }
        }

        const meta = {
            schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
            appVersion: report.appVersion,
            lastRunAt: report.ranAt,
            repairedKeyCount: report.repairedKeys.length,
            recoveryCreated: report.recoveryCreated
        };

        storage.setItem(STORAGE_SCHEMA_KEY, JSON.stringify(meta));
        report.migrated =
            report.previousSchemaVersion < CURRENT_STORAGE_SCHEMA_VERSION ||
            report.repairedKeys.length > 0;
    } catch {
        report.available = false;
    }

    return report;
}

export function getStorageMigrationDiagnostics({
    storage = globalThis.localStorage,
    report = null
} = {}) {
    const meta = storage ? readMeta(storage) : {};
    let recoveryCount = 0;

    if (storage) {
        try {
            const recovery = safeParse(storage.getItem(STORAGE_RECOVERY_KEY), []);
            recoveryCount = Array.isArray(recovery) ? recovery.length : 0;
        } catch {
            recoveryCount = 0;
        }
    }

    return {
        schemaVersion: Number(meta.schemaVersion) || 0,
        appVersion: String(meta.appVersion || ""),
        lastRunAt: Number(meta.lastRunAt) || 0,
        repairedKeyCount: Number(meta.repairedKeyCount) || 0,
        recoveryCount,
        lastRun: report
            ? {
                available: report.available === true,
                scannedKeys: Number(report.scannedKeys) || 0,
                repairedKeys: [...(report.repairedKeys || [])],
                preservedKeys: [...(report.preservedKeys || [])],
                recoveryCreated: report.recoveryCreated === true,
                migrated: report.migrated === true
            }
            : null
    };
}
