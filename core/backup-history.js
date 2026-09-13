export const BACKUP_HISTORY_KEY = "shuffleplus_backup_history_v1";
export const BACKUP_HISTORY_MAX_ITEMS = 6;
export const BACKUP_HISTORY_MAX_TOTAL_BYTES = 3_000_000;
export const BACKUP_HISTORY_MAX_ITEM_BYTES = 1_500_000;

function safeParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function byteSize(value) {
    const serialized = typeof value === "string"
        ? value
        : JSON.stringify(value);

    return typeof TextEncoder === "function"
        ? new TextEncoder().encode(serialized).length
        : serialized.length;
}

function normalizeReason(value = "manual") {
    const reason = String(value || "manual").trim().toLowerCase();
    return ["manual", "pre-update", "before-import", "before-restore"]
        .includes(reason)
        ? reason
        : "manual";
}

function getDefaultLabel(reason = "manual") {
    if (reason === "pre-update") return "Avant mise à jour";
    if (reason === "before-import") return "Avant importation";
    if (reason === "before-restore") return "Avant restauration";
    return "Sauvegarde manuelle";
}

export function getBackupContentSummary(backup = {}) {
    const data = backup?.data && typeof backup.data === "object"
        ? backup.data
        : {};

    return {
        mixCount: Array.isArray(data.savedMixes) ? data.savedMixes.length : 0,
        favoriteCount: Array.isArray(data.favoriteSourceKeys)
            ? data.favoriteSourceKeys.length
            : 0,
        shortcutCount: Array.isArray(data.iosCommands) ? data.iosCommands.length : 0,
        profileCount: Array.isArray(data.mixProfiles) ? data.mixProfiles.length : 0,
        historyCount: Array.isArray(data.recentTrackUris) ? data.recentTrackUris.length : 0
    };
}

function normalizeHistoryEntry(entry = {}) {
    if (!entry || typeof entry !== "object" || !entry.backup || typeof entry.backup !== "object") {
        return null;
    }

    const createdAt = Math.max(0, Number(entry.createdAt) || 0);
    const reason = normalizeReason(entry.reason);
    const backup = entry.backup;

    return {
        id: String(entry.id || createdAt || "").trim(),
        reason,
        label: String(entry.label || getDefaultLabel(reason)).trim() || getDefaultLabel(reason),
        createdAt,
        appVersion: String(entry.appVersion || backup.appVersion || ""),
        byteSize: Math.max(0, Number(entry.byteSize) || byteSize(backup)),
        summary: getBackupContentSummary(backup),
        backup
    };
}

export function readBackupHistory(storage) {
    if (!storage) return [];

    try {
        const parsed = safeParse(storage.getItem(BACKUP_HISTORY_KEY), []);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(normalizeHistoryEntry)
            .filter(Boolean)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, BACKUP_HISTORY_MAX_ITEMS);
    } catch {
        return [];
    }
}

function createEntry(backup, {
    reason = "manual",
    label = "",
    now = Date.now(),
    id = ""
} = {}) {
    const normalizedReason = normalizeReason(reason);
    const createdAt = Math.max(0, Number(now) || Date.now());
    const backupBytes = byteSize(backup);

    return {
        id: String(id || `${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
        reason: normalizedReason,
        label: String(label || getDefaultLabel(normalizedReason)),
        createdAt,
        appVersion: String(backup?.appVersion || ""),
        byteSize: backupBytes,
        summary: getBackupContentSummary(backup),
        backup
    };
}

export function saveBackupHistoryEntry(
    storage,
    backup,
    {
        reason = "manual",
        label = "",
        now = Date.now(),
        id = "",
        maxItems = BACKUP_HISTORY_MAX_ITEMS,
        maxTotalBytes = BACKUP_HISTORY_MAX_TOTAL_BYTES,
        maxItemBytes = BACKUP_HISTORY_MAX_ITEM_BYTES
    } = {}
) {
    if (!storage || !backup || typeof backup !== "object") {
        return { saved: false, reason: "unavailable", removedCount: 0 };
    }

    const entry = createEntry(backup, { reason, label, now, id });
    if (entry.byteSize > Math.max(100_000, Number(maxItemBytes) || BACKUP_HISTORY_MAX_ITEM_BYTES)) {
        return { saved: false, reason: "too-large", removedCount: 0, entry };
    }

    const existing = readBackupHistory(storage)
        .filter((item) => item.id !== entry.id);
    const limit = Math.max(1, Number(maxItems) || BACKUP_HISTORY_MAX_ITEMS);
    const totalLimit = Math.max(250_000, Number(maxTotalBytes) || BACKUP_HISTORY_MAX_TOTAL_BYTES);
    const history = [entry, ...existing].slice(0, limit);
    let removedCount = Math.max(0, existing.length + 1 - history.length);

    while (history.length > 1 && byteSize(history) > totalLimit) {
        history.pop();
        removedCount += 1;
    }

    if (byteSize(history) > totalLimit) {
        return { saved: false, reason: "too-large", removedCount, entry };
    }

    while (history.length) {
        try {
            storage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
            return {
                saved: true,
                reason: "",
                removedCount,
                entry: normalizeHistoryEntry(entry),
                history: readBackupHistory(storage)
            };
        } catch {
            if (history.length === 1) {
                return { saved: false, reason: "storage-error", removedCount, entry };
            }
            history.pop();
            removedCount += 1;
        }
    }

    return { saved: false, reason: "storage-error", removedCount, entry };
}

export function removeBackupHistoryEntry(storage, id = "") {
    if (!storage) return false;

    const targetId = String(id || "").trim();
    if (!targetId) return false;

    try {
        const history = readBackupHistory(storage);
        const next = history.filter((entry) => entry.id !== targetId);
        if (next.length === history.length) return false;
        storage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(next));
        return true;
    } catch {
        return false;
    }
}

export function getBackupHistoryEntry(storage, id = "") {
    const targetId = String(id || "").trim();
    if (!targetId) return null;
    return readBackupHistory(storage).find((entry) => entry.id === targetId) || null;
}
