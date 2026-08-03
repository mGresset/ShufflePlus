const DEFAULT_QUOTA_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 2 * 1000;
const DEFAULT_MAX_CACHE_ENTRIES = 80;

function normalizePositiveNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0
        ? numeric
        : fallback;
}

export function parseRetryAfterMilliseconds(value) {
    const seconds = normalizePositiveNumber(value, 0);
    return seconds > 0
        ? Math.ceil(seconds * 1000)
        : 0;
}

function formatCooldownMessage(reason, remainingMs) {
    const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    const waitLabel = seconds >= 120
        ? `${Math.ceil(seconds / 60)} min`
        : `${seconds} s`;

    if (reason === "QUOTA_EXCEEDED") {
        return (
            "Le quota Spotify de l’application est temporairement épuisé. " +
            `Shuffle+ met les appels en pause pendant environ ${waitLabel}.`
        );
    }

    return (
        "Spotify limite temporairement les demandes. " +
        `Shuffle+ attend encore environ ${waitLabel}.`
    );
}

export function createSpotifyRequestManager({
    now = () => Date.now(),
    quotaCooldownMs = DEFAULT_QUOTA_COOLDOWN_MS,
    rateLimitCooldownMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS,
    maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES
} = {}) {
    const cache = new Map();
    const pending = new Map();
    let cacheGeneration = 0;
    const counters = {
        logicalRequests: 0,
        networkRequests: 0,
        cacheHits: 0,
        deduplicatedRequests: 0,
        blockedByCooldown: 0,
        quotaEvents: 0,
        rateLimitEvents: 0
    };

    let cooldownUntil = 0;
    let cooldownReason = "";
    let lastRequestAt = 0;
    let lastSuccessAt = 0;
    let lastErrorAt = 0;

    function removeExpiredCacheEntries() {
        const currentTime = now();

        for (const [key, entry] of cache.entries()) {
            if (entry.expiresAt <= currentTime) {
                cache.delete(key);
            }
        }
    }

    function enforceCacheLimit() {
        while (cache.size > maxCacheEntries) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey === undefined) break;
            cache.delete(oldestKey);
        }
    }

    function readCache(key) {
        removeExpiredCacheEntries();
        const entry = cache.get(key);

        if (!entry) return undefined;

        cache.delete(key);
        cache.set(key, entry);
        counters.cacheHits += 1;
        return entry.value;
    }

    function writeCache(key, value, ttlMs) {
        if (!key || ttlMs <= 0) return;

        cache.delete(key);
        cache.set(key, {
            value,
            expiresAt: now() + ttlMs
        });
        enforceCacheLimit();
    }

    function clearCache() {
        cacheGeneration += 1;
        cache.clear();
    }

    function invalidateMatching(predicate) {
        cacheGeneration += 1;

        if (typeof predicate !== "function") {
            cache.clear();
            return;
        }

        for (const key of cache.keys()) {
            if (predicate(key)) cache.delete(key);
        }
    }

    function createCooldownError() {
        const remainingMs = Math.max(1, cooldownUntil - now());
        const error = new Error(
            formatCooldownMessage(cooldownReason, remainingMs)
        );
        error.status = 429;
        error.reason = cooldownReason || "RATE_LIMITED";
        error.code = "SPOTIFY_API_COOLDOWN";
        error.retryAfter = String(remainingMs / 1000);
        error.retryAt = cooldownUntil;
        error.cooldownRemainingMs = remainingMs;
        return error;
    }

    function registerRateLimit(error = {}) {
        const reason = error.reason === "QUOTA_EXCEEDED"
            ? "QUOTA_EXCEEDED"
            : "RATE_LIMITED";
        const retryAfterMs = parseRetryAfterMilliseconds(
            error.retryAfter
        );
        const fallbackMs = reason === "QUOTA_EXCEEDED"
            ? quotaCooldownMs
            : rateLimitCooldownMs;
        const durationMs = retryAfterMs > 0
            ? retryAfterMs
            : normalizePositiveNumber(fallbackMs, 1000);

        cooldownUntil = Math.max(
            cooldownUntil,
            now() + durationMs
        );
        cooldownReason = reason;

        if (reason === "QUOTA_EXCEEDED") {
            counters.quotaEvents += 1;
        } else {
            counters.rateLimitEvents += 1;
        }

        return cooldownUntil;
    }

    async function execute({
        key,
        method = "GET",
        cacheTtlMs = 0,
        request
    } = {}) {
        if (typeof request !== "function") {
            throw new TypeError("Une fonction request est requise.");
        }

        const normalizedMethod = String(method || "GET").toUpperCase();
        const cacheable = normalizedMethod === "GET" && cacheTtlMs > 0;
        const requestKey = String(key || `${normalizedMethod}:anonymous`);
        counters.logicalRequests += 1;

        if (cacheable) {
            const cachedValue = readCache(requestKey);
            if (cachedValue !== undefined) return cachedValue;

            const pendingEntry = pending.get(requestKey);
            if (
                pendingEntry &&
                pendingEntry.generation === cacheGeneration
            ) {
                counters.deduplicatedRequests += 1;
                return pendingEntry.promise;
            }
        }

        if (now() < cooldownUntil) {
            counters.blockedByCooldown += 1;
            throw createCooldownError();
        }

        if (normalizedMethod !== "GET") {
            // Une mutation Spotify invalide immédiatement les réponses GET
            // déjà en vol. Elles peuvent se terminer, mais ne doivent plus
            // alimenter le cache ni être réutilisées après la commande.
            clearCache();
        }

        const requestGeneration = cacheGeneration;
        let operation;

        operation = (async () => {
            counters.networkRequests += 1;
            lastRequestAt = now();

            try {
                const value = await request();
                lastSuccessAt = now();

                if (
                    cacheable &&
                    requestGeneration === cacheGeneration
                ) {
                    writeCache(requestKey, value, cacheTtlMs);
                } else if (normalizedMethod !== "GET") {
                    // Une seconde invalidation ferme aussi la fenêtre où un
                    // GET aurait pu démarrer pendant la mutation.
                    clearCache();
                }

                return value;
            } catch (error) {
                lastErrorAt = now();
                if (error?.status === 429) {
                    registerRateLimit(error);
                }
                throw error;
            } finally {
                const pendingEntry = pending.get(requestKey);
                if (pendingEntry?.promise === operation) {
                    pending.delete(requestKey);
                }
            }
        })();

        if (cacheable) {
            pending.set(requestKey, {
                promise: operation,
                generation: requestGeneration
            });
        }

        return operation;
    }

    function getDiagnostics() {
        removeExpiredCacheEntries();
        const remainingMs = Math.max(0, cooldownUntil - now());

        return {
            ...counters,
            cacheEntries: cache.size,
            cacheGeneration,
            pendingRequests: pending.size,
            cooldownActive: remainingMs > 0,
            cooldownReason: remainingMs > 0 ? cooldownReason : "",
            cooldownUntil: remainingMs > 0 ? cooldownUntil : 0,
            cooldownRemainingMs: remainingMs,
            lastRequestAt,
            lastSuccessAt,
            lastErrorAt
        };
    }

    function resetDiagnostics({ keepCooldown = true } = {}) {
        for (const key of Object.keys(counters)) counters[key] = 0;
        lastRequestAt = 0;
        lastSuccessAt = 0;
        lastErrorAt = 0;

        if (!keepCooldown) {
            cooldownUntil = 0;
            cooldownReason = "";
        }
    }

    return {
        execute,
        clearCache,
        invalidateMatching,
        registerRateLimit,
        getDiagnostics,
        resetDiagnostics
    };
}

export const spotifyRequestManager = createSpotifyRequestManager();
