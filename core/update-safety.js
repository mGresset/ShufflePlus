export const UPDATE_SAFETY_SNAPSHOT_KEY =
    "shuffleplus_preupdate_snapshot_v1";
export const UPDATE_SAFETY_MAX_BYTES = 1_500_000;

function safeParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export function savePreUpdateSnapshot(
    storage,
    backup,
    {
        fromVersion = "",
        toVersion = "",
        now = Date.now(),
        maxBytes = UPDATE_SAFETY_MAX_BYTES
    } = {}
) {
    if (!storage || !backup || typeof backup !== "object") {
        return { saved: false, reason: "unavailable", byteSize: 0 };
    }

    const snapshot = {
        format: "shuffleplus-preupdate-snapshot",
        schemaVersion: 1,
        fromVersion: String(fromVersion || ""),
        toVersion: String(toVersion || ""),
        createdAt: Number(now) || Date.now(),
        backup
    };
    const serialized = JSON.stringify(snapshot);
    const byteSize = typeof TextEncoder === "function"
        ? new TextEncoder().encode(serialized).length
        : serialized.length;

    if (byteSize > Math.max(50_000, Number(maxBytes) || UPDATE_SAFETY_MAX_BYTES)) {
        return { saved: false, reason: "too-large", byteSize };
    }

    try {
        storage.setItem(UPDATE_SAFETY_SNAPSHOT_KEY, serialized);
        return { saved: true, reason: "", byteSize, snapshot };
    } catch {
        return { saved: false, reason: "storage-error", byteSize };
    }
}

export function readPreUpdateSnapshot(storage) {
    if (!storage) return null;

    try {
        const value = safeParse(
            storage.getItem(UPDATE_SAFETY_SNAPSHOT_KEY),
            null
        );
        if (
            !value ||
            value.format !== "shuffleplus-preupdate-snapshot" ||
            !value.backup ||
            typeof value.backup !== "object"
        ) {
            return null;
        }
        return {
            ...value,
            createdAt: Math.max(0, Number(value.createdAt) || 0),
            fromVersion: String(value.fromVersion || ""),
            toVersion: String(value.toVersion || "")
        };
    } catch {
        return null;
    }
}

export function clearPreUpdateSnapshot(storage) {
    try {
        storage?.removeItem?.(UPDATE_SAFETY_SNAPSHOT_KEY);
        return true;
    } catch {
        return false;
    }
}

export function getPreUpdateSnapshotSummary(snapshot) {
    if (!snapshot) {
        return {
            available: false,
            label: "Aucune sauvegarde automatique",
            createdAt: 0
        };
    }

    return {
        available: true,
        label: snapshot.toVersion
            ? `Avant la mise à jour ${snapshot.toVersion}`
            : "Avant la dernière mise à jour",
        fromVersion: snapshot.fromVersion || "",
        toVersion: snapshot.toVersion || "",
        createdAt: snapshot.createdAt || 0
    };
}
