const DEFAULT_EXTERNAL_HOSTS = Object.freeze([
    "developer.spotify.com",
    "open.spotify.com"
]);

export const SHUFFLEPLUS_CSP_DIRECTIVES = Object.freeze({
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": ["'self'"],
    "script-src-attr": ["'none'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
        "'self'",
        "https://accounts.spotify.com",
        "https://api.spotify.com",
        "https://*.up.railway.app"
    ],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'", "blob:", "https:"]
});

export function serializeContentSecurityPolicy(
    directives = SHUFFLEPLUS_CSP_DIRECTIVES
) {
    return Object.entries(directives)
        .map(([name, values]) => {
            const normalizedValues = Array.isArray(values)
                ? values.filter(Boolean)
                : [values].filter(Boolean);
            return `${name} ${normalizedValues.join(" ")}`.trim();
        })
        .filter(Boolean)
        .join("; ");
}

export const SHUFFLEPLUS_CSP = serializeContentSecurityPolicy();

export function parseContentSecurityPolicy(policy = "") {
    const parsed = new Map();

    for (const rawDirective of String(policy || "").split(";")) {
        const parts = rawDirective.trim().split(/\s+/).filter(Boolean);
        const name = parts.shift();
        if (name) {
            parsed.set(name, parts);
        }
    }

    return parsed;
}

export function getSecurityPolicyDiagnostics(policy = SHUFFLEPLUS_CSP) {
    const directives = parseContentSecurityPolicy(policy);
    const required = [
        "default-src",
        "base-uri",
        "object-src",
        "script-src",
        "script-src-attr",
        "style-src",
        "img-src",
        "connect-src",
        "worker-src"
    ];
    const missing = required.filter((name) => !directives.has(name));
    const scriptSources = directives.get("script-src") || [];

    return {
        valid: missing.length === 0 && !scriptSources.includes("'unsafe-inline'"),
        missing,
        allowsInlineScripts: scriptSources.includes("'unsafe-inline'"),
        allowsEval: scriptSources.includes("'unsafe-eval'"),
        directiveCount: directives.size
    };
}

export function isTrustedExternalUrl(
    value,
    {
        allowedHosts = DEFAULT_EXTERNAL_HOSTS,
        allowSubdomains = false
    } = {}
) {
    let url;

    try {
        url = new URL(String(value || ""));
    } catch {
        return false;
    }

    if (url.protocol !== "https:") {
        return false;
    }

    const hostname = url.hostname.toLowerCase();
    return allowedHosts.some((allowedHost) => {
        const normalized = String(allowedHost || "").toLowerCase();
        return hostname === normalized || (
            allowSubdomains && hostname.endsWith(`.${normalized}`)
        );
    });
}

export function openTrustedExternalUrl(
    value,
    {
        windowObject = globalThis.window,
        allowedHosts = DEFAULT_EXTERNAL_HOSTS,
        target = "_blank"
    } = {}
) {
    if (!isTrustedExternalUrl(value, { allowedHosts })) {
        return false;
    }

    if (!windowObject || typeof windowObject.open !== "function") {
        return false;
    }

    const opened = windowObject.open(
        String(value),
        target,
        "noopener,noreferrer"
    );

    try {
        if (opened) {
            opened.opener = null;
        }
    } catch {
        // Certains navigateurs interdisent l'accès à la fenêtre créée.
    }

    return true;
}

export const TRUSTED_EXTERNAL_HOSTS = DEFAULT_EXTERNAL_HOSTS;
