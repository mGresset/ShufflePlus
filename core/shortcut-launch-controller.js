// Garanties transverses du lancement Apple Raccourcis (v12).
//
//  - un même requestId ne déclenche JAMAIS deux lancements (même après une
//    réouverture Safari, une reprise de la PWA ou un rechargement) ;
//  - les statuts « running » sont publiés dans l’ordre, sans spammer Railway,
//    et ne peuvent jamais passer après le statut final ;
//  - un lancement possède un AbortController avec un délai global.

import { SHORTCUT_LAUNCH_MAX_MS } from "./spotify-device-discovery.js";

export const SHORTCUT_REQUEST_REGISTRY_KEY = "shuffleplus_shortcut_request_registry_v1";
export const SHORTCUT_REQUEST_TTL_MS = 6 * 60 * 60 * 1000;
export const SHORTCUT_REQUEST_REGISTRY_LIMIT = 40;
export const SHORTCUT_PROGRESS_MIN_INTERVAL_MS = 1200;
export { SHORTCUT_LAUNCH_MAX_MS };

function cleanRequestId(value) {
    const normalized = String(value || "").trim();
    return /^[A-Za-z0-9._:-]{8,128}$/.test(normalized) ? normalized : "";
}

function readRegistry(storage, now) {
    try {
        const raw = JSON.parse(storage?.getItem?.(SHORTCUT_REQUEST_REGISTRY_KEY) || "[]");
        return (Array.isArray(raw) ? raw : [])
            .filter((entry) =>
                entry &&
                typeof entry.requestId === "string" &&
                now - Number(entry.claimedAt || 0) < SHORTCUT_REQUEST_TTL_MS &&
                now - Number(entry.claimedAt || 0) >= -60_000
            );
    } catch {
        return [];
    }
}

function writeRegistry(storage, entries) {
    try {
        storage?.setItem?.(
            SHORTCUT_REQUEST_REGISTRY_KEY,
            JSON.stringify(entries.slice(0, SHORTCUT_REQUEST_REGISTRY_LIMIT))
        );
        return true;
    } catch {
        return false;
    }
}

// Réserve un requestId. Retourne { accepted:false } si ce requestId a déjà été
// traité ou est en cours : la seconde ouverture ne relance rien et ne publie
// rien qui pourrait écraser le résultat du premier lancement.
export function claimShortcutRequest(storage, requestId, { now = Date.now() } = {}) {
    const id = cleanRequestId(requestId);

    if (!id) {
        return { accepted: true, tracked: false, requestId: "" };
    }

    const entries = readRegistry(storage, now);
    const previous = entries.find((entry) => entry.requestId === id);

    if (previous) {
        const previousStatus = String(previous.status || "running");
        const claimedAt = Number(previous.claimedAt) || 0;
        return {
            accepted: false,
            tracked: true,
            requestId: id,
            previousStatus,
            claimedAt,
            // Lancement jamais terminé (PWA fermée par iOS en plein lancement) :
            // il ne sera pas relancé, mais un statut final doit être publié.
            interrupted: previousStatus === "running" &&
                now - claimedAt > SHORTCUT_LAUNCH_MAX_MS + 15_000
        };
    }

    writeRegistry(storage, [
        { requestId: id, status: "running", claimedAt: now, updatedAt: now },
        ...entries
    ]);

    return { accepted: true, tracked: true, requestId: id };
}

export function completeShortcutRequest(storage, requestId, status = "success", { now = Date.now() } = {}) {
    const id = cleanRequestId(requestId);
    if (!id) return false;
    const entries = readRegistry(storage, now);
    const index = entries.findIndex((entry) => entry.requestId === id);
    const nextStatus = ["success", "error", "cancel"].includes(status) ? status : "error";

    if (index < 0) {
        entries.unshift({ requestId: id, status: nextStatus, claimedAt: now, updatedAt: now });
    } else {
        entries[index] = { ...entries[index], status: nextStatus, updatedAt: now };
    }

    return writeRegistry(storage, entries);
}

// Publication ordonnée et limitée des statuts « running ». Une fois le
// statut final publié, plus aucun « running » n’est envoyé.
export function createShortcutProgressPublisher(publish, {
    minIntervalMs = SHORTCUT_PROGRESS_MIN_INTERVAL_MS,
    now = () => Date.now()
} = {}) {
    let chain = Promise.resolve();
    let finalized = false;
    let lastMessage = "";
    let lastSentAt = 0;
    let sentOnce = false;

    function enqueue(outcome) {
        chain = chain
            .then(() => publish(outcome))
            .catch(() => false);
        return chain;
    }

    return {
        progress(message) {
            const text = String(message || "").trim().slice(0, 200);
            const timestamp = now();
            if (
                finalized ||
                !text ||
                text === lastMessage ||
                (sentOnce && timestamp - lastSentAt < minIntervalMs)
            ) {
                return chain;
            }
            lastMessage = text;
            lastSentAt = timestamp;
            sentOnce = true;
            return enqueue({
                status: "running",
                success: false,
                message: text
            });
        },
        finish(outcome) {
            finalized = true;
            return enqueue(outcome);
        },
        idle: () => chain,
        isFinalized: () => finalized
    };
}

// AbortController + délai global pour un lancement.
export function createLaunchAbortScope({
    timeoutMs = SHORTCUT_LAUNCH_MAX_MS,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout
} = {}) {
    const controller = new AbortController();
    const timer = setTimer(() => {
        const error = new Error(
            "Le lancement a dépassé le délai prévu. Aucune lecture n’a été envoyée vers un autre appareil."
        );
        error.name = "AbortError";
        error.code = "LAUNCH_TIMEOUT";
        controller.abort(error);
    }, Math.max(1000, Number(timeoutMs) || SHORTCUT_LAUNCH_MAX_MS));

    return {
        signal: controller.signal,
        cancel(reason = "") {
            const error = new Error(reason || "Le lancement a été annulé.");
            error.name = "AbortError";
            error.code = "LAUNCH_CANCELLED";
            controller.abort(error);
        },
        dispose() {
            clearTimer(timer);
        }
    };
}
