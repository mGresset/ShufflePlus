function normalizeName(value = "") {
    return String(value || "").trim();
}

function appendVersion(href = "", version = "") {
    const cleanHref = String(href || "").trim();
    const cleanVersion = String(version || "").trim();
    if (!cleanHref || !cleanVersion || /[?&]v=/.test(cleanHref)) {
        return cleanHref;
    }
    return `${cleanHref}${cleanHref.includes("?") ? "&" : "?"}v=${encodeURIComponent(cleanVersion)}`;
}

export function createStylesheetLoader(
    styles = {},
    {
        documentObject = globalThis.document,
        version = "",
        onChange = null
    } = {}
) {
    const records = new Map();

    function emit() {
        if (typeof onChange !== "function") return;
        try {
            onChange(getDiagnostics());
        } catch {
            // Le diagnostic visuel ne doit jamais bloquer le chargement.
        }
    }

    function getRecord(name) {
        const normalizedName = normalizeName(name);
        if (!records.has(normalizedName)) {
            records.set(normalizedName, {
                name: normalizedName,
                href: String(styles[normalizedName] || ""),
                status: "idle",
                requestedAt: 0,
                loadedAt: 0,
                durationMs: 0,
                error: "",
                promise: null
            });
        }
        return records.get(normalizedName);
    }

    function findExistingLink(name, href) {
        if (!documentObject?.querySelector) return null;
        return documentObject.querySelector(
            `link[data-shuffleplus-style="${name}"]`
        ) || [...documentObject.querySelectorAll('link[rel="stylesheet"]')]
            .find((link) => String(link.href || link.getAttribute?.("href") || "").includes(href));
    }

    async function load(name) {
        const normalizedName = normalizeName(name);
        const configuredHref = String(styles[normalizedName] || "").trim();
        if (!normalizedName || !configuredHref) {
            throw new Error(`Feuille de style inconnue : ${normalizedName || "sans nom"}.`);
        }

        const record = getRecord(normalizedName);
        if (record.status === "loaded") return record;
        if (record.promise) return record.promise;
        if (!documentObject?.createElement || !documentObject?.head) {
            throw new Error("Le document ne permet pas de charger une feuille de style.");
        }

        const href = appendVersion(configuredHref, version);
        const existing = findExistingLink(normalizedName, configuredHref);
        if (existing?.sheet || existing?.dataset?.loaded === "true") {
            record.status = "loaded";
            record.loadedAt = Date.now();
            record.href = href;
            emit();
            return record;
        }

        record.status = "loading";
        record.requestedAt = Date.now();
        record.error = "";
        record.href = href;
        emit();

        record.promise = new Promise((resolve, reject) => {
            const link = existing || documentObject.createElement("link");
            let settled = false;
            link.rel = "stylesheet";
            link.href = href;
            link.dataset.shuffleplusStyle = normalizedName;

            const finish = () => {
                if (settled) return;
                settled = true;
                record.status = "loaded";
                record.loadedAt = Date.now();
                record.durationMs = Math.max(0, record.loadedAt - record.requestedAt);
                record.promise = null;
                link.dataset.loaded = "true";
                emit();
                resolve(record);
            };
            const fail = () => {
                if (settled) return;
                settled = true;
                record.status = "error";
                record.loadedAt = Date.now();
                record.durationMs = Math.max(0, record.loadedAt - record.requestedAt);
                record.error = `Impossible de charger ${configuredHref}.`;
                record.promise = null;
                emit();
                reject(new Error(record.error));
            };

            link.addEventListener?.("load", finish, { once: true });
            link.addEventListener?.("error", fail, { once: true });
            if (!existing) documentObject.head.append(link);

            // Les faux documents de test peuvent signaler immédiatement le chargement.
            if (link.sheet || link.dataset?.loaded === "true") finish();
        });

        return record.promise;
    }

    function preload(name) {
        const normalizedName = normalizeName(name);
        const configuredHref = String(styles[normalizedName] || "").trim();
        if (!normalizedName || !configuredHref || !documentObject?.createElement || !documentObject?.head) {
            return null;
        }
        const existing = documentObject.querySelector?.(
            `link[data-shuffleplus-preload="${normalizedName}"]`
        );
        if (existing) return existing;
        const link = documentObject.createElement("link");
        link.rel = "preload";
        link.as = "style";
        link.href = appendVersion(configuredHref, version);
        link.dataset.shuffleplusPreload = normalizedName;
        documentObject.head.append(link);
        return link;
    }

    function isLoaded(name) {
        return getRecord(name).status === "loaded";
    }

    function getDiagnostics() {
        return [...records.values()]
            .map(({ promise, ...record }) => ({ ...record }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    return { load, preload, isLoaded, getDiagnostics };
}
