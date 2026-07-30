export const DEFAULT_OFFLINE_PERFORMANCE_SETTINGS = {
    enabled: true,
    cacheOpenedTracks: true,
    dataSaver: false,
    libraryTtlMinutes: 60,
    trackTtlDays: 30,
    updatedAt: 0
};

const LIBRARY_CACHE_KEY =
    "shuffleplus_offline_library_v1";
const DATABASE_NAME =
    "shuffleplus-offline-v1";
const DATABASE_VERSION = 1;
const TRACK_STORE = "track-caches";
const MAX_TRACK_CACHE_RECORDS = 50;

function clamp(value, minimum, maximum) {
    return Math.max(
        minimum,
        Math.min(maximum, Number(value) || 0)
    );
}

export function normalizeOfflinePerformanceSettings(
    value = DEFAULT_OFFLINE_PERFORMANCE_SETTINGS
) {
    const source = value && typeof value === "object"
        ? value
        : DEFAULT_OFFLINE_PERFORMANCE_SETTINGS;
    const allowedLibraryTtl = new Set([15, 60, 180, 720, 1440]);
    const allowedTrackTtl = new Set([7, 30, 90]);
    const libraryTtlMinutes = Number(source.libraryTtlMinutes);
    const trackTtlDays = Number(source.trackTtlDays);

    return {
        enabled: source.enabled !== false,
        cacheOpenedTracks: source.cacheOpenedTracks !== false,
        dataSaver: source.dataSaver === true,
        libraryTtlMinutes: allowedLibraryTtl.has(libraryTtlMinutes)
            ? libraryTtlMinutes
            : 60,
        trackTtlDays: allowedTrackTtl.has(trackTtlDays)
            ? trackTtlDays
            : 30,
        updatedAt: Math.max(0, Number(source.updatedAt || 0))
    };
}

function safeJsonParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function estimateBytes(value) {
    try {
        return new Blob([JSON.stringify(value)]).size;
    } catch {
        return 0;
    }
}

export function readOfflineLibraryCache({
    allowExpired = true,
    maxAgeMs = Number.POSITIVE_INFINITY
} = {}) {
    try {
        const raw = localStorage.getItem(LIBRARY_CACHE_KEY);
        if (!raw) return null;
        const parsed = safeJsonParse(raw);
        if (!parsed || !Array.isArray(parsed.playlists)) return null;
        const savedAt = Math.max(0, Number(parsed.savedAt || 0));
        const ageMs = Math.max(0, Date.now() - savedAt);
        const stale = ageMs > Math.max(0, Number(maxAgeMs));
        if (stale && !allowExpired) return null;
        return {
            profile: parsed.profile && typeof parsed.profile === "object"
                ? parsed.profile
                : {},
            playlists: parsed.playlists.filter(Boolean),
            savedAt,
            ageMs,
            stale,
            byteSize: Number(parsed.byteSize || raw.length * 2)
        };
    } catch {
        return null;
    }
}

export function writeOfflineLibraryCache(profile, playlists) {
    const payload = {
        schemaVersion: 1,
        savedAt: Date.now(),
        profile: profile && typeof profile === "object" ? profile : {},
        playlists: Array.isArray(playlists) ? playlists.filter(Boolean) : []
    };
    payload.byteSize = estimateBytes(payload);
    localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(payload));
    return payload;
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in globalThis)) {
            reject(new Error("IndexedDB indisponible."));
            return;
        }
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onerror = () => reject(request.error || new Error("Base locale inaccessible."));
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(TRACK_STORE)) {
                const store = db.createObjectStore(TRACK_STORE, { keyPath: "key" });
                store.createIndex("savedAt", "savedAt");
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Opération locale impossible."));
    });
}

async function pruneTrackCache(db) {
    const transaction = db.transaction(TRACK_STORE, "readwrite");
    const store = transaction.objectStore(TRACK_STORE);
    const records = await requestToPromise(store.getAll());
    const sorted = records
        .filter(Boolean)
        .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
    for (const record of sorted.slice(MAX_TRACK_CACHE_RECORDS)) {
        store.delete(record.key);
    }
}

export async function writeOfflineTrackCache(
    key,
    tracks,
    { ttlDays = 30, label = "" } = {}
) {
    if (!key || !Array.isArray(tracks)) return null;
    const db = await openDatabase();
    try {
        const savedAt = Date.now();
        const record = {
            key: String(key),
            label: String(label || "").slice(0, 160),
            savedAt,
            expiresAt: savedAt + clamp(ttlDays, 1, 365) * 86400000,
            trackCount: tracks.length,
            byteSize: estimateBytes(tracks),
            tracks
        };
        const transaction = db.transaction(TRACK_STORE, "readwrite");
        transaction.objectStore(TRACK_STORE).put(record);
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
        await pruneTrackCache(db);
        return record;
    } finally {
        db.close();
    }
}

export async function readOfflineTrackCache(
    key,
    { allowExpired = true, maxAgeMs = Number.POSITIVE_INFINITY } = {}
) {
    if (!key) return null;
    let db;
    try {
        db = await openDatabase();
        const transaction = db.transaction(TRACK_STORE, "readonly");
        const record = await requestToPromise(
            transaction.objectStore(TRACK_STORE).get(String(key))
        );
        if (!record || !Array.isArray(record.tracks)) return null;
        const ageMs = Math.max(0, Date.now() - Number(record.savedAt || 0));
        const stale = Date.now() > Number(record.expiresAt || 0) ||
            ageMs > Math.max(0, Number(maxAgeMs));
        if (stale && !allowExpired) return null;
        return { ...record, ageMs, stale };
    } catch {
        return null;
    } finally {
        db?.close();
    }
}

export async function clearOfflineMusicCache() {
    localStorage.removeItem(LIBRARY_CACHE_KEY);
    if (!("indexedDB" in globalThis)) return;
    await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = resolve;
        request.onerror = resolve;
        request.onblocked = resolve;
    });
}

export async function getOfflineCacheSummary() {
    const library = readOfflineLibraryCache({ allowExpired: true });
    const summary = {
        librarySavedAt: library?.savedAt || 0,
        playlistCount: library?.playlists?.length || 0,
        libraryBytes: library?.byteSize || 0,
        trackSourceCount: 0,
        trackCount: 0,
        trackBytes: 0,
        totalBytes: library?.byteSize || 0
    };
    let db;
    try {
        db = await openDatabase();
        const transaction = db.transaction(TRACK_STORE, "readonly");
        const records = await requestToPromise(
            transaction.objectStore(TRACK_STORE).getAll()
        );
        summary.trackSourceCount = records.length;
        summary.trackCount = records.reduce(
            (total, item) => total + Number(item?.trackCount || 0),
            0
        );
        summary.trackBytes = records.reduce(
            (total, item) => total + Number(item?.byteSize || 0),
            0
        );
        summary.totalBytes += summary.trackBytes;
    } catch {
        // The library cache remains usable even without IndexedDB.
    } finally {
        db?.close();
    }
    return summary;
}

export function formatOfflineCacheAge(timestamp, now = Date.now()) {
    if (!timestamp) return "Jamais synchronisé";
    const elapsed = Math.max(0, now - Number(timestamp));
    const minute = 60000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (elapsed < minute) return "À l’instant";
    if (elapsed < hour) return `Il y a ${Math.floor(elapsed / minute)} min`;
    if (elapsed < day) return `Il y a ${Math.floor(elapsed / hour)} h`;
    return `Il y a ${Math.floor(elapsed / day)} j`;
}
