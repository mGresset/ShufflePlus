export const DRIVING_PRIMARY_ACTIONS = Object.freeze([
    "shuffle",
    "playpause",
    "next",
    "voice"
]);

export const DEFAULT_ADVANCED_DRIVING_SETTINGS = Object.freeze({
    keepScreenAwake: true,
    autoRefresh: true,
    showFeedback: true,
    hapticFeedback: true,
    lockOnEntry: false,
    fullscreenQueue: true,
    primaryAction: "shuffle"
});

export const DRIVING_UNLOCK_HOLD_MS = 1000;

export function normalizeDrivingAdvancedSettings(settings = {}) {
    const source = settings && typeof settings === "object"
        ? settings
        : {};
    const storedPrimaryAction = String(source.primaryAction || "");
    const migratedPrimaryAction = storedPrimaryAction === "adaptive"
        ? "shuffle"
        : storedPrimaryAction;
    const primaryAction = DRIVING_PRIMARY_ACTIONS.includes(
        migratedPrimaryAction
    )
        ? migratedPrimaryAction
        : DEFAULT_ADVANCED_DRIVING_SETTINGS.primaryAction;

    return {
        keepScreenAwake: source.keepScreenAwake !== false,
        autoRefresh: source.autoRefresh !== false,
        showFeedback: source.showFeedback !== false,
        hapticFeedback: source.hapticFeedback !== false,
        lockOnEntry: source.lockOnEntry === true,
        fullscreenQueue: source.fullscreenQueue !== false,
        primaryAction
    };
}

export function orderDrivingControls(
    controls = [],
    primaryAction = "shuffle"
) {
    const safeControls = Array.isArray(controls)
        ? controls.filter((control) => control && control.id)
        : [];
    const selected = DRIVING_PRIMARY_ACTIONS.includes(primaryAction)
        ? primaryAction
        : DEFAULT_ADVANCED_DRIVING_SETTINGS.primaryAction;

    return [...safeControls].sort((left, right) => {
        if (left.id === selected) return -1;
        if (right.id === selected) return 1;
        return 0;
    });
}

export function getDrivingUnlockProgress({
    startedAt = 0,
    now = Date.now(),
    holdMs = DRIVING_UNLOCK_HOLD_MS
} = {}) {
    const safeHoldMs = Math.max(250, Number(holdMs || 0));
    const elapsedMs = Math.max(
        0,
        Number(now || Date.now()) - Math.max(0, Number(startedAt || 0))
    );

    return {
        elapsedMs,
        holdMs: safeHoldMs,
        percent: Math.min(100, (elapsedMs / safeHoldMs) * 100),
        complete: elapsedMs >= safeHoldMs
    };
}
