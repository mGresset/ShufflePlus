function normalizeDelay(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.max(0, Math.round(numeric))
        : fallback;
}

function normalizeId(value = "task") {
    const id = String(value || "task").trim();
    return id || "task";
}

function createPublicRecord(record) {
    return {
        id: record.id,
        status: record.status,
        reason: record.reason,
        scheduledAt: record.scheduledAt,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        durationMs: record.durationMs,
        delayMs: record.delayMs,
        idle: record.idle,
        requiresVisible: record.requiresVisible,
        requiresOnline: record.requiresOnline
    };
}

export function createStartupTaskQueue({
    globalObject = globalThis,
    documentObject = globalThis.document,
    navigatorObject = globalThis.navigator,
    now = () => Date.now(),
    onChange = null
} = {}) {
    const records = new Map();

    function diagnostics() {
        return [...records.values()]
            .map(createPublicRecord)
            .sort((first, second) => (
                first.scheduledAt - second.scheduledAt ||
                first.id.localeCompare(second.id)
            ));
    }

    function emit() {
        if (typeof onChange !== "function") return;
        try {
            onChange(diagnostics());
        } catch {
            // Les métriques ne doivent jamais bloquer le démarrage.
        }
    }

    function schedule(id, task, {
        delayMs = 0,
        idle = true,
        idleTimeoutMs = 1600,
        requiresVisible = true,
        requiresOnline = false
    } = {}) {
        const taskId = normalizeId(id);
        const existing = records.get(taskId);

        if (
            existing &&
            [
                "scheduled",
                "waiting-visibility",
                "waiting-network",
                "queued",
                "running",
                "completed"
            ].includes(existing.status)
        ) {
            return existing.promise;
        }

        if (typeof task !== "function") {
            return Promise.resolve(null);
        }

        let resolveTask;
        const promise = new Promise((resolve) => {
            resolveTask = resolve;
        });
        const record = {
            id: taskId,
            status: "scheduled",
            reason: "",
            scheduledAt: Number(now()) || Date.now(),
            startedAt: 0,
            completedAt: 0,
            durationMs: 0,
            delayMs: normalizeDelay(delayMs),
            idle: idle !== false,
            idleTimeoutMs: normalizeDelay(idleTimeoutMs, 1600),
            requiresVisible: requiresVisible !== false,
            requiresOnline: requiresOnline === true,
            promise,
            cleanup: () => {},
            queuedHandle: null,
            queuedType: ""
        };
        records.set(taskId, record);
        emit();

        const cleanupWaiters = () => {
            documentObject?.removeEventListener?.(
                "visibilitychange",
                attempt
            );
            globalObject?.removeEventListener?.(
                "online",
                attempt
            );
        };

        const complete = (status, reason = "") => {
            cleanupWaiters();
            record.status = status;
            record.reason = String(reason || "");
            record.completedAt = Number(now()) || Date.now();
            record.durationMs = record.startedAt
                ? Math.max(0, record.completedAt - record.startedAt)
                : 0;
            emit();
            resolveTask(createPublicRecord(record));
        };

        const run = async () => {
            if (record.status === "running" || record.status === "completed") {
                return;
            }

            cleanupWaiters();
            record.status = "running";
            record.reason = "";
            record.startedAt = Number(now()) || Date.now();
            emit();

            try {
                await task();
                complete("completed");
            } catch (error) {
                complete(
                    "error",
                    error?.message || error || "Erreur de tâche différée"
                );
            }
        };

        const queueRun = () => {
            if (["queued", "running", "completed"].includes(record.status)) {
                return;
            }

            record.status = "queued";
            emit();

            if (
                record.idle &&
                typeof globalObject?.requestIdleCallback === "function"
            ) {
                record.queuedType = "idle";
                record.queuedHandle = globalObject.requestIdleCallback(
                    run,
                    { timeout: record.idleTimeoutMs }
                );
                return;
            }

            record.queuedType = "timeout";
            record.queuedHandle = globalObject?.setTimeout?.(run, 0);
        };

        function attempt() {
            if (["queued", "running", "completed"].includes(record.status)) {
                return;
            }

            if (
                record.requiresOnline &&
                navigatorObject?.onLine === false
            ) {
                record.status = "waiting-network";
                record.reason = "offline";
                globalObject?.addEventListener?.(
                    "online",
                    attempt,
                    { once: true }
                );
                emit();
                return;
            }

            if (
                record.requiresVisible &&
                documentObject?.visibilityState === "hidden"
            ) {
                record.status = "waiting-visibility";
                record.reason = "hidden";
                documentObject?.addEventListener?.(
                    "visibilitychange",
                    attempt,
                    { once: true }
                );
                emit();
                return;
            }

            record.reason = "";
            queueRun();
        }

        record.cleanup = cleanupWaiters;
        globalObject?.setTimeout?.(attempt, record.delayMs);

        return promise;
    }

    return {
        schedule,
        diagnostics,
        has(id) {
            return records.has(normalizeId(id));
        }
    };
}
