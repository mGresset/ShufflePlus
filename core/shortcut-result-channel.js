const MAX_REQUEST_ID_LENGTH = 160;
const MAX_SERVER_URL_LENGTH = 2048;
const MIN_RESULT_TOKEN_LENGTH = 16;
const MAX_RESULT_TOKEN_LENGTH = 256;
const PUBLISH_TIMEOUT_MS = 5000;

export const SHORTCUT_RESULT_QUERY_KEYS = Object.freeze([
    "requestId",
    "resultServer",
    "resultToken"
]);

export function normalizeShortcutResultRequestId(value = "") {
    const candidate = String(value || "").trim();

    if (
        candidate.length < 8 ||
        candidate.length > MAX_REQUEST_ID_LENGTH ||
        !/^[A-Za-z0-9._~-]+$/.test(candidate)
    ) {
        return "";
    }

    return candidate;
}

export function normalizeShortcutResultToken(value = "") {
    const candidate = String(value || "").trim();

    if (
        candidate.length < MIN_RESULT_TOKEN_LENGTH ||
        candidate.length > MAX_RESULT_TOKEN_LENGTH ||
        !/^[A-Za-z0-9._~-]+$/.test(candidate)
    ) {
        return "";
    }

    return candidate;
}

export function normalizeShortcutResultServerUrl(value = "") {
    const candidate = String(value || "").trim();

    if (!candidate || candidate.length > MAX_SERVER_URL_LENGTH) {
        return "";
    }

    try {
        const url = new URL(candidate);
        const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"]
            .includes(url.hostname);

        if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
            return "";
        }

        url.pathname = url.pathname.replace(/\/+$/, "");
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/$/, "");
    } catch {
        return "";
    }
}

export function readShortcutResultChannelConfig(searchParams) {
    const params = searchParams instanceof URLSearchParams
        ? searchParams
        : new URLSearchParams(searchParams || "");

    const requestId = normalizeShortcutResultRequestId(
        params.get("requestId")
    );
    const serverUrl = normalizeShortcutResultServerUrl(
        params.get("resultServer")
    );
    const token = normalizeShortcutResultToken(
        params.get("resultToken")
    );

    return {
        requestId,
        serverUrl,
        token,
        enabled: Boolean(requestId && serverUrl && token)
    };
}

export function normalizeShortcutResultChannelConfig(value = {}) {
    const requestId = normalizeShortcutResultRequestId(
        value.requestId || value.resultRequestId
    );
    const serverUrl = normalizeShortcutResultServerUrl(
        value.serverUrl || value.resultServerUrl
    );
    const token = normalizeShortcutResultToken(
        value.token || value.resultToken
    );

    return {
        requestId,
        serverUrl,
        token,
        enabled: Boolean(requestId && serverUrl && token)
    };
}

export function buildShortcutResultEndpoint(config = {}) {
    const normalized = normalizeShortcutResultChannelConfig(config);

    if (!normalized.enabled) {
        return "";
    }

    return `${normalized.serverUrl}/v1/launch-results/${encodeURIComponent(normalized.requestId)}`;
}

export function normalizeShortcutResultOutcome(outcome = {}) {
    const status = ["running", "success", "error", "cancel"].includes(
        outcome.status
    )
        ? outcome.status
        : outcome.success === true
            ? "success"
            : "error";

    return {
        version: String(outcome.version || "").slice(0, 40),
        status,
        success: status === "success",
        action: String(outcome.action || "").slice(0, 80),
        commandId: String(outcome.commandId || "").slice(0, 120),
        playlistId: String(outcome.playlistId || "").slice(0, 120),
        device: String(outcome.device || "").slice(0, 160),
        durationMs: Math.max(0, Math.round(Number(outcome.durationMs) || 0)),
        code: String(outcome.code || "").slice(0, 100),
        message: String(
            outcome.message ||
            (status === "running"
                ? "Lancement Shuffle+ en cours."
                : status === "success"
                    ? "Lancement Shuffle+ terminé."
                    : status === "cancel"
                        ? "Lancement Shuffle+ annulé."
                        : "Le lancement Shuffle+ a échoué.")
        ).slice(0, 500),
        publishedAt: new Date().toISOString()
    };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
    const controller = typeof AbortController === "function"
        ? new AbortController()
        : null;
    const timer = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
        return await fetchImpl(url, {
            ...options,
            ...(controller ? { signal: controller.signal } : {})
        });
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

export async function publishShortcutResult(
    config = {},
    outcome = {},
    {
        fetchImpl = globalThis.fetch,
        attempts = 3,
        timeoutMs = PUBLISH_TIMEOUT_MS
    } = {}
) {
    const endpoint = buildShortcutResultEndpoint(config);

    if (!endpoint || typeof fetchImpl !== "function") {
        return {
            published: false,
            skipped: true,
            endpoint
        };
    }

    const payload = normalizeShortcutResultOutcome(outcome);
    let lastError = null;

    for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
        try {
            const response = await fetchWithTimeout(
                fetchImpl,
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${normalizeShortcutResultChannelConfig(config).token}`
                    },
                    cache: "no-store",
                    body: JSON.stringify(payload)
                },
                timeoutMs
            );

            if (response.ok) {
                return {
                    published: true,
                    skipped: false,
                    endpoint,
                    status: response.status,
                    payload
                };
            }

            lastError = new Error(
                `Publication Railway refusée (${response.status}).`
            );
        } catch (error) {
            lastError = error;
        }

        if (attempt + 1 < Math.max(1, attempts)) {
            await new Promise((resolve) =>
                setTimeout(resolve, 250 * (attempt + 1))
            );
        }
    }

    throw lastError || new Error("Publication Railway impossible.");
}
