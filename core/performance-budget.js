const PERFORMANCE_BUDGETS = Object.freeze({
    offline: {
        loadMs: 0,
        domContentLoadedMs: 0,
        transferBytes: 0,
        resources: 0
    },
    constrained: {
        loadMs: 9000,
        domContentLoadedMs: 5500,
        transferBytes: 700000,
        resources: 95
    },
    balanced: {
        loadMs: 6000,
        domContentLoadedMs: 3600,
        transferBytes: 950000,
        resources: 120
    },
    fast: {
        loadMs: 4000,
        domContentLoadedMs: 2400,
        transferBytes: 1250000,
        resources: 145
    }
});

function normalizeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function buildMetric(id, value, limit, unit = "") {
    const normalizedValue = normalizeNumber(value);
    const normalizedLimit = normalizeNumber(limit);
    const measurable = normalizedLimit > 0 && normalizedValue > 0;
    const ratio = measurable ? normalizedValue / normalizedLimit : 0;

    return {
        id,
        value: normalizedValue,
        limit: normalizedLimit,
        unit,
        measurable,
        ratio,
        status: !measurable
            ? "unknown"
            : ratio <= 1
                ? "healthy"
                : ratio <= 1.35
                    ? "attention"
                    : "critical"
    };
}

export function getPerformanceBudget(profileId = "fast") {
    const normalizedId = String(profileId || "fast");
    return {
        ...(PERFORMANCE_BUDGETS[normalizedId] || PERFORMANCE_BUDGETS.fast)
    };
}

export function evaluatePerformanceBudget(
    snapshot = {},
    profile = { id: "fast" }
) {
    const profileId = String(profile?.id || "fast");
    const budget = getPerformanceBudget(profileId);
    const metrics = [
        buildMetric("load", snapshot.loadMs, budget.loadMs, "ms"),
        buildMetric(
            "dom-content-loaded",
            snapshot.domContentLoadedMs,
            budget.domContentLoadedMs,
            "ms"
        ),
        buildMetric("transfer", snapshot.transferBytes, budget.transferBytes, "octets"),
        buildMetric("resources", snapshot.resources, budget.resources, "ressources")
    ];
    const measurable = metrics.filter((metric) => metric.measurable);
    const criticalCount = measurable.filter((metric) => metric.status === "critical").length;
    const warningCount = measurable.filter((metric) => metric.status === "attention").length;
    const score = measurable.length
        ? Math.max(
            0,
            Math.round(
                100 -
                measurable.reduce((sum, metric) => {
                    return sum + Math.max(0, metric.ratio - 1) * 35;
                }, 0)
            )
        )
        : 100;

    return {
        profileId,
        budget,
        metrics,
        score,
        status: criticalCount
            ? "critical"
            : warningCount
                ? "attention"
                : "healthy",
        criticalCount,
        warningCount,
        measurableCount: measurable.length
    };
}
