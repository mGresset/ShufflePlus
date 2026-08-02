const PROFILE_DEFINITIONS = Object.freeze({
    offline: {
        id: "offline",
        label: "Hors connexion",
        allowIntentPrefetch: false,
        allowBackgroundWarmup: false,
        idleDelayMs: 0,
        maxParallel: 0
    },
    constrained: {
        id: "constrained",
        label: "Connexion économisée",
        allowIntentPrefetch: true,
        allowBackgroundWarmup: false,
        idleDelayMs: 2400,
        maxParallel: 1
    },
    balanced: {
        id: "balanced",
        label: "Connexion standard",
        allowIntentPrefetch: true,
        allowBackgroundWarmup: true,
        idleDelayMs: 1400,
        maxParallel: 2
    },
    fast: {
        id: "fast",
        label: "Connexion rapide",
        allowIntentPrefetch: true,
        allowBackgroundWarmup: true,
        idleDelayMs: 700,
        maxParallel: 3
    }
});

function normalizeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeEffectiveType(value = "") {
    const normalized = String(value || "").trim().toLowerCase();
    return ["slow-2g", "2g", "3g", "4g"].includes(normalized)
        ? normalized
        : "";
}

export function getNetworkPerformanceProfile({
    online = true,
    saveData = false,
    effectiveType = "",
    downlink = 0,
    rtt = 0
} = {}) {
    const normalizedType = normalizeEffectiveType(effectiveType);
    const normalizedDownlink = Math.max(0, normalizeNumber(downlink));
    const normalizedRtt = Math.max(0, normalizeNumber(rtt));

    let id = "fast";

    if (!online) {
        id = "offline";
    } else if (
        saveData === true ||
        ["slow-2g", "2g"].includes(normalizedType) ||
        (normalizedDownlink > 0 && normalizedDownlink < 0.8) ||
        normalizedRtt >= 900
    ) {
        id = "constrained";
    } else if (
        normalizedType === "3g" ||
        (normalizedDownlink > 0 && normalizedDownlink < 3) ||
        normalizedRtt >= 350
    ) {
        id = "balanced";
    }

    return {
        ...PROFILE_DEFINITIONS[id],
        online: online === true,
        saveData: saveData === true,
        effectiveType: normalizedType,
        downlink: normalizedDownlink,
        rtt: normalizedRtt
    };
}

export function readNetworkPerformanceProfile(
    navigatorObject = globalThis.navigator
) {
    const connection =
        navigatorObject?.connection ||
        navigatorObject?.mozConnection ||
        navigatorObject?.webkitConnection ||
        {};

    return getNetworkPerformanceProfile({
        online: navigatorObject?.onLine !== false,
        saveData: connection.saveData === true,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
    });
}

export function shouldPrefetchForProfile(
    profile,
    {
        priority = "normal",
        visible = true,
        background = false
    } = {}
) {
    const normalized = profile?.id
        ? profile
        : getNetworkPerformanceProfile();
    const normalizedPriority = ["high", "normal", "low"].includes(priority)
        ? priority
        : "normal";

    if (!normalized.online || normalized.id === "offline") {
        return false;
    }

    if (background && !normalized.allowBackgroundWarmup) {
        return false;
    }

    if (!background && !normalized.allowIntentPrefetch) {
        return false;
    }

    if (!visible && normalizedPriority !== "high") {
        return false;
    }

    if (normalized.id === "constrained") {
        return normalizedPriority === "high";
    }

    if (normalized.id === "balanced") {
        return normalizedPriority !== "low";
    }

    return true;
}

function createRecord(rule) {
    return {
        id: String(rule.id || rule.selector || "feature"),
        selector: String(rule.selector || ""),
        status: "idle",
        reason: "",
        requestedAt: 0,
        completedAt: 0,
        durationMs: 0,
        trigger: "",
        promise: null
    };
}

export function createIntentPrefetcher({
    documentObject = globalThis.document,
    navigatorObject = globalThis.navigator,
    now = () => Date.now(),
    rules = [],
    onChange = null
} = {}) {
    const normalizedRules = (Array.isArray(rules) ? rules : [])
        .filter((rule) => rule && typeof rule.run === "function" && rule.selector)
        .map((rule) => ({
            ...rule,
            id: String(rule.id || rule.selector),
            priority: ["high", "normal", "low"].includes(rule.priority)
                ? rule.priority
                : "normal"
        }));
    const records = new Map(
        normalizedRules.map((rule) => [rule.id, createRecord(rule)])
    );

    function diagnostics() {
        return [...records.values()].map((record) => ({
            id: record.id,
            selector: record.selector,
            status: record.status,
            reason: record.reason,
            requestedAt: record.requestedAt,
            completedAt: record.completedAt,
            durationMs: record.durationMs,
            trigger: record.trigger
        }));
    }

    function emit() {
        if (typeof onChange !== "function") return;
        try {
            onChange(diagnostics());
        } catch {
            // Le diagnostic ne doit jamais perturber le préchargement.
        }
    }

    async function runRule(rule, trigger = "intent") {
        const record = records.get(rule.id);
        if (!record) return null;
        if (record.status === "loaded") return record;
        if (record.promise) return record.promise;

        const profile = readNetworkPerformanceProfile(navigatorObject);
        const visible = documentObject?.visibilityState !== "hidden";
        const allowed = shouldPrefetchForProfile(profile, {
            priority: rule.priority,
            visible,
            background: trigger === "background"
        });

        if (!allowed) {
            record.status = "skipped";
            record.reason = profile.id;
            record.trigger = trigger;
            emit();
            return record;
        }

        record.status = "loading";
        record.reason = "";
        record.trigger = trigger;
        record.requestedAt = Number(now()) || Date.now();
        emit();

        record.promise = Promise.resolve()
            .then(() => rule.run({ profile, trigger }))
            .then(() => {
                record.status = "loaded";
                record.completedAt = Number(now()) || Date.now();
                record.durationMs = Math.max(0, record.completedAt - record.requestedAt);
                record.promise = null;
                emit();
                return record;
            })
            .catch((error) => {
                record.status = "error";
                record.reason = String(error?.message || error || "Erreur de préchargement");
                record.completedAt = Number(now()) || Date.now();
                record.durationMs = Math.max(0, record.completedAt - record.requestedAt);
                record.promise = null;
                emit();
                return record;
            });

        return record.promise;
    }

    function findRule(target) {
        if (!target || typeof target.closest !== "function") return null;
        return normalizedRules.find((rule) => target.closest(rule.selector));
    }

    function handleIntent(event) {
        const rule = findRule(event.target);
        if (rule) {
            runRule(rule, event.type).catch(() => {});
        }
    }

    const eventTypes = ["pointerover", "focusin", "touchstart"];
    for (const type of eventTypes) {
        documentObject?.addEventListener?.(type, handleIntent, {
            capture: true,
            passive: type !== "focusin"
        });
    }

    function warm(ids = []) {
        const selected = new Set(
            (Array.isArray(ids) ? ids : [ids]).map(String)
        );
        return Promise.allSettled(
            normalizedRules
                .filter((rule) => selected.has(rule.id))
                .map((rule) => runRule(rule, "background"))
        );
    }

    function destroy() {
        for (const type of eventTypes) {
            documentObject?.removeEventListener?.(type, handleIntent, {
                capture: true
            });
        }
    }

    return {
        run: (id, trigger = "manual") => {
            const rule = normalizedRules.find((item) => item.id === id);
            return rule ? runRule(rule, trigger) : Promise.resolve(null);
        },
        warm,
        diagnostics,
        destroy
    };
}
