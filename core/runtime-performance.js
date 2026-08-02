const PRIORITY_MEDIA_SELECTOR = [
    "[data-priority-media]",
    ".hero",
    ".spotify-setup-panel",
    ".driving-now-playing",
    ".driving-player-card",
    ".quick-control-now-playing",
    ".musical-dashboard-card.is-main"
].join(",");

export const DEFERRED_SECTION_SELECTORS = Object.freeze([
    ".settings-panel",
    ".saved-mixes-panel",
    ".mix-history-panel",
    ".listening-statistics-panel",
    ".musical-dashboard-panel",
    ".contextual-help-settings-panel",
    ".app-health-panel",
    ".offline-performance-panel",
    ".sync-preparation-panel",
    ".pwa-settings-panel",
    ".priority-panel",
    ".coherence-panel",
    ".intensity-panel",
    ".exclusion-panel",
    ".cleanup-panel"
]);

export function scheduleIdleTask(
    callback,
    {
        globalObject = globalThis,
        timeout = 1200
    } = {}
) {
    if (typeof callback !== "function") {
        return () => {};
    }

    if (typeof globalObject.requestIdleCallback === "function") {
        const id = globalObject.requestIdleCallback(callback, { timeout });
        return () => globalObject.cancelIdleCallback?.(id);
    }

    const id = globalObject.setTimeout?.(callback, Math.min(timeout, 300));
    return () => globalObject.clearTimeout?.(id);
}

export function shouldPrioritizeImage(image) {
    return Boolean(
        image?.hasAttribute?.("data-priority-media") ||
        image?.closest?.(PRIORITY_MEDIA_SELECTOR)
    );
}

export function optimizeImageElement(image) {
    if (!image || String(image.tagName || "").toLowerCase() !== "img") {
        return false;
    }

    const priority = shouldPrioritizeImage(image);

    if (!image.hasAttribute?.("decoding")) {
        image.setAttribute?.("decoding", "async");
    }

    if (!image.hasAttribute?.("referrerpolicy")) {
        image.setAttribute?.("referrerpolicy", "no-referrer");
    }

    if (!image.hasAttribute?.("loading")) {
        image.setAttribute?.("loading", priority ? "eager" : "lazy");
    }

    if (!image.hasAttribute?.("fetchpriority")) {
        image.setAttribute?.("fetchpriority", priority ? "high" : "low");
    }

    return true;
}

export function optimizeMediaTree(root) {
    if (!root) {
        return 0;
    }

    const images = [];
    if (String(root.tagName || "").toLowerCase() === "img") {
        images.push(root);
    }
    if (typeof root.querySelectorAll === "function") {
        images.push(...root.querySelectorAll("img"));
    }

    let optimized = 0;
    for (const image of images) {
        optimized += optimizeImageElement(image) ? 1 : 0;
    }
    return optimized;
}

export function markDeferredSections(
    root,
    {
        selectors = DEFERRED_SECTION_SELECTORS,
        className = "ui-deferred-section"
    } = {}
) {
    if (!root || typeof root.querySelectorAll !== "function") {
        return 0;
    }

    const selector = selectors.join(",");
    const sections = [];
    if (selector && typeof root.matches === "function" && root.matches(selector)) {
        sections.push(root);
    }
    if (selector) {
        sections.push(...root.querySelectorAll(selector));
    }
    let marked = 0;

    for (const section of sections) {
        if (
            section?.classList?.contains(className) ||
            section?.closest?.("[data-no-content-visibility]")
        ) {
            continue;
        }
        section?.classList?.add(className);
        marked += 1;
    }

    return marked;
}

export function getRuntimePerformanceSnapshot(
    performanceObject = globalThis.performance
) {
    if (!performanceObject || typeof performanceObject.getEntriesByType !== "function") {
        return {
            available: false,
            resources: 0,
            domContentLoadedMs: 0,
            loadMs: 0
        };
    }

    const navigation = performanceObject.getEntriesByType("navigation")?.[0];
    return {
        available: true,
        resources: performanceObject.getEntriesByType("resource")?.length || 0,
        domContentLoadedMs: Math.max(0, Math.round(navigation?.domContentLoadedEventEnd || 0)),
        loadMs: Math.max(0, Math.round(navigation?.loadEventEnd || 0)),
        transferBytes: Math.max(0, Math.round(
            performanceObject
                .getEntriesByType("resource")
                .reduce((sum, entry) => sum + Number(entry.transferSize || 0), 0)
        ))
    };
}

export function installRuntimePerformanceOptimizations(
    {
        documentObject = globalThis.document,
        globalObject = globalThis,
        onSnapshot = null
    } = {}
) {
    if (!documentObject) {
        return () => {};
    }

    const apply = (root = documentObject) => {
        optimizeMediaTree(root);
        markDeferredSections(documentObject);
    };

    const cancelIdle = scheduleIdleTask(
        () => {
            apply(documentObject);
            if (typeof onSnapshot === "function") {
                onSnapshot(getRuntimePerformanceSnapshot(globalObject.performance));
            }
        },
        { globalObject }
    );

    const Observer = globalObject.MutationObserver;
    const observer = typeof Observer === "function"
        ? new Observer((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes || []) {
                    if (node?.nodeType === 1) {
                        optimizeMediaTree(node);
                        markDeferredSections(node);
                    }
                }
            }
        })
        : null;

    observer?.observe?.(documentObject.body || documentObject.documentElement, {
        childList: true,
        subtree: true
    });

    return () => {
        cancelIdle();
        observer?.disconnect?.();
    };
}
