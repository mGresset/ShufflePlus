const MOBILE_MAX_WIDTH = 760;
const KEYBOARD_MIN_OCCLUSION = 140;

const TEXT_INPUT_TYPES = new Set([
    "",
    "text",
    "search",
    "email",
    "url",
    "tel",
    "password",
    "number",
    "date",
    "datetime-local",
    "month",
    "time",
    "week"
]);

export function isMobileEditableControl(element) {
    if (!element || typeof element !== "object") {
        return false;
    }

    if (element.isContentEditable === true) {
        return true;
    }

    const tagName = String(element.tagName || "").toLowerCase();
    if (tagName === "textarea" || tagName === "select") {
        return true;
    }

    if (tagName !== "input") {
        return false;
    }

    const type = String(element.type || "").toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
}

export function getMobileViewportUxState({
    viewportWidth = 0,
    layoutHeight = 0,
    visualHeight = 0,
    visualOffsetTop = 0,
    editableActive = false
} = {}) {
    const width = Math.max(0, Number(viewportWidth || 0));
    const layout = Math.max(0, Number(layoutHeight || 0));
    const visual = Math.max(0, Number(visualHeight || 0));
    const offsetTop = Math.max(0, Number(visualOffsetTop || 0));
    const mobile = width > 0 && width <= MOBILE_MAX_WIDTH;
    const occlusion = Math.max(
        0,
        layout - (visual > 0 ? visual + offsetTop : layout)
    );
    const adaptiveThreshold = Math.max(
        KEYBOARD_MIN_OCCLUSION,
        Math.min(190, Math.round(layout * 0.2))
    );
    const keyboardOpen = Boolean(
        mobile &&
        editableActive &&
        visual > 0 &&
        occlusion >= adaptiveThreshold
    );

    return {
        mobile,
        keyboardOpen,
        bottomInset: mobile ? Math.round(occlusion) : 0,
        keyboardThreshold: adaptiveThreshold
    };
}

export function installMobileViewportUx({
    windowObject = globalThis.window,
    documentObject = globalThis.document
} = {}) {
    if (!windowObject || !documentObject?.documentElement) {
        return () => {};
    }

    const root = documentObject.documentElement;
    const visualViewport = windowObject.visualViewport;
    let frameId = 0;

    const applyState = () => {
        frameId = 0;
        const layoutHeight = Math.max(
            Number(windowObject.innerHeight || 0),
            Number(root.clientHeight || 0)
        );
        const viewportWidth = Math.max(
            Number(windowObject.innerWidth || 0),
            Number(root.clientWidth || 0)
        );
        const state = getMobileViewportUxState({
            viewportWidth,
            layoutHeight,
            visualHeight: Number(visualViewport?.height || 0),
            visualOffsetTop: Number(visualViewport?.offsetTop || 0),
            editableActive: isMobileEditableControl(documentObject.activeElement)
        });

        root.classList.toggle("is-mobile-keyboard-open", state.keyboardOpen);
        root.style.setProperty(
            "--mobile-viewport-bottom-inset",
            `${state.bottomInset}px`
        );
    };

    const schedule = () => {
        if (frameId) {
            return;
        }

        if (typeof windowObject.requestAnimationFrame === "function") {
            frameId = windowObject.requestAnimationFrame(applyState);
        } else {
            applyState();
        }
    };

    documentObject.addEventListener?.("focusin", schedule, { passive: true });
    documentObject.addEventListener?.("focusout", schedule, { passive: true });
    windowObject.addEventListener?.("resize", schedule, { passive: true });
    windowObject.addEventListener?.("orientationchange", schedule, { passive: true });
    visualViewport?.addEventListener?.("resize", schedule, { passive: true });
    visualViewport?.addEventListener?.("scroll", schedule, { passive: true });

    schedule();

    return () => {
        if (frameId && typeof windowObject.cancelAnimationFrame === "function") {
            windowObject.cancelAnimationFrame(frameId);
        }
        frameId = 0;
        documentObject.removeEventListener?.("focusin", schedule);
        documentObject.removeEventListener?.("focusout", schedule);
        windowObject.removeEventListener?.("resize", schedule);
        windowObject.removeEventListener?.("orientationchange", schedule);
        visualViewport?.removeEventListener?.("resize", schedule);
        visualViewport?.removeEventListener?.("scroll", schedule);
        root.classList.remove("is-mobile-keyboard-open");
        root.style.removeProperty("--mobile-viewport-bottom-inset");
    };
}
