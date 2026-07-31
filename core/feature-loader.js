function normalizeName(value = "") {
    return String(value || "").trim();
}

function nowValue(now) {
    try {
        return Number(now()) || Date.now();
    } catch {
        return Date.now();
    }
}

export function createFeatureLoader(
    loaders = {},
    {
        now = () => Date.now(),
        onChange = null
    } = {}
) {
    const records = new Map();

    function emit() {
        if (typeof onChange !== "function") {
            return;
        }

        try {
            onChange(getDiagnostics());
        } catch {
            // Le suivi d’un module ne doit jamais casser son chargement.
        }
    }

    function getRecord(name) {
        const normalizedName = normalizeName(name);
        if (!records.has(normalizedName)) {
            records.set(normalizedName, {
                name: normalizedName,
                status: "idle",
                requestedAt: 0,
                loadedAt: 0,
                durationMs: 0,
                error: "",
                module: null,
                promise: null
            });
        }
        return records.get(normalizedName);
    }

    async function load(name) {
        const normalizedName = normalizeName(name);
        const loader = loaders[normalizedName];

        if (!normalizedName || typeof loader !== "function") {
            throw new Error(`Fonctionnalité inconnue : ${normalizedName || "sans nom"}.`);
        }

        const record = getRecord(normalizedName);

        if (record.status === "loaded") {
            return record.module;
        }

        if (record.promise) {
            return record.promise;
        }

        record.status = "loading";
        record.requestedAt = nowValue(now);
        record.error = "";
        emit();

        record.promise = Promise.resolve()
            .then(() => loader())
            .then((module) => {
                record.module = module;
                record.status = "loaded";
                record.loadedAt = nowValue(now);
                record.durationMs = Math.max(
                    0,
                    record.loadedAt - record.requestedAt
                );
                record.promise = null;
                emit();
                return module;
            })
            .catch((error) => {
                record.status = "error";
                record.loadedAt = nowValue(now);
                record.durationMs = Math.max(
                    0,
                    record.loadedAt - record.requestedAt
                );
                record.error = String(error?.message || error || "Erreur de chargement");
                record.promise = null;
                emit();
                throw error;
            });

        return record.promise;
    }

    function isLoaded(name) {
        return getRecord(name).status === "loaded";
    }

    function getStatus(name) {
        const record = getRecord(name);
        return {
            name: record.name,
            status: record.status,
            requestedAt: record.requestedAt,
            loadedAt: record.loadedAt,
            durationMs: record.durationMs,
            error: record.error
        };
    }

    function getDiagnostics() {
        return [...records.values()]
            .map((record) => ({
                name: record.name,
                status: record.status,
                requestedAt: record.requestedAt,
                loadedAt: record.loadedAt,
                durationMs: record.durationMs,
                error: record.error
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    function prefetch(names = []) {
        const uniqueNames = [...new Set(
            (Array.isArray(names) ? names : [names])
                .map(normalizeName)
                .filter(Boolean)
        )];

        return Promise.allSettled(
            uniqueNames.map((name) => load(name))
        );
    }

    return {
        load,
        prefetch,
        isLoaded,
        getStatus,
        getDiagnostics
    };
}

export function scheduleIdleFeaturePrefetch(
    featureLoader,
    names = [],
    {
        globalObject = globalThis,
        timeout = 1800
    } = {}
) {
    if (!featureLoader || typeof featureLoader.prefetch !== "function") {
        return () => {};
    }

    const run = () => {
        featureLoader.prefetch(names).catch(() => {});
    };

    if (typeof globalObject.requestIdleCallback === "function") {
        const id = globalObject.requestIdleCallback(run, { timeout });
        return () => globalObject.cancelIdleCallback?.(id);
    }

    const id = globalObject.setTimeout?.(run, Math.min(timeout, 600));
    return () => globalObject.clearTimeout?.(id);
}
