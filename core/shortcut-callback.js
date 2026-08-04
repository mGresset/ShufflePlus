const MAX_CALLBACK_URL_LENGTH = 4096;
const ALLOWED_CALLBACK_PROTOCOLS = new Set([
    "shortcuts:"
]);

export const SHORTCUT_CALLBACK_QUERY_KEYS = Object.freeze([
    "x-success",
    "x-error",
    "x-cancel"
]);

export function normalizeShortcutCallbackUrl(value = "") {
    const candidate = String(value || "").trim();

    if (!candidate || candidate.length > MAX_CALLBACK_URL_LENGTH) {
        return "";
    }

    try {
        const url = new URL(candidate);
        return ALLOWED_CALLBACK_PROTOCOLS.has(url.protocol)
            ? url.toString()
            : "";
    } catch {
        return "";
    }
}

export function readShortcutCallbackConfig(searchParams) {
    const params = searchParams instanceof URLSearchParams
        ? searchParams
        : new URLSearchParams(searchParams || "");

    const successUrl = normalizeShortcutCallbackUrl(
        params.get("x-success")
    );
    const errorUrl = normalizeShortcutCallbackUrl(
        params.get("x-error")
    );
    const cancelUrl = normalizeShortcutCallbackUrl(
        params.get("x-cancel")
    );

    return {
        successUrl,
        errorUrl,
        cancelUrl,
        enabled: Boolean(successUrl || errorUrl || cancelUrl)
    };
}

export function normalizeShortcutCallbackConfig(value = {}) {
    const successUrl = normalizeShortcutCallbackUrl(
        value.successUrl || value.callbackSuccessUrl
    );
    const errorUrl = normalizeShortcutCallbackUrl(
        value.errorUrl || value.callbackErrorUrl
    );
    const cancelUrl = normalizeShortcutCallbackUrl(
        value.cancelUrl || value.callbackCancelUrl
    );

    return {
        successUrl,
        errorUrl,
        cancelUrl,
        enabled: Boolean(successUrl || errorUrl || cancelUrl)
    };
}

function normalizeCallbackOutcome(outcome = {}) {
    const status = ["success", "error", "cancel"].includes(
        outcome.status
    )
        ? outcome.status
        : outcome.success === true
            ? "success"
            : "error";

    return {
        version: String(outcome.version || ""),
        success: status === "success",
        status,
        action: String(outcome.action || ""),
        commandId: String(outcome.commandId || ""),
        playlistId: String(outcome.playlistId || ""),
        device: String(outcome.device || ""),
        durationMs: Math.max(0, Math.round(Number(outcome.durationMs) || 0)),
        code: String(outcome.code || ""),
        message: String(
            outcome.message ||
            (status === "success"
                ? "Lancement Shuffle+ terminé."
                : status === "cancel"
                    ? "Lancement Shuffle+ annulé."
                    : "Le lancement Shuffle+ a échoué.")
        )
    };
}

export function buildShortcutCallbackUrl(config = {}, outcome = {}) {
    const callbacks = normalizeShortcutCallbackConfig(config);
    const result = normalizeCallbackOutcome(outcome);

    let target = "";
    let usesSuccessFallback = false;

    if (result.status === "success") {
        target = callbacks.successUrl;
    } else if (result.status === "cancel") {
        target = callbacks.cancelUrl || callbacks.successUrl;
        usesSuccessFallback = !callbacks.cancelUrl && Boolean(callbacks.successUrl);
    } else {
        target = callbacks.errorUrl || callbacks.successUrl;
        usesSuccessFallback = !callbacks.errorUrl && Boolean(callbacks.successUrl);
    }

    if (!target) {
        return "";
    }

    const url = new URL(target);
    const serializedResult = JSON.stringify(result);

    if (
        result.status === "success" ||
        usesSuccessFallback
    ) {
        url.searchParams.set("result", serializedResult);
    } else if (result.status === "error") {
        url.searchParams.set("errorMessage", result.message);
        if (result.code) {
            url.searchParams.set("errorCode", result.code);
        }
        url.searchParams.set("result", serializedResult);
    }

    return url.toString();
}
