function normalizeDuration(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.max(0, Math.round(numeric))
        : fallback;
}

function normalizeReason(value = "resume") {
    const reason = String(value || "resume").trim();
    return reason || "resume";
}

export function createSessionResumeCoordinator({
    now = () => Date.now(),
    staleAfterMs = 12000,
    cooldownMs = 3500,
    onResume = null,
    onChange = null
} = {}) {
    const staleThreshold = normalizeDuration(staleAfterMs, 12000);
    const cooldown = normalizeDuration(cooldownMs, 3500);
    let hiddenAt = 0;
    let runningPromise = null;
    let snapshot = {
        status: "idle",
        reason: "",
        hiddenDurationMs: 0,
        lastStartedAt: 0,
        lastCompletedAt: 0,
        lastDurationMs: 0,
        resumeCount: 0,
        skippedCount: 0,
        errorCount: 0,
        lastError: ""
    };

    function emit() {
        if (typeof onChange !== "function") return;
        try {
            onChange({ ...snapshot });
        } catch {
            // Les métriques de reprise ne doivent jamais bloquer l'application.
        }
    }

    function diagnostics() {
        return {
            ...snapshot,
            hiddenAt,
            running: Boolean(runningPromise),
            staleAfterMs: staleThreshold,
            cooldownMs: cooldown
        };
    }

    function markHidden(timestamp = now()) {
        hiddenAt = Number(timestamp) || Date.now();
        snapshot = {
            ...snapshot,
            status: "hidden",
            hiddenDurationMs: 0
        };
        emit();
        return hiddenAt;
    }

    function skip(reason, hiddenDurationMs) {
        snapshot = {
            ...snapshot,
            status: "skipped",
            reason,
            hiddenDurationMs,
            skippedCount: snapshot.skippedCount + 1
        };
        emit();
        return Promise.resolve({
            status: "skipped",
            reason,
            hiddenDurationMs
        });
    }

    function requestResume(reason = "resume", {
        force = false,
        visible = true,
        online = true,
        timestamp = now()
    } = {}) {
        const currentAt = Number(timestamp) || Date.now();
        const resumeReason = normalizeReason(reason);
        const hiddenDurationMs = hiddenAt
            ? Math.max(0, currentAt - hiddenAt)
            : 0;

        if (runningPromise) {
            return runningPromise;
        }
        if (!visible) {
            return skip("not-visible", hiddenDurationMs);
        }
        if (!online) {
            return skip("offline", hiddenDurationMs);
        }
        if (
            !force &&
            resumeReason !== "online" &&
            hiddenAt &&
            hiddenDurationMs < staleThreshold
        ) {
            hiddenAt = 0;
            return skip("fresh-session", hiddenDurationMs);
        }
        if (
            !force &&
            snapshot.lastCompletedAt &&
            currentAt - snapshot.lastCompletedAt < cooldown
        ) {
            hiddenAt = 0;
            return skip("cooldown", hiddenDurationMs);
        }
        if (
            !force &&
            !hiddenAt &&
            resumeReason !== "online" &&
            resumeReason !== "pageshow"
        ) {
            return skip("no-suspension", 0);
        }

        snapshot = {
            ...snapshot,
            status: "running",
            reason: resumeReason,
            hiddenDurationMs,
            lastStartedAt: currentAt,
            lastError: ""
        };
        emit();

        const task = typeof onResume === "function"
            ? onResume({
                reason: resumeReason,
                hiddenDurationMs,
                startedAt: currentAt
            })
            : null;

        runningPromise = Promise.resolve(task)
            .then((result) => {
                const completedAt = Number(now()) || Date.now();
                snapshot = {
                    ...snapshot,
                    status: "completed",
                    lastCompletedAt: completedAt,
                    lastDurationMs: Math.max(0, completedAt - currentAt),
                    resumeCount: snapshot.resumeCount + 1,
                    lastError: ""
                };
                return {
                    status: "completed",
                    reason: resumeReason,
                    hiddenDurationMs,
                    result
                };
            })
            .catch((error) => {
                const completedAt = Number(now()) || Date.now();
                snapshot = {
                    ...snapshot,
                    status: "error",
                    lastCompletedAt: completedAt,
                    lastDurationMs: Math.max(0, completedAt - currentAt),
                    errorCount: snapshot.errorCount + 1,
                    lastError: String(error?.message || error || "Erreur de reprise")
                };
                return {
                    status: "error",
                    reason: resumeReason,
                    hiddenDurationMs,
                    error
                };
            })
            .finally(() => {
                hiddenAt = 0;
                runningPromise = null;
                emit();
            });

        return runningPromise;
    }

    return {
        markHidden,
        requestResume,
        diagnostics
    };
}
