function cloneValue(value) {
    if (typeof structuredClone === "function") {
        try {
            return structuredClone(value);
        } catch {
            // Solution de secours ci-dessous.
        }
    }

    return JSON.parse(JSON.stringify(value));
}

function splitPath(path = "") {
    return String(path || "")
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
}

export function createRuntimeState(
    initialState = {},
    { now = () => Date.now() } = {}
) {
    const startedAt = Number(now()) || Date.now();
    const state = cloneValue(initialState || {});
    const listeners = new Set();
    let revision = 0;

    function notify(change = {}) {
        revision += 1;
        const snapshot = getSnapshot();
        listeners.forEach((listener) => {
            try {
                listener(snapshot, {
                    ...change,
                    revision
                });
            } catch {
                // Un observateur ne doit pas interrompre Shuffle+.
            }
        });
    }

    function get(path = "") {
        const parts = splitPath(path);
        if (!parts.length) {
            return state;
        }

        return parts.reduce(
            (current, part) => current?.[part],
            state
        );
    }

    function set(path, value, { silent = false } = {}) {
        const parts = splitPath(path);
        if (!parts.length) {
            throw new Error("Le chemin d’état est vide.");
        }

        let target = state;
        for (const part of parts.slice(0, -1)) {
            if (!target[part] || typeof target[part] !== "object") {
                target[part] = {};
            }
            target = target[part];
        }

        target[parts.at(-1)] = value;

        if (!silent) {
            notify({ type: "set", path: parts.join(".") });
        }

        return value;
    }

    function merge(path, patch = {}, options = {}) {
        const current = get(path);
        const next = {
            ...(current && typeof current === "object" ? current : {}),
            ...(patch && typeof patch === "object" ? patch : {})
        };
        return set(path, next, options);
    }

    function getSnapshot() {
        return cloneValue(state);
    }

    function subscribe(listener) {
        if (typeof listener !== "function") {
            return () => {};
        }
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    function getDiagnostics() {
        const currentTime = Number(now()) || Date.now();
        return {
            revision,
            startedAt,
            uptimeMs: Math.max(0, currentTime - startedAt),
            subscriberCount: listeners.size,
            snapshot: getSnapshot()
        };
    }

    return {
        get,
        set,
        merge,
        getSnapshot,
        subscribe,
        getDiagnostics
    };
}
